/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test reload of saved searches over local folders after compaction
 * of local folders.
 */

"use strict";

var utils = ChromeUtils.import("resource://testing-common/mozmill/utils.jsm");
var { gThreadManager } = ChromeUtils.import(
  "resource://testing-common/mailnews/Maild.jsm"
);

var {
  be_in_folder,
  create_folder,
  create_virtual_folder,
  get_about_3pane,
  inboxFolder,
  make_message_sets_in_folders,
  mc,
  press_delete,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

var otherFolder;
var folderVirtual;
var synSets;

/**
 * Add some messages to a folder, delete the first one, and create a saved
 * search over the inbox and the folder. Then, compact folders.
 */
add_task(async function test_setup_virtual_folder_and_compact() {
  otherFolder = await create_folder();
  synSets = await make_message_sets_in_folders([otherFolder], [{ count: 2 }]);

  /**
   * We delete the first message in the local folder, so compaction of the
   * folder will invalidate the key of the second message in the folder. Then,
   * we select the second message and issue the compact. This causes saving the
   * selection on the compaction notification to fail. We test the saved search
   * view still gets rebuilt, such that there is a valid msg hdr at row 0.
   */
  await be_in_folder(otherFolder);
  select_click_row(0);
  press_delete();

  folderVirtual = create_virtual_folder(
    [inboxFolder, otherFolder],
    {},
    true,
    "SavedSearch"
  );

  await be_in_folder(folderVirtual);
  select_click_row(0);
  let urlListener = {
    compactDone: false,

    OnStartRunningUrl(aUrl) {},
    OnStopRunningUrl(aUrl, aExitCode) {
      this.compactDone = true;
    },
  };
  if (otherFolder.msgStore.supportsCompaction) {
    otherFolder.compactAll(urlListener, null);

    utils.waitFor(
      () => urlListener.compactDone,
      "Timeout waiting for compact to complete",
      10000,
      100
    );
  }
  // Let the event queue clear.
  await new Promise(resolve => setTimeout(resolve));
  // Check view is still valid
  get_about_3pane().gDBView.getMsgHdrAt(0);

  Assert.report(
    false,
    undefined,
    undefined,
    "Test ran to completion successfully"
  );
});

add_task(async function endTest() {
  // Fixing possible nsIMsgDBHdr.markHasAttachments onEndMsgDownload runs.
  //  Found in chaosmode.
  var thread = gThreadManager.currentThread;
  while (thread.hasPendingEvents()) {
    thread.processNextEvent(true);
  }
  // Cleanup dbView with force.
  get_about_3pane().gDBView.close(true);
  folderVirtual.deleteSelf(null);
  otherFolder.deleteSelf(null);
});
