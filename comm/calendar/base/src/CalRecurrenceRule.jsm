/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["CalRecurrenceRule"];

const { ICAL, unwrapSetter, unwrapSingle, wrapGetter } = ChromeUtils.import(
  "resource:///modules/calendar/Ical.jsm"
);
const { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

const lazy = {};
ChromeUtils.defineModuleGetter(lazy, "CalDateTime", "resource:///modules/CalDateTime.jsm");
ChromeUtils.defineModuleGetter(lazy, "CalIcalProperty", "resource:///modules/CalICSService.jsm");

function CalRecurrenceRule(innerObject) {
  this.innerObject = innerObject || new ICAL.Recur();
  this.wrappedJSObject = this;
}

var calRecurrenceRuleInterfaces = [Ci.calIRecurrenceRule, Ci.calIRecurrenceItem];
var calRecurrenceRuleClassID = Components.ID("{df19281a-5389-4146-b941-798cb93a7f0d}");
CalRecurrenceRule.prototype = {
  QueryInterface: cal.generateQI(["calIRecurrenceRule", "calIRecurrenceItem"]),
  classID: calRecurrenceRuleClassID,
  classInfo: cal.generateCI({
    contractID: "@mozilla.org/calendar/recurrence-rule;1",
    classDescription: "Calendar Recurrence Rule",
    classID: calRecurrenceRuleClassID,
    interfaces: calRecurrenceRuleInterfaces,
  }),

  innerObject: null,

  isMutable: true,
  makeImmutable() {
    this.isMutable = false;
  },
  ensureMutable() {
    if (!this.isMutable) {
      throw Components.Exception("", Cr.NS_ERROR_OBJECT_IS_IMMUTABLE);
    }
  },
  clone() {
    return new CalRecurrenceRule(new ICAL.Recur(this.innerObject));
  },

  isNegative: false, // We don't support EXRULE anymore
  get isFinite() {
    return this.innerObject.isFinite();
  },

  /**
   * Tests whether the "FREQ" value for this rule is supported or not. A warning
   * is logged if an unsupported value ("SECONDLY"|"MINUTELY") is encountered.
   *
   * @returns {boolean}
   */
  freqSupported() {
    let { freq } = this.innerObject;
    if (freq == "SECONDLY" || freq == "MINUTELY") {
      cal.WARN(
        `The frequency value "${freq}" is currently not supported. No occurrences will be generated.`
      );
      return false;
    }
    return true;
  },

  getNextOccurrence(aStartTime, aRecId) {
    if (!this.freqSupported()) {
      return null;
    }
    aStartTime = unwrapSingle(ICAL.Time, aStartTime);
    aRecId = unwrapSingle(ICAL.Time, aRecId);
    return wrapGetter(lazy.CalDateTime, this.innerObject.getNextOccurrence(aStartTime, aRecId));
  },

  getOccurrences(aStartTime, aRangeStart, aRangeEnd, aMaxCount) {
    if (!this.freqSupported()) {
      return [];
    }
    aStartTime = unwrapSingle(ICAL.Time, aStartTime);
    aRangeStart = unwrapSingle(ICAL.Time, aRangeStart);
    aRangeEnd = unwrapSingle(ICAL.Time, aRangeEnd);

    if (!aMaxCount && !aRangeEnd && this.count == 0 && this.until == null) {
      throw Components.Exception("", Cr.NS_ERROR_INVALID_ARG);
    }

    let occurrences = [];
    let rangeStart = aRangeStart.clone();
    rangeStart.isDate = false;

    let dtend = null;

    if (aRangeEnd) {
      dtend = aRangeEnd.clone();
      dtend.isDate = false;

      // If the start of the recurrence is past the end, we have no dates
      if (aStartTime.compare(dtend) >= 0) {
        return [];
      }
    }

    let iter = this.innerObject.iterator(aStartTime);

    for (let next = iter.next(); next; next = iter.next()) {
      let dtNext = next.clone();
      dtNext.isDate = false;

      if (dtNext.compare(rangeStart) < 0) {
        continue;
      }

      if (dtend && dtNext.compare(dtend) >= 0) {
        break;
      }

      next = next.clone();

      if (aStartTime.zone) {
        next.zone = aStartTime.zone;
      }

      occurrences.push(new lazy.CalDateTime(next));

      if (aMaxCount && occurrences.length >= aMaxCount) {
        break;
      }
    }

    return occurrences;
  },

  get icalString() {
    return "RRULE:" + this.innerObject.toString() + ICAL.newLineChar;
  },
  set icalString(val) {
    this.ensureMutable();
    this.innerObject = ICAL.Recur.fromString(val.replace(/^RRULE:/i, ""));
  },

  get icalProperty() {
    let prop = new ICAL.Property("rrule");
    prop.setValue(this.innerObject);
    return new lazy.CalIcalProperty(prop);
  },
  set icalProperty(rawval) {
    this.ensureMutable();
    unwrapSetter(
      ICAL.Property,
      rawval,
      function (val) {
        this.innerObject = val.getFirstValue();
      },
      this
    );
  },

  get type() {
    return this.innerObject.freq;
  },
  set type(val) {
    this.ensureMutable();
    this.innerObject.freq = val;
  },

  get interval() {
    return this.innerObject.interval;
  },
  set interval(val) {
    this.ensureMutable();
    this.innerObject.interval = val;
  },

  get count() {
    if (!this.isByCount) {
      throw Components.Exception("", Cr.NS_ERROR_FAILURE);
    }
    return this.innerObject.count || -1;
  },
  set count(val) {
    this.ensureMutable();
    this.innerObject.count = val && val > 0 ? val : null;
  },

  get untilDate() {
    if (this.innerObject.until) {
      return new lazy.CalDateTime(this.innerObject.until);
    }
    return null;
  },
  set untilDate(rawval) {
    this.ensureMutable();
    unwrapSetter(
      ICAL.Time,
      rawval,
      function (val) {
        if (
          val.timezone != ICAL.Timezone.utcTimezone &&
          val.timezone != ICAL.Timezone.localTimezone
        ) {
          val = val.convertToZone(ICAL.Timezone.utcTimezone);
        }

        this.innerObject.until = val;
      },
      this
    );
  },

  get isByCount() {
    return this.innerObject.isByCount();
  },

  get weekStart() {
    return this.innerObject.wkst - 1;
  },
  set weekStart(val) {
    this.ensureMutable();
    this.innerObject.wkst = val + 1;
  },

  getComponent(aType) {
    let values = this.innerObject.getComponent(aType);
    if (aType == "BYDAY") {
      // BYDAY values are alphanumeric: SU, MO, TU, etc..
      for (let i = 0; i < values.length; i++) {
        let match = /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/.exec(values[i]);
        if (!match) {
          cal.ERROR("Malformed BYDAY rule\n" + cal.STACK(10));
          return [];
        }
        values[i] = ICAL.Recur.icalDayToNumericDay(match[3]);
        if (match[2]) {
          // match[2] is the week number for this value.
          values[i] += 8 * match[2];
        }
        if (match[1] == "-") {
          // Week numbers are counted back from the end of the period.
          values[i] *= -1;
        }
      }
    }

    return values;
  },

  setComponent(aType, aValues) {
    let values = aValues;
    if (aType == "BYDAY") {
      // BYDAY values are alphanumeric: SU, MO, TU, etc..
      for (let i = 0; i < values.length; i++) {
        let absValue = Math.abs(values[i]);
        if (absValue > 7) {
          let ordinal = Math.trunc(values[i] / 8);
          let day = ICAL.Recur.numericDayToIcalDay(absValue % 8);
          values[i] = ordinal + day;
        } else {
          values[i] = ICAL.Recur.numericDayToIcalDay(values[i]);
        }
      }
    }
    this.innerObject.setComponent(aType, values);
  },
};
