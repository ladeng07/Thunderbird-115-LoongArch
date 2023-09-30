/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for the account settings manage identity.
 */

"use strict";

var {
  click_account_tree_row,
  get_account_tree_row,
  open_advanced_settings,
  openAccountSettings,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/AccountManagerHelpers.jsm"
);
const { wait_for_frame_load } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);
var { gMockPromptService } = ChromeUtils.import(
  "resource://testing-common/mozmill/PromptHelpers.jsm"
);
var { plan_for_modal_dialog, wait_for_modal_dialog } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var { mc } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

const { OpenPGPTestUtils } = ChromeUtils.import(
  "resource://testing-common/mozmill/OpenPGPTestUtils.jsm"
);

var gPopAccount, gOriginalAccountCount, gIdentitiesWin;

/**
 * Load the identities dialog.
 *
 * @returns {Window} The loaded window of the identities dialog.
 */
async function identitiesListDialogLoaded(win) {
  let manageButton = win.document.getElementById(
    "identity.manageIdentitiesbutton"
  );
  let identitiesDialogLoad = promiseLoadSubDialog(
    "chrome://messenger/content/am-identities-list.xhtml"
  );
  EventUtils.synthesizeMouseAtCenter(manageButton, {}, win);
  return identitiesDialogLoad;
}

/**
 * Load an identity listed in the identities dialog.
 *
 * @param {number} identityIdx - The index of the identity, in the list.
 * @returns {Window} The loaded window of the identities dialog.
 */
async function identityDialogLoaded(identityIdx) {
  let identitiesList = gIdentitiesWin.document.getElementById("identitiesList");

  // Let's dbl click to open the identity.
  let identityDialogLoaded = promiseLoadSubDialog(
    "chrome://messenger/content/am-identity-edit.xhtml"
  );
  EventUtils.synthesizeMouseAtCenter(
    identitiesList.children[identityIdx],
    { clickCount: 2 },
    gIdentitiesWin
  );
  return identityDialogLoaded;
}

/** Close the open dialog. */
async function dialogClosed(win) {
  let dialogElement = win.document.querySelector("dialog");
  let dialogClosing = BrowserTestUtils.waitForEvent(
    dialogElement,
    "dialogclosing"
  );
  dialogElement.acceptDialog();
  return dialogClosing;
}

add_setup(async function () {
  // There may be pre-existing accounts from other tests.
  gOriginalAccountCount = MailServices.accounts.allServers.length;

  // Create a POP server
  let popServer = MailServices.accounts
    .createIncomingServer("nobody", "exampleX.invalid", "pop3")
    .QueryInterface(Ci.nsIPop3IncomingServer);

  let identity = MailServices.accounts.createIdentity();
  identity.email = "tinderbox@example.invalid";

  gPopAccount = MailServices.accounts.createAccount();
  gPopAccount.incomingServer = popServer;
  gPopAccount.addIdentity(identity);

  // Now there should be one more account.
  Assert.equal(
    MailServices.accounts.allServers.length,
    gOriginalAccountCount + 1
  );

  let firstIdentity = gPopAccount.identities[0];

  Assert.equal(
    firstIdentity.autoEncryptDrafts,
    true,
    "encrypted drafts should be enabled by default"
  );
  Assert.equal(
    firstIdentity.protectSubject,
    true,
    "protected subject should be enabled by default"
  );
  Assert.equal(
    firstIdentity.signMail,
    false,
    "signing should be disabled by default"
  );

  firstIdentity.autoEncryptDrafts = false;

  registerCleanupFunction(function rmAccount() {
    // Remove our test account to leave the profile clean.
    MailServices.accounts.removeAccount(gPopAccount);
    // There should be only the original accounts left.
    Assert.equal(
      MailServices.accounts.allServers.length,
      gOriginalAccountCount
    );
  });

  // Go to the account settings.
  let tab = await openAccountSettings();
  registerCleanupFunction(function closeTab() {
    mc.window.document.getElementById("tabmail").closeTab(tab);
  });

  // To the account main page.
  let accountRow = get_account_tree_row(
    gPopAccount.key,
    null, // "am-main.xhtml",
    tab
  );
  click_account_tree_row(tab, accountRow);

  // Click "Manage Identities" to show the list of identities.
  let iframe =
    tab.browser.contentWindow.document.getElementById("contentFrame");
  gIdentitiesWin = await identitiesListDialogLoaded(iframe.contentWindow);
});

/**
 * Test that adding a new identity works, and that the identity is listed
 * once the dialog to add new identity closes.
 */
