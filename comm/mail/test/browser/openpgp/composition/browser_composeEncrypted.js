/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for OpenPGP encrypted message composition.
 */

"use strict";

const {
  open_message_from_file,
  be_in_folder,
  get_about_message,
  get_special_folder,
  press_delete,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
const {
  close_compose_window,
  open_compose_new_mail,
  open_compose_with_reply,
  save_compose_message,
  setup_msg_contents,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
const { close_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);
const { OpenPGPTestUtils } = ChromeUtils.import(
  "resource://testing-common/mozmill/OpenPGPTestUtils.jsm"
);

const { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

let bobAcct;
let bobIdentity;
let gOutbox;
let gDrafts;

let aboutMessage = get_about_message();

// Used in some of the tests to verify key status display.
let l10n = new Localization(["messenger/openpgp/composeKeyStatus.ftl"]);

function waitForComposeWindow() {
  return BrowserTestUtils.domWindowOpened(null, async win => {
    await BrowserTestUtils.waitForEvent(win, "load");
    await BrowserTestUtils.waitForEvent(win, "focus", true);
    return (
      win.document.documentURI ===
      "chrome://messenger/content/messengercompose/messengercompose.xhtml"
    );
  });
}

/**
 * Closes a window with a <dialog> element by calling the acceptDialog().
 *
 * @param {Window} win
 */
async function closeDialog(win) {
  let closed = BrowserTestUtils.domWindowClosed(win);
  win.document.documentElement.querySelector("dialog").acceptDialog();
  await closed;
}

function setAutoPrefs(autoEnable, autoDisable, notifyOnDisable) {
  Services.prefs.setBoolPref("mail.e2ee.auto_enable", autoEnable);
  Services.prefs.setBoolPref("mail.e2ee.auto_disable", autoDisable);
  Services.prefs.setBoolPref(
    "mail.e2ee.notify_on_auto_disable",
    notifyOnDisable
  );
}

function clearAutoPrefs() {
  Services.prefs.clearUserPref("mail.e2ee.auto_enable");
  Services.prefs.clearUserPref("mail.e2ee.auto_disable");
  Services.prefs.clearUserPref("mail.e2ee.notify_on_auto_disable");
}

async function waitCheckEncryptionStateDone(win) {
  return BrowserTestUtils.waitForEvent(
    win.document,
    "encryption-state-checked"
  );
}

/**
 * Setup a mail account with a private key and import the public key for the
 * receiver.
 */
add_setup(async function () {
  // Encryption makes the compose process a little longer.
  requestLongerTimeout(5);

  bobAcct = MailServices.accounts.createAccount();
  bobAcct.incomingServer = MailServices.accounts.createIncomingServer(
    "bob",
    "openpgp.example",
    "imap"
  );
  bobIdentity = MailServices.accounts.createIdentity();
  bobIdentity.email = "bob@openpgp.example";
  bobAcct.addIdentity(bobIdentity);

  let [id] = await OpenPGPTestUtils.importPrivateKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../data/keys/bob@openpgp.example-0xfbfcc82a015e7330-secret.asc"
      )
    )
  );

  Assert.ok(id, "private key id received");
  bobIdentity.setUnicharAttribute("openpgp_key_id", id.split("0x").join(""));

  await OpenPGPTestUtils.importPublicKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../data/keys/alice@openpgp.example-0xf231550c4f47e38e-pub.asc"
      )
    )
  );

  gOutbox = await get_special_folder(Ci.nsMsgFolderFlags.Queue);
  gDrafts = await get_special_folder(Ci.nsMsgFolderFlags.Drafts, true);
});

