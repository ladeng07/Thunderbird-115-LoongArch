/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// from enigmailKeyManager.js:
/* global l10n */

"use strict";

var { CommonUtils } = ChromeUtils.importESModule(
  "resource://services-common/utils.sys.mjs"
);
var { EnigmailFuncs } = ChromeUtils.import(
  "chrome://openpgp/content/modules/funcs.jsm"
);
var { EnigmailLog } = ChromeUtils.import(
  "chrome://openpgp/content/modules/log.jsm"
);
var { EnigmailKey } = ChromeUtils.import(
  "chrome://openpgp/content/modules/key.jsm"
);
var { EnigmailKeyRing } = ChromeUtils.import(
  "chrome://openpgp/content/modules/keyRing.jsm"
);
var { PgpSqliteDb2 } = ChromeUtils.import(
  "chrome://openpgp/content/modules/sqliteDb.jsm"
);
var { EnigmailCryptoAPI } = ChromeUtils.import(
  "chrome://openpgp/content/modules/cryptoAPI.jsm"
);
var { KeyLookupHelper } = ChromeUtils.import(
  "chrome://openpgp/content/modules/keyLookupHelper.jsm"
);
var { RNP, RnpPrivateKeyUnlockTracker } = ChromeUtils.import(
  "chrome://openpgp/content/modules/RNP.jsm"
);

ChromeUtils.defineESModuleGetters(this, {
  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",
});

var gModePersonal = false;

// This is the ID that was given to us as a parameter.
// Note that it might be the ID of a subkey.
var gKeyId = null;

var gUserId = null;
var gKeyList = null;
var gSigTree = null;

var gAllEmails = [];
var gOriginalAcceptedEmails = null;
var gAcceptedEmails = null;

var gHaveUnacceptedEmails = false;
var gFingerprint = "";
var gHasMissingSecret = false;

var gAcceptanceRadio = null;
var gPersonalRadio = null;

var gOriginalAcceptance;
var gOriginalPersonal;
var gUpdateAllowed = false;

let gAllEmailCheckboxes = [];
let gOkButton;

let gPrivateKeyTrackers = [];

window.addEventListener("DOMContentLoaded", onLoad);
window.addEventListener("unload", onUnload);

function onUnload() {
  releasePrivateKeys();
}

function releasePrivateKeys() {
  for (let tracker of gPrivateKeyTrackers) {
    tracker.release();
  }
  gPrivateKeyTrackers = [];
}

async function onLoad() {
  if (window.arguments[1]) {
    window.arguments[1].refresh = false;
  }

  gAcceptanceRadio = document.getElementById("acceptanceRadio");
  gPersonalRadio = document.getElementById("personalRadio");

  gKeyId = window.arguments[0].keyId;

  gOkButton = document.querySelector("dialog").getButton("accept");
  gOkButton.focus();

  await reloadData(true);

  let sepPassphraseEnabled =
    gModePersonal &&
    Services.prefs.getBoolPref("mail.openpgp.passphrases.enabled");
  document.getElementById("passphraseTab").hidden = !sepPassphraseEnabled;
  document.getElementById("passphrasePanel").hidden = !sepPassphraseEnabled;
  if (sepPassphraseEnabled) {
    await loadPassphraseProtection();
  }

  onAcceptanceChanged();
}

/***
 * Set the label text of a HTML element
 */
function setLabel(elementId, label) {
  let node = document.getElementById(elementId);
  node.setAttribute("value", label);
}

