/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for the notification displayed when Bcc recipients are used while
 * encryption is enabled.
 */

"use strict";

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var { OpenPGPTestUtils } = ChromeUtils.import(
  "resource://testing-common/mozmill/OpenPGPTestUtils.jsm"
);
var { be_in_folder } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { close_compose_window, open_compose_new_mail, setup_msg_contents } =
  ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
var { close_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);

let bobAcct;

async function waitCheckEncryptionStateDone(win) {
  return BrowserTestUtils.waitForEvent(
    win.document,
    "encryption-state-checked"
  );
}

/**
 * Setup an account with OpenPGP for testing.
 */
add_setup(async function () {
  bobAcct = MailServices.accounts.createAccount();
  bobAcct.incomingServer = MailServices.accounts.createIncomingServer(
    "bob",
    "openpgp.example",
    "imap"
  );

  let bobIdentity = MailServices.accounts.createIdentity();
  bobIdentity.email = "bob@openpgp.example";
  bobAcct.addIdentity(bobIdentity);

  let [id] = await OpenPGPTestUtils.importPrivateKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../openpgp/data/keys/bob@openpgp.example-0xfbfcc82a015e7330-secret.asc"
      )
    )
  );

  Assert.ok(id, "private key id received");
  bobIdentity.setUnicharAttribute("openpgp_key_id", id.split("0x").join(""));

  registerCleanupFunction(() => {
    MailServices.accounts.removeIncomingServer(bobAcct.incomingServer, true);
    MailServices.accounts.removeAccount(bobAcct, true);
  });
});

/**
 * Test the warning is shown when encryption is enabled.
 */
add_task(async function testWarningShowsWhenEncryptionEnabled() {
  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();

  Assert.ok(!cwc.window.gSendEncrypted);

  // This toggle will trigger checkEncryptionState(), request that
  // an event will be sent after the next call to checkEncryptionState
  // has completed.
  let checkDonePromise = waitCheckEncryptionStateDone(cwc.window);
  await OpenPGPTestUtils.toggleMessageEncryption(cwc.window);
  await checkDonePromise;

  Assert.ok(cwc.window.gSendEncrypted);
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_bccShowAddressRowButton"),
    {},
    cwc.window
  );

  // setup_msg_contents will trigger checkEncryptionState.
  checkDonePromise = waitCheckEncryptionStateDone(cwc.window);
  setup_msg_contents(
    cwc,
    "test@example.org",
    "Encryption Enabled ",
    "",
    "bccAddrInput"
  );
  await checkDonePromise;

  // Warning should show when encryption enabled
  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnEncryptedBccRecipients"
      ),
    "Timeout waiting for warnEncryptedBccRecipients notification"
  );

  close_compose_window(cwc);
});

/**
 * Test dismissing the warning works.
 */
add_task(async function testNotificationDismissal() {
  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();

  Assert.ok(!cwc.window.gSendEncrypted);

  // This toggle will trigger checkEncryptionState(), request that
  // an event will be sent after the next call to checkEncryptionState
  // has completed.
  let checkDonePromise = waitCheckEncryptionStateDone(cwc.window);
  await OpenPGPTestUtils.toggleMessageEncryption(cwc.window);
  await checkDonePromise;

  Assert.ok(cwc.window.gSendEncrypted);
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_bccShowAddressRowButton"),
    {},
    cwc.window
  );

  // setup_msg_contents will trigger checkEncryptionState.
  checkDonePromise = waitCheckEncryptionStateDone(cwc.window);
  setup_msg_contents(
    cwc,
    "test@example.org",
    "Warning Dismissal",
    "",
    "bccAddrInput"
  );
  await checkDonePromise;

  // Warning should show when encryption enabled
  await BrowserTestUtils.waitForCondition(
    () =>
      cwc.window.gComposeNotification.getNotificationWithValue(
        "warnEncryptedBccRecipients"
      ),
    "Timeout waiting for warnEncryptedBccRecipients notification"
  );

  let notificationHidden = BrowserTestUtils.waitForCondition(
    () =>
      !cwc.window.gComposeNotification.getNotificationWithValue(
        "warnEncryptedBccRecipients"
      ),
    "notification was not removed in time"
  );

  let notification = cwc.window.gComposeNotification.getNotificationWithValue(
    "warnEncryptedBccRecipients"
  );
  EventUtils.synthesizeMouseAtCenter(
    notification.buttonContainer.lastElementChild,
    {},
    cwc.window
  );
  await notificationHidden;

  Assert.ok(
    !cwc.window.gComposeNotification.getNotificationWithValue(
      "warnEncryptedBccRecipients"
    ),
    "notification should be removed"
  );

  // setup_msg_contents will trigger checkEncryptionState.
  checkDonePromise = waitCheckEncryptionStateDone(cwc.window);
  setup_msg_contents(cwc, "test2@example.org", "", "", "bccAddrInput");
  await checkDonePromise;

  // Give the notification some time to incorrectly appear.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  Assert.ok(
    !cwc.window.gComposeNotification.getNotificationWithValue(
      "warnEncryptedBccRecipients"
    ),
    "notification should not reappear after dismissal"
  );

  close_compose_window(cwc);
});

/**
 * Test the warning does not show when encryption is not enabled.
 */
add_task(async function testNoWarningWhenEncryptionDisabled() {
  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();

  Assert.ok(!window.gSendEncrypted);
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_bccShowAddressRowButton"),
    {},
    cwc.window
  );

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(cwc.window);
  setup_msg_contents(
    cwc,
    "test@example.org",
    "No Warning ",
    "",
    "bccAddrInput"
  );
  await checkDonePromise;

  // Give the notification some time to incorrectly appear.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  Assert.ok(
    !cwc.window.gComposeNotification.getNotificationWithValue(
      "warnEncryptedBccRecipients"
    ),
    "warning should not show when encryption disabled"
  );

  close_compose_window(cwc);
});

/**
 * Test the warning does not show when the Bcc recipient is the sender.
 */
add_task(async function testNoWarningWhenBccRecipientIsSender() {
  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();

  Assert.ok(!window.gSendEncrypted);
  EventUtils.synthesizeMouseAtCenter(
    cwc.window.document.getElementById("addr_bccShowAddressRowButton"),
    {},
    cwc.window
  );

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(cwc.window);
  setup_msg_contents(
    cwc,
    "bob@openpgp.example",
    "Bcc Self",
    "",
    "bccAddrInput"
  );
  await checkDonePromise;

  // Give the notification some time to incorrectly appear.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  Assert.ok(
    !cwc.window.gComposeNotification.getNotificationWithValue(
      "warnEncryptedBccRecipients"
    ),
    "warning should not show when Bcc recipient is the sender"
  );

  close_compose_window(cwc);
});
