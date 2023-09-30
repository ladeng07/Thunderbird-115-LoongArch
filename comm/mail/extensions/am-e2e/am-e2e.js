/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from ../../../../toolkit/content/preferencesBindings.js */
/* import-globals-from ../../../mailnews/base/prefs/content/am-identity-edit.js */

/* global GetEnigmailSvc, EnigRevokeKey */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { RNP } = ChromeUtils.import("chrome://openpgp/content/modules/RNP.jsm");
var { EnigmailKey } = ChromeUtils.import(
  "chrome://openpgp/content/modules/key.jsm"
);
var { EnigmailDialog } = ChromeUtils.import(
  "chrome://openpgp/content/modules/dialog.jsm"
);
var { EnigmailKeyRing } = ChromeUtils.import(
  "chrome://openpgp/content/modules/keyRing.jsm"
);
var { EnigmailKeyserverURIs } = ChromeUtils.import(
  "chrome://openpgp/content/modules/keyserverUris.jsm"
);
var { EnigmailKeyServer } = ChromeUtils.import(
  "chrome://openpgp/content/modules/keyserver.jsm"
);
var { EnigmailCryptoAPI } = ChromeUtils.import(
  "chrome://openpgp/content/modules/cryptoAPI.jsm"
);
var { PgpSqliteDb2 } = ChromeUtils.import(
  "chrome://openpgp/content/modules/sqliteDb.jsm"
);

var email_signing_cert_usage = 4; // SECCertUsage.certUsageEmailSigner
var email_recipient_cert_usage = 5; // SECCertUsage.certUsageEmailRecipient

var gIdentity;
var gEncryptionCertName = null;
var gEncryptionChoices = null;
var gSignCertName = null;
var gTechChoices = null;
var gSignMessages = null;
var gRequireEncrypt = null;
var gDoNotEncrypt = null;
var gAttachKey = null;
var gSendAutocryptHeaders = null;
var gEncryptSubject = null;
var gEncryptDrafts = null;

var gKeyId = null; // "" will denote selection 'None'.
var gBundle = null;
var gBrandBundle;
var gSmimePrefbranch;
var kEncryptionCertPref = "identity_encryption_cert_name";
var kSigningCertPref = "identity_signing_cert_name";

var gTechAuto = null;
var gTechPrefOpenPGP = null;
var gTechPrefSMIME = null;

function onInit() {
  initE2EEncryption(gIdentity);
  Services.prefs.addObserver("mail.e2ee.auto_enable", autoEncryptPrefObserver);
  Services.prefs.addObserver("mail.e2ee.auto_disable", autoEncryptPrefObserver);
}

window.addEventListener("unload", function () {
  Services.prefs.removeObserver(
    "mail.e2ee.auto_enable",
    autoEncryptPrefObserver
  );
  Services.prefs.removeObserver(
    "mail.e2ee.auto_disable",
    autoEncryptPrefObserver
  );
});

let gDisableEncryption;
let gEnableEncryption;

var autoEncryptPrefObserver = {
  observe(subject, topic, prefName) {
    if (topic == "nsPref:changed") {
      if (
        prefName == "mail.e2ee.auto_enable" ||
        prefName == "mail.e2ee.auto_disable"
      ) {
        updateAutoEncryptRelated();
      }
    }
  },
};

function updateAutoEncryptRelated() {
  if (Services.prefs.getBoolPref("mail.e2ee.auto_enable")) {
    document.getElementById("encryptionChoices").hidden = true;
  } else {
    document.getElementById("encryptionChoices").hidden = false;
  }
}

async function initE2EEncryption(identity) {
  // Initialize all of our elements based on the current identity values...
  gEncryptionCertName = document.getElementById(kEncryptionCertPref);
  gEncryptionChoices = document.getElementById("encryptionChoices");
  gSignCertName = document.getElementById(kSigningCertPref);
  gSignMessages = document.getElementById("identity_sign_mail");
  gDisableEncryption = document.getElementById("disable_encryption");
  gEnableEncryption = document.getElementById("enable_encryption");
  gAttachKey = document.getElementById("identity_attach_key");
  gSendAutocryptHeaders = document.getElementById("identity_autocrypt_headers");
  gEncryptSubject = document.getElementById("identity_encrypt_subject");
  gEncryptDrafts = document.getElementById("identity_encrypt_drafts");

  gBundle = document.getElementById("bundle_e2e");
  gBrandBundle = document.getElementById("bundle_brand");

  gTechChoices = document.getElementById("technologyChoices");
  gTechAuto = document.getElementById("technology_automatic");
  gTechPrefOpenPGP = document.getElementById("technology_prefer_openpgp");
  gTechPrefSMIME = document.getElementById("technology_prefer_smime");

  if (!identity) {
    // We're setting up a new identity. Set most prefs to default values.
    // Only take selected values from gAccount.defaultIdentity
    // as the new identity is going to have a different mail address.

    gEncryptionCertName.value = "";
    gEncryptionCertName.displayName = "";
    gEncryptionCertName.dbKey = "";

    gSignCertName.value = "";
    gSignCertName.displayName = "";
    gSignCertName.dbKey = "";

    gDisableEncryption.disabled = true;
    gEnableEncryption.disabled = true;
    gEncryptSubject.disabled = true;
    gEncryptDrafts.disabled = true;
    gSignMessages.disabled = true;

    gAttachKey.checked = gAccount.defaultIdentity.attachPgpKey;
    gSendAutocryptHeaders.checked =
      gAccount.defaultIdentity.sendAutocryptHeaders;
    gEncryptSubject.checked = gAccount.defaultIdentity.protectSubject;
    gEncryptDrafts.checked = gAccount.defaultIdentity.autoEncryptDrafts;
    gSignMessages.checked = gAccount.defaultIdentity.signMail;
    gEncryptionChoices.value = gAccount.defaultIdentity.encryptionPolicy;

    gTechChoices.value = 0;
  } else {
    // We're editing an existing identity.

    initSMIMESettings();
    await initOpenPgpSettings();

    let enableEnc = !!gEncryptionCertName.value;
    enableEnc = enableEnc || !!gKeyId;
    enableEncryptionControls(enableEnc);

    gSignMessages.checked = identity.signMail;
    gAttachKey.checked = identity.attachPgpKey;
    gSendAutocryptHeaders.checked = identity.sendAutocryptHeaders;
    gEncryptSubject.checked = identity.protectSubject;
    gEncryptDrafts.checked = identity.autoEncryptDrafts;

    let enableSig = gSignCertName.value;
    enableSig = enableSig || !!gKeyId;
    enableSigningControls(enableSig);
  }

  updateAutoEncryptRelated();

  // Always start with enabling select buttons.
  // This will keep the visibility of buttons in a sane state as user
  // jumps from security panel of one account to another.
  enableSelectButtons();
  updateTechPref();
}

