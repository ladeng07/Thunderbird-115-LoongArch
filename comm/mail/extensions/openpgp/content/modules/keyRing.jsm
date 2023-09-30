/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailKeyRing"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);
const { MailStringUtils } = ChromeUtils.import(
  "resource:///modules/MailStringUtils.jsm"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  CollectedKeysDB: "chrome://openpgp/content/modules/CollectedKeysDB.jsm",
  OpenPGPAlias: "chrome://openpgp/content/modules/OpenPGPAlias.jsm",
  EnigmailArmor: "chrome://openpgp/content/modules/armor.jsm",
  EnigmailCryptoAPI: "chrome://openpgp/content/modules/cryptoAPI.jsm",
  EnigmailFuncs: "chrome://openpgp/content/modules/funcs.jsm",
  EnigmailLog: "chrome://openpgp/content/modules/log.jsm",
  EnigmailTrust: "chrome://openpgp/content/modules/trust.jsm",
  EnigmailDialog: "chrome://openpgp/content/modules/dialog.jsm",
  EnigmailWindows: "chrome://openpgp/content/modules/windows.jsm",
  GPGME: "chrome://openpgp/content/modules/GPGME.jsm",
  newEnigmailKeyObj: "chrome://openpgp/content/modules/keyObj.jsm",
  PgpSqliteDb2: "chrome://openpgp/content/modules/sqliteDb.jsm",
  RNP: "chrome://openpgp/content/modules/RNP.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "l10n", () => {
  return new Localization(["messenger/openpgp/openpgp.ftl"], true);
});

let gKeyListObj = null;
let gKeyIndex = [];
let gSubkeyIndex = [];
let gLoadingKeys = false;

/*

  This module operates with a Key Store (array) containing objects with the following properties:

  * keyList [Array] of EnigmailKeyObj

  * keySortList [Array]:  used for quickly sorting the keys
    - userId (in lower case)
    - keyId
    - keyNum
  * trustModel: [String]. One of:
            - p: pgp/classical
            - t: always trust
            - a: auto (:0) (default, currently pgp/classical)
            - T: TOFU
            - TP: TOFU+PGP

*/

