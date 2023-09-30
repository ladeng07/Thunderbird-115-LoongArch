/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { CalDAVServer } = ChromeUtils.import("resource://testing-common/calendar/CalDAVServer.jsm");

CalDAVServer.open("bob", "bob");
if (!Services.logins.findLogins(CalDAVServer.origin, null, "test").length) {
  // Save a username and password to the login manager.
  let loginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
  loginInfo.init(CalDAVServer.origin, null, "test", "bob", "bob", "", "");
  Services.logins.addLogin(loginInfo);
}

let calendar;
add_setup(async function () {
  calendarObserver._onLoadPromise = PromiseUtils.defer();
  calendar = createCalendar("caldav", CalDAVServer.url, false);
  await calendarObserver._onLoadPromise.promise;
  info("calendar set-up complete");

  registerCleanupFunction(async () => {
    await CalDAVServer.close();
    Services.logins.removeAllLogins();
    removeCalendar(calendar);
  });
});

async function promiseIdle() {
  await fetch(`${CalDAVServer.origin}/ping`);
}

add_task(async function testAlarms() {
  calendarObserver._batchRequired = true;
  await runTestAlarms(calendar);

  // Be sure the calendar has finished deleting the event.
  await promiseIdle();
});

add_task(async function testSyncChanges() {
  await syncChangesTest.setUp();

  await CalDAVServer.putItemInternal(
    "ad0850e5-8020-4599-86a4-86c90af4e2cd.ics",
    syncChangesTest.part1Item
  );
  await syncChangesTest.runPart1();

  await CalDAVServer.putItemInternal(
    "ad0850e5-8020-4599-86a4-86c90af4e2cd.ics",
    syncChangesTest.part2Item
  );
  await syncChangesTest.runPart2();

  CalDAVServer.deleteItemInternal("ad0850e5-8020-4599-86a4-86c90af4e2cd.ics");
  await syncChangesTest.runPart3();

  // Be sure the calendar has finished all requests.
  await promiseIdle();
});
