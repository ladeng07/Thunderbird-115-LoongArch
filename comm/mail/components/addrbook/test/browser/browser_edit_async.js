/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const { CardDAVDirectory } = ChromeUtils.import(
  "resource:///modules/CardDAVDirectory.jsm"
);
const { CardDAVServer } = ChromeUtils.import(
  "resource://testing-common/CardDAVServer.jsm"
);

let book;

async function inEditingMode() {
  let abWindow = getAddressBookWindow();
  await TestUtils.waitForCondition(
    () => abWindow.detailsPane.isEditing,
    "entering editing mode"
  );
}

async function notInEditingMode() {
  let abWindow = getAddressBookWindow();
  await TestUtils.waitForCondition(
    () => !abWindow.detailsPane.isEditing,
    "leaving editing mode"
  );
}

add_setup(async function () {
  CardDAVServer.open("alice", "alice");

  book = createAddressBook(
    "CardDAV Book",
    Ci.nsIAbManager.CARDDAV_DIRECTORY_TYPE
  );
  book.setIntValue("carddav.syncinterval", 0);
  book.setStringValue("carddav.url", CardDAVServer.url);
  book.setStringValue("carddav.username", "alice");

  let loginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(
    Ci.nsILoginInfo
  );
  loginInfo.init(CardDAVServer.origin, null, "test", "alice", "alice", "", "");
  Services.logins.addLogin(loginInfo);
});

registerCleanupFunction(async function () {
  await promiseDirectoryRemoved(book.URI);
  CardDAVServer.close();
  CardDAVServer.reset();
  CardDAVServer.modifyCardOnPut = false;
});

/**
 * Test the UI as we create/modify/delete a card and wait for responses from
 * the server.
 */
add_task(async function testCreateCard() {
  let abWindow = await openAddressBookWindow();
  let abDocument = abWindow.document;

  let createContactButton = abDocument.getElementById("toolbarCreateContact");
  let bookRow = abWindow.booksList.getRowForUID(book.UID);
  let searchInput = abDocument.getElementById("searchInput");
  let editButton = abDocument.getElementById("editButton");
  let saveEditButton = abDocument.getElementById("saveEditButton");
  let deleteButton = abDocument.getElementById("detailsDeleteButton");

  openDirectory(book);

  // First, create a new contact.

  EventUtils.synthesizeMouseAtCenter(createContactButton, {}, abWindow);
  await inEditingMode();

  abWindow.detailsPane.vCardEdit.displayName.value = "new contact";

  // Saving the contact will get an immediate notification.
  // Delay the server response so we can test the state of the UI.
  let promise1 = TestUtils.topicObserved("addrbook-contact-created");
  CardDAVServer.responseDelay = PromiseUtils.defer();
  EventUtils.synthesizeMouseAtCenter(saveEditButton, {}, abWindow);
  await promise1;
  await notInEditingMode();
  Assert.ok(bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, editButton);
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  // Now allow the server to respond and check the UI state again.
  let promise2 = TestUtils.topicObserved("addrbook-contact-updated");
  CardDAVServer.responseDelay.resolve();
  await promise2;
  Assert.ok(!bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, editButton);
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  // Edit the contact.

  EventUtils.synthesizeMouseAtCenter(editButton, {}, abWindow);
  await inEditingMode();

  abWindow.detailsPane.vCardEdit.displayName.value = "edited contact";

  // Saving the contact will get an immediate notification.
  // Delay the server response so we can test the state of the UI.
  let promise3 = TestUtils.topicObserved("addrbook-contact-updated");
  CardDAVServer.responseDelay = PromiseUtils.defer();
  EventUtils.synthesizeMouseAtCenter(saveEditButton, {}, abWindow);
  await promise3;
  await notInEditingMode();
  Assert.ok(bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, editButton);
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  // Now allow the server to respond and check the UI state again.
  let promise4 = TestUtils.topicObserved("addrbook-contact-updated");
  CardDAVServer.responseDelay.resolve();
  await promise4;
  Assert.ok(!bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, editButton);
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  // Delete the contact.

  EventUtils.synthesizeMouseAtCenter(editButton, {}, abWindow);
  await inEditingMode();

  // Saving the contact will get an immediate notification.
  // Delay the server response so we can test the state of the UI.
  let promise5 = TestUtils.topicObserved("addrbook-contact-deleted");
  CardDAVServer.responseDelay = PromiseUtils.defer();
  BrowserTestUtils.promiseAlertDialog("accept");
  EventUtils.synthesizeMouseAtCenter(deleteButton, {}, abWindow);
  await promise5;
  await notInEditingMode();
  Assert.ok(bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, searchInput);
  Assert.ok(BrowserTestUtils.is_hidden(editButton));

  // Now allow the server to respond and check the UI state again.
  CardDAVServer.responseDelay.resolve();
  await TestUtils.waitForCondition(
    () => !bookRow.classList.contains("requesting")
  );

  await closeAddressBookWindow();
});

