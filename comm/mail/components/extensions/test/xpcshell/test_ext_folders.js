/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var { ExtensionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ExtensionXPCShellUtils.sys.mjs"
);

add_task(
  {
    skip_if: () => IS_NNTP,
  },
  async function test_folders() {
    let files = {
      "background.js": async () => {
        let [accountId, IS_IMAP] = await window.waitForMessage();

        let account = await browser.accounts.get(accountId);
        browser.test.assertEq(3, account.folders.length);

        // Test create.

        let onCreatedPromise = window.waitForEvent("folders.onCreated");
        let folder1 = await browser.folders.create(account, "folder1");
        let [createdFolder] = await onCreatedPromise;
        for (let folder of [folder1, createdFolder]) {
          browser.test.assertEq(accountId, folder.accountId);
          browser.test.assertEq("folder1", folder.name);
          browser.test.assertEq("/folder1", folder.path);
        }

        account = await browser.accounts.get(accountId);
        // Check order of the returned folders being correct (new folder not last).
        browser.test.assertEq(4, account.folders.length);
        if (IS_IMAP) {
          browser.test.assertEq("Inbox", account.folders[0].name);
          browser.test.assertEq("Trash", account.folders[1].name);
        } else {
          browser.test.assertEq("Trash", account.folders[0].name);
          browser.test.assertEq("Outbox", account.folders[1].name);
        }
        browser.test.assertEq("folder1", account.folders[2].name);
        browser.test.assertEq("unused", account.folders[3].name);

        let folder2 = await browser.folders.create(folder1, "folder+2");
        browser.test.assertEq(accountId, folder2.accountId);
        browser.test.assertEq("folder+2", folder2.name);
        browser.test.assertEq("/folder1/folder+2", folder2.path);

        account = await browser.accounts.get(accountId);
        browser.test.assertEq(4, account.folders.length);
        browser.test.assertEq(1, account.folders[2].subFolders.length);
        browser.test.assertEq(
          "/folder1/folder+2",
          account.folders[2].subFolders[0].path
        );

        // Test reject on creating already existing folder.
        await browser.test.assertRejects(
          browser.folders.create(folder1, "folder+2"),
          `folders.create() failed, because folder+2 already exists in /folder1`,
          "browser.folders.create threw exception"
        );

        // Test rename.

        {
          let onRenamedPromise = window.waitForEvent("folders.onRenamed");
          let folder3 = await browser.folders.rename(
            { accountId, path: "/folder1/folder+2" },
            "folder3"
          );
          let [originalFolder, renamedFolder] = await onRenamedPromise;
          // Test the original folder.
          browser.test.assertEq(accountId, originalFolder.accountId);
          browser.test.assertEq("folder+2", originalFolder.name);
          browser.test.assertEq("/folder1/folder+2", originalFolder.path);
          // Test the renamed folder.
          for (let folder of [folder3, renamedFolder]) {
            browser.test.assertEq(accountId, folder.accountId);
            browser.test.assertEq("folder3", folder.name);
            browser.test.assertEq("/folder1/folder3", folder.path);
          }

          account = await browser.accounts.get(accountId);
          browser.test.assertEq(4, account.folders.length);
          browser.test.assertEq(1, account.folders[2].subFolders.length);
          browser.test.assertEq(
            "/folder1/folder3",
            account.folders[2].subFolders[0].path
          );

          // Test reject on renaming absolute root.
          await browser.test.assertRejects(
            browser.folders.rename({ accountId, path: "/" }, "UhhOh"),
            `folders.rename() failed, because it cannot rename the root of the account`,
            "browser.folders.rename threw exception"
          );

          // Test reject on renaming to existing folder.
          await browser.test.assertRejects(
            browser.folders.rename(
              { accountId, path: "/folder1/folder3" },
              "folder3"
            ),
            `folders.rename() failed, because folder3 already exists in /folder1`,
            "browser.folders.rename threw exception"
          );
        }

        // Test delete (and onMoved).

        {
          // The delete request will trigger an onDelete event for IMAP and an
          // onMoved event for local folders.
          let deletePromise = window.waitForEvent(
            `folders.${IS_IMAP ? "onDeleted" : "onMoved"}`
          );
          await browser.folders.delete({ accountId, path: "/folder1/folder3" });
          // The onMoved event returns the original/deleted and the new folder.
          // The onDeleted event returns just the original/deleted folder.
          let [originalFolder, folderMovedToTrash] = await deletePromise;

          // Test the originalFolder folder.
          browser.test.assertEq(accountId, originalFolder.accountId);
          browser.test.assertEq("folder3", originalFolder.name);
          browser.test.assertEq("/folder1/folder3", originalFolder.path);

          // Check if it really is in trash folder.
          account = await browser.accounts.get(accountId);
          browser.test.assertEq(4, account.folders.length);
          let trashFolder = account.folders.find(f => f.name == "Trash");
          browser.test.assertTrue(trashFolder);
          browser.test.assertEq("/Trash", trashFolder.path);
          browser.test.assertEq(1, trashFolder.subFolders.length);
          browser.test.assertEq(
            "/Trash/folder3",
            trashFolder.subFolders[0].path
          );
          browser.test.assertEq("/folder1", account.folders[2].path);

          if (!IS_IMAP) {
            // For non IMAP folders, the delete request has triggered an onMoved
            // event, check if that has reported moving the folder to trash.
            browser.test.assertEq(accountId, folderMovedToTrash.accountId);
            browser.test.assertEq("folder3", folderMovedToTrash.name);
            browser.test.assertEq("/Trash/folder3", folderMovedToTrash.path);

            // Delete the folder from trash.
            let onDeletedPromise = window.waitForEvent("folders.onDeleted");
            await browser.folders.delete({ accountId, path: "/Trash/folder3" });
            let [deletedFolder] = await onDeletedPromise;
            browser.test.assertEq(accountId, deletedFolder.accountId);
            browser.test.assertEq("folder3", deletedFolder.name);
            browser.test.assertEq("/Trash/folder3", deletedFolder.path);
            // Check if the folder is gone.
            let trashSubfolders = await browser.folders.getSubFolders(
              trashFolder,
              false
            );
            browser.test.assertEq(
              0,
              trashSubfolders.length,
              "Folder has been deleted from trash."
            );
          } else {
            // The IMAP test server signals success for the delete request, but
            // keeps the folder. Testing for this broken behavior to get notified
            // via test fails, if this behaviour changes.
            await browser.folders.delete({ accountId, path: "/Trash/folder3" });
            let trashSubfolders = await browser.folders.getSubFolders(
              trashFolder,
              false
            );
            browser.test.assertEq(
              "/Trash/folder3",
              trashSubfolders[0].path,
              "IMAP test server cannot delete from trash, the folder is still there."
            );
          }

          // Test reject on deleting non-existing folder.
          await browser.test.assertRejects(
            browser.folders.delete({ accountId, path: "/folder1/folder5" }),
            `Folder not found: /folder1/folder5`,
            "browser.folders.delete threw exception"
          );

          account = await browser.accounts.get(accountId);
          browser.test.assertEq(4, account.folders.length);
          browser.test.assertEq("/folder1", account.folders[2].path);
        }

        // Test move.

        {
          await browser.folders.create(folder1, "folder4");
          let onMovedPromise = window.waitForEvent("folders.onMoved");
          let folder4_moved = await browser.folders.move(
            { accountId, path: "/folder1/folder4" },
            { accountId, path: "/" }
          );
          let [originalFolder, movedFolder] = await onMovedPromise;
          // Test the original folder.
          browser.test.assertEq(accountId, originalFolder.accountId);
          browser.test.assertEq("folder4", originalFolder.name);
          browser.test.assertEq("/folder1/folder4", originalFolder.path);
          // Test the moved folder.
          for (let folder of [folder4_moved, movedFolder]) {
            browser.test.assertEq(accountId, folder.accountId);
            browser.test.assertEq("folder4", folder.name);
            browser.test.assertEq("/folder4", folder.path);
          }

          account = await browser.accounts.get(accountId);
          browser.test.assertEq(5, account.folders.length);
          browser.test.assertEq("/folder4", account.folders[3].path);

          // Test reject on moving to already existing folder.
          await browser.test.assertRejects(
            browser.folders.move(folder4_moved, account),
            `folders.move() failed, because folder4 already exists in /`,
            "browser.folders.move threw exception"
          );
        }

        // Test copy.

        {
          let onCopiedPromise = window.waitForEvent("folders.onCopied");
          let folder4_copied = await browser.folders.copy(
            { accountId, path: "/folder4" },
            { accountId, path: "/folder1" }
          );
          let [originalFolder, copiedFolder] = await onCopiedPromise;
          // Test the original folder.
          browser.test.assertEq(accountId, originalFolder.accountId);
          browser.test.assertEq("folder4", originalFolder.name);
          browser.test.assertEq("/folder4", originalFolder.path);
          // Test the copied folder.
          for (let folder of [folder4_copied, copiedFolder]) {
            browser.test.assertEq(accountId, folder.accountId);
            browser.test.assertEq("folder4", folder.name);
            browser.test.assertEq("/folder1/folder4", folder.path);
          }

          account = await browser.accounts.get(accountId);
          browser.test.assertEq(5, account.folders.length);
          browser.test.assertEq(1, account.folders[2].subFolders.length);
          browser.test.assertEq("/folder4", account.folders[3].path);
          browser.test.assertEq(
            "/folder1/folder4",
            account.folders[2].subFolders[0].path
          );

          // Test reject on copy to already existing folder.
          await browser.test.assertRejects(
            browser.folders.copy(folder4_copied, folder1),
            `folders.copy() failed, because folder4 already exists in /folder1`,
            "browser.folders.copy threw exception"
          );
        }

        browser.test.notifyPass("finished");
      },
      "utils.js": await getUtilsJS(),
    };
    let extension = ExtensionTestUtils.loadExtension({
      files,
      manifest: {
        background: { scripts: ["utils.js", "background.js"] },
        permissions: ["accountsRead", "accountsFolders", "messagesDelete"],
      },
    });

    let account = createAccount();
    // Not all folders appear immediately on IMAP. Creating a new one causes them to appear.
    await createSubfolder(account.incomingServer.rootFolder, "unused");

    // We should now have three folders. For IMAP accounts they are Inbox, Trash,
    // and unused. Otherwise they are Trash, Unsent Messages and unused.

    await extension.startup();
    extension.sendMessage(account.key, IS_IMAP);
    await extension.awaitFinish("finished");
    await extension.unload();
  }
);

