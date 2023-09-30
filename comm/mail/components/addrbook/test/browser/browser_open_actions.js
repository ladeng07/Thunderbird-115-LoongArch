/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

let tabmail = document.getElementById("tabmail");
let writableBook, writableCard, readOnlyBook, readOnlyCard;

add_setup(function () {
  writableBook = createAddressBook("writable book");
  writableCard = writableBook.addCard(createContact("writable", "card"));

  readOnlyBook = createAddressBook("read-only book");
  readOnlyCard = readOnlyBook.addCard(createContact("read-only", "card"));
  readOnlyBook.setBoolValue("readOnly", true);

  registerCleanupFunction(async function () {
    await promiseDirectoryRemoved(writableBook.URI);
    await promiseDirectoryRemoved(readOnlyBook.URI);
  });
});

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

/**
 * Tests than a `toAddressBook` call with no argument opens the Address Book.
 * Then call it again with the tab open and check that it doesn't reload.
 */
add_task(async function testNoAction() {
  let abWindow1 = await window.toAddressBook();
  Assert.equal(tabmail.tabInfo.length, 2);
  Assert.equal(tabmail.currentTabInfo.mode.name, "addressBookTab");
  await notInEditingMode();

  let abWindow2 = await window.toAddressBook();
  Assert.equal(tabmail.tabInfo.length, 2);
  Assert.equal(tabmail.currentTabInfo.mode.name, "addressBookTab");
  Assert.equal(
    abWindow2.browsingContext.currentWindowGlobal.innerWindowId,
    abWindow1.browsingContext.currentWindowGlobal.innerWindowId,
    "address book page did not reload"
  );
  await notInEditingMode();

  tabmail.selectTabByIndex(undefined, 1);
  let abWindow3 = await window.toAddressBook();
  Assert.equal(tabmail.tabInfo.length, 2);
  Assert.equal(tabmail.currentTabInfo.mode.name, "addressBookTab");
  Assert.equal(
    abWindow3.browsingContext.currentWindowGlobal.innerWindowId,
    abWindow1.browsingContext.currentWindowGlobal.innerWindowId,
    "address book page did not reload"
  );
  await notInEditingMode();

  await closeAddressBookWindow();
  Assert.equal(tabmail.tabInfo.length, 1);
});

/**
 * Tests than a call to toAddressBook with only a create action opens the
 * Address Book. A new blank card should open in edit mode.
 */
add_task(async function testCreateBlank() {
  await window.toAddressBook({ action: "create" });
  await inEditingMode();
  // TODO check blank
  await closeAddressBookWindow();
});

/**
 * Tests than a call to toAddressBook with a create action and an email
 * address opens the Address Book. A new card with the email address should
 * open in edit mode.
 */
add_task(async function testCreateWithAddress() {
  await window.toAddressBook({ action: "create", address: "test@invalid" });
  await inEditingMode();
  // TODO check address matches
  await closeAddressBookWindow();
});

/**
 * Tests than a call to toAddressBook with a create action and a vCard opens
 * the Address Book. A new card should open in edit mode.
 */
add_task(async function testCreateWithVCard() {
  await window.toAddressBook({
    action: "create",
    vCard:
      "BEGIN:VCARD\r\nFN:a test person\r\nN:person;test;;a;\r\nEND:VCARD\r\n",
  });
  await inEditingMode();
  // TODO check card matches
  await closeAddressBookWindow();
});

/**
 * Tests than a call to toAddressBook with a display action opens the Address
 * Book. The card should be displayed.
 */
add_task(async function testDisplayCard() {
  await window.toAddressBook({ action: "display", card: writableCard });
  checkDirectoryDisplayed(writableBook);
  await notInEditingMode();

  // let abWindow = getAddressBookWindow();
  // let h1 = abWindow.document.querySelector("h1");
  // Assert.equal(h1.textContent, "writable contact");

  await closeAddressBookWindow();
});

/**
 * Tests than a call to toAddressBook with an edit action and a writable card
 * opens the Address Book. The card should open in edit mode.
 */
add_task(async function testEditCardWritable() {
  await window.toAddressBook({ action: "edit", card: writableCard });
  checkDirectoryDisplayed(writableBook);
  await inEditingMode();

  // let abWindow = getAddressBookWindow();
  // let h1 = abWindow.document.querySelector("h1");
  // Assert.equal(h1.textContent, "writable contact");

  await closeAddressBookWindow();
});

/**
 * Tests than a call to toAddressBook with an edit action and a read-only card
 * opens the Address Book. The card should open in display mode.
 */
add_task(async function testEditCardReadOnly() {
  await window.toAddressBook({ action: "edit", card: readOnlyCard });
  checkDirectoryDisplayed(readOnlyBook);
  await notInEditingMode();

  // let abWindow = getAddressBookWindow();
  // let h1 = abWindow.document.querySelector("h1");
  // Assert.equal(h1.textContent, "read-only contact");

  await closeAddressBookWindow();
});
