/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var {
  assert_messages_in_view,
  be_in_folder,
  create_folder,
  make_message_sets_in_folders,
  mc,
  wait_for_all_messages_to_load,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { plan_for_modal_dialog, wait_for_modal_dialog } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

var { MailViewConstants } = ChromeUtils.import(
  "resource:///modules/MailViewManager.jsm"
);

var baseFolder, savedFolder;
var setUntagged, setTagged;

add_setup(async function () {
  // Create a folder with some messages that have no tags and some that are
  //  tagged Important ($label1).
  baseFolder = await create_folder("MailViewA");
  [setUntagged, setTagged] = await make_message_sets_in_folders(
    [baseFolder],
    [{}, {}]
  );
  setTagged.addTag("$label1"); // Important, by default
});

add_task(function test_put_view_picker_on_toolbar() {
  let toolbar = mc.window.document.getElementById("mail-bar3");
  toolbar.insertItem("mailviews-container", null);
  Assert.ok(mc.window.document.getElementById("mailviews-container"));
});

/**
 * https://bugzilla.mozilla.org/show_bug.cgi?id=474701#c97
 */
add_task(async function test_save_view_as_folder() {
  // - enter the folder
  await be_in_folder(baseFolder);

  // - apply the mail view
  // okay, mozmill is just not ready to click on the view picker...
  // just call the ViewChange global.  it's sad, but it has the same effects.
  // at least, it does once we've caused the popups to get refreshed.
  mc.window.RefreshAllViewPopups(
    mc.window.document.getElementById("viewPickerPopup")
  );
  mc.window.ViewChange(":$label1");
  wait_for_all_messages_to_load();

  // - save it
  plan_for_modal_dialog(
    "mailnews:virtualFolderProperties",
    subtest_save_mail_view
  );
  // we have to use value here because the option mechanism is not sophisticated
  //  enough.
  mc.window.ViewChange(MailViewConstants.kViewItemVirtual);
  wait_for_modal_dialog("mailnews:virtualFolderProperties");
});

function subtest_save_mail_view(savc) {
  // - make sure the name is right
  Assert.equal(
    savc.window.document.getElementById("name").value,
    baseFolder.prettyName + "-Important"
  );

  let selector = savc.window.document.querySelector("#searchVal0 menulist");
  Assert.ok(selector, "Should have a tag selector");

  // Check the value of the search-value.
  Assert.equal(selector.value, "$label1");

  // - save it
  savc.window.onOK();
}

add_task(async function test_verify_saved_mail_view() {
  // - make sure the folder got created
  savedFolder = baseFolder.getChildNamed(baseFolder.prettyName + "-Important");
  if (!savedFolder) {
    throw new Error("MailViewA-Important was not created!");
  }

  // - go in the folder and make sure the right messages are displayed
  await be_in_folder(savedFolder);
  assert_messages_in_view(setTagged, mc);

  Assert.report(
    false,
    undefined,
    undefined,
    "Test ran to completion successfully"
  );
});
