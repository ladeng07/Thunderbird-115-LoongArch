/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");

var { CalendarTestUtils } = ChromeUtils.import(
  "resource://testing-common/calendar/CalendarTestUtils.jsm"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  CalAlarm: "resource:///modules/CalAlarm.jsm",
  CalAttachment: "resource:///modules/CalAttachment.jsm",
  CalAttendee: "resource:///modules/CalAttendee.jsm",
  CalEvent: "resource:///modules/CalEvent.jsm",
  CalTodo: "resource:///modules/CalTodo.jsm",
});

function run_test() {
  do_calendar_startup(really_run_test);
}

function really_run_test() {
  test_aclmanager();
  test_calendar();
  test_immutable();
  test_attendee();
  test_attachment();
  test_lastack();
  test_categories();
  test_alarm();
  test_isEvent();
  test_isTodo();
  test_recurring_event_properties();
  test_recurring_todo_properties();
  test_recurring_event_exception_properties();
  test_recurring_todo_exception_properties();
}

function test_aclmanager() {
  let mockCalendar = {
    QueryInterface: ChromeUtils.generateQI(["calICalendar"]),

    get superCalendar() {
      return this;
    },
    get aclManager() {
      return this;
    },

    getItemEntry(item) {
      if (item.id == "withentry") {
        return itemEntry;
      }
      return null;
    },
  };

  let itemEntry = {
    QueryInterface: ChromeUtils.generateQI(["calIItemACLEntry"]),
    userCanModify: true,
    userCanRespond: false,
    userCanViewAll: true,
    userCanViewDateAndTime: false,
  };

  let event = new CalEvent();
  event.id = "withentry";
  event.calendar = mockCalendar;

  equal(event.aclEntry.userCanModify, itemEntry.userCanModify);
  equal(event.aclEntry.userCanRespond, itemEntry.userCanRespond);
  equal(event.aclEntry.userCanViewAll, itemEntry.userCanViewAll);
  equal(event.aclEntry.userCanViewDateAndTime, itemEntry.userCanViewDateAndTime);

  let parentEntry = new CalEvent();
  parentEntry.id = "parententry";
  parentEntry.calendar = mockCalendar;
  parentEntry.parentItem = event;

  equal(parentEntry.aclEntry.userCanModify, itemEntry.userCanModify);
  equal(parentEntry.aclEntry.userCanRespond, itemEntry.userCanRespond);
  equal(parentEntry.aclEntry.userCanViewAll, itemEntry.userCanViewAll);
  equal(parentEntry.aclEntry.userCanViewDateAndTime, itemEntry.userCanViewDateAndTime);

  event = new CalEvent();
  event.id = "noentry";
  event.calendar = mockCalendar;
  equal(event.aclEntry, null);
}

function test_calendar() {
  let event = new CalEvent();
  let parentEntry = new CalEvent();

  let mockCalendar = {
    QueryInterface: ChromeUtils.generateQI(["calICalendar"]),
    id: "one",
  };

  parentEntry.calendar = mockCalendar;
  event.parentItem = parentEntry;

  notEqual(event.calendar, null);
  equal(event.calendar.id, "one");
}

function test_attachment() {
  let e = new CalEvent();

  let a = new CalAttachment();
  a.rawData = "horst";

  let b = new CalAttachment();
  b.rawData = "bruno";

  e.addAttachment(a);
  equal(e.getAttachments().length, 1);

  e.addAttachment(b);
  equal(e.getAttachments().length, 2);

  e.removeAttachment(a);
  equal(e.getAttachments().length, 1);

  e.removeAllAttachments();
  equal(e.getAttachments().length, 0);
}

function test_attendee() {
  let e = new CalEvent();
  equal(e.getAttendeeById("unknown"), null);
  equal(e.getAttendees().length, 0);

  let a = new CalAttendee();
  a.id = "mailto:horst";

  let b = new CalAttendee();
  b.id = "mailto:bruno";

  e.addAttendee(a);
  equal(e.getAttendees().length, 1);
  equal(e.getAttendeeById("mailto:horst"), a);

  e.addAttendee(b);
  equal(e.getAttendees().length, 2);

  let comp = e.icalComponent;
  let aprop = comp.getFirstProperty("ATTENDEE");
  equal(aprop.value, "mailto:horst");
  aprop = comp.getNextProperty("ATTENDEE");
  equal(aprop.value, "mailto:bruno");
  equal(comp.getNextProperty("ATTENDEE"), null);

  e.removeAttendee(a);
  equal(e.getAttendees().length, 1);
  equal(e.getAttendeeById("mailto:horst"), null);

  e.removeAllAttendees();
  equal(e.getAttendees().length, 0);
}

function test_categories() {
  let e = new CalEvent();

  equal(e.getCategories().length, 0);

  let cat = ["a", "b", "c"];
  e.setCategories(cat);

  cat[0] = "err";
  equal(e.getCategories().join(","), "a,b,c");

  let comp = e.icalComponent;
  let getter = comp.getFirstProperty.bind(comp);

  cat[0] = "a";
  while (cat.length) {
    equal(cat.shift(), getter("CATEGORIES").value);
    getter = comp.getNextProperty.bind(comp);
  }
}

