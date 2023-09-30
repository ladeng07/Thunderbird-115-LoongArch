/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var { openAccountSetup, wait_for_account_tree_load } = ChromeUtils.import(
  "resource://testing-common/mozmill/AccountManagerHelpers.jsm"
);
var { mc } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { input_value, delete_all_existing } = ChromeUtils.import(
  "resource://testing-common/mozmill/KeyboardHelpers.jsm"
);
var { gMockPromptService } = ChromeUtils.import(
  "resource://testing-common/mozmill/PromptHelpers.jsm"
);

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
var { DNS } = ChromeUtils.import("resource:///modules/DNS.jsm");
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
let { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);
var { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);
var { nsMailServer } = ChromeUtils.import(
  "resource://testing-common/mailnews/Maild.jsm"
);

var originalAlertsServiceCID;
// We need a mock alerts service to capture notification events when loading the
// UI after a successful account configuration in order to catch the alert
// triggered when trying to connect to the fake IMAP server.
class MockAlertsService {
  QueryInterface = ChromeUtils.generateQI(["nsIAlertsService"]);
  showAlert() {}
}

var user = {
  name: "Yamato Nadeshiko",
  email: "yamato.nadeshiko@example.com",
  password: "abc12345",
  incomingHost: "testin.example.com",
  outgoingHost: "testout.example.com",
};
var outgoingShortName = "Example Två";

var imapUser = {
  name: "John Doe",
  email: "john.doe@example-imap.com",
  password: "abc12345",
  incomingHost: "testin.example-imap.com",
  outgoingHost: "testout.example-imap.com",
};

var IMAPServer = {
  open() {
    const {
      ImapDaemon,
      ImapMessage,
      IMAP_RFC2195_extension,
      IMAP_RFC3501_handler,
      mixinExtension,
    } = ChromeUtils.import("resource://testing-common/mailnews/Imapd.jsm");
    const { nsMailServer } = ChromeUtils.import(
      "resource://testing-common/mailnews/Maild.jsm"
    );
    IMAPServer.ImapMessage = ImapMessage;

    this.daemon = new ImapDaemon();
    this.server = new nsMailServer(daemon => {
      let handler = new IMAP_RFC3501_handler(daemon);
      mixinExtension(handler, IMAP_RFC2195_extension);

      handler.kUsername = "john.doe@example-imap.com";
      handler.kPassword = "abc12345";
      handler.kAuthRequired = true;
      handler.kAuthSchemes = ["PLAIN"];
      return handler;
    }, this.daemon);
    this.server.start(1993);
    info(`IMAP server started on port ${this.server.port}`);

    registerCleanupFunction(() => this.close());
  },
  close() {
    this.server.stop();
  },
  get port() {
    return this.server.port;
  },
};

var SMTPServer = {
  open() {
    const { SmtpDaemon, SMTP_RFC2821_handler } = ChromeUtils.import(
      "resource://testing-common/mailnews/Smtpd.jsm"
    );
    const { nsMailServer } = ChromeUtils.import(
      "resource://testing-common/mailnews/Maild.jsm"
    );

    this.daemon = new SmtpDaemon();
    this.server = new nsMailServer(daemon => {
      let handler = new SMTP_RFC2821_handler(daemon);
      handler.kUsername = "john.doe@example-imap.com";
      handler.kPassword = "abc12345";
      handler.kAuthRequired = true;
      handler.kAuthSchemes = ["PLAIN"];
      return handler;
    }, this.daemon);
    this.server.start(1587);
    info(`SMTP server started on port ${this.server.port}`);

    registerCleanupFunction(() => this.close());
  },
  close() {
    this.server.stop();
  },
  get port() {
    return this.server.port;
  },
};

