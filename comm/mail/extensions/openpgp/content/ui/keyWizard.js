/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global GetEnigmailSvc */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
var { EnigmailCryptoAPI } = ChromeUtils.import(
  "chrome://openpgp/content/modules/cryptoAPI.jsm"
);
var { OpenPGPMasterpass } = ChromeUtils.import(
  "chrome://openpgp/content/modules/masterpass.jsm"
);
var { EnigmailDialog } = ChromeUtils.import(
  "chrome://openpgp/content/modules/dialog.jsm"
);
var { EnigmailKey } = ChromeUtils.import(
  "chrome://openpgp/content/modules/key.jsm"
);
var { EnigmailKeyRing } = ChromeUtils.import(
  "chrome://openpgp/content/modules/keyRing.jsm"
);
var { EnigmailWindows } = ChromeUtils.import(
  "chrome://openpgp/content/modules/windows.jsm"
);
var { PgpSqliteDb2 } = ChromeUtils.import(
  "chrome://openpgp/content/modules/sqliteDb.jsm"
);

ChromeUtils.defineESModuleGetters(this, {
  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",
});

// UI variables.
var gIdentity;
var gIdentityList;
var gSubDialog;
var kStartSection;
var kDialog;
var kCurrentSection = "start";
var kGenerating = false;
var kButtonLabel;

// OpenPGP variables.
var gKeygenRequest;
var gAllData = "";
var gGeneratedKey = null;
var gFiles;

const DEFAULT_FILE_PERMS = 0o600;

// The revocation strings are not localization since the revocation certificate
// will be published to others who may not know the native language of the user.
const revocationFilePrefix1 =
  "This is a revocation certificate for the OpenPGP key:";
const revocationFilePrefix2 = `
A revocation certificate is kind of a "kill switch" to publicly
declare that a key shall no longer be used.  It is not possible
to retract such a revocation certificate once it has been published.

Use it to revoke this key in case of a secret key compromise, or loss of
the secret key, or loss of passphrase of the secret key.

To avoid an accidental use of this file, a colon has been inserted
before the 5 dashes below.  Remove this colon with a text editor
before importing and publishing this revocation certificate.

:`;

var syncl10n = new Localization(["messenger/openpgp/keyWizard.ftl"], true);

// Dialog event listeners.
document.addEventListener("dialogaccept", wizardContinue);
document.addEventListener("dialogextra1", goBack);
document.addEventListener("dialogcancel", onClose);

/**
 * Initialize the keyWizard dialog.
 */
async function init() {
  gSubDialog = window.arguments[0].gSubDialog;
  gIdentity = window.arguments[0].identity || null;
  gIdentityList = document.getElementById("userIdentity");

  kStartSection = document.getElementById("wizardStart");
  kDialog = document.querySelector("dialog");

  await initIdentity();

  // Show the GnuPG radio selection if the pref is enabled.
  if (Services.prefs.getBoolPref("mail.openpgp.allow_external_gnupg")) {
    document.getElementById("externalOpenPgp").removeAttribute("hidden");
  }

  // After the dialog is visible, disable the event listeners causing it to
  // close when clicking on the overlay or hitting the Esc key, and remove the
  // close button from the header. This is necessary to control the escape
  // point and prevent the accidental dismiss of the dialog during important
  // processes, like the generation or importing of a key.
  setTimeout(() => {
    // Check if the attribute is not null. This can be removed after the full
    // conversion of the Key Manager into a SubDialog in Bug 1652537.
    if (gSubDialog) {
      gSubDialog._topDialog._removeDialogEventListeners();
      gSubDialog._topDialog._closeButton.remove();
      resizeDialog();
    }
  }, 150);

  // Switch directly to the create screen if requested by the user.
  if (window.arguments[0].isCreate) {
    document.getElementById("openPgpKeyChoices").value = 0;

    switchSection();
  }

  // Switch directly to the import screen if requested by the user.
  if (window.arguments[0].isImport) {
    document.getElementById("openPgpKeyChoices").value = 1;

    // Disable the "Continue" button so the user can't accidentally click on it.
    // See bug 1689980.
    kDialog.getButton("accept").setAttribute("disabled", true);

    switchSection();
  }
}