var EnigmailKeyRing = {
  _initialized: false,

  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
    this.clearCache();
  },

  /**
   * Get the complete list of all public keys, optionally sorted by a column
   *
   * @param  win           - optional |object| holding the parent window for displaying error messages
   * @param  sortColumn    - optional |string| containing the column name for sorting. One of:
   *                            userid, keyid, keyidshort, fpr, keytype, validity, trust, created, expiry
   * @param  sortDirection - |number| 1 = ascending / -1 = descending
   *
   * @returns keyListObj    - |object| { keyList, keySortList } (see above)
   */
  getAllKeys(win, sortColumn, sortDirection) {
    if (gKeyListObj.keySortList.length === 0) {
      loadKeyList(win, sortColumn, sortDirection);
      //EnigmailWindows.keyManReloadKeys();
      /* TODO: do we need something similar with TB's future trust behavior?
      if (!gKeyCheckDone) {
        gKeyCheckDone = true;
        runKeyUsabilityCheck();
      }
      */
    } else if (sortColumn) {
      gKeyListObj.keySortList.sort(
        getSortFunction(sortColumn.toLowerCase(), gKeyListObj, sortDirection)
      );
    }

    return gKeyListObj;
  },

  /**
   * get 1st key object that matches a given key ID or subkey ID
   *
   * @param keyId      - String: key Id with 16 characters (preferred) or 8 characters),
   *                             or fingerprint (40 or 32 characters).
   *                             Optionally preceded with "0x"
   * @param noLoadKeys - Boolean [optional]: do not try to load the key list first
   *
   * @returns Object - found KeyObject or null if key not found
   */
  getKeyById(keyId, noLoadKeys) {
    lazy.EnigmailLog.DEBUG("keyRing.jsm: getKeyById: " + keyId + "\n");

    if (!keyId) {
      return null;
    }

    if (keyId.search(/^0x/) === 0) {
      keyId = keyId.substr(2);
    }
    keyId = keyId.toUpperCase();

    if (!noLoadKeys) {
      this.getAllKeys(); // ensure keylist is loaded;
    }

    let keyObj = gKeyIndex[keyId];

    if (keyObj === undefined) {
      keyObj = gSubkeyIndex[keyId];
    }

    return keyObj !== undefined ? keyObj : null;
  },

  isSubkeyId(keyId) {
    if (!keyId) {
      throw new Error("keyId parameter not set");
    }

    keyId = keyId.replace(/^0x/, "").toUpperCase();

    let keyObj = gSubkeyIndex[keyId];

    return keyObj !== undefined;
  },

  /**
   * get all key objects that match a given email address
   *
   * @param searchTerm   - String: an email address to match against all UIDs of the keys.
   *                               An empty string will return no result
   * @param onlyValidUid - Boolean: if true (default), invalid (e.g. revoked) UIDs are not matched
   *
   * @param allowExpired - Boolean: if true, expired keys are matched.
   *
   * @returns Array of KeyObjects with the found keys (array length is 0 if no key found)
   */
  getKeysByEmail(email, onlyValidUid = true, allowExpired = false) {
    lazy.EnigmailLog.DEBUG("keyRing.jsm: getKeysByEmail: '" + email + "'\n");

    let res = [];
    if (!email) {
      return res;
    }

    this.getAllKeys(); // ensure keylist is loaded;
    email = email.toLowerCase();

    for (let key of gKeyListObj.keyList) {
      if (!allowExpired && key.keyTrust == "e") {
        continue;
      }

      for (let userId of key.userIds) {
        if (userId.type !== "uid") {
          continue;
        }

        // Skip test if it's expired. If expired isn't allowed, we
        // already skipped it above.
        if (
          onlyValidUid &&
          userId.keyTrust != "e" &&
          lazy.EnigmailTrust.isInvalid(userId.keyTrust)
        ) {
          continue;
        }

        if (
          lazy.EnigmailFuncs.getEmailFromUserID(userId.userId).toLowerCase() ===
          email
        ) {
          res.push(key);
          break;
        }
      }
    }
    return res;
  },

  emailAddressesWithSecretKey: null,

  async _populateEmailHasSecretKeyCache() {
    this.emailAddressesWithSecretKey = new Set();

    this.getAllKeys(); // ensure keylist is loaded;

    for (let key of gKeyListObj.keyList) {
      if (!key.secretAvailable) {
        continue;
      }
      let isPersonal = await lazy.PgpSqliteDb2.isAcceptedAsPersonalKey(key.fpr);
      if (!isPersonal) {
        continue;
      }
      for (let userId of key.userIds) {
        if (userId.type !== "uid") {
          continue;
        }
        if (lazy.EnigmailTrust.isInvalid(userId.keyTrust)) {
          continue;
        }
        this.emailAddressesWithSecretKey.add(
          lazy.EnigmailFuncs.getEmailFromUserID(userId.userId).toLowerCase()
        );
      }
    }
  },

  /**
   * This API uses a cache. It helps when making lookups from multiple
   * places, during a longer transaction.
   * Currently, the cache isn't refreshed automatically.
   * Set this.emailAddressesWithSecretKey to null when starting a new
   * operation that needs fresh information.
   */
  async hasSecretKeyForEmail(emailAddr) {
    if (!this.emailAddressesWithSecretKey) {
      await this._populateEmailHasSecretKeyCache();
    }

    return this.emailAddressesWithSecretKey.has(emailAddr);
  },

  /**
   * Specialized function that takes into account
   * the specifics of email addresses in UIDs.
   *
   * @param emailAddr: String - email address to search for without any angulars
   *                            or names
   *
   * @returns KeyObject with the found key, or null if no key found
   */
  async getSecretKeyByEmail(emailAddr) {
    let result = {};
    await this.getAllSecretKeysByEmail(emailAddr, result, true);
    return result.best;
  },

  async getAllSecretKeysByEmail(emailAddr, result, allowExpired) {
    lazy.EnigmailLog.DEBUG(
      "keyRing.jsm: getAllSecretKeysByEmail: '" + emailAddr + "'\n"
    );
    let keyList = this.getKeysByEmail(emailAddr, true, true);

    result.all = [];
    result.best = null;

    var nowDate = new Date();
    var nowSecondsSinceEpoch = nowDate.valueOf() / 1000;
    let bestIsExpired = false;

    for (let key of keyList) {
      if (!key.secretAvailable) {
        continue;
      }
      let isPersonal = await lazy.PgpSqliteDb2.isAcceptedAsPersonalKey(key.fpr);
      if (!isPersonal) {
        continue;
      }
      if (
        key.getEncryptionValidity(true, "ignoreExpired").keyValid &&
        key.getSigningValidity("ignoreExpired").keyValid
      ) {
        let thisIsExpired =
          key.expiryTime != 0 && key.expiryTime < nowSecondsSinceEpoch;
        if (!allowExpired && thisIsExpired) {
          continue;
        }
        result.all.push(key);
        if (!result.best) {
          result.best = key;
          bestIsExpired = thisIsExpired;
        } else if (
          result.best.algoSym === key.algoSym &&
          result.best.keySize === key.keySize
        ) {
          if (!key.expiryTime || key.expiryTime > result.best.expiryTime) {
            result.best = key;
          }
        } else if (bestIsExpired && !thisIsExpired) {
          if (
            result.best.algoSym.search(/^(DSA|RSA)$/) < 0 &&
            key.algoSym.search(/^(DSA|RSA)$/) === 0
          ) {
            // prefer RSA or DSA over ECC (long-term: change this once ECC keys are widely supported)
            result.best = key;
            bestIsExpired = thisIsExpired;
          } else if (
            key.getVirtualKeySize() > result.best.getVirtualKeySize()
          ) {
            result.best = key;
            bestIsExpired = thisIsExpired;
          }
        }
      }
    }
  },

  /**
   * get a list of keys for a given set of (sub-) key IDs
   *
   * @param keyIdList: Array of key IDs
                       OR String, with space-separated list of key IDs
   */
  getKeyListById(keyIdList) {
    lazy.EnigmailLog.DEBUG(
      "keyRing.jsm: getKeyListById: '" + keyIdList + "'\n"
    );
    let keyArr;
    if (typeof keyIdList === "string") {
      keyArr = keyIdList.split(/ +/);
    } else {
      keyArr = keyIdList;
    }

    let ret = [];
    for (let i in keyArr) {
      let r = this.getKeyById(keyArr[i]);
      if (r) {
        ret.push(r);
      }
    }

    return ret;
  },

  /**
   * @param {nsIFile} file - ASCII armored file containing the revocation.
   */
  async importRevFromFile(file) {
    let contents = await IOUtils.readUTF8(file.path);

    const beginIndexObj = {};
    const endIndexObj = {};
    const blockType = lazy.EnigmailArmor.locateArmoredBlock(
      contents,
      0,
      "",
      beginIndexObj,
      endIndexObj,
      {}
    );
    if (!blockType) {
      return;
    }

    if (blockType.search(/^(PUBLIC|PRIVATE) KEY BLOCK$/) !== 0) {
      return;
    }

    let pgpBlock = contents.substr(
      beginIndexObj.value,
      endIndexObj.value - beginIndexObj.value + 1
    );

    const cApi = lazy.EnigmailCryptoAPI();
    let res = await cApi.importRevBlockAPI(pgpBlock);
    if (res.exitCode) {
      return;
    }

    EnigmailKeyRing.clearCache();
    lazy.EnigmailWindows.keyManReloadKeys();
  },

  /**
   * Import a secret key from the given file.
   *
   * @param {nsIFile} file - ASCII armored file containing the revocation.
   * @param {nsIWindow} win - parent window
   * @param {Function} passCB - a callback function that will be called if the user needs
   *   to enter a passphrase to unlock a secret key. See passphrasePromptCallback
   *   for the function signature.
   * @param {object} errorMsgObj - errorMsgObj.value will contain an error
   *   message in case of failures
   * @param {object} importedKeysObj - importedKeysObj.value will contain
   *   an array of the FPRs imported
   */
  async importSecKeyFromFile(
    win,
    passCB,
    keepPassphrases,
    inputFile,
    errorMsgObj,
    importedKeysObj
  ) {
    lazy.EnigmailLog.DEBUG(
      "keyRing.jsm: EnigmailKeyRing.importSecKeyFromFile: fileName=" +
        inputFile.path +
        "\n"
    );

    let data = await IOUtils.read(inputFile.path);
    let contents = MailStringUtils.uint8ArrayToByteString(data);
    let res;
    let tryAgain;
    let permissive = false;
    do {
      tryAgain = false;
      let failed = true;

      try {
        // strict on first attempt, permissive on optional second attempt
        res = await lazy.RNP.importSecKeyBlockImpl(
          win,
          passCB,
          keepPassphrases,
          contents,
          permissive
        );
        failed =
          !res || res.exitCode || !res.importedKeys || !res.importedKeys.length;
      } catch (ex) {
        lazy.EnigmailDialog.alert(win, ex);
      }

      if (failed) {
        if (!permissive) {
          let agreed = lazy.EnigmailDialog.confirmDlg(
            win,
            lazy.l10n.formatValueSync("confirm-permissive-import")
          );
          if (agreed) {
            permissive = true;
            tryAgain = true;
          }
        } else {
          lazy.EnigmailDialog.alert(
            win,
            lazy.l10n.formatValueSync("import-keys-failed")
          );
        }
      }
    } while (tryAgain);

    if (!res || !res.importedKeys) {
      return 1;
    }

    if (importedKeysObj) {
      importedKeysObj.keys = res.importedKeys;
    }
    if (res.importedKeys.length > 0) {
      EnigmailKeyRing.updateKeys(res.importedKeys);
    }
    EnigmailKeyRing.clearCache();

    return res.exitCode;
  },

  /**
   * empty the key cache, such that it will get loaded next time it is accessed
   *
   * no input or return values
   */
  clearCache() {
    lazy.EnigmailLog.DEBUG("keyRing.jsm: EnigmailKeyRing.clearCache\n");
    gKeyListObj = {
      keyList: [],
      keySortList: [],
    };

    gKeyIndex = [];
    gSubkeyIndex = [];
  },

  /**
   * Check if the cache is empty
   *
   * @returns Boolean: true: cache cleared
   */
  getCacheEmpty() {
    return gKeyIndex.length === 0;
  },

  /**
   * Get a list of UserIds for a given key.
   * Only the Only UIDs with highest trust level are returned.
   *
   * @param  String  keyId   key, optionally preceded with 0x
   *
   * @returns Array of String: list of UserIds
   */
  getValidUids(keyId) {
    let keyObj = this.getKeyById(keyId);
    if (keyObj) {
      return this.getValidUidsFromKeyObj(keyObj);
    }
    return [];
  },

  getValidUidsFromKeyObj(keyObj) {
    let r = [];
    if (keyObj) {
      const TRUSTLEVELS_SORTED = lazy.EnigmailTrust.trustLevelsSorted();
      let hideInvalidUid = true;
      let maxTrustLevel = TRUSTLEVELS_SORTED.indexOf(keyObj.keyTrust);

      if (lazy.EnigmailTrust.isInvalid(keyObj.keyTrust)) {
        // pub key not valid (anymore)-> display all UID's
        hideInvalidUid = false;
      }

      for (let i in keyObj.userIds) {
        if (keyObj.userIds[i].type !== "uat") {
          if (hideInvalidUid) {
            let thisTrust = TRUSTLEVELS_SORTED.indexOf(
              keyObj.userIds[i].keyTrust
            );
            if (thisTrust > maxTrustLevel) {
              r = [keyObj.userIds[i].userId];
              maxTrustLevel = thisTrust;
            } else if (thisTrust === maxTrustLevel) {
              r.push(keyObj.userIds[i].userId);
            }
            // else do not add uid
          } else if (
            !lazy.EnigmailTrust.isInvalid(keyObj.userIds[i].keyTrust) ||
            !hideInvalidUid
          ) {
            // UID valid  OR  key not valid, but invalid keys allowed
            r.push(keyObj.userIds[i].userId);
          }
        }
      }
    }

    return r;
  },

  /**
   * Export public key(s) to a file
   *
   * @param {string[]} idArrayFull - array of key IDs or fingerprints
   *   to export (full keys).
   * @param {string[]} idArrayReduced - array of key IDs or fingerprints
   *   to export (reduced keys, non-self signatures stripped).
   * @param {String[]] idArrayMinimal - array of key IDs or fingerprints
   *   to export (minimal keys, user IDs and non-self signatures stripped).
   * @param {String or nsIFile} outputFile - output file name or Object - or NULL
   * @param {object} exitCodeObj - o.value will contain exit code
   * @param {object} errorMsgObj - o.value will contain error message
   *
   * @returns String - if outputFile is NULL, the key block data; "" if a file is written
   */
  async extractPublicKeys(
    idArrayFull,
    idArrayReduced,
    idArrayMinimal,
    outputFile,
    exitCodeObj,
    errorMsgObj
  ) {
    // At least one array must have valid input
    if (
      (!idArrayFull || !Array.isArray(idArrayFull) || !idArrayFull.length) &&
      (!idArrayReduced ||
        !Array.isArray(idArrayReduced) ||
        !idArrayReduced.length) &&
      (!idArrayMinimal ||
        !Array.isArray(idArrayMinimal) ||
        !idArrayMinimal.length)
    ) {
      throw new Error("invalid parameter given to EnigmailKeyRing.extractKey");
    }

    exitCodeObj.value = -1;

    let keyBlock = lazy.RNP.getMultiplePublicKeys(
      idArrayFull,
      idArrayReduced,
      idArrayMinimal
    );
    if (!keyBlock) {
      errorMsgObj.value = lazy.l10n.formatValueSync("fail-key-extract");
      return "";
    }

    exitCodeObj.value = 0;
    if (outputFile) {
      return IOUtils.writeUTF8(outputFile.path, keyBlock)
        .then(() => {
          return "";
        })
        .catch(async () => {
          exitCodeObj.value = -1;
          errorMsgObj.value = await lazy.l10n.formatValue("file-write-failed", {
            output: outputFile.path,
          });
          return null;
        });
    }
    return keyBlock;
  },

  promptKeyExport2AsciiFilename(window, label, defaultFilename) {
    return lazy.EnigmailDialog.filePicker(
      window,
      label,
      "",
      true,
      false,
      "*.asc",
      defaultFilename,
      [lazy.l10n.formatValueSync("ascii-armor-file"), "*.asc"]
    );
  },

  async exportPublicKeysInteractive(window, defaultFileName, keyIdArray) {
    let label = lazy.l10n.formatValueSync("export-to-file");
    let outFile = EnigmailKeyRing.promptKeyExport2AsciiFilename(
      window,
      label,
      defaultFileName
    );
    if (!outFile) {
      return;
    }

    var exitCodeObj = {};
    var errorMsgObj = {};

    await EnigmailKeyRing.extractPublicKeys(
      keyIdArray, // full
      null,
      null,
      outFile,
      exitCodeObj,
      errorMsgObj
    );
    if (exitCodeObj.value !== 0) {
      lazy.EnigmailDialog.alert(
        window,
        lazy.l10n.formatValueSync("save-keys-failed")
      );
      return;
    }
    lazy.EnigmailDialog.info(window, lazy.l10n.formatValueSync("save-keys-ok"));
  },

  backupSecretKeysInteractive(window, defaultFileName, fprArray) {
    let label = lazy.l10n.formatValueSync("export-keypair-to-file");
    let outFile = EnigmailKeyRing.promptKeyExport2AsciiFilename(
      window,
      label,
      defaultFileName
    );

    if (!outFile) {
      return;
    }

    window.openDialog(
      "chrome://openpgp/content/ui/backupKeyPassword.xhtml",
      "",
      "dialog,modal,centerscreen,resizable",
      {
        okCallback: EnigmailKeyRing.exportSecretKey,
        file: outFile,
        fprArray,
      }
    );
  },

  /**
   * Export the secret key after a successful password setup.
   *
   * @param {string} password - The declared password to protect the keys.
   * @param {Array} fprArray - The array of fingerprint of the selected keys.
   * @param {object} file - The file where the keys should be saved.
   * @param {boolean} confirmed - If the password was properly typed in the
   *   prompt.
   */
  async exportSecretKey(password, fprArray, file, confirmed = false) {
    // Interrupt in case this method has been called directly without confirming
    // the input password through the password prompt.
    if (!confirmed) {
      return;
    }

    let backupKeyBlock = await lazy.RNP.backupSecretKeys(fprArray, password);
    if (!backupKeyBlock) {
      Services.prompt.alert(
        null,
        lazy.l10n.formatValueSync("save-keys-failed")
      );
      return;
    }

    await IOUtils.writeUTF8(file.path, backupKeyBlock)
      .then(async () => {
        lazy.EnigmailDialog.info(
          null,
          await lazy.l10n.formatValue("save-keys-ok")
        );
      })
      .catch(async () => {
        Services.prompt.alert(
          null,
          await lazy.l10n.formatValue("file-write-failed", {
            output: file.path,
          })
        );
      });
  },

  /**
   * import key from provided key data (synchronous)
   *
   * @param parent          nsIWindow
   * @param askToConfirm    Boolean  - if true, display confirmation dialog
   * @param keyBlock        String   - data containing key
   * @param isBinary        Boolean
   * @param keyId           String   - key ID expected to import (no meaning)
   * @param errorMsgObj     Object   - o.value will contain error message from GnuPG
   * @param importedKeysObj Object - [OPTIONAL] o.value will contain an array of the FPRs imported
   * @param minimizeKey     Boolean  - [OPTIONAL] minimize key for importing
   * @param limitedUids     Array<String> - [OPTIONAL] restrict importing the key(s) to a given set of UIDs
   * @param allowPermissiveFallbackWithPrompt Boolean - If true, and regular import attempt fails,
   *                                                    the user is asked to allow an optional
   *                                                    permissive import attempt.
   * @param {string} acceptance - Acceptance for the keys to import,
   *                                   which are new, or still have acceptance "undecided".
   *
   * @returns Integer -  exit code:
   *      ExitCode == 0  => success
   *      ExitCode > 0   => error
   *      ExitCode == -1 => Cancelled by user
   */
  importKey(
    parent,
    askToConfirm,
    keyBlock,
    isBinary,
    keyId,
    errorMsgObj,
    importedKeysObj,
    minimizeKey = false,
    limitedUids = [],
    allowPermissiveFallbackWithPrompt = true,
    acceptance = null
  ) {
    const cApi = lazy.EnigmailCryptoAPI();
    return cApi.sync(
      this.importKeyAsync(
        parent,
        askToConfirm,
        keyBlock,
        isBinary,
        keyId,
        errorMsgObj,
        importedKeysObj,
        minimizeKey,
        limitedUids,
        allowPermissiveFallbackWithPrompt,
        acceptance
      )
    );
  },

  /**
   * import key from provided key data
   *
   * @param parent          nsIWindow
   * @param askToConfirm    Boolean  - if true, display confirmation dialog
   * @param keyBlock        String   - data containing key
   * @param isBinary        Boolean
   * @param keyId           String   - key ID expected to import (no meaning)
   * @param errorMsgObj     Object   - o.value will contain error message from GnuPG
   * @param importedKeysObj Object - [OPTIONAL] o.value will contain an array of the FPRs imported
   * @param minimizeKey     Boolean  - [OPTIONAL] minimize key for importing
   * @param limitedUids     Array<String> - [OPTIONAL] restrict importing the key(s) to a given set of UIDs
   * @param allowPermissiveFallbackWithPrompt Boolean - If true, and regular import attempt fails,
   *                                                    the user is asked to allow an optional
   *                                                    permissive import attempt.
   * @param acceptance      String   - The new acceptance value for the imported keys,
   *                                   which are new, or still have acceptance "undecided".
   *
   * @returns Integer -  exit code:
   *      ExitCode == 0  => success
   *      ExitCode > 0   => error
   *      ExitCode == -1 => Cancelled by user
   */
  async importKeyAsync(
    parent,
    askToConfirm,
    keyBlock,
    isBinary,
    keyId, // ignored
    errorMsgObj,
    importedKeysObj,
    minimizeKey = false,
    limitedUids = [],
    allowPermissiveFallbackWithPrompt = true,
    acceptance = null
  ) {
    lazy.EnigmailLog.DEBUG(
      `keyRing.jsm: EnigmailKeyRing.importKeyAsync('${keyId}', ${askToConfirm}, ${minimizeKey})\n`
    );

    var pgpBlock;
    if (!isBinary) {
      const beginIndexObj = {};
      const endIndexObj = {};
      const blockType = lazy.EnigmailArmor.locateArmoredBlock(
        keyBlock,
        0,
        "",
        beginIndexObj,
        endIndexObj,
        {}
      );
      if (!blockType) {
        errorMsgObj.value = lazy.l10n.formatValueSync("no-pgp-block");
        return 1;
      }

      if (blockType.search(/^(PUBLIC|PRIVATE) KEY BLOCK$/) !== 0) {
        errorMsgObj.value = lazy.l10n.formatValueSync("not-first-block");
        return 1;
      }

      pgpBlock = keyBlock.substr(
        beginIndexObj.value,
        endIndexObj.value - beginIndexObj.value + 1
      );
    }

    if (askToConfirm) {
      if (
        !lazy.EnigmailDialog.confirmDlg(
          parent,
          lazy.l10n.formatValueSync("import-key-confirm"),
          lazy.l10n.formatValueSync("key-man-button-import")
        )
      ) {
        errorMsgObj.value = lazy.l10n.formatValueSync("fail-cancel");
        return -1;
      }
    }

    if (minimizeKey) {
      throw new Error("importKeyAsync with minimizeKey: not implemented");
    }

    const cApi = lazy.EnigmailCryptoAPI();
    let result = undefined;
    let tryAgain;
    let permissive = false;
    do {
      // strict on first attempt, permissive on optional second attempt
      let blockParam = isBinary ? keyBlock : pgpBlock;

      result = await cApi.importPubkeyBlockAutoAcceptAPI(
        parent,
        blockParam,
        acceptance,
        permissive,
        limitedUids
      );

      tryAgain = false;
      let failed =
        !result ||
        result.exitCode ||
        !result.importedKeys ||
        !result.importedKeys.length;
      if (failed) {
        if (allowPermissiveFallbackWithPrompt && !permissive) {
          let agreed = lazy.EnigmailDialog.confirmDlg(
            parent,
            lazy.l10n.formatValueSync("confirm-permissive-import")
          );
          if (agreed) {
            permissive = true;
            tryAgain = true;
          }
        } else if (askToConfirm) {
          // if !askToConfirm the caller is responsible to handle the error
          lazy.EnigmailDialog.alert(
            parent,
            lazy.l10n.formatValueSync("import-keys-failed")
          );
        }
      }
    } while (tryAgain);

    if (!result) {
      result = {};
      result.exitCode = -1;
    } else if (result.importedKeys) {
      if (importedKeysObj) {
        importedKeysObj.value = result.importedKeys;
      }
      if (result.importedKeys.length > 0) {
        EnigmailKeyRing.updateKeys(result.importedKeys);
      }
    }

    EnigmailKeyRing.clearCache();
    return result.exitCode;
  },

  async importKeyDataWithConfirmation(
    window,
    preview,
    keyData,
    isBinary,
    limitedUids = []
  ) {
    let somethingWasImported = false;
    if (preview.length > 0) {
      let outParam = {};
      if (lazy.EnigmailDialog.confirmPubkeyImport(window, preview, outParam)) {
        let exitStatus;
        let errorMsgObj = {};
        try {
          exitStatus = await EnigmailKeyRing.importKeyAsync(
            window,
            false,
            keyData,
            isBinary,
            "",
            errorMsgObj,
            null,
            false,
            limitedUids,
            true,
            outParam.acceptance
          );
        } catch (ex) {
          console.debug(ex);
        }

        if (exitStatus === 0) {
          let keyList = preview.map(a => a.id);
          lazy.EnigmailDialog.keyImportDlg(window, keyList);
          somethingWasImported = true;
        } else {
          lazy.l10n.formatValue("fail-key-import").then(value => {
            lazy.EnigmailDialog.alert(window, value + "\n" + errorMsgObj.value);
          });
        }
      }
    } else {
      lazy.l10n.formatValue("no-key-found2").then(value => {
        lazy.EnigmailDialog.alert(window, value);
      });
    }
    return somethingWasImported;
  },

  async importKeyArrayWithConfirmation(
    window,
    keyArray,
    isBinary,
    limitedUids = []
  ) {
    let somethingWasImported = false;
    if (keyArray.length > 0) {
      let outParam = {};
      if (lazy.EnigmailDialog.confirmPubkeyImport(window, keyArray, outParam)) {
        let importedKeys = [];
        let allErrors = "";
        for (let key of keyArray) {
          let exitStatus;
          let errorMsgObj = {};
          try {
            exitStatus = await EnigmailKeyRing.importKeyAsync(
              window,
              false,
              key.pubKey,
              isBinary,
              "",
              errorMsgObj,
              null,
              false,
              limitedUids,
              true,
              outParam.acceptance
            );
          } catch (ex) {
            console.debug(ex);
          }

          if (exitStatus === 0) {
            importedKeys.push(key.id);
          } else {
            allErrors += "\n" + errorMsgObj.value;
          }
        }

        if (importedKeys.length) {
          lazy.EnigmailDialog.keyImportDlg(window, importedKeys);
          somethingWasImported = true;
        } else {
          lazy.l10n.formatValue("fail-key-import").then(value => {
            lazy.EnigmailDialog.alert(window, value + allErrors);
          });
        }
      }
    } else {
      lazy.l10n.formatValue("no-key-found2").then(value => {
        lazy.EnigmailDialog.alert(window, value);
      });
    }
    return somethingWasImported;
  },

  async importKeyDataSilent(window, keyData, isBinary, onlyFingerprint = "") {
    let errorMsgObj = {};
    let exitStatus = -1;
    try {
      exitStatus = await EnigmailKeyRing.importKeyAsync(
        window,
        false,
        keyData,
        isBinary,
        "",
        errorMsgObj,
        undefined,
        false,
        onlyFingerprint ? [onlyFingerprint] : []
      );
      this.clearCache();
    } catch (ex) {
      console.debug(ex);
    }
    return exitStatus === 0;
  },

  /**
   * Generate a new key pair with GnuPG
   *
   * @name:       String     - name part of UID
   * @comment:    String     - comment part of UID (brackets are added)
   * @comment:    String     - email part of UID (<> will be added)
   * @expiryDate: Number     - Unix timestamp of key expiry date; 0 if no expiry
   * @keyLength:  Number     - size of key in bytes (e.g 4096)
   * @keyType:    String     - RSA or ECC
   * @passphrase: String     - password; null if no password
   * @listener:   Object     - {
   *                             function onDataAvailable(data) {...},
   *                             function onStopRequest(exitCode) {...}
   *                           }
   *
   * @return: handle to process
   */
  generateKey(
    name,
    comment,
    email,
    expiryDate,
    keyLength,
    keyType,
    passphrase,
    listener
  ) {
    lazy.EnigmailLog.WRITE("keyRing.jsm: generateKey:\n");
    throw new Error("Not implemented");
  },

  isValidForEncryption(keyObj) {
    return this._getValidityLevelIgnoringAcceptance(keyObj, null, false) == 0;
  },

  // returns an acceptanceLevel from -1 to 3,
  // or -2 for "doesn't match email" or "not usable"
  async isValidKeyForRecipient(keyObj, emailAddr, allowExpired) {
    if (!emailAddr) {
      return -2;
    }

    let level = this._getValidityLevelIgnoringAcceptance(
      keyObj,
      emailAddr,
      allowExpired
    );
    if (level < 0) {
      return level;
    }
    return this._getAcceptanceLevelForEmail(keyObj, emailAddr);
  },

  /**
   * This function checks that given key is not expired, not revoked,
   * and that a (related) encryption (sub-)key is available.
   * If an email address is provided by the caller, the function
   * also requires that a matching user id is available.
   *
   * @param {object} keyObj - the key to check
   * @param {string} [emailAddr] - optional email address
   * @returns {Integer} - validity level, negative for invalid,
   *                     0 if no problem were found (neutral)
   */
  _getValidityLevelIgnoringAcceptance(keyObj, emailAddr, allowExpired) {
    if (keyObj.keyTrust == "r") {
      return -2;
    }

    if (keyObj.keyTrust == "e" && !allowExpired) {
      return -2;
    }

    if (emailAddr) {
      let uidMatch = false;
      for (let uid of keyObj.userIds) {
        if (uid.type !== "uid") {
          continue;
        }

        if (
          lazy.EnigmailFuncs.getEmailFromUserID(uid.userId).toLowerCase() ===
          emailAddr
        ) {
          uidMatch = true;
          break;
        }
      }
      if (!uidMatch) {
        return -2;
      }
    }

    // key valid for encryption?
    if (!keyObj.keyUseFor.includes("E")) {
      return -2;
    }

    // Ensure we have at least one key usable for encryption
    // that is not expired/revoked.

    // We already checked above, the primary key is not revoked/expired
    let foundGoodEnc = keyObj.keyUseFor.match(/e/);
    if (!foundGoodEnc) {
      for (let aSub of keyObj.subKeys) {
        if (aSub.keyTrust == "r") {
          continue;
        }
        if (aSub.keyTrust == "e" && !allowExpired) {
          continue;
        }
        if (aSub.keyUseFor.match(/e/)) {
          foundGoodEnc = true;
          break;
        }
      }
    }

    if (!foundGoodEnc) {
      return -2;
    }

    return 0; // no problem found
  },

  async _getAcceptanceLevelForEmail(keyObj, emailAddr) {
    let acceptanceLevel;
    if (keyObj.secretAvailable) {
      let isPersonal = await lazy.PgpSqliteDb2.isAcceptedAsPersonalKey(
        keyObj.fpr
      );
      if (isPersonal) {
        acceptanceLevel = 3;
      } else {
        acceptanceLevel = -1; // rejected
      }
    } else {
      acceptanceLevel = await this.getKeyAcceptanceLevelForEmail(
        keyObj,
        emailAddr
      );
    }

    return acceptanceLevel;
  },

  /**
   * try to find valid key for encryption to passed email address
   *
   * @param details if not null returns error in details.msg
   *
   * @return: found key ID (without leading "0x") or null
   */
  async getValidKeyForRecipient(emailAddr, details) {
    lazy.EnigmailLog.DEBUG(
      'keyRing.jsm: getValidKeyForRecipient(): emailAddr="' + emailAddr + '"\n'
    );
    const FULLTRUSTLEVEL = 2;

    emailAddr = emailAddr.toLowerCase();

    var foundKeyId = null;
    var foundAcceptanceLevel = null;

    let k = this.getAllKeys(null, null);
    let keyList = k.keyList;

    for (let keyObj of keyList) {
      let acceptanceLevel = await this.isValidKeyForRecipient(
        keyObj,
        emailAddr,
        false
      );

      // immediately return as best match, if a fully or ultimately
      // trusted key is found
      if (acceptanceLevel >= FULLTRUSTLEVEL) {
        return keyObj.keyId;
      }

      if (acceptanceLevel < 1) {
        continue;
      }

      if (foundKeyId != keyObj.keyId) {
        // different matching key found
        if (
          !foundKeyId ||
          (foundKeyId && acceptanceLevel > foundAcceptanceLevel)
        ) {
          foundKeyId = keyObj.keyId;
          foundAcceptanceLevel = acceptanceLevel;
        }
      }
    }

    if (!foundKeyId) {
      if (details) {
        details.msg = "ProblemNoKey";
      }
      let msg =
        "no valid encryption key with enough trust level for '" +
        emailAddr +
        "' found";
      lazy.EnigmailLog.DEBUG(
        "keyRing.jsm: getValidKeyForRecipient():  " + msg + "\n"
      );
    } else {
      lazy.EnigmailLog.DEBUG(
        "keyRing.jsm: getValidKeyForRecipient():  key=" +
          foundKeyId +
          '" found\n'
      );
    }
    return foundKeyId;
  },

  getAcceptanceStringFromAcceptanceLevel(level) {
    switch (level) {
      case 3:
        return "personal";
      case 2:
        return "verified";
      case 1:
        return "unverified";
      case -1:
        return "rejected";
      case 0:
      default:
        return "undecided";
    }
  },

  async getKeyAcceptanceLevelForEmail(keyObj, email) {
    if (keyObj.secretAvailable) {
      throw new Error(
        `Unexpected private key parameter; keyObj.fpr=${keyObj.fpr}`
      );
    }

    let acceptanceLevel = 0;

    let acceptanceResult = {};
    try {
      await lazy.PgpSqliteDb2.getAcceptance(
        keyObj.fpr,
        email,
        acceptanceResult
      );
    } catch (ex) {
      console.debug("getAcceptance failed: " + ex);
      return null;
    }

    if (acceptanceResult.fingerprintAcceptance == "rejected") {
      // rejecting is always global for all email addresses
      return -1;
    }

    if (acceptanceResult.emailDecided) {
      switch (acceptanceResult.fingerprintAcceptance) {
        case "verified":
          acceptanceLevel = 2;
          break;
        case "unverified":
          acceptanceLevel = 1;
          break;
        default:
        case "undecided":
          acceptanceLevel = 0;
          break;
      }
    }
    return acceptanceLevel;
  },

  async getKeyAcceptanceForEmail(keyObj, email) {
    let acceptanceResult = {};

    try {
      await lazy.PgpSqliteDb2.getAcceptance(
        keyObj.fpr,
        email,
        acceptanceResult
      );
    } catch (ex) {
      console.debug("getAcceptance failed: " + ex);
      return null;
    }

    if (acceptanceResult.fingerprintAcceptance == "rejected") {
      // rejecting is always global for all email addresses
      return acceptanceResult.fingerprintAcceptance;
    }

    if (acceptanceResult.emailDecided) {
      switch (acceptanceResult.fingerprintAcceptance) {
        case "verified":
        case "unverified":
        case "undecided":
          return acceptanceResult.fingerprintAcceptance;
      }
    }

    return "undecided";
  },

  /**
   *  Determine the key ID for a set of given addresses
   *
   * @param {Array<string>} addresses: email addresses
   * @param {object} details: - holds details for invalid keys:
   *                                   - errArray: {
   *                                       addr {String}: email addresses
   *                                       msg {String}:  related error
   *                                       }
   *
   * @returns {boolean}: true if at least one key missing; false otherwise
   */
  async getValidKeysForAllRecipients(addresses, details) {
    if (!addresses) {
      return null;
    }
    // check whether each address is or has a key:
    let keyMissing = false;
    if (details) {
      details.errArray = [];
    }
    for (let i = 0; i < addresses.length; i++) {
      let addr = addresses[i];
      if (!addr) {
        continue;
      }
      // try to find current address in key list:
      var errMsg = null;
      addr = addr.toLowerCase();
      if (!addr.includes("@")) {
        throw new Error(
          "getValidKeysForAllRecipients unexpected lookup for non-email addr: " +
            addr
        );
      }

      let aliasKeyList = this.getAliasKeyList(addr);
      if (aliasKeyList) {
        for (let entry of aliasKeyList) {
          let foundError = true;

          let key;
          if ("fingerprint" in entry) {
            key = this.getKeyById(entry.fingerprint);
          } else if ("id" in entry) {
            key = this.getKeyById(entry.id);
          }
          if (key && this.isValidForEncryption(key)) {
            let acceptanceResult =
              await lazy.PgpSqliteDb2.getFingerprintAcceptance(null, key.fpr);
            // If we don't have acceptance info for the key yet,
            // or, we have it and it isn't rejected,
            // then we accept the key for using it in alias definitions.
            if (!acceptanceResult || acceptanceResult != "rejected") {
              foundError = false;
            }
          }

          if (foundError) {
            keyMissing = true;
            if (details) {
              let detEl = {};
              detEl.addr = addr;
              detEl.msg = "alias problem";
              details.errArray.push(detEl);
            }
            console.debug(
              'keyRing.jsm: getValidKeysForAllRecipients(): alias key list for="' +
                addr +
                ' refers to missing or unusable key"\n'
            );
          }
        }

        // skip the lookup for direct matching keys by email
        continue;
      }

      // try email match:
      var addrErrDetails = {};
      let foundKeyId = await this.getValidKeyForRecipient(addr, addrErrDetails);
      if (details && addrErrDetails.msg) {
        errMsg = addrErrDetails.msg;
      }
      if (!foundKeyId) {
        // no key for this address found
        keyMissing = true;
        if (details) {
          if (!errMsg) {
            errMsg = "ProblemNoKey";
          }
          var detailsElem = {};
          detailsElem.addr = addr;
          detailsElem.msg = errMsg;
          details.errArray.push(detailsElem);
        }
        lazy.EnigmailLog.DEBUG(
          'keyRing.jsm: getValidKeysForAllRecipients(): no single valid key found for="' +
            addr +
            '"\n'
        );
      }
    }
    return keyMissing;
  },

  async getMultValidKeysForOneRecipient(emailAddr, allowExpired = false) {
    lazy.EnigmailLog.DEBUG(
      'keyRing.jsm: getMultValidKeysForOneRecipient(): emailAddr="' +
        emailAddr +
        '"\n'
    );
    emailAddr = emailAddr.toLowerCase();
    if (emailAddr.startsWith("<") && emailAddr.endsWith(">")) {
      emailAddr = emailAddr.substr(1, emailAddr.length - 2);
    }

    let found = [];

    let k = this.getAllKeys(null, null);
    let keyList = k.keyList;

    for (let keyObj of keyList) {
      let acceptanceLevel = await this.isValidKeyForRecipient(
        keyObj,
        emailAddr,
        allowExpired
      );
      if (acceptanceLevel < -1) {
        continue;
      }
      if (!keyObj.secretAvailable) {
        keyObj.acceptance =
          this.getAcceptanceStringFromAcceptanceLevel(acceptanceLevel);
      }
      found.push(keyObj);
    }
    return found;
  },

  /**
   * If the given email address has an alias definition, return its
   * list of key identifiers.
   *
   * The function will prefer a match to an exact email alias.
   * If no email alias could be found, the function will search for
   * an alias rule that matches the domain.
   *
   * @param {string} email - The email address to look up
   * @returns {[]} - An array with alias key identifiers found for the
   *                input, or null if no alias matches the address.
   */
  getAliasKeyList(email) {
    let ekl = lazy.OpenPGPAlias.getEmailAliasKeyList(email);
    if (ekl) {
      return ekl;
    }

    return lazy.OpenPGPAlias.getDomainAliasKeyList(email);
  },

  /**
   * Return the fingerprint of each usable alias key for the given
   * email address.
   *
   * @param {string[]} keyList - Array of key identifiers
   * @returns {string[]} An array with fingerprints of all alias keys,
   *                    or an empty array on failure.
   */
  getAliasKeys(keyList) {
    let keys = [];

    for (let entry of keyList) {
      let key;
      let lookupId;
      if ("fingerprint" in entry) {
        lookupId = entry.fingerprint;
        key = this.getKeyById(entry.fingerprint);
      } else if ("id" in entry) {
        lookupId = entry.id;
        key = this.getKeyById(entry.id);
      }
      if (key && this.isValidForEncryption(key)) {
        keys.push(key.fpr);
      } else {
        let reason = key ? "not usable" : "missing";
        console.debug(
          "getAliasKeys: key for identifier: " + lookupId + " is " + reason
        );
        return [];
      }
    }

    return keys;
  },

  /**
   * Rebuild the quick access search indexes after the key list was loaded
   */
  rebuildKeyIndex() {
    gKeyIndex = [];
    gSubkeyIndex = [];

    for (let i in gKeyListObj.keyList) {
      let k = gKeyListObj.keyList[i];
      gKeyIndex[k.keyId] = k;
      gKeyIndex[k.fpr] = k;
      gKeyIndex[k.keyId.substr(-8, 8)] = k;

      // add subkeys
      for (let j in k.subKeys) {
        gSubkeyIndex[k.subKeys[j].keyId] = k;
      }
    }
  },

  /**
   * Update specific keys in the key cache. If the key objects don't exist yet,
   * they will be created
   *
   * @param keys: Array of String - key IDs or fingerprints
   */
  updateKeys(keys) {
    lazy.EnigmailLog.DEBUG("keyRing.jsm: updateKeys(" + keys.join(",") + ")\n");
    let uniqueKeys = [...new Set(keys)]; // make key IDs unique

    deleteKeysFromCache(uniqueKeys);

    if (gKeyListObj.keyList.length > 0) {
      loadKeyList(null, null, 1, uniqueKeys);
    } else {
      loadKeyList(null, null, 1);
    }

    lazy.EnigmailWindows.keyManReloadKeys();
  },

  findRevokedPersonalKeysByEmail(email) {
    let res = [];
    if (email === "") {
      return res;
    }
    email = email.toLowerCase();
    this.getAllKeys(); // ensure keylist is loaded;
    for (let k of gKeyListObj.keyList) {
      if (k.keyTrust != "r") {
        continue;
      }
      let hasAdditionalEmail = false;
      let isMatch = false;

      for (let userId of k.userIds) {
        if (userId.type !== "uid") {
          continue;
        }

        let emailInUid = lazy.EnigmailFuncs.getEmailFromUserID(
          userId.userId
        ).toLowerCase();
        if (emailInUid == email) {
          isMatch = true;
        } else {
          // For privacy reasons, exclude revoked keys that point to
          // other email addresses.
          hasAdditionalEmail = true;
          break;
        }
      }

      if (isMatch && !hasAdditionalEmail) {
        res.push("0x" + k.fpr);
      }
    }
    return res;
  },

  getAutocryptKey(keyId, email) {
    let keyObj = this.getKeyById(keyId);
    if (
      !keyObj ||
      !keyObj.subKeys.length ||
      !keyObj.userIds.length ||
      !keyObj.keyUseFor.includes("s")
    ) {
      return null;
    }
    let uid = keyObj.getUserIdWithEmail(email);
    if (!uid) {
      return null;
    }
    return lazy.RNP.getAutocryptKeyB64(keyId, null, uid.userId);
  },

  alreadyCheckedGnuPG: new Set(),

  /**
   * @typedef {object} EncryptionKeyMeta
   * @property {string} readiness - one of
   *   "accepted", "expiredAccepted",
   *   "otherAccepted", "expiredOtherAccepted",
   *   "undecided", "expiredUndecided",
   *   "rejected", "expiredRejected",
   *   "collected", "rejectedPersonal", "revoked", "alias"
   *
   *   The meaning of "otherAccepted" is: the key is undecided for this
   *   email address, but accepted for at least on other address.
   *
   * @property {KeyObj} keyObj -
   *   undefined if an alias
   * @property {CollectedKey} collectedKey -
   *   undefined if not a collected key or an alias
   */

  /**
   * Obtain information on the availability of recipient keys
   * for the given email address, and the status of the keys.
   *
   * No key details are returned for alias keys.
   *
   * If readiness is "collected" it's an unexpired key that hasn't
   * been imported into permanent storage (keyring) yet.
   *
   * @param {string} email - email address
   *
   * @returns {EncryptionKeyMeta[]} - meta information for an encryption key
   *
   *   Callers can filter it keys according to needs, like
   *
   *   let meta = getEncryptionKeyMeta("foo@example.com");
   *   let readyToUse = meta.filter(k => k.readiness == "accepted" || k.readiness == "alias");
   *   let hasAlias = meta.filter(k => k.readiness == "alias");
   *   let accepted = meta.filter(k => k.readiness == "accepted");
   *   let expiredAccepted = meta.filter(k => k.readiness == "expiredAccepted");
   *   let unaccepted = meta.filter(k => k.readiness == "undecided" || k.readiness == "rejected" );
   *   let expiredUnaccepted = meta.filter(k => k.readiness == "expiredUndecided" || k.readiness == "expiredRejected");
   *   let unacceptedNotYetImported = meta.filter(k => k.readiness == "collected");
   *   let invalidKeys = meta.some(k => k.readiness == "revoked" || k.readiness == "rejectedPersonal" || );
   *
   *   let keyReadiness = meta.groupBy(({readiness}) => readiness);
   */
  async getEncryptionKeyMeta(email) {
    email = email.toLowerCase();

    let result = [];

    result.hasAliasRule = lazy.OpenPGPAlias.hasAliasDefinition(email);
    if (result.hasAliasRule) {
      let keyMeta = {};
      keyMeta.readiness = "alias";
      result.push(keyMeta);
      return result;
    }

    let fingerprintsInKeyring = new Set();

    for (let keyObj of this.getAllKeys(null, null).keyList) {
      let keyMeta = {};
      keyMeta.keyObj = keyObj;

      let uidMatch = false;
      for (let uid of keyObj.userIds) {
        if (uid.type !== "uid") {
          continue;
        }
        // key valid for encryption?
        if (!keyObj.keyUseFor.includes("E")) {
          continue;
        }

        if (
          lazy.EnigmailFuncs.getEmailFromUserID(uid.userId).toLowerCase() ===
          email
        ) {
          uidMatch = true;
          break;
        }
      }
      if (!uidMatch) {
        continue;
      }
      fingerprintsInKeyring.add(keyObj.fpr);

      if (keyObj.keyTrust == "r") {
        keyMeta.readiness = "revoked";
        result.push(keyMeta);
        continue;
      }
      let isExpired = keyObj.keyTrust == "e";

      // Ensure we have at least one primary key or subkey usable for
      // encryption that is not expired/revoked.
      // We already checked above, the primary key is not revoked.
      // If the primary key is good for encryption, we don't need to
      // check subkeys.
      if (!keyObj.keyUseFor.match(/e/)) {
        let hasExpiredSubkey = false;
        let hasRevokedSubkey = false;
        let hasUsableSubkey = false;

        for (let aSub of keyObj.subKeys) {
          if (!aSub.keyUseFor.match(/e/)) {
            continue;
          }
          if (aSub.keyTrust == "e") {
            hasExpiredSubkey = true;
          } else if (aSub.keyTrust == "r") {
            hasRevokedSubkey = true;
          } else {
            hasUsableSubkey = true;
          }
        }

        if (!hasUsableSubkey) {
          if (hasExpiredSubkey) {
            isExpired = true;
          } else if (hasRevokedSubkey) {
            keyMeta.readiness = "revoked";
            result.push(keyMeta);
            continue;
          }
        }
      }

      if (keyObj.secretAvailable) {
        let isPersonal = await lazy.PgpSqliteDb2.isAcceptedAsPersonalKey(
          keyObj.fpr
        );
        if (isPersonal) {
          keyMeta.readiness = "accepted";
        } else {
          // We don't allow encrypting to rejected secret/personal keys.
          keyMeta.readiness = "rejectedPersonal";
          result.push(keyMeta);
          continue;
        }
      } else {
        let acceptanceLevel = await this.getKeyAcceptanceLevelForEmail(
          keyObj,
          email
        );
        switch (acceptanceLevel) {
          case 1:
          case 2:
            keyMeta.readiness = isExpired ? "expiredAccepted" : "accepted";
            break;
          case -1:
            keyMeta.readiness = isExpired ? "expiredRejected" : "rejected";
            break;
          case 0:
          default:
            let other = await lazy.PgpSqliteDb2.getFingerprintAcceptance(
              null,
              keyObj.fpr
            );
            if (other == "verified" || other == "unverified") {
              // If the check for the email returned undecided, but
              // overall the key is marked as accepted, it means that
              // the key is only accepted for another email address.
              keyMeta.readiness = isExpired
                ? "expiredOtherAccepted"
                : "otherAccepted";
            } else {
              keyMeta.readiness = isExpired ? "expiredUndecided" : "undecided";
            }
            break;
        }
      }
      result.push(keyMeta);
    }

    if (
      Services.prefs.getBoolPref("mail.openpgp.allow_external_gnupg") &&
      Services.prefs.getBoolPref("mail.openpgp.fetch_pubkeys_from_gnupg") &&
      !this.alreadyCheckedGnuPG.has(email)
    ) {
      this.alreadyCheckedGnuPG.add(email);
      let keysFromGnuPGMap = lazy.GPGME.getPublicKeysForEmail(email);
      for (let aFpr of keysFromGnuPGMap.keys()) {
        let oldKey = this.getKeyById(aFpr);
        let gpgKeyData = keysFromGnuPGMap.get(aFpr);
        if (oldKey) {
          await this.importKeyDataSilent(null, gpgKeyData, false);
        } else {
          let k = await lazy.RNP.getKeyListFromKeyBlockImpl(gpgKeyData);
          if (!k) {
            continue;
          }
          if (k.length != 1) {
            continue;
          }
          let db = await lazy.CollectedKeysDB.getInstance();
          // If key is known in the db: merge + update.
          let key = await db.mergeExisting(k[0], gpgKeyData, {
            uri: "",
            type: "gnupg",
          });
          await db.storeKey(key);
        }
      }
    }

    let collDB = await lazy.CollectedKeysDB.getInstance();
    let coll = await collDB.findKeysForEmail(email);
    for (let c of coll) {
      let k = await lazy.RNP.getKeyListFromKeyBlockImpl(c.pubKey);
      if (!k) {
        continue;
      }
      if (k.length != 1) {
        // Past code could have store key blocks that contained
        // multiple entries. Ignore and delete.
        collDB.deleteKey(k[0].fpr);
        continue;
      }

      let deleteFromCollected = false;

      if (fingerprintsInKeyring.has(k[0].fpr)) {
        deleteFromCollected = true;
      } else {
        let trust = k[0].keyTrust;
        if (trust == "r" || trust == "e") {
          deleteFromCollected = true;
        }
      }

      if (!deleteFromCollected) {
        // Ensure we have at least one primary key or subkey usable for
        // encryption that is not expired/revoked.
        // If the primary key is good for encryption, we don't need to
        // check subkeys.

        if (!k[0].keyUseFor.match(/e/)) {
          let hasUsableSubkey = false;

          for (let aSub of k[0].subKeys) {
            if (!aSub.keyUseFor.match(/e/)) {
              continue;
            }
            if (aSub.keyTrust != "e" && aSub.keyTrust != "r") {
              hasUsableSubkey = true;
              break;
            }
          }

          if (!hasUsableSubkey) {
            deleteFromCollected = true;
          }
        }
      }

      if (deleteFromCollected) {
        collDB.deleteKey(k[0].fpr);
        continue;
      }

      let keyMeta = {};
      keyMeta.readiness = "collected";
      keyMeta.keyObj = k[0];
      keyMeta.collectedKey = c;

      result.push(keyMeta);
    }

    return result;
  },
}; //  EnigmailKeyRing

