/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests draft related functionality:
 * - that we don't allow opening multiple copies of a draft.
 */

"use strict";

var {
  close_compose_window,
  get_compose_body,
  get_msg_source,
  open_compose_new_mail,
  save_compose_message,
  setup_msg_contents,
  wait_for_compose_window,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
var {
  be_in_folder,
  get_special_folder,
  get_about_message,
  make_message_sets_in_folders,
  mc,
  press_delete,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { wait_for_notification_to_show, get_notification } = ChromeUtils.import(
  "resource://testing-common/mozmill/NotificationBoxHelpers.jsm"
);

var {
  click_menus_in_sequence,
  close_popup_sequence,
  plan_for_new_window,
  wait_for_window_focused,
} = ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

let aboutMessage = get_about_message();

var kBoxId = "mail-notification-top";
var draftsFolder;

add_setup(async function () {
  requestLongerTimeout(2);
  draftsFolder = await get_special_folder(Ci.nsMsgFolderFlags.Drafts, true);
});

/**
 * Bug 349547.
 * Tests that we only open one compose window for one instance of a draft.
 */
add_task(async function test_open_draft_again() {
  await make_message_sets_in_folders([draftsFolder], [{ count: 1 }]);
  await be_in_folder(draftsFolder);
  select_click_row(0);

  // Wait for the notification with the Edit button.
  wait_for_notification_to_show(aboutMessage, kBoxId, "draftMsgContent");
  let box = get_notification(aboutMessage, kBoxId, "draftMsgContent");

  plan_for_new_window("msgcompose");
  // Click on the "Edit" button in the draft notification.
  EventUtils.synthesizeMouseAtCenter(
    box.buttonContainer.firstElementChild,
    {},
    aboutMessage
  );
  let cwc = wait_for_compose_window();

  let cwins = [...Services.wm.getEnumerator("msgcompose")].length;

  // click edit in main win again
  EventUtils.synthesizeMouseAtCenter(
    box.buttonContainer.firstElementChild,
    {},
    aboutMessage
  );

  // Wait a sec to see if it caused a new window.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  Assert.ok(
    Services.ww.activeWindow == cwc.window,
    "the original draft composition window should have got focus (again)"
  );

  let cwins2 = [...Services.wm.getEnumerator("msgcompose")].length;

  Assert.ok(cwins2 > 0, "No compose window open!");
  Assert.equal(cwins, cwins2, "The number of compose windows changed!");

  // Type something and save, then check that we only have one draft.
  cwc.window.document.getElementById("messageEditor").focus();
  EventUtils.sendString("Hello!", cwc.window);
  await save_compose_message(cwc.window);
  close_compose_window(cwc);
  Assert.equal(draftsFolder.getTotalMessages(false), 1);

  select_click_row(0);
  press_delete(mc); // clean up after ourselves
});

/**
 * Bug 1202165
 * Test that the user set delivery format is preserved in a draft message.
 */
async function internal_check_delivery_format(editDraft) {
  let cwc = open_compose_new_mail();

  setup_msg_contents(
    cwc,
    "test@example.invalid",
    "Testing storing of the composition properties in the draft!",
    "Hello!"
  );

  // Select our wanted format.
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("optionsMenu"),
    {},
    cwc.window.document.getElementById("optionsMenu").ownerGlobal
  );
  await click_menus_in_sequence(
    cwc.window.document.getElementById("optionsMenuPopup"),
    [{ id: "outputFormatMenu" }, { id: "format_both" }]
  );

  /**
   * Check if the right format is selected in the menu.
   *
   * @param aMenuItemId  The id of the menuitem expected to be selected.
   * @param aValue       A value of nsIMsgCompSendFormat constants of the expected selected format.
   */
  async function assert_format_value(aMenuItemId, aValue) {
    EventUtils.synthesizeMouseAtCenter(
      cwc.window.document.getElementById("optionsMenu"),
      {},
      cwc.window.document.getElementById("optionsMenu").ownerGlobal
    );
    let formatMenu = await click_menus_in_sequence(
      cwc.window.document.getElementById("optionsMenuPopup"),
      [{ id: "outputFormatMenu" }],
      true
    );
    let formatItem = cwc.window.document
      .getElementById("outputFormatMenuPopup")
      .querySelector("[name=output_format][checked=true]");
    Assert.equal(formatItem.id, aMenuItemId);
    close_popup_sequence(formatMenu);
  }

  await save_compose_message(cwc.window);
  close_compose_window(cwc);

  // Open a new composition see if the menu is again at default value, not the one
  // chosen above.
  cwc = open_compose_new_mail();

  await assert_format_value("format_auto", Ci.nsIMsgCompSendFormat.Auto);

  close_compose_window(cwc);

  await be_in_folder(draftsFolder);
  select_click_row(0);

  // Wait for the notification with the Edit button.
  wait_for_notification_to_show(aboutMessage, kBoxId, "draftMsgContent");
  let box = get_notification(aboutMessage, kBoxId, "draftMsgContent");

  plan_for_new_window("msgcompose");
  if (editDraft) {
    // Trigger "edit draft".
    EventUtils.synthesizeMouseAtCenter(
      box.buttonContainer.firstElementChild,
      {},
      aboutMessage
    );
  } else {
    // Trigger "edit as new" resulting in template processing.
    EventUtils.synthesizeKey(
      "e",
      { shiftKey: false, accelKey: true },
      mc.window
    );
  }
  cwc = wait_for_compose_window();

  // Check if format value was restored.
  await assert_format_value("format_both", Ci.nsIMsgCompSendFormat.Both);

  close_compose_window(cwc);

  press_delete(mc); // clean up the created draft
}

