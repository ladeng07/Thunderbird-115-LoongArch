/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests the warning notification that appears when there are too many public
 * recipients.
 */

"use strict";
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var {
  close_compose_window,
  open_compose_new_mail,
  open_compose_with_reply_to_all,
  setup_msg_contents,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
var { close_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);
var {
  add_message_to_folder,
  assert_selected_and_displayed,
  be_in_folder,
  create_message,
  mc,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

let publicRecipientLimit = Services.prefs.getIntPref(
  "mail.compose.warn_public_recipients.threshold"
);

requestLongerTimeout(5);

/**
 * Test we only show one warning when "To" recipients goes over the limit
 * for a reply all.
 */
add_task(async function testWarningShowsOnceWhenToFieldOverLimit() {
  // Now set up an account with some identities.
  let acctMgr = MailServices.accounts;
  let account = acctMgr.createAccount();
  account.incomingServer = acctMgr.createIncomingServer(
    "nobody",
    "BCC Reply Testing",
    "pop3"
  );

  let folder = account.incomingServer.rootFolder
    .QueryInterface(Ci.nsIMsgLocalMailFolder)
    .createLocalSubfolder("Msgs4Reply");

  let identity = acctMgr.createIdentity();
  identity.email = "bcc@example.com";
  account.addIdentity(identity);

  registerCleanupFunction(() => {
    MailServices.accounts.removeAccount(account, true);
  });

  let i = 1;
  let msg0 = create_message({
    from: "Homer <homer@example.com>",
    to: "test@example.org,"
      .repeat(publicRecipientLimit + 100)
      .replace(/test@/g, () => `test${i++}@`),
    cc: "Lisa <lisa@example.com>",
    subject: "msg over the limit for bulk warning",
  });
  await add_message_to_folder([folder], msg0);

  await be_in_folder(folder);
  let msg = select_click_row(0);
  assert_selected_and_displayed(mc, msg);
  let cwc = open_compose_with_reply_to_all();

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warning shown when "To" recipients >= ${publicRecipientLimit}`
  );

  Assert.equal(
    1,
    cwc.window.document.querySelectorAll(
      `notification-message[value="warnPublicRecipientsNotification"]`
    ).length,
    "should have exactly one notification about it"
  );

  close_compose_window(cwc);
});

/**
 * Test the warning displays when the "To" recipients list hits the limit.
 */
add_task(async function testWarningShowsWhenToFieldHitsLimit() {
  let cwc = open_compose_new_mail();
  let i = 1;

  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing To Field",
    ""
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warning shown when "To" recipients >= ${publicRecipientLimit}`
  );

  close_compose_window(cwc);
});

/**
 * Test the warning displays when the "Cc" recipients list hits the limit.
 */
add_task(async function testWarningShowsWhenCcFieldHitLimit() {
  let cwc = open_compose_new_mail();

  // Click on the Cc recipient label.
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_ccShowAddressRowButton"),
    {},
    cwc.window
  );
  // The Cc field should now be visible.
  Assert.ok(
    !cwc.window.document
      .getElementById("ccAddrInput")
      .closest(".address-row")
      .classList.contains("hidden"),
    "The Cc field is visible"
  );

  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing Cc Field",
    "",
    "ccAddrInput"
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warning shown when "Cc" recipients >= ${publicRecipientLimit}`
  );

  close_compose_window(cwc);
});

/**
 * Test the warning displays when both the "To" and "Cc" recipients lists
 * combined hit the limit.
 */
add_task(async function testWarningShowsWhenToAndCcFieldHitLimit() {
  let cwc = open_compose_new_mail();

  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit - 1)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing To and Cc Fields",
    ""
  );

  // Click on the Cc recipient label.
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_ccShowAddressRowButton"),
    {},
    cwc.window
  );
  // The Cc field should now be visible.
  Assert.ok(
    !cwc.window.document
      .getElementById("ccAddrInput")
      .closest(".address-row")
      .classList.contains("hidden"),
    "The Cc field is visible"
  );

  setup_msg_contents(cwc, "test@example.org", "", "", "ccAddrInput");

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warning shown "To" and "Cc" recipients >= ${publicRecipientLimit}`
  );

  close_compose_window(cwc);
});

/**
 * Test the "To" recipients are moved to the "Bcc" field when the user selects
 * that option.
 */