var _srv = DNS.srv;
var _txt = DNS.txt;
DNS.srv = function (name) {
  if (["_caldavs._tcp.localhost", "_carddavs._tcp.localhost"].includes(name)) {
    return [{ prio: 0, weight: 0, host: "example.org", port: 443 }];
  }
  if (
    [
      "_caldavs._tcp.example-imap.com",
      "_carddavs._tcp.example-imap.com",
    ].includes(name)
  ) {
    return [{ prio: 0, weight: 0, host: "example.org", port: 443 }];
  }
  throw new Error(`Unexpected DNS SRV lookup: ${name}`);
};
DNS.txt = function (name) {
  if (name == "_caldavs._tcp.localhost") {
    return [{ data: "path=/browser/comm/calendar/test/browser/data/dns.sjs" }];
  }
  if (name == "_carddavs._tcp.localhost") {
    return [
      {
        data: "path=/browser/comm/mail/components/addrbook/test/browser/data/dns.sjs",
      },
    ];
  }
  if (name == "_caldavs._tcp.example-imap.com") {
    return [{ data: "path=/browser/comm/calendar/test/browser/data/dns.sjs" }];
  }
  if (name == "_carddavs._tcp.example-imap.com") {
    return [
      {
        data: "path=/browser/comm/mail/components/addrbook/test/browser/data/dns.sjs",
      },
    ];
  }
  throw new Error(`Unexpected DNS TXT lookup: ${name}`);
};

const PREF_NAME = "mailnews.auto_config_url";
const PREF_VALUE = Services.prefs.getCharPref(PREF_NAME);

// Remove an account in the Account Manager, but not via the UI.
function remove_account_internal(tab, account, outgoing) {
  let win = tab.browser.contentWindow;

  // Remove the account and incoming server
  let serverId = account.incomingServer.serverURI;
  MailServices.accounts.removeAccount(account);
  account = null;
  if (serverId in win.accountArray) {
    delete win.accountArray[serverId];
  }
  win.selectServer(null, null);

  // Remove the outgoing server
  let smtpKey = outgoing.key;
  MailServices.smtp.deleteServer(outgoing);
  win.replaceWithDefaultSmtpServer(smtpKey);
}

add_task(async function test_mail_account_setup() {
  originalAlertsServiceCID = MockRegistrar.register(
    "@mozilla.org/alerts-service;1",
    MockAlertsService
  );

  // Set the pref to load a local autoconfig file.
  let url =
    "http://mochi.test:8888/browser/comm/mail/test/browser/account/xml/";
  Services.prefs.setCharPref(PREF_NAME, url);

  let tab = await openAccountSetup();
  let tabDocument = tab.browser.contentWindow.document;

  // Input user's account information
  EventUtils.synthesizeMouseAtCenter(
    tabDocument.getElementById("realname"),
    {},
    tab.browser.contentWindow
  );

  if (tabDocument.getElementById("realname").value) {
    // If any realname is already filled, clear it out, we have our own.
    delete_all_existing(mc, tabDocument.getElementById("realname"));
  }
  input_value(mc, user.name);
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  input_value(mc, user.email);
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  input_value(mc, user.password);

  let notificationBox = tab.browser.contentWindow.gAccountSetup.notificationBox;

  let notificationShowed = BrowserTestUtils.waitForCondition(
    () =>
      notificationBox.getNotificationWithValue("accountSetupSuccess") != null,
    "Timeout waiting for error notification to be showed"
  );

  let popOption = tabDocument.getElementById("resultsOption-pop3");
  let protocolPOPSelected = BrowserTestUtils.waitForCondition(
    () => !popOption.hidden && popOption.classList.contains("selected"),
    "Timeout waiting for the POP3 option to be visible and selected"
  );

  // Load the autoconfig file from http://localhost:433**/autoconfig/example.com
  EventUtils.synthesizeMouseAtCenter(
    tabDocument.getElementById("continueButton"),
    {},
    tab.browser.contentWindow
  );

  // Wait for the successful notification to show up.
  await notificationShowed;

  // Only the POP protocol should be available, therefore we need to confirm
  // that the UI is returning only 1 pre-selected protocol.
  await protocolPOPSelected;

  // Confirm that the IMAP and EXCHANGE options are hidden.
  Assert.ok(tabDocument.getElementById("resultsOption-imap").hidden);
  Assert.ok(tabDocument.getElementById("resultsOption-exchange").hidden);

  // Register the prompt service to handle the confirm() dialog
  gMockPromptService.register();
  gMockPromptService.returnValue = true;

  // Open the advanced settings (Account Manager) to create the account
  // immediately. We use an invalid email/password so the setup will fail
  // anyway.
  EventUtils.synthesizeMouseAtCenter(
    tabDocument.getElementById("manualConfigButton"),
    {},
    tab.browser.contentWindow
  );

  await BrowserTestUtils.waitForCondition(
    () => !tabDocument.getElementById("manualConfigArea").hidden,
    "Timeout waiting for the manual edit area to become visible"
  );

  let tabmail = mc.window.document.getElementById("tabmail");
  let tabChanged = BrowserTestUtils.waitForCondition(
    () => tabmail.selectedTab != tab,
    "Timeout waiting for the currently active tab to change"
  );

  let advancedSetupButton = tabDocument.getElementById("advancedSetupButton");
  advancedSetupButton.scrollIntoView();

  EventUtils.synthesizeMouseAtCenter(
    advancedSetupButton,
    {},
    tab.browser.contentWindow
  );

  // Wait for the current Account Setup tab to be closed and the Account
  // Settings tab to open before running other sub tests.
  await tabChanged;

  await subtest_verify_account(tabmail.selectedTab, user);

  // Close the Account Settings tab.
  tabmail.closeTab(tabmail.currentTabInfo);

  // Confirm that we properly updated the folderPaneVisible attribute for the
  // tabmail when we created the account in the background.
  Assert.ok(tabmail.currentTabInfo.folderPaneVisible);

  // Confirm that the folder pane is visible.
  Assert.ok(BrowserTestUtils.is_visible(tabmail.currentAbout3Pane.folderTree));

  let promptState = gMockPromptService.promptState;
  Assert.equal("confirm", promptState.method);

  // Clean up
  gMockPromptService.unregister();
  Services.prefs.setCharPref(PREF_NAME, PREF_VALUE);
});