/************************ INTERNAL FUNCTIONS ************************/

function sortByUserId(keyListObj, sortDirection) {
  return function (a, b) {
    return a.userId < b.userId ? -sortDirection : sortDirection;
  };
}

const sortFunctions = {
  keyid(keyListObj, sortDirection) {
    return function (a, b) {
      return a.keyId < b.keyId ? -sortDirection : sortDirection;
    };
  },

  keyidshort(keyListObj, sortDirection) {
    return function (a, b) {
      return a.keyId.substr(-8, 8) < b.keyId.substr(-8, 8)
        ? -sortDirection
        : sortDirection;
    };
  },

  fpr(keyListObj, sortDirection) {
    return function (a, b) {
      return keyListObj.keyList[a.keyNum].fpr < keyListObj.keyList[b.keyNum].fpr
        ? -sortDirection
        : sortDirection;
    };
  },

  keytype(keyListObj, sortDirection) {
    return function (a, b) {
      return keyListObj.keyList[a.keyNum].secretAvailable <
        keyListObj.keyList[b.keyNum].secretAvailable
        ? -sortDirection
        : sortDirection;
    };
  },

  validity(keyListObj, sortDirection) {
    return function (a, b) {
      return lazy.EnigmailTrust.trustLevelsSorted().indexOf(
        lazy.EnigmailTrust.getTrustCode(keyListObj.keyList[a.keyNum])
      ) <
        lazy.EnigmailTrust.trustLevelsSorted().indexOf(
          lazy.EnigmailTrust.getTrustCode(keyListObj.keyList[b.keyNum])
        )
        ? -sortDirection
        : sortDirection;
    };
  },

  trust(keyListObj, sortDirection) {
    return function (a, b) {
      return lazy.EnigmailTrust.trustLevelsSorted().indexOf(
        keyListObj.keyList[a.keyNum].ownerTrust
      ) <
        lazy.EnigmailTrust.trustLevelsSorted().indexOf(
          keyListObj.keyList[b.keyNum].ownerTrust
        )
        ? -sortDirection
        : sortDirection;
    };
  },

  created(keyListObj, sortDirection) {
    return function (a, b) {
      return keyListObj.keyList[a.keyNum].keyCreated <
        keyListObj.keyList[b.keyNum].keyCreated
        ? -sortDirection
        : sortDirection;
    };
  },

  expiry(keyListObj, sortDirection) {
    return function (a, b) {
      return keyListObj.keyList[a.keyNum].expiryTime <
        keyListObj.keyList[b.keyNum].expiryTime
        ? -sortDirection
        : sortDirection;
    };
  },
};

