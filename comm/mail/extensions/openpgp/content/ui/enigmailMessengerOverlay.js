/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from ../../../../base/content/aboutMessage.js */
/* import-globals-from ../../../../base/content/msgHdrView.js */
/* import-globals-from ../../../../base/content/msgSecurityPane.js */

// TODO: check if this is safe
/* eslint-disable no-unsanitized/property */

var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  CollectedKeysDB: "chrome://openpgp/content/modules/CollectedKeysDB.jsm",
  EnigmailArmor: "chrome://openpgp/content/modules/armor.jsm",
  EnigmailAutocrypt: "chrome://openpgp/content/modules/autocrypt.jsm",
  EnigmailCryptoAPI: "chrome://openpgp/content/modules/cryptoAPI.jsm",
  EnigmailConstants: "chrome://openpgp/content/modules/constants.jsm",
  EnigmailCore: "chrome://openpgp/content/modules/core.jsm",
  EnigmailData: "chrome://openpgp/content/modules/data.jsm",
  EnigmailDecryption: "chrome://openpgp/content/modules/decryption.jsm",
  EnigmailDialog: "chrome://openpgp/content/modules/dialog.jsm",
  EnigmailFixExchangeMsg: "chrome://openpgp/content/modules/fixExchangeMsg.jsm",
  EnigmailFuncs: "chrome://openpgp/content/modules/funcs.jsm",
  EnigmailKey: "chrome://openpgp/content/modules/key.jsm",
  EnigmailKeyRing: "chrome://openpgp/content/modules/keyRing.jsm",
  EnigmailKeyServer: "chrome://openpgp/content/modules/keyserver.jsm",
  EnigmailKeyserverURIs: "chrome://openpgp/content/modules/keyserverUris.jsm",
  EnigmailLog: "chrome://openpgp/content/modules/log.jsm",
  EnigmailMime: "chrome://openpgp/content/modules/mime.jsm",
  EnigmailMsgRead: "chrome://openpgp/content/modules/msgRead.jsm",
  EnigmailPersistentCrypto:
    "chrome://openpgp/content/modules/persistentCrypto.jsm",
  EnigmailSingletons: "chrome://openpgp/content/modules/singletons.jsm",
  EnigmailStreams: "chrome://openpgp/content/modules/streams.jsm",
  EnigmailTrust: "chrome://openpgp/content/modules/trust.jsm",
  EnigmailURIs: "chrome://openpgp/content/modules/uris.jsm",
  EnigmailVerify: "chrome://openpgp/content/modules/mimeVerify.jsm",
  EnigmailWindows: "chrome://openpgp/content/modules/windows.jsm",
  // EnigmailWks: "chrome://openpgp/content/modules/webKey.jsm",
  KeyLookupHelper: "chrome://openpgp/content/modules/keyLookupHelper.jsm",
  MailStringUtils: "resource:///modules/MailStringUtils.jsm",
  PgpSqliteDb2: "chrome://openpgp/content/modules/sqliteDb.jsm",
  RNP: "chrome://openpgp/content/modules/RNP.jsm",
});

XPCOMUtils.defineLazyGetter(this, "l10n", () => {
  return new Localization(["messenger/openpgp/openpgp.ftl"], true);
});

var Enigmail = {};

Enigmail.getEnigmailSvc = function () {
  return EnigmailCore.getService(window);
};