/**
 * Initialize the S/MIME settings based on identity preferences.
 */
function initSMIMESettings() {
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );

  gEncryptionCertName.value = gIdentity.getUnicharAttribute(
    "encryption_cert_name"
  );
  gEncryptionCertName.dbKey = gIdentity.getCharAttribute(
    "encryption_cert_dbkey"
  );
  // If we succeed in looking up the certificate by the dbkey pref, then
  // append the serial number " [...]" to the display value, and remember the
  // displayName in a separate property.
  try {
    let x509cert = null;
    if (
      gEncryptionCertName.dbKey &&
      (x509cert = certdb.findCertByDBKey(gEncryptionCertName.dbKey))
    ) {
      gEncryptionCertName.value =
        x509cert.displayName + " [" + x509cert.serialNumber + "]";
      gEncryptionCertName.displayName = x509cert.displayName;
    }
  } catch (e) {}

  gEncryptionChoices.value = gIdentity.encryptionPolicy;
  gTechChoices.value = gIdentity.getIntAttribute("e2etechpref");

  gSignCertName.value = gIdentity.getUnicharAttribute("signing_cert_name");
  gSignCertName.dbKey = gIdentity.getCharAttribute("signing_cert_dbkey");

  // same procedure as with gEncryptionCertName (see above)
  try {
    let x509cert = null;
    if (
      gSignCertName.dbKey &&
      (x509cert = certdb.findCertByDBKey(gSignCertName.dbKey))
    ) {
      gSignCertName.value =
        x509cert.displayName + " [" + x509cert.serialNumber + "]";
      gSignCertName.displayName = x509cert.displayName;
    }
  } catch (e) {}
}

/**
 * Initialize the OpenPGP settings, apply strings, and load the key radio UI.
 */
async function initOpenPgpSettings() {
  let result = {};
  await EnigmailKeyRing.getAllSecretKeysByEmail(gIdentity.email, result, true);

  let externalKey = gIdentity.getUnicharAttribute(
    "last_entered_external_gnupg_key_id"
  );

  let keyCount = result.all.length + (externalKey ? 1 : 0);
  if (keyCount) {
    document.l10n.setAttributes(
      document.getElementById("openPgpDescription"),
      "openpgp-description-has-keys",
      {
        count: keyCount,
        identity: gIdentity.email,
      }
    );
  } else {
    document.l10n.setAttributes(
      document.getElementById("openPgpDescription"),
      "openpgp-description-no-key",
      {
        identity: gIdentity.email,
      }
    );
  }

  closeNotification();

  let keyId = gIdentity.getUnicharAttribute("openpgp_key_id");
  useOpenPGPKey(keyId);

  // When key changes, update settings.
  let openPgpKeyListRadio = document.getElementById("openPgpKeyListRadio");
  openPgpKeyListRadio.addEventListener("command", event => {
    closeNotification();
    useOpenPGPKey(event.target.value);
  });
}

function onPreInit(account, accountValues) {
  gIdentity = account.defaultIdentity;
}

// NOTE: AccountManager.js checks and calls "onSave" in savePage.
function onSave() {
  saveE2EEncryptionSettings(gIdentity);
}

function saveE2EEncryptionSettings(identity) {
  // Find out which radio for the encryption radio group is selected and set
  // that on our hidden encryptionChoice pref.
  let newValue = gEncryptionChoices.value;
  identity.encryptionPolicy = newValue;

  newValue = gTechChoices.value;
  identity.setIntAttribute("e2etechpref", newValue);

  identity.setUnicharAttribute(
    "encryption_cert_name",
    gEncryptionCertName.displayName || gEncryptionCertName.value
  );
  identity.setCharAttribute("encryption_cert_dbkey", gEncryptionCertName.dbKey);

  identity.signMail = gSignMessages.checked;
  identity.setUnicharAttribute(
    "signing_cert_name",
    gSignCertName.displayName || gSignCertName.value
  );
  identity.setCharAttribute("signing_cert_dbkey", gSignCertName.dbKey);

  identity.attachPgpKey = gAttachKey.checked;
  identity.sendAutocryptHeaders = gSendAutocryptHeaders.checked;
  identity.protectSubject = gEncryptSubject.checked;
  identity.autoEncryptDrafts = gEncryptDrafts.checked;
}

function alertUser(message) {
  Services.prompt.alert(
    window,
    gBrandBundle.getString("brandShortName"),
    message
  );
}

function askUser(message) {
  let button = Services.prompt.confirmEx(
    window,
    gBrandBundle.getString("brandShortName"),
    message,
    Services.prompt.STD_YES_NO_BUTTONS,
    null,
    null,
    null,
    null,
    {}
  );
  // confirmEx returns button index:
  return button == 0;
}

function checkOtherCert(
  cert,
  pref,
  usage,
  msgNeedCertWantSame,
  msgWantSame,
  msgNeedCertWantToSelect,
  enabler
) {
  var otherCertInfo = document.getElementById(pref);
  if (otherCertInfo.dbKey == cert.dbKey) {
    // All is fine, same cert is now selected for both purposes.
    return;
  }

  var secMsg = Cc["@mozilla.org/nsCMSSecureMessage;1"].getService(
    Ci.nsICMSSecureMessage
  );

  var matchingOtherCert;
  if (email_recipient_cert_usage == usage) {
    if (secMsg.canBeUsedForEmailEncryption(cert)) {
      matchingOtherCert = cert;
    }
  } else if (email_signing_cert_usage == usage) {
    if (secMsg.canBeUsedForEmailSigning(cert)) {
      matchingOtherCert = cert;
    }
  } else {
    throw new Error("Unexpected SECCertUsage: " + usage);
  }

  var userWantsSameCert = false;
  if (!otherCertInfo.value) {
    if (matchingOtherCert) {
      userWantsSameCert = askUser(gBundle.getString(msgNeedCertWantSame));
    } else if (askUser(gBundle.getString(msgNeedCertWantToSelect))) {
      smimeSelectCert(pref);
    }
  } else if (matchingOtherCert) {
    userWantsSameCert = askUser(gBundle.getString(msgWantSame));
  }

  if (userWantsSameCert) {
    otherCertInfo.value = cert.displayName + " [" + cert.serialNumber + "]";
    otherCertInfo.displayName = cert.displayName;
    otherCertInfo.dbKey = cert.dbKey;
    enabler(true);
  }
}