add_task(async function testToRecipientsMovedToBcc() {
  let cwc = open_compose_new_mail();
  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing move to Bcc",
    ""
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    "public recipients warning was not removed in time"
  );
  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  EventUtils.synthesizeMouseAtCenter(
    notification.buttonContainer.firstElementChild,
    {},
    cwc.window
  );

  Assert.equal(
    cwc.window.document.querySelectorAll(
      "#bccAddrContainer > mail-address-pill"
    ).length,
    publicRecipientLimit,
    "Bcc field populated with addresses"
  );

  Assert.equal(
    cwc.window.document.querySelectorAll("#toAddrContainer > mail-address-pill")
      .length,
    0,
    "addresses removed from the To field"
  );

  await notificationHidden;

  close_compose_window(cwc);
});

/**
 * Test that all the "To" recipients are moved to the "Bcc" field when the
 * address count is over the limit.
 */
add_task(async function testAllToRecipientsMovedToBccWhenOverLimit() {
  let cwc = open_compose_new_mail();
  let limit = publicRecipientLimit + 1;
  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,".repeat(limit).replace(/test@/g, () => `test${i++}@`),
    "Testing move to Bcc",
    ""
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    "public recipients warning was not removed in time"
  );

  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  EventUtils.synthesizeMouseAtCenter(
    notification.buttonContainer.firstElementChild,
    {},
    cwc.window
  );

  Assert.equal(
    cwc.window.document.querySelectorAll(
      "#bccAddrContainer > mail-address-pill"
    ).length,
    limit,
    "Bcc field populated with addresses"
  );

  Assert.equal(
    cwc.window.document.querySelectorAll("#toAddrContainer > mail-address-pill")
      .length,
    0,
    "addresses removed from the To field"
  );

  await notificationHidden;

  close_compose_window(cwc);
});

/**
 * Test the "Cc" recipients are moved to the "Bcc" field when the user selects
 * that option.
 */
add_task(async function testCcRecipientsMovedToBcc() {
  let cwc = open_compose_new_mail();

  // Click on the Cc recipient label.
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_ccShowAddressRowButton"),
    {},
    cwc.window
  );
  // The Cc field should now be visible.
  Assert.ok(
    !cwc.window.document
      .getElementById("ccAddrInput")
      .closest(".address-row")
      .classList.contains("hidden"),
    "The Cc field is visible"
  );

  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing move to Bcc",
    ""
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    "public recipients warning was not removed in time"
  );

  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  EventUtils.synthesizeMouseAtCenter(
    notification.buttonContainer.firstElementChild,
    {},
    cwc.window
  );

  Assert.equal(
    cwc.window.document.querySelectorAll(
      "#bccAddrContainer > mail-address-pill"
    ).length,
    publicRecipientLimit,
    "Bcc field populated with addresses"
  );

  Assert.equal(
    cwc.window.document.querySelectorAll("#ccAddrContainer > mail-address-pill")
      .length,
    0,
    "addresses removed from the Cc field"
  );

  await notificationHidden;

  close_compose_window(cwc);
});

/**
 * Test that all the "Cc" recipients are moved to the "Bcc" field when the
 * address count is over the limit.
 */
add_task(async function testAllCcRecipientsMovedToBccWhenOverLimit() {
  let cwc = open_compose_new_mail();
  let limit = publicRecipientLimit + 1;

  // Click on the Cc recipient label.
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_ccShowAddressRowButton"),
    {},
    cwc.window
  );
  // The Cc field should now be visible.
  Assert.ok(
    !cwc.window.document
      .getElementById("ccAddrInput")
      .closest(".address-row")
      .classList.contains("hidden"),
    "The Cc field is visible"
  );

  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,".repeat(limit).replace(/test@/g, () => `test${i++}@`),
    "Testing move to Bcc",
    ""
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    "public recipients warning was not removed in time"
  );
  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  EventUtils.synthesizeMouseAtCenter(
    notification.buttonContainer.firstElementChild,
    {},
    cwc.window
  );

  Assert.equal(
    cwc.window.document.querySelectorAll(
      "#bccAddrContainer > mail-address-pill"
    ).length,
    limit,
    "Bcc field populated with addresses"
  );

  Assert.equal(
    cwc.window.document.querySelectorAll("#ccAddrContainer > mail-address-pill")
      .length,
    0,
    "addresses removed from the Cc field"
  );

  await notificationHidden;

  close_compose_window(cwc);
});

/**
 * Test that both the "To" and "Cc" recipients are moved to the "Bcc" field when
 * the user selects that option.
 */