async function changeExpiry() {
  let keyObj = EnigmailKeyRing.getKeyById(gKeyId);
  if (!keyObj || !keyObj.secretAvailable) {
    return;
  }

  if (!keyObj.iSimpleOneSubkeySameExpiry()) {
    Services.prompt.alert(
      null,
      document.title,
      await document.l10n.formatValue("openpgp-cannot-change-expiry")
    );
    return;
  }

  let args = {
    keyId: keyObj.keyId,
    modified: onDataModified,
  };

  // The keyDetailsDlg can be opened from different locations, some of which
  // don't belong to the Account Settings, therefore they won't have access to
  // the gSubDialog object.
  if (parent.gSubDialog) {
    parent.gSubDialog.open(
      "chrome://openpgp/content/ui/changeExpiryDlg.xhtml",
      undefined,
      args
    );
    return;
  }

  window.openDialog(
    "chrome://openpgp/content/ui/changeExpiryDlg.xhtml",
    "",
    "dialog,modal,centerscreen,resizable",
    args
  );
}

async function refreshOnline() {
  let keyObj = EnigmailKeyRing.getKeyById(gKeyId);
  if (!keyObj) {
    return;
  }

  let imported = await KeyLookupHelper.lookupAndImportByKeyID(
    "interactive-import",
    window,
    keyObj.fpr,
    true
  );
  if (imported) {
    onDataModified();
  }
}

async function loadPassphraseProtection() {
  let keyObj = EnigmailKeyRing.getKeyById(gKeyId);
  if (!keyObj || !keyObj.secretAvailable) {
    return;
  }

  let primaryKey = RnpPrivateKeyUnlockTracker.constructFromFingerprint(
    keyObj.fpr
  );
  primaryKey.setAllowPromptingUserForPassword(false);
  primaryKey.setAllowAutoUnlockWithCachedPasswords(false);
  let isSecretForPrimaryAvailable = primaryKey.available();
  let canUnlockSecretForPrimary = false;
  if (isSecretForPrimaryAvailable) {
    await primaryKey.unlock();
    canUnlockSecretForPrimary = primaryKey.isUnlocked();
  }
  gPrivateKeyTrackers.push(primaryKey);

  let countSubkeysWithSecretAvailable = 0;
  let countSubkeysCanAutoUnlock = 0;

  for (let i = 0; i < keyObj.subKeys.length; i++) {
    let subKey = RnpPrivateKeyUnlockTracker.constructFromFingerprint(
      keyObj.subKeys[i].fpr
    );
    subKey.setAllowPromptingUserForPassword(false);
    subKey.setAllowAutoUnlockWithCachedPasswords(false);
    let isSecretForPrimaryAvailable = subKey.available();
    let canUnlockSecretForPrimary = false;
    if (isSecretForPrimaryAvailable) {
      ++countSubkeysWithSecretAvailable;
      await subKey.unlock();
      canUnlockSecretForPrimary = subKey.isUnlocked();
      if (canUnlockSecretForPrimary) {
        countSubkeysCanAutoUnlock++;
      }
      gPrivateKeyTrackers.push(subKey);
    }
  }

  let canUnlockAllKeysWhichHaveMaterialAvailable =
    (isSecretForPrimaryAvailable || canUnlockSecretForPrimary) &&
    countSubkeysWithSecretAvailable == countSubkeysCanAutoUnlock;

  let userPassphraseMode = "user-passphrase";

  let usingPP = LoginHelper.isPrimaryPasswordSet();
  let protectionMode;
  if (canUnlockAllKeysWhichHaveMaterialAvailable) {
    protectionMode = usingPP ? "primary-password" : "unprotected";
  } else {
    protectionMode = userPassphraseMode;
  }

  // Strings used here:
  //   openpgp-passphrase-status-unprotected
  //   openpgp-passphrase-status-primary-password
  //   openpgp-passphrase-status-user-passphrase
  document.l10n.setAttributes(
    document.getElementById("passphraseStatus"),
    `openpgp-passphrase-status-${protectionMode}`
  );

  // Strings used here:
  //   openpgp-passphrase-instruction-unprotected
  //   openpgp-passphrase-instruction-primary-password
  //   openpgp-passphrase-instruction-user-passphrase
  document.l10n.setAttributes(
    document.getElementById("passphraseInstruction"),
    `openpgp-passphrase-instruction-${protectionMode}`
  );

  document.getElementById("unlockBox").hidden =
    protectionMode != userPassphraseMode;
  document.getElementById("lockBox").hidden =
    protectionMode == userPassphraseMode;
  document.getElementById("usePrimaryPassword").hidden = true;
  document.getElementById("removeProtection").hidden = true;

  document.l10n.setAttributes(
    document.getElementById("setPassphrase"),
    protectionMode == userPassphraseMode
      ? "openpgp-passphrase-change"
      : "openpgp-passphrase-set"
  );

  document.getElementById("passwordInput").value = "";
  document.getElementById("passwordConfirm").value = "";
}

