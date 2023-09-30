/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var {
  assertExpectedMessagesIndexed,
  glodaTestHelperInitialize,
  waitForGlodaIndexer,
} = ChromeUtils.import("resource://testing-common/gloda/GlodaTestHelper.jsm");

var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { MessageInjection } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageInjection.jsm"
);

/*
 * Test gloda starts up with indexing suppressed when offline at startup.
 */

var messageInjection;

add_setup(async function () {
  // We must do this before the first load otherwise gloda is started without
  // picking up the necessary initialisation.
  Services.io.manageOfflineStatus = false;
  Services.io.offline = true;
  let msgGen = new MessageGenerator();
  messageInjection = new MessageInjection({ mode: "local" }, msgGen);
  glodaTestHelperInitialize(messageInjection);
});

/**
 * Make sure that if we have to reparse a local folder we do not hang or
 *  anything.  (We had a regression where we would hang.)
 */
add_task(async function test_gloda_offline_startup() {
  // Set up a folder for indexing and check the message doesn't get indexed.
  let [, msgSet] = await messageInjection.makeFoldersWithSets(1, [
    { count: 1 },
  ]);

  await waitForGlodaIndexer();
  Assert.ok(...assertExpectedMessagesIndexed([]));

  // Now go online...
  Services.io.offline = false;

  // ...and check we have done the indexing and indexed the message.
  await waitForGlodaIndexer();
  Assert.ok(...assertExpectedMessagesIndexed([msgSet]));
});