function smimeSelectCert(smime_cert) {
  var certInfo = document.getElementById(smime_cert);
  if (!certInfo) {
    return;
  }

  var picker = Cc["@mozilla.org/user_cert_picker;1"].createInstance(
    Ci.nsIUserCertPicker
  );
  var canceled = {};
  var x509cert;
  var certUsage;
  var selectEncryptionCert;

  if (smime_cert == kEncryptionCertPref) {
    selectEncryptionCert = true;
    certUsage = email_recipient_cert_usage;
  } else if (smime_cert == kSigningCertPref) {
    selectEncryptionCert = false;
    certUsage = email_signing_cert_usage;
  }

  try {
    x509cert = picker.pickByUsage(
      window,
      certInfo.value,
      certUsage, // this is from enum SECCertUsage
      false,
      true,
      gIdentity.email,
      canceled
    );
  } catch (e) {
    canceled.value = false;
    x509cert = null;
  }

  if (!canceled.value) {
    if (!x509cert) {
      if (gIdentity.email) {
        alertUser(
          gBundle.getFormattedString(
            selectEncryptionCert
              ? "NoEncryptionCertForThisAddress"
              : "NoSigningCertForThisAddress",
            [gIdentity.email]
          )
        );
      } else {
        alertUser(
          gBundle.getString(
            selectEncryptionCert ? "NoEncryptionCert" : "NoSigningCert"
          )
        );
      }
    } else {
      certInfo.disabled = false;
      certInfo.value =
        x509cert.displayName + " [" + x509cert.serialNumber + "]";
      certInfo.displayName = x509cert.displayName;
      certInfo.dbKey = x509cert.dbKey;

      if (selectEncryptionCert) {
        enableEncryptionControls(true);

        checkOtherCert(
          x509cert,
          kSigningCertPref,
          email_signing_cert_usage,
          "signing_needCertWantSame",
          "signing_wantSame",
          "signing_needCertWantToSelect",
          enableSigningControls
        );
      } else {
        enableSigningControls(true);

        checkOtherCert(
          x509cert,
          kEncryptionCertPref,
          email_recipient_cert_usage,
          "encryption_needCertWantSame",
          "encryption_wantSame",
          "encryption_needCertWantToSelect",
          enableEncryptionControls
        );
      }
    }
  }

  updateTechPref();
  enableSelectButtons();
  onSave();
}

function enableEncryptionControls(do_enable) {
  gDisableEncryption.disabled = !do_enable;
  gEnableEncryption.disabled = !do_enable;
  if (!do_enable) {
    gEncryptionChoices.value = 0;
  }
  // If we have a certificate or key configured that allows encryption,
  // then we are able to encrypt drafts, too.
  gEncryptDrafts.disabled = !do_enable;
}

function enableSigningControls(do_enable) {
  gSignMessages.disabled = !do_enable;
  if (!do_enable) {
    gSignMessages.checked = false;
  }
}

function enableSelectButtons() {
  gSignCertName.disabled = !gSignCertName.value;
  document.getElementById("signingCertClearButton").disabled =
    !gSignCertName.value;

  gEncryptionCertName.disabled = !gEncryptionCertName.value;
  document.getElementById("encryptionCertClearButton").disabled =
    !gEncryptionCertName.value;
}

function smimeClearCert(smime_cert) {
  var certInfo = document.getElementById(smime_cert);
  if (!certInfo) {
    return;
  }

  certInfo.disabled = true;
  certInfo.value = "";
  certInfo.displayName = "";
  certInfo.dbKey = "";

  let stillHaveOther = false;
  stillHaveOther = gKeyId != "";

  if (!stillHaveOther) {
    if (smime_cert == kEncryptionCertPref) {
      enableEncryptionControls(false);
    } else if (smime_cert == kSigningCertPref) {
      enableSigningControls(false);
    }
  }

  updateTechPref();
  enableSelectButtons();
  onSave();
}

function updateTechPref() {
  let haveSigCert = gSignCertName && gSignCertName.value;
  let haveEncCert = gEncryptionCertName && gEncryptionCertName.value;
  let havePgpkey = !!gKeyId;

  let enable = (haveSigCert || haveEncCert) && havePgpkey;

  gTechAuto.disabled = !enable;
  gTechPrefOpenPGP.disabled = !enable;
  gTechPrefSMIME.disabled = !enable;

  if (!enable) {
    gTechChoices.value = 0;
  }
}

function openCertManager() {
  parent.gSubDialog.open("chrome://pippki/content/certManager.xhtml");
}

function openDeviceManager() {
  parent.gSubDialog.open("chrome://pippki/content/device_manager.xhtml");
}

/**
 * Open the OpenPGP Key Manager.
 */
function openKeyManager() {
  window.browsingContext.topChromeWindow.openDialog(
    "chrome://openpgp/content/ui/enigmailKeyManager.xhtml",
    "enigmail:KeyManager",
    "dialog,centerscreen,resizable",
    {
      cancelCallback: reloadOpenPgpUI,
      okCallback: reloadOpenPgpUI,
    }
  );
}

/**
 * Open the subdialog to create or import an OpenPGP key.
 */
function openKeyWizard() {
  let args = {
    identity: gIdentity,
    gSubDialog: parent.gSubDialog,
    cancelCallback: reloadOpenPgpUI,
    okCallback: keyWizardSuccess,
    okImportCallback: keyImportSuccess,
    okExternalCallback: keyExternalSuccess,
    keyDetailsDialog: enigmailKeyDetails,
  };

  parent.gSubDialog.open(
    "chrome://openpgp/content/ui/keyWizard.xhtml",
    undefined,
    args
  );
}

