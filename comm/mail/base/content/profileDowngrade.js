/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let gParams;

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

window.addEventListener("load", event => {
  init();
});

function init() {
  /*
   * The C++ code passes a dialog param block using its integers as in and out
   * arguments for this UI. The following are the uses of the integers:
   *
   *  0: A set of flags from nsIToolkitProfileService.downgradeUIFlags.
   *  1: A return argument, one of nsIToolkitProfileService.downgradeUIChoice.
   */
  gParams = window.arguments[0].QueryInterface(Ci.nsIDialogParamBlock);

  document.addEventListener("dialogextra1", createProfile);
  document.addEventListener("dialogaccept", quit);
  document.addEventListener("dialogcancel", quit);

  document.querySelector("dialog").getButton("accept").focus();
}

function quit() {
  gParams.SetInt(1, Ci.nsIToolkitProfileService.quit);
}

function createProfile() {
  gParams.SetInt(1, Ci.nsIToolkitProfileService.createNewProfile);
  window.close();
}

function moreInfo(event) {
  if (event.type == "keypress" && event.key != "Enter") {
    return;
  }
  event.preventDefault();

  let uri = Services.io.newURI(
    "https://support.mozilla.org/kb/unable-launch-older-version-profile"
  );
  Cc["@mozilla.org/uriloader/external-protocol-service;1"]
    .getService(Ci.nsIExternalProtocolService)
    .loadURI(uri);
}
