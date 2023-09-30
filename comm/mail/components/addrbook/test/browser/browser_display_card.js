/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

requestLongerTimeout(2);

var { CalendarTestUtils } = ChromeUtils.import(
  "resource://testing-common/calendar/CalendarTestUtils.jsm"
);
var { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

var { VCardUtils } = ChromeUtils.import("resource:///modules/VCardUtils.jsm");
var { AddrBookCard } = ChromeUtils.import(
  "resource:///modules/AddrBookCard.jsm"
);

/** @implements {nsIExternalProtocolService} */
let mockExternalProtocolService = {
  _loadedURLs: [],
  externalProtocolHandlerExists(aProtocolScheme) {},
  getApplicationDescription(aScheme) {},
  getProtocolHandlerInfo(aProtocolScheme) {},
  getProtocolHandlerInfoFromOS(aProtocolScheme, aFound) {},
  isExposedProtocol(aProtocolScheme) {},
  loadURI(aURI, aWindowContext) {
    this._loadedURLs.push(aURI.spec);
  },
  setProtocolHandlerDefaults(aHandlerInfo, aOSHandlerExists) {},
  urlLoaded(aURL) {
    return this._loadedURLs.includes(aURL);
  },
  QueryInterface: ChromeUtils.generateQI(["nsIExternalProtocolService"]),
};

add_setup(async function () {
  // Card 0.
  personalBook.addCard(
    VCardUtils.vCardToAbCard("BEGIN:VCARD\r\nEND:VCARD\r\n")
  );
  // Card 1.
  personalBook.addCard(
    VCardUtils.vCardToAbCard(formatVCard`
      BEGIN:VCARD
      FN:basic person
      EMAIL:basic@invalid
      END:VCARD
    `)
  );
  // Card 2.
  personalBook.addCard(
    VCardUtils.vCardToAbCard(formatVCard`
      BEGIN:VCARD
      FN:complex person
      EMAIL:secondary@invalid
      EMAIL;PREF=1:primary@invalid
      EMAIL;TYPE=WORK:tertiary@invalid
      TEL;VALUE=URI:tel:000-0000
      TEL;TYPE=WORK,VOICE:callto:111-1111
      TEL;TYPE=VOICE,WORK:222-2222
      TEL;TYPE=HOME;TYPE=VIDEO:tel:333-3333
      ADR:;;street,suburb;city;state;zip;country
      ANNIVERSARY:2018-06-11
      BDAY;VALUE=DATE:--0229
      NOTE:mary had a little lamb\\nits fleece was white as snow\\nand everywhere t
       hat mary went\\nthe lamb was sure to go
      ORG:thunderbird;engineering
      ROLE:sheriff
      TITLE:senior engineering lead
      TZ;VALUE=TEXT:Pacific/Auckland
      URL;TYPE=work:https://www.thunderbird.net/
      IMPP:xmpp:cowboy@example.org
      END:VCARD
    `)
  );

  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  account.addIdentity(MailServices.accounts.createIdentity());

  let calendar = CalendarTestUtils.createCalendar();

  let mockExternalProtocolServiceCID = MockRegistrar.register(
    "@mozilla.org/uriloader/external-protocol-service;1",
    mockExternalProtocolService
  );

  registerCleanupFunction(async () => {
    personalBook.deleteCards(personalBook.childCards);
    MailServices.accounts.removeAccount(account, true);
    CalendarTestUtils.removeCalendar(calendar);
    MockRegistrar.unregister(mockExternalProtocolServiceCID);
  });
});

/**
 * Checks basic display.
 */
add_task(async function testDisplay() {
  let abWindow = await openAddressBookWindow();
  openDirectory(personalBook);

  let abDocument = abWindow.document;
  let cardsList = abDocument.getElementById("cards");
  let detailsPane = abDocument.getElementById("detailsPane");

  let viewContactName = abDocument.getElementById("viewContactName");
  let viewPrimaryEmail = abDocument.getElementById("viewPrimaryEmail");
  let editButton = abDocument.getElementById("editButton");

  let emailAddressesSection = abDocument.getElementById("emailAddresses");
  let phoneNumbersSection = abDocument.getElementById("phoneNumbers");
  let addressesSection = abDocument.getElementById("addresses");
  let notesSection = abDocument.getElementById("notes");
  let websitesSection = abDocument.getElementById("websites");
  let imppSection = abDocument.getElementById("instantMessaging");
  let otherInfoSection = abDocument.getElementById("otherInfo");
  let selectedCardsSection = abDocument.getElementById("selectedCards");

  Assert.equal(cardsList.view.rowCount, personalBook.childCardCount);
  Assert.ok(detailsPane.hidden);

  // Card 0: an empty card.

  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(0), {}, abWindow);
  await TestUtils.waitForCondition(() =>
    BrowserTestUtils.is_visible(detailsPane)
  );

  // Header.
  Assert.equal(viewContactName.textContent, "");
  Assert.equal(viewPrimaryEmail.textContent, "");

  // Action buttons.
  await checkActionButtons();
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  Assert.ok(BrowserTestUtils.is_hidden(emailAddressesSection));
  Assert.ok(BrowserTestUtils.is_hidden(phoneNumbersSection));
  Assert.ok(BrowserTestUtils.is_hidden(addressesSection));
  Assert.ok(BrowserTestUtils.is_hidden(notesSection));
  Assert.ok(BrowserTestUtils.is_hidden(otherInfoSection));
  Assert.ok(BrowserTestUtils.is_hidden(selectedCardsSection));

  // Card 1: an basic card.

  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(1), {}, abWindow);
  await TestUtils.waitForCondition(() =>
    BrowserTestUtils.is_visible(detailsPane)
  );

  // Header.
  Assert.equal(viewContactName.textContent, "basic person");
  Assert.equal(viewPrimaryEmail.textContent, "basic@invalid");

  // Action buttons.
  await checkActionButtons("basic@invalid", "basic person");
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  // Email section.
  Assert.ok(BrowserTestUtils.is_visible(emailAddressesSection));
  let items = emailAddressesSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(items[0].querySelector(".entry-type").textContent, "");
  Assert.equal(
    items[0].querySelector("a").href,
    `mailto:basic%20person%20%3Cbasic%40invalid%3E`
  );
  Assert.equal(items[0].querySelector("a").textContent, "basic@invalid");

  let composeWindowPromise = BrowserTestUtils.domWindowOpened();
  EventUtils.synthesizeMouseAtCenter(items[0].querySelector("a"), {}, abWindow);
  await checkComposeWindow(
    await composeWindowPromise,
    "basic person <basic@invalid>"
  );

  // Other sections.
  Assert.ok(BrowserTestUtils.is_hidden(phoneNumbersSection));
  Assert.ok(BrowserTestUtils.is_hidden(addressesSection));
  Assert.ok(BrowserTestUtils.is_hidden(notesSection));
  Assert.ok(BrowserTestUtils.is_hidden(otherInfoSection));
  Assert.ok(BrowserTestUtils.is_hidden(selectedCardsSection));

  // Card 2: an complex card.

  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(2), {}, abWindow);
  await TestUtils.waitForCondition(() =>
    BrowserTestUtils.is_visible(detailsPane)
  );

  // Header.
  Assert.equal(viewContactName.textContent, "complex person");
  Assert.equal(viewPrimaryEmail.textContent, "primary@invalid");

  // Action buttons.
  await checkActionButtons(
    "primary@invalid",
    "complex person",
    "primary@invalid secondary@invalid tertiary@invalid"
  );
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  // Email section.
  Assert.ok(BrowserTestUtils.is_visible(emailAddressesSection));
  items = emailAddressesSection.querySelectorAll("li");
  Assert.equal(items.length, 3);

  Assert.equal(items[0].querySelector(".entry-type").textContent, "");
  Assert.equal(
    items[0].querySelector("a").href,
    `mailto:complex%20person%20%3Csecondary%40invalid%3E`
  );
  Assert.equal(items[0].querySelector("a").textContent, "secondary@invalid");

  Assert.equal(items[1].querySelector(".entry-type").textContent, "");
  Assert.equal(
    items[1].querySelector("a").href,
    `mailto:complex%20person%20%3Cprimary%40invalid%3E`
  );
  Assert.equal(items[1].querySelector("a").textContent, "primary@invalid");

  Assert.equal(
    items[2].querySelector(".entry-type").dataset.l10nId,
    "about-addressbook-entry-type-work"
  );
  Assert.equal(
    items[2].querySelector("a").href,
    `mailto:complex%20person%20%3Ctertiary%40invalid%3E`
  );
  Assert.equal(items[2].querySelector("a").textContent, "tertiary@invalid");

  composeWindowPromise = BrowserTestUtils.domWindowOpened();
  EventUtils.synthesizeMouseAtCenter(items[2].querySelector("a"), {}, abWindow);
  await checkComposeWindow(
    await composeWindowPromise,
    "complex person <tertiary@invalid>"
  );

  // Phone numbers section.
  Assert.ok(BrowserTestUtils.is_visible(phoneNumbersSection));
  items = phoneNumbersSection.querySelectorAll("li");
  Assert.equal(items.length, 4);

  Assert.equal(items[0].querySelector(".entry-type").textContent, "");
  Assert.equal(items[0].querySelector(".entry-value a").href, `tel:0000000`);

  Assert.equal(
    items[1].querySelector(".entry-type").dataset.l10nId,
    "about-addressbook-entry-type-work"
  );
  Assert.equal(items[1].querySelector(".entry-value").textContent, "111-1111");
  Assert.equal(items[1].querySelector(".entry-value a").href, `callto:1111111`);

  Assert.equal(
    items[2].querySelector(".entry-type").dataset.l10nId,
    "about-addressbook-entry-type-work"
  );
  Assert.equal(items[2].querySelector(".entry-value").textContent, "222-2222");

  Assert.equal(
    items[3].querySelector(".entry-type").dataset.l10nId,
    "about-addressbook-entry-type-home"
  );
  Assert.equal(items[3].querySelector(".entry-value").textContent, "333-3333");
  Assert.equal(items[3].querySelector(".entry-value a").href, `tel:3333333`);

  // Addresses section.
  Assert.ok(BrowserTestUtils.is_visible(addressesSection));
  items = addressesSection.querySelectorAll("li");
  Assert.equal(items.length, 1);

  Assert.equal(items[0].querySelector(".entry-type").textContent, "");
  Assert.equal(items[0].querySelector(".entry-value").childNodes.length, 11);
  Assert.deepEqual(
    Array.from(
      items[0].querySelector(".entry-value").childNodes,
      n => n.textContent
    ),
    ["street", "", "suburb", "", "city", "", "state", "", "zip", "", "country"]
  );

  // Notes section.
  Assert.ok(BrowserTestUtils.is_visible(notesSection));
  Assert.equal(
    notesSection.querySelector("div").textContent,
    "mary had a little lamb\nits fleece was white as snow\nand everywhere that mary went\nthe lamb was sure to go"
  );

  // Websites section
  Assert.ok(BrowserTestUtils.is_visible(websitesSection));
  items = websitesSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-type-work"
  );
  Assert.equal(
    items[0].children[1].querySelector("a").href,
    "https://www.thunderbird.net/"
  );
  Assert.equal(
    items[0].children[1].querySelector("a").textContent,
    "www.thunderbird.net"
  );
  items[0].children[1].querySelector("a").scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    items[0].children[1].querySelector("a"),
    {},
    abWindow
  );
  await TestUtils.waitForCondition(
    () => mockExternalProtocolService.urlLoaded("https://www.thunderbird.net/"),
    "attempted to load website in a browser"
  );

  // Instant messaging section
  Assert.ok(BrowserTestUtils.is_visible(imppSection));
  items = imppSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[1].querySelector("a").href,
    "xmpp:cowboy@example.org"
  );

  // Other sections.
  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));
  items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 6, "number of <li> in section should be correct");
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-name-birthday"
  );
  Assert.equal(items[0].children[1].textContent, "February 29");
  Assert.equal(
    items[1].children[0].dataset.l10nId,
    "about-addressbook-entry-name-anniversary"
  );
  Assert.equal(items[1].children[1].textContent, "June 11, 2018");

  Assert.equal(
    items[2].children[0].dataset.l10nId,
    "about-addressbook-entry-name-title"
  );
  Assert.equal(items[2].children[1].textContent, "senior engineering lead");
  Assert.equal(
    items[3].children[0].dataset.l10nId,
    "about-addressbook-entry-name-role"
  );
  Assert.equal(items[3].children[1].textContent, "sheriff");
  Assert.equal(
    items[4].children[0].dataset.l10nId,
    "about-addressbook-entry-name-organization"
  );
  Assert.deepEqual(
    Array.from(
      items[4].querySelector(".entry-value").childNodes,
      n => n.textContent
    ),
    ["engineering", " • ", "thunderbird"]
  );
  Assert.equal(
    items[5].children[0].dataset.l10nId,
    "about-addressbook-entry-name-time-zone"
  );
  Assert.equal(items[5].children[1].firstChild.nodeValue, "Pacific/Auckland");
  Assert.equal(
    items[5].children[1].lastChild.getAttribute("is"),
    "active-time"
  );
  Assert.equal(
    items[5].children[1].lastChild.getAttribute("tz"),
    "Pacific/Auckland"
  );
  Assert.ok(BrowserTestUtils.is_hidden(selectedCardsSection));

  // Card 0, again, just to prove that everything was cleared properly.

  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(0), {}, abWindow);
  await TestUtils.waitForCondition(() =>
    BrowserTestUtils.is_visible(detailsPane)
  );

  // Header.
  Assert.equal(viewContactName.textContent, "");
  Assert.equal(viewPrimaryEmail.textContent, "");

  // Action buttons.
  await checkActionButtons();
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  Assert.ok(BrowserTestUtils.is_hidden(emailAddressesSection));
  Assert.ok(BrowserTestUtils.is_hidden(phoneNumbersSection));
  Assert.ok(BrowserTestUtils.is_hidden(addressesSection));
  Assert.ok(BrowserTestUtils.is_hidden(notesSection));
  Assert.ok(BrowserTestUtils.is_hidden(otherInfoSection));
  Assert.ok(BrowserTestUtils.is_hidden(selectedCardsSection));

  await closeAddressBookWindow();
});

