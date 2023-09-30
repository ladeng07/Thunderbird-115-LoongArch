/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var { ExtensionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ExtensionXPCShellUtils.sys.mjs"
);
var { LDAPServer } = ChromeUtils.import(
  "resource://testing-common/LDAPServer.jsm"
);

add_setup(async () => {
  Services.prefs.setIntPref("ldap_2.servers.osx.dirType", -1);

  registerCleanupFunction(() => {
    LDAPServer.close();
    // Make sure any open database is given a chance to close.
    Services.startup.advanceShutdownPhase(
      Services.startup.SHUTDOWN_PHASE_APPSHUTDOWNCONFIRMED
    );
  });
});

add_task(async function test_quickSearch() {
  async function background() {
    let book1 = await browser.addressBooks.create({ name: "book1" });
    let book2 = await browser.addressBooks.create({ name: "book2" });

    let book1contacts = {
      charlie: await browser.contacts.create(book1, { FirstName: "charlie" }),
      juliet: await browser.contacts.create(book1, { FirstName: "juliet" }),
      mike: await browser.contacts.create(book1, { FirstName: "mike" }),
      oscar: await browser.contacts.create(book1, { FirstName: "oscar" }),
      papa: await browser.contacts.create(book1, { FirstName: "papa" }),
      romeo: await browser.contacts.create(book1, { FirstName: "romeo" }),
      victor: await browser.contacts.create(book1, { FirstName: "victor" }),
    };

    let book2contacts = {
      bigBird: await browser.contacts.create(book2, {
        FirstName: "Big",
        LastName: "Bird",
      }),
      cookieMonster: await browser.contacts.create(book2, {
        FirstName: "Cookie",
        LastName: "Monster",
      }),
      elmo: await browser.contacts.create(book2, { FirstName: "Elmo" }),
      grover: await browser.contacts.create(book2, { FirstName: "Grover" }),
      oscarTheGrouch: await browser.contacts.create(book2, {
        FirstName: "Oscar",
        LastName: "The Grouch",
      }),
    };

    // A search string without a match in either book.
    let results = await browser.contacts.quickSearch(book1, "snuffleupagus");
    browser.test.assertEq(0, results.length);

    // A search string with a match in the book we're searching.
    results = await browser.contacts.quickSearch(book1, "mike");
    browser.test.assertEq(1, results.length);
    browser.test.assertEq(book1contacts.mike, results[0].id);

    // A search string passed via queryInfo
    results = await browser.contacts.quickSearch(book1, {
      searchString: "mike",
    });
    browser.test.assertEq(1, results.length);
    browser.test.assertEq(book1contacts.mike, results[0].id);

    // A search string with a match in the book we're not searching.
    results = await browser.contacts.quickSearch(book1, "elmo");
    browser.test.assertEq(0, results.length);

    // A search string with a match in both books.
    results = await browser.contacts.quickSearch(book1, "oscar");
    browser.test.assertEq(1, results.length);
    browser.test.assertEq(book1contacts.oscar, results[0].id);

    // A search string with a match in both books. Looking in all books.
    results = await browser.contacts.quickSearch("oscar");
    browser.test.assertEq(2, results.length);
    browser.test.assertEq(book1contacts.oscar, results[0].id);
    browser.test.assertEq(book2contacts.oscarTheGrouch, results[1].id);

    // No valid search strings.
    results = await browser.contacts.quickSearch("  ");
    browser.test.assertEq(0, results.length);

    await browser.addressBooks.delete(book1);
    await browser.addressBooks.delete(book2);

    browser.test.notifyPass("addressBooks");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background,
    manifest: { permissions: ["addressBooks"] },
  });

  await extension.startup();
  await extension.awaitFinish("addressBooks");
  await extension.unload();
});

add_task(async function test_quickSearch_types() {
  // If nsIAbLDAPDirectory doesn't exist in our build options, someone has
  // specified --disable-ldap
  if (!("nsIAbLDAPDirectory" in Ci)) {
    return;
  }

  // Add a card to the personal AB.
  let personaAB = MailServices.ab.getDirectory("jsaddrbook://abook.sqlite");

  let contact = Cc["@mozilla.org/addressbook/cardproperty;1"].createInstance(
    Ci.nsIAbCard
  );
  contact.UID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
  contact.displayName = "personal contact";
  contact.firstName = "personal";
  contact.lastName = "contact";
  contact.primaryEmail = "personal@invalid";
  contact = personaAB.addCard(contact);

  // Set up the history AB as read-only.
  let historyAB = MailServices.ab.getDirectory("jsaddrbook://history.sqlite");

  contact = Cc["@mozilla.org/addressbook/cardproperty;1"].createInstance(
    Ci.nsIAbCard
  );
  contact.UID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxy";
  contact.displayName = "history contact";
  contact.firstName = "history";
  contact.lastName = "contact";
  contact.primaryEmail = "history@invalid";
  contact = historyAB.addCard(contact);

  historyAB.setBoolValue("readOnly", true);

  Assert.ok(historyAB.readOnly);

  // Set up an LDAP address book.
  LDAPServer.open();

  // Create an LDAP directory
  MailServices.ab.newAddressBook(
    "test",
    `ldap://localhost:${LDAPServer.port}/people??sub?(objectclass=*)`,
    Ci.nsIAbManager.LDAP_DIRECTORY_TYPE
  );

  async function background() {
    function checkCards(cards, expectedNames) {
      browser.test.assertEq(expectedNames.length, cards.length);
      let expected = new Set(expectedNames);
      for (let card of cards) {
        expected.delete(card.properties.FirstName);
      }
      browser.test.assertEq(
        0,
        expected.size,
        "Should have seen all expected cards"
      );
    }
    // No arguments should get cards from all address books.
    let results = await browser.contacts.quickSearch("contact");
    checkCards(results, ["personal", "history", "LDAP"]);

    // An empty argument should get cards from all address books.
    results = await browser.contacts.quickSearch({ searchString: "contact" });
    checkCards(results, ["personal", "history", "LDAP"]);

    // Skip remote address books.
    results = await browser.contacts.quickSearch({
      searchString: "contact",
      includeRemote: false,
    });
    checkCards(results, ["personal", "history"]);

    // Skip local address books.
    results = await browser.contacts.quickSearch({
      searchString: "contact",
      includeLocal: false,
    });
    checkCards(results, ["LDAP"]);

    // Skip read-only address books.
    results = await browser.contacts.quickSearch({
      searchString: "contact",
      includeReadOnly: false,
    });
    checkCards(results, ["personal"]);

    // Skip read-write address books.
    results = await browser.contacts.quickSearch({
      searchString: "contact",
      includeReadWrite: false,
    });
    checkCards(results, ["LDAP", "history"]);

    browser.test.notifyPass("addressBooks");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background,
    manifest: { permissions: ["addressBooks"] },
  });

  let startupPromise = extension.startup();

  // This for loop handles returning responses for LDAP. It should run once
  // for each test that queries the remote address book.
  for (let i = 0; i < 4; i++) {
    await LDAPServer.read(LDAPServer.BindRequest);
    LDAPServer.writeBindResponse();

    await LDAPServer.read(LDAPServer.SearchRequest);
    LDAPServer.writeSearchResultEntry({
      dn: "uid=ldap,dc=contact,dc=invalid",
      attributes: {
        objectClass: "person",
        cn: "LDAP contact",
        givenName: "LDAP",
        mail: "eurus@contact.invalid",
        sn: "contact",
      },
    });
    LDAPServer.writeSearchResultDone();
  }

  await startupPromise;
  await extension.awaitFinish("addressBooks");
  await extension.unload();
});
