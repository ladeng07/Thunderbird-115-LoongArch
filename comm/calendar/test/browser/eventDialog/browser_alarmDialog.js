/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { saveAndCloseItemDialog, setData } = ChromeUtils.import(
  "resource://testing-common/calendar/ItemEditingHelpers.jsm"
);

var { dayView } = CalendarTestUtils;

add_task(async function testAlarmDialog() {
  let now = new Date();

  const TITLE = "Event";

  let calendar = CalendarTestUtils.createCalendar();
  registerCleanupFunction(() => {
    CalendarTestUtils.removeCalendar(calendar);
  });

  await CalendarTestUtils.setCalendarView(window, "day");
  await CalendarTestUtils.goToDate(
    window,
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate()
  );
  await CalendarTestUtils.calendarViewForward(window, 1);

  let allDayHeader = dayView.getAllDayHeader(window);
  Assert.ok(allDayHeader);
  EventUtils.synthesizeMouseAtCenter(allDayHeader, {}, window);

  // Create a new all-day event tomorrow.

  // Prepare to dismiss the alarm.
  let alarmPromise = BrowserTestUtils.promiseAlertDialog(
    null,
    "chrome://calendar/content/calendar-alarm-dialog.xhtml",
    {
      async callback(alarmWindow) {
        await new Promise(resolve => alarmWindow.setTimeout(resolve, 500));

        let dismissButton = alarmWindow.document.getElementById("alarm-dismiss-all-button");
        EventUtils.synthesizeMouseAtCenter(dismissButton, {}, alarmWindow);
      },
    }
  );
  let { dialogWindow, iframeWindow } = await CalendarTestUtils.editNewEvent(window);
  await setData(dialogWindow, iframeWindow, {
    allday: true,
    reminder: "1day",
    title: TITLE,
  });

  await saveAndCloseItemDialog(dialogWindow);
  await alarmPromise;

  // Change the reminder duration, this resets the alarm.
  let eventBox = await dayView.waitForAllDayItemAt(window, 1);

  // Prepare to snooze the alarm.
  alarmPromise = BrowserTestUtils.promiseAlertDialog(
    null,
    "chrome://calendar/content/calendar-alarm-dialog.xhtml",
    {
      async callback(alarmWindow) {
        await new Promise(resolve => alarmWindow.setTimeout(resolve, 500));

        let snoozeAllButton = alarmWindow.document.getElementById("alarm-snooze-all-button");
        let popup = alarmWindow.document.querySelector("#alarm-snooze-all-popup");
        let menuitems = alarmWindow.document.querySelectorAll("#alarm-snooze-all-popup > menuitem");

        let shownPromise = BrowserTestUtils.waitForEvent(snoozeAllButton, "popupshown");
        EventUtils.synthesizeMouseAtCenter(snoozeAllButton, {}, alarmWindow);
        await shownPromise;
        popup.activateItem(menuitems[5]);
      },
    }
  );

  ({ dialogWindow, iframeWindow } = await CalendarTestUtils.editItem(window, eventBox));
  await setData(dialogWindow, iframeWindow, { reminder: "2days", title: TITLE });
  await saveAndCloseItemDialog(dialogWindow);
  await alarmPromise;

  Assert.ok(true, "Test ran to completion");
});
