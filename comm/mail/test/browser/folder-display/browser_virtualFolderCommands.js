/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Test that commands on virtual folders work properly.
 */

"use strict";

var {
  be_in_folder,
  create_folder,
  create_virtual_folder,
  expand_all_threads,
  get_about_3pane,
  make_display_threaded,
  make_message_sets_in_folders,
  mc,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

var msgsPerThread = 5;
var singleVirtFolder;
var multiVirtFolder;

add_setup(async function () {
  let folderOne = await create_folder();
  let folderTwo = await create_folder();
  await make_message_sets_in_folders([folderOne], [{ msgsPerThread }]);
  await make_message_sets_in_folders([folderTwo], [{ msgsPerThread }]);

  singleVirtFolder = create_virtual_folder([folderOne], {});
  multiVirtFolder = create_virtual_folder([folderOne, folderTwo], {});
});

add_task(async function test_single_folder_select_thread() {
  await be_in_folder(singleVirtFolder);
  let win = get_about_3pane();
  make_display_threaded();
  expand_all_threads();

  // Try selecting the thread from the root message.
  select_click_row(0);
  EventUtils.synthesizeKey("a", { accelKey: true, shiftKey: true });
  Assert.ok(
    win.gDBView.selection.count == msgsPerThread,
    "Didn't select all messages in the thread!"
  );

  // Now try selecting the thread from a non-root message.
  select_click_row(1);
  EventUtils.synthesizeKey("a", { accelKey: true, shiftKey: true });
  Assert.ok(
    win.gDBView.selection.count == msgsPerThread,
    "Didn't select all messages in the thread!"
  );
});

add_task(async function test_cross_folder_select_thread() {
  await be_in_folder(multiVirtFolder);
  let win = get_about_3pane();
  make_display_threaded();
  expand_all_threads();

  // Try selecting the thread from the root message.
  select_click_row(0);
  EventUtils.synthesizeKey("a", { accelKey: true, shiftKey: true });
  Assert.ok(
    win.gDBView.selection.count == msgsPerThread,
    "Didn't select all messages in the thread!"
  );

  // Now try selecting the thread from a non-root message.
  select_click_row(1);
  EventUtils.synthesizeKey("a", { accelKey: true, shiftKey: true });
  Assert.ok(
    win.gDBView.selection.count == msgsPerThread,
    "Didn't select all messages in the thread!"
  );
});
