/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { ExtensionSupport } = ChromeUtils.import(
  "resource:///modules/ExtensionSupport.jsm"
);

let account = createAccount();
let defaultIdentity = addIdentity(account);
let nonDefaultIdentity = addIdentity(account, "nondefault@invalid");

// A local outbox is needed so we can use "send later".
let localAccount = createAccount("local");
let outbox = localAccount.incomingServer.rootFolder.getChildNamed("outbox");

function messagesInOutbox(count) {
  info(`Checking for ${count} messages in outbox`);

  count -= [...outbox.messages].length;
  if (count <= 0) {
    return Promise.resolve();
  }

  info(`Waiting for ${count} messages in outbox`);
  return new Promise(resolve => {
    MailServices.mfn.addListener(
      {
        msgAdded(msgHdr) {
          if (--count == 0) {
            MailServices.mfn.removeListener(this);
            resolve();
          }
        },
      },
      MailServices.mfn.msgAdded
    );
  });
}

add_task(async function testCancel() {
  let files = {
    "background.js": async () => {
      async function beginSend(sendExpected, lockExpected) {
        await window.sendMessage("beginSend");
        return checkIfSent(sendExpected, lockExpected);
      }

      function checkIfSent(sendExpected, lockExpected = null) {
        return window.sendMessage("checkIfSent", sendExpected, lockExpected);
      }

      function checkWindow(expected) {
        return window.sendMessage("checkWindow", expected);
      }

      // Open a compose window with a message. The message will never send
      // because we removed the sending function, so we can attempt to send
      // it over and over.

      let createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({
        to: ["test@test.invalid"],
        subject: "Test",
      });
      let [createdWindow] = await createdWindowPromise;
      browser.test.assertEq("messageCompose", createdWindow.type);

      await checkWindow({ to: ["test@test.invalid"], subject: "Test" });

      let [tab] = await browser.tabs.query({ windowId: createdWindow.id });

      // Send the message. No listeners exist, so sending should continue.

      await beginSend(true);

      // Add a non-cancelling listener. Sending should continue.

      let listener1 = tab => {
        listener1.tab = tab;
        return {};
      };
      browser.compose.onBeforeSend.addListener(listener1);
      await beginSend(true);
      browser.test.assertEq(tab.id, listener1.tab.id, "listener1 was fired");
      browser.compose.onBeforeSend.removeListener(listener1);
      delete listener1.tab;

      // Add a cancelling listener. Sending should not continue.

      let listener2 = tab => {
        listener2.tab = tab;
        return { cancel: true };
      };
      browser.compose.onBeforeSend.addListener(listener2);
      await beginSend(false, false);
      browser.test.assertEq(tab.id, listener2.tab.id, "listener2 was fired");
      browser.compose.onBeforeSend.removeListener(listener2);
      delete listener2.tab;
      await beginSend(true); // Removing the listener worked.

      // Add a listener returning a Promise. Resolve the Promise to unblock.
      // Sending should continue.

      let listener3 = tab => {
        listener3.tab = tab;
        return new Promise(resolve => {
          listener3.resolve = resolve;
        });
      };
      browser.compose.onBeforeSend.addListener(listener3);
      await beginSend(false, true);
      browser.test.assertEq(tab.id, listener3.tab.id, "listener3 was fired");
      listener3.resolve({ cancel: false });
      await checkIfSent(true);
      browser.compose.onBeforeSend.removeListener(listener3);
      delete listener3.tab;

      // Add a listener returning a Promise. Resolve the Promise to cancel.
      // Sending should not continue.

      let listener4 = tab => {
        listener4.tab = tab;
        return new Promise(resolve => {
          listener4.resolve = resolve;
        });
      };
      browser.compose.onBeforeSend.addListener(listener4);
      await beginSend(false, true);
      browser.test.assertEq(tab.id, listener4.tab.id, "listener4 was fired");
      listener4.resolve({ cancel: true });
      await checkIfSent(false, false);
      browser.compose.onBeforeSend.removeListener(listener4);
      delete listener4.tab;
      await beginSend(true); // Removing the listener worked.

      // Clean up.

      let removedWindowPromise = window.waitForEvent("windows.onRemoved");
      browser.windows.remove(createdWindow.id);
      await removedWindowPromise;

      browser.test.assertTrue(
        !listener1.tab,
        "listener1 was not fired after removal"
      );
      browser.test.assertTrue(
        !listener2.tab,
        "listener2 was not fired after removal"
      );
      browser.test.assertTrue(
        !listener3.tab,
        "listener3 was not fired after removal"
      );
      browser.test.assertTrue(
        !listener4.tab,
        "listener4 was not fired after removal"
      );

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["compose"],
    },
  });

  // We can't allow sending to actually happen, this is a test. For every
  // compose window that opens, replace the function which does the actual
  // sending with one that only records when it has been called.
  let didTryToSendMessage = false;
  let windowListenerRemoved = false;
  ExtensionSupport.registerWindowListener("mochitest", {
    chromeURLs: [
      "chrome://messenger/content/messengercompose/messengercompose.xhtml",
    ],
    onLoadWindow(window) {
      window.CompleteGenericSendMessage = function (msgType) {
        didTryToSendMessage = true;
        Services.obs.notifyObservers(
          {
            composeWindow: window,
          },
          "mail:composeSendProgressStop"
        );
      };
    },
  });
  registerCleanupFunction(() => {
    if (!windowListenerRemoved) {
      ExtensionSupport.unregisterWindowListener("mochitest");
    }
  });

  extension.onMessage("beginSend", async () => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 1);

    composeWindows[0]
      .GenericSendMessage(Ci.nsIMsgCompDeliverMode.Now)
      .catch(() => {
        // This test is ignoring errors thrown by GenericSendMessage, but looks
        // at didTryToSendMessage of the mocked CompleteGenericSendMessage to
        // check if onBeforeSend aborted the send process.
      });
    extension.sendMessage();
  });

  extension.onMessage("checkIfSent", async (sendExpected, lockExpected) => {
    // Wait a moment to see if send happens asynchronously.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 500));
    is(didTryToSendMessage, sendExpected, "did try to send a message");

    if (lockExpected !== null) {
      let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
      is(composeWindows.length, 1);
      is(composeWindows[0].gWindowLocked, lockExpected, "window is locked");
    }

    didTryToSendMessage = false;
    extension.sendMessage();
  });

  extension.onMessage("checkWindow", async expected => {
    await checkComposeHeaders(expected);
    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();

  ExtensionSupport.unregisterWindowListener("mochitest");
  windowListenerRemoved = true;
});