/**
 * Test the display of dates with various components missing.
 */
add_task(async function testDates() {
  let abWindow = await openAddressBookWindow();
  let otherInfoSection = abWindow.document.getElementById("otherInfo");

  // Year only.

  let yearCard = await addAndDisplayCard(formatVCard`
    BEGIN:VCARD
    EMAIL:xbasic3@invalid
    ANNIVERSARY:2005
    END:VCARD
  `);
  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));
  let items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-name-anniversary"
  );
  Assert.equal(items[0].children[1].textContent, "2005");

  // Year and month.

  let yearMonthCard = await addAndDisplayCard(formatVCard`
    BEGIN:VCARD
    EMAIL:xbasic4@invalid
    ANNIVERSARY:2006-06
    END:VCARD
  `);
  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));
  items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-name-anniversary"
  );
  Assert.equal(items[0].children[1].textContent, "June 2006");

  // Month only.
  let monthCard = await addAndDisplayCard(formatVCard`
    BEGIN:VCARD
    EMAIL:xbasic5@invalid
    ANNIVERSARY:--12
    END:VCARD
  `);
  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));
  items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-name-anniversary"
  );
  Assert.equal(items[0].children[1].textContent, "December");

  // Month and day.
  let monthDayCard = await addAndDisplayCard(formatVCard`
    BEGIN:VCARD
    EMAIL:xbasic6@invalid
    ANNIVERSARY;VALUE=DATE:--0704
    END:VCARD
  `);
  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));
  items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-name-anniversary"
  );
  Assert.equal(items[0].children[1].textContent, "July 4");

  // Day only.
  let dayCard = await addAndDisplayCard(formatVCard`
    BEGIN:VCARD
    EMAIL:xbasic7@invalid
    ANNIVERSARY:---30
    END:VCARD
  `);
  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));
  items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-name-anniversary"
  );
  Assert.equal(items[0].children[1].textContent, "30");

  await closeAddressBookWindow();
  personalBook.deleteCards([
    yearCard,
    yearMonthCard,
    monthCard,
    monthDayCard,
    dayCard,
  ]);
});

