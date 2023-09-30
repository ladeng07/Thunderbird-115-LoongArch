/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const { CardDAVDirectory } = ChromeUtils.import(
  "resource:///modules/CardDAVDirectory.jsm"
);
const { CardDAVServer } = ChromeUtils.import(
  "resource://testing-common/CardDAVServer.jsm"
);
const { ICAL } = ChromeUtils.import("resource:///modules/calendar/Ical.jsm");

const dragService = Cc["@mozilla.org/widget/dragservice;1"].getService(
  Ci.nsIDragService
);
const profileDir = Services.dirsvc.get("ProfD", Ci.nsIFile).path;

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

async function waitForDialogOpenState(state) {
  let abWindow = getAddressBookWindow();
  let dialog = abWindow.document.getElementById("photoDialog");
  await TestUtils.waitForCondition(
    () => dialog.open == state,
    "waiting for photo dialog to change state"
  );
  await new Promise(resolve => abWindow.setTimeout(resolve));
}

async function waitForPreviewChange() {
  let abWindow = getAddressBookWindow();
  let preview = abWindow.document.querySelector("#photoDialog svg > image");
  let oldValue = preview.getAttribute("href");
  await BrowserTestUtils.waitForEvent(
    preview,
    "load",
    false,
    () => preview.getAttribute("href") != oldValue
  );
  await new Promise(resolve => abWindow.requestAnimationFrame(resolve));
}

async function waitForPhotoChange() {
  let abWindow = getAddressBookWindow();
  let photo = abWindow.document.querySelector("#photoButton .contact-photo");
  let dialog = abWindow.document.getElementById("photoDialog");
  let oldValue = photo.src;
  await BrowserTestUtils.waitForMutationCondition(
    photo,
    { attributes: true },
    () => photo.src != oldValue
  );
  await new Promise(resolve => abWindow.requestAnimationFrame(resolve));
  Assert.ok(!dialog.open, "dialog was closed when photo changed");
}

function dropFile(target, path) {
  let abWindow = getAddressBookWindow();
  let file = new FileUtils.File(getTestFilePath(path));

  let dataTransfer = new DataTransfer();
  dataTransfer.dropEffect = "copy";
  dataTransfer.mozSetDataAt("application/x-moz-file", file, 0);

  dragService.startDragSessionForTests(Ci.nsIDragService.DRAGDROP_ACTION_COPY);
  dragService.getCurrentSession().dataTransfer = dataTransfer;

  EventUtils.synthesizeDragOver(
    target,
    target,
    [{ type: "application/x-moz-file", data: file }],
    "copy",
    abWindow
  );

  // This make sure that the fake dataTransfer has still the expected drop
  // effect after the synthesizeDragOver call.
  dataTransfer.dropEffect = "copy";

  EventUtils.synthesizeDropAfterDragOver(null, dataTransfer, target, abWindow, {
    _domDispatchOnly: true,
  });

  dragService.endDragSession(true);
}

function checkDialogElements({
  dropTargetClass = "",
  svgVisible = false,
  saveButtonVisible = false,
  saveButtonDisabled = false,
  discardButtonVisible = false,
}) {
  let abWindow = getAddressBookWindow();
  let dialog = abWindow.document.getElementById("photoDialog");
  let { saveButton, discardButton } = dialog;
  let dropTarget = dialog.querySelector("#photoDropTarget");
  let svg = dialog.querySelector("svg");
  Assert.equal(
    BrowserTestUtils.is_visible(dropTarget),
    !!dropTargetClass,
    "drop target visibility"
  );
  if (dropTargetClass) {
    Assert.stringContains(
      dropTarget.className,
      dropTargetClass,
      "drop target message"
    );
  }
  Assert.equal(BrowserTestUtils.is_visible(svg), svgVisible, "SVG visibility");
  Assert.equal(
    BrowserTestUtils.is_visible(saveButton),
    saveButtonVisible,
    "save button visibility"
  );
  Assert.equal(
    saveButton.disabled,
    saveButtonDisabled,
    "save button disabled state"
  );
  Assert.equal(
    BrowserTestUtils.is_visible(discardButton),
    discardButtonVisible,
    "discard button visibility"
  );
}

