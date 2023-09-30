/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineESModuleGetters(this, {
  ADLINK_CHECK_TIMEOUT_MS:
    "resource:///actors/SearchSERPTelemetryChild.sys.mjs",
  AddonTestUtils: "resource://testing-common/AddonTestUtils.sys.mjs",
  CustomizableUITestUtils:
    "resource://testing-common/CustomizableUITestUtils.sys.mjs",
  FormHistory: "resource://gre/modules/FormHistory.sys.mjs",
  FormHistoryTestUtils:
    "resource://testing-common/FormHistoryTestUtils.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SearchTestUtils: "resource://testing-common/SearchTestUtils.sys.mjs",
  SearchUtils: "resource://gre/modules/SearchUtils.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  UrlbarSearchUtils: "resource:///modules/UrlbarSearchUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "UrlbarTestUtils", () => {
  const { UrlbarTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/UrlbarTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

let gCUITestUtils = new CustomizableUITestUtils(window);

AddonTestUtils.initMochitest(this);
SearchTestUtils.init(this);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recursively compare two objects and check that every property of expectedObj has the same value
 * on actualObj.
 *
 * @param {object} expectedObj
 *        The expected object to find.
 * @param {object} actualObj
 *        The object to inspect.
 * @param {string} name
 *        The name of the engine, used for test detail logging.
 */
function isSubObjectOf(expectedObj, actualObj, name) {
  for (let prop in expectedObj) {
    if (typeof expectedObj[prop] == "function") {
      continue;
    }
    if (expectedObj[prop] instanceof Object) {
      is(
        actualObj[prop].length,
        expectedObj[prop].length,
        name + "[" + prop + "]"
      );
      isSubObjectOf(
        expectedObj[prop],
        actualObj[prop],
        name + "[" + prop + "]"
      );
    } else {
      is(actualObj[prop], expectedObj[prop], name + "[" + prop + "]");
    }
  }
}

function getLocale() {
  return Services.locale.requestedLocale || undefined;
}

function promiseEvent(aTarget, aEventName, aPreventDefault) {
  function cancelEvent(event) {
    if (aPreventDefault) {
      event.preventDefault();
    }

    return true;
  }

  return BrowserTestUtils.waitForEvent(aTarget, aEventName, false, cancelEvent);
}

// Get an array of the one-off buttons.
function getOneOffs() {
  let oneOffs = [];
  let searchPopup = document.getElementById("PopupSearchAutoComplete");
  let oneOffsContainer = searchPopup.searchOneOffsContainer;
  let oneOff = oneOffsContainer.querySelector(".search-panel-one-offs");
  for (oneOff = oneOff.firstChild; oneOff; oneOff = oneOff.nextSibling) {
    if (oneOff.nodeType == Node.ELEMENT_NODE) {
      oneOffs.push(oneOff);
    }
  }
  return oneOffs;
}

async function typeInSearchField(browser, text, fieldName) {
  await SpecialPowers.spawn(
    browser,
    [[fieldName, text]],
    async function ([contentFieldName, contentText]) {
      // Put the focus on the search box.
      let searchInput = content.document.getElementById(contentFieldName);
      searchInput.focus();
      searchInput.value = contentText;
    }
  );
}

XPCOMUtils.defineLazyGetter(this, "searchCounts", () => {
  return Services.telemetry.getKeyedHistogramById("SEARCH_COUNTS");
});

XPCOMUtils.defineLazyGetter(this, "SEARCH_AD_CLICK_SCALARS", () => {
  const sources = [
    ...BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES.values(),
    "unknown",
  ];
  return [
    ...sources.map(v => `browser.search.withads.${v}`),
    ...sources.map(v => `browser.search.adclicks.${v}`),
  ];
});

// Ad links are processed after a small delay. We need to allow tests to wait
// for that before checking telemetry, otherwise the received values may be
// too small in some cases.
function promiseWaitForAdLinkCheck() {
  return new Promise(resolve =>
    /* eslint-disable-next-line mozilla/no-arbitrary-setTimeout */
    setTimeout(resolve, ADLINK_CHECK_TIMEOUT_MS)
  );
}

async function assertSearchSourcesTelemetry(
  expectedHistograms,
  expectedScalars
) {
  let histSnapshot = {};
  let scalars = {};

  // This used to rely on the implied 100ms initial timer of
  // TestUtils.waitForCondition. See bug 1515466.
  await new Promise(resolve => setTimeout(resolve, 100));

  await TestUtils.waitForCondition(() => {
    histSnapshot = searchCounts.snapshot();
    return (
      Object.getOwnPropertyNames(histSnapshot).length ==
      Object.getOwnPropertyNames(expectedHistograms).length
    );
  }, "should have the correct number of histograms");

  if (Object.entries(expectedScalars).length) {
    await TestUtils.waitForCondition(() => {
      scalars =
        Services.telemetry.getSnapshotForKeyedScalars("main", false).parent ||
        {};
      return Object.getOwnPropertyNames(expectedScalars).every(
        scalar => scalar in scalars
      );
    }, "should have the expected keyed scalars");
  }

  Assert.equal(
    Object.getOwnPropertyNames(histSnapshot).length,
    Object.getOwnPropertyNames(expectedHistograms).length,
    "Should only have one key"
  );

  for (let [key, value] of Object.entries(expectedHistograms)) {
    Assert.ok(
      key in histSnapshot,
      `Histogram should have the expected key: ${key}`
    );
    Assert.equal(
      histSnapshot[key].sum,
      value,
      `Should have counted the correct number of visits for ${key}`
    );
  }

  for (let [name, value] of Object.entries(expectedScalars)) {
    Assert.ok(name in scalars, `Scalar ${name} should have been added.`);
    Assert.deepEqual(
      scalars[name],
      value,
      `Should have counted the correct number of visits for ${name}`
    );
  }

  for (let name of SEARCH_AD_CLICK_SCALARS) {
    Assert.equal(
      name in scalars,
      name in expectedScalars,
      `Should have matched ${name} in scalars and expectedScalars`
    );
  }
}

async function searchInSearchbar(inputText, win = window) {
  await new Promise(r => waitForFocus(r, win));
  let sb = win.BrowserSearch.searchBar;
  // Write the search query in the searchbar.
  sb.focus();
  sb.value = inputText;
  sb.textbox.controller.startSearch(inputText);
  // Wait for the popup to show.
  await BrowserTestUtils.waitForEvent(sb.textbox.popup, "popupshown");
  // And then for the search to complete.
  await TestUtils.waitForCondition(
    () =>
      sb.textbox.controller.searchStatus >=
      Ci.nsIAutoCompleteController.STATUS_COMPLETE_NO_MATCH,
    "The search in the searchbar must complete."
  );
  return sb.textbox.popup;
}

function clearSearchbarHistory(win = window) {
  info("cleanup the search history");
  return FormHistory.update({ op: "remove", fieldname: "searchbar-history" });
}

function resetTelemetry() {
  searchCounts.clear();
  Services.telemetry.clearScalars();
  Services.fog.testResetFOG();
}

/**
 * First checks that we get the correct number of recorded Glean impression events
 * and the recorded Glean impression events have the correct keys and values.
 *
 * Then it checks that there are the the correct engagement events associated with the
 * impression events.
 *
 * @param {Array} expectedEvents The expected impression events whose keys and
 * values we use to validate the recorded Glean impression events.
 */
function assertImpressionEvents(expectedEvents) {
  // A single test might run assertImpressionEvents more than once
  // so the Set needs to be cleared or else the impression event
  // check will throw.
  const impressionIdsSet = new Set();

  let recordedImpressions = Glean.serp.impression.testGetValue() ?? [];

  Assert.equal(
    recordedImpressions.length,
    expectedEvents.length,
    "Should have the correct number of impressions."
  );

  // Assert the impression events.
  for (let [idx, expectedEvent] of expectedEvents.entries()) {
    let impressionId = recordedImpressions[idx].extra.impression_id;
    Assert.ok(
      UUID_REGEX.test(impressionId),
      "Should have an impression_id with a valid UUID."
    );

    Assert.ok(
      !impressionIdsSet.has(impressionId),
      "Should have a unique impression_id."
    );

    impressionIdsSet.add(impressionId);

    // If we want to use deepEqual checks, we have to add the impressionId
    // to each impression since they are randomly generated at runtime.
    expectedEvent.impression.impression_id = impressionId;

    Assert.deepEqual(
      recordedImpressions[idx].extra,
      expectedEvent.impression,
      "Should have matched impression values."
    );

    // Once the impression check is sufficient, add the impression_id to
    // each of the expected engagements for later deep equal checks.
    if (expectedEvent.engagements) {
      for (let expectedEngagment of expectedEvent.engagements) {
        expectedEngagment.impression_id = impressionId;
      }
    }
  }

  // Group engagement events into separate array fetchable by their
  // impression_id.
  let recordedEngagements = Glean.serp.engagement.testGetValue() ?? [];
  let idToEngagements = new Map();
  let totalExpectedEngagements = 0;

  for (let recordedEngagement of recordedEngagements) {
    let impressionId = recordedEngagement.extra.impression_id;
    Assert.ok(
      impressionId,
      "Should have an engagement event with an impression_id"
    );

    let arr = idToEngagements.get(impressionId) ?? [];
    arr.push(recordedEngagement.extra);

    idToEngagements.set(impressionId, arr);
  }

  // Assert the engagement events.
  for (let expectedEvent of expectedEvents) {
    let impressionId = expectedEvent.impression.impression_id;
    let expectedEngagements = expectedEvent.engagements;
    if (expectedEngagements) {
      let recorded = idToEngagements.get(impressionId);
      Assert.deepEqual(
        recorded,
        expectedEngagements,
        "Should have matched engagement values."
      );
      totalExpectedEngagements += expectedEngagements.length;
    }
  }

  Assert.equal(
    recordedEngagements.length,
    totalExpectedEngagements,
    "Should have equal number of engagements."
  );
}

function assertAdImpressionEvents(expectedAdImpressions) {
  let adImpressions = Glean.serp.adImpression.testGetValue() ?? [];
  let impressions = Glean.serp.impression.testGetValue() ?? [];

  Assert.equal(impressions.length, 1, "Should have a SERP impression event.");
  Assert.equal(
    adImpressions.length,
    expectedAdImpressions.length,
    "Should have equal number of ad impression events."
  );

  expectedAdImpressions = expectedAdImpressions.map(expectedAdImpression => {
    expectedAdImpression.impression_id = impressions[0].extra.impression_id;
    return expectedAdImpression;
  });

  for (let [index, expectedAdImpression] of expectedAdImpressions.entries()) {
    Assert.deepEqual(
      adImpressions[index]?.extra,
      expectedAdImpression,
      "Should have equal values for an ad impression."
    );
  }
}

function assertAbandonmentEvent(expectedAbandonment) {
  let recordedAbandonment = Glean.serp.abandonment.testGetValue() ?? [];

  Assert.equal(
    recordedAbandonment[0].extra.reason,
    expectedAbandonment.abandonment.reason,
    "Should have the correct abandonment reason."
  );
}

async function promiseAdImpressionReceived(num) {
  if (num) {
    return TestUtils.waitForCondition(() => {
      let adImpressions = Glean.serp.adImpression.testGetValue() ?? [];
      return adImpressions.length == num;
    }, `Should have received ${num} ad impressions.`);
  }
  return TestUtils.waitForCondition(() => {
    let adImpressions = Glean.serp.adImpression.testGetValue() ?? [];
    return adImpressions.length;
  }, "Should have received an ad impression.");
}

async function waitForPageWithAdImpressions() {
  return new Promise(resolve => {
    let listener = win => {
      Services.obs.removeObserver(
        listener,
        "reported-page-with-ad-impressions"
      );
      resolve();
    };
    Services.obs.addObserver(listener, "reported-page-with-ad-impressions");
  });
}

registerCleanupFunction(async () => {
  await PlacesUtils.history.clear();
});