/**
 * Tests composition of an encrypted only message shows as encrypted in
 * the Outbox.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedMessageComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();
  let composeWin = cwc.window;

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(
    cwc,
    "alice@openpgp.example",
    "Compose Encrypted Message",
    "This is an encrypted message with key composition test."
  );
  await checkDonePromise;

  if (!autoEnable) {
    // This toggle will trigger checkEncryptionState(), request that
    // an event will be sent after the next call to checkEncryptionState
    // has completed.
    checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
    await checkDonePromise;
  }

  Assert.ok(composeWin.gSendEncrypted, "message encryption should be on");
  Assert.ok(composeWin.gSendSigned, "message signing should be on");
  await OpenPGPTestUtils.toggleMessageSigning(composeWin);

  Assert.ok(
    !composeWin.gSendSigned,
    "toggling message signing should have completed already"
  );

  await sendMessage(composeWin);

  await be_in_folder(gOutbox);
  select_click_row(0);

  await TestUtils.waitForCondition(
    () => OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "message should have encrypted icon"
  );

  Assert.equal(
    aboutMessage.document.querySelector("#attachmentList").itemChildren.length,
    0,
    "no keys should be attached to message"
  );

  Assert.ok(
    OpenPGPTestUtils.hasNoSignedIconState(aboutMessage.document),
    "message should have no signed icon"
  );

  // Delete the message so other tests work.
  EventUtils.synthesizeKey("VK_DELETE");
}

add_task(async function testEncryptedMessageCompositionAutoEncOff() {
  await testEncryptedMessageComposition(false, false, false);
});

add_task(async function testEncryptedMessageCompositionAutoEncOnAutoDisOff() {
  await testEncryptedMessageComposition(true, false, false);
});

add_task(async function testEncryptedMessageCompositionAutoEncOnAutoDisOn() {
  await testEncryptedMessageComposition(true, true, false);
});

/**
 * Tests composition of an encrypted only message, with public key attachment
 * enabled, shows as encrypted in the Outbox.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedMessageWithKeyComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();
  let composeWin = cwc.window;

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(
    cwc,
    "alice@openpgp.example",
    "Compose Encrypted Message With Key",
    "This is an encrypted message with key composition test."
  );
  await checkDonePromise;

  if (!autoEnable) {
    // This toggle will trigger checkEncryptionState(), request that
    // an event will be sent after the next call to checkEncryptionState
    // has completed.
    checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
    await checkDonePromise;
  }

  await OpenPGPTestUtils.toggleMessageSigning(composeWin);
  await OpenPGPTestUtils.toggleMessageKeyAttachment(composeWin);
  await sendMessage(composeWin);

  await be_in_folder(gOutbox);
  select_click_row(0);

  await TestUtils.waitForCondition(
    () => OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "message should have encrypted icon"
  );

  let attachmentList = aboutMessage.document.querySelector("#attachmentList");

  await TestUtils.waitForCondition(
    () => attachmentList.itemChildren.length == 1,
    "message should have one attachment"
  );

  Assert.ok(
    attachmentList
      .getItemAtIndex(0)
      .attachment.name.includes(OpenPGPTestUtils.BOB_KEY_ID),
    "attachment name should contain Bob's key id"
  );

  Assert.ok(
    OpenPGPTestUtils.hasNoSignedIconState(aboutMessage.document),
    "message should have no signed icon"
  );

  // Delete the message so other tests work.
  EventUtils.synthesizeKey("VK_DELETE");
}

add_task(async function testEncryptedMessageWithKeyCompositionAutoEncOff() {
  await testEncryptedMessageWithKeyComposition(false, false, false);
});

add_task(
  async function testEncryptedMessageWithKeyCompositionAutoEncOnAutoDisOff() {
    await testEncryptedMessageWithKeyComposition(true, false, false);
  }
);

add_task(
  async function testEncryptedMessageWithKeyCompositionAutoEncOnAutoDisOn() {
    await testEncryptedMessageWithKeyComposition(true, true, false);
  }
);

/**
 * Tests composition of an encrypted message to a recipient, whom we have no
 * key for, prompts the user.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedRecipientKeyNotAvailabeMessageComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();
  let composeWin = cwc.window;

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(
    cwc,
    "carol@example.com",
    "Compose Encrypted Recipient Key Not Available Message",
    "This is an encrypted recipient key not available message composition test."
  );
  await checkDonePromise;

  // This toggle will trigger checkEncryptionState(), request that
  // an event will be sent after the next call to checkEncryptionState
  // has completed.
  checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
  await checkDonePromise;

  let kaShown = BrowserTestUtils.waitForCondition(
    () => composeWin.document.getElementById("keyAssistant").open,
    "Timeout waiting for the #keyAssistant to be visible"
  );

  composeWin.goDoCommand("cmd_sendLater");
  await kaShown;

  await BrowserTestUtils.closeWindow(composeWin);
}

add_task(
  async function testEncryptedRecipientKeyNotAvailabeMessageCompositionAutoEncOff() {
    await testEncryptedRecipientKeyNotAvailabeMessageComposition(
      false,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedRecipientKeyNotAvailabeMessageCompositionAutoEncOnAutoDisOff() {
    await testEncryptedRecipientKeyNotAvailabeMessageComposition(
      true,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedRecipientKeyNotAvailabeMessageCompositionAutoEncOnAutoDisOn() {
    await testEncryptedRecipientKeyNotAvailabeMessageComposition(
      true,
      true,
      false
    );
  }
);

/**
 * Tests that we turn on encryption automatically for the first recipient
 * (key available), and that we turn off encryption automatically after
 * adding the second recipient (key not available).
 */