function getSortFunction(type, keyListObj, sortDirection) {
  return (sortFunctions[type] || sortByUserId)(keyListObj, sortDirection);
}

/**
 * Load the key list into memory and return it sorted by a specified column
 *
 * @param win        - |object|  holding the parent window for displaying error messages
 * @param sortColumn - |string|  containing the column name for sorting. One of:
 *                               userid, keyid, keyidshort, fpr, keytype, validity, trust, created, expiry.
 *                              Null will sort by userid.
 * @param sortDirection - |number| 1 = ascending / -1 = descending
 * @param onlyKeys   - |array| of Strings: if defined, only (re-)load selected key IDs
 *
 * no return value
 */
function loadKeyList(win, sortColumn, sortDirection, onlyKeys = null) {
  lazy.EnigmailLog.DEBUG("keyRing.jsm: loadKeyList( " + onlyKeys + ")\n");

  if (gLoadingKeys) {
    waitForKeyList();
    return;
  }
  gLoadingKeys = true;

  try {
    const cApi = lazy.EnigmailCryptoAPI();
    cApi
      .getKeys(onlyKeys)
      .then(keyList => {
        createAndSortKeyList(
          keyList,
          sortColumn,
          sortDirection,
          onlyKeys === null
        );
        gLoadingKeys = false;
      })
      .catch(e => {
        lazy.EnigmailLog.ERROR(`keyRing.jsm: loadKeyList: error ${e}
`);
        gLoadingKeys = false;
      });
    waitForKeyList();
  } catch (ex) {
    lazy.EnigmailLog.ERROR(
      "keyRing.jsm: loadKeyList: exception: " + ex.toString()
    );
  }
}

