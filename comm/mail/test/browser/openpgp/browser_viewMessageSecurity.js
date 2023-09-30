/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for the display of the Message Security popup panel, which displays
 * encryption information for both OpenPGP and S/MIME.
 */

"use strict";

const {
  create_encrypted_smime_message,
  add_message_to_folder,
  be_in_folder,
  get_about_message,
  get_special_folder,
  mc,
  select_click_row,
  press_delete,
  plan_for_message_display,
  wait_for_message_display_completion,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
const {
  get_notification_button,
  wait_for_notification_to_show,
  wait_for_notification_to_stop,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/NotificationBoxHelpers.jsm"
);
const { OpenPGPTestUtils } = ChromeUtils.import(
  "resource://testing-common/mozmill/OpenPGPTestUtils.jsm"
);
const { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);
const { SmimeUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/smimeUtils.jsm"
);

const { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

const MSG_TEXT = "Sundays are nothing without callaloo.";

function getMsgBodyTxt(mc) {
  let msgPane = get_about_message(mc.window).getMessagePaneBrowser();
  return msgPane.contentDocument.documentElement.textContent;
}

var aliceAcct;
var aliceIdentity;
var initialKeyIdPref = "";
var gInbox;

/**
 * Set up the base account, identity and keys needed for the tests.
 */
add_setup(async function () {
  SmimeUtils.ensureNSS();
  SmimeUtils.loadCertificateAndKey(
    new FileUtils.File(getTestFilePath("data/smime/Bob.p12")),
    "nss"
  );

  aliceAcct = MailServices.accounts.createAccount();
  aliceAcct.incomingServer = MailServices.accounts.createIncomingServer(
    "alice",
    "openpgp.example",
    "pop3"
  );
  aliceIdentity = MailServices.accounts.createIdentity();
  aliceIdentity.email = "alice@openpgp.example";
  aliceAcct.addIdentity(aliceIdentity);

  // Set up the alice's private key.
  let [id] = await OpenPGPTestUtils.importPrivateKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "data/keys/alice@openpgp.example-0xf231550c4f47e38e-secret.asc"
      )
    )
  );

  initialKeyIdPref = aliceIdentity.getUnicharAttribute("openpgp_key_id");
  aliceIdentity.setUnicharAttribute("openpgp_key_id", id);

  // Import and accept the public key for Bob, our verified sender.
  await OpenPGPTestUtils.importPublicKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "data/keys/bob@openpgp.example-0xfbfcc82a015e7330-pub.asc"
      )
    )
  );

  gInbox = await get_special_folder(Ci.nsMsgFolderFlags.Inbox, true);
  await be_in_folder(gInbox);
});

/**
 * Test that the encryption icons and the message security popup properly update
 * when selecting an S/MIME or OpenPGP message with different signature and
 * encryption states.
 */
add_task(async function testSmimeOpenPgpSelection() {
  let smimeFile = new FileUtils.File(
    getTestFilePath("data/smime/alice.env.eml")
  );
  // Fetch a local OpenPGP message.
  let openPgpFile = new FileUtils.File(
    getTestFilePath(
      "data/eml/signed-by-0xfbfcc82a015e7330-encrypted-to-0xf231550c4f47e38e.eml"
    )
  );

  // Add the fetched S/MIME message to the inbox folder.
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFileMessage(
    smimeFile,
    gInbox,
    null,
    false,
    0,
    "",
    copyListener,
    null
  );
  await copyListener.promise;

  // Add the fetched OpenPGP message to the inbox folder.
  copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFileMessage(
    openPgpFile,
    gInbox,
    null,
    false,
    0,
    "",
    copyListener,
    null
  );
  await copyListener.promise;

  // Select the second row, which should contain the S/MIME message.
  select_click_row(1);

  let aboutMessage = get_about_message();
  Assert.equal(
    aboutMessage.document
      .getElementById("encryptionTechBtn")
      .querySelector("span").textContent,
    "S/MIME"
  );
  Assert.ok(
    OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "S/MIME message should be decrypted"
  );

  let openpgpprocessed = BrowserTestUtils.waitForEvent(
    aboutMessage.document,
    "openpgpprocessed"
  );
  // Select the first row, which should contain the OpenPGP message.
  select_click_row(0);
  await openpgpprocessed;

  Assert.equal(
    aboutMessage.document
      .getElementById("encryptionTechBtn")
      .querySelector("span").textContent,
    "OpenPGP"
  );

  Assert.ok(getMsgBodyTxt(mc).includes(MSG_TEXT), "message text is in body");
  Assert.ok(
    OpenPGPTestUtils.hasSignedIconState(aboutMessage.document, "verified"),
    "signed verified icon is displayed"
  );
  Assert.ok(
    OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "encrypted icon is displayed"
  );

  // Delete the two generated messages.
  press_delete();
  select_click_row(0);
  press_delete();
});

