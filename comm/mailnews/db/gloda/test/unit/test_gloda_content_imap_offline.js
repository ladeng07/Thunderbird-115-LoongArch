/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests the operation of the GlodaContent (in GlodaContent.jsm) and its exposure
 * via Gloda.getMessageContent for IMAP messages that are offline.
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

/* import-globals-from base_gloda_content.js */
load("base_gloda_content.js");

add_setup(async function () {
  msgGen = new MessageGenerator();
  messageInjection = new MessageInjection(
    { mode: "imap", offline: true },
    msgGen
  );
  glodaTestHelperInitialize(messageInjection);
});

base_gloda_content_tests.forEach(e => {
  add_task(e);
});