add_task(async function testChangeDetails() {
  let files = {
    "background.js": async () => {
      function beginSend() {
        return window.sendMessage("beginSend");
      }

      function checkWindow(expected) {
        return window.sendMessage("checkWindow", expected);
      }

      let accounts = await browser.accounts.list();
      // If this test is run alone, the order of accounts is different compared
      // to running all tests. We need the account with the 2 added identities.
      let account = accounts.find(a => a.identities.length == 2);
      let [defaultIdentity, nonDefaultIdentity] = account.identities;

      // Add a listener that changes the headers and body. Sending should
      // continue and the headers should change. This is largely the same code
      // as tested in browser_ext_compose_details.js, so just test that the
      // changes happen.

      let createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({
        to: ["test@test.invalid"],
        subject: "Test",
        body: "Original body.",
      });
      let [createdWindow] = await createdWindowPromise;
      browser.test.assertEq("messageCompose", createdWindow.type);

      await checkWindow({
        to: ["test@test.invalid"],
        subject: "Test",
        body: "Original body.",
      });

      let [tab] = await browser.tabs.query({ windowId: createdWindow.id });

      let listener5 = (tab, details) => {
        listener5.tab = tab;
        listener5.details = details;
        return {
          details: {
            identityId: nonDefaultIdentity.id,
            to: ["to@test5.invalid"],
            cc: ["cc@test5.invalid"],
            subject: "Changed by listener5",
            body: "New body from listener5.",
          },
        };
      };
      browser.compose.onBeforeSend.addListener(listener5);
      await beginSend();
      browser.test.assertEq(tab.id, listener5.tab.id, "listener5 was fired");
      browser.test.assertEq(defaultIdentity.id, listener5.details.identityId);
      browser.test.assertEq(1, listener5.details.to.length);
      browser.test.assertEq(
        "test@test.invalid",
        listener5.details.to[0],
        "listener5 recipient correct"
      );
      browser.test.assertEq(
        "Test",
        listener5.details.subject,
        "listener5 subject correct"
      );
      browser.compose.onBeforeSend.removeListener(listener5);
      delete listener5.tab;

      // Do the same thing, but this time with a Promise.

      createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({
        to: ["test@test.invalid"],
        subject: "Test",
        body: "Original body.",
      });
      [createdWindow] = await createdWindowPromise;
      browser.test.assertEq("messageCompose", createdWindow.type);

      await checkWindow({
        to: ["test@test.invalid"],
        subject: "Test",
        body: "Original body.",
      });

      [tab] = await browser.tabs.query({ windowId: createdWindow.id });

      let listener6 = (tab, details) => {
        listener6.tab = tab;
        listener6.details = details;
        return new Promise(resolve => {
          listener6.resolve = resolve;
        });
      };
      browser.compose.onBeforeSend.addListener(listener6);
      await beginSend();
      browser.test.assertEq(tab.id, listener6.tab.id, "listener6 was fired");
      browser.test.assertEq(defaultIdentity.id, listener6.details.identityId);
      browser.test.assertEq(1, listener6.details.to.length);
      browser.test.assertEq(
        "test@test.invalid",
        listener6.details.to[0],
        "listener6 recipient correct"
      );
      browser.test.assertEq(
        "Test",
        listener6.details.subject,
        "listener6 subject correct"
      );
      listener6.resolve({
        details: {
          identityId: nonDefaultIdentity.id,
          to: ["to@test6.invalid"],
          cc: ["cc@test6.invalid"],
          subject: "Changed by listener6",
          body: "New body from listener6.",
        },
      });
      browser.compose.onBeforeSend.removeListener(listener6);
      delete listener6.tab;

      browser.test.assertTrue(
        !listener5.tab,
        "listener5 was not fired after removal"
      );
      browser.test.assertTrue(
        !listener6.tab,
        "listener6 was not fired after removal"
      );

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "compose"],
    },
  });

  extension.onMessage("beginSend", async () => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 1);

    composeWindows[0]
      .GenericSendMessage(Ci.nsIMsgCompDeliverMode.Later)
      .catch(() => {
        // This test is ignoring errors thrown by GenericSendMessage, but looks
        // at didTryToSendMessage of the mocked CompleteGenericSendMessage to
        // check if onBeforeSend aborted the send process.
      });
    extension.sendMessage();
  });

  extension.onMessage("checkWindow", async expected => {
    await checkComposeHeaders(expected);

    let composeWindow = Services.wm.getMostRecentWindow("msgcompose");
    let body = composeWindow
      .GetCurrentEditor()
      .outputToString("text/plain", Ci.nsIDocumentEncoder.OutputRaw);
    is(body, expected.body);

    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();

  await messagesInOutbox(2);

  let outboxMessages = [...outbox.messages];
  ok(outboxMessages.length > 0);
  let sentMessage5 = outboxMessages.shift();
  is(sentMessage5.author, "nondefault@invalid", "author was changed");
  is(sentMessage5.subject, "Changed by listener5", "subject was changed");
  is(sentMessage5.recipients, "to@test5.invalid", "to was changed");
  is(sentMessage5.ccList, "cc@test5.invalid", "cc was changed");

  await new Promise(resolve => {
    window.MsgHdrToMimeMessage(sentMessage5, null, (msgHdr, mimeMessage) => {
      is(
        // Fold Windows line-endings \r\n to \n.
        mimeMessage.parts[0].body.replace(/\r/g, ""),
        "New body from listener5.\n"
      );
      resolve();
    });
  });

  ok(outboxMessages.length > 0);
  let sentMessage6 = outboxMessages.shift();
  is(sentMessage6.author, "nondefault@invalid", "author was changed");
  is(sentMessage6.subject, "Changed by listener6", "subject was changed");
  is(sentMessage6.recipients, "to@test6.invalid", "to was changed");
  is(sentMessage6.ccList, "cc@test6.invalid", "cc was changed");

  await new Promise(resolve => {
    window.MsgHdrToMimeMessage(sentMessage6, null, (msgHdr, mimeMessage) => {
      is(
        // Fold Windows line-endings \r\n to \n.
        mimeMessage.parts[0].body.replace(/\r/g, ""),
        "New body from listener6.\n"
      );
      resolve();
    });
  });

  ok(outboxMessages.length == 0);

  await new Promise(resolve => {
    outbox.deleteMessages(
      [sentMessage5, sentMessage6],
      null,
      true,
      false,
      { OnStopCopy: resolve },
      false
    );
  });
});