/**
 * Test the notification and repairing of a message corrupted by MS-Exchange.
 */
add_task(async function testBrokenMSExchangeEncryption() {
  // Fetch a broken MS-Exchange encrypted message.
  let brokenFile = new FileUtils.File(
    getTestFilePath("data/eml/alice-broken-exchange.eml")
  );
  let notificationBox = "mail-notification-top";
  let notificationValue = "brokenExchange";

  // Add the broken OpenPGP message to the inbox folder.
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFileMessage(
    brokenFile,
    gInbox,
    null,
    false,
    0,
    "",
    copyListener,
    null
  );
  await copyListener.promise;

  // Select the first row, which should contain the OpenPGP message.
  select_click_row(0);

  // Assert the "corrupted by MS-Exchange" notification is visible.
  let aboutMessage = get_about_message();
  wait_for_notification_to_show(
    aboutMessage,
    notificationBox,
    notificationValue
  );

  // Click on the "repair" button.
  let repairButton = get_notification_button(
    aboutMessage,
    notificationBox,
    notificationValue,
    {
      popup: null,
    }
  );
  plan_for_message_display(mc);
  EventUtils.synthesizeMouseAtCenter(repairButton, {}, aboutMessage);

  // Wait for the "fixing in progress" notification to go away.
  wait_for_notification_to_stop(
    aboutMessage,
    notificationBox,
    "brokenExchangeProgress"
  );

  // The broken exchange repair process generates a new fixed message body and
  // then copies the new message in the same folder. Therefore, we need to wait
  // for the message to be automatically reloaded and reselected.
  wait_for_message_display_completion(mc, true);

  // Assert that the message was repaired and decrypted.
  await TestUtils.waitForCondition(
    () => OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "encrypted icon is displayed"
  );

  // Delete the message.
  press_delete();
}).skip(); // TODO

/**
 * Test the working keyboard shortcut event listener for the message header.
 * Ctrl+Alt+S for Windows and Linux, Control+Cmd+S for macOS.
 */
add_task(async function testMessageSecurityShortcut() {
  // Create an S/MIME message and add it to the inbox folder.
  await add_message_to_folder([gInbox], create_encrypted_smime_message());

  // Select the first row, which should contain the S/MIME message.
  select_click_row(0);

  let aboutMessage = get_about_message();
  Assert.equal(
    aboutMessage.document
      .getElementById("encryptionTechBtn")
      .querySelector("span").textContent,
    "S/MIME"
  );

  let modifiers =
    AppConstants.platform == "macosx"
      ? { accelKey: true, ctrlKey: true }
      : { accelKey: true, altKey: true };

  let popupshown = BrowserTestUtils.waitForEvent(
    aboutMessage.document.getElementById("messageSecurityPanel"),
    "popupshown"
  );

  EventUtils.synthesizeKey("s", modifiers, aboutMessage);

  // The Message Security popup panel should show up.
  await popupshown;

  // Select the row again since the focus moved to the popup panel.
  select_click_row(0);
  // Delete the message.
  press_delete();
}).skip(); // TODO

registerCleanupFunction(async function tearDown() {
  // Reset the OpenPGP key and delete the account.
  MailServices.accounts.removeAccount(aliceAcct, true);
  aliceAcct = null;

  await OpenPGPTestUtils.removeKeyById("0xf231550c4f47e38e", true);
});