function getInput(entryName, addIfNeeded = false) {
  let abWindow = getAddressBookWindow();
  let abDocument = abWindow.document;

  switch (entryName) {
    case "DisplayName":
      return abDocument.querySelector("vcard-fn #vCardDisplayName");
    case "FirstName":
      return abDocument.querySelector("vcard-n #vcard-n-firstname");
    case "LastName":
      return abDocument.querySelector("vcard-n #vcard-n-lastname");
    case "PrimaryEmail":
      if (
        addIfNeeded &&
        abDocument.getElementById("vcard-email").children.length < 1
      ) {
        EventUtils.synthesizeMouseAtCenter(
          abDocument.getElementById("vcard-add-email"),
          {},
          abWindow
        );
      }
      return abDocument.querySelector(
        `#vcard-email tr:nth-child(1) input[type="email"]`
      );
    case "SecondEmail":
      if (
        addIfNeeded &&
        abDocument.getElementById("vcard-email").children.length < 2
      ) {
        EventUtils.synthesizeMouseAtCenter(
          abDocument.getElementById("vcard-add-email"),
          {},
          abWindow
        );
      }
      return abDocument.querySelector(
        `#vcard-email tr:nth-child(2) input[type="email"]`
      );
  }

  return null;
}

function setInputValues(changes) {
  let abWindow = getAddressBookWindow();

  for (let [key, value] of Object.entries(changes)) {
    let input = getInput(key, !!value);
    if (!input) {
      Assert.ok(!value, `${key} input exists to put a value in`);
      continue;
    }

    input.select();
    if (value) {
      EventUtils.sendString(value);
    } else {
      EventUtils.synthesizeKey("VK_BACK_SPACE", {}, abWindow);
    }
  }
  EventUtils.synthesizeKey("VK_TAB", {}, abWindow);
}

add_setup(async function () {
  await openAddressBookWindow();
  openDirectory(personalBook);
});

registerCleanupFunction(async function cleanUp() {
  await closeAddressBookWindow();
  personalBook.deleteCards(personalBook.childCards);
  await CardDAVServer.close();
});

/** Create a new contact. We'll add a photo to this contact. */
async function subtest_add_photo(book) {
  let abWindow = getAddressBookWindow();
  let abDocument = abWindow.document;

  let createContactButton = abDocument.getElementById("toolbarCreateContact");
  let saveEditButton = abDocument.getElementById("saveEditButton");
  let photoButton = abDocument.getElementById("photoButton");
  let editPhoto = photoButton.querySelector(".contact-photo");
  let viewPhoto = abDocument.getElementById("viewContactPhoto");
  let dialog = abWindow.document.getElementById("photoDialog");
  let { saveButton } = dialog;

  openDirectory(book);

  EventUtils.synthesizeMouseAtCenter(createContactButton, {}, abWindow);
  await inEditingMode();

  // Open the photo dialog by clicking on the photo.

  Assert.equal(
    editPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "no photo shown"
  );
  EventUtils.synthesizeMouseAtCenter(photoButton, {}, abWindow);
  await waitForDialogOpenState(true);

  checkDialogElements({
    dropTargetClass: "drop-target",
    saveButtonVisible: true,
    saveButtonDisabled: true,
  });

  // Drop a file on the photo dialog.

  let previewChangePromise = waitForPreviewChange();
  dropFile(dialog, "data/photo1.jpg");
  await previewChangePromise;

  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
  });

  // Accept the photo dialog.

  let photoChangePromise = waitForPhotoChange();
  EventUtils.synthesizeMouseAtCenter(saveButton, {}, abWindow);
  await photoChangePromise;
  Assert.notEqual(
    editPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "a photo is shown"
  );

  // Save the contact.

  let createdPromise = TestUtils.topicObserved("addrbook-contact-created");
  setInputValues({
    DisplayName: "Person with Photo 1",
  });
  EventUtils.synthesizeMouseAtCenter(saveEditButton, {}, abWindow);
  await notInEditingMode();

  // Photo shown in view.
  Assert.notEqual(
    viewPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "a photo is shown in contact view"
  );

  let [card, uid] = await createdPromise;
  Assert.equal(uid, book.UID);
  return card;
}

