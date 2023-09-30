/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { formatter } = cal.dtz;

const { CalTimezone } = ChromeUtils.import("resource:///modules/CalTimezone.jsm");
const { ICAL } = ChromeUtils.import("resource:///modules/calendar/Ical.jsm");

function run_test() {
  do_calendar_startup(run_next_test);
}

// This test assumes the timezone of your system is not set to Pacific/Fakaofo or equivalent.

// Time format is platform dependent, so we use alternative result sets here in 'expected'.
// The first two meet configurations running for automated tests,
// the first one is for Windows, the second one for Linux and Mac, unless otherwise noted.
// If you get a failure for this test, add your pattern here.

add_task(async function formatDate_test() {
  let data = [
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Fakaofo",
        dateformat: 0, // long
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Fakaofo",
        dateformat: 1, // short
      },
      expected: ["4/1/2017", "4/1/17"],
    },
  ];

  let dateformat = Services.prefs.getIntPref("calendar.date.format", 0);
  let tzlocal = Services.prefs.getStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  Services.prefs.setStringPref("calendar.timezone.local", "Pacific/Fakaofo");

  let i = 0;
  for (let test of data) {
    i++;
    Services.prefs.setIntPref("calendar.date.format", test.input.dateformat);
    let zone =
      test.input.timezone == "floating"
        ? cal.dtz.floating
        : cal.timezoneService.getTimezone(test.input.timezone);
    let date = cal.createDateTime(test.input.datetime).getInTimezone(zone);

    let formatted = formatter.formatDate(date);
    ok(
      test.expected.includes(formatted),
      "(test #" + i + ": result '" + formatted + "', expected '" + test.expected + "')"
    );
  }
  // let's reset the preferences
  Services.prefs.setStringPref("calendar.timezone.local", tzlocal);
  Services.prefs.setIntPref("calendar.date.format", dateformat);
});

add_task(async function formatDateShort_test() {
  let data = [
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Fakaofo",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Kiritimati",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "UTC",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "floating",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Fakaofo",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Kiritimati",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "UTC",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "floating",
      },
      expected: ["4/1/2017", "4/1/17"],
    },
  ];

  let dateformat = Services.prefs.getIntPref("calendar.date.format", 0);
  let tzlocal = Services.prefs.getStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  Services.prefs.setStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  // we make sure to have set long format
  Services.prefs.setIntPref("calendar.date.format", 0);

  let i = 0;
  for (let test of data) {
    i++;

    let zone =
      test.input.timezone == "floating"
        ? cal.dtz.floating
        : cal.timezoneService.getTimezone(test.input.timezone);
    let date = cal.createDateTime(test.input.datetime).getInTimezone(zone);

    let formatted = formatter.formatDateShort(date);
    ok(
      test.expected.includes(formatted),
      "(test #" + i + ": result '" + formatted + "', expected '" + test.expected + "')"
    );
  }
  // let's reset the preferences
  Services.prefs.setStringPref("calendar.timezone.local", tzlocal);
  Services.prefs.setIntPref("calendar.date.format", dateformat);
});

add_task(async function formatDateLong_test() {
  let data = [
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Fakaofo",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Kiritimati",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "UTC",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "floating",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Fakaofo",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Kiritimati",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "UTC",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "floating",
      },
      expected: ["Saturday, April 01, 2017", "Saturday, April 1, 2017"],
    },
  ];

  let dateformat = Services.prefs.getIntPref("calendar.date.format", 0);
  let tzlocal = Services.prefs.getStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  Services.prefs.setStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  // we make sure to have set short format
  Services.prefs.setIntPref("calendar.date.format", 1);

  let i = 0;
  for (let test of data) {
    i++;

    let zone =
      test.input.timezone == "floating"
        ? cal.dtz.floating
        : cal.timezoneService.getTimezone(test.input.timezone);
    let date = cal.createDateTime(test.input.datetime).getInTimezone(zone);

    let formatted = formatter.formatDateLong(date);
    ok(
      test.expected.includes(formatted),
      "(test #" + i + ": result '" + formatted + "', expected '" + test.expected + "')"
    );
  }
  // let's reset the preferences
  Services.prefs.setStringPref("calendar.timezone.local", tzlocal);
  Services.prefs.setIntPref("calendar.date.format", dateformat);
});

