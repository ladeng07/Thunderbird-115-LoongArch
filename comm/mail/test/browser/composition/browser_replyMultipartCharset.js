/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This has become a "mixed bag" of tests for various bugs.
 *
 * Bug 1026989:
 * Tests that the reply to a message picks up the charset from the body
 * and not from an attachment. Also test "Edit as new", forward inline and
 * forward as attachment.
 *
 * Bug 961983:
 * Tests that UTF-16 is not used in a composition.
 *
 * Bug 1323377:
 * Tests that the correct charset is used, even if the message
 * wasn't viewed before answering/forwarding.
 */

"use strict";

var {
  close_compose_window,
  open_compose_with_edit_as_new,
  open_compose_with_forward,
  open_compose_with_forward_as_attachments,
  open_compose_with_reply,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
var {
  assert_selected_and_displayed,
  be_in_folder,
  create_folder,
  get_about_message,
  mc,
  open_message_from_file,
  press_delete,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { click_menus_in_sequence, close_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

var folder;

add_setup(async function () {
  requestLongerTimeout(2);
  folder = await create_folder("FolderWithMessages");
});

async function subtest_replyEditAsNewForward_charset(
  aAction,
  aFile,
  aViewed = true
) {
  await be_in_folder(folder);

  let file = new FileUtils.File(getTestFilePath(`data/${aFile}`));
  let msgc = await open_message_from_file(file);

  // Copy the message to a folder. We run the message through a folder
  // since replying/editing as new/forwarding directly to the message
  // opened from a file gives different results on different platforms.
  // All platforms behave the same when using a folder-stored message.
  let documentChild = msgc.window.content.document.documentElement;
  EventUtils.synthesizeMouseAtCenter(
    documentChild,
    { type: "contextmenu", button: 2 },
    documentChild.ownerGlobal
  );
  let aboutMessage = get_about_message(msgc.window);
  await click_menus_in_sequence(
    aboutMessage.document.getElementById("mailContext"),
    [
      { id: "mailContext-copyMenu" },
      { label: "Local Folders" },
      { label: "FolderWithMessages" },
    ]
  );
  close_window(msgc);

  let msg = select_click_row(0);
  if (aViewed) {
    // Only if the preview pane is on, we can check the following.
    assert_selected_and_displayed(mc, msg);
  }

  let fwdWin;
  switch (aAction) {
    case 1: // Reply.
      fwdWin = open_compose_with_reply();
      break;
    case 2: // Edit as new.
      fwdWin = open_compose_with_edit_as_new();
      break;
    case 3: // Forward inline.
      fwdWin = open_compose_with_forward();
      break;
    case 4: // Forward as attachment.
      fwdWin = open_compose_with_forward_as_attachments();
      break;
  }

  // Check the charset in the compose window.
  let charset =
    fwdWin.window.document.getElementById("messageEditor").contentDocument
      .charset;
  Assert.equal(charset, "UTF-8", "Compose window has the wrong charset");
  close_compose_window(fwdWin);

  press_delete(mc);
}

add_task(async function test_replyEditAsNewForward_charsetFromBody() {
  // Check that the charset is taken from the message body (bug 1026989).
  await subtest_replyEditAsNewForward_charset(1, "./multipart-charset.eml");
  await subtest_replyEditAsNewForward_charset(2, "./multipart-charset.eml");
  await subtest_replyEditAsNewForward_charset(3, "./multipart-charset.eml");
  // For "forward as attachment" we use the default charset (which is UTF-8).
  await subtest_replyEditAsNewForward_charset(4, "./multipart-charset.eml");
});

add_task(async function test_reply_noUTF16() {
  // Check that a UTF-16 encoded e-mail is forced to UTF-8 when replying (bug 961983).
  await subtest_replyEditAsNewForward_charset(1, "./body-utf16.eml", "UTF-8");
});

add_task(async function test_replyEditAsNewForward_noPreview() {
  // Check that it works even if the message wasn't viewed before, so
  // switch off the preview pane (bug 1323377).
  await be_in_folder(folder);
  mc.window.goDoCommand("cmd_toggleMessagePane");

  await subtest_replyEditAsNewForward_charset(1, "./format-flowed.eml", false);
  await subtest_replyEditAsNewForward_charset(2, "./body-greek.eml", false);
  await subtest_replyEditAsNewForward_charset(
    3,
    "./multipart-charset.eml",
    false
  );

  mc.window.goDoCommand("cmd_toggleMessagePane");
});

registerCleanupFunction(() => {
  folder.deleteSelf(null);
});