/** Create another new contact. This time we'll add a photo, but discard it. */
async function subtest_dont_add_photo(book) {
  let abWindow = getAddressBookWindow();
  let abDocument = abWindow.document;

  let createContactButton = abDocument.getElementById("toolbarCreateContact");
  let saveEditButton = abDocument.getElementById("saveEditButton");
  let photoButton = abDocument.getElementById("photoButton");
  let editPhoto = photoButton.querySelector(".contact-photo");
  let viewPhoto = abDocument.getElementById("viewContactPhoto");
  let dialog = abWindow.document.getElementById("photoDialog");
  let { saveButton, cancelButton, discardButton } = dialog;
  let svg = dialog.querySelector("svg");

  EventUtils.synthesizeMouseAtCenter(createContactButton, {}, abWindow);
  await inEditingMode();

  // Drop a file on the photo.

  dropFile(photoButton, "data/photo2.jpg");
  await waitForDialogOpenState(true);
  await TestUtils.waitForCondition(() => BrowserTestUtils.is_visible(svg));

  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
  });

  // Cancel the photo dialog.

  EventUtils.synthesizeMouseAtCenter(cancelButton, {}, abWindow);
  await waitForDialogOpenState(false);
  Assert.equal(
    editPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "no photo shown"
  );

  // Open the photo dialog by clicking on the photo.

  EventUtils.synthesizeMouseAtCenter(photoButton, {}, abWindow);
  await waitForDialogOpenState(true);

  checkDialogElements({
    dropTargetClass: "drop-target",
    saveButtonVisible: true,
    saveButtonDisabled: true,
  });

  // Drop a file on the photo dialog.

  let previewChangePromise = waitForPreviewChange();
  dropFile(dialog, "data/photo1.jpg");
  await previewChangePromise;

  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
  });

  // Drop another file on the photo dialog.

  previewChangePromise = waitForPreviewChange();
  dropFile(dialog, "data/photo2.jpg");
  await previewChangePromise;

  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
  });

  // Accept the photo dialog.

  let photoChangePromise = waitForPhotoChange();
  EventUtils.synthesizeMouseAtCenter(saveButton, {}, abWindow);
  await photoChangePromise;
  Assert.notEqual(
    editPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "a photo is shown"
  );

  // Open the photo dialog by clicking on the photo.

  EventUtils.synthesizeMouseAtCenter(photoButton, {}, abWindow);
  await waitForDialogOpenState(true);

  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
    discardButtonVisible: true,
  });

  // Click to discard the photo.

  photoChangePromise = waitForPhotoChange();
  EventUtils.synthesizeMouseAtCenter(discardButton, {}, abWindow);
  await photoChangePromise;

  // Open the photo dialog by clicking on the photo.

  EventUtils.synthesizeMouseAtCenter(photoButton, {}, abWindow);
  await waitForDialogOpenState(true);

  checkDialogElements({
    dropTargetClass: "drop-target",
    saveButtonVisible: true,
    saveButtonDisabled: true,
  });

  EventUtils.synthesizeMouseAtCenter(cancelButton, {}, abWindow);
  await waitForDialogOpenState(false);
  Assert.equal(
    editPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "no photo shown"
  );

  // Save the contact and check the photo was NOT saved.

  let createdPromise = TestUtils.topicObserved("addrbook-contact-created");
  setInputValues({
    DisplayName: "Person with Photo 2",
  });
  EventUtils.synthesizeMouseAtCenter(saveEditButton, {}, abWindow);
  await notInEditingMode();

  Assert.equal(
    viewPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "no photo shown in contact view"
  );

  let [card, uid] = await createdPromise;
  Assert.equal(uid, book.UID);
  return card;
}