/**
 * Show a successful notification after a new OpenPGP key was created, and
 * trigger the reload of the key listing UI.
 *
 * @param {string} keyId - Id of key that the key wizard set up.
 */
async function keyWizardSuccess(keyId) {
  document.l10n.setAttributes(
    document.getElementById("openPgpNotificationDescription"),
    "openpgp-keygen-success"
  );
  document.getElementById("openPgpNotification").collapsed = false;

  useOpenPGPKey(keyId);
}

/**
 * Show a successful notification after an external key was saved, and trigger
 * the reload of the key listing UI.
 *
 * @param {string} keyId - Id of key that the key wizard set up.
 */
async function keyExternalSuccess(keyId) {
  document.l10n.setAttributes(
    document.getElementById("openPgpNotificationDescription"),
    "openpgp-keygen-external-success"
  );
  document.getElementById("openPgpNotification").collapsed = false;

  gIdentity.setUnicharAttribute("last_entered_external_gnupg_key_id", keyId);
  useOpenPGPKey(keyId);
}

/**
 * Adjust the key listing to account for newly created keys. Then set
 * the current identity to start using this key and adjust the UI elements
 * to be enabled now that there's a key to use.
 *
 * NOTE! Please always go through this to change gKeyId!
 *
 * @param {string} keyId - Id of key that the key wizard set up.
 */
function useOpenPGPKey(keyId) {
  // Rebuild the UI so that any new keys are listed.
  gKeyId = keyId.toUpperCase();

  // Update the identity with the key obtained from the key wizard.
  gIdentity.setUnicharAttribute("openpgp_key_id", keyId || "");

  // Always update the GnuPG boolean pref to be sure the currently used key is
  // internal or external.
  gIdentity.setBoolAttribute(
    "is_gnupg_key_id",
    gKeyId ==
      gIdentity.getUnicharAttribute("last_entered_external_gnupg_key_id")
  );

  reloadOpenPgpUI();
}

/**
 * Show a successful notification after an import of keys, and trigger the
 * reload of the key listing UI.
 */
async function keyImportSuccess() {
  document.l10n.setAttributes(
    document.getElementById("openPgpNotificationDescription"),
    "openpgp-keygen-import-success"
  );
  document.getElementById("openPgpNotification").collapsed = false;

  reloadOpenPgpUI();
}

/**
 * Collapse the inline notification.
 */
function closeNotification() {
  document.getElementById("openPgpNotification").collapsed = true;
}

/**
 * Refresh the UI on init or after a successful OpenPGP key generation.
 */
