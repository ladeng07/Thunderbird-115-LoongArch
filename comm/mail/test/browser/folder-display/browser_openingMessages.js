/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Test that we open single and multiple messages from the thread pane
 * according to the mail.openMessageBehavior preference, and that we have the
 * correct message headers displayed in whatever we open.
 *
 * Currently tested:
 * - opening single and multiple messages in tabs
 * - opening a single message in a window. (Multiple messages require a fair
 *   amount of additional work and are hard to test. We're also assuming here
 *   that multiple messages opened in windows are just the same function called
 *   repeatedly.)
 * - reusing an existing window to show another message
 */

"use strict";

var {
  assert_message_pane_focused,
  assert_number_of_tabs_open,
  assert_selected_and_displayed,
  assert_tab_mode_name,
  assert_tab_titled_from,
  be_in_folder,
  close_message_window,
  close_tab,
  create_folder,
  make_message_sets_in_folders,
  mc,
  open_selected_message,
  open_selected_messages,
  plan_for_message_display,
  reset_open_message_behavior,
  select_click_row,
  select_shift_click_row,
  set_open_message_behavior,
  switch_tab,
  wait_for_message_display_completion,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { async_plan_for_new_window, wait_for_new_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

// One folder's enough
var folder = null;

// Number of messages to open for multi-message tests
var NUM_MESSAGES_TO_OPEN = 5;

add_setup(async function () {
  folder = await create_folder("OpeningMessagesA");
  await make_message_sets_in_folders([folder], [{ count: 10 }]);
});

/**
 * Test opening a single message in a new tab.
 */
add_task(async function test_open_single_message_in_tab() {
  set_open_message_behavior("NEW_TAB");
  let folderTab = mc.window.document.getElementById("tabmail").currentTabInfo;
  let preCount =
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length;
  await be_in_folder(folder);
  // Select one message
  let msgHdr = select_click_row(1);
  // Open it
  open_selected_message();
  // Check that the tab count has increased by 1
  assert_number_of_tabs_open(preCount + 1);
  // Check that the currently displayed tab is a message tab (i.e. our newly
  // opened tab is in the foreground)
  assert_tab_mode_name(null, "mailMessageTab");

  let tab = mc.window.document.getElementById("tabmail").currentTabInfo;
  if (
    tab.chromeBrowser.docShell.isLoadingDocument ||
    tab.chromeBrowser.currentURI.spec != "about:message"
  ) {
    await BrowserTestUtils.browserLoaded(tab.chromeBrowser);
  }

  // Check that the message header displayed is the right one
  assert_selected_and_displayed(msgHdr);
  // Check that the message pane is focused
  assert_message_pane_focused();
  // Clean up, close the tab
  close_tab(mc.window.document.getElementById("tabmail").currentTabInfo);
  await switch_tab(folderTab);
  reset_open_message_behavior();
});

/**
 * Test opening multiple messages in new tabs.
 */
add_task(async function test_open_multiple_messages_in_tabs() {
  set_open_message_behavior("NEW_TAB");
  let folderTab = mc.window.document.getElementById("tabmail").currentTabInfo;
  let preCount =
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length;
  await be_in_folder(folder);

  // Select a bunch of messages
  select_click_row(1);
  let selectedMessages = select_shift_click_row(NUM_MESSAGES_TO_OPEN);
  // Open them
  open_selected_messages();
  // Check that the tab count has increased by the correct number
  assert_number_of_tabs_open(preCount + NUM_MESSAGES_TO_OPEN);
  // Check that the currently displayed tab is a message tab (i.e. one of our
  // newly opened tabs is in the foreground)
  assert_tab_mode_name(null, "mailMessageTab");

  // Now check whether each of the NUM_MESSAGES_TO_OPEN tabs has the correct
  // title
  for (let i = 0; i < NUM_MESSAGES_TO_OPEN; i++) {
    assert_tab_titled_from(
      mc.window.document.getElementById("tabmail").tabInfo[preCount + i],
      selectedMessages[i]
    );
  }

  // Check whether each tab has the correct message and whether the message pane
  // is focused in each case, then close it to load the previous tab.
  for (let i = 0; i < NUM_MESSAGES_TO_OPEN; i++) {
    assert_selected_and_displayed(selectedMessages.pop());
    assert_message_pane_focused();
    close_tab(mc.window.document.getElementById("tabmail").currentTabInfo);
  }
  await switch_tab(folderTab);
  reset_open_message_behavior();
});

/**
 * Test opening a message in a new window.
 */
add_task(async function test_open_message_in_new_window() {
  set_open_message_behavior("NEW_WINDOW");
  await be_in_folder(folder);

  // Select a message
  let msgHdr = select_click_row(1);

  let newWindowPromise = async_plan_for_new_window("mail:messageWindow");
  // Open it
  open_selected_message();
  let msgc = await newWindowPromise;
  wait_for_message_display_completion(msgc, true);

  assert_selected_and_displayed(msgc, msgHdr);

  // Clean up, close the window
  close_message_window(msgc);
  reset_open_message_behavior();
});

/**
 * Test reusing an existing window to open a new message.
 */
add_task(async function test_open_message_in_existing_window() {
  set_open_message_behavior("EXISTING_WINDOW");
  await be_in_folder(folder);

  // Open up a window
  select_click_row(1);
  let newWindowPromise = async_plan_for_new_window("mail:messageWindow");
  open_selected_message();
  let msgc = await newWindowPromise;
  wait_for_message_display_completion(msgc, true);

  // Select another message and open it
  let msgHdr = select_click_row(2);
  plan_for_message_display(msgc);
  open_selected_message();
  wait_for_message_display_completion(msgc, true);

  // Check if our old window displays the message
  assert_selected_and_displayed(msgc, msgHdr);
  // Clean up, close the window
  close_message_window(msgc);
  reset_open_message_behavior();
});