/**
 * Only an organisation name.
 */
add_task(async function testOrganisationNameOnly() {
  let card = await addAndDisplayCard(
    VCardUtils.vCardToAbCard(formatVCard`
      BEGIN:VCARD
      ORG:organisation
      END:VCARD
    `)
  );

  let abWindow = await getAddressBookWindow();
  let viewContactName = abWindow.document.getElementById("viewContactName");
  Assert.equal(viewContactName.textContent, "organisation");

  await closeAddressBookWindow();
  personalBook.deleteCards([card]);
});

/**
 * Tests that custom properties (Custom1 etc.) are displayed.
 */
add_task(async function testCustomProperties() {
  let card = new AddrBookCard();
  card._properties = new Map([
    ["PopularityIndex", 0],
    ["Custom2", "custom two"],
    ["Custom4", "custom four"],
    [
      "_vCard",
      formatVCard`
      BEGIN:VCARD
      FN:custom person
      X-CUSTOM3:x-custom three
      X-CUSTOM4:x-custom four
      END:VCARD
      `,
    ],
  ]);
  card = await addAndDisplayCard(card);

  let abWindow = await getAddressBookWindow();
  let otherInfoSection = abWindow.document.getElementById("otherInfo");

  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));

  let items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 3);
  // Custom 1 has no value, should not display.
  // Custom 2 has an old property value, should display that.

  await TestUtils.waitForCondition(() => {
    return items[0].children[0].textContent;
  }, "text not created in time");

  Assert.equal(items[0].children[0].textContent, "Custom 2");
  Assert.equal(items[0].children[1].textContent, "custom two");
  // Custom 3 has a vCard property value, should display that.
  Assert.equal(items[1].children[0].textContent, "Custom 3");
  Assert.equal(items[1].children[1].textContent, "x-custom three");
  // Custom 4 has both types of value, the vCard value should be displayed.
  Assert.equal(items[2].children[0].textContent, "Custom 4");
  Assert.equal(items[2].children[1].textContent, "x-custom four");

  await closeAddressBookWindow();
  personalBook.deleteCards([card]);
});

