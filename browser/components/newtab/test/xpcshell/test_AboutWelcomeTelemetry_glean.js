/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { AboutWelcomeTelemetry } = ChromeUtils.import(
  "resource://activity-stream/aboutwelcome/lib/AboutWelcomeTelemetry.jsm"
);
const TELEMETRY_PREF = "browser.newtabpage.activity-stream.telemetry";

add_setup(function setup() {
  do_get_profile();
  Services.fog.initializeFOG();
});

// We recognize two kinds of unexpected data that might reach
// `submitGleanPingForPing`: unknown keys, and keys with unexpectedly-complex
// data (ie, non-scalar).
// We report the keys in special metrics to aid in system health monitoring.
add_task(function test_weird_data() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();

  const unknownKey = "some_unknown_key";
  const camelUnknownKey = AWTelemetry._snakeToCamelCase(unknownKey);

  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.unknownKeys[camelUnknownKey].testGetValue(),
      1,
      "caught the unknown key"
    );
    // TODO(bug 1600008): Also check the for-testing overall count.
    Assert.equal(Glean.messagingSystem.unknownKeyCount.testGetValue(), 1);
  });
  AWTelemetry.submitGleanPingForPing({
    [unknownKey]: "value doesn't matter",
  });

  Assert.ok(pingSubmitted, "Ping with unknown keys was submitted");

  const invalidNestedDataKey = "event";
  pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.invalidNestedData[
        invalidNestedDataKey
      ].testGetValue("messaging-system"),
      1,
      "caught the invalid nested data"
    );
  });
  AWTelemetry.submitGleanPingForPing({
    [invalidNestedDataKey]: { this_should: "not be", complex: "data" },
  });

  Assert.ok(pingSubmitted, "Ping with invalid nested data submitted");
});

// `event_context` is weird. It's an object, but it might have been stringified
// before being provided for recording.
add_task(function test_event_context() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();

  const eventContext = {
    reason: "reason",
    page: "page",
    source: "source",
    something_else: "not specifically handled",
  };
  const stringifiedEC = JSON.stringify(eventContext);

  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.eventReason.testGetValue(),
      eventContext.reason,
      "event_context.reason also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventPage.testGetValue(),
      eventContext.page,
      "event_context.page also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventSource.testGetValue(),
      eventContext.source,
      "event_context.source also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventContext.testGetValue(),
      stringifiedEC,
      "whole event_context added as text."
    );
  });
  AWTelemetry.submitGleanPingForPing({
    event_context: eventContext,
  });
  Assert.ok(pingSubmitted, "Ping with object event_context submitted");

  pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.eventReason.testGetValue(),
      eventContext.reason,
      "event_context.reason also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventPage.testGetValue(),
      eventContext.page,
      "event_context.page also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventSource.testGetValue(),
      eventContext.source,
      "event_context.source also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventContext.testGetValue(),
      stringifiedEC,
      "whole event_context added as text."
    );
  });
  AWTelemetry.submitGleanPingForPing({
    event_context: stringifiedEC,
  });
  Assert.ok(pingSubmitted, "Ping with string event_context submitted");
});