Enigmail.msg = {
  decryptedMessage: null,
  securityInfo: null,
  lastSaveDir: "",
  messagePane: null,
  decryptButton: null,
  savedHeaders: null,
  removeListener: false,
  enableExperiments: false,
  headersList: [
    "content-transfer-encoding",
    "x-enigmail-version",
    "x-pgp-encoding-format",
    //"autocrypt-setup-message",
  ],
  buggyMailType: null,
  changedAttributes: [],
  allAttachmentsDone: false,
  messageDecryptDone: false,
  showPartialDecryptionReminder: false,

  get notificationBox() {
    return gMessageNotificationBar.msgNotificationBar;
  },

  removeNotification(value) {
    let item = this.notificationBox.getNotificationWithValue(value);
    // Remove the notification only if the user didn't previously close it.
    if (item) {
      this.notificationBox.removeNotification(item, true);
    }
  },

  messengerStartup() {
    Enigmail.msg.messagePane = document.getElementById("messagepane");

    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: Startup\n");

    Enigmail.msg.savedHeaders = null;

    Enigmail.msg.decryptButton = document.getElementById(
      "button-enigmail-decrypt"
    );

    setTimeout(function () {
      // if nothing happened, then load all keys after 1 hour
      // to trigger the key check
      EnigmailKeyRing.getAllKeys();
    }, 3600 * 1000); // 1 hour

    // Need to add event listener to Enigmail.msg.messagePane to make it work
    // Adding to msgFrame doesn't seem to work
    Enigmail.msg.messagePane.addEventListener(
      "unload",
      Enigmail.msg.messageFrameUnload.bind(Enigmail.msg),
      true
    );

    EnigmailMsgRead.ensureExtraAddonHeaders();
    gMessageListeners.push(Enigmail.msg.messageListener);
    Enigmail.msg.messageListener.onEndHeaders();
  },

  messageListener: {
    onStartHeaders() {
      Enigmail.hdrView.reset();
      Enigmail.msg.mimeParts = null;

      /*
      if ("autocrypt" in gExpandedHeaderView) {
        delete gExpandedHeaderView.autocrypt;
      }
      */
      if ("openpgp" in gExpandedHeaderView) {
        delete gExpandedHeaderView.openpgp;
      }
    },
    onEndHeaders() {},
    onEndAttachments() {},
  },

  /*
  viewSecurityInfo(event, displaySmimeMsg) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: viewSecurityInfo\n");

    if (event && event.button !== 0) {
      return;
    }

    if (gSignatureStatus >= 0 || gEncryptionStatus >= 0) {
      showMessageReadSecurityInfo();
    } else if (Enigmail.msg.securityInfo) {
      this.viewOpenpgpInfo();
    } else {
      showMessageReadSecurityInfo();
    }
  },
  */

  clearLastMessage() {
    EnigmailSingletons.clearLastDecryptedMessage();
  },

  messageReload(noShowReload) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: messageReload: " + noShowReload + "\n"
    );

    this.clearLastMessage();
    ReloadMessage();
  },

  messengerClose() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messengerClose()\n");
  },

  reloadCompleteMsg() {
    this.clearLastMessage();
    ReloadMessage();
  },

  setAttachmentReveal(attachmentList) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: setAttachmentReveal\n");

    var revealBox = document.getElementById("enigmailRevealAttachments");
    if (revealBox) {
      // there are situations when evealBox is not yet present
      revealBox.setAttribute("hidden", !attachmentList ? "true" : "false");
    }
  },

  messageCleanup() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageCleanup\n");
    for (let value of [
      "decryptInlinePGReminder",
      "decryptInlinePG",
      "brokenExchangeProgress",
      "hasNestedEncryptedParts",
      "hasConflictingKeyOpenPGP",
    ]) {
      this.removeNotification(value);
    }
    Enigmail.msg.showPartialDecryptionReminder = false;

    let element = document.getElementById("openpgpKeyBox");
    if (element) {
      element.hidden = true;
    }
    element = document.getElementById("signatureKeyBox");
    if (element) {
      element.hidden = true;
      element.removeAttribute("keyid");
    }

    this.setAttachmentReveal(null);

    Enigmail.msg.decryptedMessage = null;
    Enigmail.msg.securityInfo = null;

    Enigmail.msg.allAttachmentsDone = false;
    Enigmail.msg.messageDecryptDone = false;

    let cryptoBox = document.getElementById("cryptoBox");
    if (cryptoBox) {
      cryptoBox.removeAttribute("decryptDone");
    }

    Enigmail.msg.toAndCCSet = null;
    Enigmail.msg.authorEmail = "";

    Enigmail.msg.keyCollectCandidates = new Map();

    EnigmailKeyRing.emailAddressesWithSecretKey = null;

    Enigmail.msg.attachedKeys = [];
    Enigmail.msg.attachedSenderEmailKeysIndex = [];

    Enigmail.msg.autoProcessPgpKeyAttachmentTransactionID++;
    Enigmail.msg.autoProcessPgpKeyAttachmentCount = 0;
    Enigmail.msg.autoProcessPgpKeyAttachmentProcessed = 0;
    Enigmail.msg.unhideMissingSigKeyBoxIsTODO = false;
    Enigmail.msg.missingSigKey = null;
    Enigmail.msg.buggyMailType = null;
  },

  messageFrameUnload() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageFrameUnload\n");
    Enigmail.msg.savedHeaders = null;
    Enigmail.msg.messageCleanup();
  },

  getCurrentMsgUriSpec() {
    return gMessageURI || "";
  },

  getCurrentMsgUrl() {
    var uriSpec = this.getCurrentMsgUriSpec();
    return EnigmailMsgRead.getUrlFromUriSpec(uriSpec);
  },

  updateOptionsDisplay() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: updateOptionsDisplay: \n");
    var optList = ["autoDecrypt"];

    for (let j = 0; j < optList.length; j++) {
      let menuElement = document.getElementById("enigmail_" + optList[j]);
      menuElement.setAttribute(
        "checked",
        Services.prefs.getBoolPref("temp.openpgp.autoDecrypt")
          ? "true"
          : "false"
      );

      menuElement = document.getElementById("enigmail_" + optList[j] + "2");
      if (menuElement) {
        menuElement.setAttribute(
          "checked",
          Services.prefs.getBoolPref("temp.openpgp.autoDecrypt")
            ? "true"
            : "false"
        );
      }
    }

    optList = ["decryptverify"];
    for (let j = 0; j < optList.length; j++) {
      let menuElement = document.getElementById("enigmail_" + optList[j]);
      if (Enigmail.msg.decryptButton && Enigmail.msg.decryptButton.disabled) {
        menuElement.setAttribute("disabled", "true");
      } else {
        menuElement.removeAttribute("disabled");
      }

      menuElement = document.getElementById("enigmail_" + optList[j] + "2");
      if (menuElement) {
        if (Enigmail.msg.decryptButton && Enigmail.msg.decryptButton.disabled) {
          menuElement.setAttribute("disabled", "true");
        } else {
          menuElement.removeAttribute("disabled");
        }
      }
    }
  },

  setMainMenuLabel() {
    let o = ["menu_Enigmail", "appmenu-Enigmail"];

    let m0 = document.getElementById(o[0]);
    let m1 = document.getElementById(o[1]);

    m1.setAttribute("enigmaillabel", m0.getAttribute("enigmaillabel"));

    for (let menuId of o) {
      let menu = document.getElementById(menuId);

      if (menu) {
        let lbl = menu.getAttribute("enigmaillabel");
        menu.setAttribute("label", lbl);
      }
    }
  },

  displayMainMenu(menuPopup) {
    let obj = menuPopup.firstChild;

    while (obj) {
      if (
        obj.getAttribute("enigmailtype") == "enigmail" ||
        obj.getAttribute("advanced") == "true"
      ) {
        obj.removeAttribute("hidden");
      }

      obj = obj.nextSibling;
    }

    EnigmailFuncs.collapseAdvanced(
      menuPopup,
      "hidden",
      Enigmail.msg.updateOptionsDisplay()
    );
  },

  /**
   * Determine if Autocrypt is enabled for the currently selected message
   */
  /*
  isAutocryptEnabled() {
    try {
      let email = EnigmailFuncs.stripEmail(
        gFolderDisplay.selectedMessage.recipients
      ).toLowerCase();
      let identity = MailServices.accounts.allIdentities.find(id =>
        id.email?.toLowerCase() == email
      );

      if (identity) {
        let acct = EnigmailFuncs.getAccountForIdentity(identity);
        return acct.incomingServer.getBoolValue("enableAutocrypt");
      }
    } catch (ex) {}

    return false;
  },
  */

  messageImport() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageImport:\n");

    return this.messageParse(
      true,
      true,
      "",
      this.getCurrentMsgUriSpec(),
      false
    );
  },

  /***
   * check that handler for multipart/signed is set to Enigmail.
   * if handler is different, change it and reload message
   *
   * @return: - true if handler is OK
   *          - false if handler was changed and message is reloaded
   */
  checkPgpmimeHandler() {
    if (
      EnigmailVerify.currentCtHandler !== EnigmailConstants.MIME_HANDLER_PGPMIME
    ) {
      EnigmailVerify.registerPGPMimeHandler();
      this.messageReload();
      return false;
    }

    return true;
  },

  // callback function for automatic decryption
  async messageAutoDecrypt() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageAutoDecrypt:\n");
    await Enigmail.msg.messageDecrypt(null, true);
  },

  async notifyMessageDecryptDone() {
    Enigmail.msg.messageDecryptDone = true;
    await Enigmail.msg.processAfterAttachmentsAndDecrypt();

    // Show the partial inline encryption reminder only if the decryption action
    // came from a partially inline encrypted message.
    if (Enigmail.msg.showPartialDecryptionReminder) {
      Enigmail.msg.showPartialDecryptionReminder = false;

      this.notificationBox.appendNotification(
        "decryptInlinePGReminder",
        {
          label: await document.l10n.formatValue(
            "openpgp-reminder-partial-display"
          ),
          priority: this.notificationBox.PRIORITY_INFO_HIGH,
        },
        null
      );
    }
  },

  // analyse message header and decrypt/verify message
  async messageDecrypt(event, isAuto) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: messageDecrypt: " + event + "\n"
    );

    event = !!event;

    this.mimeParts = null;

    if (!isAuto) {
      EnigmailVerify.setManualUri(this.getCurrentMsgUriSpec());
    }

    let contentType = "text/plain";
    if ("content-type" in currentHeaderData) {
      contentType = currentHeaderData["content-type"].headerValue;
    }

    // don't parse message if we know it's a PGP/MIME message
    if (
      contentType.search(/^multipart\/encrypted(;|$)/i) === 0 &&
      contentType.search(/application\/pgp-encrypted/i) > 0
    ) {
      this.movePEPsubject();
      await this.messageDecryptCb(event, isAuto, null);
      await this.notifyMessageDecryptDone();
      return;
    } else if (
      contentType.search(/^multipart\/signed(;|$)/i) === 0 &&
      contentType.search(/application\/pgp-signature/i) > 0
    ) {
      this.movePEPsubject();
      await this.messageDecryptCb(event, isAuto, null);
      await this.notifyMessageDecryptDone();
      return;
    }

    let url = this.getCurrentMsgUrl();
    if (!url) {
      await Enigmail.msg.messageDecryptCb(event, isAuto, null);
      await Enigmail.msg.notifyMessageDecryptDone();
      return;
    }
    await new Promise(resolve => {
      EnigmailMime.getMimeTreeFromUrl(
        url.spec,
        false,
        async function (mimeMsg) {
          await Enigmail.msg.messageDecryptCb(event, isAuto, mimeMsg);
          await Enigmail.msg.notifyMessageDecryptDone();
          resolve();
        }
      );
    });
  },

  /***
   * walk through the (sub-) mime tree and determine PGP/MIME encrypted and signed message parts
   *
   * @param mimePart:  parent object to walk through
   * @param resultObj: object containing two arrays. The resultObj must be pre-initialized by the caller
   *                    - encrypted
   *                    - signed
   */
  enumerateMimeParts(mimePart, resultObj) {
    EnigmailLog.DEBUG(
      'enumerateMimeParts: partNum="' + mimePart.partNum + '"\n'
    );
    EnigmailLog.DEBUG("                    " + mimePart.fullContentType + "\n");
    EnigmailLog.DEBUG(
      "                    " + mimePart.subParts.length + " subparts\n"
    );

    try {
      var ct = mimePart.fullContentType;
      if (typeof ct == "string") {
        ct = ct.replace(/[\r\n]/g, " ");
        if (ct.search(/multipart\/signed.*application\/pgp-signature/i) >= 0) {
          resultObj.signed.push(mimePart.partNum);
        } else if (ct.search(/application\/pgp-encrypted/i) >= 0) {
          resultObj.encrypted.push(mimePart.partNum);
        }
      }
    } catch (ex) {
      // catch exception if no headers or no content-type defined.
    }

    var i;
    for (i in mimePart.subParts) {
      this.enumerateMimeParts(mimePart.subParts[i], resultObj);
    }
  },

  async messageDecryptCb(event, isAuto, mimeMsg) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageDecryptCb:\n");

    let enigmailSvc;
    let contentType = "";
    try {
      if (!mimeMsg) {
        EnigmailLog.DEBUG(
          "enigmailMessengerOverlay.js: messageDecryptCb: mimeMsg is null\n"
        );
        try {
          contentType = currentHeaderData["content-type"].headerValue;
        } catch (ex) {
          contentType = "text/plain";
        }
        mimeMsg = {
          partNum: "1",
          headers: {
            has() {
              return false;
            },
            contentType: {
              type: contentType,
              mediatype: "",
              subtype: "",
            },
          },
          fullContentType: contentType,
          body: "",
          parent: null,
          subParts: [],
        };
      }

      // Copy selected headers
      Enigmail.msg.savedHeaders = {
        autocrypt: [],
      };

      for (let h in currentHeaderData) {
        if (h.search(/^autocrypt\d*$/) === 0) {
          Enigmail.msg.savedHeaders.autocrypt.push(
            currentHeaderData[h].headerValue
          );
        }
      }

      if (!mimeMsg.fullContentType) {
        mimeMsg.fullContentType = "text/plain";
      }

      Enigmail.msg.savedHeaders["content-type"] = mimeMsg.fullContentType;
      this.mimeParts = mimeMsg;

      for (var index = 0; index < Enigmail.msg.headersList.length; index++) {
        var headerName = Enigmail.msg.headersList[index];
        var headerValue = "";

        if (mimeMsg.headers.has(headerName)) {
          let h = mimeMsg.headers.get(headerName);
          if (Array.isArray(h)) {
            headerValue = h.join("");
          } else {
            headerValue = h;
          }
        }
        Enigmail.msg.savedHeaders[headerName] = headerValue;
        EnigmailLog.DEBUG(
          "enigmailMessengerOverlay.js: header " +
            headerName +
            ": '" +
            headerValue +
            "'\n"
        );
      }

      var msgSigned =
        mimeMsg.fullContentType.search(/^multipart\/signed/i) === 0 &&
        EnigmailMime.getProtocol(mimeMsg.fullContentType).search(
          /^application\/pgp-signature/i
        ) === 0;
      var msgEncrypted =
        mimeMsg.fullContentType.search(/^multipart\/encrypted/i) === 0 &&
        EnigmailMime.getProtocol(mimeMsg.fullContentType).search(
          /^application\/pgp-encrypted/i
        ) === 0;
      var resultObj = {
        encrypted: [],
        signed: [],
      };

      if (mimeMsg.subParts.length > 0) {
        this.enumerateMimeParts(mimeMsg, resultObj);
        EnigmailLog.DEBUG(
          "enigmailMessengerOverlay.js: embedded objects: " +
            resultObj.encrypted.join(", ") +
            " / " +
            resultObj.signed.join(", ") +
            "\n"
        );

        msgSigned = msgSigned || resultObj.signed.length > 0;
        msgEncrypted = msgEncrypted || resultObj.encrypted.length > 0;

        /*
        if (
          "autocrypt-setup-message" in Enigmail.msg.savedHeaders &&
          Enigmail.msg.savedHeaders["autocrypt-setup-message"].toLowerCase() ===
            "v1"
        ) {
          if (
            currentAttachments[0].contentType.search(
              /^application\/autocrypt-setup$/i
            ) === 0
          ) {
            Enigmail.hdrView.displayAutoCryptSetupMsgHeader();
            return;
          }
        }
        */

        // HACK for Zimbra OpenPGP Zimlet
        // Zimbra illegally changes attachment content-type to application/pgp-encrypted which interfers with below
        // see https://sourceforge.net/p/enigmail/bugs/600/

        try {
          if (
            mimeMsg.subParts.length > 1 &&
            mimeMsg.headers.has("x-mailer") &&
            mimeMsg.headers.get("x-mailer")[0].includes("ZimbraWebClient") &&
            mimeMsg.subParts[0].fullContentType.includes("text/plain") &&
            mimeMsg.fullContentType.includes("multipart/mixed") &&
            mimeMsg.subParts[1].fullContentType.includes(
              "application/pgp-encrypted"
            )
          ) {
            await this.messageParse(
              event,
              false,
              Enigmail.msg.savedHeaders["content-transfer-encoding"],
              this.getCurrentMsgUriSpec(),
              isAuto
            );
            return;
          }
        } catch (ex) {
          console.debug(ex);
        }

        // HACK for MS-EXCHANGE-Server Problem:
        // check for possible bad mime structure due to buggy exchange server:
        // - multipart/mixed Container with
        //   - application/pgp-encrypted Attachment with name "PGPMIME Versions Identification"
        //   - application/octet-stream Attachment with name "encrypted.asc" having the encrypted content in base64
        // - see:
        //   - http://www.mozilla-enigmail.org/forum/viewtopic.php?f=4&t=425
        //   - http://sourceforge.net/p/enigmail/forum/support/thread/4add2b69/

        // iPGMail produces a similar broken structure, see here:
        //   - https://sourceforge.net/p/enigmail/forum/support/thread/afc9c246/#5de7

        // Don't attempt to detect again, if we have already decided
        // it's a buggy exchange message (buggyMailType is already set).

        if (
          !Enigmail.msg.buggyMailType &&
          mimeMsg.subParts.length == 3 &&
          mimeMsg.fullContentType.search(/multipart\/mixed/i) >= 0 &&
          mimeMsg.subParts[0].fullContentType.search(/multipart\/encrypted/i) <
            0 &&
          mimeMsg.subParts[0].fullContentType.search(
            /(text\/(plain|html)|multipart\/alternative)/i
          ) >= 0 &&
          mimeMsg.subParts[1].fullContentType.search(
            /application\/pgp-encrypted/i
          ) >= 0
        ) {
          if (
            mimeMsg.subParts[1].fullContentType.search(
              /multipart\/encrypted/i
            ) < 0 &&
            mimeMsg.subParts[1].fullContentType.search(
              /PGP\/?MIME Versions? Identification/i
            ) >= 0 &&
            mimeMsg.subParts[2].fullContentType.search(
              /application\/octet-stream/i
            ) >= 0 &&
            mimeMsg.subParts[2].fullContentType.search(/encrypted.asc/i) >= 0
          ) {
            this.buggyMailType = "exchange";
          } else {
            this.buggyMailType = "iPGMail";
          }

          // signal that the structure matches to save the content later on
          EnigmailLog.DEBUG(
            "enigmailMessengerOverlay: messageDecryptCb: enabling MS-Exchange hack\n"
          );

          await this.buggyMailHeader();
          return;
        }
      }

      var contentEncoding = "";
      var msgUriSpec = this.getCurrentMsgUriSpec();

      if (Enigmail.msg.savedHeaders) {
        contentType = Enigmail.msg.savedHeaders["content-type"];
        contentEncoding =
          Enigmail.msg.savedHeaders["content-transfer-encoding"];
      }

      let smime =
        contentType.search(
          /multipart\/signed; protocol="application\/pkcs7-signature/i
        ) >= 0;
      if (!smime && (msgSigned || msgEncrypted)) {
        // PGP/MIME messages
        enigmailSvc = Enigmail.getEnigmailSvc();
        if (!enigmailSvc) {
          return;
        }

        if (!Enigmail.msg.checkPgpmimeHandler()) {
          return;
        }

        if (isAuto && !Services.prefs.getBoolPref("temp.openpgp.autoDecrypt")) {
          if (EnigmailVerify.getManualUri() != this.getCurrentMsgUriSpec()) {
            // decryption set to manual
            Enigmail.hdrView.updatePgpStatus(
              EnigmailConstants.POSSIBLE_PGPMIME,
              0, // exitCode, statusFlags
              0,
              "",
              "", // keyId, userId
              "", // sigDetails
              await l10n.formatValue("possibly-pgp-mime"), // infoMsg
              null, // blockSeparation
              null, // encToDetails
              null
            ); // xtraStatus
          }
        } else if (!isAuto) {
          Enigmail.msg.messageReload(false);
        }
        return;
      }

      // inline-PGP messages
      if (!isAuto || Services.prefs.getBoolPref("temp.openpgp.autoDecrypt")) {
        await this.messageParse(
          event,
          false,
          contentEncoding,
          msgUriSpec,
          isAuto
        );
      }
    } catch (ex) {
      EnigmailLog.writeException(
        "enigmailMessengerOverlay.js: messageDecryptCb",
        ex
      );
    }
  },

  /**
   * Display header about reparing buggy MS-Exchange messages.
   */
  async buggyMailHeader() {
    let uri = this.getCurrentMsgUrl();
    Enigmail.hdrView.headerPane.updateSecurityStatus(
      "",
      0,
      0,
      0,
      "",
      "",
      "",
      "",
      "",
      uri,
      "",
      "1"
    );

    // Warn that we can't fix a message that was opened from a local file.
    if (!gFolder) {
      Enigmail.msg.notificationBox.appendNotification(
        "brokenExchange",
        {
          label: await document.l10n.formatValue(
            "openpgp-broken-exchange-opened"
          ),
          priority: Enigmail.msg.notificationBox.PRIORITY_WARNING_MEDIUM,
        },
        null
      );
      return;
    }

    let buttons = [
      {
        "l10n-id": "openpgp-broken-exchange-repair",
        popup: null,
        callback(notification, button) {
          Enigmail.msg.fixBuggyExchangeMail();
          return false; // Close notification.
        },
      },
    ];

    Enigmail.msg.notificationBox.appendNotification(
      "brokenExchange",
      {
        label: await document.l10n.formatValue("openpgp-broken-exchange-info"),
        priority: Enigmail.msg.notificationBox.PRIORITY_WARNING_MEDIUM,
      },
      buttons
    );
  },

  getFirstPGPMessageType(msgText) {
    let indexEncrypted = msgText.indexOf("-----BEGIN PGP MESSAGE-----");
    let indexSigned = msgText.indexOf("-----BEGIN PGP SIGNED MESSAGE-----");
    if (indexEncrypted >= 0) {
      if (
        indexSigned == -1 ||
        (indexSigned >= 0 && indexEncrypted < indexSigned)
      ) {
        return "encrypted";
      }
    }

    if (indexSigned >= 0) {
      return "signed";
    }

    return "";
  },

  trimIfEncrypted(msgText) {
    // If it's an encrypted message, we want to trim (at least) the
    // separator line between the header and the content.
    // However, trimming all lines should be safe.

    if (Enigmail.msg.getFirstPGPMessageType(msgText) == "encrypted") {
      // \xA0 is non-breaking-space
      msgText = msgText.replace(/^[ \t\xA0]+/gm, "");
    }
    return msgText;
  },

  async messageParse(
    interactive,
    importOnly,
    contentEncoding,
    msgUriSpec,
    isAuto,
    pbMessageIndex = "0"
  ) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: messageParse: " + interactive + "\n"
    );

    var bodyElement = this.getBodyElement(pbMessageIndex);
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: bodyElement=" + bodyElement + "\n"
    );

    if (!bodyElement) {
      return;
    }

    let topElement = bodyElement;
    var findStr = /* interactive ? null : */ "-----BEGIN PGP";
    var msgText = null;
    var foundIndex = -1;

    let bodyElementFound = false;
    let hasHeadOrTailNode = false;

    if (bodyElement.firstChild) {
      let node = bodyElement.firstChild;
      while (node) {
        if (
          node.firstChild &&
          node.firstChild.nodeName.toUpperCase() == "LEGEND" &&
          node.firstChild.className == "moz-mime-attachment-header-name"
        ) {
          // we reached the area where inline attachments are displayed
          // --> don't try to decrypt displayed inline attachments
          break;
        }
        if (node.nodeName === "DIV") {
          if (bodyElementFound) {
            hasHeadOrTailNode = true;
            break;
          }

          foundIndex = node.textContent.indexOf(findStr);

          if (foundIndex < 0) {
            hasHeadOrTailNode = true;
            node = node.nextSibling;
            continue;
          }

          if (foundIndex >= 0) {
            if (
              node.textContent.indexOf(findStr + " LICENSE AUTHORIZATION") ==
              foundIndex
            ) {
              foundIndex = -1;
              node = node.nextSibling;
              continue;
            }
          }

          if (foundIndex === 0) {
            bodyElement = node;
            bodyElementFound = true;
          } else if (
            foundIndex > 0 &&
            node.textContent.substr(foundIndex - 1, 1).search(/[\r\n]/) === 0
          ) {
            bodyElement = node;
            bodyElementFound = true;
          }
        }
        node = node.nextSibling;
      }
    }

    if (foundIndex >= 0 && !this.hasInlineQuote(topElement)) {
      let beginIndex = {};
      let endIndex = {};
      let indentStr = {};

      if (
        Enigmail.msg.savedHeaders["content-type"].search(/^text\/html/i) === 0
      ) {
        let p = Cc["@mozilla.org/parserutils;1"].createInstance(
          Ci.nsIParserUtils
        );
        const de = Ci.nsIDocumentEncoder;
        msgText = p.convertToPlainText(
          topElement.innerHTML,
          de.OutputRaw | de.OutputBodyOnly,
          0
        );
      } else {
        msgText = bodyElement.textContent;
      }

      if (!isAuto) {
        let blockType = EnigmailArmor.locateArmoredBlock(
          msgText,
          0,
          "",
          beginIndex,
          endIndex,
          indentStr
        );
        if (!blockType) {
          msgText = "";
        } else {
          msgText = msgText.substring(beginIndex.value, endIndex.value + 1);
        }
      }

      msgText = this.trimIfEncrypted(msgText);
    }

    if (!msgText) {
      // No PGP content
      return;
    }

    let charset = currentCharacterSet ?? "";
    if (charset != "UTF-8") {
      // Encode ciphertext to charset from unicode
      msgText = EnigmailData.convertFromUnicode(msgText, charset);
    }

    if (isAuto) {
      let ht = hasHeadOrTailNode || this.hasHeadOrTailBesidesInlinePGP(msgText);
      if (ht) {
        let infoId;
        let buttonId;
        if (
          ht & EnigmailConstants.UNCERTAIN_SIGNATURE ||
          Enigmail.msg.getFirstPGPMessageType(msgText) == "signed"
        ) {
          infoId = "openpgp-partially-signed";
          buttonId = "openpgp-partial-verify-button";
        } else {
          infoId = "openpgp-partially-encrypted";
          buttonId = "openpgp-partial-decrypt-button";
        }

        let [description, buttonLabel] = await document.l10n.formatValues([
          { id: infoId },
          { id: buttonId },
        ]);

        let buttons = [
          {
            label: buttonLabel,
            popup: null,
            callback(aNotification, aButton) {
              Enigmail.msg.processOpenPGPSubset();
              return false; // Close notification.
            },
          },
        ];

        this.notificationBox.appendNotification(
          "decryptInlinePG",
          {
            label: description,
            priority: this.notificationBox.PRIORITY_INFO_HIGH,
          },
          buttons
        );
        return;
      }
    }

    var mozPlainText = bodyElement.innerHTML.search(/class="moz-text-plain"/);

    if (mozPlainText >= 0 && mozPlainText < 40) {
      // workaround for too much expanded emoticons in plaintext msg
      var r = new RegExp(
        /( )(;-\)|:-\)|;\)|:\)|:-\(|:\(|:-\\|:-P|:-D|:-\[|:-\*|>:o|8-\)|:-\$|:-X|=-O|:-!|O:-\)|:'\()( )/g
      );
      if (msgText.search(r) >= 0) {
        EnigmailLog.DEBUG(
          "enigmailMessengerOverlay.js: messageParse: performing emoticons fixing\n"
        );
        msgText = msgText.replace(r, "$2");
      }
    }

    // ignoring text following armored block

    //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: msgText='"+msgText+"'\n");

    var mailNewsUrl = EnigmailMsgRead.getUrlFromUriSpec(msgUriSpec);

    var urlSpec = mailNewsUrl ? mailNewsUrl.spec : "";

    let retry = 1;

    await Enigmail.msg.messageParseCallback(
      msgText,
      EnigmailDecryption.getMsgDate(window),
      contentEncoding,
      charset,
      interactive,
      importOnly,
      urlSpec,
      "",
      retry,
      "", // head
      "", // tail
      msgUriSpec,
      isAuto,
      pbMessageIndex
    );
  },

  hasInlineQuote(node) {
    if (node.innerHTML.search(/<blockquote.*-----BEGIN PGP /i) < 0) {
      return false;
    }

    return EnigmailMsgRead.searchQuotedPgp(node);
  },

  hasHeadOrTailBesidesInlinePGP(msgText) {
    let startIndex = msgText.search(/-----BEGIN PGP (SIGNED )?MESSAGE-----/m);
    let endIndex = msgText.indexOf("-----END PGP");
    let hasHead = false;
    let hasTail = false;
    let crypto = 0;

    if (startIndex > 0) {
      let pgpMsg = msgText.match(/(-----BEGIN PGP (SIGNED )?MESSAGE-----)/m)[0];
      if (pgpMsg.search(/SIGNED/) > 0) {
        crypto = EnigmailConstants.UNCERTAIN_SIGNATURE;
      } else {
        crypto = EnigmailConstants.DECRYPTION_FAILED;
      }
      let startSection = msgText.substr(0, startIndex - 1);
      hasHead = startSection.search(/\S/) >= 0;
    }

    if (endIndex > startIndex) {
      let nextLine = msgText.substring(endIndex).search(/[\n\r]/);
      if (nextLine > 0) {
        hasTail = msgText.substring(endIndex + nextLine).search(/\S/) >= 0;
      }
    }

    if (hasHead || hasTail) {
      return EnigmailConstants.PARTIALLY_PGP | crypto;
    }

    return 0;
  },

  async processOpenPGPSubset() {
    Enigmail.msg.showPartialDecryptionReminder = true;
    await this.messageDecrypt(null, false);
  },

  getBodyElement() {
    let msgFrame = document.getElementById("messagepane");
    if (!msgFrame || !msgFrame.contentDocument) {
      return null;
    }
    return msgFrame.contentDocument.getElementsByTagName("body")[0];
  },

  async messageParseCallback(
    msgText,
    msgDate,
    contentEncoding,
    charset,
    interactive,
    importOnly,
    messageUrl,
    signature,
    retry,
    head,
    tail,
    msgUriSpec,
    isAuto,
    pbMessageIndex
  ) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: messageParseCallback: " +
        interactive +
        ", " +
        interactive +
        ", importOnly=" +
        importOnly +
        ", charset=" +
        charset +
        ", msgUrl=" +
        messageUrl +
        ", retry=" +
        retry +
        ", signature='" +
        signature +
        "'\n"
    );

    if (!msgText) {
      return;
    }

    var enigmailSvc = Enigmail.getEnigmailSvc();
    if (!enigmailSvc) {
      return;
    }

    var plainText;
    var exitCode;
    var newSignature = "";
    var statusFlags = 0;
    var extStatusFlags = 0;

    var errorMsgObj = {
      value: "",
    };
    var keyIdObj = {};
    var userIdObj = {};
    var sigDetailsObj = {};
    var encToDetailsObj = {};

    var blockSeparationObj = {
      value: "",
    };

    if (importOnly) {
      // Import public key
      await this.importKeyFromMsgBody(msgText);
      return;
    }
    let armorHeaders = EnigmailArmor.getArmorHeaders(msgText);
    if ("charset" in armorHeaders) {
      charset = armorHeaders.charset;
      EnigmailLog.DEBUG(
        "enigmailMessengerOverlay.js: messageParseCallback: OVERRIDING charset=" +
          charset +
          "\n"
      );
    }

    var exitCodeObj = {};
    var statusFlagsObj = {};
    var signatureObj = {};
    signatureObj.value = signature;

    var uiFlags = interactive
      ? EnigmailConstants.UI_INTERACTIVE |
        // EnigmailConstants.UI_ALLOW_KEY_IMPORT |
        EnigmailConstants.UI_UNVERIFIED_ENC_OK
      : 0;

    plainText = EnigmailDecryption.decryptMessage(
      window,
      uiFlags,
      msgText,
      msgDate,
      signatureObj,
      exitCodeObj,
      statusFlagsObj,
      keyIdObj,
      userIdObj,
      sigDetailsObj,
      errorMsgObj,
      blockSeparationObj,
      encToDetailsObj
    );

    //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParseCallback: plainText='"+plainText+"'\n");

    exitCode = exitCodeObj.value;
    newSignature = signatureObj.value;

    if (plainText === "" && exitCode === 0) {
      plainText = " ";
    }

    statusFlags = statusFlagsObj.value;
    extStatusFlags = statusFlagsObj.ext;

    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: messageParseCallback: newSignature='" +
        newSignature +
        "'\n"
    );

    var errorMsg = errorMsgObj.value;

    if (importOnly) {
      if (interactive && errorMsg) {
        EnigmailDialog.alert(window, errorMsg);
      }
      return;
    }

    var displayedUriSpec = Enigmail.msg.getCurrentMsgUriSpec();
    if (!msgUriSpec || displayedUriSpec == msgUriSpec) {
      if (exitCode && !statusFlags) {
        // Failure, but we don't know why it failed.
        // Peek inside msgText, and check what kind of content it is,
        // so we can show a minimal error.

        let msgType = Enigmail.msg.getFirstPGPMessageType(msgText);
        if (msgType == "encrypted") {
          statusFlags = EnigmailConstants.DECRYPTION_FAILED;
        } else if (msgType == "signed") {
          statusFlags = EnigmailConstants.BAD_SIGNATURE;
        }
      }

      Enigmail.hdrView.updatePgpStatus(
        exitCode,
        statusFlags,
        extStatusFlags,
        keyIdObj.value,
        userIdObj.value,
        sigDetailsObj.value,
        errorMsg,
        null, // blockSeparation
        encToDetailsObj.value,
        null
      ); // xtraStatus
    }

    var noSecondTry =
      EnigmailConstants.GOOD_SIGNATURE |
      EnigmailConstants.EXPIRED_SIGNATURE |
      EnigmailConstants.EXPIRED_KEY_SIGNATURE |
      EnigmailConstants.EXPIRED_KEY |
      EnigmailConstants.REVOKED_KEY |
      EnigmailConstants.NO_PUBKEY |
      EnigmailConstants.NO_SECKEY |
      EnigmailConstants.IMPORTED_KEY |
      EnigmailConstants.MISSING_PASSPHRASE |
      EnigmailConstants.BAD_PASSPHRASE |
      EnigmailConstants.UNKNOWN_ALGO |
      EnigmailConstants.DECRYPTION_OKAY |
      EnigmailConstants.OVERFLOWED;

    if (exitCode !== 0 && !(statusFlags & noSecondTry)) {
      // Bad signature/armor
      if (retry == 1) {
        msgText = EnigmailData.convertFromUnicode(msgText, "UTF-8");
        await Enigmail.msg.messageParseCallback(
          msgText,
          msgDate,
          contentEncoding,
          charset,
          interactive,
          importOnly,
          messageUrl,
          signature,
          retry + 1,
          head,
          tail,
          msgUriSpec,
          isAuto,
          pbMessageIndex
        );
        return;
      } else if (retry == 2) {
        // Try to verify signature by accessing raw message text directly
        // (avoid recursion by setting retry parameter to false on callback)
        newSignature = "";
        await Enigmail.msg.msgDirectDecrypt(
          interactive,
          importOnly,
          contentEncoding,
          charset,
          newSignature,
          0,
          head,
          tail,
          msgUriSpec,
          msgDate,
          Enigmail.msg.messageParseCallback,
          isAuto
        );
        return;
      } else if (retry == 3) {
        msgText = EnigmailData.convertFromUnicode(msgText, "UTF-8");
        await Enigmail.msg.messageParseCallback(
          msgText,
          msgDate,
          contentEncoding,
          charset,
          interactive,
          importOnly,
          messageUrl,
          null,
          retry + 1,
          head,
          tail,
          msgUriSpec,
          isAuto,
          pbMessageIndex
        );
        return;
      }
    }

    if (!plainText) {
      // Show the subset that we cannot process, together with status.
      plainText = msgText;
    }

    if (retry >= 2) {
      plainText = EnigmailData.convertFromUnicode(
        EnigmailData.convertToUnicode(plainText, "UTF-8"),
        charset
      );
    }

    // TODO: what is blockSeparation ? How to emulate with RNP?
    /*
    if (blockSeparationObj.value.includes(" ")) {
      var blocks = blockSeparationObj.value.split(/ /);
      var blockInfo = blocks[0].split(/:/);
      plainText =
        EnigmailData.convertFromUnicode(
          "*Parts of the message have NOT been signed nor encrypted*",
          charset
        ) +
        "\n\n" +
        plainText.substr(0, blockInfo[1]) +
        "\n\n" +
        "*Multiple message blocks found -- decryption/verification aborted*";
    }
    */

    // Save decrypted message status, headers, and content
    var headerList = {
      subject: "",
      from: "",
      date: "",
      to: "",
      cc: "",
    };

    var index, headerName;

    if (!gViewAllHeaders) {
      for (index = 0; index < headerList.length; index++) {
        headerList[index] = "";
      }
    } else {
      for (index = 0; index < gExpandedHeaderList.length; index++) {
        headerList[gExpandedHeaderList[index].name] = "";
      }

      for (headerName in currentHeaderData) {
        headerList[headerName] = "";
      }
    }

    for (headerName in headerList) {
      if (currentHeaderData[headerName]) {
        headerList[headerName] = currentHeaderData[headerName].headerValue;
      }
    }

    // WORKAROUND
    if (headerList.cc == headerList.to) {
      headerList.cc = "";
    }

    var hasAttachments = currentAttachments && currentAttachments.length;
    var attachmentsEncrypted = true;

    for (index in currentAttachments) {
      if (!Enigmail.msg.checkEncryptedAttach(currentAttachments[index])) {
        if (
          !EnigmailMsgRead.checkSignedAttachment(
            currentAttachments,
            index,
            currentAttachments
          )
        ) {
          attachmentsEncrypted = false;
        }
      }
    }

    Enigmail.msg.decryptedMessage = {
      url: messageUrl,
      uri: msgUriSpec,
      headerList,
      hasAttachments,
      attachmentsEncrypted,
      charset,
      plainText,
    };

    // don't display decrypted message if message selection has changed
    displayedUriSpec = Enigmail.msg.getCurrentMsgUriSpec();
    if (msgUriSpec && displayedUriSpec && displayedUriSpec != msgUriSpec) {
      return;
    }

    // Create and load one-time message URI
    var messageContent = Enigmail.msg.getDecryptedMessage(
      "message/rfc822",
      false
    );

    var node;
    var bodyElement = Enigmail.msg.getBodyElement(pbMessageIndex);

    if (bodyElement.firstChild) {
      node = bodyElement.firstChild;

      let divFound = false;

      while (node) {
        if (node.nodeName == "DIV") {
          if (divFound) {
            node.innerHTML = "";
          } else {
            // for safety reasons, we replace the complete visible message with
            // the decrypted or signed part (bug 983)
            divFound = true;
            node.innerHTML = EnigmailFuncs.formatPlaintextMsg(
              EnigmailData.convertToUnicode(messageContent, charset)
            );
            Enigmail.msg.movePEPsubject();
          }
        }
        node = node.nextSibling;
      }

      if (divFound) {
        return;
      }

      let preFound = false;

      // if no <DIV> node is found, try with <PRE> (bug 24762)
      node = bodyElement.firstChild;
      while (node) {
        if (node.nodeName == "PRE") {
          if (preFound) {
            node.innerHTML = "";
          } else {
            preFound = true;
            node.innerHTML = EnigmailFuncs.formatPlaintextMsg(
              EnigmailData.convertToUnicode(messageContent, charset)
            );
            Enigmail.msg.movePEPsubject();
          }
        }
        node = node.nextSibling;
      }

      if (preFound) {
        return;
      }
    }

    EnigmailLog.ERROR(
      "enigmailMessengerOverlay.js: no node found to replace message display\n"
    );
  },

  importAttachedSenderKey() {
    for (let info of Enigmail.msg.attachedSenderEmailKeysIndex) {
      EnigmailKeyRing.importKeyDataWithConfirmation(
        window,
        [info.keyInfo],
        Enigmail.msg.attachedKeys[info.idx],
        true,
        ["0x" + info.keyInfo.fpr]
      );
    }
  },

  async searchSignatureKey() {
    let keyId = document
      .getElementById("signatureKeyBox")
      .getAttribute("keyid");
    if (!keyId) {
      return false;
    }
    return KeyLookupHelper.lookupAndImportByKeyID(
      "interactive-import",
      window,
      keyId,
      true
    );
  },

  notifySigKeyMissing(keyId) {
    Enigmail.msg.missingSigKey = keyId;
    if (
      Enigmail.msg.allAttachmentsDone &&
      Enigmail.msg.messageDecryptDone &&
      Enigmail.msg.autoProcessPgpKeyAttachmentProcessed ==
        Enigmail.msg.autoProcessPgpKeyAttachmentCount
    ) {
      Enigmail.msg.unhideMissingSigKeyBox();
    } else {
      Enigmail.msg.unhideMissingSigKeyBoxIsTODO = true;
    }
  },

  unhideMissingSigKeyBox() {
    let sigKeyIsAttached = false;
    for (let info of Enigmail.msg.attachedSenderEmailKeysIndex) {
      if (info.keyInfo.keyId == Enigmail.msg.missingSigKey) {
        sigKeyIsAttached = true;
        break;
      }
    }
    if (!sigKeyIsAttached) {
      let b = document.getElementById("signatureKeyBox");
      b.removeAttribute("hidden");
      b.setAttribute("keyid", Enigmail.msg.missingSigKey);
    }
  },

  async importKeyFromMsgBody(msgData) {
    let beginIndexObj = {};
    let endIndexObj = {};
    let indentStrObj = {};
    let blockType = EnigmailArmor.locateArmoredBlock(
      msgData,
      0,
      "",
      beginIndexObj,
      endIndexObj,
      indentStrObj
    );
    if (!blockType || blockType !== "PUBLIC KEY BLOCK") {
      return;
    }

    let keyData = msgData.substring(beginIndexObj.value, endIndexObj.value);

    let errorMsgObj = {};
    let preview = await EnigmailKey.getKeyListFromKeyBlock(
      keyData,
      errorMsgObj,
      true,
      true,
      false
    );
    if (preview && errorMsgObj.value === "") {
      EnigmailKeyRing.importKeyDataWithConfirmation(
        window,
        preview,
        keyData,
        false
      );
    } else {
      document.l10n.formatValue("preview-failed").then(value => {
        EnigmailDialog.alert(window, value + "\n" + errorMsgObj.value);
      });
    }
  },

  /**
   * Extract the subject from the 1st content line and move it to the subject line
   */
  movePEPsubject() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: movePEPsubject:\n");

    let bodyElement = this.getBodyElement();
    if (
      bodyElement.textContent.search(/^\r?\n?Subject: [^\r\n]+\r?\n\r?\n/i) ===
        0 &&
      "subject" in currentHeaderData &&
      currentHeaderData.subject.headerValue === "pEp"
    ) {
      let m = EnigmailMime.extractSubjectFromBody(bodyElement.textContent);
      if (m) {
        let node = bodyElement.firstChild;
        let found = false;

        while (!found && node) {
          if (node.nodeName == "DIV") {
            node.innerHTML = EnigmailFuncs.formatPlaintextMsg(m.messageBody);
            found = true;
          }
          node = node.nextSibling;
        }

        // if no <DIV> node is found, try with <PRE> (bug 24762)
        node = bodyElement.firstChild;
        while (!found && node) {
          if (node.nodeName == "PRE") {
            node.innerHTML = EnigmailFuncs.formatPlaintextMsg(m.messageBody);
            found = true;
          }
          node = node.nextSibling;
        }

        Enigmail.hdrView.setSubject(m.subject);
      }
    }
  },

  /**
   * Fix broken PGP/MIME messages from MS-Exchange by replacing the broken original
   * message with a fixed copy.
   *
   * no return
   */
  async fixBuggyExchangeMail() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: fixBuggyExchangeMail:\n");

    this.notificationBox.appendNotification(
      "brokenExchangeProgress",
      {
        label: await document.l10n.formatValue("openpgp-broken-exchange-wait"),
        priority: this.notificationBox.PRIORITY_INFO_HIGH,
      },
      null
    );

    let msg = gMessage;
    EnigmailFixExchangeMsg.fixExchangeMessage(msg, this.buggyMailType)
      .then(msgKey => {
        // Display the new message which now has the key msgKey.
        EnigmailLog.DEBUG(
          "enigmailMessengerOverlay.js: fixBuggyExchangeMail: _success: msgKey=" +
            msgKey +
            "\n"
        );
        // TODO: scope is about:message, and this doesn't work
        // parent.gDBView.selectMsgByKey(msgKey);
        // ReloadMessage();
      })
      .catch(async function (ex) {
        console.debug(ex);
        EnigmailDialog.alert(
          window,
          await l10n.formatValue("fix-broken-exchange-msg-failed")
        );
      });

    // Remove the brokenExchangeProgress notification at the end of the process.
    this.removeNotification("brokenExchangeProgress");
  },

  /**
   * Hide attachments containing OpenPGP keys
   */
  hidePgpKeys() {
    let keys = [];
    for (let i = 0; i < currentAttachments.length; i++) {
      if (
        currentAttachments[i].contentType.search(/^application\/pgp-keys/i) ===
        0
      ) {
        keys.push(i);
      }
    }

    if (keys.length > 0) {
      let attachmentList = document.getElementById("attachmentList");

      for (let i = keys.length; i > 0; i--) {
        currentAttachments.splice(keys[i - 1], 1);
      }

      if (attachmentList) {
        // delete all keys from attachment list
        while (attachmentList.firstChild) {
          attachmentList.firstChild.remove();
        }

        // build new attachment list

        /* global gBuildAttachmentsForCurrentMsg: true */
        let orig = gBuildAttachmentsForCurrentMsg;
        gBuildAttachmentsForCurrentMsg = false;
        displayAttachmentsForExpandedView();
        gBuildAttachmentsForCurrentMsg = orig;
      }
    }
  },

  // check if the attachment could be encrypted
  checkEncryptedAttach(attachment) {
    return (
      EnigmailMsgRead.getAttachmentName(attachment).match(
        /\.(gpg|pgp|asc)$/i
      ) ||
      (attachment.contentType.match(/^application\/pgp(-.*)?$/i) &&
        attachment.contentType.search(/^application\/pgp-signature/i) < 0)
    );
  },

  getDecryptedMessage(contentType, includeHeaders) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: getDecryptedMessage: " +
        contentType +
        ", " +
        includeHeaders +
        "\n"
    );

    if (!Enigmail.msg.decryptedMessage) {
      return "No decrypted message found!\n";
    }

    var enigmailSvc = Enigmail.getEnigmailSvc();
    if (!enigmailSvc) {
      return "";
    }

    var headerList = Enigmail.msg.decryptedMessage.headerList;
    var statusLine = Enigmail.msg.securityInfo
      ? Enigmail.msg.securityInfo.statusLine
      : "";
    var contentData = "";
    var headerName;

    if (contentType == "message/rfc822") {
      // message/rfc822

      if (includeHeaders) {
        try {
          var msg = gMessage;
          if (msg) {
            let msgHdr = {
              From: msg.author,
              Subject: msg.subject,
              To: msg.recipients,
              Cc: msg.ccList,
              Date: new Services.intl.DateTimeFormat(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(msg.dateInSeconds * 1000)),
            };

            if (
              msg?.folder?.flags & Ci.nsMsgFolderFlags.Newsgroup &&
              currentHeaderData.newsgroups
            ) {
              msgHdr.Newsgroups = currentHeaderData.newsgroups.headerValue;
            }

            for (let headerName in msgHdr) {
              if (msgHdr[headerName] && msgHdr[headerName].length > 0) {
                contentData += headerName + ": " + msgHdr[headerName] + "\r\n";
              }
            }
          }
        } catch (ex) {
          // the above seems to fail every now and then
          // so, here is the fallback
          for (let headerName in headerList) {
            let headerValue = headerList[headerName];
            contentData += headerName + ": " + headerValue + "\r\n";
          }
        }

        contentData += "Content-Type: text/plain";

        if (Enigmail.msg.decryptedMessage.charset) {
          contentData += "; charset=" + Enigmail.msg.decryptedMessage.charset;
        }

        contentData += "\r\n";
      }

      contentData += "\r\n";

      if (
        Enigmail.msg.decryptedMessage.hasAttachments &&
        !Enigmail.msg.decryptedMessage.attachmentsEncrypted
      ) {
        contentData += EnigmailData.convertFromUnicode(
          l10n.formatValueSync("enig-content-note") + "\r\n\r\n",
          Enigmail.msg.decryptedMessage.charset
        );
      }

      contentData += Enigmail.msg.decryptedMessage.plainText;
    } else {
      // text/html or text/plain

      if (contentType == "text/html") {
        contentData +=
          '<meta http-equiv="Content-Type" content="text/html; charset=' +
          Enigmail.msg.decryptedMessage.charset +
          '">\r\n';
        contentData += "<html><head></head><body>\r\n";
      }

      if (statusLine) {
        if (contentType == "text/html") {
          contentData +=
            EnigmailMsgRead.escapeTextForHTML(statusLine, false) +
            "<br>\r\n<hr>\r\n";
        } else {
          contentData += statusLine + "\r\n\r\n";
        }
      }

      if (includeHeaders) {
        for (headerName in headerList) {
          let headerValue = headerList[headerName];

          if (headerValue) {
            if (contentType == "text/html") {
              contentData +=
                "<b>" +
                EnigmailMsgRead.escapeTextForHTML(headerName, false) +
                ":</b> " +
                EnigmailMsgRead.escapeTextForHTML(headerValue, false) +
                "<br>\r\n";
            } else {
              contentData += headerName + ": " + headerValue + "\r\n";
            }
          }
        }
      }

      if (contentType == "text/html") {
        contentData +=
          "<pre>" +
          EnigmailMsgRead.escapeTextForHTML(
            Enigmail.msg.decryptedMessage.plainText,
            false
          ) +
          "</pre>\r\n";

        contentData += "</body></html>\r\n";
      } else {
        contentData += "\r\n" + Enigmail.msg.decryptedMessage.plainText;
      }

      if (AppConstants.platform != "win") {
        contentData = contentData.replace(/\r\n/g, "\n");
      }
    }

    return contentData;
  },

  async msgDirectDecrypt(
    interactive,
    importOnly,
    contentEncoding,
    charset,
    signature,
    bufferSize,
    head,
    tail,
    msgUriSpec,
    msgDate,
    callbackFunction,
    isAuto
  ) {
    EnigmailLog.WRITE(
      "enigmailMessengerOverlay.js: msgDirectDecrypt: contentEncoding=" +
        contentEncoding +
        ", signature=" +
        signature +
        "\n"
    );
    let mailNewsUrl = this.getCurrentMsgUrl();
    if (!mailNewsUrl) {
      return;
    }

    let PromiseStreamListener = function () {
      this._promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
      this._data = null;
      this._stream = null;
    };

    PromiseStreamListener.prototype = {
      QueryInterface: ChromeUtils.generateQI(["nsIStreamListener"]),

      onStartRequest(request) {
        this.data = "";
        this.inStream = Cc[
          "@mozilla.org/scriptableinputstream;1"
        ].createInstance(Ci.nsIScriptableInputStream);
      },

      onStopRequest(request, statusCode) {
        if (statusCode != Cr.NS_OK) {
          this._reject(`Streaming failed: ${statusCode}`);
          return;
        }

        let start = this.data.indexOf("-----BEGIN PGP");
        let end = this.data.indexOf("-----END PGP");

        if (start >= 0 && end > start) {
          let tStr = this.data.substr(end);
          let n = tStr.indexOf("\n");
          let r = tStr.indexOf("\r");
          let lEnd = -1;
          if (n >= 0 && r >= 0) {
            lEnd = Math.min(r, n);
          } else if (r >= 0) {
            lEnd = r;
          } else if (n >= 0) {
            lEnd = n;
          }

          if (lEnd >= 0) {
            end += lEnd;
          }

          let data = Enigmail.msg.trimIfEncrypted(
            this.data.substring(start, end + 1)
          );
          EnigmailLog.DEBUG(
            "enigmailMessengerOverlay.js: data: >" + data.substr(0, 100) + "<\n"
          );

          let currentMsgURL = Enigmail.msg.getCurrentMsgUrl();
          let urlSpec = currentMsgURL ? currentMsgURL.spec : "";

          let l = urlSpec.length;
          if (urlSpec.substr(0, l) != mailNewsUrl.spec.substr(0, l)) {
            EnigmailLog.ERROR(
              "enigmailMessengerOverlay.js: Message URL mismatch " +
                currentMsgURL +
                " vs. " +
                urlSpec +
                "\n"
            );
            this._reject(`Msg url mismatch: ${currentMsgURL} vs ${urlSpec}`);
            return;
          }

          Enigmail.msg
            .messageParseCallback(
              data,
              msgDate,
              contentEncoding,
              charset,
              interactive,
              importOnly,
              mailNewsUrl.spec,
              signature,
              3,
              head,
              tail,
              msgUriSpec,
              isAuto
            )
            .then(() => this._resolve(this.data));
        }
      },

      onDataAvailable(request, stream, off, count) {
        this.inStream.init(stream);
        this.data += this.inStream.read(count);
      },

      get promise() {
        return this._promise;
      },
    };

    let streamListener = new PromiseStreamListener();
    let msgSvc = MailServices.messageServiceFromURI(msgUriSpec);
    msgSvc.streamMessage(
      msgUriSpec,
      streamListener,
      top.msgWindow,
      null,
      false,
      null,
      false
    );
    await streamListener;
  },

  revealAttachments(index) {
    if (!index) {
      index = 0;
    }

    if (index < currentAttachments.length) {
      this.handleAttachment(
        "revealName/" + index.toString(),
        currentAttachments[index]
      );
    }
  },

  /**
   * Set up some event handlers for the attachment items in #attachmentList.
   */
  handleAttachmentEvent() {
    let attList = document.getElementById("attachmentList");

    for (let att of attList.itemChildren) {
      att.addEventListener("click", this.attachmentItemClick.bind(this), true);
    }
  },

  // handle a selected attachment (decrypt & open or save)
  handleAttachmentSel(actionType) {
    let contextMenu = document.getElementById("attachmentItemContext");
    let anAttachment = contextMenu.attachments[0];

    switch (actionType) {
      case "saveAttachment":
      case "openAttachment":
      case "importKey":
      case "revealName":
        this.handleAttachment(actionType, anAttachment);
        break;
      case "verifySig":
        this.verifyDetachedSignature(anAttachment);
        break;
    }
  },

  /**
   * save the original file plus the signature file to disk and then verify the signature
   */
  async verifyDetachedSignature(anAttachment) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: verifyDetachedSignature: url=" +
        anAttachment.url +
        "\n"
    );

    var enigmailSvc = Enigmail.getEnigmailSvc();
    if (!enigmailSvc) {
      return;
    }

    var origAtt, signatureAtt;
    var isEncrypted = false;

    if (
      EnigmailMsgRead.getAttachmentName(anAttachment).search(/\.sig$/i) > 0 ||
      anAttachment.contentType.search(/^application\/pgp-signature/i) === 0
    ) {
      // we have the .sig file; need to know the original file;

      signatureAtt = anAttachment;
      var origName = EnigmailMsgRead.getAttachmentName(anAttachment).replace(
        /\.sig$/i,
        ""
      );

      for (let i = 0; i < currentAttachments.length; i++) {
        if (
          origName == EnigmailMsgRead.getAttachmentName(currentAttachments[i])
        ) {
          origAtt = currentAttachments[i];
          break;
        }
      }

      if (!origAtt) {
        for (let i = 0; i < currentAttachments.length; i++) {
          if (
            origName ==
            EnigmailMsgRead.getAttachmentName(currentAttachments[i]).replace(
              /\.pgp$/i,
              ""
            )
          ) {
            isEncrypted = true;
            origAtt = currentAttachments[i];
            break;
          }
        }
      }
    } else {
      // we have a supposedly original file; need to know the .sig file;

      origAtt = anAttachment;
      var attachName = EnigmailMsgRead.getAttachmentName(anAttachment);
      var sigName = attachName + ".sig";

      for (let i = 0; i < currentAttachments.length; i++) {
        if (
          sigName == EnigmailMsgRead.getAttachmentName(currentAttachments[i])
        ) {
          signatureAtt = currentAttachments[i];
          break;
        }
      }

      if (!signatureAtt && attachName.search(/\.pgp$/i) > 0) {
        sigName = attachName.replace(/\.pgp$/i, ".sig");
        for (let i = 0; i < currentAttachments.length; i++) {
          if (
            sigName == EnigmailMsgRead.getAttachmentName(currentAttachments[i])
          ) {
            isEncrypted = true;
            signatureAtt = currentAttachments[i];
            break;
          }
        }
      }
    }

    if (!signatureAtt) {
      EnigmailDialog.alert(
        window,
        l10n.formatValueSync("attachment-no-match-to-signature", {
          attachment: EnigmailMsgRead.getAttachmentName(origAtt),
        })
      );
      return;
    }
    if (!origAtt) {
      EnigmailDialog.alert(
        window,
        l10n.formatValueSync("attachment-no-match-from-signature", {
          attachment: EnigmailMsgRead.getAttachmentName(signatureAtt),
        })
      );
      return;
    }

    // open
    var outFile1 = Services.dirsvc.get("TmpD", Ci.nsIFile);
    outFile1.append(EnigmailMsgRead.getAttachmentName(origAtt));
    outFile1.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);

    let response = await fetch(origAtt.url);
    if (!response.ok) {
      throw new Error(`Bad response for url=${origAtt.url}`);
    }
    await IOUtils.writeUTF8(outFile1.path, await response.text());

    if (isEncrypted) {
      // Try to decrypt message if we suspect the message is encrypted.
      // If it fails we will just verify the encrypted data.
      let readBinaryFile = async () => {
        let data = await IOUtils.read(outFile1.path);
        return MailStringUtils.uint8ArrayToByteString(data);
      };
      await EnigmailDecryption.decryptAttachment(
        window,
        outFile1,
        EnigmailMsgRead.getAttachmentName(origAtt),
        readBinaryFile,
        {},
        {},
        {}
      );
    }

    var outFile2 = Services.dirsvc.get("TmpD", Ci.nsIFile);
    outFile2.append(EnigmailMsgRead.getAttachmentName(signatureAtt));
    outFile2.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);

    let response2 = await fetch(signatureAtt.url);
    if (!response2.ok) {
      throw new Error(`Bad response for url=${signatureAtt.url}`);
    }
    await IOUtils.writeUTF8(outFile2.path, await response2.text());

    let cApi = EnigmailCryptoAPI();
    let promise = cApi.verifyAttachment(outFile1.path, outFile2.path);
    promise.then(async function (message) {
      EnigmailDialog.info(
        window,
        l10n.formatValueSync("signature-verified-ok", {
          attachment: EnigmailMsgRead.getAttachmentName(origAtt),
        }) +
          "\n\n" +
          message
      );
    });
    promise.catch(async function (err) {
      EnigmailDialog.alert(
        window,
        l10n.formatValueSync("signature-verify-failed", {
          attachment: EnigmailMsgRead.getAttachmentName(origAtt),
        }) +
          "\n\n" +
          err
      );
    });

    outFile1.remove(false);
    outFile2.remove(false);
  },

  handleAttachment(actionType, attachment) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: handleAttachment: actionType=" +
        actionType +
        ", attachment(url)=" +
        attachment.url +
        "\n"
    );

    let bufferListener = EnigmailStreams.newStringStreamListener(async data => {
      Enigmail.msg.decryptAttachmentCallback([
        {
          actionType,
          attachment,
          forceBrowser: false,
          data,
        },
      ]);
    });
    let msgUri = Services.io.newURI(attachment.url);
    let channel = EnigmailStreams.createChannel(msgUri);
    channel.asyncOpen(bufferListener, msgUri);
  },

  setAttachmentName(attachment, newLabel, index) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: setAttachmentName (" + newLabel + "):\n"
    );

    var attList = document.getElementById("attachmentList");
    if (attList) {
      var attNode = attList.firstChild;
      while (attNode) {
        if (attNode.getAttribute("name") == attachment.name) {
          attNode.setAttribute("name", newLabel);
        }
        attNode = attNode.nextSibling;
      }
    }

    if (typeof attachment.displayName == "undefined") {
      attachment.name = newLabel;
    } else {
      attachment.displayName = newLabel;
    }

    if (index && index.length > 0) {
      this.revealAttachments(parseInt(index, 10) + 1);
    }
  },

  async decryptAttachmentCallback(cbArray) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: decryptAttachmentCallback:\n"
    );

    var callbackArg = cbArray[0];

    var exitCodeObj = {};
    var statusFlagsObj = {};
    var errorMsgObj = {};
    var exitStatus = -1;

    var outFile;
    var origFilename;
    var rawFileName = EnigmailMsgRead.getAttachmentName(
      callbackArg.attachment
    ).replace(/\.(asc|pgp|gpg)$/i, "");

    // TODO: We don't have code yet to extract the original filename
    // from an encrypted data block.
    /*
    if (callbackArg.actionType != "importKey") {
      let cApi = EnigmailCryptoAPI();
      let origFilename = await cApi.getFileName(window, callbackArg.data);
      if (origFilename && origFilename.length > rawFileName.length) {
        rawFileName = origFilename;
      }
    }
    */

    if (callbackArg.actionType == "saveAttachment") {
      outFile = EnigmailDialog.filePicker(
        window,
        l10n.formatValueSync("save-attachment-header"),
        Enigmail.msg.lastSaveDir,
        true,
        false,
        "",
        rawFileName,
        null
      );
      if (!outFile) {
        return;
      }
    } else if (callbackArg.actionType.substr(0, 10) == "revealName") {
      if (origFilename && origFilename.length > 0) {
        Enigmail.msg.setAttachmentName(
          callbackArg.attachment,
          origFilename + ".pgp",
          callbackArg.actionType.substr(11, 10)
        );
      }
      Enigmail.msg.setAttachmentReveal(null);
      return;
    } else {
      // open
      outFile = Services.dirsvc.get("TmpD", Ci.nsIFile);
      outFile.append(rawFileName);
      outFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
    }

    if (callbackArg.actionType == "importKey") {
      var preview = await EnigmailKey.getKeyListFromKeyBlock(
        callbackArg.data,
        errorMsgObj,
        true,
        true,
        false
      );

      if (errorMsgObj.value !== "" || !preview || preview.length === 0) {
        // try decrypting the attachment
        exitStatus = await EnigmailDecryption.decryptAttachment(
          window,
          outFile,
          EnigmailMsgRead.getAttachmentName(callbackArg.attachment),
          callbackArg.data,
          exitCodeObj,
          statusFlagsObj,
          errorMsgObj
        );
        if (exitStatus && exitCodeObj.value === 0) {
          // success decrypting, let's try again
          callbackArg.data = String.fromCharCode(
            ...(await IOUtils.read(outFile.path))
          );
          preview = await EnigmailKey.getKeyListFromKeyBlock(
            callbackArg.data,
            errorMsgObj,
            true,
            true,
            false
          );
        }
      }

      if (preview && errorMsgObj.value === "") {
        EnigmailKeyRing.importKeyDataWithConfirmation(
          window,
          preview,
          callbackArg.data,
          false
        );
      } else {
        document.l10n.formatValue("preview-failed").then(value => {
          EnigmailDialog.alert(window, value + "\n" + errorMsgObj.value);
        });
      }
      outFile.remove(true);
      return;
    }

    exitStatus = await EnigmailDecryption.decryptAttachment(
      window,
      outFile,
      EnigmailMsgRead.getAttachmentName(callbackArg.attachment),
      callbackArg.data,
      exitCodeObj,
      statusFlagsObj,
      errorMsgObj
    );

    if (!exitStatus || exitCodeObj.value !== 0) {
      exitStatus = false;
      if (
        statusFlagsObj.value & EnigmailConstants.DECRYPTION_OKAY &&
        statusFlagsObj.value & EnigmailConstants.UNCERTAIN_SIGNATURE
      ) {
        if (callbackArg.actionType == "openAttachment") {
          let [title, button] = await document.l10n.formatValues([
            { id: "decrypt-ok-no-sig" },
            { id: "msg-ovl-button-cont-anyway" },
          ]);

          exitStatus = EnigmailDialog.confirmDlg(window, title, button);
        } else {
          EnigmailDialog.info(
            window,
            await document.l10n.formatValue("decrypt-ok-no-sig")
          );
        }
      } else {
        let msg = await document.l10n.formatValue("failed-decrypt");
        if (errorMsgObj.errorMsg) {
          msg += "\n\n" + errorMsgObj.errorMsg;
        }
        EnigmailDialog.info(window, msg);
        exitStatus = false;
      }
    }
    if (exitStatus) {
      if (statusFlagsObj.value & EnigmailConstants.IMPORTED_KEY) {
        if (exitCodeObj.keyList) {
          let importKeyList = exitCodeObj.keyList.map(function (a) {
            return a.id;
          });
          EnigmailDialog.keyImportDlg(window, importKeyList);
        }
      } else if (statusFlagsObj.value & EnigmailConstants.DISPLAY_MESSAGE) {
        HandleSelectedAttachments("open");
      } else if (
        statusFlagsObj.value & EnigmailConstants.DISPLAY_MESSAGE ||
        callbackArg.actionType == "openAttachment"
      ) {
        var ioServ = Services.io;
        var outFileUri = ioServ.newFileURI(outFile);
        var fileExt = outFile.leafName.replace(/(.*\.)(\w+)$/, "$2");
        if (fileExt && !callbackArg.forceBrowser) {
          var extAppLauncher = Cc[
            "@mozilla.org/uriloader/external-helper-app-service;1"
          ].getService(Ci.nsPIExternalAppLauncher);
          extAppLauncher.deleteTemporaryFileOnExit(outFile);

          try {
            var mimeService = Cc["@mozilla.org/mime;1"].getService(
              Ci.nsIMIMEService
            );
            var fileMimeType = mimeService.getTypeFromFile(outFile);
            var fileMimeInfo = mimeService.getFromTypeAndExtension(
              fileMimeType,
              fileExt
            );

            fileMimeInfo.launchWithFile(outFile);
          } catch (ex) {
            // if the attachment file type is unknown, an exception is thrown,
            // so let it be handled by a browser window
            Enigmail.msg.loadExternalURL(outFileUri.asciiSpec);
          }
        } else {
          // open the attachment using an external application
          Enigmail.msg.loadExternalURL(outFileUri.asciiSpec);
        }
      }
    }
  },

  loadExternalURL(url) {
    Cc["@mozilla.org/uriloader/external-protocol-service;1"]
      .getService(Ci.nsIExternalProtocolService)
      .loadURI(Services.io.newURI(url));
  },

  // retrieves the most recent navigator window (opens one if need be)
  loadURLInNavigatorWindow(url, aOpenFlag) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: loadURLInNavigatorWindow: " +
        url +
        ", " +
        aOpenFlag +
        "\n"
    );

    var navWindow;

    // if this is a browser window, just use it
    if ("document" in top) {
      var possibleNavigator = top.document.getElementById("main-window");
      if (
        possibleNavigator &&
        possibleNavigator.getAttribute("windowtype") == "navigator:browser"
      ) {
        navWindow = top;
      }
    }

    // if not, get the most recently used browser window
    if (!navWindow) {
      var wm = Services.wm;
      navWindow = wm.getMostRecentWindow("navigator:browser");
    }

    if (navWindow) {
      if ("fixupAndLoadURIString" in navWindow) {
        navWindow.fixupAndLoadURIString(url);
      } else {
        navWindow._content.location.href = url;
      }
    } else if (aOpenFlag) {
      // if no browser window available and it's ok to open a new one, do so
      navWindow = window.open(url, "Enigmail");
    }

    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: loadURLInNavigatorWindow: navWindow=" +
        navWindow +
        "\n"
    );

    return navWindow;
  },

  /**
   * Open an encrypted attachment item.
   */
  attachmentItemClick(event) {
    EnigmailLog.DEBUG(
      "enigmailMessengerOverlay.js: attachmentItemClick: event=" + event + "\n"
    );

    let attachment = event.currentTarget.attachment;
    if (this.checkEncryptedAttach(attachment)) {
      if (event.button === 0 && event.detail == 2) {
        // double click
        this.handleAttachment("openAttachment", attachment);
        event.stopPropagation();
      }
    }
  },

  // decrypted and copy/move all selected messages in a target folder

  async decryptToFolder(destFolder, move) {
    let msgHdrs = gDBView.getSelectedMsgHdrs();
    if (!msgHdrs || msgHdrs.length === 0) {
      return;
    }

    let total = msgHdrs.length;
    let failures = 0;
    for (let msgHdr of msgHdrs) {
      await EnigmailPersistentCrypto.cryptMessage(
        msgHdr,
        destFolder.URI,
        move,
        false
      ).catch(err => {
        failures++;
      });
    }

    if (failures) {
      let info = await document.l10n.formatValue(
        "decrypt-and-copy-failures-multiple",
        {
          failures,
          total,
        }
      );
      Services.prompt.alert(null, document.title, info);
    }
  },

  async searchKeysOnInternet(event) {
    return KeyLookupHelper.lookupAndImportByEmail(
      "interactive-import",
      window,
      event.currentTarget.parentNode.headerField?.emailAddress,
      true
    );
  },

  onUnloadEnigmail() {
    window.removeEventListener("unload", Enigmail.msg.messengerClose);
    window.removeEventListener(
      "unload-enigmail",
      Enigmail.msg.onUnloadEnigmail
    );
    window.removeEventListener("load-enigmail", Enigmail.msg.messengerStartup);

    this.messageCleanup();

    if (this.messagePane) {
      this.messagePane.removeEventListener(
        "unload",
        Enigmail.msg.messageFrameUnload,
        true
      );
    }

    for (let c of this.changedAttributes) {
      let elem = document.getElementById(c.id);
      if (elem) {
        elem.setAttribute(c.attrib, c.value);
      }
    }

    this.messengerClose();

    if (Enigmail.columnHandler) {
      Enigmail.columnHandler.onUnloadEnigmail();
    }
    if (Enigmail.hdrView) {
      Enigmail.hdrView.onUnloadEnigmail();
    }

    // eslint-disable-next-line no-global-assign
    Enigmail = undefined;
  },

  /**
   * Process key data from a message.
   *
   * @param {string} keyData - The key data.
   * @param {boolean} isBinaryAutocrypt - false if ASCII armored data.
   * @param {string} [description] - Key source description, if any.
   */
  async commonProcessAttachedKey(keyData, isBinaryAutocrypt, description) {
    if (!keyData) {
      return;
    }

    // Processing is slow for some types of keys.
    // We want to avoid automatic key import/updates for users who
    // have OpenPGP disabled (no account has an OpenPGP key configured).
    if (
      !MailServices.accounts.allIdentities.find(id =>
        id.getUnicharAttribute("openpgp_key_id")
      )
    ) {
      return;
    }

    let errorMsgObj = {};
    let preview = await EnigmailKey.getKeyListFromKeyBlock(
      keyData,
      errorMsgObj,
      true,
      true,
      false,
      true
    );

    // If we cannot analyze the keyblock, or if it's empty, or if we
    // got an error message, then the key is bad and shouldn't be used.
    if (!preview || !preview.length || errorMsgObj.value) {
      return;
    }

    this.fetchParticipants();

    for (let newKey of preview) {
      let oldKey = EnigmailKeyRing.getKeyById(newKey.fpr);
      if (!oldKey) {
        // If the key is unknown, an expired key cannot help us
        // for anything new, so don't use it.
        if (newKey.keyTrust == "e") {
          continue;
        }

        // Potentially merge the revocation into CollectedKeysDB, it if
        // already has that key.
        if (newKey.keyTrust == "r") {
          let db = await CollectedKeysDB.getInstance();
          let existing = await db.findKeyForFingerprint(newKey.fpr);
          if (existing) {
            let key = await db.mergeExisting(newKey, newKey.pubKey, {
              uri: `mid:${gMessage.messageId}`,
              type: isBinaryAutocrypt ? "autocrypt" : "attachment",
              description,
            });
            await db.storeKey(key);
            Services.obs.notifyObservers(null, "openpgp-key-change");
          }
          continue;
        }

        // It doesn't make sense to import a public key,
        // if we have a secret key for that email address.
        // Because, if we are the owner of that email address, why would
        // we need a public key referring to our own email address,
        // sent to us by someone else?

        let keyInOurName = false;
        for (let userId of newKey.userIds) {
          if (userId.type !== "uid") {
            continue;
          }
          if (EnigmailTrust.isInvalid(userId.keyTrust)) {
            continue;
          }
          if (
            await EnigmailKeyRing.hasSecretKeyForEmail(
              EnigmailFuncs.getEmailFromUserID(userId.userId).toLowerCase()
            )
          ) {
            keyInOurName = true;
            break;
          }
        }
        if (keyInOurName) {
          continue;
        }

        // Only advertise the key for import if it contains a user ID
        // that points to the email author email address.
        let relatedParticipantEmailAddress = null;
        if (this.hasUserIdForEmail(newKey.userIds, this.authorEmail)) {
          relatedParticipantEmailAddress = this.authorEmail;
        }

        if (relatedParticipantEmailAddress) {
          // If it's a non expired, non revoked new key, in the email
          // author's name (email address match), then offer it for
          // manual (immediate) import.
          let nextIndex = Enigmail.msg.attachedKeys.length;
          let info = {
            fpr: "0x" + newKey.fpr,
            idx: nextIndex,
            keyInfo: newKey,
            binary: isBinaryAutocrypt,
          };
          Enigmail.msg.attachedSenderEmailKeysIndex.push(info);
          Enigmail.msg.attachedKeys.push(newKey.pubKey);
        }

        // We want to collect keys for potential later use, however,
        // we also want to avoid that an attacker can send us a large
        // number of keys to poison our cache, so we only collect keys
        // that are related to the author or one of the recipients.
        // Also, we don't want a public key, if we already have a
        // secret key for that email address.

        if (!relatedParticipantEmailAddress) {
          // Not related to the author
          for (let toOrCc of this.toAndCCSet) {
            if (this.hasUserIdForEmail(newKey.userIds, toOrCc)) {
              // Might be ok to import, so remember to which email
              // the key is related and leave the loop.
              relatedParticipantEmailAddress = toOrCc;
              break;
            }
          }
        }

        if (relatedParticipantEmailAddress) {
          // It seems OK to import, however, don't import yet.
          // Wait until after we have processed all attachments to
          // the current message. Because we don't want to import
          // multiple keys for the same email address, that wouldn't
          // make sense. Remember the import candidate, and postpone
          // until we are done looking at all attachments.

          if (this.keyCollectCandidates.has(relatedParticipantEmailAddress)) {
            // The email contains more than one public key for this
            // email address.
            this.keyCollectCandidates.set(relatedParticipantEmailAddress, {
              skip: true,
            });
          } else {
            let candidate = {};
            candidate.skip = false;
            candidate.newKeyObj = newKey;
            candidate.pubKey = newKey.pubKey;
            candidate.source = {
              uri: `mid:${gMessage.messageId}`,
              type: isBinaryAutocrypt ? "autocrypt" : "attachment",
              description,
            };
            this.keyCollectCandidates.set(
              relatedParticipantEmailAddress,
              candidate
            );
          }
        }

        // done with processing for new keys (!oldKey)
        continue;
      }

      // The key is known (we have an oldKey), then it makes sense to
      // import, even if it's expired/revoked, to learn about the
      // changed validity.

      // Also, we auto import/merge such keys, even if the sender
      // doesn't match any key user ID. Why is this useful?
      // If I am Alice, and the email is from Bob, the email could have
      // Charlie's revoked or extended key attached. It's useful for
      // me to learn that.

      // User IDs are another reason. The key might contain a new
      // additional user ID, or a revoked user ID.
      // That's relevant for Autocrypt headers, which only have one user
      // ID. If we had imported the key with just one user ID in the
      // past, and now we're being sent the same key for a different
      // user ID, we must not skip it, even if it the validity is the
      // same.
      // Let's update on all possible changes of the user ID list,
      // additions, removals, differences.

      let shouldUpdate = false;

      // new validity?
      if (
        oldKey.expiryTime < newKey.expiryTime ||
        (oldKey.keyTrust != "r" && newKey.keyTrust == "r")
      ) {
        shouldUpdate = true;
      } else if (
        oldKey.userIds.length != newKey.userIds.length ||
        !oldKey.userIds.every((el, ix) => el === newKey.userIds[ix])
      ) {
        shouldUpdate = true;
      }

      if (!shouldUpdate) {
        continue;
      }

      if (
        !(await EnigmailKeyRing.importKeyDataSilent(
          window,
          newKey.pubKey,
          isBinaryAutocrypt,
          "0x" + newKey.fpr
        ))
      ) {
        console.debug(
          "EnigmailKeyRing.importKeyDataSilent failed 0x" + newKey.fpr
        );
      }
    }
  },

  /**
   * Show the import key notification.
   */
  async unhideImportKeyBox() {
    Enigmail.hdrView.notifyHasKeyAttached();
    document.getElementById("openpgpKeyBox").removeAttribute("hidden");

    // Check if the proposed key to import was previously accepted.
    let hasAreadyAcceptedOther =
      await PgpSqliteDb2.hasAnyPositivelyAcceptedKeyForEmail(
        Enigmail.msg.authorEmail
      );
    if (hasAreadyAcceptedOther) {
      Enigmail.msg.notificationBox.appendNotification(
        "hasConflictingKeyOpenPGP",
        {
          label: await document.l10n.formatValue("openpgp-be-careful-new-key", {
            email: Enigmail.msg.authorEmail,
          }),
          priority: Enigmail.msg.notificationBox.PRIORITY_INFO_HIGH,
        },
        null
      );
    }
  },

  /*
   * This function is called from several places. Any call may trigger
   * the final processing for this message, it depends on the amount
   * of attachments present, and whether we decrypt immediately, or
   * after a delay (for inline encryption).
   */
  async processAfterAttachmentsAndDecrypt() {
    // Return early if message processing isn't ready yet.
    if (!Enigmail.msg.allAttachmentsDone || !Enigmail.msg.messageDecryptDone) {
      return;
    }

    // Return early if we haven't yet processed all attachments.
    if (
      Enigmail.msg.autoProcessPgpKeyAttachmentProcessed <
      Enigmail.msg.autoProcessPgpKeyAttachmentCount
    ) {
      return;
    }

    if (Enigmail.msg.unhideMissingSigKeyBoxIsTODO) {
      Enigmail.msg.unhideMissingSigKeyBox();
    }

    // We have already processed all attached pgp-keys, we're ready
    // to make final decisions on how to notify the user about
    // available or missing keys.

    // If we already found a good key for the sender's email
    // in attachments, then don't look at the autocrypt header.
    if (Enigmail.msg.attachedSenderEmailKeysIndex.length) {
      this.unhideImportKeyBox();
    } else if (
      Enigmail.msg.savedHeaders &&
      "autocrypt" in Enigmail.msg.savedHeaders &&
      Enigmail.msg.savedHeaders.autocrypt.length > 0 &&
      "from" in currentHeaderData
    ) {
      let senderAutocryptKey = EnigmailAutocrypt.getKeyFromHeader(
        currentHeaderData.from.headerValue,
        Enigmail.msg.savedHeaders.autocrypt
      );
      if (senderAutocryptKey) {
        let keyData = EnigmailData.decodeBase64(senderAutocryptKey);
        // Make sure to let the message load before doing potentially *very*
        // time consuming auto processing (seconds!?).
        await new Promise(resolve => ChromeUtils.idleDispatch(resolve));
        await this.commonProcessAttachedKey(keyData, true);

        if (Enigmail.msg.attachedSenderEmailKeysIndex.length) {
          this.unhideImportKeyBox();
        }
      }
    }

    if (this.keyCollectCandidates && this.keyCollectCandidates.size) {
      let db = await CollectedKeysDB.getInstance();

      for (let candidate of this.keyCollectCandidates.values()) {
        if (candidate.skip) {
          continue;
        }
        // If key is known in the db: merge + update.
        let key = await db.mergeExisting(
          candidate.newKeyObj,
          candidate.pubKey,
          candidate.source
        );

        await db.storeKey(key);
        Services.obs.notifyObservers(null, "openpgp-key-change");
      }
    }

    // Should we notify the user about available encrypted nested parts,
    // which have not been automatically decrypted?
    if (
      EnigmailSingletons.isRecentUriWithNestedEncryptedPart(
        Enigmail.msg.getCurrentMsgUriSpec()
      )
    ) {
      let buttons = [
        {
          "l10n-id": "openpgp-show-encrypted-parts",
          popup: null,
          callback(notification, button) {
            top.viewEncryptedPart(Enigmail.msg.getCurrentMsgUriSpec());
            return true; // keep notification
          },
        },
      ];

      Enigmail.msg.notificationBox.appendNotification(
        "hasNestedEncryptedParts",
        {
          label: await document.l10n.formatValue(
            "openpgp-has-nested-encrypted-parts"
          ),
          priority: Enigmail.msg.notificationBox.PRIORITY_INFO_HIGH,
        },
        buttons
      );
    }

    document.dispatchEvent(
      new CustomEvent("openpgpprocessed", {
        detail: { messageDecryptDone: true },
      })
    );
  },

  async notifyEndAllAttachments() {
    Enigmail.msg.allAttachmentsDone = true;

    if (!Enigmail.msg.autoProcessPgpKeyAttachmentCount) {
      await Enigmail.msg.processAfterAttachmentsAndDecrypt();
    }
  },

  toAndCCSet: null,
  authorEmail: "",

  // Used to remember the list of keys that we might want to add to
  // our cache of seen keys. Will be used after we are done looking
  // at all attachments.
  keyCollectCandidates: new Map(),

  attachedKeys: [],
  attachedSenderEmailKeysIndex: [], // each: {idx (to-attachedKeys), keyInfo, binary}

  fetchParticipants() {
    if (this.toAndCCSet) {
      return;
    }

    // toAndCCSet non-null indicates that we already fetched.
    this.toAndCCSet = new Set();

    // This message may have already disappeared.
    if (!gMessage) {
      return;
    }

    let addresses = MailServices.headerParser.parseEncodedHeader(
      gMessage.author
    );
    if (addresses.length) {
      this.authorEmail = addresses[0].email.toLowerCase();
    }

    addresses = MailServices.headerParser.parseEncodedHeader(
      gMessage.recipients + "," + gMessage.ccList
    );
    for (let addr of addresses) {
      this.toAndCCSet.add(addr.email.toLowerCase());
    }
  },

  hasUserIdForEmail(userIds, authorEmail) {
    authorEmail = authorEmail.toLowerCase();

    for (let id of userIds) {
      if (id.type !== "uid") {
        continue;
      }

      if (
        EnigmailFuncs.getEmailFromUserID(id.userId).toLowerCase() == authorEmail
      ) {
        return true;
      }
    }
    return false;
  },

  autoProcessPgpKeyAttachmentTransactionID: 0,
  autoProcessPgpKeyAttachmentCount: 0,
  autoProcessPgpKeyAttachmentProcessed: 0,
  unhideMissingSigKeyBoxIsTODO: false,
  unhideMissingSigKey: null,

  autoProcessPgpKeyAttachment(attachment) {
    if (
      attachment.contentType != "application/pgp-keys" &&
      !attachment.name.endsWith(".asc")
    ) {
      return;
    }

    Enigmail.msg.autoProcessPgpKeyAttachmentCount++;

    let bufferListener = EnigmailStreams.newStringStreamListener(async data => {
      // Make sure to let the message load before doing potentially *very*
      // time consuming auto processing (seconds!?).
      await new Promise(resolve => ChromeUtils.idleDispatch(resolve));
      await this.commonProcessAttachedKey(data, false, attachment.name);
      Enigmail.msg.autoProcessPgpKeyAttachmentProcessed++;
      if (
        Enigmail.msg.autoProcessPgpKeyAttachmentProcessed ==
        Enigmail.msg.autoProcessPgpKeyAttachmentCount
      ) {
        await Enigmail.msg.processAfterAttachmentsAndDecrypt();
      }
    });
    let msgUri = Services.io.newURI(attachment.url);
    let channel = EnigmailStreams.createChannel(msgUri);
    channel.asyncOpen(bufferListener, msgUri);
  },

  /**
   * Populate the message security popup panel with OpenPGP data.
   */
  async loadOpenPgpMessageSecurityInfo() {
    let sigInfoWithDateLabel = null;
    let sigInfoLabel = null;
    let sigInfo = null;
    let sigClass = null;
    let wantToShowDate = false;

    // All scenarios that set wantToShowDate to true should set both
    // sigInfoWithDateLabel and sigInfoLabel, to ensure we have a
    // fallback label, if the date is unavailable.
    switch (Enigmail.hdrView.msgSignatureState) {
      case EnigmailConstants.MSG_SIG_NONE:
        sigInfoLabel = "openpgp-no-sig";
        sigClass = "none";
        sigInfo = "openpgp-no-sig-info";
        break;

      case EnigmailConstants.MSG_SIG_UNCERTAIN_KEY_UNAVAILABLE:
        sigInfoLabel = "openpgp-uncertain-sig";
        sigClass = "unknown";
        sigInfo = "openpgp-sig-uncertain-no-key";
        break;

      case EnigmailConstants.MSG_SIG_UNCERTAIN_UID_MISMATCH:
        sigInfoLabel = "openpgp-uncertain-sig";
        sigInfoWithDateLabel = "openpgp-uncertain-sig-with-date";
        wantToShowDate = true;
        sigClass = "mismatch";
        sigInfo = "openpgp-sig-uncertain-uid-mismatch";
        break;

      case EnigmailConstants.MSG_SIG_UNCERTAIN_KEY_NOT_ACCEPTED:
        sigInfoLabel = "openpgp-uncertain-sig";
        sigInfoWithDateLabel = "openpgp-uncertain-sig-with-date";
        wantToShowDate = true;
        sigClass = "unknown";
        sigInfo = "openpgp-sig-uncertain-not-accepted";
        break;

      case EnigmailConstants.MSG_SIG_INVALID_KEY_REJECTED:
        sigInfoLabel = "openpgp-invalid-sig";
        sigInfoWithDateLabel = "openpgp-invalid-sig-with-date";
        wantToShowDate = true;
        sigClass = "mismatch";
        sigInfo = "openpgp-sig-invalid-rejected";
        break;

      case EnigmailConstants.MSG_SIG_INVALID:
        sigInfoLabel = "openpgp-invalid-sig";
        sigClass = "mismatch";
        sigInfo = "openpgp-sig-invalid-technical-problem";
        break;

      case EnigmailConstants.MSG_SIG_VALID_KEY_UNVERIFIED:
        sigInfoLabel = "openpgp-good-sig";
        sigInfoWithDateLabel = "openpgp-good-sig-with-date";
        wantToShowDate = true;
        sigClass = "unverified";
        sigInfo = "openpgp-sig-valid-unverified";
        break;

      case EnigmailConstants.MSG_SIG_VALID_KEY_VERIFIED:
        sigInfoLabel = "openpgp-good-sig";
        sigInfoWithDateLabel = "openpgp-good-sig-with-date";
        wantToShowDate = true;
        sigClass = "verified";
        sigInfo = "openpgp-sig-valid-verified";
        break;

      case EnigmailConstants.MSG_SIG_VALID_SELF:
        sigInfoLabel = "openpgp-good-sig";
        sigInfoWithDateLabel = "openpgp-good-sig-with-date";
        wantToShowDate = true;
        sigClass = "ok";
        sigInfo = "openpgp-sig-valid-own-key";
        break;

      default:
        console.error(
          "Unexpected msgSignatureState: " + Enigmail.hdrView.msgSignatureState
        );
    }

    let signatureLabel = document.getElementById("signatureLabel");
    if (wantToShowDate && Enigmail.hdrView.msgSignatureDate) {
      let date = new Services.intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(Enigmail.hdrView.msgSignatureDate);
      document.l10n.setAttributes(signatureLabel, sigInfoWithDateLabel, {
        date,
      });
    } else {
      document.l10n.setAttributes(signatureLabel, sigInfoLabel);
    }

    // Remove the second class to properly update the signature icon.
    signatureLabel.classList.remove(signatureLabel.classList.item(1));
    signatureLabel.classList.add(sigClass);

    let signatureExplanation = document.getElementById("signatureExplanation");
    // eslint-disable-next-line mozilla/prefer-formatValues
    signatureExplanation.textContent = await document.l10n.formatValue(sigInfo);

    let encInfoLabel = null;
    let encInfo = null;
    let encClass = null;

    switch (Enigmail.hdrView.msgEncryptionState) {
      case EnigmailConstants.MSG_ENC_NONE:
        encInfoLabel = "openpgp-enc-none";
        encInfo = "openpgp-enc-none-label";
        encClass = "none";
        break;

      case EnigmailConstants.MSG_ENC_NO_SECRET_KEY:
        encInfoLabel = "openpgp-enc-invalid-label";
        encInfo = "openpgp-enc-invalid";
        encClass = "notok";
        break;

      case EnigmailConstants.MSG_ENC_FAILURE:
        encInfoLabel = "openpgp-enc-invalid-label";
        encInfo = "openpgp-enc-clueless";
        encClass = "notok";
        break;

      case EnigmailConstants.MSG_ENC_OK:
        encInfoLabel = "openpgp-enc-valid-label";
        encInfo = "openpgp-enc-valid";
        encClass = "ok";
        break;

      default:
        console.error(
          "Unexpected msgEncryptionState: " +
            Enigmail.hdrView.msgEncryptionState
        );
    }

    document.getElementById("techLabel").textContent = "- OpenPGP";

    let encryptionLabel = document.getElementById("encryptionLabel");
    // eslint-disable-next-line mozilla/prefer-formatValues
    encryptionLabel.textContent = await document.l10n.formatValue(encInfoLabel);

    // Remove the second class to properly update the encryption icon.
    encryptionLabel.classList.remove(encryptionLabel.classList.item(1));
    encryptionLabel.classList.add(encClass);

    document.getElementById("encryptionExplanation").textContent =
      // eslint-disable-next-line mozilla/prefer-formatValues
      await document.l10n.formatValue(encInfo);

    if (Enigmail.hdrView.msgSignatureKeyId) {
      let sigKeyInfo = EnigmailKeyRing.getKeyById(
        Enigmail.hdrView.msgSignatureKeyId
      );

      document.getElementById("signatureKey").collapsed = false;

      if (
        sigKeyInfo &&
        sigKeyInfo.keyId != Enigmail.hdrView.msgSignatureKeyId
      ) {
        document.l10n.setAttributes(
          document.getElementById("signatureKeyId"),
          "openpgp-sig-key-id-with-subkey-id",
          {
            key: `0x${sigKeyInfo.keyId}`,
            subkey: `0x${Enigmail.hdrView.msgSignatureKeyId}`,
          }
        );
      } else {
        document.l10n.setAttributes(
          document.getElementById("signatureKeyId"),
          "openpgp-sig-key-id",
          {
            key: `0x${Enigmail.hdrView.msgSignatureKeyId}`,
          }
        );
      }

      if (sigKeyInfo) {
        document.getElementById("viewSignatureKey").collapsed = false;
        gSigKeyId = Enigmail.hdrView.msgSignatureKeyId;
      }
    }

    let myIdToSkipInList;
    if (
      Enigmail.hdrView.msgEncryptionKeyId &&
      Enigmail.hdrView.msgEncryptionKeyId.keyId
    ) {
      myIdToSkipInList = Enigmail.hdrView.msgEncryptionKeyId.keyId;

      // If we were given a separate primaryKeyId, it means keyId is a subkey.
      let havePrimaryId = !!Enigmail.hdrView.msgEncryptionKeyId.primaryKeyId;
      document.getElementById("encryptionKey").collapsed = false;

      if (havePrimaryId) {
        document.l10n.setAttributes(
          document.getElementById("encryptionKeyId"),
          "openpgp-enc-key-with-subkey-id",
          {
            key: `0x${Enigmail.hdrView.msgEncryptionKeyId.primaryKeyId}`,
            subkey: `0x${Enigmail.hdrView.msgEncryptionKeyId.keyId}`,
          }
        );
      } else {
        document.l10n.setAttributes(
          document.getElementById("encryptionKeyId"),
          "openpgp-enc-key-id",
          {
            key: `0x${Enigmail.hdrView.msgEncryptionKeyId.keyId}`,
          }
        );
      }

      if (
        EnigmailKeyRing.getKeyById(Enigmail.hdrView.msgEncryptionKeyId.keyId)
      ) {
        document.getElementById("viewEncryptionKey").collapsed = false;
        gEncKeyId = Enigmail.hdrView.msgEncryptionKeyId.keyId;
      }
    }

    let otherLabel = document.getElementById("otherLabel");
    if (myIdToSkipInList) {
      document.l10n.setAttributes(otherLabel, "openpgp-other-enc-all-key-ids");
    } else {
      document.l10n.setAttributes(
        otherLabel,
        "openpgp-other-enc-additional-key-ids"
      );
    }

    if (!Enigmail.hdrView.msgEncryptionAllKeyIds) {
      return;
    }

    let keyList = document.getElementById("otherEncryptionKeysList");
    // Remove all the previously populated keys.
    while (keyList.lastChild) {
      keyList.removeChild(keyList.lastChild);
    }

    let showExtraKeysList = false;
    for (let key of Enigmail.hdrView.msgEncryptionAllKeyIds) {
      if (key.keyId == myIdToSkipInList) {
        continue;
      }

      let container = document.createXULElement("vbox");
      container.classList.add("other-key-row");

      let havePrimaryId2 = !!key.primaryKeyId;
      let keyInfo = EnigmailKeyRing.getKeyById(
        havePrimaryId2 ? key.primaryKeyId : key.keyId
      );

      // Use textContent for label XUl elements to enable text wrapping.
      let name = document.createXULElement("label");
      name.classList.add("openpgp-key-name");
      name.setAttribute("context", "simpleCopyPopup");
      if (keyInfo) {
        name.textContent = keyInfo.userId;
      } else {
        document.l10n.setAttributes(name, "openpgp-other-enc-all-key-ids");
      }

      let id = document.createXULElement("label");
      id.setAttribute("context", "simpleCopyPopup");
      id.classList.add("openpgp-key-id");
      id.textContent = havePrimaryId2
        ? ` 0x${key.primaryKeyId} (0x${key.keyId})`
        : ` 0x${key.keyId}`;

      container.appendChild(name);
      container.appendChild(id);

      keyList.appendChild(container);
      showExtraKeysList = true;
    }

    // Show extra keys if present in the message.
    document.getElementById("otherEncryptionKeys").collapsed =
      !showExtraKeysList;
  },
};

window.addEventListener(
  "load-enigmail",
  Enigmail.msg.messengerStartup.bind(Enigmail.msg)
);
window.addEventListener(
  "unload",
  Enigmail.msg.messengerClose.bind(Enigmail.msg)
);
window.addEventListener(
  "unload-enigmail",
  Enigmail.msg.onUnloadEnigmail.bind(Enigmail.msg)
);