/**
 * Update the global key sort-list (quick index to keys)
 *
 * no return value
 */
function updateSortList() {
  gKeyListObj.keySortList = [];
  for (let i = 0; i < gKeyListObj.keyList.length; i++) {
    let keyObj = gKeyListObj.keyList[i];
    gKeyListObj.keySortList.push({
      userId: keyObj.userId ? keyObj.userId.toLowerCase() : "",
      keyId: keyObj.keyId,
      fpr: keyObj.fpr,
      keyNum: i,
    });
  }
}

/**
 * Delete a set of keys from the key cache. Does not rebuild key indexes.
 * Not found keys are skipped.
 *
 * @param keyList: Array of Strings: key IDs (or fpr) to delete
 *
 * @returns Array of deleted key objects
 */

function deleteKeysFromCache(keyList) {
  lazy.EnigmailLog.DEBUG(
    "keyRing.jsm: deleteKeysFromCache(" + keyList.join(",") + ")\n"
  );

  let deleted = [];
  let foundKeys = [];
  for (let keyId of keyList) {
    let k = EnigmailKeyRing.getKeyById(keyId, true);
    if (k) {
      foundKeys.push(k);
    }
  }

  for (let k of foundKeys) {
    let foundIndex = -1;
    for (let i = 0; i < gKeyListObj.keyList.length; i++) {
      if (gKeyListObj.keyList[i].fpr == k.fpr) {
        foundIndex = i;
        break;
      }
    }
    if (foundIndex >= 0) {
      gKeyListObj.keyList.splice(foundIndex, 1);
      deleted.push(k);
    }
  }

  return deleted;
}