add_task(async function testEncryptedRecipientKeyNotAvailabeAutoDisable() {
  setAutoPrefs(true, true, false);

  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();
  let composeWin = cwc.window;

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(
    cwc,
    "alice@openpgp.example",
    "Compose Encrypted Recipient Key Not Available Message",
    "This is an encrypted recipient key not available message composition test."
  );
  await checkDonePromise;

  Assert.ok(composeWin.gSendEncrypted, "message encryption should be on");

  checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(cwc, " missing@openpgp.example ", "", "");
  await checkDonePromise;

  Assert.ok(!composeWin.gSendEncrypted, "message encryption should be off");

  await sendMessage(composeWin);
  await be_in_folder(gOutbox);
  select_click_row(0);

  await TestUtils.waitForCondition(
    () => OpenPGPTestUtils.hasNoEncryptedIconState(aboutMessage.document),
    "message should not have encrypted icon"
  );

  // Clean up so other tests work.
  EventUtils.synthesizeKey("VK_DELETE");
});

/**
 * Tests composition of an encrypted message to a recipient, whose key we have
 * not accepted, prompts the user.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedRecipientKeyNotAcceptedMessageComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await OpenPGPTestUtils.importPublicKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../data/keys/carol@example.com-0x3099ff1238852b9f-pub.asc"
      )
    ),
    OpenPGPTestUtils.ACCEPTANCE_UNDECIDED
  );

  for (let level of [
    OpenPGPTestUtils.ACCEPTANCE_UNDECIDED,
    OpenPGPTestUtils.ACCEPTANCE_REJECTED,
  ]) {
    info(`Testing with acceptance level: "${level}"...`);
    await OpenPGPTestUtils.updateKeyIdAcceptance(
      OpenPGPTestUtils.CAROL_KEY_ID,
      level
    );

    await be_in_folder(bobAcct.incomingServer.rootFolder);

    let cwc = open_compose_new_mail();
    let composeWin = cwc.window;

    // setup_msg_contents will trigger checkEncryptionState.
    let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    setup_msg_contents(
      cwc,
      "carol@example.com",
      "Compose Encrypted Recipient Key Not Accepted",
      "This is an encrypted recipient key not accepted message composition test."
    );
    await checkDonePromise;

    // This toggle will trigger checkEncryptionState(), request that
    // an event will be sent after the next call to checkEncryptionState
    // has completed.
    checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
    await checkDonePromise;

    let kaShown = BrowserTestUtils.waitForCondition(
      () => composeWin.document.getElementById("keyAssistant").open,
      "Timeout waiting for the #keyAssistant to be visible"
    );

    composeWin.goDoCommand("cmd_sendLater");
    await kaShown;

    await BrowserTestUtils.closeWindow(composeWin);
  }
  await OpenPGPTestUtils.removeKeyById(OpenPGPTestUtils.CAROL_KEY_ID);
}

add_task(
  async function testEncryptedRecipientKeyNotAcceptedMessageCompositionAutoEncOff() {
    await testEncryptedRecipientKeyNotAcceptedMessageComposition(
      false,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedRecipientKeyNotAcceptedMessageCompositionAutoEncOnAutoDisOff() {
    await testEncryptedRecipientKeyNotAcceptedMessageComposition(
      true,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedRecipientKeyNotAcceptedMessageCompositionAutoEncOnAutoDisOn() {
    await testEncryptedRecipientKeyNotAcceptedMessageComposition(
      true,
      true,
      false
    );
  }
);

/**
 * Tests composition of an encrypted message to a recipient, whose key we have
 * accepted (not verified), shows as encrypted in the Outbox.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedRecipientKeyUnverifiedMessageComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await OpenPGPTestUtils.importPublicKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../data/keys/carol@example.com-0x3099ff1238852b9f-pub.asc"
      )
    ),
    OpenPGPTestUtils.ACCEPTANCE_UNVERIFIED
  );

  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();
  let composeWin = cwc.window;

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(
    cwc,
    "carol@example.com",
    "Compose Encrypted Recipient Key Unverified Message",
    "This is an encrypted, recipient key unverified message test."
  );
  await checkDonePromise;

  if (!autoEnable) {
    // This toggle will trigger checkEncryptionState(), request that
    // an event will be sent after the next call to checkEncryptionState
    // has completed.
    checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
    await checkDonePromise;
  }

  await sendMessage(composeWin);

  await be_in_folder(gOutbox);
  select_click_row(0);

  await TestUtils.waitForCondition(
    () => OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "message should have encrypted icon"
  );

  // Clean up so other tests work.
  EventUtils.synthesizeKey("VK_DELETE");
  await OpenPGPTestUtils.removeKeyById(OpenPGPTestUtils.CAROL_KEY_ID);
}

add_task(
  async function testEncryptedRecipientKeyUnverifiedMessageCompositionAutoEncOff() {
    await testEncryptedRecipientKeyUnverifiedMessageComposition(
      false,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedRecipientKeyUnverifiedMessageCompositionAutoEncOnAutoDisOff() {
    await testEncryptedRecipientKeyUnverifiedMessageComposition(
      true,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedRecipientKeyUnverifiedMessageCompositionAutoEncOnAutoDisOn() {
    await testEncryptedRecipientKeyUnverifiedMessageComposition(
      true,
      true,
      false
    );
  }
);

/**
 * Tests composition of a message to multiple recipients among whom, one key
 * is missing, prompts the user.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedOneRecipientKeyNotAvailableMessageComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();
  let composeWin = cwc.window;

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(
    cwc,
    "alice@openpgp.example, carol@example.com",
    "Compose Encrypted One Recipient Key Not Available Message Composition",
    "This is an encrypted, one recipient key not available message test."
  );
  await checkDonePromise;

  // This toggle will trigger checkEncryptionState(), request that
  // an event will be sent after the next call to checkEncryptionState
  // has completed.
  checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
  await checkDonePromise;

  let kaShown = BrowserTestUtils.waitForCondition(
    () => composeWin.document.getElementById("keyAssistant").open,
    "Timeout waiting for the #keyAssistant to be visible"
  );

  composeWin.goDoCommand("cmd_sendLater");
  await kaShown;

  await BrowserTestUtils.closeWindow(composeWin);
}

add_task(
  async function testEncryptedOneRecipientKeyNotAvailableMessageCompositionAutoEncOff() {
    await testEncryptedOneRecipientKeyNotAvailableMessageComposition(
      false,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedOneRecipientKeyNotAvailableMessageCompositionAutoEncOnAutoDisOff() {
    await testEncryptedOneRecipientKeyNotAvailableMessageComposition(
      true,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedOneRecipientKeyNotAvailableMessageCompositionAutoEncOnAutoDisOn() {
    await testEncryptedOneRecipientKeyNotAvailableMessageComposition(
      true,
      true,
      false
    );
  }
);

/**
 * Tests composition of a message to multiple recipients among whom, one key
 * is not accepted, prompts the user.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedOneRecipientKeyNotAcceptedMessageComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await OpenPGPTestUtils.importPublicKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../data/keys/carol@example.com-0x3099ff1238852b9f-pub.asc"
      )
    ),
    OpenPGPTestUtils.ACCEPTANCE_UNDECIDED
  );

  for (let level of [
    OpenPGPTestUtils.ACCEPTANCE_UNDECIDED,
    OpenPGPTestUtils.ACCEPTANCE_REJECTED,
  ]) {
    info(`Testing with acceptance level: "${level}"...`);
    await OpenPGPTestUtils.updateKeyIdAcceptance(
      OpenPGPTestUtils.CAROL_KEY_ID,
      level
    );

    await be_in_folder(bobAcct.incomingServer.rootFolder);

    let cwc = open_compose_new_mail();
    let composeWin = cwc.window;

    // setup_msg_contents will trigger checkEncryptionState.
    let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    setup_msg_contents(
      cwc,
      "alice@openpgp.example, carol@example.com",
      "Compose Encrypted One Recipient Key Not Accepted Message Composition",
      "This is an encrypted, one recipient key not accepted message test."
    );
    await checkDonePromise;

    // This toggle will trigger checkEncryptionState(), request that
    // an event will be sent after the next call to checkEncryptionState
    // has completed.
    checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
    await checkDonePromise;

    let kaShown = BrowserTestUtils.waitForCondition(
      () => composeWin.document.getElementById("keyAssistant").open,
      "Timeout waiting for the #keyAssistant to be visible"
    );

    composeWin.goDoCommand("cmd_sendLater");
    await kaShown;

    await BrowserTestUtils.closeWindow(composeWin);
  }

  await OpenPGPTestUtils.removeKeyById(OpenPGPTestUtils.CAROL_KEY_ID);
}

add_task(
  async function testEncryptedOneRecipientKeyNotAcceptedMessageCompositionAutoEncOff() {
    await testEncryptedOneRecipientKeyNotAcceptedMessageComposition(
      false,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedOneRecipientKeyNotAcceptedMessageCompositionAutoEncOnAutoDisOff() {
    await testEncryptedOneRecipientKeyNotAcceptedMessageComposition(
      true,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedOneRecipientKeyNotAcceptedMessageCompositionAutoEncOnAutoDisOn() {
    await testEncryptedOneRecipientKeyNotAcceptedMessageComposition(
      true,
      true,
      false
    );
  }
);

/**
 * Tests composition of a message to multiple recipients among whom, one key
 * is not verified, shows as encrypted in the Outbox.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedOneRecipientKeyUnverifiedMessageComposition(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await OpenPGPTestUtils.importPublicKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../data/keys/carol@example.com-0x3099ff1238852b9f-pub.asc"
      )
    ),
    OpenPGPTestUtils.ACCEPTANCE_UNVERIFIED
  );

  await be_in_folder(bobAcct.incomingServer.rootFolder);

  let cwc = open_compose_new_mail();
  let composeWin = cwc.window;

  // setup_msg_contents will trigger checkEncryptionState.
  let checkDonePromise = waitCheckEncryptionStateDone(composeWin);
  setup_msg_contents(
    cwc,
    "alice@openpgp.example, carol@example.com",
    "Compose Encrypted One Recipient Key Unverified Message",
    "This is an encrypted, one recipient key unverified message test."
  );
  await checkDonePromise;

  if (!autoEnable) {
    // This toggle will trigger checkEncryptionState(), request that
    // an event will be sent after the next call to checkEncryptionState
    // has completed.
    checkDonePromise = waitCheckEncryptionStateDone(composeWin);
    await OpenPGPTestUtils.toggleMessageEncryption(composeWin);
    await checkDonePromise;
  }

  Assert.ok(composeWin.gSendEncrypted, "message encryption should be on");
  Assert.ok(composeWin.gSendSigned, "message signing should be on");

  await sendMessage(composeWin);

  await be_in_folder(gOutbox);
  select_click_row(0);

  await TestUtils.waitForCondition(
    () => OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "message should have encrypted icon"
  );

  // Clean up so other tests work.
  EventUtils.synthesizeKey("VK_DELETE");
  await OpenPGPTestUtils.removeKeyById(OpenPGPTestUtils.CAROL_KEY_ID);
}

add_task(
  async function testEncryptedOneRecipientKeyUnverifiedMessageCompositionAutoEncOff() {
    await testEncryptedOneRecipientKeyUnverifiedMessageComposition(
      false,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedOneRecipientKeyUnverifiedMessageCompositionAutoEncOnAutoDisOff() {
    await testEncryptedOneRecipientKeyUnverifiedMessageComposition(
      true,
      false,
      false
    );
  }
);

add_task(
  async function testEncryptedOneRecipientKeyUnverifiedMessageCompositionAutoEncOnAutoDisOn() {
    await testEncryptedOneRecipientKeyUnverifiedMessageComposition(
      true,
      true,
      false
    );
  }
);

/**
 * Tests composing a reply to an encrypted message is encrypted by default.
 *
 * @param {boolean} autoEnable - set pref mail.e2ee.auto_enable to this value
 * @param {boolean} autoDisable - set pref mail.e2ee.auto_disable to this value
 * @param {boolean} notifyOnDisable - set pref mail.e2ee.notify_on_auto_disable
 *   to this value
 */
