/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_firefox_suggest_with_policy() {
  await setupPolicyEngineWithJson({
    policies: {
      FirefoxSuggest: {
        WebSuggestions: false,
        SponsoredSuggestions: true,
        ImproveSuggest: true,
        Locked: true,
      },
    },
  });

  await BrowserTestUtils.withNewTab(
    "about:preferences#privacy",
    async browser => {
      is(
        browser.contentDocument.getElementById(
          "firefoxSuggestNonsponsoredToggle"
        ).pressed,
        false,
        "Web suggestions is disabled"
      );
      is(
        browser.contentDocument.getElementById("firefoxSuggestSponsoredToggle")
          .pressed,
        true,
        "Sponsored suggestions is enabled"
      );
      is(
        browser.contentDocument.getElementById(
          "firefoxSuggestDataCollectionToggle"
        ).pressed,
        true,
        "Improve suggest is enabled"
      );
      is(
        browser.contentDocument.getElementById(
          "firefoxSuggestNonsponsoredToggle"
        ).disabled,
        true,
        "Web suggestions is disabled"
      );
      is(
        browser.contentDocument.getElementById("firefoxSuggestSponsoredToggle")
          .disabled,
        true,
        "Sponsored suggestions is enabled"
      );
      is(
        browser.contentDocument.getElementById(
          "firefoxSuggestDataCollectionToggle"
        ).disabled,
        true,
        "Improve suggest is enabled"
      );
    }
  );
});
