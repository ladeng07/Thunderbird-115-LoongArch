/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Check that events update identity._hasAddressBookCard correctly.
 */

var {
  assertExpectedMessagesIndexed,
  glodaTestHelperInitialize,
  nukeGlodaCachesAndCollections,
  waitForGlodaIndexer,
} = ChromeUtils.import("resource://testing-common/gloda/GlodaTestHelper.jsm");
var { queryExpect } = ChromeUtils.import(
  "resource://testing-common/gloda/GlodaQueryHelper.jsm"
);
var { Gloda } = ChromeUtils.import("resource:///modules/gloda/GlodaPublic.jsm");
var { GlodaCollectionManager } = ChromeUtils.import(
  "resource:///modules/gloda/Collection.jsm"
);
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { MessageInjection } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageInjection.jsm"
);

var EMAIL_ADDRESS = "all.over@the.world.invalid";
var DISPLAY_NAME = "every day";

var messageInjection;

add_setup(function () {
  let msgGen = new MessageGenerator();
  messageInjection = new MessageInjection({ mode: "local" }, msgGen);
  glodaTestHelperInitialize(messageInjection);
});

/**
 * Create an e-mail so the identity can exist.
 */
add_setup(async function () {
  let [msgSet] = await messageInjection.makeNewSetsInFolders(
    [messageInjection.getInboxFolder()],
    [{ count: 1, from: [DISPLAY_NAME, EMAIL_ADDRESS] }]
  );

  await waitForGlodaIndexer();
  Assert.ok(...assertExpectedMessagesIndexed([msgSet]));

  // Okay, but it knows it has no card because indexing thinks stuff.
  // So let's flush all caches and create a query that just knows about the
  //  identity.
  nukeGlodaCachesAndCollections();

  let identQuery = Gloda.newQuery(GlodaConstants.NOUN_IDENTITY);
  identQuery.kind("email");
  identQuery.value(EMAIL_ADDRESS);
  await queryExpect(identQuery, [EMAIL_ADDRESS]);

  // Now the identity exists. Make sure it is in cache.
  let identity = get_cached_gloda_identity_for_email(EMAIL_ADDRESS);
  Assert.notEqual(identity, null);

  // And make sure it has no idea what the current state of the card is.
  if (identity._hasAddressBookCard !== undefined) {
    do_throw(
      "We should have no idea about the state of the ab card, but " +
        "it's: " +
        identity._hasAddressBookCard
    );
  }
});

/**
 * Add a card for that e-mail, make sure we update the cached identity ab
 *  card state.
 */
add_task(function test_add_card_cache_indication() {
  add_card(EMAIL_ADDRESS, DISPLAY_NAME);

  let identity = get_cached_gloda_identity_for_email(EMAIL_ADDRESS);
  Assert.equal(identity._hasAddressBookCard, true);
});

/**
 * Remove the card we added in setup, make sure we update the cached identity
 *  ab card state.
 */
add_task(function test_remove_card_cache_indication() {
  delete_card(EMAIL_ADDRESS);

  let identity = get_cached_gloda_identity_for_email(EMAIL_ADDRESS);
  Assert.equal(identity._hasAddressBookCard, false);
});

/**
 * Add again a card for that e-mail, make sure we update the cached identity ab
 *  card state.
 */
add_task(function test_add_card_cache_indication() {
  add_card(EMAIL_ADDRESS, DISPLAY_NAME);

  let identity = get_cached_gloda_identity_for_email(EMAIL_ADDRESS);
  Assert.equal(identity._hasAddressBookCard, true);
});

function add_card(aEmailAddress, aDisplayName) {
  Cc["@mozilla.org/addressbook/services/addressCollector;1"]
    .getService(Ci.nsIAbAddressCollector)
    .collectSingleAddress(aEmailAddress, aDisplayName, true, true);
}

function get_card_for_email(aEmailAddress) {
  for (let book of MailServices.ab.directories) {
    let card = book.cardForEmailAddress(aEmailAddress);
    if (card) {
      return [book, card];
    }
  }
  return [null, null];
}

function delete_card(aEmailAddress) {
  let [book, card] = get_card_for_email(aEmailAddress);

  MailServices.ab.getDirectory(book.URI).deleteCards([card]);
}

function get_cached_gloda_identity_for_email(aEmailAddress) {
  return GlodaCollectionManager.cacheLookupOneByUniqueValue(
    GlodaConstants.NOUN_IDENTITY,
    "email@" + aEmailAddress.toLowerCase()
  );
}