add_task(async function testChangeAttachments() {
  let files = {
    "background.js": async () => {
      // Add a listener that changes attachments. Sending should continue and
      // the attachments should change.

      let tab = await browser.compose.beginNew({
        to: ["test@test.invalid"],
        subject: "Test",
        body: "Original body.",
        attachments: [
          { file: new File(["remove"], "remove.txt") },
          { file: new File(["change"], "change.txt") },
        ],
      });

      let listener12 = async (tab, details) => {
        let attachments = await browser.compose.listAttachments(tab.id);
        browser.test.assertEq("remove.txt", attachments[0].name);
        browser.test.assertEq("change.txt", attachments[1].name);

        await browser.compose.removeAttachment(tab.id, attachments[0].id);
        await browser.compose.updateAttachment(tab.id, attachments[1].id, {
          name: "changed.txt",
        });
        await browser.compose.addAttachment(tab.id, {
          file: new File(["added"], "added.txt"),
        });

        attachments = await browser.compose.listAttachments(tab.id);
        browser.test.assertEq("changed.txt", attachments[0].name);
        browser.test.assertEq("added.txt", attachments[1].name);

        listener12.tab = tab;
      };
      browser.compose.onBeforeSend.addListener(listener12);

      await window.sendMessage("beginSend");
      browser.test.assertEq(tab.id, listener12.tab.id, "listener12 completed");
      browser.compose.onBeforeSend.removeListener(listener12);

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "compose"],
    },
  });

  extension.onMessage("beginSend", async () => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 1);

    let sendPromise = BrowserTestUtils.waitForEvent(
      composeWindows[0],
      "aftersend"
    );
    composeWindows[0]
      .GenericSendMessage(Ci.nsIMsgCompDeliverMode.Later)
      .catch(() => {
        // This test is ignoring errors thrown by GenericSendMessage, but looks
        // at didTryToSendMessage of the mocked CompleteGenericSendMessage to
        // check if onBeforeSend aborted the send process.
      });
    await sendPromise;
    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();

  await messagesInOutbox(1);

  let outboxMessages = [...outbox.messages];
  ok(outboxMessages.length > 0);
  let sentMessage12 = outboxMessages.shift();

  await new Promise(resolve => {
    window.MsgHdrToMimeMessage(sentMessage12, null, (msgHdr, mimeMessage) => {
      Assert.equal(mimeMessage.parts.length, 1);
      Assert.equal(mimeMessage.parts[0].parts.length, 3);
      Assert.equal(mimeMessage.parts[0].parts[1].name, "changed.txt");
      Assert.equal(mimeMessage.parts[0].parts[2].name, "added.txt");
      resolve();
    });
  });

  ok(outboxMessages.length == 0);

  await new Promise(resolve => {
    outbox.deleteMessages(
      [sentMessage12],
      null,
      true,
      false,
      { OnStopCopy: resolve },
      false
    );
  });
});

