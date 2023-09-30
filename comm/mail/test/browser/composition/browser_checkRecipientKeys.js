/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { plan_for_new_window } = ChromeUtils.import(
  "resource://testing-common/mozmill/WindowHelpers.jsm"
);
var {
  close_compose_window,
  open_compose_new_mail,
  setup_msg_contents,
  wait_for_compose_window,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
var { be_in_folder } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { OpenPGPTestUtils } = ChromeUtils.import(
  "resource://testing-common/mozmill/OpenPGPTestUtils.jsm"
);

add_setup(() => {
  Services.prefs.setBoolPref("mail.smime.remind_encryption_possible", true);
  Services.prefs.setBoolPref("mail.openpgp.remind_encryption_possible", true);
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("mail.smime.remind_encryption_possible");
  Services.prefs.clearUserPref("mail.openpgp.remind_encryption_possible");
});

/**
 * Test that checkEncryptionState should not affect gMsgCompose.compFields.
 */
add_task(async function test_checkEncryptionState() {
  let [id] = await OpenPGPTestUtils.importPrivateKey(
    window,
    new FileUtils.File(
      getTestFilePath(
        "../openpgp/data/keys/bob@openpgp.example-0xfbfcc82a015e7330-secret.asc"
      )
    )
  );

  // Set up the identity to cover the remindOpenPGP/remindSMime branches in
  // checkEncryptionState.
  let identity = MailServices.accounts.createIdentity();
  identity.email = "test@local";
  identity.setUnicharAttribute("encryption_cert_name", "smime-cert");
  identity.setUnicharAttribute("openpgp_key_id", id.split("0x").join(""));
  let account = MailServices.accounts.createAccount();
  account.addIdentity(identity);
  account.incomingServer = MailServices.accounts.createIncomingServer(
    "test",
    "openpgp.example",
    "imap"
  );
  await be_in_folder(account.incomingServer.rootFolder);
  registerCleanupFunction(() => {
    MailServices.accounts.removeAccount(account, true);
  });

  // Set up the compose fields used to init the compose window.
  let fields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  fields.to = "to@local";
  fields.cc = "cc1@local,cc2@local";
  fields.bcc = "bcc1@local,bcc2@local";
  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.identity = identity;
  params.composeFields = fields;

  // Open a compose window.
  plan_for_new_window("msgcompose");
  MailServices.compose.OpenComposeWindowWithParams(null, params);
  let cwc = wait_for_compose_window();

  // Test gMsgCompose.compFields is intact.
  let compFields = cwc.window.gMsgCompose.compFields;
  Assert.equal(compFields.to, "to@local");
  Assert.equal(compFields.cc, "cc1@local, cc2@local");
  Assert.equal(compFields.bcc, "bcc1@local, bcc2@local");

  close_compose_window(cwc);
});