async function reloadOpenPgpUI() {
  let result = {};
  await EnigmailKeyRing.getAllSecretKeysByEmail(gIdentity.email, result, true);
  let keyCount = result.all.length;

  let externalKey = null;
  if (Services.prefs.getBoolPref("mail.openpgp.allow_external_gnupg")) {
    externalKey = gIdentity.getUnicharAttribute(
      "last_entered_external_gnupg_key_id"
    );
    if (externalKey) {
      keyCount++;
    }
  }

  // Show the radiogroup container only if the current identity has keys.
  // But still show it if a key (missing or unusable) is configured.
  document.getElementById("openPgpKeyList").hidden = keyCount == 0 && !gKeyId;

  // Update the OpenPGP intro description with the current key count.
  if (keyCount) {
    document.l10n.setAttributes(
      document.getElementById("openPgpDescription"),
      "openpgp-description-has-keys",
      {
        count: keyCount,
        identity: gIdentity.email,
      }
    );
  } else {
    document.l10n.setAttributes(
      document.getElementById("openPgpDescription"),
      "openpgp-description-no-key",
      {
        identity: gIdentity.email,
      }
    );
  }

  let radiogroup = document.getElementById("openPgpKeyListRadio");

  if (!gKeyId) {
    radiogroup.selectedIndex = 0; // None
  }

  // Remove all the previously generated radio options, except the first.
  while (radiogroup.lastChild.id != "openPgpOptionNone") {
    radiogroup.removeChild(radiogroup.lastChild);
  }

  // Currently configured key is not in available, maybe deleted by the user?
  if (gKeyId && !externalKey && !result.all.find(key => key.keyId == gKeyId)) {
    let container = document.createXULElement("vbox");
    container.id = `openPgpOption${gKeyId}`;
    container.classList.add("content-blocking-category");

    let box = document.createXULElement("hbox");
    let radio = document.createXULElement("radio");
    radio.setAttribute("flex", "1");
    radio.disabled = true;
    radio.id = `openPgp${gKeyId}`;
    radio.value = gKeyId;
    radio.label = `0x${gKeyId}`;
    box.appendChild(radio);

    let box2 = document.createXULElement("vbox");
    box2.classList.add("indent");
    let desc = document.createXULElement("description");
    box2.appendChild(desc);

    let key = EnigmailKeyRing.getKeyById(gKeyId);
    if (key && !key.secretAvailable) {
      document.l10n.setAttributes(desc, "openpgp-radio-key-not-usable");
    } else if (key && !(await PgpSqliteDb2.isAcceptedAsPersonalKey(key.fpr))) {
      document.l10n.setAttributes(desc, "openpgp-radio-key-not-accepted");
      let btnContainer = document.createXULElement("hbox");
      btnContainer.setAttribute("pack", "end");
      btnContainer.style.width = "100%";
      let info = document.createXULElement("button");
      info.classList.add("openpgp-image-btn", "openpgp-props-btn");
      document.l10n.setAttributes(info, "openpgp-key-man-key-props");
      info.addEventListener("command", event => {
        event.stopPropagation();
        enigmailKeyDetails(key.keyId);
      });
      btnContainer.appendChild(info);
      box2.appendChild(btnContainer);
    } else {
      document.l10n.setAttributes(desc, "openpgp-radio-key-not-found");
    }

    container.appendChild(box);
    container.appendChild(box2);
    radiogroup.appendChild(container);
  }

  // Sort keys by create date from newest to oldest.
  result.all.sort((a, b) => {
    return b.keyCreated - a.keyCreated;
  });

  // If the user has an external key saved, and the allow_external_gnupg
  // pref is true, we show it on top of the list.
  if (externalKey) {
    let container = document.createXULElement("vbox");
    container.id = `openPgpOption${externalKey}`;
    container.classList.add("content-blocking-category");

    let box = document.createXULElement("hbox");

    let radio = document.createXULElement("radio");
    radio.setAttribute("flex", "1");
    radio.id = `openPgp${externalKey}`;
    radio.value = externalKey;
    radio.label = `0x${externalKey}`;

    let remove = document.createXULElement("button");
    document.l10n.setAttributes(remove, "openpgp-key-remove-external");
    remove.addEventListener("command", removeExternalKey);
    remove.classList.add("button-small");

    box.appendChild(radio);
    box.appendChild(remove);

    let indent = document.createXULElement("vbox");
    indent.classList.add("indent");

    let dateContainer = document.createXULElement("hbox");
    dateContainer.classList.add("expiration-date-container");
    dateContainer.setAttribute("align", "center");

    let external = document.createXULElement("description");
    external.classList.add("external-pill");
    document.l10n.setAttributes(external, "key-external-label");

    dateContainer.appendChild(external);
    indent.appendChild(dateContainer);

    container.appendChild(box);
    container.appendChild(indent);

    radiogroup.appendChild(container);
  }

  // List all the available keys.
  for (let key of result.all) {
    let container = document.createXULElement("vbox");
    container.id = `openPgpOption${key.keyId}`;
    container.classList.add("content-blocking-category");

    let box = document.createXULElement("hbox");

    let radio = document.createXULElement("radio");
    radio.setAttribute("flex", "1");
    radio.id = `openPgp${key.keyId}`;
    radio.value = key.keyId;
    radio.label = `0x${key.keyId}`;

    let toggle = document.createXULElement("button");
    toggle.classList.add("arrowhead");
    toggle.setAttribute("aria-expanded", "false");
    document.l10n.setAttributes(toggle, "openpgp-key-expand-section");
    toggle.addEventListener("command", toggleExpansion);

    box.appendChild(radio);
    box.appendChild(toggle);

    let indent = document.createXULElement("vbox");
    indent.classList.add("indent");

    let dateContainer = document.createXULElement("hbox");
    dateContainer.classList.add("expiration-date-container");
    dateContainer.setAttribute("align", "center");

    let dateIcon = document.createElement("img");
    dateIcon.classList.add("expiration-date-icon");

    let dateButton = document.createXULElement("button");
    document.l10n.setAttributes(dateButton, "openpgp-key-man-change-expiry");
    dateButton.addEventListener("command", event => {
      event.stopPropagation();
      enigmailEditKeyDate(key);
    });
    dateButton.setAttribute("hidden", "true");
    dateButton.classList.add("button-small");

    let description = document.createXULElement("description");

    if (key.expiryTime) {
      if (Math.round(Date.now() / 1000) > key.expiryTime) {
        // Has expired.
        dateContainer.classList.add("key-expired");
        dateIcon.setAttribute(
          "src",
          "chrome://messenger/skin/icons/new/compact/warning.svg"
        );
        // Sets the title attribute.
        // The alt attribute is not set because the accessible name is already
        // set by the title.
        document.l10n.setAttributes(dateIcon, "openpgp-key-has-expired-icon");

        document.l10n.setAttributes(description, "openpgp-radio-key-expired", {
          date: key.expiry,
        });

        dateButton.removeAttribute("hidden");
        // This key is expired, so make it unselectable.
        radio.setAttribute("disabled", "true");
      } else {
        // If the key expires in less than 6 months.
        let sixMonths = new Date();
        sixMonths.setMonth(sixMonths.getMonth() + 6);
        if (Math.round(Date.parse(sixMonths) / 1000) > key.expiryTime) {
          dateContainer.classList.add("key-is-expiring");
          dateIcon.setAttribute(
            "src",
            "chrome://messenger/skin/icons/new/compact/info.svg"
          );
          // Sets the title attribute.
          // The alt attribute is not set because the accessible name is already
          // set by the title.
          document.l10n.setAttributes(
            dateIcon,
            "openpgp-key-expires-within-6-months-icon"
          );
          dateButton.removeAttribute("hidden");
        }

        document.l10n.setAttributes(description, "openpgp-radio-key-expires", {
          date: key.expiry,
        });
      }
    } else {
      document.l10n.setAttributes(description, "key-does-not-expire");
    }

    dateContainer.appendChild(dateIcon);
    dateContainer.appendChild(description);
    dateContainer.appendChild(dateButton);

    let publishContainer = null;

    // If this key is the currently selected key, suggest publishing.
    if (key.keyId == gKeyId) {
      publishContainer = document.createXULElement("hbox");
      publishContainer.setAttribute("align", "center");

      let publishButton = document.createElement("button");
      document.l10n.setAttributes(publishButton, "openpgp-key-publish");
      publishButton.addEventListener("click", () => {
        amE2eUploadKey(key);
      });
      publishButton.classList.add("button-small");

      let description = document.createXULElement("description");
      document.l10n.setAttributes(
        description,
        "openpgp-suggest-publishing-key"
      );

      publishContainer.appendChild(description);
      publishContainer.appendChild(publishButton);
    }

    let hiddenContainer = document.createXULElement("vbox");
    hiddenContainer.classList.add(
      "content-blocking-extra-information",
      "indent"
    );

    // Start key info section.
    let grid = document.createXULElement("hbox");
    grid.classList.add("extra-information-label");

    // Key fingerprint.
    let fingerprintImage = document.createElement("img");
    fingerprintImage.setAttribute(
      "src",
      "chrome://messenger/skin/icons/new/compact/fingerprint.svg"
    );
    fingerprintImage.setAttribute("alt", "");

    let fingerprintLabel = document.createXULElement("label");
    document.l10n.setAttributes(
      fingerprintLabel,
      "openpgp-key-details-fingerprint-label"
    );
    fingerprintLabel.classList.add("extra-information-label-type");

    let fgrInputContainer = document.createXULElement("hbox");
    fgrInputContainer.classList.add("input-container");
    fgrInputContainer.setAttribute("flex", "1");

    let fingerprintInput = document.createElement("input");
    fingerprintInput.setAttribute("type", "text");
    fingerprintInput.classList.add("plain");
    fingerprintInput.setAttribute("readonly", "readonly");
    fingerprintInput.value = EnigmailKey.formatFpr(key.fpr);

    fgrInputContainer.appendChild(fingerprintInput);

    grid.appendChild(fingerprintImage);
    grid.appendChild(fingerprintLabel);
    grid.appendChild(fgrInputContainer);

    // Key creation date.
    let createdImage = document.createElement("img");
    createdImage.setAttribute(
      "src",
      "chrome://messenger/skin/icons/new/compact/calendar.svg"
    );
    createdImage.setAttribute("alt", "");

    let createdLabel = document.createXULElement("label");
    document.l10n.setAttributes(
      createdLabel,
      "openpgp-key-details-created-header"
    );
    createdLabel.classList.add("extra-information-label-type");

    let createdValueContainer = document.createXULElement("hbox");
    createdValueContainer.classList.add("input-container");
    createdValueContainer.setAttribute("flex", "1");

    let createdValue = document.createElement("input");
    createdValue.setAttribute("type", "text");
    createdValue.classList.add("plain");
    createdValue.setAttribute("readonly", "readonly");
    createdValue.value = key.created;

    createdValueContainer.appendChild(createdValue);

    grid.appendChild(createdImage);
    grid.appendChild(createdLabel);
    grid.appendChild(createdValueContainer);
    // End key info section.

    hiddenContainer.appendChild(grid);

    // Action buttons.
    let btnContainer = document.createXULElement("hbox");
    btnContainer.setAttribute("pack", "end");

    let info = document.createXULElement("button");
    info.classList.add("openpgp-image-btn", "openpgp-props-btn");
    document.l10n.setAttributes(info, "openpgp-key-man-key-props");
    info.addEventListener("command", event => {
      event.stopPropagation();
      enigmailKeyDetails(key.keyId);
    });

    let more = document.createXULElement("button");
    more.setAttribute("type", "menu");
    more.classList.add("openpgp-more-btn", "last-element");
    document.l10n.setAttributes(more, "openpgp-key-man-key-more");

    let menupopup = document.createXULElement("menupopup");

    let copyItem = document.createXULElement("menuitem");
    document.l10n.setAttributes(copyItem, "openpgp-key-copy-key");
    copyItem.addEventListener("command", event => {
      event.stopPropagation();
      openPgpCopyToClipboard(`0x${key.keyId}`);
    });

    let sendItem = document.createXULElement("menuitem");
    document.l10n.setAttributes(sendItem, "openpgp-key-send-key");
    sendItem.addEventListener("command", event => {
      event.stopPropagation();
      openPgpSendKeyEmail(`0x${key.keyId}`);
    });

    let exportItem = document.createXULElement("menuitem");
    document.l10n.setAttributes(exportItem, "openpgp-key-export-key");
    exportItem.addEventListener("command", event => {
      event.stopPropagation();
      openPgpExportPublicKey(`0x${key.keyId}`);
    });

    let backupItem = document.createXULElement("menuitem");
    document.l10n.setAttributes(backupItem, "openpgp-key-backup-key");
    backupItem.addEventListener("command", event => {
      event.stopPropagation();
      openPgpExportSecretKey(`0x${key.keyId}`, `${key.fpr}`);
    });

    let revokeItem = document.createXULElement("menuitem");
    document.l10n.setAttributes(revokeItem, "openpgp-key-man-revoke-key");
    revokeItem.addEventListener("command", event => {
      event.stopPropagation();
      openPgpRevokeKey(key);
    });

    let deleteItem = document.createXULElement("menuitem");
    document.l10n.setAttributes(deleteItem, "openpgp-delete-key");
    deleteItem.addEventListener("command", event => {
      event.stopPropagation();
      enigmailDeleteKey(key);
    });

    menupopup.appendChild(copyItem);
    menupopup.appendChild(sendItem);
    menupopup.appendChild(exportItem);
    menupopup.appendChild(document.createXULElement("menuseparator"));
    menupopup.appendChild(backupItem);
    menupopup.appendChild(document.createXULElement("menuseparator"));
    menupopup.appendChild(revokeItem);
    menupopup.appendChild(deleteItem);

    more.appendChild(menupopup);

    btnContainer.appendChild(info);
    btnContainer.appendChild(more);

    hiddenContainer.appendChild(btnContainer);

    indent.appendChild(dateContainer);
    if (publishContainer) {
      indent.appendChild(publishContainer);
    }
    indent.appendChild(hiddenContainer);

    container.appendChild(box);
    container.appendChild(indent);

    radiogroup.appendChild(container);
  }

  // Reflect the selected key in the UI.
  radiogroup.selectedItem = radiogroup.querySelector(
    `radio[value="${gKeyId}"]`
  );

  // Update all the encryption options based on the selected OpenPGP key.
  if (gKeyId) {
    enableEncryptionControls(true);
    enableSigningControls(true);
  } else {
    let stillHaveOtherEncryption =
      gEncryptionCertName && gEncryptionCertName.value;
    if (!stillHaveOtherEncryption) {
      enableEncryptionControls(false);
    }
    let stillHaveOtherSigning = gSignCertName && gSignCertName.value;
    if (!stillHaveOtherSigning) {
      enableSigningControls(false);
    }
  }

  updateTechPref();
  enableSelectButtons();
  updateUIForSelectedOpenPgpKey();

  gAttachKey.disabled = !gKeyId;
  gEncryptSubject.disabled = !gKeyId;
}