function createAndSortKeyList(
  keyList,
  sortColumn,
  sortDirection,
  resetKeyCache
) {
  lazy.EnigmailLog.DEBUG("keyRing.jsm: createAndSortKeyList()\n");

  if (typeof sortColumn !== "string") {
    sortColumn = "userid";
  }
  if (!sortDirection) {
    sortDirection = 1;
  }

  if (!("keyList" in gKeyListObj) || resetKeyCache) {
    gKeyListObj.keyList = [];
    gKeyListObj.keySortList = [];
    gKeyListObj.trustModel = "?";
  }

  gKeyListObj.keyList = gKeyListObj.keyList.concat(
    keyList.map(k => {
      return lazy.newEnigmailKeyObj(k);
    })
  );

  // update the quick index for sorting keys
  updateSortList();

  // create a hash-index on key ID (8 and 16 characters and fingerprint)
  // in a single array

  EnigmailKeyRing.rebuildKeyIndex();

  gKeyListObj.keySortList.sort(
    getSortFunction(sortColumn.toLowerCase(), gKeyListObj, sortDirection)
  );
}

/*
function runKeyUsabilityCheck() {
  EnigmailLog.DEBUG("keyRing.jsm: runKeyUsabilityCheck()\n");

  setTimeout(function() {
    try {
      let msg = getKeyUsability().keyExpiryCheck();

      if (msg && msg.length > 0) {
        EnigmailDialog.info(null, msg);
      } else {
        getKeyUsability().checkOwnertrust();
      }
    } catch (ex) {
      EnigmailLog.DEBUG(
        "keyRing.jsm: runKeyUsabilityCheck: exception " +
          ex.message +
          "\n" +
          ex.stack +
          "\n"
      );
    }
  }, 60 * 1000); // 1 minute
}
*/

function waitForKeyList() {
  let mainThread = Services.tm.mainThread;
  while (gLoadingKeys) {
    mainThread.processNextEvent(true);
  }
}