add_task(async function test_add_identity() {
  let identitiesList = gIdentitiesWin.document.getElementById("identitiesList");

  Assert.equal(
    identitiesList.childElementCount,
    1,
    "should start with 1 identity"
  );

  // Open the dialog to add a new identity.
  let identityDialogLoaded = promiseLoadSubDialog(
    "chrome://messenger/content/am-identity-edit.xhtml"
  );
  let addButton = gIdentitiesWin.document.getElementById("addButton");
  EventUtils.synthesizeMouseAtCenter(addButton, {}, gIdentitiesWin);
  let identityWin = await identityDialogLoaded;

  // Fill in some values, and close. The new identity should now be listed.
  identityWin.document.getElementById("identity.fullName").focus();
  EventUtils.sendString("bob", identityWin);
  identityWin.document.getElementById("identity.email").focus();
  EventUtils.sendString("bob@openpgp.example", identityWin);

  // Check the e2e tab is only available for existing identities that
  // have the email set - that is, it should not be shown yet.
  Assert.ok(identityWin.document.getElementById("identityE2ETab").hidden);

  await dialogClosed(identityWin);

  Assert.equal(
    identitiesList.childElementCount,
    2,
    "should have 2 identities now"
  );
});

async function test_identity_idx(idx) {
  info(`Checking identity #${idx}`);
  let identityWin = await identityDialogLoaded(idx);

  let identity = gPopAccount.identities[idx];
  Assert.ok(!!identity, "identity #1 should be set");
  let keyId = identity.getCharAttribute("openpgp_key_id");

  // The e2e tab should now be shown.
  Assert.ok(
    !identityWin.document.getElementById("identityE2ETab").hidden,
    "e2e tab should show"
  );
  // Click the e2e tab to switch to it (for further clicks below).
  EventUtils.synthesizeMouseAtCenter(
    identityWin.document.getElementById("identityE2ETab"),
    {},
    identityWin
  );

  Assert.equal(
    identityWin.document.getElementById("openPgpKeyListRadio").value,
    keyId,
    "keyId should be correct"
  );

  Assert.equal(
    identityWin.document
      .getElementById("openPgpKeyListRadio")
      .querySelectorAll("radio[selected]").length,
    1,
    "Should have exactly one key selected (can be None)"
  );

  if (keyId) {
    // Click "More information", then "Key Properties" to see that the key
    // properties dialog opens.
    let keyDetailsDialogLoaded = promiseLoadSubDialog(
      "chrome://openpgp/content/ui/keyDetailsDlg.xhtml"
    );
    info(`Will open key details dialog for key 0x${keyId}`);
    let arrowHead = identityWin.document.querySelector(
      `#openPgpOption${keyId} button.arrowhead`
    );
    arrowHead.scrollIntoView(); // Test window is small on CI...
    EventUtils.synthesizeMouseAtCenter(arrowHead, {}, identityWin);
    let propsButton = identityWin.document.querySelector(
      `#openPgpOption${keyId} button.openpgp-props-btn`
    );
    Assert.ok(BrowserTestUtils.is_visible(propsButton));
    propsButton.scrollIntoView(); // Test window is small on CI...
    EventUtils.synthesizeMouseAtCenter(propsButton, {}, identityWin);
    let keyDetailsDialog = await keyDetailsDialogLoaded;
    info(`Key details dialog for key 0x${keyId} loaded`);
    keyDetailsDialog.close();
  }

  Assert.equal(
    identityWin.document.getElementById("encryptionChoices").value,
    identity.encryptionPolicy,
    "Encrypt setting should be correct"
  );

  // Signing checked based on the pref.
  Assert.equal(
    identityWin.document.getElementById("identity_sign_mail").checked,
    identity.signMail
  );
  // Disabled if the identity don't have a key configured.
  Assert.equal(
    identityWin.document.getElementById("identity_sign_mail").disabled,
    !identity.getCharAttribute("openpgp_key_id")
  );

  return dialogClosed(identityWin);
}

add_task(async function test_identity_idx_1() {
  return test_identity_idx(1);
});

add_task(async function test_identity_changes() {
  let identity = gPopAccount.identities[1];

  // Check that prefs were copied from identity 0 to identity 1
  Assert.equal(
    identity.autoEncryptDrafts,
    false,
    "encrypted drafts should be disabled in [1] because we disabled it in [0]"
  );
  Assert.equal(
    identity.protectSubject,
    true,
    "protected subject should be enabled in [1] because it is enabled in [0]"
  );
  Assert.equal(
    identity.signMail,
    false,
    "signing should be disabled in [1] because it is disabled in [0]"
  );

  // Let's poke identity 1 and check the changes got applied
  // Note: can't set the prefs to encrypt/sign unless there's also a key.

  let [id] = await OpenPGPTestUtils.importPrivateKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../openpgp/data/keys/bob@openpgp.example-0xfbfcc82a015e7330-secret.asc"
      )
    )
  );
  info(`Set up openpgp key; id=${id}`);

  identity.setUnicharAttribute("openpgp_key_id", id.split("0x").join(""));
  identity.signMail = "true"; // Sign by default.
  identity.encryptionPolicy = 2; // Require encryption.
  info("Modified identity 1 - will check it now");
  await test_identity_idx(1);

  info("Will load identity 0 again and re-check that");
  await test_identity_idx(0);
});