/**
 * Open the Key Properties subdialog.
 *
 * @param {string} keyId - The ID of the selected OpenPGP Key.
 */
function enigmailKeyDetails(keyId) {
  keyId = keyId.replace(/^0x/, "");

  parent.gSubDialog.open(
    "chrome://openpgp/content/ui/keyDetailsDlg.xhtml",
    undefined,
    {
      keyId,
      modified: onDataModified,
    }
  );
}

/**
 * Delete an OpenPGP Key.
 *
 * @param {object} key - The selected OpenPGP Key.
 */
async function enigmailDeleteKey(key) {
  // Interrupt if the selected key is currently being used.
  if (key.keyId == gIdentity.getUnicharAttribute("openpgp_key_id")) {
    let [alertTitle, alertDescription] = await document.l10n.formatValues([
      { id: "key-in-use-title" },
      { id: "delete-key-in-use-description" },
    ]);

    Services.prompt.alert(null, alertTitle, alertDescription);
    return;
  }

  let l10nKey = key.secretAvailable ? "delete-secret-key" : "delete-pub-key";
  let [title, description] = await document.l10n.formatValues([
    { id: "delete-key-title" },
    { id: l10nKey, args: { userId: key.userId } },
  ]);

  // Ask for confirmation before proceeding.
  if (!Services.prompt.confirm(null, title, description)) {
    return;
  }

  let cApi = EnigmailCryptoAPI();
  await cApi.deleteKey(key.fpr, key.secretAvailable);
  await PgpSqliteDb2.deleteAcceptance(key.fpr);

  EnigmailKeyRing.clearCache();
  reloadOpenPgpUI();
}

