/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests the new account provisioner workflow.
 */

"use strict";

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { gMockPromptService } = ChromeUtils.import(
  "resource://testing-common/mozmill/PromptHelpers.jsm"
);
var { wait_for_content_tab_load } = ChromeUtils.import(
  "resource://testing-common/mozmill/ContentTabHelpers.jsm"
);
var { mc } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { remove_email_account } = ChromeUtils.import(
  "resource://testing-common/mozmill/NewMailAccountHelpers.jsm"
);
var { openAccountProvisioner, openAccountSetup } = ChromeUtils.import(
  "resource://testing-common/mozmill/AccountManagerHelpers.jsm"
);
var { input_value } = ChromeUtils.import(
  "resource://testing-common/mozmill/KeyboardHelpers.jsm"
);
let { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);
var { click_through_appmenu, click_menus_in_sequence } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

// RELATIVE_ROOT messes with the collector, so we have to bring the path back
// so we get the right path for the resources.
var url =
  "http://mochi.test:8888/browser/comm/mail/test/browser/newmailaccount/html/";
var kProvisionerUrl =
  "chrome://messenger/content/newmailaccount/accountProvisioner.xhtml";
var kProvisionerEnabledPref = "mail.provider.enabled";
var kSuggestFromNamePref = "mail.provider.suggestFromName";
var kProviderListPref = "mail.provider.providerList";
var kDefaultServerPort = 4444;
var kDefaultServerRoot = "http://localhost:" + kDefaultServerPort;
var gDefaultEngine;

Services.prefs.setCharPref(kProviderListPref, url + "providerList");
Services.prefs.setCharPref(kSuggestFromNamePref, url + "suggestFromName");

// Here's a name that we'll type in later on. It's a global const because
// we'll be using it in several distinct modal dialog event loops.
var NAME = "Green Llama";

// Record what the original value of the mail.provider.enabled pref is so
// that we can put it back once the tests are done.
var gProvisionerEnabled = Services.prefs.getBoolPref(kProvisionerEnabledPref);
var gOldAcceptLangs = Services.locale.requestedLocales;
var gNumAccounts;

add_setup(async function () {
  requestLongerTimeout(2);

  // Make sure we enable the Account Provisioner.
  Services.prefs.setBoolPref(kProvisionerEnabledPref, true);
  // Restrict the user's language to just en-US
  Services.locale.requestedLocales = ["en-US"];
});

registerCleanupFunction(async function () {
  // Put the mail.provider.enabled pref back the way it was.
  Services.prefs.setBoolPref(kProvisionerEnabledPref, gProvisionerEnabled);
  // And same with the user languages
  Services.locale.requestedLocales = gOldAcceptLangs;

  // Some tests that open new windows don't return focus to the main window
  // in a way that satisfies mochitest, and the test times out.
  Services.focus.focusedWindow = window;
});

/**
 * Helper function that returns the number of accounts associated with the
 * current profile.
 */
function nAccounts() {
  return MailServices.accounts.accounts.length;
}

/**
 * Helper function to wait for the load of the account providers.
 *
 * @param {object} tab - The opened account provisioner tab.
 */
async function waitForLoadedProviders(tab) {
  let gProvisioner = await TestUtils.waitForCondition(
    () => tab.browser.contentWindow.gAccountProvisioner
  );

  // We got the correct amount of email and domain providers.
  await BrowserTestUtils.waitForCondition(
    () => gProvisioner.mailProviders.length == 4,
    "Correctly loaded 4 email providers"
  );
  await BrowserTestUtils.waitForCondition(
    () => gProvisioner.domainProviders.length == 3,
    "Correctly loaded 3 domain providers"
  );
}

/**
 * Test a full account creation with an email provider.
 */