function test_alarm() {
  let e = new CalEvent();
  let alarm = new CalAlarm();

  alarm.action = "DISPLAY";
  alarm.related = Ci.calIAlarm.ALARM_RELATED_ABSOLUTE;
  alarm.alarmDate = cal.createDateTime();

  e.addAlarm(alarm);
  let ecomp = e.icalComponent;
  let vcomp = ecomp.getFirstSubcomponent("VALARM");
  equal(vcomp.serializeToICS(), alarm.icalString);

  let alarm2 = alarm.clone();

  e.addAlarm(alarm2);

  equal(e.getAlarms().length, 2);
  e.deleteAlarm(alarm);
  equal(e.getAlarms().length, 1);
  equal(e.getAlarms()[0], alarm2);

  e.clearAlarms();
  equal(e.getAlarms().length, 0);
}

function test_immutable() {
  let event = new CalEvent();

  let date = cal.createDateTime();
  date.timezone = cal.timezoneService.getTimezone("Europe/Berlin");
  event.alarmLastAck = date;

  let org = new CalAttendee();
  org.id = "one";
  event.organizer = org;

  let alarm = new CalAlarm();
  alarm.action = "DISPLAY";
  alarm.description = "foo";
  alarm.related = Ci.calIAlarm.ALARM_RELATED_START;
  alarm.offset = cal.createDuration("PT1S");
  event.addAlarm(alarm);

  event.setProperty("X-NAME", "X-VALUE");
  event.setPropertyParameter("X-NAME", "X-PARAM", "X-PARAMVAL");

  event.setCategories(["a", "b", "c"]);

  equal(event.alarmLastAck.timezone.tzid, cal.dtz.UTC.tzid);

  event.makeImmutable();

  // call again, should not throw
  event.makeImmutable();

  ok(!event.alarmLastAck.isMutable);
  ok(!org.isMutable);
  ok(!alarm.isMutable);

  throws(() => {
    event.alarmLastAck = cal.createDateTime();
  }, /Can not modify immutable data container/);
  throws(() => {
    event.calendar = null;
  }, /Can not modify immutable data container/);
  throws(() => {
    event.parentItem = null;
  }, /Can not modify immutable data container/);
  throws(() => {
    event.setCategories(["d", "e", "f"]);
  }, /Can not modify immutable data container/);

  let event2 = event.clone();
  event2.organizer.id = "two";

  equal(org.id, "one");
  equal(event2.organizer.id, "two");

  equal(event2.getProperty("X-NAME"), "X-VALUE");
  equal(event2.getPropertyParameter("X-NAME", "X-PARAM"), "X-PARAMVAL");

  event2.setPropertyParameter("X-NAME", "X-PARAM", null);
  equal(event2.getPropertyParameter("X-NAME", "X-PARAM"), null);

  // TODO more clone checks
}

function test_lastack() {
  let e = new CalEvent();

  e.alarmLastAck = cal.createDateTime("20120101T010101");

  // Our items don't support this yet
  //  equal(e.getProperty("X-MOZ-LASTACK"), "20120101T010101");

  let comp = e.icalComponent;
  let prop = comp.getFirstProperty("X-MOZ-LASTACK");

  equal(prop.value, "20120101T010101Z");

  prop.value = "20120101T010102Z";

  e.icalComponent = comp;

  equal(e.alarmLastAck.icalString, "20120101T010102Z");
}

/**
 * Test isEvent() returns the correct value for events and todos.
 */
function test_isEvent() {
  let event = new CalEvent();
  let todo = new CalTodo();

  Assert.ok(event.isEvent(), "isEvent() returns true for events");
  Assert.ok(!todo.isEvent(), "isEvent() returns false for todos");
}

/**
 * Test isTodo() returns the correct value for events and todos.
 */
function test_isTodo() {
  let todo = new CalTodo();
  let event = new CalEvent();

  Assert.ok(todo.isTodo(), "isTodo() returns true for todos");
  Assert.ok(!event.isTodo(), "isTodo() returns false for events");
}

/**
 * Function for testing that the "properties" property of each supplied
 * calItemBase occurrence includes those inherited from the parent.
 *
 * @param {calItemBase[]} items - A list of item occurrences to test.
 * @param {calItemBase} parent - The item to use as the parent.
 * @param {object} [overrides] - A set of key value pairs than can be passed
 *                                 to indicate what to expect for some properties.
 */