/**
 * Checks that the edit button is hidden for read-only contacts.
 */
add_task(async function testReadOnlyActions() {
  let readOnlyBook = createAddressBook("Read-Only Book");
  let readOnlyList = readOnlyBook.addMailList(
    createMailingList("Read-Only List")
  );
  readOnlyBook.addCard(
    VCardUtils.vCardToAbCard(formatVCard`
      BEGIN:VCARD
      FN:read-only person
      END:VCARD
    `)
  );
  readOnlyList.addCard(
    readOnlyBook.addCard(
      VCardUtils.vCardToAbCard(formatVCard`
        BEGIN:VCARD
        FN:read-only person with email
        EMAIL:read.only@invalid
        END:VCARD
      `)
    )
  );
  readOnlyBook.setBoolValue("readOnly", true);

  let abWindow = await openAddressBookWindow();

  let abDocument = abWindow.document;
  let cardsList = abDocument.getElementById("cards");
  let detailsPane = abDocument.getElementById("detailsPane");
  let contactView = abDocument.getElementById("viewContact");

  let actions = abDocument.getElementById("detailsActions");
  let editButton = abDocument.getElementById("editButton");
  let editForm = abDocument.getElementById("editContactForm");

  let selectHandler = {
    seenEvent: null,
    selectedAtEvent: null,

    reset() {
      this.seenEvent = null;
      this.selectedAtEvent = null;
    },
    handleEvent(event) {
      this.seenEvent = event;
      this.selectedAtEvent = cardsList.selectedIndex;
    },
  };

  // Check contacts with the book displayed.

  openDirectory(readOnlyBook);
  Assert.equal(cardsList.view.rowCount, 3);
  Assert.ok(BrowserTestUtils.is_hidden(detailsPane));

  // Without email.
  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(1), {}, abWindow);
  Assert.ok(
    BrowserTestUtils.is_visible(contactView),
    "contact view should be shown"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(actions),
    "actions section should be hidden"
  );

  // With email.
  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(2), {}, abWindow);
  Assert.ok(BrowserTestUtils.is_visible(actions), "actions section is shown");
  await checkActionButtons("read.only@invalid", "read-only person with email");
  Assert.ok(BrowserTestUtils.is_hidden(editButton), "editButton is hidden");

  // Double clicking on the item will select but not edit it.
  EventUtils.synthesizeMouseAtCenter(
    cardsList.getRowAtIndex(1),
    { clickCount: 1 },
    abWindow
  );
  EventUtils.synthesizeMouseAtCenter(
    cardsList.getRowAtIndex(1),
    { clickCount: 2 },
    abWindow
  );
  // Wait one loop to see if edit form was opened.
  await TestUtils.waitForTick();
  Assert.ok(
    BrowserTestUtils.is_visible(contactView),
    "contact view should be shown"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(editForm),
    "contact form should be hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(actions),
    "actions section should be hidden"
  );
  Assert.equal(
    cardsList.table.body,
    abDocument.activeElement,
    "Cards list should be the active element"
  );

  selectHandler.reset();
  cardsList.addEventListener("select", selectHandler, { once: true });
  // Same with Enter on the second item.
  EventUtils.synthesizeKey("KEY_ArrowDown", {}, abWindow);
  await TestUtils.waitForCondition(
    () => selectHandler.seenEvent,
    `'select' event should get fired`
  );
  Assert.ok(
    BrowserTestUtils.is_visible(contactView),
    "contact view should be shown"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(editForm),
    "contact form should be hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(actions),
    "actions section should be shown"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(editButton),
    "editButton should be hidden"
  );

  EventUtils.synthesizeKey("KEY_Enter", {}, abWindow);
  await TestUtils.waitForTick();
  Assert.ok(
    BrowserTestUtils.is_visible(contactView),
    "contact view should be shown"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(editForm),
    "contact form should be hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(actions),
    "actions section should be shown"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(editForm),
    "contact form should be hidden"
  );

  // Check contacts with the list displayed.

  openDirectory(readOnlyList);
  Assert.equal(cardsList.view.rowCount, 1);
  Assert.ok(BrowserTestUtils.is_hidden(detailsPane));

  // With email.
  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(0), {}, abWindow);
  Assert.ok(BrowserTestUtils.is_visible(contactView));
  Assert.ok(BrowserTestUtils.is_visible(actions), "actions section is shown");
  await checkActionButtons("read.only@invalid", "read-only person with email");
  Assert.ok(BrowserTestUtils.is_hidden(editButton), "editButton is hidden");

  // Check contacts with All Address Books displayed.

  openAllAddressBooks();
  Assert.equal(cardsList.view.rowCount, 6);
  Assert.ok(BrowserTestUtils.is_hidden(detailsPane));

  // Basic person from Personal Address Books.
  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(1), {}, abWindow);
  Assert.ok(BrowserTestUtils.is_visible(contactView));
  Assert.ok(BrowserTestUtils.is_visible(actions), "actions section is shown");
  await checkActionButtons("basic@invalid", "basic person");
  Assert.ok(BrowserTestUtils.is_visible(editButton), "edit button is shown");

  // Without email.
  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(4), {}, abWindow);
  Assert.ok(BrowserTestUtils.is_visible(contactView));
  Assert.ok(BrowserTestUtils.is_hidden(actions), "actions section is hidden");

  // With email.
  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(5), {}, abWindow);
  Assert.ok(BrowserTestUtils.is_visible(actions), "actions section is shown");
  await checkActionButtons("read.only@invalid", "read-only person with email");
  Assert.ok(BrowserTestUtils.is_hidden(editButton), "editButton is hidden");

  // Basic person again, to prove the buttons aren't hidden forever.
  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(1), {}, abWindow);
  Assert.ok(BrowserTestUtils.is_visible(contactView));
  Assert.ok(BrowserTestUtils.is_visible(actions), "actions section is shown");
  await checkActionButtons("basic@invalid", "basic person");
  Assert.ok(BrowserTestUtils.is_visible(editButton), "edit button is shown");

  await closeAddressBookWindow();
  await promiseDirectoryRemoved(readOnlyBook.URI);
});