/** Go back to the first contact and discard the photo. */
async function subtest_discard_photo(book, checkPhotoCallback) {
  let abWindow = getAddressBookWindow();
  let abDocument = abWindow.document;

  let cardsList = abDocument.getElementById("cards");
  let editButton = abDocument.getElementById("editButton");
  let saveEditButton = abDocument.getElementById("saveEditButton");
  let photoButton = abDocument.getElementById("photoButton");
  let editPhoto = photoButton.querySelector(".contact-photo");
  let viewPhoto = abDocument.getElementById("viewContactPhoto");
  let dialog = abWindow.document.getElementById("photoDialog");
  let { discardButton } = dialog;

  openDirectory(book);

  EventUtils.synthesizeMouseAtCenter(cardsList.getRowAtIndex(0), {}, abWindow);
  Assert.ok(
    checkPhotoCallback(viewPhoto.src),
    "saved photo shown in contact view"
  );
  EventUtils.synthesizeMouseAtCenter(editButton, {}, abWindow);
  await inEditingMode();

  // Open the photo dialog by clicking on the photo.

  Assert.ok(
    checkPhotoCallback(editPhoto.src),
    "saved photo shown in edit view"
  );

  EventUtils.synthesizeMouseAtCenter(photoButton, {}, abWindow);
  await waitForDialogOpenState(true);

  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
    discardButtonVisible: true,
  });

  // Click to discard the photo.

  let photoChangePromise = waitForPhotoChange();
  EventUtils.synthesizeMouseAtCenter(discardButton, {}, abWindow);
  await photoChangePromise;

  // Save the contact and check the photo was removed.

  let updatedPromise = TestUtils.topicObserved("addrbook-contact-updated");
  EventUtils.synthesizeMouseAtCenter(saveEditButton, {}, abWindow);
  await notInEditingMode();
  Assert.equal(
    viewPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "photo no longer shown in contact view"
  );

  let [card, uid] = await updatedPromise;
  Assert.equal(uid, book.UID);
  return card;
}