function onProtectionChange() {
  let pw1Element = document.getElementById("passwordInput");
  let pw2Element = document.getElementById("passwordConfirm");

  let pw1 = pw1Element.value;
  let pw2 = pw2Element.value;

  let inputDisabled = document.getElementById("keygenAutoProtection").selected;
  pw1Element.disabled = inputDisabled;
  pw2Element.disabled = inputDisabled;

  let buttonEnabled = inputDisabled || (!inputDisabled && pw1 == pw2 && pw1);
  let ok = kDialog.getButton("accept");
  ok.disabled = !buttonEnabled;
}

/**
 * Populate the identity menulist with all the valid and available identities
 * and autoselect the current identity if available.
 */
async function initIdentity() {
  let identityListPopup = document.getElementById("userIdentityPopup");

  for (let identity of MailServices.accounts.allIdentities) {
    // Skip invalid and non-email identities.
    if (!identity.valid || !identity.email) {
      continue;
    }

    // Interrupt if no server was defined for this identity.
    let servers = MailServices.accounts.getServersForIdentity(identity);
    if (servers.length == 0) {
      continue;
    }

    let item = document.createXULElement("menuitem");
    item.setAttribute(
      "label",
      `${identity.identityName} - ${servers[0].prettyName}`
    );
    item.setAttribute("class", "identity-popup-item");
    item.setAttribute("accountname", servers[0].prettyName);
    item.setAttribute("identitykey", identity.key);
    item.setAttribute("email", identity.email);

    identityListPopup.appendChild(item);

    if (gIdentity && gIdentity.key == identity.key) {
      gIdentityList.selectedItem = item;
    }
  }

  // If not identity was originally passed during the creation of this dialog,
  // select the first available value.
  if (!gIdentity) {
    gIdentityList.selectedIndex = 0;
  }

  await setIdentity();
}

/**
 * Update the currently used identity to reflect the user selection from the
 * identity menulist.
 */
async function setIdentity() {
  if (gIdentityList.selectedItem) {
    gIdentity = MailServices.accounts.getIdentity(
      gIdentityList.selectedItem.getAttribute("identitykey")
    );

    document.l10n.setAttributes(
      document.documentElement,
      "key-wizard-dialog-window",
      {
        identity: gIdentity.email,
      }
    );
  }
}

/**
 * Intercept the dialogaccept command to implement a wizard like setup workflow.
 *
 * @param {Event} event - The DOM Event.
 */
function wizardContinue(event) {
  event.preventDefault();

  // Pretty impossible scenario but just in case if no radio button is
  // currently selected, bail out.
  if (!document.getElementById("openPgpKeyChoices").value) {
    return;
  }

  // Trigger an action based on the currently visible section.
  if (kCurrentSection != "start") {
    wizardNextStep();
    return;
  }

  // Disable the `Continue` button.
  kDialog.getButton("accept").setAttribute("disabled", true);

  kStartSection.addEventListener("transitionend", switchSection, {
    once: true,
  });
  kStartSection.classList.add("hide");
}

/**
 * Separated method dealing with the section switching to allow the removal of
 * the event listener to prevent stacking.
 */
function switchSection() {
  kStartSection.setAttribute("hidden", true);

  // Save the current label of the accept button in order to restore it later.
  kButtonLabel = kDialog.getButton("accept").label;

  // Update the UI based on the radiogroup selection.
  switch (document.getElementById("openPgpKeyChoices").value) {
    case "0":
      wizardCreateKey();
      break;

    case "1":
      wizardImportKey();
      break;

    case "2":
      wizardExternalKey();
      break;
  }

  // Show the `Go back` button.
  kDialog.getButton("extra1").hidden = false;
  resizeDialog();
}

/**
 * Handle the next step of the wizard based on the currently visible section.
 */
async function wizardNextStep() {
  switch (kCurrentSection) {
    case "create":
      await openPgpKeygenStart();
      break;

    case "import":
      await openPgpImportStart();
      break;

    case "importComplete":
      openPgpImportComplete();
      break;

    case "external":
      openPgpExternalComplete();
      break;
  }
}

/**
 * Go back to the initial view of the wizard.
 */
function goBack() {
  let section = document.querySelector(".wizard-section:not([hidden])");
  section.addEventListener("transitionend", backToStart, { once: true });
  section.classList.add("hide-reverse");
}

