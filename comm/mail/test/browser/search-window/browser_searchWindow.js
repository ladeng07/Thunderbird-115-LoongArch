/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Tests:
 * - https://bugzilla.mozilla.org/show_bug.cgi?id=474701#c96 first para
 */

"use strict";

var {
  assert_messages_in_view,
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
  set_open_message_behavior,
  switch_tab,
  wait_for_all_messages_to_load,
  wait_for_message_display_completion,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var {
  assert_search_window_folder_displayed,
  open_search_window,
  assert_messages_in_search_view,
  select_click_search_row,
  select_shift_click_search_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/SearchWindowHelpers.jsm"
);
var {
  plan_for_modal_dialog,
  async_plan_for_new_window,
  plan_for_window_close,
  wait_for_modal_dialog,
  wait_for_window_close,
} = ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

var folder, setFooBar;

// Number of messages to open for multi-message tests
var NUM_MESSAGES_TO_OPEN = 5;

/**
 * Create some messages that our constraint below will satisfy
 */
add_task(async function test_create_messages() {
  folder = await create_folder("SearchWindowA");
  [, , setFooBar] = await make_message_sets_in_folders(
    [folder],
    [{ subject: "foo" }, { subject: "bar" }, { subject: "foo bar" }]
  );
});

/**
 * The search window controller.
 */
var swc = null;

/**
 * Bring up the search window.
 */
add_task(async function test_show_search_window() {
  // put us in the folder we care about so it defaults to that
  await be_in_folder(folder);

  swc = open_search_window();
  assert_search_window_folder_displayed(swc, folder);
});

/**
 * Set up the search.
 */
add_task(function test_enter_some_stuff() {
  // - turn off search subfolders
  // (we're not testing the UI, direct access is fine)
  swc.window.document
    .getElementById("checkSearchSubFolders")
    .removeAttribute("checked");

  // - put "foo" in the subject contains box
  // Each filter criterion is a listitem in the listbox with id=searchTermList.
  // Each filter criterion has id "searchRowN", and the textbox has id
  //  "searchValN" exposing the value on attribute "value".
  // XXX I am having real difficulty getting the click/type pair to actually
  //  get the text in there reliably.  I am just going to poke things directly
  //  into the text widget. (We used to use .aid instead of .a with swc.click
  //  and swc.type.)
  let searchVal0 = swc.window.document.getElementById("searchVal0");
  let index = 0;

  if (searchVal0.hasAttribute("selectedIndex")) {
    index = parseInt(searchVal0.getAttribute("selectedIndex"));
  }

  searchVal0 = searchVal0.children[index];
  searchVal0.value = "foo";

  // - add another subject box
  let plusButton = swc.window.document.querySelector(
    "#searchRow0 button[label='+']"
  );
  EventUtils.synthesizeMouseAtCenter(plusButton, {}, plusButton.ownerGlobal);

  // - put "bar" in it
  let searchVal1 = swc.window.document.getElementById("searchVal1");
  index = 0;

  if (searchVal1.hasAttribute("selectedIndex")) {
    index = parseInt(searchVal1.getAttribute("selectedIndex"));
  }

  searchVal1 = searchVal1.children[index];
  searchVal1.value = "bar";
});

/**
 * Trigger the search, make sure the right results show up.
 */
add_task(function test_go_search() {
  // - Trigger the search
  // The "Search" button has id "search-button"
  EventUtils.synthesizeMouseAtCenter(
    swc.window.document.getElementById("search-button"),
    {},
    swc.window.document.getElementById("search-button").ownerGlobal
  );
  wait_for_all_messages_to_load(swc);

  // - Verify we got the right messages
  assert_messages_in_search_view(setFooBar, swc);

  // - Click the "Save as Search Folder" button, id "saveAsVFButton"
  // This will create a virtual folder properties dialog...
  // (label: "New Saved Search Folder", source: virtualFolderProperties.xhtml
  //  no windowtype, id: "virtualFolderPropertiesDialog")
  plan_for_modal_dialog(
    "mailnews:virtualFolderProperties",
    subtest_save_search
  );
  EventUtils.synthesizeMouseAtCenter(
    swc.window.document.getElementById("saveAsVFButton"),
    {},
    swc.window.document.getElementById("saveAsVFButton").ownerGlobal
  );
  wait_for_modal_dialog("mailnews:virtualFolderProperties");
});

/**
 * Test opening a single search result in a new tab.
 */
add_task(async function test_open_single_search_result_in_tab() {
  swc.window.focus();
  set_open_message_behavior("NEW_TAB");
  let folderTab = mc.window.document.getElementById("tabmail").currentTabInfo;
  let preCount =
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length;

  // Select one message
  swc.window.document.getElementById("threadTree").focus();
  let msgHdr = select_click_search_row(1, swc);
  // Open the selected message
  open_selected_message(swc);
  // This is going to trigger a message display in the main 3pane window
  wait_for_message_display_completion(mc);
  // Check that the tab count has increased by 1
  assert_number_of_tabs_open(preCount + 1);
  // Check that the currently displayed tab is a message tab (i.e. our newly
  // opened tab is in the foreground)
  assert_tab_mode_name(null, "mailMessageTab");
  // Check that the message header displayed is the right one
  assert_selected_and_displayed(msgHdr);
  // Clean up, close the tab
  close_tab(mc.window.document.getElementById("tabmail").currentTabInfo);
  await switch_tab(folderTab);
  reset_open_message_behavior();
});

/**
 * Test opening multiple search results in new tabs.
 */
add_task(async function test_open_multiple_search_results_in_new_tabs() {
  swc.window.focus();
  set_open_message_behavior("NEW_TAB");
  let folderTab = mc.window.document.getElementById("tabmail").currentTabInfo;
  let preCount =
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length;

  // Select a bunch of messages
  swc.window.document.getElementById("threadTree").focus();
  select_click_search_row(1, swc);
  let selectedMessages = select_shift_click_search_row(
    NUM_MESSAGES_TO_OPEN,
    swc
  );
  // Open them
  open_selected_messages(swc);
  // This is going to trigger a message display in the main 3pane window
  wait_for_message_display_completion(mc, true);
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

  // Check whether each tab has the correct message, then close it to load the
  // previous tab.
  for (let i = 0; i < NUM_MESSAGES_TO_OPEN; i++) {
    assert_selected_and_displayed(selectedMessages.pop());
    close_tab(mc.window.document.getElementById("tabmail").currentTabInfo);
  }
  await switch_tab(folderTab);
  reset_open_message_behavior();
});

/**
 * Test opening a search result in a new window.
 */
add_task(async function test_open_search_result_in_new_window() {
  swc.window.focus();
  set_open_message_behavior("NEW_WINDOW");

  // Select a message
  swc.window.document.getElementById("threadTree").focus();
  let msgHdr = select_click_search_row(1, swc);

  let newWindowPromise = async_plan_for_new_window("mail:messageWindow");
  // Open it
  open_selected_message(swc);
  let msgc = await newWindowPromise;
  wait_for_message_display_completion(msgc, true);

  assert_selected_and_displayed(msgc, msgHdr);
  // Clean up, close the window
  close_message_window(msgc);
  reset_open_message_behavior();
});

/**
 * Test reusing an existing window to open another search result.
 */
add_task(async function test_open_search_result_in_existing_window() {
  swc.window.focus();
  set_open_message_behavior("EXISTING_WINDOW");

  // Open up a window
  swc.window.document.getElementById("threadTree").focus();
  select_click_search_row(1, swc);
  let newWindowPromise = async_plan_for_new_window("mail:messageWindow");
  open_selected_message(swc);
  let msgc = await newWindowPromise;
  wait_for_message_display_completion(msgc, true);

  // Select another message and open it
  let msgHdr = select_click_search_row(2, swc);
  plan_for_message_display(msgc);
  open_selected_message(swc);
  wait_for_message_display_completion(msgc, true);

  // Check if our old window displays the message
  assert_selected_and_displayed(msgc, msgHdr);
  // Clean up, close the window
  close_message_window(msgc);
  reset_open_message_behavior();
});

/**
 * Save the search, making sure the constraints propagated.
 */
function subtest_save_search(savc) {
  // - make sure our constraint propagated
  // The query constraints are displayed using the same widgets (and code) that
  //  we used to enter them, so it's very similar to check.
  let searchVal0 = swc.window.document.getElementById("searchVal0");
  let index = 0;

  if (searchVal0.hasAttribute("selectedIndex")) {
    index = parseInt(searchVal0.getAttribute("selectedIndex"));
  }

  searchVal0 = searchVal0.children[index];

  Assert.ok(searchVal0);
  Assert.equal(searchVal0.value, "foo");

  let searchVal1 = swc.window.document.getElementById("searchVal1");
  index = 0;

  if (searchVal1.hasAttribute("selectedIndex")) {
    index = parseInt(searchVal1.getAttribute("selectedIndex"));
  }

  searchVal1 = searchVal1.children[index];

  Assert.ok(searchVal1);
  Assert.equal(searchVal1.value, "bar");

  // - name the search
  savc.window.document.getElementById("name").focus();
  EventUtils.sendString("SearchSaved", savc.window);

  // - save it!
  // this will close the dialog, which wait_for_modal_dialog is making sure
  //  happens.
  savc.window.document.querySelector("dialog").acceptDialog();
}

add_task(function test_close_search_window() {
  swc.window.focus();
  // now close the search window
  plan_for_window_close(swc);
  EventUtils.synthesizeKey("VK_ESCAPE", {}, swc.window);
  wait_for_window_close(swc);
  swc = null;
});

/**
 * Make sure the folder showed up with the right name, and that displaying it
 *  has the right contents.
 */
add_task(async function test_verify_saved_search() {
  let savedFolder = folder.getChildNamed("SearchSaved");
  if (savedFolder == null) {
    throw new Error("Saved folder did not show up.");
  }

  await be_in_folder(savedFolder);
  assert_messages_in_view(setFooBar);

  Assert.report(
    false,
    undefined,
    undefined,
    "Test ran to completion successfully"
  );
});
