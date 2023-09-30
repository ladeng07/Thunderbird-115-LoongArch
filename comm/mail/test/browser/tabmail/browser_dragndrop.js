/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Double timeout for code coverage runs.
if (AppConstants.MOZ_CODE_COVERAGE) {
  requestLongerTimeout(2);
}

/*
 * Test rearanging tabs via drag'n'drop.
 */

var EventUtils = ChromeUtils.import(
  "resource://testing-common/mozmill/EventUtils.jsm"
);

var {
  assert_folder_selected_and_displayed,
  assert_number_of_tabs_open,
  assert_selected_and_displayed,
  be_in_folder,
  close_popup,
  create_folder,
  display_message_in_folder_tab,
  get_about_3pane,
  make_message_sets_in_folders,
  mc,
  open_folder_in_new_window,
  open_selected_message_in_new_tab,
  select_click_row,
  switch_tab,
  wait_for_message_display_completion,
  wait_for_popup_to_open,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var {
  drag_n_drop_element,
  synthesize_drag_end,
  synthesize_drag_start,
  synthesize_drag_over,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/MouseEventHelpers.jsm"
);
var { async_plan_for_new_window, close_window, wait_for_new_window } =
  ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

var folder;
var msgHdrsInFolder = [];

// The number of messages in folder.
var NUM_MESSAGES_IN_FOLDER = 15;

add_setup(async function () {
  folder = await create_folder("MessageFolder");
  await make_message_sets_in_folders(
    [folder],
    [{ count: NUM_MESSAGES_IN_FOLDER }]
  );
  msgHdrsInFolder = [...folder.messages];
  folder.markAllMessagesRead(null);

  await be_in_folder(folder);
});

registerCleanupFunction(async function () {
  folder.deleteSelf(null);
});

/**
 * Tests reordering tabs by drag'n'drop within the tabbar
 *
 * It opens additional movable and closable tabs. The picks the first
 * movable tab and drops it onto the third movable tab.
 */
add_task(async function test_tab_reorder_tabbar() {
  let tabmail = mc.window.document.getElementById("tabmail");
  // Ensure only one tab is open, otherwise our test most likey fail anyway.
  tabmail.closeOtherTabs(0);
  assert_number_of_tabs_open(1);

  await be_in_folder(folder);

  // Open four tabs
  for (let idx = 0; idx < 4; idx++) {
    select_click_row(idx);
    await open_selected_message_in_new_tab(true);
  }

  // Check if every thing is correctly initialized
  assert_number_of_tabs_open(5);

  Assert.ok(
    tabmail.tabModes.mailMessageTab.tabs[0] == tabmail.tabInfo[1],
    " tabMode.tabs and tabInfo out of sync"
  );

  Assert.ok(
    tabmail.tabModes.mailMessageTab.tabs[1] ==
      mc.window.document.getElementById("tabmail").tabInfo[2],
    " tabMode.tabs and tabInfo out of sync"
  );

  Assert.ok(
    tabmail.tabModes.mailMessageTab.tabs[2] == tabmail.tabInfo[3],
    " tabMode.tabs and tabInfo out of sync"
  );

  // Start dragging the first tab
  await switch_tab(1);
  assert_selected_and_displayed(msgHdrsInFolder[0]);

  let tab1 = tabmail.tabContainer.allTabs[1];
  let tab3 = tabmail.tabContainer.allTabs[3];

  drag_n_drop_element(
    tab1,
    mc.window,
    tab3,
    mc.window,
    0.75,
    0.0,
    tabmail.tabContainer
  );

  wait_for_message_display_completion(mc);

  // if every thing went well...
  assert_number_of_tabs_open(5);

  // ... we should find tab1 at the third position...
  Assert.equal(tab1, tabmail.tabContainer.allTabs[3], "Moving tab1 failed");
  await switch_tab(3);
  assert_selected_and_displayed(msgHdrsInFolder[0]);

  // ... while tab3 moves one up and gets second.
  Assert.ok(tab3 == tabmail.tabContainer.allTabs[2], "Moving tab3 failed");
  await switch_tab(2);
  assert_selected_and_displayed(msgHdrsInFolder[2]);

  // we have one "message" tab and three "folder" tabs, thus tabInfo[1-3] and
  // tabMode["message"].tabs[0-2] have to be same, otherwise something went
  // wrong while moving tabs around
  Assert.ok(
    tabmail.tabModes.mailMessageTab.tabs[0] == tabmail.tabInfo[1],
    " tabMode.tabs and tabInfo out of sync"
  );

  Assert.ok(
    tabmail.tabModes.mailMessageTab.tabs[1] == tabmail.tabInfo[2],
    " tabMode.tabs and tabInfo out of sync"
  );

  Assert.ok(
    tabmail.tabModes.mailMessageTab.tabs[2] == tabmail.tabInfo[3],
    " tabMode.tabs and tabInfo out of sync"
  );
  teardownTest();
});

/**
 * Tests drag'n'drop tab reordering between windows
 */
add_task(async function test_tab_reorder_window() {
  let tabmail = mc.window.document.getElementById("tabmail");
  // Ensure only one tab is open, otherwise our test most likey fail anyway.
  tabmail.closeOtherTabs(0);
  assert_number_of_tabs_open(1);

  let mc2 = null;

  await be_in_folder(folder);

  // Open a new tab...
  select_click_row(1);
  await open_selected_message_in_new_tab(false);

  assert_number_of_tabs_open(2);

  await switch_tab(1);
  assert_selected_and_displayed(msgHdrsInFolder[1]);

  // ...and then a new 3 pane as our drop target.
  mc2 = open_folder_in_new_window(folder);

  // Start dragging the first tab ...
  let tabA = tabmail.tabContainer.allTabs[1];
  Assert.ok(tabA, "No movable Tab");

  // We drop onto the Folder Tab, it is guaranteed to exist.
  let tabmail2 = mc2.window.document.getElementById("tabmail");
  let tabB = tabmail2.tabContainer.allTabs[0];
  Assert.ok(tabB, "No movable Tab");

  drag_n_drop_element(
    tabA,
    mc.window,
    tabB,
    mc2.window,
    0.75,
    0.0,
    tabmail.tabContainer
  );

  wait_for_message_display_completion(mc2);

  Assert.ok(
    tabmail.tabContainer.allTabs.length == 1,
    "Moving tab to new window failed, tab still in old window"
  );

  Assert.ok(
    tabmail2.tabContainer.allTabs.length == 2,
    "Moving tab to new window failed, no new tab in new window"
  );

  assert_selected_and_displayed(mc2, msgHdrsInFolder[1]);
  teardownTest();
});

/**
 * Tests detaching tabs into windows via drag'n'drop
 */
add_task(async function test_tab_reorder_detach() {
  let tabmail = mc.window.document.getElementById("tabmail");
  // Ensure only one tab is open, otherwise our test most likey fail anyway.
  tabmail.closeOtherTabs(0);
  assert_number_of_tabs_open(1);

  let mc2 = null;

  await be_in_folder(folder);

  // Open a new tab...
  select_click_row(2);
  await open_selected_message_in_new_tab(false);

  assert_number_of_tabs_open(2);

  // ... if every thing works we should expect a new window...
  let newWindowPromise = async_plan_for_new_window("mail:3pane");

  // ... now start dragging
  tabmail.switchToTab(1);

  let tab1 = tabmail.tabContainer.allTabs[1];
  let dropContent = mc.window.document.getElementById("tabpanelcontainer");

  let dt = synthesize_drag_start(mc.window, tab1, tabmail.tabContainer);

  synthesize_drag_over(mc.window, dropContent, dt);

  // notify tab1 drag has ended
  let dropRect = dropContent.getBoundingClientRect();
  synthesize_drag_end(mc.window, dropContent, tab1, dt, {
    screenX: dropContent.screenX + dropRect.width / 2,
    screenY: dropContent.screenY + dropRect.height / 2,
  });

  // ... and wait for the new window
  mc2 = await newWindowPromise;
  let tabmail2 = mc2.window.document.getElementById("tabmail");
  await TestUtils.waitForCondition(
    () => tabmail2.tabInfo[1]?.chromeBrowser,
    "waiting for a second tab to open in the new window"
  );
  wait_for_message_display_completion(mc2, true);

  Assert.ok(
    tabmail.tabContainer.allTabs.length == 1,
    "Moving tab to new window failed, tab still in old window"
  );

  Assert.ok(
    tabmail2.tabContainer.allTabs.length == 2,
    "Moving tab to new window failed, no new tab in new window"
  );

  assert_selected_and_displayed(mc2, msgHdrsInFolder[2]);
  teardownTest();
});

/**
 * Test undo of recently closed tabs.
 */
add_task(async function test_tab_undo() {
  let tabmail = mc.window.document.getElementById("tabmail");
  // Ensure only one tab is open, otherwise our test most likey fail anyway.
  tabmail.closeOtherTabs(0);
  assert_number_of_tabs_open(1);

  await be_in_folder(folder);

  // Open five tabs...
  for (let idx = 0; idx < 5; idx++) {
    select_click_row(idx);
    await open_selected_message_in_new_tab(true);
  }

  assert_number_of_tabs_open(6);

  await switch_tab(2);
  assert_selected_and_displayed(msgHdrsInFolder[1]);

  tabmail.closeTab(2);
  // This tab should not be added to recently closed tabs...
  // ... thus it can't be restored
  tabmail.closeTab(2, true);
  tabmail.closeTab(2);

  assert_number_of_tabs_open(3);
  assert_selected_and_displayed(mc, msgHdrsInFolder[4]);

  tabmail.undoCloseTab();
  wait_for_message_display_completion();
  assert_number_of_tabs_open(4);
  assert_selected_and_displayed(mc, msgHdrsInFolder[3]);

  // msgHdrsInFolder[2] won't be restored, it was closed with disabled undo.

  tabmail.undoCloseTab();
  wait_for_message_display_completion();
  assert_number_of_tabs_open(5);
  assert_selected_and_displayed(mc, msgHdrsInFolder[1]);
  teardownTest();
});

async function _synthesizeRecentlyClosedMenu() {
  let tab =
    mc.window.document.getElementById("tabmail").tabContainer.allTabs[1];
  EventUtils.synthesizeMouseAtCenter(
    tab,
    { type: "contextmenu", button: 2 },
    tab.ownerGlobal
  );

  let tabContextMenu = mc.window.document.getElementById("tabContextMenu");
  await wait_for_popup_to_open(tabContextMenu);

  let recentlyClosedTabs = mc.window.document.getElementById(
    "tabContextMenuRecentlyClosed"
  );

  recentlyClosedTabs.openMenu(true);
  await wait_for_popup_to_open(recentlyClosedTabs.menupopup);

  return recentlyClosedTabs;
}

async function _teardownRecentlyClosedMenu() {
  let menu = mc.window.document.getElementById("tabContextMenu");
  await close_popup(mc, menu);
}

/**
 * Tests the recently closed tabs menu.
 */
add_task(async function test_tab_recentlyClosed() {
  let tabmail = mc.window.document.getElementById("tabmail");
  // Ensure only one tab is open, otherwise our test most likey fail anyway.
  tabmail.closeOtherTabs(0, true);
  assert_number_of_tabs_open(1);

  // We start with a clean tab history.
  tabmail.clearRecentlyClosedTabs();
  Assert.equal(tabmail.recentlyClosedTabs.length, 0);

  // The history is cleaned so let's open 15 tabs...
  await be_in_folder(folder);

  for (let idx = 0; idx < 15; idx++) {
    select_click_row(idx);
    await open_selected_message_in_new_tab(true);
  }

  assert_number_of_tabs_open(16);

  await switch_tab(2);
  assert_selected_and_displayed(msgHdrsInFolder[1]);

  // ... and store the tab titles, to ensure they match with the menu items.
  let tabTitles = [];
  for (let idx = 0; idx < 16; idx++) {
    tabTitles.unshift(tabmail.tabInfo[idx].title);
  }

  // Start the test by closing all tabs except the first two tabs...
  for (let idx = 0; idx < 14; idx++) {
    tabmail.closeTab(2);
  }

  assert_number_of_tabs_open(2);

  // ...then open the context menu.
  let menu = await _synthesizeRecentlyClosedMenu();

  // Check if the context menu was populated correctly...
  Assert.ok(menu.itemCount == 12, "Failed to populate context menu");
  for (let idx = 0; idx < 10; idx++) {
    Assert.ok(
      tabTitles[idx] == menu.getItemAtIndex(idx).label,
      "Tab Title does not match Menu item"
    );
  }

  // Restore the most recently closed tab
  menu.menupopup.activateItem(menu.getItemAtIndex(0));
  await _teardownRecentlyClosedMenu();
  await new Promise(resolve => setTimeout(resolve));

  wait_for_message_display_completion(mc);
  assert_number_of_tabs_open(3);
  assert_selected_and_displayed(msgHdrsInFolder[14]);

  // The context menu should now contain one item less.
  await _synthesizeRecentlyClosedMenu();

  Assert.ok(menu.itemCount == 11, "Failed to populate context menu");
  for (let idx = 0; idx < 9; idx++) {
    Assert.ok(
      tabTitles[idx + 1] == menu.getItemAtIndex(idx).label,
      "Tab Title does not match Menu item"
    );
  }

  // Now we restore an "random" tab.
  menu.menupopup.activateItem(menu.getItemAtIndex(5));
  await _teardownRecentlyClosedMenu();
  await new Promise(resolve => setTimeout(resolve));

  wait_for_message_display_completion(mc);
  assert_number_of_tabs_open(4);
  assert_selected_and_displayed(msgHdrsInFolder[8]);

  // finally restore all tabs
  await _synthesizeRecentlyClosedMenu();

  Assert.ok(menu.itemCount == 10, "Failed to populate context menu");
  Assert.ok(
    tabTitles[1] == menu.getItemAtIndex(0).label,
    "Tab Title does not match Menu item"
  );
  Assert.ok(
    tabTitles[7] == menu.getItemAtIndex(5).label,
    "Tab Title does not match Menu item"
  );

  menu.menupopup.activateItem(menu.getItemAtIndex(menu.itemCount - 1));
  await _teardownRecentlyClosedMenu();
  await new Promise(resolve => setTimeout(resolve));

  wait_for_message_display_completion(mc);

  // out of the 16 tab, we closed all except two. As the history can store
  // only 10 items we have to endup with exactly 10 + 2 tabs.
  assert_number_of_tabs_open(12);
  teardownTest();
});

function teardownTest(test) {
  // Some test cases open new windows, thus we need to ensure all
  // opened windows get closed.
  for (let win of Services.wm.getEnumerator("mail:3pane")) {
    if (win != mc.window) {
      win.close();
    }
  }

  // clean up the tabbbar
  mc.window.document.getElementById("tabmail").closeOtherTabs(0);
  assert_number_of_tabs_open(1);
}
