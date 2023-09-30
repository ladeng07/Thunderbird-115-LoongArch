/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

// This tests importing an ICS file. Rather than using the UI to trigger the
// import, loadEventsFromFile is called directly.

/* globals loadEventsFromFile */

const { MockFilePicker } = ChromeUtils.importESModule(
  "resource://testing-common/MockFilePicker.sys.mjs"
);
const ChromeRegistry = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry);

add_task(async () => {
  await CalendarTestUtils.setCalendarView(window, "month");
  await CalendarTestUtils.goToDate(window, 2019, 1, 1);

  let chromeUrl = Services.io.newURI(getRootDirectory(gTestPath) + "data/import.ics");
  let fileUrl = ChromeRegistry.convertChromeURL(chromeUrl);
  let file = fileUrl.QueryInterface(Ci.nsIFileURL).file;

  MockFilePicker.init(window);
  MockFilePicker.setFiles([file]);
  MockFilePicker.returnValue = MockFilePicker.returnCancel;

  let calendar = CalendarTestUtils.createCalendar();

  registerCleanupFunction(() => {
    CalendarTestUtils.removeCalendar(calendar);
    MockFilePicker.cleanup();
  });

  let cancelReturn = await loadEventsFromFile();
  ok(!cancelReturn, "loadEventsFromFile returns false on cancel");

  // Prepare to test the import dialog.
  MockFilePicker.returnValue = MockFilePicker.returnOK;

  let dialogWindowPromise = BrowserTestUtils.promiseAlertDialog(
    null,
    "chrome://calendar/content/calendar-ics-file-dialog.xhtml",
    {
      async callback(dialogWindow) {
        let doc = dialogWindow.document;
        let dialogElement = doc.querySelector("dialog");

        let optionsPane = doc.getElementById("calendar-ics-file-dialog-options-pane");
        let progressPane = doc.getElementById("calendar-ics-file-dialog-progress-pane");
        let resultPane = doc.getElementById("calendar-ics-file-dialog-result-pane");

        ok(!optionsPane.hidden);
        ok(progressPane.hidden);
        ok(resultPane.hidden);

        // Check the initial import dialog state.
        let displayedPath = doc.querySelector("#calendar-ics-file-dialog-file-path").value;
        let pathFragment = "browser/comm/calendar/test/browser/data/import.ics";
        if (Services.appinfo.OS == "WINNT") {
          pathFragment = pathFragment.replace(/\//g, "\\");
        }
        is(
          displayedPath.substring(displayedPath.length - pathFragment.length),
          pathFragment,
          "the displayed ics file path is correct"
        );

        let calendarMenu = doc.querySelector("#calendar-ics-file-dialog-calendar-menu");
        // 0 is the Home calendar.
        calendarMenu.selectedIndex = 1;
        let calendarMenuItems = calendarMenu.querySelectorAll("menuitem");
        is(calendarMenu.value, "Test", "correct calendar name is selected");
        Assert.equal(calendarMenuItems.length, 1, "exactly one calendar is in the calendars menu");
        is(calendarMenuItems[0].selected, true, "calendar menu item is selected");

        let items;
        await TestUtils.waitForCondition(() => {
          items = doc.querySelectorAll(".calendar-ics-file-dialog-item-frame");
          return items.length == 4;
        }, "four calendar items are displayed");
        is(
          items[0].querySelector(".item-title").textContent,
          "Event One",
          "event 1 title should be correct"
        );
        is(
          items[1].querySelector(".item-title").textContent,
          "Event Two",
          "event 2 title should be correct"
        );
        is(
          items[2].querySelector(".item-title").textContent,
          "Event Three",
          "event 3 title should be correct"
        );
        is(
          items[3].querySelector(".item-title").textContent,
          "Event Four",
          "event 4 title should be correct"
        );
        is(
          items[0].querySelector(".item-date-row-start-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T150000")),
          "event 1 start date should be correct"
        );
        is(
          items[0].querySelector(".item-date-row-end-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T160000")),
          "event 1 end date should be correct"
        );
        is(
          items[1].querySelector(".item-date-row-start-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T160000")),
          "event 2 start date should be correct"
        );
        is(
          items[1].querySelector(".item-date-row-end-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T170000")),
          "event 2 end date should be correct"
        );
        is(
          items[2].querySelector(".item-date-row-start-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T170000")),
          "event 3 start date should be correct"
        );
        is(
          items[2].querySelector(".item-date-row-end-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T180000")),
          "event 3 end date should be correct"
        );
        is(
          items[3].querySelector(".item-date-row-start-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T180000")),
          "event 4 start date should be correct"
        );
        is(
          items[3].querySelector(".item-date-row-end-date").textContent,
          cal.dtz.formatter.formatDateTime(cal.createDateTime("20190101T190000")),
          "event 4 end date should be correct"
        );

        function check_displayed_titles(expectedTitles) {
          let items = doc.querySelectorAll(
            ".calendar-ics-file-dialog-item-frame:not([hidden]) > calendar-item-summary"
          );
          Assert.deepEqual(
            [...items].map(summary => summary.item.title),
            expectedTitles
          );
        }

        let filterInput = doc.getElementById("calendar-ics-file-dialog-search-input");
        async function check_filter(filterText, expectedTitles) {
          let commandPromise = BrowserTestUtils.waitForEvent(filterInput, "command");

          EventUtils.synthesizeMouseAtCenter(filterInput, {}, dialogWindow);
          if (filterText) {
            EventUtils.synthesizeKey("a", { accelKey: true }, dialogWindow);
            EventUtils.sendString(filterText, dialogWindow);
          } else {
            EventUtils.synthesizeKey("VK_ESCAPE", {}, dialogWindow);
          }

          await commandPromise;

          check_displayed_titles(expectedTitles);
        }

        await check_filter("event", ["Event One", "Event Two", "Event Three", "Event Four"]);
        await check_filter("four", ["Event Four"]);
        await check_filter("ONE", ["Event One"]);
        await check_filter(`"event t"`, ["Event Two", "Event Three"]);
        await check_filter("", ["Event One", "Event Two", "Event Three", "Event Four"]);

        async function check_sort(order, expectedTitles) {
          let sortButton = doc.getElementById("calendar-ics-file-dialog-sort-button");
          let shownPromise = BrowserTestUtils.waitForEvent(sortButton, "popupshown");
          EventUtils.synthesizeMouseAtCenter(sortButton, {}, dialogWindow);
          await shownPromise;
          let hiddenPromise = BrowserTestUtils.waitForEvent(sortButton, "popuphidden");
          EventUtils.synthesizeMouseAtCenter(
            doc.getElementById(`calendar-ics-file-dialog-sort-${order}`),
            {},
            dialogWindow
          );
          await hiddenPromise;

          let items = doc.querySelectorAll("calendar-item-summary");
          is(items.length, 4, "four calendar items are displayed");
          Assert.deepEqual(
            [...items].map(summary => summary.item.title),
            expectedTitles
          );
        }

        await check_sort("title-ascending", [
          "Event Four",
          "Event One",
          "Event Three",
          "Event Two",
        ]);
        await check_sort("start-descending", [
          "Event Four",
          "Event Three",
          "Event Two",
          "Event One",
        ]);
        await check_sort("title-descending", [
          "Event Two",
          "Event Three",
          "Event One",
          "Event Four",
        ]);
        await check_sort("start-ascending", [
          "Event One",
          "Event Two",
          "Event Three",
          "Event Four",
        ]);

        items = doc.querySelectorAll(".calendar-ics-file-dialog-item-frame");

        // Import just the first item, and check that the correct number of items remains.
        let firstItemImportButton = items[0].querySelector(
          ".calendar-ics-file-dialog-item-import-button"
        );
        EventUtils.synthesizeMouseAtCenter(firstItemImportButton, { clickCount: 1 }, dialogWindow);

        await TestUtils.waitForCondition(() => {
          let remainingItems = doc.querySelectorAll(".calendar-ics-file-dialog-item-frame");
          return remainingItems.length == 3;
        }, "three items remain after importing the first item");
        check_displayed_titles(["Event Two", "Event Three", "Event Four"]);

        // Filter and import the shown items.
        await check_filter("four", ["Event Four"]);

        dialogElement.getButton("accept").click();
        ok(optionsPane.hidden);
        ok(!progressPane.hidden);
        ok(resultPane.hidden);

        await TestUtils.waitForCondition(() => !optionsPane.hidden);
        ok(progressPane.hidden);
        ok(resultPane.hidden);

        is(filterInput.value, "");
        check_displayed_titles(["Event Two", "Event Three"]);

        // Click the accept button to import the remaining items.
        dialogElement.getButton("accept").click();
        ok(optionsPane.hidden);
        ok(!progressPane.hidden);
        ok(resultPane.hidden);

        await TestUtils.waitForCondition(() => !resultPane.hidden);
        ok(optionsPane.hidden);
        ok(progressPane.hidden);

        let messageElement = doc.querySelector("#calendar-ics-file-dialog-result-message");
        is(messageElement.textContent, "Import complete.", "import success message appeared");

        dialogElement.getButton("accept").click();
      },
    }
  );

  await loadEventsFromFile();
  await dialogWindowPromise;

  // Check that the items were actually successfully imported.
  let result = await calendar.getItemsAsArray(
    Ci.calICalendar.ITEM_FILTER_ALL_ITEMS,
    0,
    cal.createDateTime("20190101T000000"),
    cal.createDateTime("20190102T000000")
  );
  is(result.length, 4, "all items that were imported were in fact imported");

  await CalendarTestUtils.monthView.waitForItemAt(window, 1, 3, 4);

  for (let item of result) {
    await calendar.deleteItem(item);
  }
});