/**
 * Hide the currently visible section at the end of the animation, remove the
 * listener to prevent stacking, and trigger the reveal of the first section.
 *
 * @param {Event} event - The DOM Event.
 */
function backToStart(event) {
  // Hide the `Go Back` button.
  kDialog.getButton("extra1").hidden = true;

  // Enable the `Continue` button.
  kDialog.getButton("accept").removeAttribute("disabled");

  kDialog.getButton("accept").label = kButtonLabel;
  kDialog.getButton("accept").classList.remove("primary");

  // Reset the import section.
  clearImportWarningNotifications();
  document.getElementById("importKeyIntro").hidden = false;
  document.getElementById("importKeyListContainer").collapsed = true;

  event.target.setAttribute("hidden", true);

  // Reset section key.
  kCurrentSection = "start";

  revealSection("wizardStart");
}

/**
 * Create a new inline notification to append to the import warning container.
 *
 * @returns {XULElement} - The description element inside the notification.
 */
async function addImportWarningNotification() {
  let notification = document.createXULElement("hbox");
  notification.classList.add(
    "inline-notification-container",
    "error-container"
  );

  let wrapper = document.createXULElement("hbox");
  wrapper.classList.add("inline-notification-wrapper", "align-center");

  let image = document.createElement("img");
  image.classList.add("notification-image");
  image.setAttribute("src", "chrome://global/skin/icons/warning.svg");
  image.setAttribute("alt", "");

  let description = document.createXULElement("description");

  wrapper.appendChild(image);
  wrapper.appendChild(description);

  notification.appendChild(wrapper);

  let container = document.getElementById("openPgpImportWarning");
  container.appendChild(notification);

  // Show the notification container.
  container.removeAttribute("hidden");

  return description;
}

/**
 * Remove all inline errors from the notification area of the import section.
 */
function clearImportWarningNotifications() {
  let container = document.getElementById("openPgpImportWarning");

  // Remove any existing notification.
  for (let notification of container.querySelectorAll(
    ".inline-notification-container"
  )) {
    notification.remove();
  }

  // Hide the entire notification container.
  container.hidden = true;
}

/**
 * Show the Key Creation section.
 */
async function wizardCreateKey() {
  kCurrentSection = "create";
  revealSection("wizardCreateKey");

  kDialog.getButton("accept").label = await document.l10n.formatValue(
    "openpgp-keygen-button"
  );
  kDialog.getButton("accept").classList.add("primary");

  if (!gIdentity.fullName) {
    document.getElementById("openPgpWarning").collapsed = false;
    document.l10n.setAttributes(
      document.getElementById("openPgpWarningDescription"),
      "openpgp-keygen-long-expiry"
    );
    return;
  }

  let sepPassphraseEnabled = Services.prefs.getBoolPref(
    "mail.openpgp.passphrases.enabled"
  );
  document.getElementById("keygenPassphraseSection").hidden =
    !sepPassphraseEnabled;

  if (sepPassphraseEnabled) {
    let usingPP = LoginHelper.isPrimaryPasswordSet();
    let autoProt = document.getElementById("keygenAutoProtection");

    document.l10n.setAttributes(
      autoProt,
      usingPP
        ? "radio-keygen-protect-primary-pass"
        : "radio-keygen-no-protection"
    );

    autoProt.setAttribute("selected", true);
    document
      .getElementById("keygenPassphraseProtection")
      .removeAttribute("selected");
  }

  // This also handles enable/disabling the accept/ok button.
  onProtectionChange();
}

/**
 * Show the Key Import section.
 */
function wizardImportKey() {
  kCurrentSection = "import";
  revealSection("wizardImportKey");

  let sepPassphraseEnabled = Services.prefs.getBoolPref(
    "mail.openpgp.passphrases.enabled"
  );
  let keepPassphrasesItem = document.getElementById(
    "openPgpKeygenKeepPassphrases"
  );
  keepPassphrasesItem.hidden = !sepPassphraseEnabled;
  keepPassphrasesItem.checked = false;
}

/**
 * Show the Key Setup via external smartcard section.
 */