async function unlock() {
  let pwCache = {
    passwords: [],
  };

  for (let tracker of gPrivateKeyTrackers) {
    tracker.setAllowPromptingUserForPassword(true);
    tracker.setAllowAutoUnlockWithCachedPasswords(true);
    tracker.setPasswordCache(pwCache);
    await tracker.unlock();
    if (!tracker.isUnlocked()) {
      return;
    }
  }

  document.l10n.setAttributes(
    document.getElementById("passphraseInstruction"),
    "openpgp-passphrase-unlocked"
  );
  document.getElementById("unlockBox").hidden = true;
  document.getElementById("lockBox").hidden = false;
  document.getElementById("passwordInput").value = "";
  document.getElementById("passwordConfirm").value = "";

  document.getElementById(
    LoginHelper.isPrimaryPasswordSet()
      ? "usePrimaryPassword"
      : "removeProtection"
  ).hidden = false;

  // Necessary to set the disabled status of the button
  onPasswordInput();
}

function onPasswordInput() {
  let pw1 = document.getElementById("passwordInput").value;
  let pw2 = document.getElementById("passwordConfirm").value;

  // Disable the button if the two passwords don't match, and enable it
  // if the passwords do match.
  let disabled = pw1 != pw2 || !pw1.length;

  document.getElementById("setPassphrase").disabled = disabled;
}

async function setPassphrase() {
  let pw = document.getElementById("passwordInput").value;

  for (let tracker of gPrivateKeyTrackers) {
    tracker.setPassphrase(pw);
  }
  await RNP.saveKeyRings();

  releasePrivateKeys();
  loadPassphraseProtection();
}

async function useAutoPassphrase() {
  for (let tracker of gPrivateKeyTrackers) {
    await tracker.setAutoPassphrase();
  }
  await RNP.saveKeyRings();

  releasePrivateKeys();
  loadPassphraseProtection();
}

function onAcceptanceChanged() {
  // The check for gAcceptedEmails.size is to handle an edge case.
  // If a key was previously accepted, for an email address that is
  // now revoked, and another email address has been added,
  // then the key can be marked as accepted without any accepted
  // email address.
  // In this scenario, we must allow the user to edit the accepted
  // email addresses, even if there's just one email address available.
  // Another scenario is a data inconsistency, with accepted key,
  // but no accepted email.

  let originalAccepted = isAccepted(gOriginalAcceptance);
  let wantAccepted = isAccepted(gAcceptanceRadio.value);

  let disableEmailsTab =
    (wantAccepted &&
      gAllEmails.length < 2 &&
      gAcceptedEmails.size != 0 &&
      (!originalAccepted || !gHaveUnacceptedEmails)) ||
    !wantAccepted;

  document.getElementById("emailAddressesTab").disabled = disableEmailsTab;
  document.getElementById("emailAddressesPanel").disabled = disableEmailsTab;

  setOkButtonState();
}

function onDataModified() {
  EnigmailKeyRing.clearCache();
  enableRefresh();
  reloadData(false);
}

function isAccepted(value) {
  return value == "unverified" || value == "verified";
}

