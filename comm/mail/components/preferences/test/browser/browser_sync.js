/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

const { FxAccounts } = ChromeUtils.importESModule(
  "resource://gre/modules/FxAccounts.sys.mjs"
);
FxAccounts.config.promiseConnectAccountURI = entryPoint =>
  `https://example.org/?page=connect&entryPoint=${entryPoint}`;
FxAccounts.config.promiseManageURI = entryPoint =>
  `https://example.org/?page=manage&entryPoint=${entryPoint}`;
FxAccounts.config.promiseChangeAvatarURI = entryPoint =>
  `https://example.org/?page=avatar&entryPoint=${entryPoint}`;

const ALL_ENGINES = [
  "accounts",
  "identities",
  "addressbooks",
  "calendars",
  "passwords",
];
const PREF_PREFIX = "services.sync.engine";

let prefsWindow, prefsDocument, tabmail;

add_setup(async function () {
  for (let engine of ALL_ENGINES) {
    Services.prefs.setBoolPref(`${PREF_PREFIX}.${engine}`, true);
  }

  ({ prefsWindow, prefsDocument } = await openNewPrefsTab("paneSync"));
  tabmail = document.getElementById("tabmail");

  /** @implements {nsIExternalProtocolService} */
  let mockExternalProtocolService = {
    QueryInterface: ChromeUtils.generateQI(["nsIExternalProtocolService"]),
    externalProtocolHandlerExists(protocolScheme) {},
    isExposedProtocol(protocolScheme) {},
    loadURI(uri, windowContext) {
      Assert.report(
        true,
        undefined,
        undefined,
        `should not be opening ${uri.spec} in an external browser`
      );
    },
  };

  let mockExternalProtocolServiceCID = MockRegistrar.register(
    "@mozilla.org/uriloader/external-protocol-service;1",
    mockExternalProtocolService
  );
  registerCleanupFunction(() => {
    MockRegistrar.unregister(mockExternalProtocolServiceCID);
  });
});