add_task(async function test_save_delivery_format_with_edit_draft() {
  await internal_check_delivery_format(true);
}).__skipMe = AppConstants.platform == "macosx"; // Can't click menu bar on Mac.

add_task(async function test_save_delivery_format_with_edit_template() {
  await internal_check_delivery_format(false);
}).__skipMe = AppConstants.platform == "macosx"; // Can't click menu bar on Mac.

/**
 * Tests that 'Edit as New' leaves the original message in drafts folder.
 */
add_task(async function test_edit_as_new_in_draft() {
  await make_message_sets_in_folders([draftsFolder], [{ count: 1 }]);
  await be_in_folder(draftsFolder);

  Assert.equal(draftsFolder.getTotalMessages(false), 1);

  select_click_row(0);

  // Wait for the notification with the Edit button.
  wait_for_notification_to_show(aboutMessage, kBoxId, "draftMsgContent");

  plan_for_new_window("msgcompose");
  EventUtils.synthesizeKey("e", { shiftKey: false, accelKey: true });
  let cwc = wait_for_compose_window();

  cwc.window.document.getElementById("messageEditor").focus();
  EventUtils.sendString("Hello!", cwc.window);
  await save_compose_message(cwc.window);
  close_compose_window(cwc);

  await TestUtils.waitForCondition(
    () => draftsFolder.getTotalMessages(false) == 2,
    "message saved to drafts folder"
  );

  // Clean up the created drafts and count again.
  press_delete(mc);
  select_click_row(0);
  press_delete(mc);
  Assert.equal(draftsFolder.getTotalMessages(false), 0);
});

/**
 * Tests Content-Language header.
 */
add_task(async function test_content_language_header() {
  let cwc = open_compose_new_mail();

  setup_msg_contents(
    cwc,
    "test@example.invalid",
    "Testing Content-Language header",
    "Hello, we speak en-US"
  );

  await save_compose_message(cwc.window);
  close_compose_window(cwc);

  await TestUtils.waitForCondition(
    () => draftsFolder.getTotalMessages(false) == 1,
    "message saved to drafts folder"
  );

  await be_in_folder(draftsFolder);
  let draftMsg = select_click_row(0);
  let draftMsgContent = await get_msg_source(draftMsg);

  // Check for a single line that contains our header.
  if (
    !draftMsgContent
      .split("\n")
      .some(line => line.trim() == "Content-Language: en-US")
  ) {
    Assert.ok(false, "Failed to find Content-Language: en-US");
  }

  // Clean up the created draft.
  press_delete(mc);
});

/**
 * Tests Content-Language header suppression.
 */
add_task(async function test_content_language_header_suppression() {
  let statusQuo = Services.prefs.getBoolPref("mail.suppress_content_language");
  Services.prefs.setBoolPref("mail.suppress_content_language", true);

  let cwc = open_compose_new_mail();

  setup_msg_contents(
    cwc,
    "test@example.invalid",
    "Testing Content-Language header suppression",
    "Hello, we speak blank"
  );

  await save_compose_message(cwc.window);
  close_compose_window(cwc);

  await TestUtils.waitForCondition(
    () => draftsFolder.getTotalMessages(false) == 1,
    "message saved to drafts folder"
  );

  await be_in_folder(draftsFolder);
  let draftMsg = select_click_row(0);
  let draftMsgContent = await get_msg_source(draftMsg);

  // Check no line contains our Content-Language.
  Assert.ok(
    !draftMsgContent.split("\n").some(line => /^Content-Language:/.test(line)),
    "Didn't find Content-Language header in draft content"
  );

  // Clean up the created draft.
  press_delete(mc);

  Services.prefs.setBoolPref("mail.suppress_content_language", statusQuo);
});

/**
 * Tests space stuffing of plaintext message.
 */
add_task(async function test_remove_space_stuffing_format_flowed() {
  // Prepare for plaintext email.
  let oldHtmlPref = Services.prefs.getBoolPref(
    "mail.identity.default.compose_html"
  );
  Services.prefs.setBoolPref("mail.identity.default.compose_html", false);

  let cwc = open_compose_new_mail();

  setup_msg_contents(
    cwc,
    "test@example.invalid",
    "Testing space stuffing in plain text email",
    "NoSpace\n OneSpace\n  TwoSpaces"
  );

  await save_compose_message(cwc.window);
  close_compose_window(cwc);

  await TestUtils.waitForCondition(
    () => draftsFolder.getTotalMessages(false) == 1,
    "message saved to drafts folder"
  );

  await be_in_folder(draftsFolder);

  select_click_row(0);

  // Wait for the notification with the Edit button.
  wait_for_notification_to_show(aboutMessage, kBoxId, "draftMsgContent");
  let box = get_notification(aboutMessage, kBoxId, "draftMsgContent");

  plan_for_new_window("msgcompose");
  // Click on the "Edit" button in the draft notification.
  EventUtils.synthesizeMouseAtCenter(
    box.buttonContainer.firstElementChild,
    {},
    aboutMessage
  );
  cwc = wait_for_compose_window();

  let bodyText = get_compose_body(cwc).innerHTML;
  if (!bodyText.includes("NoSpace<br> OneSpace<br>  TwoSpaces")) {
    Assert.ok(false, "Something went wrong with space stuffing");
  }
  close_compose_window(cwc);

  // Clean up the created draft.
  press_delete(mc);

  Services.prefs.setBoolPref("mail.identity.default.compose_html", oldHtmlPref);
});