add_task(async function test_account_creation_from_provisioner() {
  Services.telemetry.clearScalars();

  let tab = await openAccountProvisioner();
  let tabDocument = tab.browser.contentWindow.document;

  let mailInput = tabDocument.getElementById("mailName");
  // The focus is on the email input.
  await BrowserTestUtils.waitForCondition(
    () => tabDocument.activeElement == mailInput,
    "The mailForm input field has the focus"
  );

  await waitForLoadedProviders(tab);

  let scalars = TelemetryTestUtils.getProcessScalars("parent");
  Assert.equal(
    scalars["tb.account.opened_account_provisioner"],
    1,
    "Count of opened account provisioner must be correct"
  );

  // The application will prefill these fields with the account name, if present
  // so we need to select it before typing the new name to avoid mismatch in the
  // expected strings during testing.
  mailInput.select();
  // Fill the email input.
  input_value(mc, NAME);
  // Since we're focused inside a form, pressing "Enter" should submit it.
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  let mailResults = tabDocument.getElementById("mailResultsArea");

  // Wait for the results to be loaded.
  await BrowserTestUtils.waitForCondition(
    () => mailResults.hasChildNodes(),
    "Mail results loaded"
  );
  // We should have a total of 15 addresses.
  await BrowserTestUtils.waitForCondition(
    () => mailResults.querySelectorAll(".result-item").length == 14,
    "All suggested emails were correctly loaded"
  );

  // The domain section should be hidden and the buttons should be updated.
  Assert.ok(
    tabDocument.getElementById("domainSearch").hidden &&
      !tabDocument.getElementById("mailSearchResults").hidden &&
      tabDocument.getElementById("cancelButton").hidden &&
      tabDocument.getElementById("existingButton").hidden &&
      !tabDocument.getElementById("backButton").hidden
  );

  // Go back and fill the domain input.
  let backButton = tabDocument.getElementById("backButton");
  backButton.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(backButton, {}, tab.browser.contentWindow);

  Assert.ok(tabDocument.getElementById("mailSearchResults").hidden);

  let domainName = tabDocument.getElementById("domainName");
  domainName.focus();
  domainName.select();
  // Fill the domain input.
  input_value(mc, NAME);
  // Since we're focused inside a form, pressing "Enter" should submit it.
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  let domainResults = tabDocument.getElementById("domainResultsArea");
  // Wait for the results to be loaded.
  await BrowserTestUtils.waitForCondition(
    () => domainResults.hasChildNodes(),
    "Domain results loaded"
  );
  // We should have a total of 15 addresses.
  await BrowserTestUtils.waitForCondition(
    () => domainResults.querySelectorAll(".result-item").length == 14,
    "All suggested emails and domains were correctly loaded"
  );

  // The domain section should be hidden and the buttons should be updated.
  Assert.ok(
    !tabDocument.getElementById("domainSearch").hidden &&
      tabDocument.getElementById("mailSearchResults").hidden &&
      tabDocument.getElementById("cancelButton").hidden &&
      tabDocument.getElementById("existingButton").hidden &&
      !tabDocument.getElementById("backButton").hidden
  );

  // Go back and confirm both input fields maintained their values.
  backButton.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(backButton, {}, tab.browser.contentWindow);

  Assert.ok(
    tabDocument.getElementById("domainSearchResults").hidden &&
      tabDocument.getElementById("mailName").value == NAME &&
      tabDocument.getElementById("domainName").value == NAME
  );

  // Continue with the email form.
  tabDocument.getElementById("mailName").focus();
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  // Wait for the results to be loaded.
  await BrowserTestUtils.waitForCondition(
    () => mailResults.hasChildNodes(),
    "Mail results loaded"
  );
  // We should have a total of 15 addresses.
  await BrowserTestUtils.waitForCondition(
    () => mailResults.querySelectorAll(".result-item").length == 14,
    "All suggested emails were correctly loaded"
  );

  // Select the first button with a price from the results list by pressing Tab
  // twice to move the focus on the first available price button.
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  await BrowserTestUtils.waitForCondition(
    () =>
      tabDocument.activeElement ==
      mailResults.querySelector(".result-item > button"),
    "The first result button was focused"
  );
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  // A special tab with the provisioner's API url should be loaded.
  wait_for_content_tab_load(undefined, function (aURL) {
    return aURL.schemeIs("http") && aURL.host == "mochi.test";
  });

  scalars = TelemetryTestUtils.getProcessScalars("parent", true);
  Assert.equal(
    scalars["tb.account.selected_account_from_provisioner"]["mochi.test"],
    1,
    "Count of selected email addresses from provisioner must be correct"
  );

  // Close the account provisioner tab, and then restore it.
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
  mc.window.document.getElementById("tabmail").undoCloseTab();
  // Wait for the page to be loaded again...
  wait_for_content_tab_load(undefined, function (aURL) {
    return aURL.schemeIs("http") && aURL.host == "mochi.test";
  });
  tab = mc.window.document.getElementById("tabmail").currentTabInfo;

  // Record how many accounts we start with.
  gNumAccounts = MailServices.accounts.accounts.length;

  // Simulate the purchase of an email account.
  BrowserTestUtils.synthesizeMouseAtCenter(
    "input[value=Send]",
    {},
    tab.browser
  );

  // The account setup tab should be open and selected.
  await BrowserTestUtils.waitForCondition(
    () =>
      mc.window.document.getElementById("tabmail").selectedTab.browser
        ?.currentURI?.spec == "about:accountsetup",
    "The Account Setup Tab was opened"
  );
  // A new account should have been created.
  Assert.equal(
    gNumAccounts + 1,
    MailServices.accounts.accounts.length,
    "New account successfully created"
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      mc.window.document.getElementById("tabmail").selectedTab.browser
        ?.contentWindow.gAccountSetup?._currentModename == "success",
    "The success view was shown"
  );

  scalars = TelemetryTestUtils.getProcessScalars("parent", true);
  Assert.equal(
    scalars["tb.account.new_account_from_provisioner"]["mochi.test"],
    1,
    "Count of created accounts from provisioner must be correct"
  );

  // Clean it up.
  remove_email_account("green@example.com");
  // Close the account setup tab.
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
});