async function wizardExternalKey() {
  kCurrentSection = "external";
  revealSection("wizardExternalKey");

  kDialog.getButton("accept").label = await document.l10n.formatValue(
    "openpgp-save-external-button"
  );
  kDialog.getButton("accept").classList.add("primary");

  // If the user is already using an external GnuPG key, populate the input,
  // show the warning description, and enable the primary button.
  if (gIdentity.getBoolAttribute("is_gnupg_key_id")) {
    document.getElementById("externalKey").value =
      gIdentity.getUnicharAttribute("last_entered_external_gnupg_key_id");
    document.getElementById("openPgpExternalWarning").collapsed = false;
    kDialog.getButton("accept").removeAttribute("disabled");
  } else {
    document.getElementById("openPgpExternalWarning").collapsed = true;
    kDialog.getButton("accept").setAttribute("disabled", true);
  }
}

/**
 * Animate the reveal of a section of the wizard.
 *
 * @param {string} id - The id of the section to reveal.
 */
function revealSection(id) {
  let section = document.getElementById(id);
  section.removeAttribute("hidden");

  // Timeout to animate after the hidden attribute has been removed.
  setTimeout(() => {
    section.classList.remove("hide", "hide-reverse");
  });

  resizeDialog();
}

/**
 * Enable or disable the elements based on the radiogroup selection.
 *
 * @param {Event} event - The DOM event triggered on change.
 */
function onExpirationChange(event) {
  document
    .getElementById("expireInput")
    .toggleAttribute("disabled", event.target.value != 0);
  document.getElementById("timeScale").disabled = event.target.value != 0;

  validateExpiration();
}

/**
 * Enable or disable the #keySize input field based on the current selection of
 * the #keyType radio group.
 *
 * @param {Event} event - The DOM Event.
 */
function onKeyTypeChange(event) {
  document.getElementById("keySize").disabled = event.target.value == "ECC";
}

/**
 * Intercept the cancel event to prevent accidental closing if the generation of
 * a key is currently in progress.
 *
 * @param {Event} event - The DOM event.
 */
function onClose(event) {
  if (kGenerating) {
    event.preventDefault();
  }

  window.arguments[0].cancelCallback();
}

/**
 * Validate the expiration time of a newly generated key when the user changes
 * values. Disable the "Generate Key" button and show an alert if the selected
 * value is less than 1 day or more than 100 years.
 */
async function validateExpiration() {
  // If the key doesn't have an expiration date, hide the warning message and
  // enable the "Generate Key" button.
  if (document.getElementById("openPgpKeygeExpiry").value == 1) {
    document.getElementById("openPgpWarning").collapsed = true;
    kDialog.getButton("accept").removeAttribute("disabled");
    return;
  }

  // Calculate the selected expiration date.
  let expiryTime =
    Number(document.getElementById("expireInput").value) *
    Number(document.getElementById("timeScale").value);

  // If the expiration date exceeds 100 years.
  if (expiryTime > 36500) {
    document.getElementById("openPgpWarning").collapsed = false;
    document.l10n.setAttributes(
      document.getElementById("openPgpWarningDescription"),
      "openpgp-keygen-long-expiry"
    );
    kDialog.getButton("accept").setAttribute("disabled", true);
    resizeDialog();
    return;
  }

  // If the expiration date is shorter than 1 day.
  if (expiryTime <= 0) {
    document.getElementById("openPgpWarning").collapsed = false;
    document.l10n.setAttributes(
      document.getElementById("openPgpWarningDescription"),
      "openpgp-keygen-short-expiry"
    );
    kDialog.getButton("accept").setAttribute("disabled", true);
    resizeDialog();
    return;
  }

  // If the previous conditions are false, hide the warning message and
  // enable the "Generate Key" button since the expiration date is valid.
  document.getElementById("openPgpWarning").collapsed = true;
  kDialog.getButton("accept").removeAttribute("disabled");
}

/**
 * Resize the dialog to account for the newly visible sections.
 */
function resizeDialog() {
  // Check if the attribute is not null. This can be removed after the full
  // conversion of the Key Manager into a SubDialog in Bug 1652537.
  if (gSubDialog && gSubDialog._topDialog) {
    gSubDialog._topDialog.resizeVertically();
  } else {
    window.sizeToContent();
  }
}

/**
 * Start the generation of a new OpenPGP Key.
 */