/**
 * Tests that we correctly fix Google's bad escaping of colons in values, and
 * other characters in URI values.
 */
add_task(async function testGoogleEscaping() {
  let googleBook = createAddressBook("Google Book");
  googleBook.wrappedJSObject._isGoogleCardDAV = true;
  googleBook.addCard(
    VCardUtils.vCardToAbCard(formatVCard`
      BEGIN:VCARD
      VERSION:3.0
      N:test;en\\\\c\\:oding;;;
      FN:en\\\\c\\:oding test
      TITLE:title\\:title\\;title\\,title\\\\title\\\\\\:title\\\\\\;title\\\\\\,title\\\\\\\\
      TEL:tel\\:0123\\\\4567
      NOTE:notes\\:\\nnotes\\;\\nnotes\\,\\nnotes\\\\
      URL:https\\://host/url\\:url\\;url\\,url\\\\url
      END:VCARD
    `)
  );

  let abWindow = await openAddressBookWindow();

  let abDocument = abWindow.document;
  let cardsList = abDocument.getElementById("cards");
  let detailsPane = abDocument.getElementById("detailsPane");

  let viewContactName = abDocument.getElementById("viewContactName");
  let viewPrimaryEmail = abDocument.getElementById("viewPrimaryEmail");
  let editButton = abDocument.getElementById("editButton");

  let emailAddressesSection = abDocument.getElementById("emailAddresses");
  let phoneNumbersSection = abDocument.getElementById("phoneNumbers");
  let addressesSection = abDocument.getElementById("addresses");
  let notesSection = abDocument.getElementById("notes");
  let websitesSection = abDocument.getElementById("websites");
  let imppSection = abDocument.getElementById("instantMessaging");
  let otherInfoSection = abDocument.getElementById("otherInfo");
  let selectedCardsSection = abDocument.getElementById("selectedCards");

  openDirectory(googleBook);
  Assert.equal(cardsList.view.rowCount, 1);
  Assert.ok(BrowserTestUtils.is_hidden(detailsPane));

  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(0), {}, abWindow);
  await TestUtils.waitForCondition(() =>
    BrowserTestUtils.is_visible(detailsPane)
  );

  // Header.
  Assert.equal(viewContactName.textContent, "en\\c:oding test");
  Assert.equal(viewPrimaryEmail.textContent, "");

  // Action buttons.
  await checkActionButtons();
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  // Email section.
  Assert.ok(BrowserTestUtils.is_hidden(emailAddressesSection));

  // Phone numbers section.
  Assert.ok(BrowserTestUtils.is_visible(phoneNumbersSection));
  let items = phoneNumbersSection.querySelectorAll("li");
  Assert.equal(items.length, 1);

  Assert.equal(items[0].querySelector(".entry-type").textContent, "");
  Assert.equal(items[0].querySelector(".entry-value").textContent, "01234567");

  // Addresses section.
  Assert.ok(BrowserTestUtils.is_hidden(addressesSection));

  // Notes section.
  Assert.ok(BrowserTestUtils.is_visible(notesSection));
  Assert.equal(
    notesSection.querySelector("div").textContent,
    "notes:\nnotes;\nnotes,\nnotes\\"
  );

  // Websites section
  Assert.ok(BrowserTestUtils.is_visible(websitesSection));
  items = websitesSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[1].querySelector("a").href,
    "https://host/url:url;url,url/url"
  );
  Assert.equal(
    items[0].children[1].querySelector("a").textContent,
    "host/url:url;url,url/url"
  );
  items[0].children[1].querySelector("a").scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    items[0].children[1].querySelector("a"),
    {},
    abWindow
  );
  await TestUtils.waitForCondition(
    () =>
      mockExternalProtocolService.urlLoaded("https://host/url:url;url,url/url"),
    "attempted to load website in a browser"
  );

  // Instant messaging section.
  Assert.ok(BrowserTestUtils.is_hidden(imppSection));

  // Other sections.
  Assert.ok(BrowserTestUtils.is_visible(otherInfoSection));
  items = otherInfoSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].children[0].dataset.l10nId,
    "about-addressbook-entry-name-title"
  );
  Assert.equal(
    items[0].children[1].textContent,
    "title:title;title,title\\title\\:title\\;title\\,title\\\\"
  );

  Assert.ok(BrowserTestUtils.is_hidden(selectedCardsSection));

  await closeAddressBookWindow();
  await promiseDirectoryRemoved(googleBook.URI);
});