/** Check that pasting URLs on photo widgets works. */
async function subtest_paste_url() {
  let abWindow = getAddressBookWindow();
  let abDocument = abWindow.document;

  let createContactButton = abDocument.getElementById("toolbarCreateContact");
  let cancelEditButton = abDocument.getElementById("cancelEditButton");
  let photoButton = abDocument.getElementById("photoButton");
  let editPhoto = photoButton.querySelector(".contact-photo");
  let dropTarget = abDocument.getElementById("photoDropTarget");

  // Start a new contact and focus on the photo button.

  EventUtils.synthesizeMouseAtCenter(createContactButton, {}, abWindow);
  await inEditingMode();

  Assert.equal(
    editPhoto.src,
    "chrome://messenger/skin/icons/new/compact/user.svg",
    "no photo shown"
  );

  Assert.equal(abDocument.activeElement.id, "vcard-n-firstname");
  EventUtils.synthesizeKey("VK_TAB", { shiftKey: true }, abWindow);
  // Focus is on name prefix button.
  EventUtils.synthesizeKey("VK_TAB", { shiftKey: true }, abWindow);
  Assert.equal(
    abDocument.activeElement,
    photoButton,
    "photo button is focused"
  );

  // Paste a URL.

  let previewChangePromise = waitForPreviewChange();

  let wrapper1 = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  wrapper1.data =
    "http://mochi.test:8888/browser/comm/mail/components/addrbook/test/browser/data/photo1.jpg";
  let transfer1 = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  transfer1.init(null);
  transfer1.addDataFlavor("text/plain");
  transfer1.setTransferData("text/plain", wrapper1);
  Services.clipboard.setData(transfer1, null, Ci.nsIClipboard.kGlobalClipboard);
  EventUtils.synthesizeKey("v", { accelKey: true }, abWindow);

  await waitForDialogOpenState(true);
  await previewChangePromise;
  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
    saveButtonDisabled: false,
  });

  // Close then reopen the dialog.

  EventUtils.synthesizeKey("VK_ESCAPE", {}, abWindow);
  await waitForDialogOpenState(false);

  EventUtils.synthesizeMouseAtCenter(photoButton, {}, abWindow);
  await waitForDialogOpenState(true);
  checkDialogElements({
    dropTargetClass: "drop-target",
    saveButtonVisible: true,
    saveButtonDisabled: true,
  });

  // Paste a URL.

  previewChangePromise = waitForPreviewChange();

  let wrapper2 = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  wrapper2.data =
    "http://mochi.test:8888/browser/comm/mail/components/addrbook/test/browser/data/photo2.jpg";
  let transfer2 = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  transfer2.init(null);
  transfer2.addDataFlavor("text/plain");
  transfer2.setTransferData("text/plain", wrapper2);
  Services.clipboard.setData(transfer2, null, Ci.nsIClipboard.kGlobalClipboard);
  EventUtils.synthesizeKey("v", { accelKey: true }, abWindow);

  await previewChangePromise;
  checkDialogElements({
    svgVisible: true,
    saveButtonVisible: true,
    saveButtonDisabled: false,
  });

  // Close then reopen the dialog.

  EventUtils.synthesizeKey("VK_ESCAPE", {}, abWindow);
  await waitForDialogOpenState(false);

  EventUtils.synthesizeMouseAtCenter(photoButton, {}, abWindow);
  await waitForDialogOpenState(true);
  checkDialogElements({
    dropTargetClass: "drop-target",
    saveButtonVisible: true,
    saveButtonDisabled: true,
  });

  // Paste an invalid URL.

  let wrapper3 = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  wrapper3.data =
    "http://mochi.test:8888/browser/comm/mail/components/addrbook/test/browser/data/fake.jpg";
  let transfer3 = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  transfer3.init(null);
  transfer3.addDataFlavor("text/plain");
  transfer3.setTransferData("text/plain", wrapper3);
  Services.clipboard.setData(transfer3, null, Ci.nsIClipboard.kGlobalClipboard);
  EventUtils.synthesizeKey("v", { accelKey: true }, abWindow);

  await TestUtils.waitForCondition(() =>
    dropTarget.classList.contains("drop-error")
  );

  checkDialogElements({
    dropTargetClass: "drop-error",
    saveButtonVisible: true,
    saveButtonDisabled: true,
  });

  EventUtils.synthesizeKey("VK_ESCAPE", {}, abWindow);
  await waitForDialogOpenState(false);

  EventUtils.synthesizeMouseAtCenter(cancelEditButton, {}, abWindow);
  await notInEditingMode();
}

/** Test photo operations with a local address book. */
add_task(async function test_local() {
  // Create a new contact. We'll add a photo to this contact.

  let card1 = await subtest_add_photo(personalBook);
  let photo1Name = card1.getProperty("PhotoName", "");
  Assert.ok(photo1Name, "PhotoName property saved on card");

  let photo1Path = PathUtils.join(profileDir, "Photos", photo1Name);
  let photo1File = new FileUtils.File(photo1Path);
  Assert.ok(photo1File.exists(), "photo saved to disk");

  let image = new Image();
  let loadedPromise = BrowserTestUtils.waitForEvent(image, "load");
  image.src = Services.io.newFileURI(photo1File).spec;
  await loadedPromise;

  Assert.equal(image.naturalWidth, 300, "photo saved at correct width");
  Assert.equal(image.naturalHeight, 300, "photo saved at correct height");

  // Create another new contact. This time we'll add a photo, but discard it.

  let card2 = await subtest_dont_add_photo(personalBook);
  Assert.equal(
    card2.getProperty("PhotoName", "NO VALUE"),
    "NO VALUE",
    "PhotoName property not saved on card"
  );

  // Go back to the first contact and discard the photo.

  let card3 = await subtest_discard_photo(personalBook, src =>
    src.endsWith(photo1Name)
  );
  Assert.equal(
    card3.getProperty("PhotoName", "NO VALUE"),
    "NO VALUE",
    "PhotoName property removed from card"
  );
  Assert.ok(
    !new FileUtils.File(photo1Path).exists(),
    "photo removed from disk"
  );

  // Check that pasting URLs on photo widgets works.

  await subtest_paste_url(personalBook);
});

