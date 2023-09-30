/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = ["OpenPGPTestUtils"];

const { Assert } = ChromeUtils.importESModule(
  "resource://testing-common/Assert.sys.mjs"
);
const { BrowserTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/BrowserTestUtils.sys.mjs"
);
const EventUtils = ChromeUtils.import(
  "resource://testing-common/mozmill/EventUtils.jsm"
);

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  OpenPGPAlias: "chrome://openpgp/content/modules/OpenPGPAlias.jsm",
  EnigmailCore: "chrome://openpgp/content/modules/core.jsm",
  EnigmailFuncs: "chrome://openpgp/content/modules/funcs.jsm",
  EnigmailKeyRing: "chrome://openpgp/content/modules/keyRing.jsm",
  MailStringUtils: "resource:///modules/MailStringUtils.jsm",
  RNP: "chrome://openpgp/content/modules/RNP.jsm",
  PgpSqliteDb2: "chrome://openpgp/content/modules/sqliteDb.jsm",
});

const OpenPGPTestUtils = {
  ACCEPTANCE_PERSONAL: "personal",
  ACCEPTANCE_REJECTED: "rejected",
  ACCEPTANCE_UNVERIFIED: "unverified",
  ACCEPTANCE_VERIFIED: "verified",
  ACCEPTANCE_UNDECIDED: "undecided",
  ALICE_KEY_ID: "F231550C4F47E38E",
  BOB_KEY_ID: "FBFCC82A015E7330",
  CAROL_KEY_ID: "3099FF1238852B9F",

  /**
   * Given a compose message window, clicks on the "Digitally Sign This Message"
   * menu item.
   */
  async toggleMessageSigning(win) {
    return clickToolbarButtonMenuItem(win, "#button-encryption-options", [
      "#menu_securitySign_Toolbar",
    ]);
  },

  /**
   * Given a compose message window, clicks on the "Encrypt Subject"
   * menu item.
   */
  async toggleMessageEncryptSubject(win) {
    return clickToolbarButtonMenuItem(win, "#button-encryption-options", [
      "#menu_securityEncryptSubject_Toolbar",
    ]);
  },

  /**
   * Given a compose message window, clicks on the "Attach My Public Key"
   * menu item.
   */
  async toggleMessageKeyAttachment(win) {
    return clickToolbarButtonMenuItem(win, "#button-attach", [
      "#button-attachPopup_attachPublicKey",
    ]);
  },

  /**
   * Given a compose message window, clicks on the "Require Encryption"
   * menu item.
   */
  async toggleMessageEncryption(win) {
    // Note: doing it through #menu_securityEncryptRequire_Menubar won't work on
    // mac since the native menu bar can't be clicked.
    // Use the toolbar button to click Require encryption.
    await clickToolbarButtonMenuItem(win, "#button-encryption-options", [
      "#menu_securityEncrypt_Toolbar",
    ]);
  },

  /**
   * For xpcshell-tests OpenPGP is not initialized automatically. This method
   * should be called at the start of testing.
   */
  async initOpenPGP() {
    Assert.ok(await lazy.RNP.init(), "librnp did load");
    Assert.ok(await lazy.EnigmailCore.getService({}), "EnigmailCore did load");
    lazy.EnigmailKeyRing.init();
    await lazy.OpenPGPAlias.load();
  },

  /**
   * Tests whether the signed icon's "src" attribute matches the provided state.
   *
   * @param {HTMLDocument} doc - The document of the message window.
   * @param {"ok"|"unknown"|"verified"|"unverified"|"mismatch"} state - The
   *   state to test for.
   * @returns {boolean}
   */
  hasSignedIconState(doc, state) {
    return !!doc.querySelector(`#signedHdrIcon[src*=message-signed-${state}]`);
  },

  /**
   * Checks that the signed icon is hidden.
   *
   * @param {HTMLDocument} doc - The document of the message window.
   * @returns {boolean}
   */
  hasNoSignedIconState(doc) {
    return !!doc.querySelector(`#signedHdrIcon[hidden]`);
  },

  /**
   * Checks that the encrypted icon is hidden.
   *
   * @param {HTMLDocument} doc - The document of the message window.
   * @returns {boolean}
   */
  hasNoEncryptedIconState(doc) {
    return !!doc.querySelector(`#encryptedHdrIcon[hidden]`);
  },

  /**
   * Tests whether the encrypted icon's "src" attribute matches the provided
   * state value.
   *
   * @param {HTMLDocument} doc - The document of the message window.
   * @param {"ok"|"notok"} state - The state to test for.
   * @returns {boolean}
   */
  hasEncryptedIconState(doc, state) {
    return !!doc.querySelector(
      `#encryptedHdrIcon[src*=message-encrypted-${state}]`
    );
  },

  /**
   * Imports a public key into the keyring while also updating its acceptance.
   *
   * @param {nsIWindow} parent - The parent window.
   * @param {nsIFile} file - A valid file containing a public OpenPGP key.
   * @param {string} [acceptance] - The acceptance setting for the key.
   * @returns {string[]} - List of imported key ids.
   */
  async importPublicKey(
    parent,
    file,
    acceptance = OpenPGPTestUtils.ACCEPTANCE_VERIFIED
  ) {
    let ids = await OpenPGPTestUtils.importKey(parent, file, false);
    if (!ids.length) {
      throw new Error(`No public key imported from ${file.leafName}`);
    }
    return OpenPGPTestUtils.updateKeyIdAcceptance(ids, acceptance);
  },

  /**
   * Imports a private key into the keyring while also updating its acceptance.
   *
   * @param {nsIWindow} parent - The parent window.
   * @param {nsIFile} file - A valid file containing a private OpenPGP key.
   * @param {string} [acceptance] - The acceptance setting for the key.
   * @param {string} [passphrase] - The passphrase string that is required
   *   for unlocking the imported private key, or null, if no passphrase
   *   is necessary. The existing passphrase protection is kept.
   * @returns {string[]} - List of imported key ids.
   */
  async importPrivateKey(
    parent,
    file,
    acceptance = OpenPGPTestUtils.ACCEPTANCE_PERSONAL,
    passphrase = null
  ) {
    let data = await IOUtils.read(file.path);
    let pgpBlock = lazy.MailStringUtils.uint8ArrayToByteString(data);

    function localPassphraseProvider(win, promptString, resultFlags) {
      resultFlags.canceled = false;
      return passphrase;
    }

    let result = await lazy.RNP.importSecKeyBlockImpl(
      parent,
      localPassphraseProvider,
      passphrase != null, // keepPassphrases = true, if a passphrase is given
      pgpBlock,
      false,
      []
    );

    if (!result || result.exitCode !== 0) {
      throw new Error(
        `EnigmailKeyRing.importKey failed with result "${result.errorMsg}"!`
      );
    }
    if (!result.importedKeys || !result.importedKeys.length) {
      throw new Error(`No private key imported from ${file.leafName}`);
    }

    lazy.EnigmailKeyRing.updateKeys(result.importedKeys);
    lazy.EnigmailKeyRing.clearCache();
    return OpenPGPTestUtils.updateKeyIdAcceptance(
      result.importedKeys.slice(),
      acceptance
    );
  },

  /**
   * Imports a key into the keyring.
   *
   * @param {nsIWindow} parent - The parent window.
   * @param {nsIFile} file - A valid file containing an OpenPGP key.
   * @param {boolean} [isBinary] - false for ASCII armored files
   * @returns {Promise<string[]>} - A list of ids for the key(s) imported.
   */
  async importKey(parent, file, isBinary) {
    let data = await IOUtils.read(file.path);
    let txt = lazy.MailStringUtils.uint8ArrayToByteString(data);
    let errorObj = {};
    let fingerPrintObj = {};

    let result = lazy.EnigmailKeyRing.importKey(
      parent,
      false,
      txt,
      isBinary,
      null,
      errorObj,
      fingerPrintObj,
      false,
      [],
      false
    );

    if (result !== 0) {
      console.debug(
        `EnigmailKeyRing.importKey failed with result "${result}"!`
      );
      return [];
    }
    return fingerPrintObj.value.slice();
  },

  /**
   * Updates the acceptance value of the provided key(s) in the database.
   *
   * @param {string|string[]} id - The id or list of ids to update.
   * @param {string} acceptance - The new acceptance level for the key id.
   * @returns {string[]} - A list of the key ids processed.
   */
  async updateKeyIdAcceptance(id, acceptance) {
    let ids = Array.isArray(id) ? id : [id];
    for (let id of ids) {
      let key = lazy.EnigmailKeyRing.getKeyById(id);
      let email = lazy.EnigmailFuncs.getEmailFromUserID(key.userId);
      await lazy.PgpSqliteDb2.updateAcceptance(key.fpr, [email], acceptance);
    }
    lazy.EnigmailKeyRing.clearCache();
    return ids.slice();
  },

  getProtectedKeysCount() {
    return lazy.RNP.getProtectedKeysCount();
  },

  /**
   * Removes a key by its id, clearing its acceptance and refreshing the
   * cache.
   *
   * @param {string|string[]} id - The id or list of ids to remove.
   * @param {boolean} [deleteSecret=false] - If true, secret keys will be removed too.
   */
  async removeKeyById(id, deleteSecret = false) {
    let ids = Array.isArray(id) ? id : [id];
    for (let id of ids) {
      let key = lazy.EnigmailKeyRing.getKeyById(id);
      await lazy.RNP.deleteKey(key.fpr, deleteSecret);
      await lazy.PgpSqliteDb2.deleteAcceptance(key.fpr);
    }
    lazy.EnigmailKeyRing.clearCache();
  },
};

/**
 * Click a toolbar button to make it show the dropdown. Then click one of
 * the menuitems in that popup.
 */
async function clickToolbarButtonMenuItem(
  win,
  buttonSelector,
  menuitemSelectors
) {
  let menupopup = win.document.querySelector(`${buttonSelector} > menupopup`);
  let popupshown = BrowserTestUtils.waitForEvent(menupopup, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    win.document.querySelector(`${buttonSelector} > dropmarker`),
    {},
    win
  );
  await popupshown;

  if (menuitemSelectors.length > 1) {
    let submenuSelector = menuitemSelectors.shift();
    menupopup.querySelector(submenuSelector).openMenu(true);
  }

  let popuphidden = BrowserTestUtils.waitForEvent(menupopup, "popuphidden");
  menupopup.activateItem(win.document.querySelector(menuitemSelectors[0]));
  await popuphidden;
}