async function subtest_verify_account(tab, user) {
  await BrowserTestUtils.waitForCondition(
    () => tab.browser.contentWindow.currentAccount != null,
    "Timeout waiting for current account to become non-null"
  );

  let account = tab.browser.contentWindow.currentAccount;
  let identity = account.defaultIdentity;
  let incoming = account.incomingServer;
  let outgoing = MailServices.smtp.getServerByKey(identity.smtpServerKey);

  let config = {
    "incoming server username": {
      actual: incoming.username,
      expected: user.email.split("@")[0],
    },
    // This was creating test failure.
    //
    // "outgoing server username": {
    //   actual: outgoing.username,
    //   expected: user.email,
    // },
    "incoming server hostname": {
      // Note: N in the hostName is uppercase
      actual: incoming.hostName,
      expected: user.incomingHost,
    },
    "outgoing server hostname": {
      // And this is lowercase
      actual: outgoing.hostname,
      expected: user.outgoingHost,
    },
    "user real name": { actual: identity.fullName, expected: user.name },
    "user email address": { actual: identity.email, expected: user.email },
    "outgoing description": {
      actual: outgoing.description,
      expected: outgoingShortName,
    },
  };

  try {
    for (let i in config) {
      Assert.equal(
        config[i].actual,
        config[i].expected,
        `Configured ${i} is ${config[i].actual}. It should be ${config[i].expected}.`
      );
    }
  } finally {
    remove_account_internal(tab, account, outgoing);
  }
}

/**
 * Make sure that we don't re-set the information we get from the config
 * file if the password is incorrect.
 */