add_task(async function testListExpansion() {
  let files = {
    "background.js": async () => {
      function beginSend() {
        return window.sendMessage("beginSend");
      }

      function checkWindow(expected) {
        return window.sendMessage("checkWindow", expected);
      }

      let addressBook = await browser.addressBooks.create({
        name: "Baker Street",
      });
      let contacts = {
        sherlock: await browser.contacts.create(addressBook, {
          DisplayName: "Sherlock Holmes",
          PrimaryEmail: "sherlock@bakerstreet.invalid",
        }),
        john: await browser.contacts.create(addressBook, {
          DisplayName: "John Watson",
          PrimaryEmail: "john@bakerstreet.invalid",
        }),
      };
      let list = await browser.mailingLists.create(addressBook, {
        name: "Holmes and Watson",
        description: "Tenants221B",
      });
      await browser.mailingLists.addMember(list, contacts.sherlock);
      await browser.mailingLists.addMember(list, contacts.john);

      // Add a listener that changes the headers. Sending should continue and
      // the headers should change. The mailing list should be expanded in both
      // the To: and Bcc: headers.

      let createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({
        to: [{ id: list, type: "mailingList" }],
        subject: "Test",
      });
      let [createdWindow] = await createdWindowPromise;
      browser.test.assertEq("messageCompose", createdWindow.type);

      await checkWindow({
        to: ["Holmes and Watson <Tenants221B>"],
        subject: "Test",
      });

      let [tab] = await browser.tabs.query({ windowId: createdWindow.id });

      let listener7 = (tab, details) => {
        listener7.tab = tab;
        listener7.details = details;
        return {
          details: {
            bcc: details.to,
            subject: "Changed by listener7",
          },
        };
      };
      browser.compose.onBeforeSend.addListener(listener7);
      await beginSend();
      browser.test.assertEq(tab.id, listener7.tab.id, "listener7 was fired");
      browser.test.assertEq(1, listener7.details.to.length);
      browser.test.assertEq(
        "Holmes and Watson <Tenants221B>",
        listener7.details.to[0],
        "listener7 recipient correct"
      );
      browser.test.assertEq(
        "Test",
        listener7.details.subject,
        "listener7 subject correct"
      );
      browser.compose.onBeforeSend.removeListener(listener7);

      // Return nothing from the listener. The mailing list should be expanded.

      createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({
        to: [{ id: list, type: "mailingList" }],
        subject: "Test",
      });
      [createdWindow] = await createdWindowPromise;
      browser.test.assertEq("messageCompose", createdWindow.type);

      await checkWindow({
        to: ["Holmes and Watson <Tenants221B>"],
        subject: "Test",
      });

      [tab] = await browser.tabs.query({ windowId: createdWindow.id });

      let listener8 = (tab, details) => {
        listener8.tab = tab;
        listener8.details = details;
      };
      browser.compose.onBeforeSend.addListener(listener8);
      await beginSend();
      browser.test.assertEq(tab.id, listener8.tab.id, "listener8 was fired");
      browser.test.assertEq(1, listener8.details.to.length);
      browser.test.assertEq(
        "Holmes and Watson <Tenants221B>",
        listener8.details.to[0],
        "listener8 recipient correct"
      );
      browser.test.assertEq(
        "Test",
        listener8.details.subject,
        "listener8 subject correct"
      );
      browser.compose.onBeforeSend.removeListener(listener8);

      await browser.addressBooks.delete(addressBook);
      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["addressBooks", "compose"],
    },
  });

  extension.onMessage("beginSend", async () => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 1);

    composeWindows[0]
      .GenericSendMessage(Ci.nsIMsgCompDeliverMode.Later)
      .catch(() => {
        // This test is ignoring errors thrown by GenericSendMessage, but looks
        // at didTryToSendMessage of the mocked CompleteGenericSendMessage to
        // check if onBeforeSend aborted the send process.
      });
    extension.sendMessage();
  });

  extension.onMessage("checkWindow", async expected => {
    await checkComposeHeaders(expected);
    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();

  await messagesInOutbox(2);

  let outboxMessages = [...outbox.messages];
  ok(outboxMessages.length > 0);
  let sentMessage7 = outboxMessages.shift();
  is(sentMessage7.subject, "Changed by listener7", "subject was changed");
  is(
    sentMessage7.recipients,
    "Sherlock Holmes <sherlock@bakerstreet.invalid>, John Watson <john@bakerstreet.invalid>",
    "list in unchanged field was expanded"
  );
  is(
    sentMessage7.bccList,
    "Sherlock Holmes <sherlock@bakerstreet.invalid>, John Watson <john@bakerstreet.invalid>",
    "list in changed field was expanded"
  );

  ok(outboxMessages.length > 0);
  let sentMessage8 = outboxMessages.shift();
  is(sentMessage8.subject, "Test", "subject was not changed");
  is(
    sentMessage8.recipients,
    "Sherlock Holmes <sherlock@bakerstreet.invalid>, John Watson <john@bakerstreet.invalid>",
    "list in unchanged field was expanded"
  );

  ok(outboxMessages.length == 0);

  await new Promise(resolve => {
    outbox.deleteMessages(
      [sentMessage7, sentMessage8],
      null,
      true,
      false,
      { OnStopCopy: resolve },
      false
    );
  });
});

