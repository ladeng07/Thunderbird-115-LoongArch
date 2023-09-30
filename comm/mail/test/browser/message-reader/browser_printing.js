/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests that printing works.
 */

"use strict";

var { close_compose_window, open_compose_with_reply } = ChromeUtils.import(
  "resource://testing-common/mozmill/ComposeHelpers.jsm"
);
var {
  add_message_to_folder,
  assert_selected_and_displayed,
  be_in_folder,
  create_folder,
  create_message,
  mc,
  select_click_row,
  open_message_from_file,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

var { close_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

var folder = null;

const SUBJECT0 = "How is the printing?";
const BODY0 = "Printing ok?";

add_setup(async function () {
  folder = await create_folder("PrintingTest");
  await add_message_to_folder(
    [folder],
    create_message({
      subject: SUBJECT0,
      body: { body: BODY0 },
    })
  );
  registerCleanupFunction(() => folder.deleteSelf(null));
});

/**
 * Test that we can open the print preview and have it show some result.
 */
add_task(async function test_open_printpreview() {
  await be_in_folder(folder);
  let msg = select_click_row(0);
  assert_selected_and_displayed(mc, msg);

  // Trigger print using Ctrl+P.
  EventUtils.synthesizeKey("P", { accelKey: true }, mc.window);

  let preview;
  // Ensure we're showing the preview...
  await BrowserTestUtils.waitForCondition(() => {
    preview = document.querySelector(".printPreviewBrowser");
    return preview && BrowserTestUtils.is_visible(preview);
  });

  let subject = preview.contentDocument.querySelector(
    ".moz-main-header tr > td"
  ).textContent;
  Assert.equal(
    subject,
    "Subject: " + SUBJECT0,
    "preview subject should be correct"
  );

  let body = preview.contentDocument
    .querySelector(".moz-text-flowed")
    .textContent.trim();
  Assert.equal(body, BODY0, "preview body should be correct");

  EventUtils.synthesizeKey("VK_ESCAPE", {}, mc.window);

  // Wait for the preview to go away.
  await TestUtils.waitForCondition(
    () => !mc.window.document.querySelector(".printPreviewBrowser")
  );
});

/**
 * Test that the print preview generates correctly when the email use a CSS
 * named page.
 */
add_task(async function test_named_page() {
  const file = new FileUtils.File(
    getTestFilePath(`data/bug1843628_named_page.eml`)
  );
  const msgc = await open_message_from_file(file);

  EventUtils.synthesizeKey("P", { accelKey: true }, msgc.window);

  let preview;
  // Ensure we're showing the preview...
  await BrowserTestUtils.waitForCondition(() => {
    preview = msgc.window.document.querySelector(".printPreviewBrowser");
    return preview && BrowserTestUtils.is_visible(preview);
  });

  Assert.equal(
    preview.getAttribute("sheet-count"),
    "1",
    "preview should only include one page (and ignore the CSS named page)"
  );

  close_window(msgc);
});