add_task(
  {
    skip_if: () => IS_NNTP,
  },
  async function test_without_delete_permission() {
    let files = {
      "background.js": async () => {
        let [accountId] = await window.waitForMessage();

        // Test reject on delete without messagesDelete permission.
        await browser.test.assertRejects(
          browser.folders.delete({ accountId, path: "/unused" }),
          `Using folders.delete() requires the "accountsFolders" and the "messagesDelete" permission`,
          "It rejects for a missing permission."
        );

        browser.test.notifyPass("finished");
      },
      "utils.js": await getUtilsJS(),
    };
    let extension = ExtensionTestUtils.loadExtension({
      files,
      manifest: {
        background: { scripts: ["utils.js", "background.js"] },
        permissions: ["accountsRead", "accountsFolders"],
      },
    });

    let account = createAccount();
    // Not all folders appear immediately on IMAP. Creating a new one causes them to appear.
    await createSubfolder(account.incomingServer.rootFolder, "unused");

    // We should now have three folders. For IMAP accounts they are Inbox,
    // Trash, and unused. Otherwise they are Trash, Unsent Messages and unused.
    await extension.startup();
    extension.sendMessage(account.key);
    await extension.awaitFinish("finished");
    await extension.unload();
  }
);

add_task(async function test_getParentFolders_getSubFolders() {
  let files = {
    "background.js": async () => {
      let [accountId] = await window.waitForMessage();
      let account = await browser.accounts.get(accountId);

      async function createSubFolder(folderOrAccount, name) {
        let subFolder = await browser.folders.create(folderOrAccount, name);
        let basePath = folderOrAccount.path || "/";
        if (!basePath.endsWith("/")) {
          basePath = basePath + "/";
        }
        browser.test.assertEq(accountId, subFolder.accountId);
        browser.test.assertEq(name, subFolder.name);
        browser.test.assertEq(`${basePath}${name}`, subFolder.path);
        return subFolder;
      }

      // Create a new root folder in the account.
      let root = await createSubFolder(account, "MyRoot");

      // Build a flat list of newly created nested folders in MyRoot.
      let flatFolders = [root];
      for (let i = 0; i < 10; i++) {
        flatFolders.push(await createSubFolder(flatFolders[i], `level${i}`));
      }

      // Test getParentFolders().

      // Pop out the last child folder and get its parents.
      let lastChild = flatFolders.pop();
      let parentsWithSubDefault = await browser.folders.getParentFolders(
        lastChild
      );
      let parentsWithSubFalse = await browser.folders.getParentFolders(
        lastChild,
        false
      );
      let parentsWithSubTrue = await browser.folders.getParentFolders(
        lastChild,
        true
      );

      browser.test.assertEq(10, parentsWithSubDefault.length, "Correct depth.");
      browser.test.assertEq(10, parentsWithSubFalse.length, "Correct depth.");
      browser.test.assertEq(10, parentsWithSubTrue.length, "Correct depth.");

      // Reverse the flatFolders array, to match the expected return value of
      // getParentFolders().
      flatFolders.reverse();

      // Build expected nested subfolder structure.
      lastChild.subFolders = [];
      let flatFoldersWithSub = [];
      for (let i = 0; i < 10; i++) {
        let f = {};
        Object.assign(f, flatFolders[i]);
        if (i == 0) {
          f.subFolders = [lastChild];
        } else {
          f.subFolders = [flatFoldersWithSub[i - 1]];
        }
        flatFoldersWithSub.push(f);
      }

      // Test return values of getParentFolders(). The way the flatFolder array
      // has been created, its entries do not have subFolder properties.
      for (let i = 0; i < 10; i++) {
        window.assertDeepEqual(parentsWithSubFalse[i], flatFolders[i]);
        window.assertDeepEqual(flatFolders[i], parentsWithSubFalse[i]);

        window.assertDeepEqual(parentsWithSubTrue[i], flatFoldersWithSub[i]);
        window.assertDeepEqual(flatFoldersWithSub[i], parentsWithSubTrue[i]);

        // Default = false
        window.assertDeepEqual(parentsWithSubDefault[i], flatFolders[i]);
        window.assertDeepEqual(flatFolders[i], parentsWithSubDefault[i]);
      }

      // Test getSubFolders().

      let expectedSubsWithSub = [flatFoldersWithSub[8]];
      let expectedSubsWithoutSub = [flatFolders[8]];

      // Test excluding subfolders (so only the direct subfolder are reported).
      let subsWithSubFalse = await browser.folders.getSubFolders(root, false);
      window.assertDeepEqual(expectedSubsWithoutSub, subsWithSubFalse);
      window.assertDeepEqual(subsWithSubFalse, expectedSubsWithoutSub);

      // Test including all subfolders.
      let subsWithSubTrue = await browser.folders.getSubFolders(root, true);
      window.assertDeepEqual(expectedSubsWithSub, subsWithSubTrue);
      window.assertDeepEqual(subsWithSubTrue, expectedSubsWithSub);

      // Test default subfolder handling of getSubFolders (= true).
      let subsWithSubDefault = await browser.folders.getSubFolders(root);
      window.assertDeepEqual(subsWithSubDefault, subsWithSubTrue);
      window.assertDeepEqual(subsWithSubTrue, subsWithSubDefault);

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "accountsFolders"],
    },
  });

  let account = createAccount();
  // Not all folders appear immediately on IMAP. Creating a new one causes them to appear.
  await createSubfolder(account.incomingServer.rootFolder, "unused");

  // We should now have three folders. For IMAP accounts they are Inbox,
  // Trash, and unused. Otherwise they are Trash, Unsent Messages and unused.
  await extension.startup();
  extension.sendMessage(account.key);
  await extension.awaitFinish("finished");
  await extension.unload();
});