/**
 * Test the opening and closing workflow between account setup and provisioner.
 */
add_task(async function test_switch_between_account_provisioner_and_setup() {
  let tab = await openAccountProvisioner();
  let tabDocument = tab.browser.contentWindow.document;

  await waitForLoadedProviders(tab);

  // Close the tab.
  let closeButton = tabDocument.getElementById("cancelButton");
  closeButton.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    closeButton,
    {},
    tab.browser.contentWindow
  );

  // The account setup tab should NOT be opened.
  await BrowserTestUtils.waitForCondition(
    () =>
      mc.window.document.getElementById("tabmail").selectedTab.browser
        ?.currentURI?.spec != "about:accountsetup",
    "The Account Setup Tab was not opened"
  );

  tab = await openAccountProvisioner();
  tabDocument = tab.browser.contentWindow.document;

  await waitForLoadedProviders(
    mc.window.document.getElementById("tabmail").currentTabInfo
  );

  // Click on the "Use existing account" button.
  let existingAccountButton = tabDocument.getElementById("existingButton");
  existingAccountButton.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    existingAccountButton,
    {},
    tab.browser.contentWindow
  );

  // The account setup tab should be open and selected.
  await BrowserTestUtils.waitForCondition(
    () =>
      mc.window.document.getElementById("tabmail").selectedTab.browser
        ?.currentURI?.spec == "about:accountsetup",
    "The Account Setup Tab was opened"
  );

  // Close the account setup tab.
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
});

/**
 * Test opening the account provisioner from the menu bar.
 */
add_task(async function open_provisioner_from_menu_bar() {
  // Show menubar so we can click it.
  document.getElementById("toolbar-menubar").removeAttribute("autohide");

  EventUtils.synthesizeMouseAtCenter(
    mc.window.document.getElementById("menu_File"),
    {},
    mc.window
  );
  await click_menus_in_sequence(
    mc.window.document.getElementById("menu_FilePopup"),
    [{ id: "menu_New" }, { id: "newCreateEmailAccountMenuItem" }]
  );

  // The account Provisioner tab should be open and selected.
  await BrowserTestUtils.waitForCondition(
    () =>
      mc.window.document.getElementById("tabmail").selectedTab.browser
        ?.currentURI?.spec == "about:accountprovisioner",
    "The Account Provisioner Tab was opened"
  );
  await waitForLoadedProviders(
    mc.window.document.getElementById("tabmail").currentTabInfo
  );

  // Close the account provisioner tab.
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
}).__skipMe = AppConstants.platform == "macosx"; // Can't click menu bar on Mac.

/**
 * Test opening the account provisioner from the main app menu.
 */
