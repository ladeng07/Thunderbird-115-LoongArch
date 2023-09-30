/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var { ExtensionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ExtensionXPCShellUtils.sys.mjs"
);
var { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);
var { ExtensionsUI } = ChromeUtils.import(
  "resource:///modules/ExtensionsUI.jsm"
);
var { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

ExtensionTestUtils.mockAppInfo();
AddonTestUtils.maybeInit(this);

Services.prefs.setBoolPref(
  "mail.server.server1.autosync_offline_stores",
  false
);

registerCleanupFunction(async () => {
  // Remove the temporary MozillaMailnews folder, which is not deleted in time when
  // the cleanupFunction registered by AddonTestUtils.maybeInit() checks for left over
  // files in the temp folder.
  // Note: PathUtils.tempDir points to the system temp folder, which is different.
  let path = PathUtils.join(
    Services.dirsvc.get("TmpD", Ci.nsIFile).path,
    "MozillaMailnews"
  );
  await IOUtils.remove(path, { recursive: true });
});

// Function to start an event page extension (MV3), which can be called whenever
// the main test is about to trigger an event. The extension terminates its
// background and listens for that single event, verifying it is waking up correctly.
async function event_page_extension(eventName, actionCallback) {
  let ext = ExtensionTestUtils.loadExtension({
    files: {
      "background.js": async () => {
        // Whenever the extension starts or wakes up, hasFired is set to false. In
        // case of a wake-up, the first fired event is the one that woke up the background.
        let hasFired = false;
        let _eventName = browser.runtime.getManifest().description;

        browser.messages[_eventName].addListener(async (...args) => {
          // Only send the first event after background wake-up, this should
          // be the only one expected.
          if (!hasFired) {
            hasFired = true;
            browser.test.sendMessage(`${_eventName} received`, args);
          }
        });
        browser.test.sendMessage("background started");
      },
    },
    manifest: {
      manifest_version: 3,
      description: eventName,
      background: { scripts: ["background.js"] },
      browser_specific_settings: {
        gecko: { id: "event_page_extension@mochi.test" },
      },
      permissions: ["accountsRead", "messagesRead", "messagesMove"],
    },
  });
  await ext.startup();
  await ext.awaitMessage("background started");
  // The listener should be persistent, but not primed.
  assertPersistentListeners(ext, "messages", eventName, { primed: false });

  await ext.terminateBackground({ disableResetIdleForTest: true });
  // Verify the primed persistent listener.
  assertPersistentListeners(ext, "messages", eventName, { primed: true });

  await actionCallback();
  let rv = await ext.awaitMessage(`${eventName} received`);
  await ext.awaitMessage("background started");
  // The listener should be persistent, but not primed.
  assertPersistentListeners(ext, "messages", eventName, { primed: false });

  await ext.unload();
  return rv;
}

add_task(
  {
    skip_if: () => IS_NNTP,
  },
  async function test_move_copy_delete() {
    await AddonTestUtils.promiseStartupManager();

    let account = createAccount();
    let rootFolder = account.incomingServer.rootFolder;
    let subFolders = {
      test1: await createSubfolder(rootFolder, "test1"),
      test2: await createSubfolder(rootFolder, "test2"),
      test3: await createSubfolder(rootFolder, "test3"),
      trash: rootFolder.getChildNamed("Trash"),
    };
    await createMessages(subFolders.trash, 4);
    // 4 messages must be created before this line or test_move_copy_delete will break.
    await createMessages(subFolders.test1, 5);

    let files = {
      "background.js": async () => {
        async function capturePrimedEvent(eventName, callback) {
          let eventPageExtensionReadyPromise = window.waitForMessage();
          browser.test.sendMessage("capturePrimedEvent", eventName);
          await eventPageExtensionReadyPromise;
          let eventPageExtensionFinishedPromise = window.waitForMessage();
          callback();
          return eventPageExtensionFinishedPromise;
        }

        async function checkMessagesInFolder(expectedKeys, folder) {
          let expectedSubjects = expectedKeys.map(k => messages[k].subject);

          let { messages: actualMessages } = await browser.messages.list(
            folder
          );
          browser.test.log("expect: " + expectedSubjects.sort());
          browser.test.log(
            "actual: " + actualMessages.map(m => m.subject).sort()
          );

          browser.test.assertEq(
            expectedSubjects.sort().toString(),
            actualMessages
              .map(m => m.subject)
              .sort()
              .toString(),
            "Messages on server should be correct"
          );
          for (let m of actualMessages) {
            browser.test.assertTrue(
              expectedSubjects.includes(m.subject),
              `${m.subject} at ${m.id}`
            );
            messages[m.subject.split(" ")[0]].id = m.id;
          }

          // Return the messages for convenience.
          return actualMessages;
        }

        function newMovePromise(numberOfEventsToCollapse = 1) {
          return new Promise(resolve => {
            let seenEvents = 0;
            let seenSrcMsgs = [];
            let seenDstMsgs = [];
            const listener = (srcMsgs, dstMsgs) => {
              seenEvents++;
              seenSrcMsgs.push(...srcMsgs.messages);
              seenDstMsgs.push(...dstMsgs.messages);
              if (seenEvents == numberOfEventsToCollapse) {
                browser.messages.onMoved.removeListener(listener);
                resolve({ srcMsgs: seenSrcMsgs, dstMsgs: seenDstMsgs });
              }
            };
            browser.messages.onMoved.addListener(listener);
          });
        }

        function newCopyPromise(numberOfEventsToCollapse = 1) {
          return new Promise(resolve => {
            let seenEvents = 0;
            let seenSrcMsgs = [];
            let seenDstMsgs = [];
            const listener = (srcMsgs, dstMsgs) => {
              seenEvents++;
              seenSrcMsgs.push(...srcMsgs.messages);
              seenDstMsgs.push(...dstMsgs.messages);
              if (seenEvents == numberOfEventsToCollapse) {
                browser.messages.onCopied.removeListener(listener);
                resolve({ srcMsgs: seenSrcMsgs, dstMsgs: seenDstMsgs });
              }
            };
            browser.messages.onCopied.addListener(listener);
          });
        }

        function newDeletePromise(numberOfEventsToCollapse = 1) {
          return new Promise(resolve => {
            let seenEvents = 0;
            let seenMsgs = [];
            const listener = msgs => {
              seenEvents++;
              seenMsgs.push(...msgs.messages);
              if (seenEvents == numberOfEventsToCollapse) {
                browser.messages.onDeleted.removeListener(listener);
                resolve(seenMsgs);
              }
            };
            browser.messages.onDeleted.addListener(listener);
          });
        }

        async function checkEventInformation(
          infoPromise,
          expected,
          messages,
          dstFolder
        ) {
          let eventInfo = await infoPromise;
          browser.test.assertEq(eventInfo.srcMsgs.length, expected.length);
          browser.test.assertEq(eventInfo.dstMsgs.length, expected.length);
          for (let msg of expected) {
            let idx = eventInfo.srcMsgs.findIndex(
              e => e.id == messages[msg].id
            );
            browser.test.assertEq(
              eventInfo.srcMsgs[idx].subject,
              messages[msg].subject
            );
            browser.test.assertEq(
              eventInfo.dstMsgs[idx].subject,
              messages[msg].subject
            );
            browser.test.assertEq(
              eventInfo.dstMsgs[idx].folder.path,
              dstFolder.path
            );
          }
        }

        let [accountId] = await window.sendMessage("getAccount");
        let { folders } = await browser.accounts.get(accountId);
        let testFolder1 = folders.find(f => f.name == "test1");
        let testFolder2 = folders.find(f => f.name == "test2");
        let testFolder3 = folders.find(f => f.name == "test3");
        let trashFolder = folders.find(f => f.name == "Trash");

        let { messages: folder1Messages } = await browser.messages.list(
          testFolder1
        );

        // Since the ID of a message changes when it is moved, track by subject.
        let messages = {};
        for (let m of folder1Messages) {
          messages[m.subject.split(" ")[0]] = { id: m.id, subject: m.subject };
        }

        // To help with debugging, output the IDs of our five messages.
        browser.test.log(JSON.stringify(messages)); // Red:1, Green:2, Blue:3, My:4, Happy:5

        browser.test.log("");
        browser.test.log(" --> Move one message to another folder.");
        let movePromise = newMovePromise();
        let primedMoveInfo = await capturePrimedEvent("onMoved", () =>
          browser.messages.move([messages.Red.id], testFolder2)
        );
        window.assertDeepEqual(
          await movePromise,
          {
            srcMsgs: primedMoveInfo[0].messages,
            dstMsgs: primedMoveInfo[1].messages,
          },
          "The primed and non-primed onMoved events should return the same values",
          { strict: true }
        );
        await checkEventInformation(
          movePromise,
          ["Red"],
          messages,
          testFolder2
        );

        await window.sendMessage("forceServerUpdate", testFolder1.name);
        await window.sendMessage("forceServerUpdate", testFolder2.name);

        await checkMessagesInFolder(
          ["Green", "Blue", "My", "Happy"],
          testFolder1
        );
        await checkMessagesInFolder(["Red"], testFolder2);
        browser.test.log(JSON.stringify(messages)); // Red:6, Green:2, Blue:3, My:4, Happy:5

        browser.test.log("");
        browser.test.log(" --> And back again.");
        movePromise = newMovePromise();
        primedMoveInfo = await capturePrimedEvent("onMoved", () =>
          browser.messages.move([messages.Red.id], testFolder1)
        );
        window.assertDeepEqual(
          await movePromise,
          {
            srcMsgs: primedMoveInfo[0].messages,
            dstMsgs: primedMoveInfo[1].messages,
          },
          "The primed and non-primed onMoved events should return the same values",
          { strict: true }
        );
        await checkEventInformation(
          movePromise,
          ["Red"],
          messages,
          testFolder1
        );

        await window.sendMessage("forceServerUpdate", testFolder2.name);
        await window.sendMessage("forceServerUpdate", testFolder1.name);

        await checkMessagesInFolder(
          ["Red", "Green", "Blue", "My", "Happy"],
          testFolder1
        );
        await checkMessagesInFolder([], testFolder2);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:2, Blue:3, My:4, Happy:5

        browser.test.log("");
        browser.test.log(" --> Move two messages to another folder.");
        movePromise = newMovePromise();
        primedMoveInfo = await capturePrimedEvent("onMoved", () =>
          browser.messages.move(
            [messages.Green.id, messages.My.id],
            testFolder2
          )
        );
        window.assertDeepEqual(
          await movePromise,
          {
            srcMsgs: primedMoveInfo[0].messages,
            dstMsgs: primedMoveInfo[1].messages,
          },
          "The primed and non-primed onMoved events should return the same values",
          { strict: true }
        );
        await checkEventInformation(
          movePromise,
          ["Green", "My"],
          messages,
          testFolder2
        );

        await window.sendMessage("forceServerUpdate", testFolder1.name);
        await window.sendMessage("forceServerUpdate", testFolder2.name);

        await checkMessagesInFolder(["Red", "Blue", "Happy"], testFolder1);
        await checkMessagesInFolder(["Green", "My"], testFolder2);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:8, Blue:3, My:9, Happy:5

        browser.test.log("");
        browser.test.log(" --> Move one back again: " + messages.My.id);
        movePromise = newMovePromise();
        primedMoveInfo = await capturePrimedEvent("onMoved", () =>
          browser.messages.move([messages.My.id], testFolder1)
        );
        window.assertDeepEqual(
          await movePromise,
          {
            srcMsgs: primedMoveInfo[0].messages,
            dstMsgs: primedMoveInfo[1].messages,
          },
          "The primed and non-primed onMoved events should return the same values",
          { strict: true }
        );
        await checkEventInformation(movePromise, ["My"], messages, testFolder1);

        await window.sendMessage("forceServerUpdate", testFolder2.name);
        await window.sendMessage("forceServerUpdate", testFolder1.name);

        await checkMessagesInFolder(
          ["Red", "Blue", "My", "Happy"],
          testFolder1
        );
        await checkMessagesInFolder(["Green"], testFolder2);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:8, Blue:3, My:10, Happy:5

        browser.test.log("");
        browser.test.log(
          " --> Move messages from different folders to a third folder."
        );
        // We collapse the two events (one for each source folder).
        movePromise = newMovePromise(2);
        await browser.messages.move(
          [messages.Green.id, messages.My.id],
          testFolder3
        );
        await checkEventInformation(
          movePromise,
          ["Green", "My"],
          messages,
          testFolder3
        );

        await window.sendMessage("forceServerUpdate", testFolder1.name);
        await window.sendMessage("forceServerUpdate", testFolder2.name);
        await window.sendMessage("forceServerUpdate", testFolder3.name);

        await checkMessagesInFolder(["Red", "Blue", "Happy"], testFolder1);
        await checkMessagesInFolder([], testFolder2);
        await checkMessagesInFolder(["Green", "My"], testFolder3);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:11, Blue:3, My:12, Happy:5

        browser.test.log("");
        browser.test.log(
          " --> The following tests should not trigger move events."
        );
        let listenerCalls = 0;
        const listenerFunc = () => {
          listenerCalls++;
        };
        browser.messages.onMoved.addListener(listenerFunc);

        // Move a message to the folder it's already in.
        await browser.messages.move([messages.Green.id], testFolder3);
        await checkMessagesInFolder(["Green", "My"], testFolder3);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:11, Blue:3, My:12, Happy:5

        // Move no messages.
        await browser.messages.move([], testFolder3);
        await checkMessagesInFolder(["Red", "Blue", "Happy"], testFolder1);
        await checkMessagesInFolder([], testFolder2);
        await checkMessagesInFolder(["Green", "My"], testFolder3);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:11, Blue:3, My:12, Happy:5

        // Move a non-existent message.
        await browser.test.assertRejects(
          browser.messages.move([9999], testFolder1),
          /Error moving message/,
          "something should happen"
        );

        // Move to a non-existent folder.
        await browser.test.assertRejects(
          browser.messages.move([messages.Red.id], {
            accountId,
            path: "/missing",
          }),
          /Error moving message/,
          "something should happen"
        );

        // Check that no move event was triggered.
        browser.messages.onMoved.removeListener(listenerFunc);
        browser.test.assertEq(0, listenerCalls);

        browser.test.log("");
        browser.test.log(
          " --> Put everything back where it was at the start of the test."
        );
        movePromise = newMovePromise();
        await browser.messages.move(
          [messages.My.id, messages.Green.id],
          testFolder1
        );
        await checkEventInformation(
          movePromise,
          ["Green", "My"],
          messages,
          testFolder1
        );

        await window.sendMessage("forceServerUpdate", testFolder3.name);
        await window.sendMessage("forceServerUpdate", testFolder1.name);

        await checkMessagesInFolder(
          ["Red", "Green", "Blue", "My", "Happy"],
          testFolder1
        );
        await checkMessagesInFolder([], testFolder2);
        await checkMessagesInFolder([], testFolder3);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:13, Blue:3, My:14, Happy:5

        browser.test.log("");
        browser.test.log(" --> Copy one message to another folder.");
        let copyPromise = newCopyPromise();
        let primedCopyInfo = await capturePrimedEvent("onCopied", () =>
          browser.messages.copy([messages.Happy.id], testFolder2)
        );
        window.assertDeepEqual(
          await copyPromise,
          {
            srcMsgs: primedCopyInfo[0].messages,
            dstMsgs: primedCopyInfo[1].messages,
          },
          "The primed and non-primed onCopied events should return the same values",
          { strict: true }
        );
        await checkEventInformation(
          copyPromise,
          ["Happy"],
          messages,
          testFolder2
        );

        await window.sendMessage("forceServerUpdate", testFolder1.name);
        await window.sendMessage("forceServerUpdate", testFolder2.name);
        await window.sendMessage("forceServerUpdate", testFolder3.name);

        await checkMessagesInFolder(
          ["Red", "Green", "Blue", "My", "Happy"],
          testFolder1
        );
        let { messages: folder2Messages } = await browser.messages.list(
          testFolder2
        );
        browser.test.assertEq(1, folder2Messages.length);
        browser.test.assertEq(
          messages.Happy.subject,
          folder2Messages[0].subject
        );
        browser.test.assertTrue(folder2Messages[0].id != messages.Happy.id);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:13, Blue:3, My:14, Happy:5

        browser.test.log("");
        browser.test.log(" --> Delete the copied message.");
        let deletePromise = newDeletePromise();
        let primedDeleteLog = await capturePrimedEvent("onDeleted", () =>
          browser.messages.delete([folder2Messages[0].id], true)
        );
        // Check if the delete information is correct.
        let deleteLog = await deletePromise;
        window.assertDeepEqual(
          [
            {
              id: null,
              messages: deleteLog,
            },
          ],
          primedDeleteLog,
          "The primed and non-primed onDeleted events should return the same values",
          { strict: true }
        );
        browser.test.assertEq(1, deleteLog.length);
        browser.test.assertEq(folder2Messages[0].id, deleteLog[0].id);

        await window.sendMessage("forceServerUpdate", testFolder1.name);
        await window.sendMessage("forceServerUpdate", testFolder2.name);
        await window.sendMessage("forceServerUpdate", testFolder3.name);

        // Check if the message was deleted.
        await checkMessagesInFolder(
          ["Red", "Green", "Blue", "My", "Happy"],
          testFolder1
        );
        await checkMessagesInFolder([], testFolder2);
        await checkMessagesInFolder([], testFolder3);
        browser.test.log(JSON.stringify(messages)); // Red:7, Green:13, Blue:3, My:14, Happy:5

        browser.test.log("");
        browser.test.log(" --> Move a message to the trash.");
        movePromise = newMovePromise();
        primedMoveInfo = await capturePrimedEvent("onMoved", () =>
          browser.messages.move([messages.Green.id], trashFolder)
        );
        window.assertDeepEqual(
          await movePromise,
          {
            srcMsgs: primedMoveInfo[0].messages,
            dstMsgs: primedMoveInfo[1].messages,
          },
          "The primed and non-primed onMoved events should return the same values",
          { strict: true }
        );
        await checkEventInformation(
          movePromise,
          ["Green"],
          messages,
          trashFolder
        );

        await window.sendMessage("forceServerUpdate", testFolder1.name);
        await window.sendMessage("forceServerUpdate", testFolder2.name);
        await window.sendMessage("forceServerUpdate", testFolder3.name);

        await checkMessagesInFolder(
          ["Red", "Blue", "My", "Happy"],
          testFolder1
        );
        await checkMessagesInFolder([], testFolder2);
        await checkMessagesInFolder([], testFolder3);

        let { messages: trashFolderMessages } = await browser.messages.list(
          trashFolder
        );
        browser.test.assertTrue(
          trashFolderMessages.find(m => m.subject == messages.Green.subject)
        );

        browser.test.notifyPass("finished");
      },
      "utils.js": await getUtilsJS(),
    };
    let extension = ExtensionTestUtils.loadExtension({
      files,
      manifest: {
        background: { scripts: ["utils.js", "background.js"] },
        permissions: [
          "accountsRead",
          "messagesMove",
          "messagesRead",
          "messagesDelete",
        ],
        browser_specific_settings: {
          gecko: { id: "messages.move@mochi.test" },
        },
      },
    });

    extension.onMessage("forceServerUpdate", async foldername => {
      if (IS_IMAP) {
        let folder = rootFolder
          .getChildNamed(foldername)
          .QueryInterface(Ci.nsIMsgImapMailFolder);

        let listener = new PromiseTestUtils.PromiseUrlListener();
        folder.updateFolderWithListener(null, listener);
        await listener.promise;

        // ...and download for offline use.
        let promiseUrlListener = new PromiseTestUtils.PromiseUrlListener();
        folder.downloadAllForOffline(promiseUrlListener, null);
        await promiseUrlListener.promise;
      }
      extension.sendMessage();
    });

    extension.onMessage("capturePrimedEvent", async eventName => {
      let primedEventData = await event_page_extension(eventName, () => {
        // Resume execution in the main test, after the event page extension is
        // ready to capture the event with deactivated background.
        extension.sendMessage();
      });
      extension.sendMessage(...primedEventData);
    });

    extension.onMessage("getAccount", () => {
      extension.sendMessage(account.key);
    });

    // The sync between the IMAP Service and the fake IMAP Server is partially
    // broken: It is not possible to re-move messages cleanly. The move commands
    // are send to the server about 500ms after the local operation and the server
    // will update the local state wrongly.
    // In this test we enforce a server update after each operation. If this is
    // still causing intermittent fails, enable the offline mode for this test.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=1797764#c24
    await extension.startup();
    await extension.awaitFinish("finished");
    await extension.unload();

    cleanUpAccount(account);
    await AddonTestUtils.promiseShutdownManager();
  }
);