async function testEncryptedMessageReplyIsEncrypted(
  autoEnable,
  autoDisable,
  notifyOnDisable
) {
  setAutoPrefs(autoEnable, autoDisable, notifyOnDisable);

  await be_in_folder(gDrafts);
  let mc = await open_message_from_file(
    new FileUtils.File(
      getTestFilePath(
        "../data/eml/signed-by-0xfbfcc82a015e7330-encrypted-to-0xf231550c4f47e38e.eml"
      )
    )
  );

  let cwc = open_compose_with_reply(mc);
  close_window(mc);

  let replyWindow = cwc.window;

  await save_compose_message(replyWindow);
  close_compose_window(cwc);

  await TestUtils.waitForCondition(
    () => gDrafts.getTotalMessages(true) > 0,
    "message should be saved to drafts folder"
  );

  await be_in_folder(gDrafts);
  select_click_row(0);

  await TestUtils.waitForCondition(
    () => OpenPGPTestUtils.hasEncryptedIconState(aboutMessage.document, "ok"),
    "message should have encrypted icon"
  );

  // Delete the outgoing message.
  press_delete();
}

add_task(
  async function testEncryptedMessageReplyIsEncryptedAutoEncOnAutoDisOff() {
    await testEncryptedMessageReplyIsEncrypted(true, false, false);
  }
);

add_task(
  async function testEncryptedMessageReplyIsEncryptedAutoEncOnAutoDisOn() {
    await testEncryptedMessageReplyIsEncrypted(true, true, false);
  }
);

registerCleanupFunction(function tearDown() {
  clearAutoPrefs();
  MailServices.accounts.removeIncomingServer(bobAcct.incomingServer, true);
  MailServices.accounts.removeAccount(bobAcct, true);
});