add_task(async function open_provisioner_from_app_menu() {
  EventUtils.synthesizeMouseAtCenter(
    mc.window.document.getElementById("button-appmenu"),
    {},
    mc.window
  );
  click_through_appmenu(
    [{ id: "appmenu_new" }],
    {
      id: "appmenu_newCreateEmailAccountMenuItem",
    },
    mc.window
  );

  // The account Provisioner tab should be open and selected.
  await BrowserTestUtils.waitForCondition(
    () =>
      mc.window.document.getElementById("tabmail").selectedTab.browser
        ?.currentURI?.spec == "about:accountprovisioner",
    "The Account Provisioner Tab was opened"
  );
  await waitForLoadedProviders(
    mc.window.document.getElementById("tabmail").currentTabInfo
  );

  // Close the account provisioner tab.
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
}).skip();

/**
 * Test that names with HTML characters are escaped properly when displayed back
 * to the user.
 */
add_task(async function test_html_characters_and_ampersands() {
  let tab = await openAccountProvisioner();
  let tabDocument = tab.browser.contentWindow.document;

  await waitForLoadedProviders(tab);

  // Type a name with some HTML tags and an ampersand in there to see if we can
  // trip up account provisioner.
  const CLEVER_STRING =
    "<i>Hey, I'm ''clever &\"\" smart!<!-- Ain't I a stinkah? --></i>";

  // Fill the email input.
  input_value(mc, CLEVER_STRING);
  // Since we're focused inside a form, pressing "Enter" should submit it.
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  let mailResults = tabDocument.getElementById("mailResultsArea");

  // Wait for the results to be loaded.
  await BrowserTestUtils.waitForCondition(
    () => mailResults.hasChildNodes(),
    "Mail results loaded"
  );

  let searchedTerms =
    tabDocument.getElementById("mailResultsTitle").textContent;
  Assert.notEqual(
    `One available address found for: "${CLEVER_STRING}"`,
    searchedTerms
  );

  // & should have been replaced with &amp;, and the greater than / less than
  // characters with &gt; and &lt; respectively.
  Assert.ok(
    searchedTerms.includes("&amp;"),
    "Should have eliminated ampersands"
  );
  Assert.ok(
    searchedTerms.includes("&gt;"),
    "Should have eliminated greater-than signs"
  );
  Assert.ok(
    searchedTerms.includes("&lt;"),
    "Should have eliminated less-than signs"
  );

  // Close the account provisioner tab.
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
});

/**
 * Test that if the search goes bad on the server-side we show an error.
 */
add_task(async function test_shows_error_on_bad_suggest_from_name() {
  let original = Services.prefs.getCharPref(kSuggestFromNamePref);
  Services.prefs.setCharPref(kSuggestFromNamePref, url + "badSuggestFromName");

  let tab = await openAccountProvisioner();

  await waitForLoadedProviders(tab);

  let notificationBox =
    tab.browser.contentWindow.gAccountProvisioner.notificationBox;

  let notificationShowed = BrowserTestUtils.waitForCondition(
    () =>
      notificationBox.getNotificationWithValue("accountProvisionerError") !=
      null,
    "Timeout waiting for error notification to be showed"
  );

  // Fill the email input.
  input_value(mc, "Boston Low");
  // Since we're focused inside a form, pressing "Enter" should submit it.
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  // Wait for the error notification.
  await notificationShowed;

  // Close the account provisioner tab.
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
  Services.prefs.setCharPref(kSuggestFromNamePref, original);
});

/**
 * Tests that if a provider returns broken or erroneous XML back to the user
 * after account registration, we show an alert dialog.
 */