/**
 * Test photo operations with a CardDAV address book and a server that only
 * speaks vCard 3, i.e. Google.
 */
add_task(async function test_add_photo_carddav3() {
  // Set up the server, address book and password.

  CardDAVServer.open("alice", "alice");
  CardDAVServer.mimicGoogle = true;

  let book = createAddressBook(
    "CardDAV Book",
    Ci.nsIAbManager.CARDDAV_DIRECTORY_TYPE
  );
  book.setIntValue("carddav.syncinterval", 0);
  book.setStringValue("carddav.url", CardDAVServer.url);
  book.setStringValue("carddav.username", "alice");
  book.setBoolValue("carddav.vcard3", true);
  book.wrappedJSObject._isGoogleCardDAV = true;

  let loginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(
    Ci.nsILoginInfo
  );
  loginInfo.init(CardDAVServer.origin, null, "test", "alice", "alice", "", "");
  Services.logins.addLogin(loginInfo);

  // Create a new contact. We'll add a photo to this contact.

  // This notification fires when we retrieve the saved card from the server,
  // which happens before subtest_add_photo finishes.
  let updatedPromise = TestUtils.topicObserved("addrbook-contact-updated");
  let card1 = await subtest_add_photo(book);
  Assert.equal(
    card1.getProperty("PhotoName", "RIGHT"),
    "RIGHT",
    "PhotoName property not saved on card"
  );

  // Check the card we sent.
  let photoProp = card1.vCardProperties.getFirstEntry("photo");
  Assert.ok(card1.vCardProperties.designSet === ICAL.design.vcard3);
  Assert.ok(photoProp);
  Assert.equal(photoProp.params.encoding, "B");
  Assert.equal(photoProp.type, "binary");
  Assert.ok(photoProp.value.startsWith("/9j/"));

  // Check the card we received from the server. If the server didn't like it,
  // the photo will be removed and this will fail.
  let [card2] = await updatedPromise;
  photoProp = card2.vCardProperties.getFirstEntry("photo");
  Assert.ok(card2.vCardProperties.designSet === ICAL.design.vcard3);
  Assert.ok(photoProp);
  Assert.equal(photoProp.params.encoding, "B");
  Assert.equal(photoProp.type, "binary");
  Assert.ok(photoProp.value.startsWith("/9j/"));

  // Check the card on the server.
  Assert.equal(CardDAVServer.cards.size, 1);
  let [serverCard] = [...CardDAVServer.cards.values()];
  Assert.ok(
    serverCard.vCard.includes("\nPHOTO;ENCODING=B:/9j/"),
    "photo included in card on server"
  );

  // Discard the photo.

  let card3 = await subtest_discard_photo(book, src =>
    src.startsWith("data:image/jpeg;base64,/9j/")
  );

  // Check the card we sent.
  Assert.equal(card3.vCardProperties.getFirstEntry("photo"), null);

  // This notification is the second of two, and fires when we retrieve the
  // saved card from the server, which doesn't happen before
  // subtest_discard_photo finishes.
  let [card4] = await TestUtils.topicObserved("addrbook-contact-updated");
  Assert.equal(card4.vCardProperties.getFirstEntry("photo"), null);

  // Check the card on the server.
  Assert.equal(CardDAVServer.cards.size, 1);
  [serverCard] = [...CardDAVServer.cards.values()];
  Assert.ok(
    !serverCard.vCard.includes("PHOTO:"),
    "photo removed from card on server"
  );

  await promiseDirectoryRemoved(book.URI);
  CardDAVServer.mimicGoogle = false;
  CardDAVServer.close();
  CardDAVServer.reset();
});