add_task(async function testSectionStates() {
  let noFxaAccount = prefsDocument.getElementById("noFxaAccount");
  let hasFxaAccount = prefsDocument.getElementById("hasFxaAccount");
  let accountStates = [noFxaAccount, hasFxaAccount];

  let fxaLoginUnverified = prefsDocument.getElementById("fxaLoginUnverified");
  let fxaLoginRejected = prefsDocument.getElementById("fxaLoginRejected");
  let fxaLoginVerified = prefsDocument.getElementById("fxaLoginVerified");
  let loginStates = [fxaLoginUnverified, fxaLoginRejected, fxaLoginVerified];

  let fxaDeviceInfo = prefsDocument.getElementById("fxaDeviceInfo");
  let syncConnected = prefsDocument.getElementById("syncConnected");
  let syncDisconnected = prefsDocument.getElementById("syncDisconnected");
  let syncStates = [syncConnected, syncDisconnected];

  function assertStateVisible(states, visibleState) {
    for (let state of states) {
      let visible = BrowserTestUtils.is_visible(state);
      Assert.equal(
        visible,
        state == visibleState,
        `${state.id} should be ${state == visibleState ? "visible" : "hidden"}`
      );
    }
  }

  function checkStates({
    accountState,
    loginState = null,
    deviceInfoVisible = false,
    syncState = null,
  }) {
    prefsWindow.gSyncPane.updateWeavePrefs();
    assertStateVisible(accountStates, accountState);
    assertStateVisible(loginStates, loginState);
    Assert.equal(
      BrowserTestUtils.is_visible(fxaDeviceInfo),
      deviceInfoVisible,
      `fxaDeviceInfo should be ${deviceInfoVisible ? "visible" : "hidden"}`
    );
    assertStateVisible(syncStates, syncState);
  }

  async function assertTabOpens(target, expectedURL) {
    if (typeof target == "string") {
      target = prefsDocument.getElementById(target);
    }

    let tabPromise = BrowserTestUtils.waitForEvent(window, "TabOpen");
    EventUtils.synthesizeMouseAtCenter(target, {}, prefsWindow);
    await tabPromise;
    let tab = tabmail.currentTabInfo;
    await BrowserTestUtils.browserLoaded(tab.browser);
    Assert.equal(
      tab.browser.currentURI.spec,
      `https://example.org/${expectedURL}`,
      "a tab opened to the correct URL"
    );
    tabmail.closeTab(tab);
  }

  info("No account");
  Assert.equal(prefsWindow.UIState.get().status, "not_configured");
  checkStates({ accountState: noFxaAccount });

  // Check clicking the Sign In button opens the connect page in a tab.
  await assertTabOpens("noFxaSignIn", "?page=connect&entryPoint=");

  // Override the window's UIState object with mock values.
  let baseState = {
    email: "test@invalid",
    displayName: "Testy McTest",
    avatarURL:
      "https://example.org/browser/comm/mail/components/preferences/test/browser/files/avatar.png",
    avatarIsDefault: false,
  };
  let mockState;
  prefsWindow.UIState = {
    ON_UPDATE: "sync-ui-state:update",
    STATUS_LOGIN_FAILED: "login_failed",
    STATUS_NOT_CONFIGURED: "not_configured",
    STATUS_NOT_VERIFIED: "not_verified",
    STATUS_SIGNED_IN: "signed_in",
    get() {
      return mockState;
    },
  };

  info("Login not verified");
  mockState = { ...baseState, status: "not_verified" };
  checkStates({
    accountState: hasFxaAccount,
    loginState: fxaLoginUnverified,
    deviceInfoVisible: true,
  });
  Assert.deepEqual(
    await prefsDocument.l10n.getAttributes(
      prefsDocument.getElementById("fxaAccountMailNotVerified")
    ),
    {
      id: "sync-pane-email-not-verified",
      args: { userEmail: "test@invalid" },
    },
    "email address set correctly"
  );

  // Untested: Resend and remove account buttons.

  info("Login rejected");
  mockState = { ...baseState, status: "login_failed" };
  checkStates({
    accountState: hasFxaAccount,
    loginState: fxaLoginRejected,
    deviceInfoVisible: true,
  });
  Assert.deepEqual(
    await prefsDocument.l10n.getAttributes(
      prefsDocument.getElementById("fxaAccountLoginRejected")
    ),
    {
      id: "sync-signedin-login-failure",
      args: { userEmail: "test@invalid" },
    },
    "email address set correctly"
  );

  // Untested: Sign in and remove account buttons.

  info("Logged in, sync disabled");
  mockState = { ...baseState, status: "verified", syncEnabled: false };
  checkStates({
    accountState: hasFxaAccount,
    loginState: fxaLoginVerified,
    deviceInfoVisible: true,
    syncState: syncDisconnected,
  });
  let photo = fxaLoginVerified.querySelector(".contact-photo");
  Assert.equal(
    photo.src,
    "https://example.org/browser/comm/mail/components/preferences/test/browser/files/avatar.png",
    "avatar image set correctly"
  );

  // Check clicking the avatar image opens the avatar page in a tab.
  await assertTabOpens(photo, "?page=avatar&entryPoint=preferences");

  Assert.equal(
    prefsDocument.getElementById("fxaDisplayName").textContent,
    "Testy McTest",
    "display name set correctly"
  );
  Assert.equal(
    prefsDocument.getElementById("fxaEmailAddress").textContent,
    "test@invalid",
    "email address set correctly"
  );

  // Check clicking the management link opens the management page in a tab.
  await assertTabOpens("verifiedManage", "?page=manage&entryPoint=preferences");

  // Untested: Sign out button.

  info("Device name section");
  let deviceNameInput = prefsDocument.getElementById("fxaDeviceNameInput");
  let deviceNameCancel = prefsDocument.getElementById("fxaDeviceNameCancel");
  let deviceNameSave = prefsDocument.getElementById("fxaDeviceNameSave");
  let deviceNameChange = prefsDocument.getElementById(
    "fxaDeviceNameChangeDeviceName"
  );
  Assert.ok(deviceNameInput.readOnly, "input is read-only");
  Assert.ok(
    BrowserTestUtils.is_hidden(deviceNameCancel),
    "cancel button is hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(deviceNameSave),
    "save button is hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(deviceNameChange),
    "change button is visible"
  );

  EventUtils.synthesizeMouseAtCenter(deviceNameChange, {}, prefsWindow);
  Assert.ok(!deviceNameInput.readOnly, "input is writeable");
  Assert.equal(prefsDocument.activeElement, deviceNameInput, "input is active");
  Assert.ok(
    BrowserTestUtils.is_visible(deviceNameCancel),
    "cancel button is visible"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(deviceNameSave),
    "save button is visible"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(deviceNameChange),
    "change button is hidden"
  );

  EventUtils.synthesizeMouseAtCenter(deviceNameCancel, {}, prefsWindow);
  Assert.ok(deviceNameInput.readOnly, "input is read-only");
  Assert.ok(
    BrowserTestUtils.is_hidden(deviceNameCancel),
    "cancel button is hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(deviceNameSave),
    "save button is hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(deviceNameChange),
    "change button is visible"
  );

  // Check the turn on sync button works.
  await openEngineDialog({ expectEngines: ALL_ENGINES, button: "syncSetup" });

  info("Logged in, sync enabled");
  mockState = { ...baseState, status: "verified", syncEnabled: true };
  checkStates({
    accountState: hasFxaAccount,
    loginState: fxaLoginVerified,
    deviceInfoVisible: true,
    syncState: syncConnected,
  });

  // Untested: Sync now button.

  // Check the learn more link opens a tab.
  await assertTabOpens("enginesLearnMore", "?page=learnMore");

  // Untested: Disconnect button.
});