async function reloadData(firstLoad) {
  gUserId = null;

  var treeChildren = document.getElementById("keyListChildren");

  // clean lists
  while (treeChildren.firstChild) {
    treeChildren.firstChild.remove();
  }

  let keyObj = EnigmailKeyRing.getKeyById(gKeyId);
  if (!keyObj) {
    return;
  }

  let acceptanceIntroText = "";
  let acceptanceVerificationText = "";

  if (keyObj.fpr) {
    gFingerprint = keyObj.fpr;
    setLabel("fingerprint", EnigmailKey.formatFpr(keyObj.fpr));
  }

  gSigTree = document.getElementById("signatures_tree");
  let cApi = EnigmailCryptoAPI();
  let signatures = await cApi.getKeyObjSignatures(keyObj);
  gSigTree.view = new SigListView(signatures);

  document.getElementById("subkeyList").view = new SubkeyListView(keyObj);

  gUserId = keyObj.userId;

  setLabel("keyId", "0x" + keyObj.keyId);
  setLabel("keyCreated", keyObj.created);

  let keyIsExpired =
    keyObj.effectiveExpiryTime &&
    keyObj.effectiveExpiryTime < Math.floor(Date.now() / 1000);

  let expiryInfo;
  let expireArgument = null;
  let expiryInfoKey = "";
  if (keyObj.keyTrust == "r") {
    expiryInfoKey = "key-revoked-simple";
  } else if (keyObj.keyTrust == "e" || keyIsExpired) {
    expiryInfoKey = "key-expired-date";
    expireArgument = keyObj.effectiveExpiry;
  } else if (keyObj.effectiveExpiry.length === 0) {
    expiryInfoKey = "key-does-not-expire";
  } else {
    expiryInfo = keyObj.effectiveExpiry;
  }
  if (expiryInfoKey) {
    expiryInfo = l10n.formatValueSync(expiryInfoKey, {
      keyExpiry: expireArgument,
    });
  }
  setLabel("keyExpiry", expiryInfo);

  gModePersonal = keyObj.secretAvailable;

  document.getElementById("passphraseTab").hidden = !gModePersonal;
  document.getElementById("passphrasePanel").hidden = !gModePersonal;

  if (gModePersonal) {
    gPersonalRadio.removeAttribute("hidden");
    gAcceptanceRadio.setAttribute("hidden", "true");
    acceptanceIntroText = "key-accept-personal";
    let value = l10n.formatValueSync("key-type-pair");
    setLabel("keyType", value);

    gUpdateAllowed = true;
    if (firstLoad) {
      gOriginalPersonal = await PgpSqliteDb2.isAcceptedAsPersonalKey(
        keyObj.fpr
      );
      gPersonalRadio.value = gOriginalPersonal ? "personal" : "not_personal";
    }

    if (keyObj.keyTrust != "r") {
      document.getElementById("changeExpiryButton").removeAttribute("hidden");
    }
  } else {
    gPersonalRadio.setAttribute("hidden", "true");
    let value = l10n.formatValueSync("key-type-public");
    setLabel("keyType", value);

    let isStillValid = !(
      keyObj.keyTrust == "r" ||
      keyObj.keyTrust == "e" ||
      keyIsExpired
    );
    if (!isStillValid) {
      gAcceptanceRadio.setAttribute("hidden", "true");
      if (keyObj.keyTrust == "r") {
        acceptanceIntroText = "key-revoked-simple";
      } else if (keyObj.keyTrust == "e" || keyIsExpired) {
        acceptanceIntroText = "key-expired-simple";
      }
    } else {
      gAcceptanceRadio.removeAttribute("hidden");
      acceptanceIntroText = "key-do-you-accept";
      acceptanceVerificationText = "key-verification";
      gUpdateAllowed = true;

      //await RNP.calculateAcceptance(keyObj.keyId, null);

      let acceptanceResult = await PgpSqliteDb2.getFingerprintAcceptance(
        null,
        keyObj.fpr
      );

      if (firstLoad) {
        if (!acceptanceResult) {
          gOriginalAcceptance = "undecided";
        } else {
          gOriginalAcceptance = acceptanceResult;
        }
        gAcceptanceRadio.value = gOriginalAcceptance;
      }
    }

    if (firstLoad) {
      gAcceptedEmails = new Set();

      for (let i = 0; i < keyObj.userIds.length; i++) {
        if (keyObj.userIds[i].type === "uid") {
          let uidEmail = EnigmailFuncs.getEmailFromUserID(
            keyObj.userIds[i].userId
          );
          if (uidEmail) {
            gAllEmails.push(uidEmail);

            if (isAccepted(gOriginalAcceptance)) {
              let rv = {};
              await PgpSqliteDb2.getAcceptance(keyObj.fpr, uidEmail, rv);
              if (rv.emailDecided) {
                gAcceptedEmails.add(uidEmail);
              } else {
                gHaveUnacceptedEmails = true;
              }
            } else {
              // For not-yet-accepted keys, our default is to accept
              // all shown email addresses.
              gAcceptedEmails.add(uidEmail);
            }
          }
        }
      }

      // clone
      gOriginalAcceptedEmails = new Set(gAcceptedEmails);
    }
  }

  await createUidData(keyObj);

  if (acceptanceIntroText) {
    let acceptanceIntro = document.getElementById("acceptanceIntro");
    document.l10n.setAttributes(acceptanceIntro, acceptanceIntroText);
  }

  if (acceptanceVerificationText) {
    let acceptanceVerification = document.getElementById(
      "acceptanceVerification"
    );
    document.l10n.setAttributes(
      acceptanceVerification,
      acceptanceVerificationText,
      {
        addr: EnigmailFuncs.getEmailFromUserID(gUserId).toLowerCase(),
      }
    );
  }

  document.getElementById("key-detail-has-insecure").hidden =
    !keyObj.hasIgnoredAttributes;
}