add_task(async function formatDateWithoutYear_test() {
  let data = [
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Fakaofo",
      },
      expected: "Apr 1",
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Kiritimati",
      },
      expected: "Apr 1",
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "UTC",
      },
      expected: "Apr 1",
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "floating",
      },
      expected: "Apr 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Fakaofo",
      },
      expected: "Apr 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Kiritimati",
      },
      expected: "Apr 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "UTC",
      },
      expected: "Apr 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "floating",
      },
      expected: "Apr 1",
    },
  ];

  let dateformat = Services.prefs.getIntPref("calendar.date.format", 0);
  let tzlocal = Services.prefs.getStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  Services.prefs.setStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  // we make sure to have set short format
  Services.prefs.setIntPref("calendar.date.format", 1);

  let i = 0;
  for (let test of data) {
    i++;

    let zone =
      test.input.timezone == "floating"
        ? cal.dtz.floating
        : cal.timezoneService.getTimezone(test.input.timezone);
    let date = cal.createDateTime(test.input.datetime).getInTimezone(zone);

    equal(formatter.formatDateWithoutYear(date), test.expected, "(test #" + i + ")");
  }
  // let's reset the preferences
  Services.prefs.setStringPref("calendar.timezone.local", tzlocal);
  Services.prefs.setIntPref("calendar.date.format", dateformat);
});

add_task(async function formatDateLongWithoutYear_test() {
  let data = [
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Fakaofo",
      },
      expected: "Saturday, April 1",
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "Pacific/Kiritimati",
      },
      expected: "Saturday, April 1",
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "UTC",
      },
      expected: "Saturday, April 1",
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "floating",
      },
      expected: "Saturday, April 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Fakaofo",
      },
      expected: "Saturday, April 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Kiritimati",
      },
      expected: "Saturday, April 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "UTC",
      },
      expected: "Saturday, April 1",
    },
    {
      input: {
        datetime: "20170401",
        timezone: "floating",
      },
      expected: "Saturday, April 1",
    },
  ];

  let dateformat = Services.prefs.getIntPref("calendar.date.format", 0);
  let tzlocal = Services.prefs.getStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  Services.prefs.setStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  // we make sure to have set short format
  Services.prefs.setIntPref("calendar.date.format", 1);

  let i = 0;
  for (let test of data) {
    i++;

    let zone =
      test.input.timezone == "floating"
        ? cal.dtz.floating
        : cal.timezoneService.getTimezone(test.input.timezone);
    let date = cal.createDateTime(test.input.datetime).getInTimezone(zone);

    equal(formatter.formatDateLongWithoutYear(date), test.expected, "(test #" + i + ")");
  }
  // let's reset the preferences
  Services.prefs.setStringPref("calendar.timezone.local", tzlocal);
  Services.prefs.setIntPref("calendar.date.format", dateformat);
});

add_task(async function formatTime_test() {
  let data = [
    {
      input: {
        datetime: "20170401T090000",
        timezone: "Pacific/Fakaofo",
      },
      expected: ["9:00 AM", "09:00"], // Windows+Mac, Linux.
    },
    {
      input: {
        datetime: "20170401T090000",
        timezone: "Pacific/Kiritimati",
      },
      expected: ["9:00 AM", "09:00"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "UTC",
      },
      expected: ["6:00 PM", "18:00"],
    },
    {
      input: {
        datetime: "20170401T180000",
        timezone: "floating",
      },
      expected: ["6:00 PM", "18:00"],
    },
    {
      input: {
        datetime: "20170401",
        timezone: "Pacific/Fakaofo",
      },
      expected: "All Day",
    },
  ];

  let tzlocal = Services.prefs.getStringPref("calendar.timezone.local", "Pacific/Fakaofo");
  Services.prefs.setStringPref("calendar.timezone.local", "Pacific/Fakaofo");

  let i = 0;
  for (let test of data) {
    i++;

    let zone =
      test.input.timezone == "floating"
        ? cal.dtz.floating
        : cal.timezoneService.getTimezone(test.input.timezone);
    let date = cal.createDateTime(test.input.datetime).getInTimezone(zone);

    let formatted = formatter.formatTime(date);
    ok(
      test.expected.includes(formatted),
      "(test #" + i + ": result '" + formatted + "', expected '" + test.expected + "')"
    );
  }
  // let's reset the preferences
  Services.prefs.setStringPref("calendar.timezone.local", tzlocal);
});