function doPropertiesTest(items, parent, overrides = {}) {
  let skippedProps = ["DTSTART", "DTEND"];
  let toString = value =>
    value && value instanceof Ci.calIDateTime ? value.icalString : value && value.toString();

  for (let item of items) {
    info(`Testing occurrence with recurrenceId="${item.recurrenceId.icalString}...`);

    let parentProperties = new Map(parent.properties);
    let itemProperties = new Map(item.properties);
    for (let [name, value] of parentProperties.entries()) {
      if (!skippedProps.includes(name)) {
        if (overrides[name]) {
          Assert.equal(
            toString(itemProperties.get(name)),
            toString(overrides[name]),
            `"${name}" value is value expected by overrides`
          );
        } else {
          Assert.equal(
            toString(itemProperties.get(name)),
            toString(value),
            `"${name}" value is same as parent`
          );
        }
      }
    }
  }
}

/**
 * Test the "properties" property of a recurring CalEvent inherits parent
 * properties properly.
 */
function test_recurring_event_properties() {
  let event = new CalEvent(CalendarTestUtils.dedent`
      BEGIN:VEVENT
      DTSTAMP:20210716T000000Z
      UID:c1a6cfe7-7fbb-4bfb-a00d-861e07c649a5
      SUMMARY:Parent Event
      CATEGORIES:Business
      LOCATION: Mochitest
      DTSTART:20210716T000000Z
      DTEND:20210716T110000Z
      RRULE:FREQ=DAILY;UNTIL=20210719T110000Z
      DESCRIPTION:This is the main event.
      END:VEVENT
    `);
  let occurrences = event.recurrenceInfo.getOccurrences(
    cal.createDateTime("20210701"),
    cal.createDateTime("20210731"),
    Infinity
  );
  doPropertiesTest(occurrences, event.parentItem);
}

/**
 * Test the "properties" property of a recurring CalEvent exception inherits
 * parent properties properly.
 */
function test_recurring_event_exception_properties() {
  let event = new CalEvent(CalendarTestUtils.dedent`
      BEGIN:VEVENT
      DTSTAMP:20210716T000000Z
      UID:c1a6cfe7-7fbb-4bfb-a00d-861e07c649a5
      SUMMARY:Parent Event
      CATEGORIES:Business
      LOCATION: Mochitest
      DTSTART:20210716T000000Z
      DTEND:20210716T110000Z
      RRULE:FREQ=DAILY;UNTIL=20210719T110000Z
      DESCRIPTION:This is the main event.
      END:VEVENT
    `);
  let occurrences = event.recurrenceInfo.getOccurrences(
    cal.createDateTime("20210701"),
    cal.createDateTime("20210731"),
    Infinity
  );
  let target = occurrences[0].clone();
  let newDescription = "This is an exception.";
  target.setProperty("DESCRIPTION", newDescription);
  event.parentItem.recurrenceInfo.modifyException(target);
  target = event.parentItem.recurrenceInfo.getExceptionFor(target.recurrenceId);
  Assert.ok(target);
  doPropertiesTest([target], event.parentItem, { DESCRIPTION: newDescription });
}

/**
 * Test the "properties" property of a recurring CalTodo inherits parent
 * properties properly.
 */
function test_recurring_todo_properties() {
  let task = new CalTodo(CalendarTestUtils.dedent`
      BEGIN:VTODO
      DTSTAMP:20210716T225440Z
      UID:673e125d-fe6b-465d-8a38-9c9373ca9705
      SUMMARY:Main Task
      RRULE:FREQ=DAILY;UNTIL=20210719T230000Z
      DTSTART;TZID=America/Port_of_Spain:20210716T190000
      PERCENT-COMPLETE:0
      LOCATION:Mochitest
      DESCRIPTION:This is the main task.
      END:VTODO
    `);
  let occurrences = task.recurrenceInfo.getOccurrences(
    cal.createDateTime("20210701"),
    cal.createDateTime("20210731"),
    Infinity
  );
  doPropertiesTest(occurrences, task.parentItem);
}

/**
 * Test the "properties" property of a recurring CalTodo exception inherits
 * parent properties properly.
 */
function test_recurring_todo_exception_properties() {
  let task = new CalTodo(CalendarTestUtils.dedent`
      BEGIN:VTODO
      DTSTAMP:20210716T225440Z
      UID:673e125d-fe6b-465d-8a38-9c9373ca9705
      SUMMARY:Main Task
      RRULE:FREQ=DAILY;UNTIL=20210719T230000Z
      DTSTART;TZID=America/Port_of_Spain:20210716T190000
      PERCENT-COMPLETE:0
      LOCATION:Mochitest
      DESCRIPTION:This is the main task.
      END:VTODO
    `);
  let occurrences = task.recurrenceInfo.getOccurrences(
    cal.createDateTime("20210701"),
    cal.createDateTime("20210731"),
    Infinity
  );
  let target = occurrences[0].clone();
  let newDescription = "This is an exception.";
  target.setProperty("DESCRIPTION", newDescription);
  task.parentItem.recurrenceInfo.modifyException(target);
  target = task.parentItem.recurrenceInfo.getExceptionFor(target.recurrenceId);
  Assert.ok(target);
  doPropertiesTest([target], task.parentItem, { DESCRIPTION: newDescription });
}
