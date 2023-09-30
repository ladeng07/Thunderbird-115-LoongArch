/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

let account = createAccount();
let defaultIdentity = addIdentity(account);
let nonDefaultIdentity = addIdentity(account);
let gRootFolder = account.incomingServer.rootFolder;

gRootFolder.createSubfolder("test", null);
let gTestFolder = gRootFolder.getChildNamed("test");
createMessages(gTestFolder, 4);

add_task(async function testPlainTextBody() {
  let files = {
    "background.js": async () => {
      async function checkWindow(expected) {
        let state = await browser.compose.getComposeDetails(createdTab.id);
        for (let field of ["isPlainText"]) {
          if (field in expected) {
            browser.test.assertEq(
              expected[field],
              state[field],
              `Check value for ${field}`
            );
          }
        }
        for (let field of ["plainTextBody"]) {
          if (field in expected) {
            browser.test.assertEq(
              JSON.stringify(expected[field]),
              JSON.stringify(state[field]),
              `Check value for ${field}`
            );
          }
        }
      }

      // Start a new message.
      let createdWindowPromise = window.waitForEvent("windows.onCreated");
      await browser.compose.beginNew({ isPlainText: true });
      let [createdWindow] = await createdWindowPromise;
      let [createdTab] = await browser.tabs.query({
        windowId: createdWindow.id,
      });

      await checkWindow({ isPlainText: true });

      let tests = [
        {
          // Set plaintextBody with Windows style newlines. The return value of
          // the API is independent of the used OS and only returns LF endings.
          input: { isPlainText: true, plainTextBody: "123\r\n456\r\n789" },
          expected: { isPlainText: true, plainTextBody: "123\n456\n789" },
        },
        {
          // Set plaintextBody with Linux style newlines. The return value of
          // the API is independent of the used OS and only returns LF endings.
          input: { isPlainText: true, plainTextBody: "ABC\nDEF\nGHI" },
          expected: { isPlainText: true, plainTextBody: "ABC\nDEF\nGHI" },
        },
        {
          // Bug 1792551 without newline at the end.
          input: { isPlainText: true, plainTextBody: "123456 \n Hello " },
          expected: { isPlainText: true, plainTextBody: "123456 \n Hello " },
        },
        {
          // Bug 1792551 without newline at the end.
          input: { isPlainText: true, plainTextBody: "123456 &nbsp; \n " },
          expected: { isPlainText: true, plainTextBody: "123456 &nbsp; \n " },
        },
        {
          // Bug 1792551 with a newline at the end.
          input: { isPlainText: true, plainTextBody: "123456 \n Hello \n" },
          expected: { isPlainText: true, plainTextBody: "123456 \n Hello \n" },
        },
      ];
      for (let test of tests) {
        browser.test.log(`Checking input: ${JSON.stringify(test.input)}`);
        await browser.compose.setComposeDetails(createdTab.id, test.input);
        await checkWindow(test.expected);
      }

      browser.test.log("Replace plainTextBody with empty string");
      await browser.compose.setComposeDetails(createdTab.id, {
        isPlainText: true,
        plainTextBody: "Lorem ipsum",
      });
      await checkWindow({ isPlainText: true, plainTextBody: "Lorem ipsum" });
      await browser.compose.setComposeDetails(createdTab.id, {
        isPlainText: true,
        plainTextBody: "",
      });
      await checkWindow({ isPlainText: true, plainTextBody: "" });

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
      permissions: ["accountsRead", "compose"],
    },
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});

add_task(async function testBody() {
  // Open an compose window with HTML body.

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  params.composeFields.body = "<p>This is some <i>HTML</i> text.</p>";

  let htmlWindowPromise = BrowserTestUtils.domWindowOpened();
  MailServices.compose.OpenComposeWindowWithParams(null, params);
  let htmlWindow = await htmlWindowPromise;
  await BrowserTestUtils.waitForEvent(htmlWindow, "load");

  // Open another compose window with plain text body.

  params = Cc["@mozilla.org/messengercompose/composeparams;1"].createInstance(
    Ci.nsIMsgComposeParams
  );
  params.composeFields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  params.format = Ci.nsIMsgCompFormat.PlainText;
  params.composeFields.body = "This is some plain text.";

  let plainTextComposeWindowPromise = BrowserTestUtils.domWindowOpened();
  MailServices.compose.OpenComposeWindowWithParams(null, params);
  let plainTextWindow = await plainTextComposeWindowPromise;
  await BrowserTestUtils.waitForEvent(plainTextWindow, "load");

  // Run the extension.

  let extension = ExtensionTestUtils.loadExtension({
    background: async () => {
      let windows = await browser.windows.getAll({
        populate: true,
        windowTypes: ["messageCompose"],
      });
      let [htmlTabId, plainTextTabId] = windows.map(w => w.tabs[0].id);

      let plainTextBodyTag =
        '<body style="font-family: -moz-fixed; white-space: pre-wrap; width: 72ch;">';

      // Get details, HTML message.

      let htmlDetails = await browser.compose.getComposeDetails(htmlTabId);
      browser.test.log(JSON.stringify(htmlDetails));
      browser.test.assertTrue(!htmlDetails.isPlainText);
      browser.test.assertTrue(
        htmlDetails.body.includes("<p>This is some <i>HTML</i> text.</p>")
      );
      browser.test.assertEq(
        "This is some /HTML/ text.",
        htmlDetails.plainTextBody
      );

      // Set details, HTML message.

      await browser.compose.setComposeDetails(htmlTabId, {
        body: htmlDetails.body.replace("<i>HTML</i>", "<code>HTML</code>"),
      });
      htmlDetails = await browser.compose.getComposeDetails(htmlTabId);
      browser.test.log(JSON.stringify(htmlDetails));
      browser.test.assertTrue(!htmlDetails.isPlainText);
      browser.test.assertTrue(
        htmlDetails.body.includes("<p>This is some <code>HTML</code> text.</p>")
      );
      browser.test.assertTrue(
        "This is some HTML text.",
        htmlDetails.plainTextBody
      );

      // Get details, plain text message.

      let plainTextDetails = await browser.compose.getComposeDetails(
        plainTextTabId
      );
      browser.test.log(JSON.stringify(plainTextDetails));
      browser.test.assertTrue(plainTextDetails.isPlainText);
      browser.test.assertTrue(
        plainTextDetails.body.includes(
          plainTextBodyTag + "This is some plain text.</body>"
        )
      );
      browser.test.assertEq(
        "This is some plain text.",
        plainTextDetails.plainTextBody
      );

      // Set details, plain text message.

      await browser.compose.setComposeDetails(plainTextTabId, {
        plainTextBody:
          plainTextDetails.plainTextBody + "\nIndeed, it is plain.",
      });
      plainTextDetails = await browser.compose.getComposeDetails(
        plainTextTabId
      );
      browser.test.log(JSON.stringify(plainTextDetails));
      browser.test.assertTrue(plainTextDetails.isPlainText);
      browser.test.assertTrue(
        plainTextDetails.body.includes(
          plainTextBodyTag +
            "This is some plain text.<br>Indeed, it is plain.</body>"
        )
      );
      browser.test.assertEq(
        "This is some plain text.\nIndeed, it is plain.",
        // Fold Windows line-endings \r\n to \n.
        plainTextDetails.plainTextBody.replace(/\r/g, "")
      );

      // Some things that should fail.

      try {
        await browser.compose.setComposeDetails(plainTextTabId, {
          body: "Providing conflicting format settings.",
          isPlainText: true,
        });
        browser.test.fail(
          "calling setComposeDetails with these arguments should throw"
        );
      } catch (ex) {
        browser.test.succeed(`expected exception thrown: ${ex.message}`);
      }
      try {
        await browser.compose.setComposeDetails(htmlTabId, {
          plainTextBody: "Providing conflicting format settings.",
          isPlainText: false,
        });
        browser.test.fail(
          "calling setComposeDetails with these arguments should throw"
        );
      } catch (ex) {
        browser.test.succeed(`expected exception thrown: ${ex.message}`);
      }

      browser.test.notifyPass("finished");
    },
    manifest: {
      permissions: ["compose"],
    },
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();

  // Check the HTML message was edited.

  ok(htmlWindow.gMsgCompose.composeHTML);
  let htmlDocument = htmlWindow.GetCurrentEditor().document;
  info(htmlDocument.body.innerHTML);
  is(htmlDocument.querySelectorAll("i").length, 0, "<i> was removed");
  is(htmlDocument.querySelectorAll("code").length, 1, "<code> was added");

  // Close the HTML message.

  let closePromises = [
    // If the window is not marked as dirty, this Promise will never resolve.
    BrowserTestUtils.promiseAlertDialog("extra1"),
    BrowserTestUtils.domWindowClosed(htmlWindow),
  ];
  Assert.ok(
    htmlWindow.ComposeCanClose(),
    "compose window should be allowed to close"
  );
  htmlWindow.close();
  await Promise.all(closePromises);

  // Check the plain text message was edited.

  ok(!plainTextWindow.gMsgCompose.composeHTML);
  let plainTextDocument = plainTextWindow.GetCurrentEditor().document;
  info(plainTextDocument.body.innerHTML);
  ok(/Indeed, it is plain\./.test(plainTextDocument.body.innerHTML));

  // Close the plain text message.

  closePromises = [
    // If the window is not marked as dirty, this Promise will never resolve.
    BrowserTestUtils.promiseAlertDialog("extra1"),
    BrowserTestUtils.domWindowClosed(plainTextWindow),
  ];
  Assert.ok(
    plainTextWindow.ComposeCanClose(),
    "compose window should be allowed to close"
  );
  plainTextWindow.close();
  await Promise.all(closePromises);
});

add_task(async function testCJK() {
  let longCJKString = "안".repeat(400);

  // Open an compose window with HTML body.

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  params.composeFields.body = longCJKString;

  let htmlWindowPromise = BrowserTestUtils.domWindowOpened();
  MailServices.compose.OpenComposeWindowWithParams(null, params);
  let htmlWindow = await htmlWindowPromise;
  await BrowserTestUtils.waitForEvent(htmlWindow, "load");

  // Open another compose window with plain text body.

  params = Cc["@mozilla.org/messengercompose/composeparams;1"].createInstance(
    Ci.nsIMsgComposeParams
  );
  params.composeFields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  params.format = Ci.nsIMsgCompFormat.PlainText;
  params.composeFields.body = longCJKString;

  let plainTextComposeWindowPromise = BrowserTestUtils.domWindowOpened();
  MailServices.compose.OpenComposeWindowWithParams(null, params);
  let plainTextWindow = await plainTextComposeWindowPromise;
  await BrowserTestUtils.waitForEvent(plainTextWindow, "load");

  // Run the extension.

  let extension = ExtensionTestUtils.loadExtension({
    background: async () => {
      let longCJKString = "안".repeat(400);
      let windows = await browser.windows.getAll({
        populate: true,
        windowTypes: ["messageCompose"],
      });
      let [htmlTabId, plainTextTabId] = windows.map(w => w.tabs[0].id);

      let plainTextBodyTag =
        '<body style="font-family: -moz-fixed; white-space: pre-wrap; width: 72ch;">';

      // Get details, HTML message.

      let htmlDetails = await browser.compose.getComposeDetails(htmlTabId);
      browser.test.log(JSON.stringify(htmlDetails));
      browser.test.assertTrue(!htmlDetails.isPlainText);
      browser.test.assertTrue(
        htmlDetails.body.includes(longCJKString),
        "getComposeDetails.body from html composer returned CJK correctly"
      );
      browser.test.assertEq(
        longCJKString,
        htmlDetails.plainTextBody,
        "getComposeDetails.plainTextBody from html composer returned CJK correctly"
      );

      // Set details, HTML message.

      await browser.compose.setComposeDetails(htmlTabId, {
        body: longCJKString,
      });
      htmlDetails = await browser.compose.getComposeDetails(htmlTabId);
      browser.test.log(JSON.stringify(htmlDetails));
      browser.test.assertTrue(!htmlDetails.isPlainText);
      browser.test.assertTrue(
        htmlDetails.body.includes(longCJKString),
        "getComposeDetails.body from html composer returned CJK correctly as set by setComposeDetails"
      );
      browser.test.assertTrue(
        longCJKString,
        htmlDetails.plainTextBody,
        "getComposeDetails.plainTextBody from html composer returned CJK correctly as set by setComposeDetails"
      );

      // Get details, plain text message.

      let plainTextDetails = await browser.compose.getComposeDetails(
        plainTextTabId
      );
      browser.test.log(JSON.stringify(plainTextDetails));
      browser.test.assertTrue(plainTextDetails.isPlainText);
      browser.test.assertTrue(
        plainTextDetails.body.includes(plainTextBodyTag + longCJKString),
        "getComposeDetails.body from text composer returned CJK correctly"
      );
      browser.test.assertEq(
        longCJKString,
        plainTextDetails.plainTextBody,
        "getComposeDetails.plainTextBody from text composer returned CJK correctly"
      );

      // Set details, plain text message.

      await browser.compose.setComposeDetails(plainTextTabId, {
        plainTextBody: longCJKString,
      });
      plainTextDetails = await browser.compose.getComposeDetails(
        plainTextTabId
      );
      browser.test.log(JSON.stringify(plainTextDetails));
      browser.test.assertTrue(plainTextDetails.isPlainText);
      browser.test.assertTrue(
        plainTextDetails.body.includes(plainTextBodyTag + longCJKString),
        "getComposeDetails.body from text composer returned CJK correctly as set by setComposeDetails"
      );
      browser.test.assertEq(
        longCJKString,
        // Fold Windows line-endings \r\n to \n.
        plainTextDetails.plainTextBody.replace(/\r/g, ""),
        "getComposeDetails.plainTextBody from text composer returned CJK correctly as set by setComposeDetails"
      );

      browser.test.notifyPass("finished");
    },
    manifest: {
      permissions: ["compose"],
    },
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();

  // Close the HTML message.

  let closePromises = [
    // If the window is not marked as dirty, this Promise will never resolve.
    BrowserTestUtils.promiseAlertDialog("extra1"),
    BrowserTestUtils.domWindowClosed(htmlWindow),
  ];
  Assert.ok(
    htmlWindow.ComposeCanClose(),
    "compose window should be allowed to close"
  );
  htmlWindow.close();
  await Promise.all(closePromises);

  // Close the plain text message.

  closePromises = [
    // If the window is not marked as dirty, this Promise will never resolve.
    BrowserTestUtils.promiseAlertDialog("extra1"),
    BrowserTestUtils.domWindowClosed(plainTextWindow),
  ];
  Assert.ok(
    plainTextWindow.ComposeCanClose(),
    "compose window should be allowed to close"
  );
  plainTextWindow.close();
  await Promise.all(closePromises);
}).__skipMe = AppConstants.platform == "linux" && AppConstants.DEBUG; // Permanent failure on CI, bug 1766758.