add_task(async function test_getFolderInfo() {
  let files = {
    "background.js": async () => {
      let [accountId, IS_NNTP] = await window.waitForMessage();

      let account = await browser.accounts.get(accountId);
      browser.test.assertEq(IS_NNTP ? 1 : 3, account.folders.length);
      let folders = await browser.folders.getSubFolders(account, false);
      let InfoTestFolder = folders.find(f => f.name == "InfoTest");

      // Verify initial state.
      let info = await browser.folders.getFolderInfo(InfoTestFolder);
      window.assertDeepEqual(
        { totalMessageCount: 12, unreadMessageCount: 12, favorite: false },
        info
      );

      // Test flipping favorite to true and marking all messages as read.
      let onFolderInfoChangedPromise = window.waitForEvent(
        "folders.onFolderInfoChanged"
      );
      await window.sendMessage("markAllAsRead");
      await window.sendMessage("setFavorite", true);
      let [mailFolder, mailFolderInfo] = await onFolderInfoChangedPromise;
      window.assertDeepEqual(
        { unreadMessageCount: 0, favorite: true },
        mailFolderInfo
      );
      browser.test.assertEq(InfoTestFolder.path, mailFolder.path);

      info = await browser.folders.getFolderInfo(InfoTestFolder);
      window.assertDeepEqual(
        { totalMessageCount: 12, unreadMessageCount: 0, favorite: true },
        info
      );

      // Test flipping favorite back to false.
      onFolderInfoChangedPromise = window.waitForEvent(
        "folders.onFolderInfoChanged"
      );
      await window.sendMessage("setFavorite", false);
      [mailFolder, mailFolderInfo] = await onFolderInfoChangedPromise;
      window.assertDeepEqual({ favorite: false }, mailFolderInfo);
      browser.test.assertEq(InfoTestFolder.path, mailFolder.path);

      // Test setting some messages back to unread.
      onFolderInfoChangedPromise = window.waitForEvent(
        "folders.onFolderInfoChanged"
      );
      await window.sendMessage("markSomeAsUnread", 5);
      [mailFolder, mailFolderInfo] = await onFolderInfoChangedPromise;
      window.assertDeepEqual({ unreadMessageCount: 5 }, mailFolderInfo);

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "accountsFolders", "messagesDelete"],
    },
  });

  let account = createAccount();
  // Not all folders appear immediately on IMAP. Creating a new one causes them to appear.
  let InfoTestFolder = await createSubfolder(
    account.incomingServer.rootFolder,
    "InfoTest"
  );
  await createMessages(InfoTestFolder, 12);

  extension.onMessage("markAllAsRead", () => {
    InfoTestFolder.markAllMessagesRead(null);
    extension.sendMessage();
  });

  extension.onMessage("markSomeAsUnread", count => {
    let messages = InfoTestFolder.messages;
    while (messages.hasMoreElements() && count > 0) {
      let msg = messages.getNext();
      msg.markRead(false);
      count--;
    }
    extension.sendMessage();
  });

  extension.onMessage("setFavorite", value => {
    if (value) {
      InfoTestFolder.setFlag(Ci.nsMsgFolderFlags.Favorite);
    } else {
      InfoTestFolder.clearFlag(Ci.nsMsgFolderFlags.Favorite);
    }
    extension.sendMessage();
  });

  // We should now have three folders. For IMAP accounts they are Inbox, Trash,
  // and InfoTest. Otherwise they are Trash, Unsent Messages and InfoTest.

  await extension.startup();
  extension.sendMessage(account.key, IS_NNTP);
  await extension.awaitFinish("finished");
  await extension.unload();
});