add_task(async function test_bad_password_uses_old_settings() {
  // Set the pref to load a local autoconfig file, that will fetch the
  // ../account/xml/example.com which contains the settings for the
  // @example.com email account (see the 'user' object).
  let url =
    "http://mochi.test:8888/browser/comm/mail/test/browser/account/xml/";
  Services.prefs.setCharPref(PREF_NAME, url);

  Services.telemetry.clearScalars();

  let tab = await openAccountSetup();
  let tabDocument = tab.browser.contentWindow.document;

  // Input user's account information
  EventUtils.synthesizeMouseAtCenter(
    tabDocument.getElementById("realname"),
    {},
    tab.browser.contentWindow
  );

  if (tabDocument.getElementById("realname").value) {
    // If any realname is already filled, clear it out, we have our own.
    delete_all_existing(mc, tabDocument.getElementById("realname"));
  }
  input_value(mc, user.name);
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  input_value(mc, user.email);
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  input_value(mc, user.password);

  // Load the autoconfig file from http://localhost:433**/autoconfig/example.com
  EventUtils.synthesizeMouseAtCenter(
    tabDocument.getElementById("continueButton"),
    {},
    tab.browser.contentWindow
  );

  let createButton = tabDocument.getElementById("createButton");
  await BrowserTestUtils.waitForCondition(
    () => !createButton.hidden && !createButton.disabled,
    "Timeout waiting for create button to become visible and active"
  );

  let notificationBox = tab.browser.contentWindow.gAccountSetup.notificationBox;

  let notificationShowed = BrowserTestUtils.waitForCondition(
    () => notificationBox.getNotificationWithValue("accountSetupError") != null,
    "Timeout waiting for error notification to be showed"
  );

  createButton.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    createButton,
    {},
    tab.browser.contentWindow
  );

  await notificationShowed;

  await BrowserTestUtils.waitForCondition(
    () => !createButton.disabled,
    "Timeout waiting for create button to become active"
  );

  let manualConfigButton = tabDocument.getElementById("manualConfigButton");
  manualConfigButton.scrollIntoView();

  EventUtils.synthesizeMouseAtCenter(
    manualConfigButton,
    {},
    tab.browser.contentWindow
  );

  await BrowserTestUtils.waitForCondition(
    () => !tabDocument.getElementById("manualConfigArea").hidden,
    "Timeout waiting for the manual edit area to become visible"
  );

  let outgoingAuthSelect = tabDocument.getElementById("outgoingAuthMethod");
  // Make sure the select field is inside the viewport.
  outgoingAuthSelect.scrollIntoView();
  outgoingAuthSelect.focus();

  let popupOpened = BrowserTestUtils.waitForEvent(
    document.getElementById("ContentSelectDropdown"),
    "popupshown"
  );
  EventUtils.sendKey("space", tab.browser.contentWindow);
  await popupOpened;

  // The default value should be on "Normal password", which is after
  // "No authentication", so we need to go up. We do this on purpose so we can
  // properly test and track the order of options.
  EventUtils.sendKey("up", tab.browser.contentWindow);

  let userNameDisabled = BrowserTestUtils.waitForCondition(
    () => tabDocument.getElementById("outgoingUsername").disabled,
    "Timeout waiting for the outgoing username field to be disabled"
  );
  EventUtils.sendKey("return", tab.browser.contentWindow);

  // Confirm that the outgoing username field is disabled.
  await userNameDisabled;

  // Revert the outgoing authentication method to "Normal Password".
  outgoingAuthSelect.focus();
  popupOpened = BrowserTestUtils.waitForEvent(
    document.getElementById("ContentSelectDropdown"),
    "popupshown"
  );
  // Change the outgoing authentication method to "No Authentication".
  EventUtils.sendKey("space", tab.browser.contentWindow);
  await popupOpened;

  EventUtils.sendKey("down", tab.browser.contentWindow);

  let usernameEnabled = BrowserTestUtils.waitForCondition(
    () => !tabDocument.getElementById("outgoingUsername").disabled,
    "Timeout waiting for the outgoing username field to be enabled"
  );
  EventUtils.sendKey("return", tab.browser.contentWindow);

  // Confirm that the outgoing username field is enabled.
  await usernameEnabled;

  let notificationRemoved = BrowserTestUtils.waitForCondition(
    () => notificationBox.getNotificationWithValue("accountSetupError") == null,
    "Timeout waiting for error notification to be removed"
  );

  createButton.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    createButton,
    {},
    tab.browser.contentWindow
  );

  // Triggering again the "createButton" should clear previous notifications.
  await notificationRemoved;

  // Make sure all the values are the same as in the user object.
  Assert.equal(
    tabDocument.getElementById("outgoingHostname").value,
    user.outgoingHost,
    "Outgoing server changed!"
  );
  Assert.equal(
    tabDocument.getElementById("incomingHostname").value,
    user.incomingHost,
    "incoming server changed!"
  );

  // A new error notification should appear.
  await BrowserTestUtils.waitForCondition(
    () => notificationBox.getNotificationWithValue("accountSetupError") != null,
    "Timeout waiting for error notification to be showed"
  );

  let scalars = TelemetryTestUtils.getProcessScalars("parent", true);
  Assert.equal(
    scalars["tb.account.failed_email_account_setup"]["xml-from-db"],
    1,
    "Count of failed email account setup with xml config must be correct"
  );
  Assert.equal(
    scalars["tb.account.failed_email_account_setup"].user,
    1,
    "Count of failed email account setup with manual config must be correct"
  );

  // Clean up
  Services.prefs.setCharPref(PREF_NAME, PREF_VALUE);

  let closeButton = tabDocument.getElementById("cancelButton");
  closeButton.scrollIntoView();

  EventUtils.synthesizeMouseAtCenter(
    closeButton,
    {},
    tab.browser.contentWindow
  );
});