function setOkButtonState() {
  let atLeastOneChecked = gAllEmailCheckboxes.some(c => c.checked);
  gOkButton.disabled = !atLeastOneChecked && isAccepted(gAcceptanceRadio.value);
}

async function createUidData(keyDetails) {
  var uidList = document.getElementById("userIds");
  while (uidList.firstChild) {
    uidList.firstChild.remove();
  }

  let primaryIdIndex = 0;

  for (let i = 0; i < keyDetails.userIds.length; i++) {
    if (keyDetails.userIds[i].type === "uid") {
      if (keyDetails.userIds[i].userId == keyDetails.userId) {
        primaryIdIndex = i;
        break;
      }
    }
  }

  for (let i = -1; i < keyDetails.userIds.length; i++) {
    // Handle entry primaryIdIndex first.

    let indexToUse;
    if (i == -1) {
      indexToUse = primaryIdIndex;
    } else if (i == primaryIdIndex) {
      // already handled when i was -1
      continue;
    } else {
      indexToUse = i;
    }

    if (keyDetails.userIds[indexToUse].type === "uid") {
      let uidStr = keyDetails.userIds[indexToUse].userId;

      /* - attempted code with <ul id="userIds">, doesn't work yet
      let item = document.createElement("li");

      let text = document.createElement("div");
      text.textContent = uidStr;
      item.append(text);

      let lf = document.createElement("br");
      item.append(lf);
      uidList.appendChild(item);
      */

      uidList.appendItem(uidStr);
    }
  }

  if (gModePersonal) {
    document.getElementById("emailAddressesTab").hidden = true;
  } else {
    let emailList = document.getElementById("addressesList");

    let atLeastOneChecked = false;
    let gUniqueEmails = new Set();

    for (let i = 0; i < gAllEmails.length; i++) {
      let email = gAllEmails[i];
      if (gUniqueEmails.has(email)) {
        continue;
      }
      gUniqueEmails.add(email);

      let checkbox = document.createXULElement("checkbox");

      checkbox.value = email;
      checkbox.setAttribute("label", email);

      checkbox.checked = gAcceptedEmails.has(email);
      if (checkbox.checked) {
        atLeastOneChecked = true;
      }

      checkbox.disabled = !gUpdateAllowed;
      checkbox.addEventListener("command", () => {
        setOkButtonState();
      });

      emailList.appendChild(checkbox);
      gAllEmailCheckboxes.push(checkbox);
    }

    // Usually, if we have only one email address available,
    // we want to hide the tab.
    // There are edge cases - if we have a data inconsistency
    // (key accepted, but no email accepted), then we must show,
    // to allow the user to repair.

    document.getElementById("emailAddressesTab").hidden =
      gUniqueEmails.size < 2 && atLeastOneChecked;
  }
}

