/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from ../../../../base/content/aboutMessage.js */
/* import-globals-from ../../../../base/content/msgHdrView.js */
/* import-globals-from ../../../smime/content/msgHdrViewSMIMEOverlay.js */

var { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  EnigmailConstants: "chrome://openpgp/content/modules/constants.jsm",
  EnigmailCore: "chrome://openpgp/content/modules/core.jsm",
  EnigmailDialog: "chrome://openpgp/content/modules/dialog.jsm",
  EnigmailFuncs: "chrome://openpgp/content/modules/funcs.jsm",
  EnigmailKey: "chrome://openpgp/content/modules/key.jsm",
  EnigmailKeyRing: "chrome://openpgp/content/modules/keyRing.jsm",
  EnigmailLog: "chrome://openpgp/content/modules/log.jsm",
  EnigmailMime: "chrome://openpgp/content/modules/mime.jsm",
  EnigmailMsgRead: "chrome://openpgp/content/modules/msgRead.jsm",
  EnigmailSingletons: "chrome://openpgp/content/modules/singletons.jsm",
  EnigmailURIs: "chrome://openpgp/content/modules/uris.jsm",
  EnigmailVerify: "chrome://openpgp/content/modules/mimeVerify.jsm",
  EnigmailWindows: "chrome://openpgp/content/modules/windows.jsm",
  // EnigmailWks: "chrome://openpgp/content/modules/webKey.jsm",
});

