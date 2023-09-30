/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["getGnuPGAPI"];

Services.scriptloader.loadSubScript(
  "chrome://openpgp/content/modules/cryptoAPI/interface.js",
  null,
  "UTF-8"
); /* global CryptoAPI */

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  EnigmailConstants: "chrome://openpgp/content/modules/constants.jsm",
  EnigmailLog: "chrome://openpgp/content/modules/log.jsm",
});

/**
 * GnuPG implementation of CryptoAPI
 */

class GnuPGCryptoAPI extends CryptoAPI {
  constructor() {
    super();
    this.api_name = "GnuPG";
  }

  /**
   * Get the list of all knwn keys (including their secret keys)
   *
   * @param {Array of String} onlyKeys: [optional] only load data for specified key IDs
   *
   * @returns {Promise<Array of Object>}
   */
  async getKeys(onlyKeys = null) {
    throw new Error("Not implemented");
  }

  /**
   * Obtain signatures for a given set of key IDs.
   *
   * @param {string}  keyId:            space-separated list of key IDs
   * @param {boolean} ignoreUnknownUid: if true, filter out unknown signer's UIDs
   *
   * @returns {Promise<Array of Object>} - see extractSignatures()
   */
  async getKeySignatures(keyId, ignoreUnknownUid = false) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: getKeySignatures: ${keyId}\n`);
    throw new Error("Not implemented");
  }

  /**
   * Obtain signatures for a given key.
   *
   * @param {KeyObj}  keyObj:           the signatures of this key will be returned
   * @param {boolean} ignoreUnknownUid: if true, filter out unknown signer's UIDs
   *
   * @returns {Promise<Array of Object>} - see extractSignatures()
   */
  async getKeyObjSignatures(keyObj, ignoreUnknownUid = false) {
    throw new Error("Not implemented");
  }

  /**
   * Export the minimum key for the public key object:
   * public key, primary user ID, newest encryption subkey
   *
   * @param {string} fpr: - a single FPR
   * @param {string} email: - [optional] the email address of the desired user ID.
   *                                     If the desired user ID cannot be found or is not valid, use the primary UID instead
   * @param {Array<number>} subkeyDates: [optional] remove subkeys with specific creation Dates
   *
   * @returns {Promise<object>}:
   *    - exitCode (0 = success)
   *    - errorMsg (if exitCode != 0)
   *    - keyData: BASE64-encded string of key data
   */
  async getMinimalPubKey(fpr, email, subkeyDates) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: getMinimalPubKey: ${fpr}\n`);
    throw new Error("Not implemented");
  }

  /**
   * Export secret key(s) to a file
   *
   * @param {string}  keyId      Specification by fingerprint or keyID
   * @param {boolean} minimalKey - if true, reduce key to minimum required
   *
   * @returns {object}:
   *   - {Number} exitCode:  result code (0: OK)
   *   - {String} keyData:   ASCII armored key data material
   *   - {String} errorMsg:  error message in case exitCode !== 0
   */

  async extractSecretKey(keyId, minimalKey) {
    throw new Error("Not implemented");
  }

  /**
   *
   * @param {byte} byteData - The encrypted data
   *
   * @returns {String or null} - the name of the attached file
   */

  async getFileName(byteData) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: getFileName()\n`);
    throw new Error("Not implemented");
  }

  /**
   *
   * @param {Path} filePath - The signed file
   * @param {Path} sigPath - The signature to verify
   *
   * @returns {Promise<string>} - A message from the verification.
   *
   * Use Promise.catch to handle failed verifications.
   * The message will be an error message in this case.
   */

  async verifyAttachment(filePath, sigPath) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: verifyAttachment()\n`);
    throw new Error("Not implemented");
  }

  /**
   *
   * @param {Bytes}  encrypted     The encrypted data
   *
   * @returns {Promise<object>} - Return object with decryptedData and
   * status information
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async decryptAttachment(encrypted) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: decryptAttachment()\n`);
    throw new Error("Not implemented");
  }

  /**
   *
   * @param {string} encrypted - The encrypted data
   * @param {object} options - Decryption options
   *
   * @returns {Promise<object>} - Return object with decryptedData and
   * status information
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async decrypt(encrypted, options) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: decrypt()\n`);
    throw new Error("Not implemented");
  }

  /**
   *
   * @param {string} encrypted - The encrypted data
   * @param {object} options - Decryption options
   *
   * @returns {Promise<object>} - Return object with decryptedData and
   * status information
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async decryptMime(encrypted, options) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: decryptMime()\n`);

    // write something to gpg such that the process doesn't get stuck
    if (encrypted.length === 0) {
      encrypted = "NO DATA\n";
    }

    options.noOutput = false;
    options.verifyOnly = false;
    options.uiFlags = lazy.EnigmailConstants.UI_PGP_MIME;

    return this.decrypt(encrypted, options);
  }

  /**
   *
   * @param {string} signed - The signed data
   * @param {object} options - Decryption options
   *
   * @returns {Promise<object>} - Return object with decryptedData and
   * status information
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async verifyMime(signed, options) {
    lazy.EnigmailLog.DEBUG(`gnupg.js: verifyMime()\n`);

    options.noOutput = true;
    options.verifyOnly = true;
    options.uiFlags = lazy.EnigmailConstants.UI_PGP_MIME;

    return this.decrypt(signed, options);
  }

  async getKeyListFromKeyBlockAPI(keyBlockStr) {
    throw new Error("Not implemented");
  }

  async genKey(userId, keyType, keySize, expiryTime, passphrase) {
    throw new Error("GnuPG genKey() not implemented");
  }

  async deleteKey(keyFingerprint, deleteSecret) {
    return null;
  }

  async encryptAndOrSign(plaintext, args, resultStatus) {
    return null;
  }
}

function getGnuPGAPI() {
  return new GnuPGCryptoAPI();
}