/**
 * Revoke the selected OpenPGP Key.
 *
 * @param {object} key - The selected OpenPGP Key.
 */
async function openPgpRevokeKey(key) {
  // Interrupt if the selected key is currently being used.
  if (key.keyId == gIdentity.getUnicharAttribute("openpgp_key_id")) {
    let [alertTitle, alertDescription] = await document.l10n.formatValues([
      { id: "key-in-use-title" },
      { id: "revoke-key-in-use-description" },
    ]);

    Services.prompt.alert(null, alertTitle, alertDescription);
    return;
  }

  EnigRevokeKey(key, function (success) {
    if (success) {
      document.l10n.setAttributes(
        document.getElementById("openPgpNotificationDescription"),
        "openpgp-key-revoke-success"
      );
      document.getElementById("openPgpNotification").collapsed = false;

      EnigmailKeyRing.clearCache();
      reloadOpenPgpUI();
    }
  });
}

async function amE2eUploadKey(key) {
  let ks = EnigmailKeyserverURIs.getUploadKeyServer();

  let ok = await EnigmailKeyServer.upload(key.keyId, ks);
  let msg = await document.l10n.formatValue(
    ok ? "openpgp-key-publish-ok" : "openpgp-key-publish-fail",
    {
      keyserver: ks,
    }
  );

  EnigmailDialog.alert(null, msg);
}

/**
 * Open the subdialog to enable the user to edit the expiration date of the
 * selected OpenPGP Key.
 *
 * @param {object} key - The selected OpenPGP Key.
 */
async function enigmailEditKeyDate(key) {
  if (!key.iSimpleOneSubkeySameExpiry()) {
    Services.prompt.alert(
      null,
      document.title,
      await document.l10n.formatValue("openpgp-cannot-change-expiry")
    );
    return;
  }

  let args = {
    keyId: key.keyId,
    modified: onDataModified,
  };

  parent.gSubDialog.open(
    "chrome://openpgp/content/ui/changeExpiryDlg.xhtml",
    undefined,
    args
  );
}

function onDataModified() {
  EnigmailKeyRing.clearCache();
  reloadOpenPgpUI();
}

/**
 * Toggle the visibility of the OpenPgp Key radio container.
 *
 * @param {Event} event - The DOM event.
 */
function toggleExpansion(event) {
  let carat = event.target;
  carat.classList.toggle("up");
  carat.closest(".content-blocking-category").classList.toggle("expanded");
  carat.setAttribute(
    "aria-expanded",
    carat.getAttribute("aria-expanded") === "false"
  );
  event.stopPropagation();
}

/**
 * Apply a .selected class to the radio container of the currently selected
 * OpenPGP Key.
 * Also update UI strings describing the status of current selection.
 */
function updateUIForSelectedOpenPgpKey() {
  // Remove a previously selected container, if any.
  let current = document.querySelector(".content-blocking-category.selected");

  if (current) {
    current.classList.remove("selected");
  }

  // Highlight the parent container of the currently selected radio button.
  // The condition needs to be sure the key is not null as a selection of "None"
  // returns a value of "".
  if (gKeyId !== null) {
    let radio = document.querySelector(`radio[value="${gKeyId}"]`);

    // If the currently used key was deleted, we might not have the
    // corresponding radio element.
    if (radio) {
      radio.closest(".content-blocking-category").classList.add("selected");
    }
  }

  // Reset the image in case of async reload of the list.
  let statusLabel = document.getElementById("openPgpSelectionStatus");
  let image = document.getElementById("openPgpStatusImage");
  image.classList.remove("status-success", "status-error");

  // Check if the currently selected key has expired.
  if (gKeyId) {
    let key = EnigmailKeyRing.getKeyById(gKeyId, true);
    if (key?.expiryTime && Math.round(Date.now() / 1000) > key.expiryTime) {
      image.setAttribute(
        "src",
        "chrome://messenger/skin/icons/new/compact/close.svg"
      );
      image.classList.add("status-error");
      document.l10n.setAttributes(
        statusLabel,
        "openpgp-selection-status-error",
        { key: `0x${gKeyId}` }
      );
    } else {
      image.setAttribute(
        "src",
        "chrome://messenger/skin/icons/new/compact/check.svg"
      );
      image.classList.add("status-success");
      document.l10n.setAttributes(
        statusLabel,
        "openpgp-selection-status-have-key",
        { key: `0x${gKeyId}` }
      );
    }
  }

  let hide = !gKeyId;
  statusLabel.hidden = hide;
  document.getElementById("openPgpLearnMore").hidden = hide;
  image.hidden = hide;
}

/**
 * Generic method to copy a string in the user's clipboard.
 *
 * @param {string} val - The formatted string to be copied in the clipboard.
 */
async function openPgpCopyToClipboard(keyId) {
  let exitCodeObj = {};

  let keyData = await EnigmailKeyRing.extractPublicKeys(
    [keyId], // full
    null,
    null,
    null,
    exitCodeObj,
    {}
  );

  // Alert the user if the copy failed.
  if (exitCodeObj.value !== 0) {
    alertUser(await document.l10n.formatValue("copy-to-clipbrd-failed"));
    return;
  }

  navigator.clipboard
    .writeText(keyData)
    .then(async () => {
      alertUser(await document.l10n.formatValue("copy-to-clipbrd-ok"));
    })
    .catch(async () => {
      alertUser(await document.l10n.formatValue("copy-to-clipbrd-failed"));
    });
}