function setAttr(attribute, value) {
  var elem = document.getElementById(attribute);
  if (elem) {
    elem.value = value;
  }
}

function enableRefresh() {
  if (window.arguments[1]) {
    window.arguments[1].refresh = true;
  }

  window.arguments[0].modified();
}

// ------------------ onCommand Functions  -----------------

/*
function signKey() {
  if (EnigmailWindows.signKey(window, gUserId, gKeyId)) {
    enableRefresh();
    reloadData(false);
  }
}
*/

/*
function manageUids() {
  let keyObj = EnigmailKeyRing.getKeyById(gKeyId);

  var inputObj = {
    keyId: keyObj.keyId,
    ownKey: keyObj.secretAvailable,
  };

  var resultObj = {
    refresh: false,
  };
  window.openDialog(
    "chrome://openpgp/content/ui/enigmailManageUidDlg.xhtml",
    "",
    "dialog,modal,centerscreen,resizable=yes",
    inputObj,
    resultObj
  );
  if (resultObj.refresh) {
    enableRefresh();
    reloadData(false);
  }
}
*/

function genRevocationCert() {
  throw new Error("Not implemented");

  /*
  var defaultFileName = userId.replace(/[<>]/g, "");
  defaultFileName += " (0x" + keyId + ") rev.asc";
  var outFile = EnigFilePicker("XXXsaveRevokeCertAs",
    "", true, "*.asc",
    defaultFileName, ["XXXasciiArmorFile", "*.asc"];
  if (!outFile) return -1;

  return 0;
  */
}

/**
 * @param {Object[]] signatures - list of signature objects
 *   signatures.userId {string} - User ID.
 *   signatures.uidLabel {string} - UID label.
 *   signatures.created
 *   signatures.fpr {string} - Fingerprint.
 *   signatures.sigList {Object[]} - Objects
 *   signatures.sigList.userId
 *   signatures.sigList.created
 *   signatures.sigList.signerKeyId
 *   signatures.sigList.sigType
 *   signatures.sigList.sigKnown
 */
function SigListView(signatures) {
  this.keyObj = [];

  for (let sig of signatures) {
    let k = {
      uid: sig.userId,
      keyId: sig.keyId,
      created: sig.created,
      expanded: true,
      sigList: [],
    };

    for (let s of sig.sigList) {
      k.sigList.push({
        uid: s.userId,
        created: s.created,
        keyId: s.signerKeyId,
        sigType: s.sigType,
      });
    }
    this.keyObj.push(k);
  }

  this.prevKeyObj = null;
  this.prevRow = -1;

  this.updateRowCount();
}

/**
 * @implements {nsITreeView}
 */