/**
 * Test photo operations with a CardDAV address book and a server that can
 * handle vCard 4.
 */
add_task(async function test_add_photo_carddav4() {
  // Set up the server, address book and password.

  CardDAVServer.open("bob", "bob");

  let book = createAddressBook(
    "CardDAV Book",
    Ci.nsIAbManager.CARDDAV_DIRECTORY_TYPE
  );
  book.setIntValue("carddav.syncinterval", 0);
  book.setStringValue("carddav.url", CardDAVServer.url);
  book.setStringValue("carddav.username", "bob");

  let loginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(
    Ci.nsILoginInfo
  );
  loginInfo.init(CardDAVServer.origin, null, "test", "bob", "bob", "", "");
  Services.logins.addLogin(loginInfo);

  // Create a new contact. We'll add a photo to this contact.

  // This notification fires when we retrieve the saved card from the server,
  // which happens before subtest_add_photo finishes.
  let updatedPromise = TestUtils.topicObserved("addrbook-contact-updated");
  let card1 = await subtest_add_photo(book);
  Assert.equal(
    card1.getProperty("PhotoName", "RIGHT"),
    "RIGHT",
    "PhotoName property not saved on card"
  );

  // Check the card we sent.
  let photoProp = card1.vCardProperties.getFirstEntry("photo");
  Assert.ok(card1.vCardProperties.designSet === ICAL.design.vcard);
  Assert.ok(photoProp);
  Assert.equal(photoProp.params.encoding, undefined);
  Assert.equal(photoProp.type, "uri");
  Assert.ok(photoProp.value.startsWith("data:image/jpeg;base64,/9j/"));

  // Check the card we received from the server.
  let [card2] = await updatedPromise;
  photoProp = card2.vCardProperties.getFirstEntry("photo");
  Assert.ok(card2.vCardProperties.designSet === ICAL.design.vcard);
  Assert.ok(photoProp);
  Assert.equal(photoProp.params.encoding, undefined);
  Assert.equal(photoProp.type, "uri");
  Assert.ok(photoProp.value.startsWith("data:image/jpeg;base64,/9j/"));

  // Check the card on the server.
  Assert.equal(CardDAVServer.cards.size, 1);
  let [serverCard] = [...CardDAVServer.cards.values()];
  Assert.ok(
    serverCard.vCard.includes("\nPHOTO:data:image/jpeg;base64\\,/9j/"),
    "photo included in card on server"
  );

  // Discard the photo.

  let card3 = await subtest_discard_photo(book, src =>
    src.startsWith("data:image/jpeg;base64,/9j/")
  );

  // Check the card we sent.
  Assert.equal(card3.vCardProperties.getFirstEntry("photo"), null);

  // This notification is the second of two, and fires when we retrieve the
  // saved card from the server, which doesn't happen before
  // subtest_discard_photo finishes.
  let [card4] = await TestUtils.topicObserved("addrbook-contact-updated");
  Assert.equal(card4.vCardProperties.getFirstEntry("photo"), null);

  // Check the card on the server.
  Assert.equal(CardDAVServer.cards.size, 1);
  [serverCard] = [...CardDAVServer.cards.values()];
  console.log(serverCard.vCard);
  Assert.ok(
    !serverCard.vCard.includes("PHOTO:"),
    "photo removed from card on server"
  );

  await promiseDirectoryRemoved(book.URI);
  CardDAVServer.close();
  CardDAVServer.reset();
});