async function openPgpKeygenStart() {
  let openPgpWarning = document.getElementById("openPgpWarning");
  let openPgpWarningText = document.getElementById("openPgpWarningDescription");
  openPgpWarning.collapsed = true;

  // If a key generation request is already pending, warn the user and
  // don't proceed.
  if (gKeygenRequest) {
    let req = gKeygenRequest.QueryInterface(Ci.nsIRequest);

    if (req.isPending()) {
      openPgpWarning.collapsed = false;
      document.l10n.setAttributes(openPgpWarningText, "openpgp-keygen-ongoing");
      return;
    }
  }

  // Reset global variables to be sure.
  gGeneratedKey = null;
  gAllData = "";

  let enigmailSvc = GetEnigmailSvc();
  if (!enigmailSvc) {
    openPgpWarning.collapsed = false;
    document.l10n.setAttributes(
      openPgpWarningText,
      "openpgp-keygen-error-core"
    );
    closeOverlay();

    throw new Error("GetEnigmailSvc failed");
  }

  // Show wizard overlay before the start of the generation process. This is
  // necessary because the generation happens synchronously and blocks the UI.
  // We need to show the overlay before it, otherwise it would flash and freeze.
  // This should be moved after the Services.prompt.confirmEx() method
  // once Bug 1617444 is implemented.
  let overlay = document.getElementById("wizardOverlay");
  overlay.removeAttribute("hidden");
  overlay.classList.remove("hide");

  // Ask for confirmation before triggering the generation of a new key.
  document.l10n.setAttributes(
    document.getElementById("wizardOverlayQuestion"),
    "openpgp-key-confirm",
    {
      identity: `${gIdentity.fullName} <b>"${gIdentity.email}"</b>`,
    }
  );

  document.l10n.setAttributes(
    document.getElementById("wizardOverlayTitle"),
    "openpgp-keygen-progress-title"
  );
}

async function openPgpKeygenConfirm() {
  document.getElementById("openPgpKeygenConfirm").collapsed = true;
  document.getElementById("openPgpKeygenProcess").removeAttribute("collapsed");

  let openPgpWarning = document.getElementById("openPgpWarning");
  let openPgpWarningText = document.getElementById("openPgpWarningDescription");
  openPgpWarning.collapsed = true;

  kGenerating = true;

  let password;
  let cApi = EnigmailCryptoAPI();
  let newId = null;

  let sepPassphraseEnabled = Services.prefs.getBoolPref(
    "mail.openpgp.passphrases.enabled"
  );

  if (
    !sepPassphraseEnabled ||
    document.getElementById("keygenAutoProtection").selected
  ) {
    password = await OpenPGPMasterpass.retrieveOpenPGPPassword();
  } else {
    password = document.getElementById("passwordInput").value;
  }
  newId = await cApi.genKey(
    `${gIdentity.fullName} <${gIdentity.email}>`,
    document.getElementById("keyType").value,
    Number(document.getElementById("keySize").value),
    document.getElementById("openPgpKeygeExpiry").value == 1
      ? 0
      : Number(document.getElementById("expireInput").value) *
          Number(document.getElementById("timeScale").value),
    password
  );

  gGeneratedKey = newId;

  EnigmailWindows.keyManReloadKeys();

  gKeygenRequest = null;
  kGenerating = false;

  // For wathever reason, the key wasn't generated. Show an error message and
  // hide the processing overlay.
  if (!gGeneratedKey) {
    openPgpWarning.collapsed = false;
    document.l10n.setAttributes(
      openPgpWarningText,
      "openpgp-keygen-error-failed"
    );
    closeOverlay();

    throw new Error("key generation failed");
  }

  console.debug("saving new key id " + gGeneratedKey);
  Services.prefs.savePrefFile(null);

  // Hide wizard overlay at the end of the generation process.
  closeOverlay();
  EnigmailKeyRing.clearCache();

  let rev = await cApi.unlockAndGetNewRevocation(
    `0x${gGeneratedKey}`,
    password
  );
  if (!rev) {
    openPgpWarning.collapsed = false;
    document.l10n.setAttributes(
      openPgpWarningText,
      "openpgp-keygen-error-revocation",
      {
        key: gGeneratedKey,
      }
    );
    closeOverlay();

    throw new Error("failed to obtain revocation for key " + gGeneratedKey);
  }

  let revFull =
    revocationFilePrefix1 +
    "\n\n" +
    gGeneratedKey +
    "\n" +
    revocationFilePrefix2 +
    rev;

  let revFile = Services.dirsvc.get("ProfD", Ci.nsIFile);
  revFile.append(`0x${gGeneratedKey}_rev.asc`);

  // Create a revokation cert in the Thunderbird profile directory.
  await IOUtils.writeUTF8(revFile.path, revFull);

  // Key successfully created. Close the dialog and show a confirmation message.
  // Assigning the key to an identity is the responsibility of the caller,
  // so we pass back what we created.
  window.arguments[0].okCallback(gGeneratedKey);
  window.close();
}