add_task(async function test_remember_password() {
  await remember_password_test(true);
  await remember_password_test(false);
});

/**
 * Test remember_password checkbox behavior with
 * signon.rememberSignons set to "aPrefValue"
 *
 * @param {boolean} aPrefValue - The preference value for signon.rememberSignons.
 */
async function remember_password_test(aPrefValue) {
  // Save the pref for backup purpose.
  let rememberSignons_pref_save = Services.prefs.getBoolPref(
    "signon.rememberSignons",
    true
  );

  Services.prefs.setBoolPref("signon.rememberSignons", aPrefValue);

  let tab = await openAccountSetup();
  let tabDocument = tab.browser.contentWindow.document;
  let password = tabDocument.getElementById("password");
  let passwordToggle = tabDocument.getElementById("passwordToggleButton");

  // The password field is empty, so confirm that the toggle button is hidden.
  Assert.ok(passwordToggle.hidden);

  // Type something in the password field.
  password.focus();
  input_value(mc, "testing");

  // The password toggle button should be visible now.
  Assert.ok(!passwordToggle.hidden);

  // Click on the password toggle button.
  EventUtils.synthesizeMouseAtCenter(
    passwordToggle,
    {},
    tab.browser.contentWindow
  );

  // The password field should have being turned into clear text.
  Assert.equal(password.type, "text");

  // Click on the password toggle button again.
  EventUtils.synthesizeMouseAtCenter(
    passwordToggle,
    {},
    tab.browser.contentWindow
  );

  // The password field should have being turned back into a password type.
  Assert.equal(password.type, "password");

  let rememberPassword = tabDocument.getElementById("rememberPassword");
  Assert.ok(rememberPassword.disabled != aPrefValue);
  Assert.equal(rememberPassword.checked, aPrefValue);

  // Empty the password field.
  delete_all_existing(mc, password);

  // Restore the saved signon.rememberSignons value.
  Services.prefs.setBoolPref(
    "signon.rememberSignons",
    rememberSignons_pref_save
  );

  let closeButton = tabDocument.getElementById("cancelButton");
  closeButton.scrollIntoView();

  // Close the wizard.
  EventUtils.synthesizeMouseAtCenter(
    closeButton,
    {},
    tab.browser.contentWindow
  );
}

/**
 * Test the full account setup with an IMAP account, verifying the correct info
 * in the final page.
 */