/**
 * Create an attachment with the currently selected OpenPgp public Key and open
 * a new message compose window.
 *
 * @param {string} keyId - The formatted OpenPgp Key ID.
 */
async function openPgpSendKeyEmail(keyId) {
  let tmpFile = Services.dirsvc.get("TmpD", Ci.nsIFile);
  tmpFile.append("key.asc");
  tmpFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);

  let exitCodeObj = {};
  let errorMsgObj = {};
  let keyIdArray = [keyId];

  await EnigmailKeyRing.extractPublicKeys(
    keyIdArray, // full
    null,
    null,
    tmpFile,
    exitCodeObj,
    errorMsgObj
  );

  if (exitCodeObj.value !== 0) {
    alertUser(errorMsgObj.value);
    return;
  }

  // Create the key attachment.
  let tmpFileURI = Services.io.newFileURI(tmpFile);
  let keyAttachment = Cc[
    "@mozilla.org/messengercompose/attachment;1"
  ].createInstance(Ci.nsIMsgAttachment);

  keyAttachment.url = tmpFileURI.spec;
  keyAttachment.name = `${keyId}.asc`;
  keyAttachment.temporary = true;
  keyAttachment.contentType = "application/pgp-keys";

  // Create the new message.
  let msgCompFields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  msgCompFields.addAttachment(keyAttachment);

  let msgCompParam = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  msgCompParam.composeFields = msgCompFields;
  msgCompParam.identity = gIdentity;
  msgCompParam.type = Ci.nsIMsgCompType.New;
  msgCompParam.format = Ci.nsIMsgCompFormat.Default;
  msgCompParam.originalMsgURI = "";

  MailServices.compose.OpenComposeWindowWithParams("", msgCompParam);
}

/**
 * Export the selected OpenPGP public key to a file.
 *
 * @param {string} keyId - The ID of the selected OpenPGP Key.
 */
async function openPgpExportPublicKey(keyId) {
  let outFile = EnigmailKeyRing.promptKeyExport2AsciiFilename(
    window,
    await document.l10n.formatValue("export-to-file"),
    `${gIdentity.fullName}_${gIdentity.email}-${keyId}-pub.asc`
  );

  if (!outFile) {
    return;
  }

  let exitCodeObj = {};
  let errorMsgObj = {};
  await EnigmailKeyRing.extractPublicKeys(
    [keyId], // full
    null,
    null,
    outFile,
    exitCodeObj,
    errorMsgObj
  );

  // Alert the user if the save process failed.
  if (exitCodeObj.value !== 0) {
    document.l10n.formatValue("openpgp-export-public-fail").then(value => {
      alertUser(value);
    });
    return;
  }

  document.l10n.setAttributes(
    document.getElementById("openPgpNotificationDescription"),
    "openpgp-export-public-success"
  );
  document.getElementById("openPgpNotification").collapsed = false;
}

/**
 * Ask the user to pick a file location and choose a password before proceeding
 * with the backup of a secret key.
 *
 * @param {string} keyId - The ID of the selected OpenPGP Key.
 * @param {string} keyFpr - The fingerprint of the selected OpenPGP Key.
 */
async function openPgpExportSecretKey(keyId, keyFpr) {
  let outFile = EnigmailKeyRing.promptKeyExport2AsciiFilename(
    window,
    await document.l10n.formatValue("export-keypair-to-file"),
    `${gIdentity.fullName}_${gIdentity.email}-${keyId}-secret.asc`
  );

  if (!outFile) {
    return;
  }

  let args = {
    okCallback: exportSecretKey,
    file: outFile,
    fprArray: [keyFpr],
  };

  window.browsingContext.topChromeWindow.openDialog(
    "chrome://openpgp/content/ui/backupKeyPassword.xhtml",
    "",
    "dialog,modal,centerscreen,resizable",
    args
  );
}

/**
 * Export the secret key after a successful password setup.
 *
 * @param {string} password - The declared password to protect the keys.
 * @param {Array} fprArray - The array of fingerprint of the selected keys.
 * @param {object} file - The file where the keys should be saved.
 * @param {boolean} confirmed - If the password was properly typed in the prompt.
 */
async function exportSecretKey(password, fprArray, file, confirmed = false) {
  // Interrupt in case this method has been called directly without confirming
  // the input password through the password prompt.
  if (!confirmed) {
    return;
  }

  let backupKeyBlock = await RNP.backupSecretKeys(fprArray, password);
  if (!backupKeyBlock) {
    Services.prompt.alert(
      null,
      await document.l10n.formatValue("save-keys-failed")
    );
    return;
  }

  await IOUtils.writeUTF8(file.path, backupKeyBlock)
    .then(() => {
      document.l10n.setAttributes(
        document.getElementById("openPgpNotificationDescription"),
        "openpgp-export-secret-success"
      );
      document.getElementById("openPgpNotification").collapsed = false;
    })
    .catch(async err => {
      alertUser(await document.l10n.formatValue("openpgp-export-secret-fail"));
    });
}

/**
 * Remove the saved external GnuPG Key.
 */
async function removeExternalKey() {
  if (!GetEnigmailSvc()) {
    return;
  }

  // Interrupt if the external key is currently being used.
  if (
    gIdentity.getUnicharAttribute("last_entered_external_gnupg_key_id") ==
    gIdentity.getUnicharAttribute("openpgp_key_id")
  ) {
    let [alertTitle, alertDescription] = await document.l10n.formatValues([
      { id: "key-in-use-title" },
      { id: "delete-key-in-use-description" },
    ]);

    Services.prompt.alert(null, alertTitle, alertDescription);
    return;
  }

  let [title, description] = await document.l10n.formatValues([
    { id: "delete-external-key-title" },
    { id: "delete-external-key-description" },
  ]);

  // Ask for confirmation before proceeding.
  if (!Services.prompt.confirm(null, title, description)) {
    return;
  }

  gIdentity.setBoolAttribute("is_gnupg_key_id", false);
  gIdentity.setUnicharAttribute("last_entered_external_gnupg_key_id", "");

  reloadOpenPgpUI();
}
