/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);
var { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

// Ensure the profile directory is set up
do_get_profile();

// Import the required setup scripts.
/* import-globals-from ../../../test/resources/abSetup.js */
load("../../../resources/abSetup.js");

registerCleanupFunction(function () {
  load("../../../resources/mailShutdown.js");
});

function promiseDirectoryRemoved(uri) {
  let removePromise = TestUtils.topicObserved("addrbook-directory-deleted");
  MailServices.ab.deleteAddressBook(uri);
  return removePromise;
}

function acObserver() {}
acObserver.prototype = {
  _search: null,
  _result: null,
  _resolve: null,

  onSearchResult(aSearch, aResult) {
    this._search = aSearch;
    this._result = aResult;
    this._resolve();
  },

  waitForResult() {
    return new Promise(resolve => {
      this._resolve = resolve;
    });
  },
};

function formatVCard(strings, ...values) {
  let arr = [];
  for (let str of strings) {
    arr.push(str);
    arr.push(values.shift());
  }
  let lines = arr.join("").split("\n");
  let indent = lines[1].length - lines[1].trimLeft().length;
  let outLines = [];
  for (let line of lines) {
    if (line.length > 0) {
      outLines.push(line.substring(indent) + "\r\n");
    }
  }
  return outLines.join("");
}
