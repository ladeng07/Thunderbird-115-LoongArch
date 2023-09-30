/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

requestLongerTimeout(4);

let gRootFolder;
add_setup(async () => {
  let account = createAccount();
  gRootFolder = account.incomingServer.rootFolder;
  gRootFolder.createSubfolder("testFolder", null);
  gRootFolder.createSubfolder("otherFolder", null);
  await createMessages(gRootFolder.getChildNamed("testFolder"), 5);
});

async function testOpenMessages(testConfig) {
  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "background.js": async () => {
        // Verify startup conditions.
        let accounts = await browser.accounts.list();
        browser.test.assertEq(
          1,
          accounts.length,
          `number of accounts should be correct`
        );

        let testFolder = accounts[0].folders.find(f => f.name == "testFolder");
        browser.test.assertTrue(!!testFolder, "folder should exist");
        let { messages } = await browser.messages.list(testFolder);
        browser.test.assertEq(
          5,
          messages.length,
          `number of messages should be correct`
        );

        // Get test properties.
        let [testConfig] = await window.sendMessage("getTestConfig");

        async function open(message, testConfig) {
          let properties = { ...testConfig };
          if (properties.headerMessageId) {
            properties.headerMessageId = message.headerMessageId;
          } else if (properties.messageId) {
            properties.messageId = message.id;
          } else if (properties.file) {
            properties.file = new File(
              [await browser.messages.getRaw(message.id)],
              "msgfile.eml"
            );
          }
          return browser.messageDisplay.open(properties);
        }

        let expectedFail;
        let additionalWindowIdToBeRemoved;
        if (testConfig.windowType) {
          switch (testConfig.windowType) {
            case "normal":
              {
                let secondWindow = await browser.windows.create({
                  type: testConfig.windowType,
                });
                testConfig.windowId = secondWindow.id;
                additionalWindowIdToBeRemoved = secondWindow.id;
              }
              break;
            case "popup":
              {
                let secondWindow = await browser.windows.create({
                  type: testConfig.windowType,
                });
                testConfig.windowId = secondWindow.id;
                additionalWindowIdToBeRemoved = secondWindow.id;
                expectedFail = `Window with ID ${secondWindow.id} is not a normal window`;
              }
              break;
            case "invalid":
              testConfig.windowId = 1234;
              expectedFail = `Invalid window ID: 1234`;
              break;
          }
          delete testConfig.windowType;
        }

        if (expectedFail) {
          await browser.test.assertRejects(
            open(messages[0], testConfig),
            `${expectedFail}`,
            "browser.messageDisplay.open() should fail with invalid windowId"
          );
        } else {
          // Open multiple messages.
          let promisedTabs = [];
          promisedTabs.push(open(messages[0], testConfig));
          promisedTabs.push(open(messages[0], testConfig));
          promisedTabs.push(open(messages[1], testConfig));
          promisedTabs.push(open(messages[1], testConfig));
          promisedTabs.push(open(messages[2], testConfig));
          promisedTabs.push(open(messages[2], testConfig));
          let openedTabs = await Promise.allSettled(promisedTabs);
          for (let i = 0; i < openedTabs.length; i++) {
            browser.test.assertEq(
              "fulfilled",
              openedTabs[i].status,
              `Promise for the opened message should have been fulfilled for message ${i}`
            );

            let msg = await browser.messageDisplay.getDisplayedMessage(
              openedTabs[i].value.id
            );
            if (testConfig.file) {
              browser.test.assertTrue(
                messages[Math.floor(i / 2)].id != msg.id,
                `Opened file msg should have a new message id (${
                  msg.id
                }) and should not equal the id of the source message (${
                  messages[Math.floor(i / 2)].id
                }) in window ${i}`
              );
            } else {
              browser.test.assertEq(
                messages[Math.floor(i / 2)].id,
                msg.id,
                `Should see the correct message in window ${i}`
              );
            }
            await browser.tabs.remove(openedTabs[i].value.id);
          }
        }

        if (additionalWindowIdToBeRemoved) {
          await browser.windows.remove(additionalWindowIdToBeRemoved);
        }

        browser.test.notifyPass();
      },
      "utils.js": await getUtilsJS(),
    },
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "messagesRead", "tabs"],
    },
  });

  let about3Pane = document.getElementById("tabmail").currentAbout3Pane;
  about3Pane.displayFolder(gRootFolder.getChildNamed("otherFolder"));

  extension.onMessage("getTestConfig", async () => {
    extension.sendMessage(testConfig);
  });

  await extension.startup();
  await extension.awaitFinish();
  await extension.unload();
}

add_task(async function testMessageIdActiveDefault() {
  await testOpenMessages({ messageId: true, active: true });
});
add_task(async function testMessageIdInactiveDefault() {
  await testOpenMessages({ messageId: true, active: false });
});
add_task(async function testMessageIdActiveWindow() {
  await testOpenMessages({
    messageId: true,
    active: true,
    location: "window",
  });
});
add_task(async function testMessageIdInactiveWindow() {
  await testOpenMessages({
    messageId: true,
    active: false,
    location: "window",
  });
});
add_task(async function testMessageIdActiveTab() {
  await testOpenMessages({
    messageId: true,
    active: true,
    location: "tab",
  });
});
add_task(async function testMessageIdInActiveTab() {
  await testOpenMessages({
    messageId: true,
    active: false,
    location: "tab",
  });
});
add_task(async function testMessageIdOtherNormalWindowActiveTab() {
  await testOpenMessages({
    messageId: true,
    active: true,
    location: "tab",
    windowType: "normal",
  });
});
add_task(async function testMessageIdOtherNormalWindowInactiveTab() {
  await testOpenMessages({
    messageId: true,
    active: false,
    location: "tab",
    windowType: "normal",
  });
});
add_task(async function testMessageIdOtherPopupWindowFail() {
  await testOpenMessages({
    messageId: true,
    location: "tab",
    windowType: "popup",
  });
});
add_task(async function testMessageIdInvalidWindowFail() {
  await testOpenMessages({
    messageId: true,
    location: "tab",
    windowType: "invalid",
  });
});