Enigmail.hdrView = {
  lastEncryptedMsgKey: null,
  lastEncryptedUri: null,
  flexbuttonAction: null,

  msgSignedStateString: null,
  msgEncryptedStateString: null,
  msgSignatureState: EnigmailConstants.MSG_SIG_NONE,
  msgEncryptionState: EnigmailConstants.MSG_ENC_NONE,
  msgSignatureKeyId: "",
  msgSignatureDate: null,
  msgEncryptionKeyId: null,
  msgEncryptionAllKeyIds: null,
  msgHasKeyAttached: false,

  ignoreStatusFromMimePart: "",
  receivedStatusFromParts: new Set(),

  reset() {
    this.msgSignedStateString = null;
    this.msgEncryptedStateString = null;
    this.msgSignatureState = EnigmailConstants.MSG_SIG_NONE;
    this.msgEncryptionState = EnigmailConstants.MSG_ENC_NONE;
    this.msgSignatureKeyId = "";
    this.msgSignatureDate = null;
    this.msgEncryptionKeyId = null;
    this.msgEncryptionAllKeyIds = null;
    this.msgHasKeyAttached = false;
    for (let value of ["decryptionFailed", "brokenExchange"]) {
      Enigmail.msg.removeNotification(value);
    }
    this.ignoreStatusFromMimePart = "";
    this.receivedStatusFromParts = new Set();
  },

  hdrViewLoad() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.hdrViewLoad\n");

    this.msgHdrViewLoad();

    let addrPopup = document.getElementById("emailAddressPopup");
    if (addrPopup) {
      addrPopup.addEventListener(
        "popupshowing",
        Enigmail.hdrView.displayAddressPopup.bind(addrPopup)
      );
    }

    // Thunderbird
    let attCtx = document.getElementById("attachmentItemContext");
    if (attCtx) {
      attCtx.addEventListener(
        "popupshowing",
        this.onShowAttachmentContextMenu.bind(Enigmail.hdrView)
      );
    }
  },

  displayAddressPopup(event) {
    let target = event.target;
    EnigmailFuncs.collapseAdvanced(target, "hidden");
  },

  statusBarHide() {
    /* elements might not have been set yet, so we try and ignore */
    try {
      this.reset();

      Enigmail.msg.setAttachmentReveal(null);
      if (Enigmail.msg.securityInfo) {
        Enigmail.msg.securityInfo.statusFlags = 0;
      }

      let bodyElement = document.getElementById("messagepane");
      bodyElement.removeAttribute("collapsed");
    } catch (ex) {
      console.debug(ex);
    }
  },

  updatePgpStatus(
    exitCode,
    statusFlags,
    extStatusFlags,
    keyId,
    userId,
    sigDetails,
    errorMsg,
    blockSeparation,
    encToDetails,
    xtraStatus,
    mimePartNumber
  ) {
    EnigmailLog.DEBUG(
      "enigmailMsgHdrViewOverlay.js: this.updatePgpStatus: exitCode=" +
        exitCode +
        ", statusFlags=" +
        statusFlags +
        ", extStatusFlags=" +
        extStatusFlags +
        ", keyId=" +
        keyId +
        ", userId=" +
        userId +
        ", " +
        errorMsg +
        "\n"
    );

    /*
    if (
      Enigmail.msg.securityInfo &&
      Enigmail.msg.securityInfo.xtraStatus &&
      Enigmail.msg.securityInfo.xtraStatus === "wks-request"
    ) {
      return;
    }
    */

    if (gMessageURI) {
      this.lastEncryptedMsgKey = gMessageURI;
    }

    if (!errorMsg) {
      errorMsg = "";
    } else {
      console.debug("OpenPGP error status: " + errorMsg);
    }

    var replaceUid = null;
    if (keyId && gMessage) {
      replaceUid = EnigmailMsgRead.matchUidToSender(keyId, gMessage.author);
    }

    if (!replaceUid && userId) {
      replaceUid = userId.replace(/\n.*$/gm, "");
    }

    if (
      Enigmail.msg.savedHeaders &&
      "x-pgp-encoding-format" in Enigmail.msg.savedHeaders &&
      Enigmail.msg.savedHeaders["x-pgp-encoding-format"].search(
        /partitioned/i
      ) === 0
    ) {
      if (currentAttachments && currentAttachments.length) {
        Enigmail.msg.setAttachmentReveal(currentAttachments);
      }
    }

    if (userId && replaceUid) {
      // no EnigmailData.convertGpgToUnicode here; strings are already UTF-8
      replaceUid = replaceUid.replace(/\\[xe]3a/gi, ":");
      errorMsg = errorMsg.replace(userId, replaceUid);
    }

    var errorLines = "";

    if (exitCode == EnigmailConstants.POSSIBLE_PGPMIME) {
      exitCode = 0;
    } else if (errorMsg) {
      // no EnigmailData.convertGpgToUnicode here; strings are already UTF-8
      errorLines = errorMsg.split(/\r?\n/);
    }

    if (errorLines && errorLines.length > 22) {
      // Retain only first twenty lines and last two lines of error message
      var lastLines =
        errorLines[errorLines.length - 2] +
        "\n" +
        errorLines[errorLines.length - 1] +
        "\n";

      while (errorLines.length > 20) {
        errorLines.pop();
      }

      errorMsg = errorLines.join("\n") + "\n...\n" + lastLines;
    }

    let encryptedMimePart = "";
    if (statusFlags & EnigmailConstants.PGP_MIME_ENCRYPTED) {
      encryptedMimePart = mimePartNumber;
    }

    var msgSigned =
      statusFlags &
      (EnigmailConstants.BAD_SIGNATURE |
        EnigmailConstants.GOOD_SIGNATURE |
        EnigmailConstants.EXPIRED_KEY_SIGNATURE |
        EnigmailConstants.EXPIRED_SIGNATURE |
        EnigmailConstants.UNCERTAIN_SIGNATURE |
        EnigmailConstants.REVOKED_KEY |
        EnigmailConstants.EXPIRED_KEY_SIGNATURE |
        EnigmailConstants.EXPIRED_SIGNATURE);

    if (msgSigned && statusFlags & EnigmailConstants.IMPORTED_KEY) {
      console.debug("unhandled status IMPORTED_KEY");
      statusFlags &= ~EnigmailConstants.IMPORTED_KEY;
    }

    // TODO: visualize the following signature attributes,
    // cross-check with corresponding email attributes
    // - date
    // - signer uid
    // - signer key
    // - signing and hash alg

    this.msgSignatureKeyId = keyId;

    if (encToDetails) {
      this.msgEncryptionKeyId = encToDetails.myRecipKey;
      this.msgEncryptionAllKeyIds = encToDetails.allRecipKeys;
    }

    this.msgSignatureDate = sigDetails?.sigDate;

    let tmp = {
      statusFlags,
      extStatusFlags,
      keyId,
      userId,
      msgSigned,
      blockSeparation,
      xtraStatus,
      encryptedMimePart,
    };
    Enigmail.msg.securityInfo = tmp;

    //Enigmail.msg.createArtificialAutocryptHeader();

    /*
    if (statusFlags & EnigmailConstants.UNCERTAIN_SIGNATURE) {
      this.tryImportAutocryptHeader();
    }
    */

    this.updateStatusFlags(mimePartNumber);
    this.updateMsgDb();
  },

  /**
   * Check whether we got a WKS request
   */
  /*
  checkWksConfirmRequest(jsonStr) {
    let requestObj;
    try {
      requestObj = JSON.parse(jsonStr);
    } catch (ex) {
      EnigmailLog.DEBUG(
        "enigmailMsgHdrViewOverlay.js: checkWksConfirmRequest parsing JSON failed\n"
      );
      return;
    }

    if (
      "type" in requestObj &&
      requestObj.type.toLowerCase() === "confirmation-request"
    ) {
      EnigmailWks.getWksClientPathAsync(window, function(wksClientPath) {
        if (!wksClientPath) {
          return;
        }

        Enigmail.hdrView.displayFlexAction(
          "Web Key Directory Confirmation Request",
          "Confirm Request",
          "wks-request"
        );
        Enigmail.hdrView.displayWksMessage();
      });
    } else {
      EnigmailLog.DEBUG(
        "enigmailMsgHdrViewOverlay.js: checkWksConfirmRequest failed condition\n"
      );
    }
  },
  */

  /**
   * Display a localized message in lieu of the original message text
   */
  /*
  displayWksMessage() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: displayWksMessage()\n");

    if (Enigmail.msg.securityInfo.xtraStatus === "wks-request") {
      let enigMsgPane = document.getElementById("enigmailMsgDisplay");
      let bodyElement = document.getElementById("messagepane");
      bodyElement.setAttribute("collapsed", true);
      enigMsgPane.removeAttribute("collapsed");
      enigMsgPane.textContent = "This message has been sent by your email provider to confirm deployment of your OpenPGP public key\nin their Web Key Directory.\nProviding your public key helps others to discover your key and thus being able to encrypt messages to you.\n\nIf you want to deploy your key in the Web Key Directory now, please click on the button "Confirm Request" in the status bar.\nOtherwise, simply ignore this message."
      );
    }
  },
  */

  /**
   * Update the various variables that track the OpenPGP status of
   * the current message.
   *
   * @param {string} triggeredByMimePartNumber - the MIME part that
   *   was processed and has triggered this status update request.
   */
  async updateStatusFlags(triggeredByMimePartNumber) {
    let secInfo = Enigmail.msg.securityInfo;
    let statusFlags = secInfo.statusFlags;
    let extStatusFlags =
      "extStatusFlags" in secInfo ? secInfo.extStatusFlags : 0;

    let signed;
    let encrypted;

    if (
      statusFlags &
      (EnigmailConstants.DECRYPTION_FAILED |
        EnigmailConstants.DECRYPTION_INCOMPLETE)
    ) {
      encrypted = "notok";
      let unhideBar = false;
      let infoId;
      if (statusFlags & EnigmailConstants.NO_SECKEY) {
        this.msgEncryptionState = EnigmailConstants.MSG_ENC_NO_SECRET_KEY;

        unhideBar = true;
        infoId = "openpgp-cannot-decrypt-because-missing-key";
      } else {
        this.msgEncryptionState = EnigmailConstants.MSG_ENC_FAILURE;
        if (statusFlags & EnigmailConstants.MISSING_MDC) {
          unhideBar = true;
          infoId = "openpgp-cannot-decrypt-because-mdc";
        }
      }

      if (unhideBar) {
        Enigmail.msg.notificationBox.appendNotification(
          "decryptionFailed",
          {
            label: await document.l10n.formatValue(infoId),
            image: "chrome://global/skin/icons/warning.svg",
            priority: Enigmail.msg.notificationBox.PRIORITY_CRITICAL_MEDIUM,
          },
          null
        );
      }

      this.msgSignatureState = EnigmailConstants.MSG_SIG_NONE;
    } else if (statusFlags & EnigmailConstants.DECRYPTION_OKAY) {
      EnigmailURIs.rememberEncryptedUri(this.lastEncryptedMsgKey);
      encrypted = "ok";
      this.msgEncryptionState = EnigmailConstants.MSG_ENC_OK;
      if (secInfo.xtraStatus && secInfo.xtraStatus == "buggyMailFormat") {
        console.log(
          await document.l10n.formatValue("decrypted-msg-with-format-error")
        );
      }
    }

    if (
      statusFlags &
      (EnigmailConstants.BAD_SIGNATURE |
        EnigmailConstants.REVOKED_KEY |
        EnigmailConstants.EXPIRED_KEY_SIGNATURE |
        EnigmailConstants.EXPIRED_SIGNATURE)
    ) {
      if (statusFlags & EnigmailConstants.INVALID_RECIPIENT) {
        this.msgSignatureState = EnigmailConstants.MSG_SIG_INVALID_KEY_REJECTED;
      } else {
        this.msgSignatureState = EnigmailConstants.MSG_SIG_INVALID;
      }
      signed = "notok";
    } else if (statusFlags & EnigmailConstants.GOOD_SIGNATURE) {
      if (statusFlags & EnigmailConstants.TRUSTED_IDENTITY) {
        this.msgSignatureState = EnigmailConstants.MSG_SIG_VALID_KEY_VERIFIED;
        signed = "verified";
      } else if (extStatusFlags & EnigmailConstants.EXT_SELF_IDENTITY) {
        signed = "ok";
        this.msgSignatureState = EnigmailConstants.MSG_SIG_VALID_SELF;
      } else {
        signed = "unverified";
        this.msgSignatureState = EnigmailConstants.MSG_SIG_VALID_KEY_UNVERIFIED;
      }
    } else if (statusFlags & EnigmailConstants.UNCERTAIN_SIGNATURE) {
      signed = "unknown";
      if (statusFlags & EnigmailConstants.INVALID_RECIPIENT) {
        signed = "mismatch";
        this.msgSignatureState =
          EnigmailConstants.MSG_SIG_UNCERTAIN_UID_MISMATCH;
      } else if (statusFlags & EnigmailConstants.NO_PUBKEY) {
        this.msgSignatureState =
          EnigmailConstants.MSG_SIG_UNCERTAIN_KEY_UNAVAILABLE;
        Enigmail.msg.notifySigKeyMissing(secInfo.keyId);
      } else {
        this.msgSignatureState =
          EnigmailConstants.MSG_SIG_UNCERTAIN_KEY_NOT_ACCEPTED;
      }
    }
    // (statusFlags & EnigmailConstants.INLINE_KEY) ???

    if (encrypted) {
      this.msgEncryptedStateString = encrypted;
    }
    if (signed) {
      this.msgSignedStateString = signed;
    }
    this.updateVisibleSecurityStatus(triggeredByMimePartNumber);

    /*
    // special handling after trying to fix buggy mail format (see buggyExchangeEmailContent in code)
    if (secInfo.xtraStatus && secInfo.xtraStatus == "buggyMailFormat") {
    }
    */

    if (encrypted) {
      // For telemetry purposes.
      window.dispatchEvent(
        new CustomEvent("secureMsgLoaded", {
          detail: {
            key: "encrypted-openpgp",
            data: encrypted,
          },
        })
      );
    }
    if (signed) {
      window.dispatchEvent(
        new CustomEvent("secureMsgLoaded", {
          detail: {
            key: "signed-openpgp",
            data: signed,
          },
        })
      );
    }
  },

  /**
   * Should be called as soon as it is known that the message has
   * an OpenPGP key attached.
   */
  notifyHasKeyAttached() {
    this.msgHasKeyAttached = true;
    this.updateVisibleSecurityStatus();
  },

  /**
   * Should be called whenever more information about the OpenPGP
   * message state became available, such as encryption or signature
   * status, or the availability of an attached key.
   *
   * @param {string} triggeredByMimePartNumber - optional number of the
   *   MIME part that was processed and has triggered this status update
   *   request.
   */
  updateVisibleSecurityStatus(triggeredByMimePartNumber = undefined) {
    setMessageCryptoBox(
      "OpenPGP",
      this.msgEncryptedStateString,
      this.msgSignedStateString,
      this.msgHasKeyAttached,
      triggeredByMimePartNumber
    );
  },

  editKeyExpiry() {
    EnigmailWindows.editKeyExpiry(
      window,
      [Enigmail.msg.securityInfo.userId],
      [Enigmail.msg.securityInfo.keyId]
    );
    ReloadMessage();
  },

  editKeyTrust() {
    let key = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);

    EnigmailWindows.editKeyTrust(
      window,
      [Enigmail.msg.securityInfo.userId],
      [key.keyId]
    );
    ReloadMessage();
  },

  signKey() {
    let key = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);

    EnigmailWindows.signKey(
      window,
      Enigmail.msg.securityInfo.userId,
      key.keyId,
      null
    );
    ReloadMessage();
  },

  msgHdrViewLoad() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.msgHdrViewLoad\n");

    this.messageListener = {
      onStartHeaders() {
        EnigmailLog.DEBUG(
          "enigmailMsgHdrViewOverlay.js: _listener_onStartHeaders\n"
        );

        try {
          Enigmail.hdrView.statusBarHide();
          EnigmailVerify.setWindow(window, Enigmail.msg.getCurrentMsgUriSpec());

          let msgFrame = document.getElementById("messagepane").contentDocument;

          if (msgFrame) {
            msgFrame.addEventListener(
              "unload",
              Enigmail.hdrView.messageUnload.bind(Enigmail.hdrView),
              true
            );
            msgFrame.addEventListener(
              "load",
              Enigmail.hdrView.messageLoad.bind(Enigmail.hdrView),
              true
            );
          }

          Enigmail.hdrView.forgetEncryptedMsgKey();
          Enigmail.hdrView.setWindowCallback();
        } catch (ex) {
          console.debug(ex);
        }
      },

      onEndHeaders() {
        EnigmailLog.DEBUG(
          "enigmailMsgHdrViewOverlay.js: _listener_onEndHeaders\n"
        );
      },

      onEndAttachments() {
        EnigmailLog.DEBUG(
          "enigmailMsgHdrViewOverlay.js: _listener_onEndAttachments\n"
        );

        try {
          EnigmailVerify.setWindow(null, null);
        } catch (ex) {}

        Enigmail.hdrView.messageLoad();
      },

      beforeStartHeaders() {
        return true;
      },
    };

    gMessageListeners.push(this.messageListener);

    // fire the handlers since some windows open directly with a visible message
    this.messageListener.onStartHeaders();
    this.messageListener.onEndAttachments();
  },

  messageUnload(event) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.messageUnload\n");
    if (Enigmail.hdrView.flexbuttonAction === null) {
      if (Enigmail.msg.securityInfo && Enigmail.msg.securityInfo.xtraStatus) {
        Enigmail.msg.securityInfo.xtraStatus = "";
      }
      this.forgetEncryptedMsgKey();
    }
  },

  async messageLoad(event) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.messageLoad\n");

    await Enigmail.msg.messageAutoDecrypt();
    Enigmail.msg.handleAttachmentEvent();
  },

  dispKeyDetails() {
    if (!Enigmail.msg.securityInfo) {
      return;
    }

    let key = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);

    EnigmailWindows.openKeyDetails(window, key.keyId, false);
  },

  forgetEncryptedMsgKey() {
    if (Enigmail.hdrView.lastEncryptedMsgKey) {
      EnigmailURIs.forgetEncryptedUri(Enigmail.hdrView.lastEncryptedMsgKey);
      Enigmail.hdrView.lastEncryptedMsgKey = null;
    }

    if (Enigmail.hdrView.lastEncryptedUri && gEncryptedURIService) {
      gEncryptedURIService.forgetEncrypted(Enigmail.hdrView.lastEncryptedUri);
      Enigmail.hdrView.lastEncryptedUri = null;
    }
  },

  onShowAttachmentContextMenu(event) {
    let contextMenu = document.getElementById("attachmentItemContext");
    let separator = document.getElementById("openpgpCtxItemsSeparator");
    let decryptOpenMenu = document.getElementById("enigmail_ctxDecryptOpen");
    let decryptSaveMenu = document.getElementById("enigmail_ctxDecryptSave");
    let importMenu = document.getElementById("enigmail_ctxImportKey");
    let verifyMenu = document.getElementById("enigmail_ctxVerifyAtt");

    if (contextMenu.attachments.length == 1) {
      let attachment = contextMenu.attachments[0];

      if (/^application\/pgp-keys/i.test(attachment.contentType)) {
        importMenu.hidden = false;
        decryptOpenMenu.hidden = true;
        decryptSaveMenu.hidden = true;
        verifyMenu.hidden = true;
      } else if (Enigmail.msg.checkEncryptedAttach(attachment)) {
        if (
          (typeof attachment.name !== "undefined" &&
            attachment.name.match(/\.asc\.(gpg|pgp)$/i)) ||
          (typeof attachment.displayName !== "undefined" &&
            attachment.displayName.match(/\.asc\.(gpg|pgp)$/i))
        ) {
          importMenu.hidden = false;
        } else {
          importMenu.hidden = true;
        }
        decryptOpenMenu.hidden = false;
        decryptSaveMenu.hidden = false;
        if (
          EnigmailMsgRead.checkSignedAttachment(
            attachment,
            null,
            currentAttachments
          )
        ) {
          verifyMenu.hidden = false;
        } else {
          verifyMenu.hidden = true;
        }
        if (typeof attachment.displayName == "undefined") {
          if (!attachment.name) {
            attachment.name = "message.pgp";
          }
        } else if (!attachment.displayName) {
          attachment.displayName = "message.pgp";
        }
      } else if (
        EnigmailMsgRead.checkSignedAttachment(
          attachment,
          null,
          currentAttachments
        )
      ) {
        importMenu.hidden = true;
        decryptOpenMenu.hidden = true;
        decryptSaveMenu.hidden = true;

        verifyMenu.hidden = false;
      } else {
        importMenu.hidden = true;
        decryptOpenMenu.hidden = true;
        decryptSaveMenu.hidden = true;
        verifyMenu.hidden = true;
      }

      separator.hidden =
        decryptOpenMenu.hidden &&
        decryptSaveMenu.hidden &&
        importMenu.hidden &&
        verifyMenu.hidden;
    } else {
      decryptOpenMenu.hidden = true;
      decryptSaveMenu.hidden = true;
      importMenu.hidden = true;
      verifyMenu.hidden = true;
      separator.hidden = true;
    }
  },

  updateMsgDb() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.updateMsgDb\n");
    var msg = gMessage;
    if (!msg || !msg.folder) {
      return;
    }

    var msgHdr = msg.folder.GetMessageHeader(msg.messageKey);

    if (this.msgEncryptionState === EnigmailConstants.MSG_ENC_OK) {
      Enigmail.msg.securityInfo.statusFlags |=
        EnigmailConstants.DECRYPTION_OKAY;
    }
    msgHdr.setUint32Property("enigmail", Enigmail.msg.securityInfo.statusFlags);
  },

  enigCanDetachAttachments() {
    EnigmailLog.DEBUG(
      "enigmailMsgHdrViewOverlay.js: this.enigCanDetachAttachments\n"
    );

    var canDetach = true;
    if (
      Enigmail.msg.securityInfo &&
      typeof Enigmail.msg.securityInfo.statusFlags != "undefined"
    ) {
      canDetach = !(
        Enigmail.msg.securityInfo.statusFlags &
        (EnigmailConstants.PGP_MIME_SIGNED |
          EnigmailConstants.PGP_MIME_ENCRYPTED)
      );
    }
    return canDetach;
  },

  setSubject(subject) {
    // Strip multiple localised Re: prefixes. This emulates NS_MsgStripRE().
    let prefixes = Services.prefs.getStringPref("mailnews.localizedRe", "Re");
    prefixes = prefixes.split(",");
    if (!prefixes.includes("Re")) {
      prefixes.push("Re");
    }
    // Construct a regular expression like this: ^(Re: |Aw: )+
    let newSubject = subject.replace(
      new RegExp(`^(${prefixes.join(": |")}: )+`, "i"),
      ""
    );
    let hadRe = newSubject != subject;

    // Update the message.
    gMessage.subject = newSubject;
    let oldFlags = gMessage.flags;
    if (hadRe) {
      gMessage.flags |= Ci.nsMsgMessageFlags.HasRe;
      newSubject = "Re: " + newSubject;
    }
    document.title = newSubject;
    currentHeaderData.subject.headerValue = newSubject;
    document.getElementById("expandedsubjectBox").headerValue = newSubject;
    // This even works if the flags haven't changed. Causes repaint in all thread trees.
    gMessage.folder?.msgDatabase.notifyHdrChangeAll(
      gMessage,
      oldFlags,
      gMessage.flags,
      {}
    );
  },

  updateHdrBox(header, value) {
    let e = document.getElementById("expanded" + header + "Box");
    if (e) {
      e.headerValue = value;
    }
  },

  setWindowCallback() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: setWindowCallback\n");

    EnigmailSingletons.messageReader = this.headerPane;
  },

  clearWindowCallback() {
    if (EnigmailSingletons.messageReader == this.headerPane) {
      EnigmailSingletons.messageReader = null;
    }
  },

  headerPane: {
    isCurrentMessage(uri) {
      let uriSpec = uri ? uri.spec : null;

      EnigmailLog.DEBUG(
        "enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.isCurrentMessage: uri.spec=" +
          uriSpec +
          "\n"
      );

      return true;
    },

    /**
     * Determine if a given MIME part number is a multipart/related message or a child thereof
     *
     * @param mimePart:      Object - The MIME Part object to evaluate from the MIME tree
     * @param searchPartNum: String - The part number to determine
     */
    isMultipartRelated(mimePart, searchPartNum) {
      if (
        searchPartNum.indexOf(mimePart.partNum) == 0 &&
        mimePart.partNum.length <= searchPartNum.length
      ) {
        if (mimePart.fullContentType.search(/^multipart\/related/i) === 0) {
          return true;
        }

        for (let i in mimePart.subParts) {
          if (this.isMultipartRelated(mimePart.subParts[i], searchPartNum)) {
            return true;
          }
        }
      }
      return false;
    },

    /**
     * Determine if a given mime part number should be displayed.
     * Returns true if one of these conditions is true:
     *  - this is the 1st displayed block of the message
     *  - the message part displayed corresponds to the decrypted part
     *
     * @param mimePartNumber: String - the MIME part number that was decrypted/verified
     * @param uriSpec:        String - the URI spec that is being displayed
     */
    displaySubPart(mimePartNumber, uriSpec) {
      if (!mimePartNumber || !uriSpec) {
        return true;
      }
      let part = EnigmailMime.getMimePartNumber(uriSpec);

      if (part.length === 0) {
        // only display header if 1st message part
        if (mimePartNumber.search(/^1(\.1)*$/) < 0) {
          return false;
        }
      } else {
        let r = EnigmailFuncs.compareMimePartLevel(mimePartNumber, part);

        // analyzed mime part is contained in viewed message part
        if (r === 2) {
          if (mimePartNumber.substr(part.length).search(/^\.1(\.1)*$/) < 0) {
            return false;
          }
        } else if (r !== 0) {
          return false;
        }

        if (Enigmail.msg.mimeParts) {
          if (this.isMultipartRelated(Enigmail.msg.mimeParts, mimePartNumber)) {
            return false;
          }
        }
      }
      return true;
    },

    /**
     * Determine if there are message parts that are not encrypted
     *
     * @param mimePartNumber String - the MIME part number that was authenticated
     *
     * @returns Boolean: true: there are siblings / false: no siblings
     */
    hasUnauthenticatedParts(mimePartNumber) {
      function hasUnauthenticatedSiblings(
        mimeSubTree,
        mimePartToCheck,
        parentOfMimePartToCheck
      ) {
        if (mimeSubTree.partNum === parentOfMimePartToCheck) {
          // If this is an encrypted message that is the parent of mimePartToCheck,
          // then we know that all its childs (including mimePartToCheck) are authenticated.
          if (
            mimeSubTree.fullContentType.search(
              /^multipart\/encrypted.{1,255}protocol="?application\/pgp-encrypted"?/i
            ) === 0
          ) {
            return false;
          }
        }
        if (
          mimeSubTree.partNum.indexOf(parentOfMimePartToCheck) == 0 &&
          mimeSubTree.partNum !== mimePartToCheck
        ) {
          // This is a sibling (same parent, different part number).
          return true;
        }

        for (let i in mimeSubTree.subParts) {
          if (
            hasUnauthenticatedSiblings(
              mimeSubTree.subParts[i],
              mimePartToCheck,
              parentOfMimePartToCheck
            )
          ) {
            return true;
          }
        }

        return false;
      }

      if (!mimePartNumber || !Enigmail.msg.mimeParts) {
        return false;
      }

      let parentNum = "";
      if (mimePartNumber.includes(".")) {
        parentNum = mimePartNumber.replace(/\.\d+$/, "");
      }

      return hasUnauthenticatedSiblings(
        Enigmail.msg.mimeParts,
        mimePartNumber,
        parentNum
      );
    },

    /**
     * Request that OpenPGP security status from the given MIME part
     * shall be ignored (not shown in the UI). If status for that
     * MIME part was already received, then reset the status.
     *
     * @param {string} originMimePartNumber - Ignore security status
     *   of this MIME part.
     */
    ignoreStatusFrom(originMimePartNumber) {
      Enigmail.hdrView.ignoreStatusFromMimePart = originMimePartNumber;
      setIgnoreStatusFromMimePart(originMimePartNumber);
      if (Enigmail.hdrView.receivedStatusFromParts.has(originMimePartNumber)) {
        Enigmail.hdrView.reset();
        Enigmail.hdrView.ignoreStatusFromMimePart = originMimePartNumber;
      }
    },

    async updateSecurityStatus(
      unusedUriSpec,
      exitCode,
      statusFlags,
      extStatusFlags,
      keyId,
      userId,
      sigDetails,
      errorMsg,
      blockSeparation,
      uri,
      extraDetails,
      mimePartNumber
    ) {
      if (
        Enigmail.hdrView.ignoreStatusFromMimePart != "" &&
        mimePartNumber == Enigmail.hdrView.ignoreStatusFromMimePart
      ) {
        return;
      }

      Enigmail.hdrView.receivedStatusFromParts.add(mimePartNumber);

      // uriSpec is not used for Enigmail anymore. It is here because other addons and pEp rely on it

      EnigmailLog.DEBUG(
        "enigmailMsgHdrViewOverlay.js: updateSecurityStatus: mimePart=" +
          mimePartNumber +
          "\n"
      );

      let uriSpec = uri ? uri.spec : null;

      if (this.isCurrentMessage(uri)) {
        if (statusFlags & EnigmailConstants.DECRYPTION_OKAY) {
          if (gEncryptedURIService) {
            // remember encrypted message URI to enable TB prevention against EFAIL attack
            Enigmail.hdrView.lastEncryptedUri = gMessageURI;
            gEncryptedURIService.rememberEncrypted(
              Enigmail.hdrView.lastEncryptedUri
            );
          }
        }

        if (!this.displaySubPart(mimePartNumber, uriSpec)) {
          return;
        }
        if (this.hasUnauthenticatedParts(mimePartNumber)) {
          EnigmailLog.DEBUG(
            "enigmailMsgHdrViewOverlay.js: updateSecurityStatus: found unauthenticated part\n"
          );
          statusFlags |= EnigmailConstants.PARTIALLY_PGP;
        }

        let encToDetails = null;

        if (extraDetails && extraDetails.length > 0) {
          try {
            let o = JSON.parse(extraDetails);
            if ("encryptedTo" in o) {
              encToDetails = o.encryptedTo;
            }
          } catch (x) {
            console.debug(x);
          }
        }

        Enigmail.hdrView.updatePgpStatus(
          exitCode,
          statusFlags,
          extStatusFlags,
          keyId,
          userId,
          sigDetails,
          errorMsg,
          blockSeparation,
          encToDetails,
          null,
          mimePartNumber
        );
      }
    },

    processDecryptionResult(uri, actionType, processData, mimePartNumber) {
      EnigmailLog.DEBUG(
        "enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.processDecryptionResult:\n"
      );
      EnigmailLog.DEBUG(
        "enigmailMsgHdrViewOverlay.js: actionType= " +
          actionType +
          ", mimePart=" +
          mimePartNumber +
          "\n"
      );

      let msg = gMessage;
      if (!msg) {
        return;
      }
      if (!this.isCurrentMessage(uri)) {
        return;
      }

      switch (actionType) {
        case "modifyMessageHeaders":
          this.modifyMessageHeaders(uri, processData, mimePartNumber);
          break;
        /*
        case "wksConfirmRequest":
          Enigmail.hdrView.checkWksConfirmRequest(processData);
        */
      }
    },

    modifyMessageHeaders(uri, headerData, mimePartNumber) {
      EnigmailLog.DEBUG(
        "enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.modifyMessageHeaders:\n"
      );

      let uriSpec = uri ? uri.spec : null;
      let hdr;

      try {
        hdr = JSON.parse(headerData);
      } catch (ex) {
        EnigmailLog.DEBUG(
          "enigmailMsgHdrViewOverlay.js: modifyMessageHeaders: - no headers to display\n"
        );
        return;
      }

      if (typeof hdr !== "object") {
        return;
      }
      if (!this.displaySubPart(mimePartNumber, uriSpec)) {
        return;
      }

      let msg = gMessage;

      if ("subject" in hdr) {
        Enigmail.hdrView.setSubject(hdr.subject);
      }

      if ("date" in hdr) {
        msg.date = Date.parse(hdr.date) * 1000;
      }
      /*
            if ("newsgroups" in hdr) {
              updateHdrBox("newsgroups", hdr.newsgroups);
            }

            if ("followup-to" in hdr) {
              updateHdrBox("followup-to", hdr["followup-to"]);
            }

            if ("from" in hdr) {
              gExpandedHeaderView.from.outputFunction(gExpandedHeaderView.from, hdr.from);
              msg.setStringProperty("Enigmail-From", hdr.from);
            }

            if ("to" in hdr) {
              gExpandedHeaderView.to.outputFunction(gExpandedHeaderView.to, hdr.to);
              msg.setStringProperty("Enigmail-To", hdr.to);
            }

            if ("cc" in hdr) {
              gExpandedHeaderView.cc.outputFunction(gExpandedHeaderView.cc, hdr.cc);
              msg.setStringProperty("Enigmail-Cc", hdr.cc);
            }

            if ("reply-to" in hdr) {
              gExpandedHeaderView["reply-to"].outputFunction(gExpandedHeaderView["reply-to"], hdr["reply-to"]);
              msg.setStringProperty("Enigmail-ReplyTo", hdr["reply-to"]);
            }
      */
    },

    handleSMimeMessage(uri) {
      if (
        Enigmail.hdrView.msgSignedStateString != null ||
        Enigmail.hdrView.msgEncryptedStateString != null
      ) {
        // If we already processed an OpenPGP part, then we are handling
        // a message with an inner S/MIME part. We must not reload
        // the message here, because we'd run into an endless loop.
        return;
      }
      if (this.isCurrentMessage(uri)) {
        EnigmailVerify.unregisterPGPMimeHandler();
        Enigmail.msg.messageReload(false);
      }
    },
  },

  /*
  onUnloadEnigmail() {
    window.removeEventListener("load-enigmail", Enigmail.hdrView.hdrViewLoad);
    for (let i = 0; i < gMessageListeners.length; i++) {
      if (gMessageListeners[i] === Enigmail.hdrView.messageListener) {
        gMessageListeners.splice(i, 1);
        break;
      }
    }

    let signedHdrElement = document.getElementById("signedHdrIcon");
    if (signedHdrElement) {
      signedHdrElement.setAttribute(
        "onclick",
        "showMessageReadSecurityInfo();"
      );
    }

    let encryptedHdrElement = document.getElementById("encryptedHdrIcon");
    if (encryptedHdrElement) {
      encryptedHdrElement.setAttribute(
        "onclick",
        "showMessageReadSecurityInfo();"
      );
    }

    let addrPopup = document.getElementById("emailAddressPopup");
    if (addrPopup) {
      addrPopup.removeEventListener(
        "popupshowing",
        Enigmail.hdrView.displayAddressPopup
      );
    }

    let attCtx = document.getElementById("attachmentItemContext");
    if (attCtx) {
      attCtx.removeEventListener(
        "popupshowing",
        this.onShowAttachmentContextMenu
      );
    }

    let msgFrame = EnigmailWindows.getFrame(window, "messagepane");
    if (msgFrame) {
      msgFrame.removeEventListener(
        "unload",
        Enigmail.hdrView.messageUnload,
        true
      );
      msgFrame.removeEventListener("load", Enigmail.hdrView.messageLoad);
    }
  },
  */
};

window.addEventListener(
  "load-enigmail",
  Enigmail.hdrView.hdrViewLoad.bind(Enigmail.hdrView)
);
window.addEventListener("unload", () => Enigmail.hdrView.clearWindowCallback());