SigListView.prototype = {
  updateRowCount() {
    let rc = 0;

    for (let i in this.keyObj) {
      rc += this.keyObj[i].expanded ? this.keyObj[i].sigList.length + 1 : 1;
    }

    this.rowCount = rc;
  },

  setLastKeyObj(keyObj, row) {
    this.prevKeyObj = keyObj;
    this.prevRow = row;
    return keyObj;
  },

  getSigAtIndex(row) {
    if (this.lastIndex == row) {
      return this.lastKeyObj;
    }

    let j = 0,
      l = 0;

    for (let i in this.keyObj) {
      if (j === row) {
        return this.setLastKeyObj(this.keyObj[i], row);
      }
      j++;

      if (this.keyObj[i].expanded) {
        l = this.keyObj[i].sigList.length;

        if (j + l >= row && row - j < l) {
          return this.setLastKeyObj(this.keyObj[i].sigList[row - j], row);
        }
        j += l;
      }
    }

    return null;
  },

  getCellText(row, column) {
    let s = this.getSigAtIndex(row);

    if (s) {
      switch (column.id) {
        case "sig_uid_col":
          return s.uid;
        case "sig_keyid_col":
          return "0x" + s.keyId;
        case "sig_created_col":
          return s.created;
      }
    }

    return "";
  },

  setTree(treebox) {
    this.treebox = treebox;
  },

  isContainer(row) {
    let s = this.getSigAtIndex(row);
    return "sigList" in s;
  },

  isSeparator(row) {
    return false;
  },

  isSorted() {
    return false;
  },

  getLevel(row) {
    let s = this.getSigAtIndex(row);
    return "sigList" in s ? 0 : 1;
  },

  cycleHeader(col, elem) {},

  getImageSrc(row, col) {
    return null;
  },

  getRowProperties(row, props) {},

  getCellProperties(row, col) {
    return "";
  },

  canDrop(row, orientation, data) {
    return false;
  },

  getColumnProperties(colid, col, props) {},

  isContainerEmpty(row) {
    return false;
  },

  getParentIndex(idx) {
    return -1;
  },

  getProgressMode(row, col) {},

  isContainerOpen(row) {
    let s = this.getSigAtIndex(row);
    return s.expanded;
  },

  isSelectable(row, col) {
    return true;
  },

  toggleOpenState(row) {
    let s = this.getSigAtIndex(row);
    s.expanded = !s.expanded;
    let r = this.rowCount;
    this.updateRowCount();
    gSigTree.rowCountChanged(row, this.rowCount - r);
  },
};

function createSubkeyItem(mainKeyIsSecret, subkey) {
  // Get expiry state of this subkey
  let expire;
  if (subkey.keyTrust === "r") {
    expire = l10n.formatValueSync("key-valid-revoked");
  } else if (subkey.expiryTime === 0) {
    expire = l10n.formatValueSync("key-expiry-never");
  } else {
    expire = subkey.expiry;
  }

  let subkeyType = "";

  if (mainKeyIsSecret && (!subkey.secretAvailable || !subkey.secretMaterial)) {
    subkeyType = "(!) ";
    gHasMissingSecret = true;
  }
  if (subkey.type === "pub") {
    subkeyType += l10n.formatValueSync("key-type-primary");
  } else {
    subkeyType += l10n.formatValueSync("key-type-subkey");
  }

  let usagetext = "";
  let i;
  //  e = encrypt
  //  s = sign
  //  c = certify
  //  a = authentication
  //  Capital Letters are ignored, as these reflect summary properties of a key

  var singlecode = "";
  for (i = 0; i < subkey.keyUseFor.length; i++) {
    singlecode = subkey.keyUseFor.substr(i, 1);
    switch (singlecode) {
      case "e":
        if (usagetext.length > 0) {
          usagetext = usagetext + ", ";
        }
        usagetext = usagetext + l10n.formatValueSync("key-usage-encrypt");
        break;
      case "s":
        if (usagetext.length > 0) {
          usagetext = usagetext + ", ";
        }
        usagetext = usagetext + l10n.formatValueSync("key-usage-sign");
        break;
      case "c":
        if (usagetext.length > 0) {
          usagetext = usagetext + ", ";
        }
        usagetext = usagetext + l10n.formatValueSync("key-usage-certify");
        break;
      case "a":
        if (usagetext.length > 0) {
          usagetext = usagetext + ", ";
        }
        usagetext =
          usagetext + l10n.formatValueSync("key-usage-authentication");
        break;
    } // * case *
  } // * for *

  let keyObj = {
    keyType: subkeyType,
    keyId: "0x" + subkey.keyId,
    algo: subkey.algoSym,
    size: subkey.keySize,
    creationDate: subkey.created,
    expiry: expire,
    usage: usagetext,
  };

  return keyObj;
}