add_task(async function testMultipleListeners() {
  let extensionA = ExtensionTestUtils.loadExtension({
    background: async () => {
      let listener9 = (tab, details) => {
        browser.test.log("listener9 was fired");
        browser.test.sendMessage("listener9", details);
        browser.compose.onBeforeSend.removeListener(listener9);
        return {
          details: {
            to: ["recipient2@invalid"],
            subject: "Changed by listener9",
          },
        };
      };
      browser.compose.onBeforeSend.addListener(listener9);

      await browser.compose.beginNew({
        to: "recipient1@invalid",
        subject: "Initial subject",
      });
      browser.test.sendMessage("ready");
    },
    manifest: { permissions: ["compose"] },
  });

  let extensionB = ExtensionTestUtils.loadExtension({
    background: async () => {
      let listener10 = (tab, details) => {
        browser.test.log("listener10 was fired");
        browser.test.sendMessage("listener10", details);
        browser.compose.onBeforeSend.removeListener(listener10);
        return {
          details: {
            to: ["recipient3@invalid"],
            subject: "Changed by listener10",
          },
        };
      };
      browser.compose.onBeforeSend.addListener(listener10);

      let listener11 = (tab, details) => {
        browser.test.log("listener11 was fired");
        browser.test.sendMessage("listener11", details);
        browser.compose.onBeforeSend.removeListener(listener11);
        return {
          details: {
            to: ["recipient4@invalid"],
            subject: "Changed by listener11",
          },
        };
      };
      browser.compose.onBeforeSend.addListener(listener11);
      browser.test.sendMessage("ready");
    },
    manifest: { permissions: ["compose"] },
  });

  await extensionA.startup();
  await extensionB.startup();

  await extensionA.awaitMessage("ready");
  await extensionB.awaitMessage("ready");

  let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
  Assert.equal(composeWindows.length, 1);
  Assert.equal(composeWindows[0].document.readyState, "complete");
  composeWindows[0]
    .GenericSendMessage(Ci.nsIMsgCompDeliverMode.Later)
    .catch(() => {
      // This test is ignoring errors thrown by GenericSendMessage, but looks
      // at didTryToSendMessage of the mocked CompleteGenericSendMessage to
      // check if onBeforeSend aborted the send process.
    });

  let listener9Details = await extensionA.awaitMessage("listener9");
  Assert.equal(listener9Details.to.length, 1);
  Assert.equal(
    listener9Details.to[0],
    "recipient1@invalid",
    "listener9 recipient correct"
  );
  Assert.equal(
    listener9Details.subject,
    "Initial subject",
    "listener9 subject correct"
  );

  let listener10Details = await extensionB.awaitMessage("listener10");
  Assert.equal(listener10Details.to.length, 1);
  Assert.equal(
    listener10Details.to[0],
    "recipient2@invalid",
    "listener10 recipient correct"
  );
  Assert.equal(
    listener10Details.subject,
    "Changed by listener9",
    "listener10 subject correct"
  );

  let listener11Details = await extensionB.awaitMessage("listener11");
  Assert.equal(listener11Details.to.length, 1);
  Assert.equal(
    listener11Details.to[0],
    "recipient3@invalid",
    "listener11 recipient correct"
  );
  Assert.equal(
    listener11Details.subject,
    "Changed by listener10",
    "listener11 subject correct"
  );

  await extensionA.unload();
  await extensionB.unload();

  await messagesInOutbox(1);

  let outboxMessages = [...outbox.messages];
  Assert.ok(outboxMessages.length > 0);
  let sentMessage = outboxMessages.shift();
  Assert.equal(
    sentMessage.subject,
    "Changed by listener11",
    "subject was changed"
  );
  Assert.equal(
    sentMessage.recipients,
    "recipient4@invalid",
    "recipient was changed"
  );

  Assert.ok(outboxMessages.length == 0);

  await new Promise(resolve => {
    outbox.deleteMessages(
      [sentMessage],
      null,
      true,
      false,
      { OnStopCopy: resolve },
      false
    );
  });
});