async function addAndDisplayCard(card) {
  if (typeof card == "string") {
    card = VCardUtils.vCardToAbCard(card);
  }
  card = personalBook.addCard(card);

  let abWindow = await openAddressBookWindow();
  let abDocument = abWindow.document;
  let cardsList = abDocument.getElementById("cards");
  let detailsPane = abDocument.getElementById("detailsPane");

  let index = cardsList.view.getIndexForUID(card.UID);
  EventUtils.synthesizeMouseAtCenter(
    cardsList.getRowAtIndex(index),
    {},
    abWindow
  );
  await TestUtils.waitForCondition(() =>
    BrowserTestUtils.is_visible(detailsPane)
  );
  return card;
}

async function checkActionButtons(
  primaryEmail,
  displayName,
  searchString = primaryEmail
) {
  let tabmail = document.getElementById("tabmail");
  let abWindow = getAddressBookWindow();
  let abDocument = abWindow.document;

  let writeButton = abDocument.getElementById("detailsWriteButton");
  let eventButton = abDocument.getElementById("detailsEventButton");
  let searchButton = abDocument.getElementById("detailsSearchButton");
  let newListButton = abDocument.getElementById("detailsNewListButton");

  if (primaryEmail) {
    // Write.
    Assert.ok(
      BrowserTestUtils.is_visible(writeButton),
      "write button is visible"
    );

    let composeWindowPromise = BrowserTestUtils.domWindowOpened();
    EventUtils.synthesizeMouseAtCenter(writeButton, {}, abWindow);
    await checkComposeWindow(
      await composeWindowPromise,
      `${displayName} <${primaryEmail}>`
    );

    // Search. Do this before the event test to stop a strange macOS failure.
    Assert.ok(
      BrowserTestUtils.is_visible(searchButton),
      "search button is visible"
    );

    let searchTabPromise = BrowserTestUtils.waitForEvent(window, "TabOpen");
    EventUtils.synthesizeMouseAtCenter(searchButton, {}, abWindow);
    let {
      detail: { tabInfo: searchTab },
    } = await searchTabPromise;

    let searchBox = tabmail.selectedTab.panel.querySelector(".searchBox");
    Assert.equal(searchBox.value, searchString);

    searchTabPromise = BrowserTestUtils.waitForEvent(window, "TabClose");
    tabmail.closeTab(searchTab);
    await searchTabPromise;

    // Event.
    Assert.ok(
      BrowserTestUtils.is_visible(eventButton),
      "event button is visible"
    );

    let eventWindowPromise = CalendarTestUtils.waitForEventDialog("edit");
    EventUtils.synthesizeMouseAtCenter(eventButton, {}, abWindow);
    let eventWindow = await eventWindowPromise;

    let iframe = eventWindow.document.getElementById(
      "calendar-item-panel-iframe"
    );
    let tabPanels = iframe.contentDocument.getElementById(
      "event-grid-tabpanels"
    );
    let attendeesTabPanel = iframe.contentDocument.getElementById(
      "event-grid-tabpanel-attendees"
    );
    Assert.equal(
      tabPanels.selectedPanel,
      attendeesTabPanel,
      "attendees are displayed"
    );
    let attendeeNames = attendeesTabPanel.querySelectorAll(
      ".attendee-list .attendee-name"
    );
    Assert.deepEqual(
      Array.from(attendeeNames, a => a.textContent),
      [`${displayName} <${primaryEmail}>`],
      "attendees are correct"
    );

    eventWindowPromise = BrowserTestUtils.domWindowClosed(eventWindow);
    BrowserTestUtils.promiseAlertDialog("extra1");
    EventUtils.synthesizeKey("VK_ESCAPE", {}, eventWindow);
    await eventWindowPromise;
    Assert.report(false, undefined, undefined, "Item dialog closed");
  } else {
    Assert.ok(
      BrowserTestUtils.is_hidden(writeButton),
      "write button is hidden"
    );
    Assert.ok(
      BrowserTestUtils.is_hidden(eventButton),
      "event button is hidden"
    );
    Assert.ok(
      BrowserTestUtils.is_hidden(searchButton),
      "search button is hidden"
    );
  }

  Assert.ok(
    BrowserTestUtils.is_hidden(newListButton),
    "new list button is hidden"
  );
}