function SubkeyListView(keyObj) {
  gHasMissingSecret = false;

  this.subkeys = [];
  this.rowCount = keyObj.subKeys.length + 1;
  this.subkeys.push(createSubkeyItem(keyObj.secretAvailable, keyObj));

  for (let i = 0; i < keyObj.subKeys.length; i++) {
    this.subkeys.push(
      createSubkeyItem(keyObj.secretAvailable, keyObj.subKeys[i])
    );
  }

  document.getElementById("legendMissingSecret").hidden = !gHasMissingSecret;
}

// implements nsITreeView
SubkeyListView.prototype = {
  getCellText(row, column) {
    let s = this.subkeys[row];

    if (s) {
      switch (column.id) {
        case "keyTypeCol":
          return s.keyType;
        case "keyIdCol":
          return s.keyId;
        case "algoCol":
          return s.algo;
        case "sizeCol":
          return s.size;
        case "createdCol":
          return s.creationDate;
        case "expiryCol":
          return s.expiry;
        case "keyUsageCol":
          return s.usage;
      }
    }

    return "";
  },

  setTree(treebox) {
    this.treebox = treebox;
  },

  isContainer(row) {
    return false;
  },

  isSeparator(row) {
    return false;
  },

  isSorted() {
    return false;
  },

  getLevel(row) {
    return 0;
  },

  cycleHeader(col, elem) {},

  getImageSrc(row, col) {
    return null;
  },

  getRowProperties(row, props) {},

  getCellProperties(row, col) {
    return "";
  },

  canDrop(row, orientation, data) {
    return false;
  },

  getColumnProperties(colid, col, props) {},

  isContainerEmpty(row) {
    return false;
  },

  getParentIndex(idx) {
    return -1;
  },

  getProgressMode(row, col) {},

  isContainerOpen(row) {
    return false;
  },

  isSelectable(row, col) {
    return true;
  },

  toggleOpenState(row) {},
};

function sigHandleDblClick(event) {}

document.addEventListener("dialogaccept", async function (event) {
  // Prevent the closing of the dialog to wait until all the SQLite operations
  // have properly been executed.
  event.preventDefault();

  // The user's personal OpenPGP key acceptance was edited.
  if (gModePersonal) {
    if (gUpdateAllowed && gPersonalRadio.value != gOriginalPersonal) {
      if (gPersonalRadio.value == "personal") {
        await PgpSqliteDb2.acceptAsPersonalKey(gFingerprint);
      } else {
        await PgpSqliteDb2.deletePersonalKeyAcceptance(gFingerprint);
      }

      enableRefresh();
    }
    window.close();
    return;
  }

  // If the recipient's key hasn't been revoked or invalidated, and the
  // signature acceptance was edited.
  if (gUpdateAllowed) {
    let selectedEmails = new Set();
    for (let checkbox of gAllEmailCheckboxes) {
      if (checkbox.checked) {
        selectedEmails.add(checkbox.value);
      }
    }

    if (
      gAcceptanceRadio.value != gOriginalAcceptance ||
      !CommonUtils.setEqual(gAcceptedEmails, selectedEmails)
    ) {
      await PgpSqliteDb2.updateAcceptance(
        gFingerprint,
        [...selectedEmails],
        gAcceptanceRadio.value
      );

      enableRefresh();
    }
  }

  window.close();
});
