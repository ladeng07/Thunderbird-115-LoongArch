/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

let account = createAccount();
let defaultIdentity = addIdentity(account);
let nonDefaultIdentity = addIdentity(account);
defaultIdentity.attachVCard = false;
nonDefaultIdentity.attachVCard = true;

let gRootFolder = account.incomingServer.rootFolder;

gRootFolder.createSubfolder("test", null);
let gTestFolder = gRootFolder.getChildNamed("test");
createMessages(gTestFolder, 4);

// TODO: Figure out why naming this folder drafts is problematic.
gRootFolder.createSubfolder("something", null);
let gDraftsFolder = gRootFolder.getChildNamed("something");
gDraftsFolder.flags = Ci.nsMsgFolderFlags.Drafts;
createMessages(gDraftsFolder, 2);
let gDrafts = [...gDraftsFolder.messages];

// Verifies ComposeDetails of a given composer can be applied to a different
// composer, even if they have different compose formats. The composer should pick
// the matching body/plaintextBody value, if both are specified. The value for
// isPlainText is ignored by setComposeDetails.
add_task(async function testIsReflexive() {
  let files = {
    "background.js": async () => {
      // Start a new TEXT message.
      let createdTextWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({
        plainTextBody: "This is some PLAIN text.",
        isPlainText: true,
      });
      let [createdTextWindow] = await createdTextWindowPromise;
      let [createdTextTab] = await browser.tabs.query({
        windowId: createdTextWindow.id,
      });

      // Get details, TEXT message.
      let textDetails = await browser.compose.getComposeDetails(
        createdTextTab.id
      );
      browser.test.assertTrue(textDetails.isPlainText);
      browser.test.assertTrue(
        textDetails.body.includes("This is some PLAIN text")
      );
      browser.test.assertEq(
        "This is some PLAIN text.",
        textDetails.plainTextBody
      );

      // Start a new HTML message.
      let createdHtmlWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({
        body: "<p>This is some <i>HTML</i> text.</p>",
        isPlainText: false,
      });
      let [createdHtmlWindow] = await createdHtmlWindowPromise;
      let [createdHtmlTab] = await browser.tabs.query({
        windowId: createdHtmlWindow.id,
      });

      // Get details, HTML message.
      let htmlDetails = await browser.compose.getComposeDetails(
        createdHtmlTab.id
      );
      browser.test.assertFalse(htmlDetails.isPlainText);
      browser.test.assertTrue(
        htmlDetails.body.includes("<p>This is some <i>HTML</i> text.</p>")
      );
      browser.test.assertEq(
        "This is some /HTML/ text.",
        htmlDetails.plainTextBody
      );

      // Set HTML details on HTML composer. It should not throw.
      await browser.compose.setComposeDetails(createdHtmlTab.id, htmlDetails);

      // Set TEXT details on TEXT composer. It should not throw.
      await browser.compose.setComposeDetails(createdTextTab.id, textDetails);

      // Set TEXT details on HTML composer and verify the changed content.
      await browser.compose.setComposeDetails(createdHtmlTab.id, textDetails);
      let htmlDetails2 = await browser.compose.getComposeDetails(
        createdHtmlTab.id
      );
      browser.test.assertFalse(htmlDetails2.isPlainText);
      browser.test.assertTrue(
        htmlDetails2.body.includes("This is some PLAIN text")
      );
      browser.test.assertEq(
        "This is some PLAIN text.",
        htmlDetails2.plainTextBody
      );

      // Set HTML details on TEXT composer and verify the changed content.
      await browser.compose.setComposeDetails(createdTextTab.id, htmlDetails);
      let textDetails2 = await browser.compose.getComposeDetails(
        createdTextTab.id
      );
      browser.test.assertTrue(textDetails2.isPlainText);
      browser.test.assertTrue(
        textDetails2.body.includes("This is some /HTML/ text.")
      );
      browser.test.assertEq(
        "This is some /HTML/ text.",
        textDetails2.plainTextBody
      );

      // Clean up.

      let removedHtmlWindowPromise = window.waitForEvent("windows.onRemoved");
      browser.windows.remove(createdHtmlWindow.id);
      await removedHtmlWindowPromise;

      let removedTextWindowPromise = window.waitForEvent("windows.onRemoved");
      browser.windows.remove(createdTextWindow.id);
      await removedTextWindowPromise;

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

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});

add_task(async function testType() {
  let files = {
    "background.js": async () => {
      let accounts = await browser.accounts.list();
      browser.test.assertEq(1, accounts.length, "number of accounts");

      let testFolder = accounts[0].folders.find(f => f.name == "test");
      let messages = (await browser.messages.list(testFolder)).messages;
      browser.test.assertEq(4, messages.length, "number of messages");

      let draftFolder = accounts[0].folders.find(f => f.name == "something");
      let drafts = (await browser.messages.list(draftFolder)).messages;
      browser.test.assertEq(2, drafts.length, "number of drafts");

      async function checkComposer(tab, expected) {
        browser.test.assertEq("object", typeof tab, "type of tab");
        browser.test.assertEq("number", typeof tab.id, "type of tab ID");
        browser.test.assertEq(
          "number",
          typeof tab.windowId,
          "type of window ID"
        );

        let details = await browser.compose.getComposeDetails(tab.id);
        browser.test.assertEq(expected.type, details.type, "type of composer");
        browser.test.assertEq(
          expected.relatedMessageId,
          details.relatedMessageId,
          `related message id (${details.type})`
        );
        await browser.windows.remove(tab.windowId);
      }

      let tests = [
        {
          funcName: "beginNew",
          args: [],
          expected: { type: "new", relatedMessageId: null },
        },
        {
          funcName: "beginReply",
          args: [messages[0].id],
          expected: { type: "reply", relatedMessageId: messages[0].id },
        },
        {
          funcName: "beginReply",
          args: [messages[1].id, "replyToAll"],
          expected: { type: "reply", relatedMessageId: messages[1].id },
        },
        {
          funcName: "beginReply",
          args: [messages[2].id, "replyToList"],
          expected: { type: "reply", relatedMessageId: messages[2].id },
        },
        {
          funcName: "beginReply",
          args: [messages[3].id, "replyToSender"],
          expected: { type: "reply", relatedMessageId: messages[3].id },
        },
        {
          funcName: "beginForward",
          args: [messages[0].id],
          expected: { type: "forward", relatedMessageId: messages[0].id },
        },
        {
          funcName: "beginForward",
          args: [messages[1].id, "forwardAsAttachment"],
          expected: { type: "forward", relatedMessageId: messages[1].id },
        },
        // Uses a different code path.
        {
          funcName: "beginForward",
          args: [messages[2].id, "forwardInline"],
          expected: { type: "forward", relatedMessageId: messages[2].id },
        },
        {
          funcName: "beginNew",
          args: [messages[3].id],
          expected: { type: "new", relatedMessageId: messages[3].id },
        },
      ];
      for (let test of tests) {
        browser.test.log(test.funcName);
        let tab = await browser.compose[test.funcName](...test.args);
        await checkComposer(tab, test.expected);
      }

      browser.tabs.onCreated.addListener(async tab => {
        // Bug 1702957, if composeWindow.GetComposeDetails() is not delayed
        // until the compose window is ready, it will overwrite the compose
        // fields.
        let details = await browser.compose.getComposeDetails(tab.id);
        browser.test.assertEq(
          "Johnny Jones <johnny@jones.invalid>",
          details.to.pop(),
          "Check Recipients in draft after calling getComposeDetails()"
        );

        let window = await browser.windows.get(tab.windowId);
        if (window.type == "messageCompose") {
          await checkComposer(tab, {
            type: "draft",
            relatedMessageId: drafts[0].id,
          });
          browser.test.notifyPass("Finish");
        }
      });
      browser.test.sendMessage("openDrafts");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["compose", "accountsRead", "messagesRead"],
    },
  });

  await extension.startup();

  // The first part of the test is done in the background script using the
  // compose API to open compose windows. For the second part we need to open
  // a draft, which is not possible with the compose API.
  await extension.awaitMessage("openDrafts");
  window.ComposeMessage(
    Ci.nsIMsgCompType.Draft,
    Ci.nsIMsgCompFormat.Default,
    gDraftsFolder,
    [gDraftsFolder.generateMessageURI(gDrafts[0].messageKey)]
  );

  await extension.awaitFinish("Finish");
  await extension.unload();
});

add_task(async function testFcc() {
  let files = {
    "background.js": async () => {
      async function checkWindow(createdTab, expected) {
        let state = await browser.compose.getComposeDetails(createdTab.id);

        browser.test.assertEq(
          expected.overrideDefaultFcc,
          state.overrideDefaultFcc,
          "overrideDefaultFcc should be correct"
        );

        if (expected.overrideDefaultFccFolder) {
          window.assertDeepEqual(
            state.overrideDefaultFccFolder,
            expected.overrideDefaultFccFolder,
            "overrideDefaultFccFolder should be correct"
          );
        } else {
          browser.test.assertEq(
            expected.overrideDefaultFccFolder,
            state.overrideDefaultFccFolder,
            "overrideDefaultFccFolder should be correct"
          );
        }

        if (expected.additionalFccFolder) {
          window.assertDeepEqual(
            state.additionalFccFolder,
            expected.additionalFccFolder,
            "additionalFccFolder should be correct"
          );
        } else {
          browser.test.assertEq(
            expected.additionalFccFolder,
            state.additionalFccFolder,
            "additionalFccFolder should be correct"
          );
        }

        await window.sendMessage("checkWindow", expected);
      }

      let [account] = await browser.accounts.list();
      let folder1 = account.folders.find(f => f.name == "Trash");
      let folder2 = account.folders.find(f => f.name == "something");

      // Start a new message.

      let createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew();
      let [createdWindow] = await createdWindowPromise;
      let [createdTab] = await browser.tabs.query({
        windowId: createdWindow.id,
      });

      await checkWindow(createdTab, {
        overrideDefaultFcc: false,
        overrideDefaultFccFolder: null,
        additionalFccFolder: "",
      });

      await browser.test.assertRejects(
        browser.compose.setComposeDetails(createdTab.id, {
          overrideDefaultFcc: true,
        }),
        "Setting overrideDefaultFcc to true requires setting overrideDefaultFccFolder as well",
        "browser.compose.setComposeDetails() should reject setting overrideDefaultFcc to true."
      );

      // Set folders.
      await browser.compose.setComposeDetails(createdTab.id, {
        overrideDefaultFccFolder: folder1,
        additionalFccFolder: folder2,
      });
      await checkWindow(createdTab, {
        overrideDefaultFcc: true,
        overrideDefaultFccFolder: folder1,
        additionalFccFolder: folder2,
      });

      // Setting overrideDefaultFcc true while it is already true should not change any values.
      await browser.compose.setComposeDetails(createdTab.id, {
        overrideDefaultFcc: true,
      });
      await checkWindow(createdTab, {
        overrideDefaultFcc: true,
        overrideDefaultFccFolder: folder1,
        additionalFccFolder: folder2,
      });

      // A no-op should not change any values.
      await browser.compose.setComposeDetails(createdTab.id, {});
      await checkWindow(createdTab, {
        overrideDefaultFcc: true,
        overrideDefaultFccFolder: folder1,
        additionalFccFolder: folder2,
      });

      // Disable fcc.
      await browser.compose.setComposeDetails(createdTab.id, {
        overrideDefaultFccFolder: "",
      });
      await checkWindow(createdTab, {
        overrideDefaultFcc: true,
        overrideDefaultFccFolder: "",
        additionalFccFolder: folder2,
      });

      // Disable additional fcc.
      await browser.compose.setComposeDetails(createdTab.id, {
        additionalFccFolder: "",
      });
      await checkWindow(createdTab, {
        overrideDefaultFcc: true,
        overrideDefaultFccFolder: "",
        additionalFccFolder: "",
      });

      // Clear override.
      await browser.compose.setComposeDetails(createdTab.id, {
        overrideDefaultFcc: false,
      });
      await checkWindow(createdTab, {
        overrideDefaultFcc: false,
        overrideDefaultFccFolder: null,
        additionalFccFolder: "",
      });

      await browser.test.assertRejects(
        browser.compose.setComposeDetails(createdTab.id, {
          overrideDefaultFccFolder: {
            path: "/bad",
            accountId: folder1.accountId,
          },
        }),
        `Invalid MailFolder: {accountId:${folder1.accountId}, path:/bad}`,
        "browser.compose.setComposeDetails() should reject, if an invalid folder is set as overrideDefaultFccFolder."
      );

      await browser.test.assertRejects(
        browser.compose.setComposeDetails(createdTab.id, {
          additionalFccFolder: { path: "/bad", accountId: folder1.accountId },
        }),
        `Invalid MailFolder: {accountId:${folder1.accountId}, path:/bad}`,
        "browser.compose.setComposeDetails() should reject, if an invalid folder is set as additionalFccFolder."
      );

      // Clean up.

      let removedWindowPromise = window.waitForEvent("windows.onRemoved");
      browser.windows.remove(createdWindow.id);
      await removedWindowPromise;

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "compose", "messagesRead"],
    },
  });

  extension.onMessage("checkWindow", async expected => {
    await checkComposeHeaders(expected);
    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});

add_task(async function testSimpleDetails() {
  let files = {
    "background.js": async () => {
      async function checkWindow(createdTab, expected) {
        let state = await browser.compose.getComposeDetails(createdTab.id);

        if (expected.priority) {
          browser.test.assertEq(
            expected.priority,
            state.priority,
            "priority should be correct"
          );
        }

        if (expected.hasOwnProperty("returnReceipt")) {
          browser.test.assertEq(
            expected.returnReceipt,
            state.returnReceipt,
            "returnReceipt should be correct"
          );
        }

        if (expected.hasOwnProperty("deliveryStatusNotification")) {
          browser.test.assertEq(
            expected.deliveryStatusNotification,
            state.deliveryStatusNotification,
            "deliveryStatusNotification should be correct"
          );
        }

        if (expected.hasOwnProperty("attachVCard")) {
          browser.test.assertEq(
            expected.attachVCard,
            state.attachVCard,
            "attachVCard should be correct"
          );
        }

        if (expected.deliveryFormat) {
          browser.test.assertEq(
            expected.deliveryFormat,
            state.deliveryFormat,
            "deliveryFormat should be correct"
          );
        }

        await window.sendMessage("checkWindow", expected);
      }

      // Start a new message.

      let createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew();
      let [createdWindow] = await createdWindowPromise;
      let [createdTab] = await browser.tabs.query({
        windowId: createdWindow.id,
      });

      let accounts = await browser.accounts.list();
      browser.test.assertEq(1, accounts.length, "number of accounts");
      let localAccount = accounts.find(a => a.type == "none");
      browser.test.assertEq(
        2,
        localAccount.identities.length,
        "number of identities"
      );
      let [defaultIdentity, nonDefaultIdentity] = localAccount.identities;

      let expected = {
        priority: "normal",
        returnReceipt: false,
        deliveryStatusNotification: false,
        deliveryFormat: "auto",
        attachVCard: false,
        identityId: defaultIdentity.id,
      };

      async function changeDetail(key, value, _expected = {}) {
        await browser.compose.setComposeDetails(createdTab.id, {
          [key]: value,
        });
        expected[key] = value;
        for (let [k, v] of Object.entries(_expected)) {
          expected[k] = v;
        }
        await checkWindow(createdTab, expected);
      }

      // Confirm initial condition.
      await checkWindow(createdTab, expected);

      // Changing the identity without having made any changes, should load the
      // defaults of the second identity.
      await changeDetail("identityId", nonDefaultIdentity.id, {
        attachVCard: true,
      });

      // Switching back should restore the defaults of the first identity.
      await changeDetail("identityId", defaultIdentity.id, {
        attachVCard: false,
      });

      await changeDetail("priority", "highest");
      await changeDetail("deliveryFormat", "html");
      await changeDetail("returnReceipt", true);
      await changeDetail("deliveryFormat", "plaintext");
      await changeDetail("priority", "lowest");
      await changeDetail("attachVCard", true);
      await changeDetail("priority", "high");
      await changeDetail("deliveryFormat", "both");
      await changeDetail("deliveryStatusNotification", true);
      await changeDetail("priority", "low");

      await changeDetail("priority", "normal");
      await changeDetail("deliveryFormat", "auto");
      await changeDetail("attachVCard", false);
      await changeDetail("returnReceipt", false);
      await changeDetail("deliveryStatusNotification", false);

      // Changing the identity should not load the defaults of the second identity,
      // after the values had been changed.
      await changeDetail("identityId", nonDefaultIdentity.id);

      // Clean up.

      let removedWindowPromise = window.waitForEvent("windows.onRemoved");
      browser.windows.remove(createdWindow.id);
      await removedWindowPromise;

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "compose", "messagesRead"],
    },
  });

  extension.onMessage("checkWindow", async expected => {
    await checkComposeHeaders(expected);
    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});

add_task(async function testAutoComplete() {
  let files = {
    "background.js": async () => {
      async function checkWindow(createdTab, expected) {
        let state = await browser.compose.getComposeDetails(createdTab.id);

        for (let [id, value] of Object.entries(expected.pills)) {
          browser.test.assertEq(
            value,
            state[id].length ? state[id][0] : "",
            `value for ${id} should be correct`
          );
        }

        await window.sendMessage("checkWindow", expected);
      }

      // Start a new message.
      let createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew();
      let [createdWindow] = await createdWindowPromise;
      let [createdTab] = await browser.tabs.query({
        windowId: createdWindow.id,
      });

      // Create a test contact.
      let [addressBook] = await browser.addressBooks.list(true);
      let contactId = await browser.contacts.create(addressBook.id, {
        PrimaryEmail: "autocomplete@invalid",
        DisplayName: "Autocomplete Test",
      });

      // Confirm the addrTo field has focus and addrTo and replyTo fields are empty.
      await checkWindow(createdTab, {
        activeElement: "toAddrInput",
        pills: { to: "", replyTo: "" },
        values: { toAddrInput: "", replyAddrInput: "" },
      });

      // Set the replyTo field, which should not break autocomplete for the currently active addrTo
      // field.
      await browser.compose.setComposeDetails(createdTab.id, {
        replyTo: "test@user.net",
      });

      // Confirm the addrTo field has focus and replyTo field is set.
      await checkWindow(createdTab, {
        activeElement: "toAddrInput",
        pills: { to: "", replyTo: "test@user.net" },
        values: { toAddrInput: "", replyAddrInput: "" },
      });

      // Manually type "Autocomplete" into the active field, which should be the toAddr field and it
      // should autocomplete.
      await window.sendMessage("typeIntoActiveAddrField", "Autocomplete");

      // Confirm the addrTo field has focus and replyTo field is set and the addrTo field has been
      // autocompleted.
      await checkWindow(createdTab, {
        activeElement: "toAddrInput",
        pills: { to: "", replyTo: "test@user.net" },
        values: {
          toAddrInput: "Autocomplete Test <autocomplete@invalid>",
          replyAddrInput: "",
        },
      });

      // Clean up.
      await browser.contacts.delete(contactId);
      let removedWindowPromise = window.waitForEvent("windows.onRemoved");
      browser.windows.remove(createdWindow.id);
      await removedWindowPromise;

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "compose", "addressBooks"],
    },
  });

  extension.onMessage("typeIntoActiveAddrField", async value => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 1);

    for (const s of value) {
      EventUtils.synthesizeKey(s, {}, composeWindows[0]);
      await new Promise(r => composeWindows[0].setTimeout(r));
    }

    extension.sendMessage();
  });

  extension.onMessage("checkWindow", async expected => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 1);
    let composeDocument = composeWindows[0].document;
    await new Promise(resolve => composeWindows[0].setTimeout(resolve));

    Assert.equal(
      composeDocument.activeElement.id,
      expected.activeElement,
      `Active element should be correct`
    );

    for (let [id, value] of Object.entries(expected.values)) {
      await TestUtils.waitForCondition(
        () => composeDocument.getElementById(id).value == value,
        `Value of field ${id} should be correct`
      );
    }

    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});