add_task(async function test_error_on_corrupt_XML() {
  // Register the prompt service to handle the alert() dialog.
  gMockPromptService.register();

  let tab = await openAccountProvisioner();
  let tabDocument = tab.browser.contentWindow.document;

  // Record how many accounts we start with.
  gNumAccounts = nAccounts();

  await waitForLoadedProviders(tab);

  // Fill the email input.
  input_value(mc, "corrupt@corrupt.invalid");
  // Since we're focused inside a form, pressing "Enter" should submit it.
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  let mailResults = tabDocument.getElementById("mailResultsArea");

  // Wait for the results to be loaded.
  await BrowserTestUtils.waitForCondition(
    () => mailResults.hasChildNodes(),
    "Mail results loaded"
  );
  // We should have a total of 15 addresses.
  await BrowserTestUtils.waitForCondition(
    () => mailResults.querySelectorAll(".result-item").length == 14,
    "All suggested emails were correctly loaded"
  );

  let priceButton = tabDocument.querySelector(
    `.result-item[data-label="corrupt@corrupt.invalid"] .result-price`
  );
  priceButton.scrollIntoView();

  EventUtils.synthesizeMouseAtCenter(
    priceButton,
    {},
    tab.browser.contentWindow
  );

  // A special tab with the provisioner's API url should be loaded.
  wait_for_content_tab_load(undefined, function (aURL) {
    return aURL.schemeIs("http") && aURL.host == "mochi.test";
  });
  tab = mc.window.document.getElementById("tabmail").currentTabInfo;

  gMockPromptService.returnValue = true;

  // Simulate the purchase of an email account.
  BrowserTestUtils.synthesizeMouseAtCenter(
    "input[value=Send]",
    {},
    tab.browser
  );
  await BrowserTestUtils.waitForCondition(
    () =>
      mc.window.document.getElementById("tabmail").selectedTab.browser
        ?.currentURI?.spec == "about:accountprovisioner",
    "The Account Provisioner Tab was opened"
  );

  let promptState = gMockPromptService.promptState;
  Assert.equal("alert", promptState.method, "An alert was showed");

  Assert.equal(gNumAccounts, nAccounts(), "No new accounts have been created");

  // Clean up
  gMockPromptService.unregister();

  // Close the account setup tab.
  mc.window.document.getElementById("tabmail").closeTab(tab);
  mc.window.document
    .getElementById("tabmail")
    .closeTab(mc.window.document.getElementById("tabmail").currentTabInfo);
});

/**
 * Tests that when we pref off the Account Provisioner, the menuitem for it
 * becomes hidden, and the button to switch to it from the Existing Account
 * wizard also becomes hidden.  Note that this doesn't test explicitly
 * whether or not the Account Provisioner spawns when there are no accounts.
 * The tests in this file will fail if the Account Provisioner does not spawn
 * with no accounts, and when preffed off, if the Account Provisioner does
 * spawn (which it shouldn't), the instrumentation Mozmill test should fail.
 */
add_task(async function test_can_pref_off_account_provisioner() {
  // First, we'll disable the account provisioner.
  Services.prefs.setBoolPref("mail.provider.enabled", false);

  // Show menubar so we can click it.
  document.getElementById("toolbar-menubar").removeAttribute("autohide");

  EventUtils.synthesizeMouseAtCenter(
    mc.window.document.getElementById("menu_File"),
    {},
    mc.window
  );
  await click_menus_in_sequence(
    mc.window.document.getElementById("menu_FilePopup"),
    [{ id: "menu_New" }]
  );

  // Ensure that the "Get a new mail account" menuitem is no longer available.
  Assert.ok(
    mc.window.document.getElementById("newCreateEmailAccountMenuItem").hidden,
    "new account menu should be hidden"
  );

  // Close all existing tabs except the first mail tab to avoid errors.
  mc.window.document
    .getElementById("tabmail")
    .closeOtherTabs(mc.window.document.getElementById("tabmail").tabInfo[0]);

  // Open up the Account Hub.
  let tab = await openAccountSetup();
  // And make sure the Get a New Account button is hidden.
  Assert.ok(
    tab.browser.contentWindow.document.getElementById("provisionerButton")
      .hidden
  );
  // Close the Account Hub tab.
  mc.window.document.getElementById("tabmail").closeTab(tab);

  // Ok, now pref the Account Provisioner back on
  Services.prefs.setBoolPref("mail.provider.enabled", true);

  EventUtils.synthesizeMouseAtCenter(
    mc.window.document.getElementById("menu_File"),
    {},
    mc.window
  );
  await click_menus_in_sequence(
    mc.window.document.getElementById("menu_FilePopup"),
    [{ id: "menu_New" }]
  );
  Assert.ok(
    !mc.window.document.getElementById("newCreateEmailAccountMenuItem").hidden,
    "new account menu should show"
  );

  // Open up the Account Hub.
  tab = await openAccountSetup();
  // And make sure the Get a New Account button is hidden.
  Assert.ok(
    !tab.browser.contentWindow.document.getElementById("provisionerButton")
      .hidden
  );
  // Close the Account Hub tab.
  mc.window.document.getElementById("tabmail").closeTab(tab);
}).__skipMe = AppConstants.platform == "macosx"; // Can't click menu bar on Mac.
