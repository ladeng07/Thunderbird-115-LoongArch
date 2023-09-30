/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests that converting an email to an event/task works.
 */

"use strict";

var {
  assert_selected_and_displayed,
  be_in_folder,
  create_folder,
  get_about_message,
  mc,
  open_message_from_file,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { click_menus_in_sequence, close_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

var { CalendarTestUtils } = ChromeUtils.import(
  "resource://testing-common/calendar/CalendarTestUtils.jsm"
);

var folder;

add_setup(async function () {
  folder = await create_folder("ConvertToEvent");
  // Enable home calendar.
  cal.manager.getCalendars()[0].setProperty("disabled", false);

  registerCleanupFunction(() => {
    folder.deleteSelf(null);
    cal.manager.getCalendars()[0].setProperty("disabled", true);
    mc.window.document.documentElement.focus();
  });
});

add_task(async function test_convertToEvent() {
  let file = new FileUtils.File(getTestFilePath("data/multiparty.eml"));
  let msgc = await open_message_from_file(file);

  await be_in_folder(folder);

  // Copy the message to a folder.
  let aboutMessage =
    msgc.window.document.getElementById("messageBrowser").contentWindow;
  let documentChild = aboutMessage.document
    .getElementById("messagepane")
    .contentDocument.querySelector("div.moz-text-flowed");
  EventUtils.synthesizeMouseAtCenter(
    documentChild,
    { type: "contextmenu", button: 2 },
    documentChild.ownerGlobal
  );
  await click_menus_in_sequence(
    aboutMessage.document.getElementById("mailContext"),
    [
      { id: "mailContext-copyMenu" },
      { label: "Local Folders" },
      { label: "ConvertToEvent" },
    ]
  );
  close_window(msgc);

  let msg = select_click_row(0);
  assert_selected_and_displayed(mc, msg);

  // Open Other Actions, and check the event dialog popping up seems alright.
  let dialogWindowPromise = CalendarTestUtils.waitForEventDialog("edit");
  let win = get_about_message();
  let otherActionsButton = win.document.getElementById("otherActionsButton");
  EventUtils.synthesizeMouseAtCenter(
    otherActionsButton,
    {},
    otherActionsButton.ownerGlobal
  );
  await click_menus_in_sequence(
    win.document.getElementById("otherActionsPopup"),
    [
      { id: "otherActions-calendar-convert-menu" },
      { id: "otherActions-calendar-convert-event-menuitem" },
    ]
  );

  await dialogWindowPromise.then(async dialogWindow => {
    let document = dialogWindow.document.querySelector(
      "#calendar-item-panel-iframe"
    ).contentDocument;

    let startDate = document.getElementById("event-starttime");
    let dt = cal.createDateTime();
    let june30 = new Date();
    june30.setMonth(5);
    june30.setDate(30);
    dt.nativeTime = june30.getTime() * 1000;
    Assert.equal(
      startDate._datepicker._inputField.value,
      cal.dtz.formatter.formatDateShort(dt),
      "correct date should be preset from extraction"
    );

    // TODO: add more checks for times etc.
    //Assert.equal(
    //  startDate._timepicker._inputField.value,
    //  formatTime(expectedDate),
    //  "time should be the next hour after now"
    //);

    Assert.equal(
      "I'm having a party on Friday, June 30. Welcome!See you then. Call me at 555-123456",
      document.getElementById("item-description").contentDocument.body
        .textContent,
      "body content should be correct"
    );

    await BrowserTestUtils.closeWindow(dialogWindow);
  });
});