/**
 * Cancel the keygen process, ask for confirmation before proceeding.
 */
async function openPgpKeygenCancel() {
  let [abortTitle, abortText] = await document.l10n.formatValues([
    { id: "openpgp-keygen-abort-title" },
    { id: "openpgp-keygen-abort" },
  ]);

  if (
    kGenerating &&
    Services.prompt.confirmEx(
      window,
      abortTitle,
      abortText,
      Services.prompt.STD_YES_NO_BUTTONS,
      "",
      "",
      "",
      "",
      {}
    ) != 0
  ) {
    return;
  }

  closeOverlay();
  gKeygenRequest.kill(false);
  kGenerating = false;
}

/**
 * Close the processing wizard overlay.
 */
function closeOverlay() {
  document.getElementById("openPgpKeygenConfirm").removeAttribute("collapsed");
  document.getElementById("openPgpKeygenProcess").collapsed = true;

  let overlay = document.getElementById("wizardOverlay");

  overlay.addEventListener("transitionend", hideOverlay, { once: true });
  overlay.classList.add("hide");
}

/**
 * Add the "hidden" attribute tot he processing wizard overlay after the CSS
 * transition ended.
 *
 * @param {Event} event - The DOM Event.
 */
function hideOverlay(event) {
  event.target.setAttribute("hidden", true);
  resizeDialog();
}

async function importSecretKey() {
  let [importTitle, importType] = await document.l10n.formatValues([
    { id: "import-key-file" },
    { id: "gnupg-file" },
  ]);

  // Reset the array of selected files.
  gFiles = [];

  let files = EnigmailDialog.filePicker(
    window,
    importTitle,
    "",
    false,
    true,
    "*.asc",
    "",
    [importType, "*.asc;*.gpg;*.pgp"]
  );

  if (!files.length) {
    return;
  }

  // Clear and hide the warning notification section.
  clearImportWarningNotifications();

  // Clear the key list from any previously listed key.
  let keyList = document.getElementById("importKeyList");
  while (keyList.lastChild) {
    keyList.lastChild.remove();
  }

  let keyCount = 0;
  for (let file of files) {
    // Skip the file and show a warning message if larger than 5MB.
    if (file.fileSize > 5000000) {
      document.l10n.setAttributes(
        await addImportWarningNotification(),
        "import-error-file-size"
      );
      continue;
    }

    let errorMsgObj = {};
    // Fetch the list of all the available keys inside the selected file.
    let importKeys = await EnigmailKey.getKeyListFromKeyFile(
      file,
      errorMsgObj,
      false,
      true
    );

    // Skip the file and show a warning message if the import failed.
    if (!importKeys || !importKeys.length || errorMsgObj.value) {
      document.l10n.setAttributes(
        await addImportWarningNotification(),
        "import-error-failed",
        {
          error: errorMsgObj.value,
        }
      );
      continue;
    }

    await appendFetchedKeys(importKeys);
    keyCount += importKeys.length;

    // Add the current file to the list of valid files to import.
    gFiles.push(file);
  }

  // Update the list count recap and show the container.
  document.l10n.setAttributes(
    document.getElementById("keyListCount"),
    "openpgp-import-key-list-amount-2",
    {
      count: keyCount,
    }
  );

  document.getElementById("importKeyListContainer").collapsed = !keyCount;

  // Hide the intro section and enable the import of keys only if we have valid
  // keys currently listed.
  if (keyCount) {
    document.getElementById("importKeyIntro").hidden = true;
    kDialog.getButton("accept").removeAttribute("disabled");
    kDialog.getButton("accept").classList.add("primary");
  }

  resizeDialog();
}