add_task(async function test_MV3_event_pages() {
  let files = {
    "background.js": async () => {
      // Whenever the extension starts or wakes up, hasFired is set to false. In
      // case of a wake-up, the first fired event is the one that woke up the background.
      let hasFired = false;

      browser.compose.onBeforeSend.addListener((tab, details) => {
        // Only send the first event after background wake-up, this should be
        // the only one expected.
        if (!hasFired) {
          hasFired = true;
          browser.test.sendMessage("onBeforeSend received", details);
        }

        // Let us abort, so we do not have to re-open the compose window for
        // multiple tests.
        return {
          cancel: true,
        };
      });

      browser.test.sendMessage("background started");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      manifest_version: 3,
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["compose"],
      browser_specific_settings: {
        gecko: { id: "compose.onBeforeSend@xpcshell.test" },
      },
    },
  });

  function checkPersistentListeners({ primed }) {
    // A persistent event is referenced by its moduleName as defined in
    // ext-mails.json, not by its actual namespace.
    const persistent_events = ["compose.onBeforeSend"];

    for (let event of persistent_events) {
      let [moduleName, eventName] = event.split(".");
      assertPersistentListeners(extension, moduleName, eventName, {
        primed,
      });
    }
  }

  function beginSend() {
    composeWindow.GenericSendMessage(Ci.nsIMsgCompDeliverMode.Now).catch(() => {
      // This test is ignoring errors thrown by GenericSendMessage, but looks
      // at didTryToSendMessage of the mocked CompleteGenericSendMessage to
      // check if onBeforeSend aborted the send process.
    });
  }

  let composeWindow = await openComposeWindow(account);
  await focusWindow(composeWindow);

  await extension.startup();
  await extension.awaitMessage("background started");
  // The listeners should be persistent, but not primed.
  checkPersistentListeners({ primed: false });

  // Trigger onBeforeSend without terminating the background first.

  composeWindow.SetComposeDetails({ to: "first@invalid.net" });
  beginSend();
  let firstDetails = await extension.awaitMessage("onBeforeSend received");
  Assert.equal(
    "first@invalid.net",
    firstDetails.to,
    "Returned details should be correct"
  );

  // Terminate background and re-trigger onBeforeSend.

  await extension.terminateBackground({ disableResetIdleForTest: true });
  // The listeners should be primed.
  checkPersistentListeners({ primed: true });

  composeWindow.SetComposeDetails({ to: "second@invalid.net" });
  beginSend();
  let secondDetails = await extension.awaitMessage("onBeforeSend received");
  Assert.equal(
    "second@invalid.net",
    secondDetails.to,
    "Returned details should be correct"
  );

  // The background should have been restarted.
  await extension.awaitMessage("background started");
  // The listener should no longer be primed.
  checkPersistentListeners({ primed: false });

  await extension.unload();
  composeWindow.close();
});