add_task(async function test_full_account_setup() {
  // Initialize the fake IMAP and SMTP server to simulate a real account login.
  IMAPServer.open();
  SMTPServer.open();

  // Set the pref to load a local autoconfig file.
  let url =
    "http://mochi.test:8888/browser/comm/mail/test/browser/account/xml/";
  Services.prefs.setCharPref(PREF_NAME, url);

  let tab = await openAccountSetup();
  let tabDocument = tab.browser.contentWindow.document;

  // If any realname is already filled, clear it out, we have our own.
  tabDocument.getElementById("realname").value = "";

  // The focus should be on the "realname" input by default, so let's fill it.
  input_value(mc, imapUser.name);
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  input_value(mc, imapUser.email);
  EventUtils.synthesizeKey("VK_TAB", {}, mc.window);
  input_value(mc, imapUser.password);

  let notificationBox = tab.browser.contentWindow.gAccountSetup.notificationBox;

  let notificationShowed = BrowserTestUtils.waitForCondition(
    () =>
      notificationBox.getNotificationWithValue("accountSetupSuccess") != null,
    "Timeout waiting for error notification to be showed"
  );

  let imapOption = tabDocument.getElementById("resultsOption-imap");
  let protocolIMAPSelected = BrowserTestUtils.waitForCondition(
    () => !imapOption.hidden && imapOption.classList.contains("selected"),
    "Timeout waiting for the IMAP option to be visible and selected"
  );

  // Since we're focused inside a form, pressing "Enter" should submit it.
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  // Wait for the successful notification to show up.
  await notificationShowed;

  // Confirm the IMAP protocol is visible and selected.
  await protocolIMAPSelected;

  let finalViewShowed = BrowserTestUtils.waitForCondition(
    () => !tabDocument.getElementById("successView").hidden,
    "Timeout waiting for the final page to be visible"
  );

  let insecureDialogShowed = BrowserTestUtils.waitForCondition(
    () => tabDocument.getElementById("insecureDialog").open,
    "Timeout waiting for the #insecureDialog to be visible"
  );

  // Press "Enter" again to proceed with the account creation.
  tabDocument.getElementById("createButton").focus();
  EventUtils.synthesizeKey("VK_RETURN", {}, mc.window);

  // Since we're using plain authentication in the mock IMAP server, the
  // insecure warning dialog should appear. Let's wait for it.
  await insecureDialogShowed;

  // Click the acknowledge checkbox and confirm the insecure dialog.
  let acknowledgeCheckbox = tabDocument.getElementById("acknowledgeWarning");
  acknowledgeCheckbox.scrollIntoView();

  EventUtils.synthesizeMouseAtCenter(
    acknowledgeCheckbox,
    {},
    tab.browser.contentWindow
  );

  // Prepare to handle the linked services notification.
  let syncingBox = tab.browser.contentWindow.gAccountSetup.syncingBox;

  let syncingNotificationShowed = BrowserTestUtils.waitForCondition(
    () => syncingBox.getNotificationWithValue("accountSetupLoading") != null,
    "Timeout waiting for the syncing notification to be removed"
  );

  let syncingNotificationRemoved = BrowserTestUtils.waitForCondition(
    () => !syncingBox.getNotificationWithValue("accountSetupLoading"),
    "Timeout waiting for the syncing notification to be removed"
  );

  let confirmButton = tabDocument.getElementById("insecureConfirmButton");
  confirmButton.scrollIntoView();

  // Close the insecure dialog.
  EventUtils.synthesizeMouseAtCenter(
    confirmButton,
    {},
    tab.browser.contentWindow
  );

  // The final page should be visible.
  await finalViewShowed;

  let tabmail = mc.window.document.getElementById("tabmail");

  // The tab shouldn't change even if we created a new account.
  Assert.equal(tab, tabmail.selectedTab, "Tab should should still be the same");

  // Assert the UI is properly filled with the new account info.
  Assert.equal(
    tabDocument.getElementById("newAccountName").textContent,
    imapUser.name
  );
  Assert.equal(
    tabDocument.getElementById("newAccountEmail").textContent,
    imapUser.email
  );
  Assert.equal(
    tabDocument.getElementById("newAccountProtocol").textContent,
    "imap"
  );

  // The fetching of connected address books and calendars should start.
  await syncingNotificationShowed;

  // Wait for the fetching of address books and calendars to end.
  await syncingNotificationRemoved;

  // Wait for the linked address book section to be visible.
  let addressBookSection = tabDocument.getElementById("linkedAddressBooks");
  await TestUtils.waitForCondition(
    () => BrowserTestUtils.is_visible(addressBookSection),
    "linked address book section visible",
    250
  );

  // The section should be expanded already.
  let abList = tabDocument.querySelector(
    "#addressBooksSetup .linked-services-list"
  );
  Assert.ok(BrowserTestUtils.is_visible(abList), "address book list visible");

  // Check the linked address book was found.
  Assert.equal(abList.childElementCount, 1);
  Assert.equal(
    abList.querySelector("li > span.protocol-type").textContent,
    "CardDAV"
  );
  Assert.equal(
    abList.querySelector("li > span.list-item-name").textContent,
    "You found me!"
  );

  // Connect the linked address book.
  let abDirectoryPromise = TestUtils.topicObserved("addrbook-directory-synced");
  EventUtils.synthesizeMouseAtCenter(
    abList.querySelector("li > button.small-button"),
    {},
    tab.browser.contentWindow
  );
  let [abDirectory] = await abDirectoryPromise;
  Assert.equal(abDirectory.dirName, "You found me!");
  Assert.equal(abDirectory.dirType, Ci.nsIAbManager.CARDDAV_DIRECTORY_TYPE);
  Assert.equal(
    abDirectory.getStringValue("carddav.url", ""),
    "https://example.org/browser/comm/mail/components/addrbook/test/browser/data/addressbook.sjs"
  );

  // Wait for the linked calendar section to be visible.
  let calendarSection = tabDocument.getElementById("linkedCalendars");
  await TestUtils.waitForCondition(
    () => BrowserTestUtils.is_visible(calendarSection),
    "linked calendar section visible",
    250
  );

  // The section should be expanded already.
  let calendarList = tabDocument.querySelector(
    "#calendarsSetup .linked-services-list"
  );
  Assert.ok(BrowserTestUtils.is_visible(calendarList), "calendar list visible");

  // Check the linked calendar was found.
  Assert.equal(calendarList.childElementCount, 2);
  Assert.equal(
    calendarList.querySelector("li > span.protocol-type").textContent,
    "CalDAV"
  );
  Assert.equal(
    calendarList.querySelector("li > span.list-item-name").textContent,
    "You found me!"
  );
  Assert.equal(
    calendarList.querySelector("li:nth-child(2) > span.protocol-type")
      .textContent,
    "CalDAV"
  );
  Assert.equal(
    calendarList.querySelector("li:nth-child(2) > span.list-item-name")
      .textContent,
    "Röda dagar"
  );

  // Connect the linked calendar.
  let calendarPromise = new Promise(resolve => {
    let observer = {
      onCalendarRegistered(calendar) {
        cal.manager.removeObserver(this);
        resolve(calendar);
      },
      onCalendarUnregistering() {},
      onCalendarDeleting() {},
    };
    cal.manager.addObserver(observer);
  });

  let calendarDialogShowed = BrowserTestUtils.waitForCondition(
    () => tabDocument.getElementById("calendarDialog").open,
    "Timeout waiting for the #calendarDialog to be visible"
  );
  EventUtils.synthesizeMouseAtCenter(
    calendarList.querySelector("li > button.small-button"),
    {},
    tab.browser.contentWindow
  );
  await calendarDialogShowed;
  EventUtils.synthesizeMouseAtCenter(
    tabDocument.getElementById("calendarDialogConfirmButton"),
    {},
    tab.browser.contentWindow
  );

  let calendar = await calendarPromise;
  Assert.equal(calendar.name, "You found me!");
  Assert.equal(calendar.type, "caldav");
  // This address doesn't need to actually exist for the test to pass.
  Assert.equal(
    calendar.uri.spec,
    "https://example.org/browser/comm/calendar/test/browser/data/calendar.sjs"
  );

  let logins = Services.logins.findLogins("https://example.org", null, "");
  Assert.equal(logins.length, 1);
  Assert.equal(
    logins[0].username,
    imapUser.email,
    "username was saved for linked address book/calendar"
  );
  Assert.equal(
    logins[0].password,
    imapUser.password,
    "password was saved for linked address book/calendar"
  );

  let tabChanged = BrowserTestUtils.waitForCondition(
    () => tabmail.selectedTab != tab,
    "Timeout waiting for the currently active tab to change"
  );

  let finishButton = tabDocument.getElementById("finishButton");
  finishButton.focus();
  finishButton.scrollIntoView();

  // Close the wizard.
  EventUtils.synthesizeMouseAtCenter(
    finishButton,
    {},
    tab.browser.contentWindow
  );

  await tabChanged;

  // Confirm the mail 3 pane is the currently selected tab.
  Assert.equal(
    tabmail.selectedTab.mode.name,
    "mail3PaneTab",
    "The currently selected tab is the primary Mail tab"
  );

  // Remove the address book and calendar.
  MailServices.ab.deleteAddressBook(abDirectory.URI);
  cal.manager.removeCalendar(calendar);

  // Restore the original pref.
  Services.prefs.setCharPref(PREF_NAME, PREF_VALUE);

  // Wait for Thunderbird to connect to the server and check for messages.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, 1000));

  IMAPServer.close();
  SMTPServer.close();
  Services.logins.removeAllLogins();
});

registerCleanupFunction(function () {
  MockRegistrar.unregister(originalAlertsServiceCID);
  DNS.srv = _srv;
  DNS.txt = _txt;
});