/**
 * Populate the key list in the import dialog with all the valid keys fetched
 * from a single file.
 *
 * @param {string[]} importKeys - The array of keys fetched from a single file.
 */
async function appendFetchedKeys(importKeys) {
  let keyList = document.getElementById("importKeyList");

  // List all the keys fetched from the file.
  for (let key of importKeys) {
    let container = document.createXULElement("hbox");
    container.classList.add("key-import-row", "selected");

    let titleContainer = document.createXULElement("vbox");

    let id = document.createXULElement("label");
    id.classList.add("openpgp-key-id");
    id.value = `0x${key.id}`;

    let name = document.createXULElement("label");
    name.classList.add("openpgp-key-name");
    name.value = key.name;

    titleContainer.appendChild(id);
    titleContainer.appendChild(name);

    // Allow users to treat imported keys as "Personal".
    let checkbox = document.createXULElement("checkbox");
    checkbox.setAttribute("id", `${key.id}-set-personal`);
    document.l10n.setAttributes(checkbox, "import-key-personal-checkbox");
    checkbox.checked = true;

    container.appendChild(titleContainer);
    container.appendChild(checkbox);

    keyList.appendChild(container);
  }
}

async function openPgpImportStart() {
  if (!gFiles.length) {
    return;
  }

  kGenerating = true;

  // Show the overlay.
  let overlay = document.getElementById("wizardImportOverlay");
  overlay.removeAttribute("hidden");
  overlay.classList.remove("hide");

  // Clear and hide the warning notification section.
  clearImportWarningNotifications();

  // Clear the list of any previously improted keys from the DOM.
  let keyList = document.getElementById("importKeyListRecap");
  while (keyList.lastChild) {
    keyList.lastChild.remove();
  }

  let keyCount = 0;
  for (let file of gFiles) {
    let resultKeys = {};
    let errorMsgObj = {};

    // keepPassphrases false is the classic behavior.
    let keepPassphrases = false;

    // If the pref is on, we allow the user to decide what to do.
    let allowSeparatePassphrases = Services.prefs.getBoolPref(
      "mail.openpgp.passphrases.enabled"
    );
    if (allowSeparatePassphrases) {
      keepPassphrases = document.getElementById(
        "openPgpKeygenKeepPassphrases"
      ).checked;
    }

    let exitCode = await EnigmailKeyRing.importSecKeyFromFile(
      window,
      passphrasePromptCallback,
      keepPassphrases,
      file,
      errorMsgObj,
      resultKeys
    );

    // Skip this file if something went wrong.
    if (exitCode !== 0) {
      document.l10n.setAttributes(
        await addImportWarningNotification(),
        "openpgp-import-keys-failed",
        {
          error: errorMsgObj.value,
        }
      );
      continue;
    }

    await appendImportedKeys(resultKeys);
    keyCount += resultKeys.keys.length;
  }

  // Hide the previous key list container and title.
  document.getElementById("importKeyListContainer").collapsed = keyCount;
  document.getElementById("importKeyTitle").hidden = keyCount;

  // Show the successful final screen only if at least one key was imported.
  if (keyCount) {
    // Update the dialog buttons for the final stage.
    kDialog.getButton("extra1").hidden = true;
    kDialog.getButton("cancel").hidden = true;

    // Update the `Continue` button.
    document.l10n.setAttributes(
      kDialog.getButton("accept"),
      "openpgp-keygen-import-complete"
    );
    kCurrentSection = "importComplete";

    // Show the recently built key list.
    document.getElementById("importKeyListSuccess").collapsed = false;
  }

  // Hide the loading overlay.
  overlay.addEventListener("transitionend", hideOverlay, { once: true });
  overlay.classList.add("hide");

  resizeDialog();
  kGenerating = false;
}

/**
 * Populate the key list in the import dialog with all the valid keys imported
 * from a single file.
 *
 * @param {string[]} resultKeys - The array of keys imported from a single file.
 */