add_task(async function testEngines() {
  function assertEnginesEnabled(...expectedEnabled) {
    for (let engine of ALL_ENGINES) {
      let enabled = Services.prefs.getBoolPref(`${PREF_PREFIX}.${engine}`);
      Assert.equal(
        enabled,
        expectedEnabled.includes(engine),
        `${engine} should be ${
          expectedEnabled.includes(engine) ? "enabled" : "disabled"
        }`
      );
    }
  }

  function assertEnginesShown(...expectEngines) {
    let ENGINES_TO_ITEMS = {
      accounts: "showSyncAccount",
      identities: "showSyncIdentity",
      addressbooks: "showSyncAddress",
      calendars: "showSyncCalendar",
      passwords: "showSyncPasswords",
    };
    let expectItems = expectEngines.map(engine => ENGINES_TO_ITEMS[engine]);
    let items = Array.from(
      prefsDocument.querySelectorAll("#showSyncedList > li:not([hidden])"),
      li => li.id
    );
    Assert.deepEqual(items, expectItems, "enabled engines shown correctly");
  }

  assertEnginesShown(...ALL_ENGINES);
  Services.prefs.setBoolPref(`${PREF_PREFIX}.accounts`, false);
  assertEnginesShown("identities", "addressbooks", "calendars", "passwords");
  Services.prefs.setBoolPref(`${PREF_PREFIX}.identities`, false);
  Services.prefs.setBoolPref(`${PREF_PREFIX}.addressbooks`, false);
  Services.prefs.setBoolPref(`${PREF_PREFIX}.calendars`, false);
  assertEnginesShown("passwords");
  Services.prefs.setBoolPref(`${PREF_PREFIX}.passwords`, false);
  assertEnginesShown();

  info("Checking the engine selection dialog");
  await openEngineDialog({
    toggleEngines: ["accounts", "identities", "passwords"],
  });

  assertEnginesEnabled("accounts", "identities", "passwords");
  assertEnginesShown("accounts", "identities", "passwords");

  await openEngineDialog({
    expectEngines: ["accounts", "identities", "passwords"],
    toggleEngines: ["calendars", "passwords"],
    action: "cancel",
  });

  assertEnginesEnabled("accounts", "identities", "passwords");
  assertEnginesShown("accounts", "identities", "passwords");

  await openEngineDialog({
    expectEngines: ["accounts", "identities", "passwords"],
    toggleEngines: ["calendars", "passwords"],
    action: "accept",
  });

  assertEnginesEnabled("accounts", "identities", "calendars");
  assertEnginesShown("accounts", "identities", "calendars");

  Services.prefs.setBoolPref(`${PREF_PREFIX}.addressbooks`, true);
  Services.prefs.setBoolPref(`${PREF_PREFIX}.passwords`, true);
  assertEnginesShown(...ALL_ENGINES);
});

async function openEngineDialog({
  expectEngines = [],
  toggleEngines = [],
  action = "accept",
  button = "syncChangeOptions",
}) {
  const ENGINES_TO_CHECKBOXES = {
    accounts: "configSyncAccount",
    identities: "configSyncIdentity",
    addressbooks: "configSyncAddress",
    calendars: "configSyncCalendar",
    passwords: "configSyncPasswords",
  };
  let dialogPromise = BrowserTestUtils.promiseAlertDialogOpen(
    undefined,
    "chrome://messenger/content/preferences/syncDialog.xhtml",
    { isSubDialog: true }
  );
  EventUtils.synthesizeMouseAtCenter(
    prefsDocument.getElementById(button),
    {},
    prefsWindow
  );
  let dialogWindow = await dialogPromise;
  let dialogDocument = dialogWindow.document;
  await new Promise(resolve => dialogWindow.setTimeout(resolve));

  let expectItems = expectEngines.map(engine => ENGINES_TO_CHECKBOXES[engine]);

  let checkedItems = Array.from(
    dialogDocument.querySelectorAll(`input[type="checkbox"]`)
  )
    .filter(cb => cb.checked)
    .map(cb => cb.id);
  Assert.deepEqual(
    checkedItems,
    expectItems,
    "enabled engines checked correctly"
  );

  for (let toggleItem of toggleEngines) {
    let checkbox = dialogDocument.getElementById(
      ENGINES_TO_CHECKBOXES[toggleItem]
    );
    checkbox.checked = !checkbox.checked;
  }

  EventUtils.synthesizeMouseAtCenter(
    dialogDocument.querySelector("dialog").getButton(action),
    {},
    dialogWindow
  );
}