add_task(async function testToAndCcRecipientsMovedToBcc() {
  let cwc = open_compose_new_mail();
  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit - 1)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing move to Bcc",
    ""
  );

  // Click on the Cc recipient label.
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_ccShowAddressRowButton"),
    {},
    cwc.window
  );
  // The Cc field should now be visible.
  Assert.ok(
    !cwc.window.document
      .getElementById("ccAddrInput")
      .closest(".address-row")
      .classList.contains("hidden"),
    "The Cc field is visible"
  );
  setup_msg_contents(cwc, "test@example.org", "", "");

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    "public recipients warning was not removed in time"
  );

  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  EventUtils.synthesizeMouseAtCenter(
    notification.buttonContainer.firstElementChild,
    {},
    cwc.window
  );

  Assert.equal(
    cwc.window.document.querySelectorAll(
      "#bccAddrContainer > mail-address-pill"
    ).length,
    publicRecipientLimit,
    "Bcc field populated with addresses"
  );

  Assert.equal(
    cwc.window.document.querySelectorAll("#toAddrContainer > mail-address-pill")
      .length,
    0,
    "addresses removed from the To field"
  );

  Assert.equal(
    cwc.window.document.querySelectorAll("#ccAddrContainer > mail-address-pill")
      .length,
    0,
    "addresses removed from the Cc field"
  );

  await notificationHidden;

  close_compose_window(cwc);
});

/**
 * Test the warning is removed when the user chooses to "Keep Recipients Public".
 */
add_task(async function testWarningRemovedWhenKeepPublic() {
  let cwc = open_compose_new_mail();
  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing dismissal",
    ""
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    "public recipients warning was not removed in time"
  );
  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  EventUtils.synthesizeMouseAtCenter(
    notification.buttonContainer.lastElementChild,
    {},
    cwc.window
  );

  await notificationHidden;

  Assert.equal(
    cwc.window.document.querySelectorAll("#toAddrContainer > mail-address-pill")
      .length,
    publicRecipientLimit,
    "addresses were not removed from the field"
  );

  Assert.equal(
    cwc.window.document.querySelectorAll(
      "#bccAddrContainer > mail-address-pill"
    ).length,
    0,
    "no addresses added to the Bcc field"
  );

  close_compose_window(cwc);
});

/**
 * Test that the warning is not shown again if the user dismisses it.
 */
add_task(async function testWarningNotShownAfterDismissal() {
  let cwc = open_compose_new_mail();
  let i = 1;
  setup_msg_contents(
    cwc,
    "test@example.org,"
      .repeat(publicRecipientLimit)
      .replace(/test@/g, () => `test${i++}@`),
    "Testing dismissal",
    ""
  );

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    "public recipients warning was not removed in time"
  );
  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  EventUtils.synthesizeMouseAtCenter(notification.closeButton, {}, cwc.window);

  await notificationHidden;

  let input = cwc.window.document.getElementById("toAddrInput");
  input.focus();

  let recipString = "test@example.org,"
    .repeat(publicRecipientLimit)
    .replace(/test@/g, () => `test${i++}@`);
  EventUtils.sendString(recipString, cwc.window);

  // Wait a little in case the notification bar mistakenly appears.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  Assert.ok(
    !cwc.window.gComposeNotification.getNotificationWithValue(
      "warnPublicRecipientsNotification"
    ),
    "public recipients warning did not appear after dismissal"
  );
  close_compose_window(cwc);
});

/**
 * Tests that the individual addresses of a mailing list are considered.
 */
add_task(async function testMailingListMembersCounted() {
  let book = MailServices.ab.getDirectoryFromId(
    MailServices.ab.newAddressBook("Mochitest", null, 101)
  );
  let list = Cc["@mozilla.org/addressbook/directoryproperty;1"].createInstance(
    Ci.nsIAbDirectory
  );
  list.isMailList = true;
  list.dirName = "Test List";
  list = book.addMailList(list);

  for (let i = 0; i < publicRecipientLimit; i++) {
    let card = Cc["@mozilla.org/addressbook/cardproperty;1"].createInstance(
      Ci.nsIAbCard
    );
    card.primaryEmail = `test${i}@example`;
    list.addCard(card);
  }
  list.editMailListToDatabase(null);

  let cwc = open_compose_new_mail();
  setup_msg_contents(cwc, "Test List", "Testing mailing lists", "");

  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnPublicRecipientsNotification"
      ),
    `Timeout waiting for warnPublicRecipientsNotification`
  );

  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnPublicRecipientsNotification"
  );
  Assert.equal(
    notification.messageText.textContent,
    `The ${publicRecipientLimit} recipients in To and Cc will see each other’s address. You can avoid disclosing recipients by using Bcc instead.`,
    "total count equals all addresses plus list expanded"
  );

  MailServices.ab.deleteAddressBook(book.URI);
  close_compose_window(cwc);
});