async function appendImportedKeys(resultKeys) {
  let keyList = document.getElementById("importKeyListRecap");

  for (let keyId of resultKeys.keys) {
    if (keyId.search(/^0x/) === 0) {
      keyId = keyId.substr(2).toUpperCase();
    }

    let key = EnigmailKeyRing.getKeyById(keyId);

    if (key && key.fpr) {
      // If the checkbox was checked, update the acceptance of the key.
      if (document.getElementById(`${key.keyId}-set-personal`).checked) {
        PgpSqliteDb2.acceptAsPersonalKey(key.fpr);
      }

      let container = document.createXULElement("hbox");
      container.classList.add("key-import-row");

      // Start key info section.
      let grid = document.createXULElement("hbox");
      grid.classList.add("extra-information-label");

      // Key identity.
      let identityLabel = document.createXULElement("label");
      identityLabel.classList.add("extra-information-label-type");
      document.l10n.setAttributes(
        identityLabel,
        "openpgp-import-identity-label"
      );

      let identityValue = document.createXULElement("label");
      identityValue.value = key.userId;

      grid.appendChild(identityLabel);
      grid.appendChild(identityValue);

      // Key fingerprint.
      let fingerprintLabel = document.createXULElement("label");
      document.l10n.setAttributes(
        fingerprintLabel,
        "openpgp-import-fingerprint-label"
      );
      fingerprintLabel.classList.add("extra-information-label-type");

      let fingerprintInput = document.createXULElement("label");
      fingerprintInput.value = EnigmailKey.formatFpr(key.fpr);

      grid.appendChild(fingerprintLabel);
      grid.appendChild(fingerprintInput);

      // Key creation date.
      let createdLabel = document.createXULElement("label");
      document.l10n.setAttributes(createdLabel, "openpgp-import-created-label");
      createdLabel.classList.add("extra-information-label-type");

      let createdValue = document.createXULElement("label");
      createdValue.value = key.created;

      grid.appendChild(createdLabel);
      grid.appendChild(createdValue);

      // Key bits.
      let bitsLabel = document.createXULElement("label");
      bitsLabel.classList.add("extra-information-label-type");
      document.l10n.setAttributes(bitsLabel, "openpgp-import-bits-label");

      let bitsValue = document.createXULElement("label");
      bitsValue.value = key.keySize;

      grid.appendChild(bitsLabel);
      grid.appendChild(bitsValue);
      // End key info section.

      let info = document.createXULElement("button");
      info.classList.add("openpgp-image-btn", "openpgp-props-btn");
      document.l10n.setAttributes(info, "openpgp-import-key-props");
      info.addEventListener("command", () => {
        window.arguments[0].keyDetailsDialog(key.keyId);
      });

      container.appendChild(grid);
      container.appendChild(info);

      keyList.appendChild(container);
    }
  }
}

function openPgpImportComplete() {
  window.arguments[0].okImportCallback();
  window.close();
}

/**
 * Opens a prompt asking the user to enter the passphrase for a given key id.
 *
 * @param {object} win - The current window.
 * @param {string} keyId - The ID of the imported key.
 * @param {object} resultFlags - Keep track of the cancelled action.
 *
 * @returns {string} - The entered passphrase or empty.
 */
function passphrasePromptCallback(win, promptString, resultFlags) {
  let passphrase = { value: "" };

  // We need to fetch these strings synchronously in order to properly work with
  // the RNP key import method, which is not async.
  let title = syncl10n.formatValueSync("openpgp-passphrase-prompt-title");

  let prompt = Services.prompt.promptPassword(
    win,
    title,
    promptString,
    passphrase,
    null,
    {}
  );

  if (!prompt) {
    let overlay = document.getElementById("wizardImportOverlay");
    overlay.addEventListener("transitionend", hideOverlay, { once: true });
    overlay.classList.add("hide");
    kGenerating = false;
  }

  resultFlags.canceled = !prompt;
  return !prompt ? "" : passphrase.value;
}

function toggleSaveButton(event) {
  kDialog
    .getButton("accept")
    .toggleAttribute("disabled", !event.target.value.trim());
}

/**
 * Save the GnuPG Key for the current identity and trigger a callback.
 */
function openPgpExternalComplete() {
  gIdentity.setBoolAttribute("is_gnupg_key_id", true);

  let externalKey = document.getElementById("externalKey").value;
  gIdentity.setUnicharAttribute("openpgp_key_id", externalKey);

  window.arguments[0].okExternalCallback(externalKey);
  window.close();
}
