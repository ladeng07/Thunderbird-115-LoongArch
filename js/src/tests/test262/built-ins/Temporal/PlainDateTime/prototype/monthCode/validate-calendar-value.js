// |reftest| skip -- Temporal is not supported
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-get-temporal.plaindatetime.prototype.monthcode
description: Validate result returned from calendar monthCode() method
features: [Temporal]
---*/

const badResults = [
  [undefined, TypeError],
  [Symbol("foo"), TypeError],
  [null, TypeError],
  [true, TypeError],
  [false, TypeError],
  [7.1, TypeError],
  [{toString() { return "M01"; }}, TypeError],
];

badResults.forEach(([result, error]) => {
  const calendar = new class extends Temporal.Calendar {
    monthCode() {
      return result;
    }
  }("iso8601");
  const instance = new Temporal.PlainDateTime(1981, 12, 15, 14, 15, 45, 987, 654, 321, calendar);
  assert.throws(error, () => instance.monthCode, `${typeof result} ${String(result)} not converted to string`);
});

reportCompare(0, 0);