/**
 * Test the UI as we create a card and wait for responses from the server.
 * In this test the server will assign the card a new UID, which means the
 * client code has to do things differently, but the UI should behave as it
 * did in the previous test.
 */
add_task(async function testCreateCardWithUIDChange() {
  CardDAVServer.modifyCardOnPut = true;

  let abWindow = await openAddressBookWindow();
  let abDocument = abWindow.document;

  let createContactButton = abDocument.getElementById("toolbarCreateContact");
  let bookRow = abWindow.booksList.getRowForUID(book.UID);
  let searchInput = abDocument.getElementById("searchInput");
  let editButton = abDocument.getElementById("editButton");
  let saveEditButton = abDocument.getElementById("saveEditButton");
  let deleteButton = abDocument.getElementById("detailsDeleteButton");

  openDirectory(book);

  // First, create a new contact.

  EventUtils.synthesizeMouseAtCenter(createContactButton, {}, abWindow);
  await inEditingMode();

  abWindow.detailsPane.vCardEdit.displayName.value = "new contact";

  // Saving the contact will get an immediate notification.
  // Delay the server response so we can test the state of the UI.
  let promise1 = TestUtils.topicObserved("addrbook-contact-created");
  CardDAVServer.responseDelay = PromiseUtils.defer();
  EventUtils.synthesizeMouseAtCenter(saveEditButton, {}, abWindow);
  await promise1;
  await notInEditingMode();
  Assert.ok(bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, editButton);
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  let initialCard = abWindow.detailsPane.currentCard;
  Assert.equal(initialCard.getProperty("_href", "RIGHT"), "RIGHT");

  // Now allow the server to respond and check the UI state again.
  let promise2 = TestUtils.topicObserved("addrbook-contact-created");
  let promise3 = TestUtils.topicObserved("addrbook-contact-deleted");
  CardDAVServer.responseDelay.resolve();
  let [changedCard] = await promise2;
  let [deletedCard] = await promise3;
  Assert.ok(!bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, editButton);
  Assert.ok(BrowserTestUtils.is_visible(editButton));

  Assert.equal(changedCard.UID, [...initialCard.UID].reverse().join(""));
  Assert.equal(
    changedCard.getProperty("_originalUID", "WRONG"),
    initialCard.UID
  );
  Assert.equal(deletedCard.UID, initialCard.UID);

  let displayedCard = abWindow.detailsPane.currentCard;
  Assert.equal(displayedCard.directoryUID, book.UID);
  Assert.notEqual(displayedCard.getProperty("_href", "WRONG"), "WRONG");
  Assert.equal(displayedCard.UID, [...initialCard.UID].reverse().join(""));

  // Delete the contact. This would fail if the UI hadn't been updated.

  EventUtils.synthesizeMouseAtCenter(editButton, {}, abWindow);
  await inEditingMode();

  // Saving the contact will get an immediate notification.
  // Delay the server response so we can test the state of the UI.
  let promise4 = TestUtils.topicObserved("addrbook-contact-deleted");
  CardDAVServer.responseDelay = PromiseUtils.defer();
  BrowserTestUtils.promiseAlertDialog("accept");
  EventUtils.synthesizeMouseAtCenter(deleteButton, {}, abWindow);
  await promise4;
  await notInEditingMode();
  Assert.ok(bookRow.classList.contains("requesting"));
  Assert.equal(abDocument.activeElement, searchInput);
  Assert.ok(BrowserTestUtils.is_hidden(editButton));

  // Now allow the server to respond and check the UI state again.
  CardDAVServer.responseDelay.resolve();
  await TestUtils.waitForCondition(
    () => !bookRow.classList.contains("requesting")
  );

  await closeAddressBookWindow();
  CardDAVServer.modifyCardOnPut = false;
});

