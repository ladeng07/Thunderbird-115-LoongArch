/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test indexing support for online IMAP junk.
 */

var { glodaTestHelperInitialize } = ChromeUtils.import(
  "resource://testing-common/gloda/GlodaTestHelper.jsm"
);
var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { MessageInjection } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageInjection.jsm"
);

var msgGen;
var messageInjection;

/* import-globals-from base_index_junk.js */
load("base_index_junk.js");

add_setup(async function () {
  msgGen = new MessageGenerator();
  messageInjection = new MessageInjection(
    { mode: "imap", offline: false },
    msgGen
  );
  glodaTestHelperInitialize(messageInjection);
});

base_index_junk_tests.forEach(e => {
  add_task(e);
});
