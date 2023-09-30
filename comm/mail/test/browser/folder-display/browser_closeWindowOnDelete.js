/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Test that the close message window on delete option works.
 */

"use strict";

var {
  assert_number_of_tabs_open,
  be_in_folder,
  close_tab,
  create_folder,
  make_message_sets_in_folders,
  mc,
  open_selected_message_in_new_tab,
  open_selected_message_in_new_window,
  press_delete,
  reset_close_message_on_delete,
  select_click_row,
  set_close_message_on_delete,
  switch_tab,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { close_window, plan_for_window_close, wait_for_window_close } =
  ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

var folder;

add_setup(async function () {
  folder = await create_folder("CloseWindowOnDeleteA");
  await make_message_sets_in_folders([folder], [{ count: 10 }]);
});

/**
 * Delete a message and check that the message window is closed
 * where appropriate.
 */
add_task(
  async function test_close_message_window_on_delete_from_message_window() {
    set_close_message_on_delete(true);
    await be_in_folder(folder);

    // select the first message
    select_click_row(0);
    // display it
    let msgc = await open_selected_message_in_new_window();

    select_click_row(1);
    let msgc2 = await open_selected_message_in_new_window();

    let preCount = folder.getTotalMessages(false);
    msgc.window.focus();
    plan_for_window_close(msgc);
    press_delete(msgc);
    if (folder.getTotalMessages(false) != preCount - 1) {
      throw new Error("didn't delete a message before closing window");
    }
    wait_for_window_close(msgc);

    if (msgc2.window.closed) {
      throw new Error("should only have closed the active window");
    }

    close_window(msgc2);

    reset_close_message_on_delete();
  }
);

/**
 * Delete a message when multiple windows are open to the message, and the
 * message is deleted from one of them.
 */
add_task(
  async function test_close_multiple_message_windows_on_delete_from_message_window() {
    set_close_message_on_delete(true);
    await be_in_folder(folder);

    // select the first message
    select_click_row(0);
    // display it
    let msgc = await open_selected_message_in_new_window();
    let msgcA = await open_selected_message_in_new_window();

    select_click_row(1);
    let msgc2 = await open_selected_message_in_new_window();

    let preCount = folder.getTotalMessages(false);
    msgc.window.focus();
    plan_for_window_close(msgc);
    plan_for_window_close(msgcA);
    press_delete(msgc);

    if (folder.getTotalMessages(false) != preCount - 1) {
      throw new Error("didn't delete a message before closing window");
    }
    wait_for_window_close(msgc);
    wait_for_window_close(msgcA);

    if (msgc2.window.closed) {
      throw new Error("should only have closed the active window");
    }

    close_window(msgc2);

    reset_close_message_on_delete();
  }
);

/**
 * Delete a message when multiple windows are open to the message, and the
 * message is deleted from the 3-pane window.
 */
add_task(
  async function test_close_multiple_message_windows_on_delete_from_3pane_window() {
    set_close_message_on_delete(true);
    await be_in_folder(folder);

    // select the first message
    select_click_row(0);
    // display it
    let msgc = await open_selected_message_in_new_window();
    let msgcA = await open_selected_message_in_new_window();

    select_click_row(1);
    let msgc2 = await open_selected_message_in_new_window();

    let preCount = folder.getTotalMessages(false);
    mc.window.focus();
    plan_for_window_close(msgc);
    plan_for_window_close(msgcA);
    select_click_row(0);
    press_delete(mc);

    if (folder.getTotalMessages(false) != preCount - 1) {
      throw new Error("didn't delete a message before closing window");
    }
    wait_for_window_close(msgc);
    wait_for_window_close(msgcA);

    if (msgc2.window.closed) {
      throw new Error("should only have closed the first window");
    }

    close_window(msgc2);

    reset_close_message_on_delete();
  }
);

/**
 * Delete a message and check that the message tab is closed
 * where appropriate.
 */
add_task(async function test_close_message_tab_on_delete_from_message_tab() {
  set_close_message_on_delete(true);
  await be_in_folder(folder);

  // select the first message
  select_click_row(0);
  // display it
  let msgc = await open_selected_message_in_new_tab(true);

  select_click_row(1);
  let msgc2 = await open_selected_message_in_new_tab(true);

  let preCount = folder.getTotalMessages(false);
  await switch_tab(msgc);
  press_delete();

  if (folder.getTotalMessages(false) != preCount - 1) {
    throw new Error("didn't delete a message before closing tab");
  }

  assert_number_of_tabs_open(2);

  if (msgc2 != mc.window.document.getElementById("tabmail").tabInfo[1]) {
    throw new Error("should only have closed the active tab");
  }

  close_tab(msgc2);

  reset_close_message_on_delete();
});

/**
 * Delete a message when multiple windows are open to the message, and the
 * message is deleted from one of them.
 */
add_task(
  async function test_close_multiple_message_tabs_on_delete_from_message_tab() {
    set_close_message_on_delete(true);
    await be_in_folder(folder);

    // select the first message
    select_click_row(0);
    // display it
    let msgc = await open_selected_message_in_new_tab(true);
    await open_selected_message_in_new_tab(true);

    select_click_row(1);
    let msgc2 = await open_selected_message_in_new_tab(true);

    let preCount = folder.getTotalMessages(false);
    await switch_tab(msgc);
    press_delete();

    if (folder.getTotalMessages(false) != preCount - 1) {
      throw new Error("didn't delete a message before closing tab");
    }

    assert_number_of_tabs_open(2);

    if (msgc2 != mc.window.document.getElementById("tabmail").tabInfo[1]) {
      throw new Error("should only have closed the active tab");
    }

    close_tab(msgc2);

    reset_close_message_on_delete();
  }
);

/**
 * Delete a message when multiple tabs are open to the message, and the
 * message is deleted from the 3-pane window.
 */
add_task(
  async function test_close_multiple_message_tabs_on_delete_from_3pane_window() {
    set_close_message_on_delete(true);
    await be_in_folder(folder);

    // select the first message
    select_click_row(0);
    // display it
    await open_selected_message_in_new_tab(true);
    await open_selected_message_in_new_tab(true);

    select_click_row(1);
    let msgc2 = await open_selected_message_in_new_tab(true);

    let preCount = folder.getTotalMessages(false);
    mc.window.focus();
    select_click_row(0);
    press_delete(mc);

    if (folder.getTotalMessages(false) != preCount - 1) {
      throw new Error("didn't delete a message before closing window");
    }

    assert_number_of_tabs_open(2);

    if (msgc2 != mc.window.document.getElementById("tabmail").tabInfo[1]) {
      throw new Error("should only have closed the active tab");
    }

    close_tab(msgc2);

    reset_close_message_on_delete();
  }
);

/**
 * Delete a message when multiple windows and tabs are open to the message, and
 * the message is deleted from the 3-pane window.
 */
add_task(
  async function test_close_multiple_windows_tabs_on_delete_from_3pane_window() {
    set_close_message_on_delete(true);
    await be_in_folder(folder);

    // select the first message
    select_click_row(0);
    // display it
    await open_selected_message_in_new_tab(true);
    let msgcA = await open_selected_message_in_new_window();

    select_click_row(1);
    let msgc2 = await open_selected_message_in_new_tab(true);
    let msgc2A = await open_selected_message_in_new_window();

    let preCount = folder.getTotalMessages(false);
    mc.window.focus();
    plan_for_window_close(msgcA);
    select_click_row(0);
    press_delete(mc);

    if (folder.getTotalMessages(false) != preCount - 1) {
      throw new Error("didn't delete a message before closing window");
    }
    wait_for_window_close(msgcA);

    assert_number_of_tabs_open(2);

    if (msgc2 != mc.window.document.getElementById("tabmail").tabInfo[1]) {
      throw new Error("should only have closed the active tab");
    }

    if (msgc2A.window.closed) {
      throw new Error("should only have closed the first window");
    }

    close_tab(msgc2);
    close_window(msgc2A);

    reset_close_message_on_delete();

    Assert.report(
      false,
      undefined,
      undefined,
      "Test ran to completion successfully"
    );
  }
);
