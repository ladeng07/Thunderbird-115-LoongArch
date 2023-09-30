/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Verify user typed text remains in the URL bar when tab switching, even when
 * loads fail.
 */
add_task(async function validURL() {
  let input = "i-definitely-dont-exist.example.com";
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "http://example.com/"
  );
  let browser = tab.linkedBrowser;
  // Note: Waiting on content document not being hidden because new tab pages can be preloaded,
  // in which case no load events fire.
  await SpecialPowers.spawn(browser, [], async () => {
    await ContentTaskUtils.waitForCondition(() => {
      return content.document && !content.document.hidden;
    });
  });
  let errorPageLoaded = BrowserTestUtils.waitForErrorPage(browser);
  gURLBar.value = input;
  gURLBar.select();
  EventUtils.sendKey("return");
  await errorPageLoaded;
  is(gURLBar.value, input, "Text is still in URL bar");
  await BrowserTestUtils.switchTab(gBrowser, tab.previousElementSibling);
  await BrowserTestUtils.switchTab(gBrowser, tab);
  is(gURLBar.value, input, "Text is still in URL bar after tab switch");
  BrowserTestUtils.removeTab(tab);
});

/**
 * Invalid URIs fail differently (that is, immediately, in the loadURI call)
 * if keyword searches are turned off. Test that this works, too.
 */
add_task(async function invalidURL() {
  let input = "To be or not to be-that is the question";
  await SpecialPowers.pushPrefEnv({ set: [["keyword.enabled", false]] });
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank",
    false
  );
  let browser = tab.linkedBrowser;
  // Note: Waiting on content document not being hidden because new tab pages can be preloaded,
  // in which case no load events fire.
  await SpecialPowers.spawn(browser, [], async () => {
    await ContentTaskUtils.waitForCondition(() => {
      return content.document && !content.document.hidden;
    });
  });
  let errorPageLoaded = BrowserTestUtils.waitForErrorPage(tab.linkedBrowser);
  gURLBar.value = input;
  gURLBar.select();
  EventUtils.sendKey("return");
  await errorPageLoaded;
  is(gURLBar.value, input, "Text is still in URL bar");
  is(tab.linkedBrowser.userTypedValue, input, "Text still stored on browser");
  await BrowserTestUtils.switchTab(gBrowser, tab.previousElementSibling);
  await BrowserTestUtils.switchTab(gBrowser, tab);
  is(gURLBar.value, input, "Text is still in URL bar after tab switch");
  is(tab.linkedBrowser.userTypedValue, input, "Text still stored on browser");
  BrowserTestUtils.removeTab(tab);
});

/**
 * Test the urlbar status of text selection and focusing by tab switching.
 */
add_task(async function selectAndFocus() {
  // Create a tab with normal web page.
  const webpageTabURL = "https://example.com";
  const webpageTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: webpageTabURL,
  });

  // Create a tab with userTypedValue.
  const userTypedTabText = "test";
  const userTypedTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
  });
  await UrlbarTestUtils.inputIntoURLBar(window, userTypedTabText);

  // Create an empty tab.
  const emptyTab = await BrowserTestUtils.openNewForegroundTab({ gBrowser });

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    BrowserTestUtils.removeTab(webpageTab);
    BrowserTestUtils.removeTab(userTypedTab);
    BrowserTestUtils.removeTab(emptyTab);
  });

  await doSelectAndFocusTest({
    targetTab: webpageTab,
    targetSelectionStart: 0,
    targetSelectionEnd: 0,
    anotherTab: userTypedTab,
  });
  await doSelectAndFocusTest({
    targetTab: webpageTab,
    targetSelectionStart: 2,
    targetSelectionEnd: 5,
    anotherTab: userTypedTab,
  });
  await doSelectAndFocusTest({
    targetTab: webpageTab,
    targetSelectionStart: webpageTabURL.length,
    targetSelectionEnd: webpageTabURL.length,
    anotherTab: userTypedTab,
  });
  await doSelectAndFocusTest({
    targetTab: webpageTab,
    targetSelectionStart: 0,
    targetSelectionEnd: 0,
    anotherTab: emptyTab,
  });
  await doSelectAndFocusTest({
    targetTab: userTypedTab,
    targetSelectionStart: 0,
    targetSelectionEnd: 0,
    anotherTab: webpageTab,
  });
  await doSelectAndFocusTest({
    targetTab: userTypedTab,
    targetSelectionStart: 0,
    targetSelectionEnd: 0,
    anotherTab: emptyTab,
  });
  await doSelectAndFocusTest({
    targetTab: userTypedTab,
    targetSelectionStart: 1,
    targetSelectionEnd: 2,
    anotherTab: emptyTab,
  });
  await doSelectAndFocusTest({
    targetTab: userTypedTab,
    targetSelectionStart: userTypedTabText.length,
    targetSelectionEnd: userTypedTabText.length,
    anotherTab: emptyTab,
  });
  await doSelectAndFocusTest({
    targetTab: emptyTab,
    targetSelectionStart: 0,
    targetSelectionEnd: 0,
    anotherTab: webpageTab,
  });
  await doSelectAndFocusTest({
    targetTab: emptyTab,
    targetSelectionStart: 0,
    targetSelectionEnd: 0,
    anotherTab: userTypedTab,
  });
});

async function doSelectAndFocusTest({
  targetTab,
  targetSelectionStart,
  targetSelectionEnd,
  anotherTab,
}) {
  const testCases = [
    {
      targetFocus: false,
      anotherFocus: false,
    },
    {
      targetFocus: true,
      anotherFocus: false,
    },
    {
      targetFocus: true,
      anotherFocus: true,
    },
  ];

  for (const { targetFocus, anotherFocus } of testCases) {
    // Setup the target tab.
    await switchTab(targetTab);
    setURLBarFocus(targetFocus);
    gURLBar.inputField.setSelectionRange(
      targetSelectionStart,
      targetSelectionEnd
    );
    const targetValue = gURLBar.value;

    // Switch to another tab.
    await switchTab(anotherTab);
    setURLBarFocus(anotherFocus);

    // Switch back to the target tab.
    await switchTab(targetTab);

    // Check whether the value, selection and focusing status are reverted.
    Assert.equal(gURLBar.value, targetValue);
    Assert.equal(gURLBar.focused, targetFocus);
    if (gURLBar.focused) {
      Assert.equal(gURLBar.selectionStart, targetSelectionStart);
      Assert.equal(gURLBar.selectionEnd, targetSelectionEnd);
    } else {
      Assert.equal(gURLBar.selectionStart, gURLBar.value.length);
      Assert.equal(gURLBar.selectionEnd, gURLBar.value.length);
    }
  }
}

function setURLBarFocus(focus) {
  if (focus) {
    gURLBar.focus();
  } else {
    gURLBar.blur();
  }
}

async function switchTab(tab) {
  if (gBrowser.selectedTab !== tab) {
    EventUtils.synthesizeMouseAtCenter(tab, {});
    await BrowserTestUtils.waitForCondition(() => gBrowser.selectedTab === tab);
  }
}