/**
 * Test that a modification to the card being edited causes a prompt to appear
 * when saving the card.
 */
add_task(async function testModificationUpdatesUI() {
  let card = personalBook.addCard(createContact("a", "person"));

  let abWindow = await openAddressBookWindow();
  let abDocument = abWindow.document;

  let cardsList = abDocument.getElementById("cards");
  let detailsPane = abDocument.getElementById("detailsPane");
  let contactName = abDocument.getElementById("viewContactName");
  let editButton = abDocument.getElementById("editButton");
  let emailAddressesSection = abDocument.getElementById("emailAddresses");
  let saveEditButton = abDocument.getElementById("saveEditButton");
  let cancelEditButton = abDocument.getElementById("cancelEditButton");

  openDirectory(personalBook);
  Assert.equal(cardsList.view.rowCount, 1);

  // Display a card.

  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(0), {}, abWindow);
  await TestUtils.waitForCondition(() =>
    BrowserTestUtils.is_visible(detailsPane)
  );

  Assert.equal(contactName.textContent, "a person");
  Assert.ok(BrowserTestUtils.is_visible(emailAddressesSection));
  let items = emailAddressesSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(items[0].querySelector("a").textContent, "a.person@invalid");

  // Modify the card and check the display is updated.

  let updatePromise = BrowserTestUtils.waitForMutationCondition(
    detailsPane,
    { childList: true, subtree: true },
    () => true
  );
  card.vCardProperties.addValue("email", "person.a@lastfirst.invalid");
  personalBook.modifyCard(card);

  await updatePromise;
  Assert.equal(contactName.textContent, "a person");
  Assert.ok(BrowserTestUtils.is_visible(emailAddressesSection));
  items = emailAddressesSection.querySelectorAll("li");
  Assert.equal(items.length, 2);
  Assert.equal(items[0].querySelector("a").textContent, "a.person@invalid");
  Assert.equal(
    items[1].querySelector("a").textContent,
    "person.a@lastfirst.invalid"
  );

  // Enter edit mode. Clear one of the email addresses.

  EventUtils.synthesizeMouseAtCenter(editButton, {}, abWindow);
  await inEditingMode();
  Assert.equal(abWindow.detailsPane.vCardEdit.displayName.value, "a person");
  abDocument.querySelector(`#vcard-email tr input[type="email"]`).value = "";

  // Modify the card. Nothing should happen at this point.

  card.displayName = "a different person";
  personalBook.modifyCard(card);

  // Click to save.

  EventUtils.synthesizeMouseAtCenter(saveEditButton, {}, abWindow);
  await notInEditingMode();

  [card] = personalBook.childCards;
  Assert.equal(
    card.displayName,
    "a person",
    "programmatic changes were overwritten"
  );
  Assert.deepEqual(
    card.emailAddresses,
    ["person.a@lastfirst.invalid"],
    "UI changes were saved"
  );

  Assert.equal(contactName.textContent, "a person");
  Assert.ok(BrowserTestUtils.is_visible(emailAddressesSection));
  items = emailAddressesSection.querySelectorAll("li");
  Assert.equal(items.length, 1);
  Assert.equal(
    items[0].querySelector("a").textContent,
    "person.a@lastfirst.invalid"
  );

  // Enter edit mode again. Change the display name.

  EventUtils.synthesizeMouseAtCenter(editButton, {}, abWindow);
  await inEditingMode();
  abWindow.detailsPane.vCardEdit.displayName.value = "a changed person";

  // Modify the card. Nothing should happen at this point.

  card.displayName = "a different person";
  card.vCardProperties.addValue("email", "a.person@invalid");
  personalBook.modifyCard(card);

  // Click to cancel. The modified card should be shown.

  EventUtils.synthesizeMouseAtCenter(cancelEditButton, {}, abWindow);
  await notInEditingMode();

  Assert.equal(contactName.textContent, "a different person");
  Assert.ok(BrowserTestUtils.is_visible(emailAddressesSection));
  items = emailAddressesSection.querySelectorAll("li");
  Assert.equal(items.length, 2);
  Assert.equal(
    items[0].querySelector("a").textContent,
    "person.a@lastfirst.invalid"
  );
  Assert.equal(items[1].querySelector("a").textContent, "a.person@invalid");

  await closeAddressBookWindow();
  personalBook.deleteCards(personalBook.childCards);
});