add_task(function formatTime_test_with_arbitrary_timezone() {
  // Create a timezone with an arbitrary offset and a time zone ID we can be
  // reasonably sure Gecko won't recognize so we can be sure that we aren't
  // relying on the time zone ID to be valid.
  const tzdef =
    "BEGIN:VTIMEZONE\n" +
    "TZID:Nowhere/Middle\n" +
    "BEGIN:STANDARD\n" +
    "DTSTART:16010101T000000\n" +
    "TZOFFSETFROM:-0741\n" +
    "TZOFFSETTO:-0741\n" +
    "END:STANDARD\n" +
    "END:VTIMEZONE";

  const timezone = new CalTimezone(
    ICAL.Timezone.fromData({
      tzid: "Nowhere/Middle",
      component: tzdef,
    })
  );

  const expected = ["6:19 AM", "06:19"];

  const dateTime = cal.createDateTime("20220916T140000Z").getInTimezone(timezone);
  const formatted = formatter.formatTime(dateTime);

  ok(expected.includes(formatted), `expected '${expected}', actual result ${formatted}`);
});

add_task(async function formatInterval_test() {
  let data = [
    //1: task-without-dates
    {
      input: {},
      expected: "no start or due date",
    },
    //2: task-without-due-date
    {
      input: { start: "20220916T140000Z" },
      expected: [
        "start date Friday, September 16, 2022 2:00 PM",
        "start date Friday, September 16, 2022 14:00",
      ],
    },
    //3: task-without-start-date
    {
      input: { end: "20220916T140000Z" },
      expected: [
        "due date Friday, September 16, 2022 2:00 PM",
        "due date Friday, September 16, 2022 14:00",
      ],
    },
    //4: all-day
    {
      input: {
        start: "20220916T140000Z",
        end: "20220916T140000Z",
        allDay: true,
      },
      expected: "Friday, September 16, 2022",
    },
    //5: all-day-between-years
    {
      input: {
        start: "20220916T140000Z",
        end: "20230916T140000Z",
        allDay: true,
      },
      expected: "September 16, 2022 – September 16, 2023",
    },
    //6: all-day-in-month
    {
      input: {
        start: "20220916T140000Z",
        end: "20220920T140000Z",
        allDay: true,
      },
      expected: "September 16 – 20, 2022",
    },
    //7: all-day-between-months
    {
      input: {
        start: "20220916T140000Z",
        end: "20221020T140000Z",
        allDay: true,
      },
      expected: "September 16 – October 20, 2022",
    },
    //8: same-date-time
    {
      input: {
        start: "20220916T140000Z",
        end: "20220916T140000Z",
      },
      expected: ["Friday, September 16, 2022 2:00 PM", "Friday, September 16, 2022 14:00"],
    },
    //9: same-day
    {
      input: {
        start: "20220916T140000Z",
        end: "20220916T160000Z",
      },
      expected: [
        "Friday, September 16, 2022 2:00 PM – 4:00 PM",
        "Friday, September 16, 2022 14:00 – 16:00",
      ],
    },
    //10: several-days
    {
      input: {
        start: "20220916T140000Z",
        end: "20220920T160000Z",
      },
      expected: [
        "Friday, September 16, 2022 2:00 PM – Tuesday, September 20, 2022 4:00 PM",
        "Friday, September 16, 2022 14:00 – Tuesday, September 20, 2022 16:00",
      ],
    },
  ];

  let i = 0;
  for (let test of data) {
    i++;
    let startDate = test.input.start ? cal.createDateTime(test.input.start) : null;
    let endDate = test.input.end ? cal.createDateTime(test.input.end) : null;

    if (test.input.allDay) {
      startDate.isDate = true;
    }

    let formatted = formatter.formatInterval(startDate, endDate);
    ok(
      test.expected.includes(formatted),
      "(test #" + i + ": result '" + formatted + "', expected '" + test.expected + "')"
    );
  }
});
