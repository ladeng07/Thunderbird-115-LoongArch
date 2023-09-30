/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailURIs"];

const lazy = {};

ChromeUtils.defineModuleGetter(
  lazy,
  "EnigmailLog",
  "chrome://openpgp/content/modules/log.jsm"
);

const encryptedUris = [];

var EnigmailURIs = {
  /*
   * remember the fact a URI is encrypted
   *
   * @param String msgUri
   *
   * @return null
   */
  rememberEncryptedUri(uri) {
    lazy.EnigmailLog.DEBUG("uris.jsm: rememberEncryptedUri: uri=" + uri + "\n");
    if (!encryptedUris.includes(uri)) {
      encryptedUris.push(uri);
    }
  },

  /*
   * unremember the fact a URI is encrypted
   *
   * @param String msgUri
   *
   * @return null
   */
  forgetEncryptedUri(uri) {
    lazy.EnigmailLog.DEBUG("uris.jsm: forgetEncryptedUri: uri=" + uri + "\n");
    const pos = encryptedUris.indexOf(uri);
    if (pos >= 0) {
      encryptedUris.splice(pos, 1);
    }
  },

  /*
   * determine if a URI was remembered as encrypted
   *
   * @param String msgUri
   *
   * @return: Boolean true if yes, false otherwise
   */
  isEncryptedUri(uri) {
    lazy.EnigmailLog.DEBUG("uris.jsm: isEncryptedUri: uri=" + uri + "\n");
    return encryptedUris.includes(uri);
  },

  /**
   * Determine message number and folder from mailnews URI
   *
   * @param url - nsIURI object
   *
   * @returns Object:
   *    - msgNum: String - the message number, or "" if no URI Scheme fits
   *    - folder: String - the folder (or newsgroup) name
   */
  msgIdentificationFromUrl(url) {
    // sample URLs in Thunderbird
    // Local folder: mailbox:///some/path/to/folder?number=359360
    // IMAP: imap://user@host:port/fetch>some>path>111
    // NNTP: news://some.host/some.service.com?group=some.group.name&key=3510
    // also seen: e.g. mailbox:///some/path/to/folder?number=4455522&part=1.1.2&filename=test.eml
    // mailbox:///...?number=4455522&part=1.1.2&filename=test.eml&type=application/x-message-display&filename=test.eml
    // imap://user@host:port>UID>some>path>10?header=filter&emitter=js&examineEncryptedParts=true

    if (!url) {
      return null;
    }

    lazy.EnigmailLog.DEBUG(
      "uris.jsm: msgIdentificationFromUrl: url.pathQueryRef=" +
        ("path" in url ? url.path : url.pathQueryRef) +
        "\n"
    );

    let msgNum = "";
    let msgFolder = "";

    let pathQueryRef = "path" in url ? url.path : url.pathQueryRef;

    if (url.schemeIs("mailbox")) {
      msgNum = pathQueryRef.replace(/(.*[?&]number=)([0-9]+)([^0-9].*)?/, "$2");
      msgFolder = pathQueryRef.replace(/\?.*/, "");
    } else if (url.schemeIs("file")) {
      msgNum = "0";
      msgFolder = pathQueryRef.replace(/\?.*/, "");
    } else if (url.schemeIs("imap")) {
      let p = unescape(pathQueryRef);
      msgNum = p.replace(/(.*>)([0-9]+)([^0-9].*)?/, "$2");
      msgFolder = p.replace(/\?.*$/, "").replace(/>[^>]+$/, "");
    } else if (url.schemeIs("news")) {
      msgNum = pathQueryRef.replace(/(.*[?&]key=)([0-9]+)([^0-9].*)?/, "$2");
      msgFolder = pathQueryRef.replace(/(.*[?&]group=)([^&]+)(&.*)?/, "$2");
    }

    lazy.EnigmailLog.DEBUG(
      "uris.jsm: msgIdentificationFromUrl: msgNum=" +
        msgNum +
        " / folder=" +
        msgFolder +
        "\n"
    );

    return {
      msgNum,
      folder: msgFolder.toLowerCase(),
    };
  },
};
