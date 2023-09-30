/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests problems emptying a Trash folder that is searched by a virtual folder.
 */

const { VirtualFolderHelper } = ChromeUtils.import(
  "resource:///modules/VirtualFolderWrapper.jsm"
);

add_task(function () {
  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  let rootFolder = account.incomingServer.rootFolder;

  // Create a real folders inside the trash folder.
  let trashFolder = rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
  trashFolder.createSubfolder("deleted", null);
  let deletedFolder = trashFolder.getChildNamed("deleted");

  // Create a virtual folder that searches the trash folder.
  let wrappedVirtualFolder = VirtualFolderHelper.createNewVirtualFolder(
    "virtual",
    rootFolder,
    [trashFolder, deletedFolder],
    "ANY",
    false
  );
  let virtualFolder = wrappedVirtualFolder.virtualFolder;
  Assert.equal(virtualFolder, rootFolder.getChildNamed("virtual"));
  Assert.equal(
    wrappedVirtualFolder.searchFolderURIs,
    `${trashFolder.URI}|${deletedFolder.URI}`
  );
  Assert.deepEqual(wrappedVirtualFolder.searchFolders, [
    trashFolder,
    deletedFolder,
  ]);

  // Create a smart virtual folder that searches the trash folder. This is the
  // same as before except we'll set the searchFolderFlag property, as we do
  // for the Unified Folders section of the UI.
  let wrappedSmartFolder = VirtualFolderHelper.createNewVirtualFolder(
    "smart",
    rootFolder,
    [trashFolder, deletedFolder],
    "ANY",
    false
  );
  let smartFolder = wrappedSmartFolder.virtualFolder;
  smartFolder.msgDatabase.dBFolderInfo.setUint32Property(
    "searchFolderFlag",
    Ci.nsMsgFolderFlags.Trash
  );
  Assert.equal(smartFolder, rootFolder.getChildNamed("smart"));
  Assert.equal(
    wrappedSmartFolder.searchFolderURIs,
    `${trashFolder.URI}|${deletedFolder.URI}`
  );
  Assert.deepEqual(wrappedSmartFolder.searchFolders, [
    trashFolder,
    deletedFolder,
  ]);

  // Empty the trash. The normal virtual folder should disappear, but the
  // smart folder shouldn't.
  trashFolder.emptyTrash(null);
  Assert.equal(
    virtualFolder.parent,
    null,
    "virtual folder should be removed with last search folder"
  );
  Assert.equal(
    smartFolder.parent,
    rootFolder,
    "smart virtual folder should NOT be removed with last search folder"
  );
  Assert.equal(
    wrappedSmartFolder.searchFolderURIs,
    trashFolder.URI,
    "smart virtual folder should still search the trash folder (only)"
  );
  Assert.deepEqual(
    wrappedSmartFolder.searchFolders,
    [trashFolder],
    "smart virtual folder should still search the trash folder (only)"
  );
});
