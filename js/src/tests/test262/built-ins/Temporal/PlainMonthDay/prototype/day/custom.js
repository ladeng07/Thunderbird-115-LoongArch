// |reftest| skip -- Temporal is not supported
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-get-temporal.plainmonthday.prototype.day
description: Custom calendar tests for day().
includes: [compareArray.js]
features: [Temporal]
---*/

let calls = 0;
class CustomCalendar extends Temporal.Calendar {
  constructor() {
    super("iso8601");
  }
  day(...args) {
    ++calls;
    assert.compareArray(args, [instance], "day arguments");
    return 7;
  }
}

const calendar = new CustomCalendar();
const instance = new Temporal.PlainMonthDay(8, 25, calendar);
const result = instance.day;
assert.sameValue(result, 7, "result");
assert.sameValue(calls, 1, "calls");

reportCompare(0, 0);
