/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* This file is a thin interface on top of the rest of the OpenPGP
 * integration ot minimize the amount of code that must be
 * included in files outside the extensions/openpgp directory. */

"use strict";

const EXPORTED_SYMBOLS = ["BondOpenPGP"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  EnigmailKeyRing: "chrome://openpgp/content/modules/keyRing.jsm",
  EnigmailVerify: "chrome://openpgp/content/modules/mimeVerify.jsm",
  EnigmailCore: "chrome://openpgp/content/modules/core.jsm",
  EnigmailWindows: "chrome://openpgp/content/modules/windows.jsm",
  RNP: "chrome://openpgp/content/modules/RNP.jsm",
  GPGME: "chrome://openpgp/content/modules/GPGME.jsm",
});

/*
// Enable this block to view syntax errors in these files, which are
// difficult to see when lazy loading.
var { GPGME } = ChromeUtils.import(
  "chrome://openpgp/content/modules/GPGME.jsm"
);
var { RNP } = ChromeUtils.import(
  "chrome://openpgp/content/modules/RNP.jsm"
);
var { GPGMELibLoader } = ChromeUtils.import(
  "chrome://openpgp/content/modules/GPGMELib.jsm"
);
var { RNPLibLoader } = ChromeUtils.import(
  "chrome://openpgp/content/modules/RNPLib.jsm"
);
*/

var BondOpenPGP = {
  logException(exc) {
    try {
      Services.console.logStringMessage(exc.toString() + "\n" + exc.stack);
    } catch (x) {}
  },

  _alreadyTriedInit: false, // if already true, we will not try again

  async init() {
    if (this._alreadyTriedInit) {
      // We have previously attempted to init, don't try again.
      return;
    }

    this._alreadyTriedInit = true;

    lazy.EnigmailKeyRing.init();
    lazy.EnigmailVerify.init();

    let initDone = await lazy.RNP.init({});
    if (!initDone) {
      let { error } = this.getRNPLibStatus();
      throw new Error(error);
    }

    if (Services.prefs.getBoolPref("mail.openpgp.allow_external_gnupg")) {
      lazy.GPGME.init({});
    }

    // trigger service init
    await lazy.EnigmailCore.getService();
  },

  getRNPLibStatus() {
    return lazy.RNP.getRNPLibStatus();
  },

  openKeyManager(window) {
    lazy.EnigmailWindows.openKeyManager(window);
  },
};
