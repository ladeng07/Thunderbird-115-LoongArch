/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test that when bcc field is set, bcc header should not exist in the sent
 * mail, but should exist in the mail copy (e.g. Sent folder).
 */

var { PromiseUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PromiseUtils.sys.mjs"
);
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var gServer;
var gSentFolder;

function cleanUpSent() {
  let messages = [...gSentFolder.msgDatabase.enumerateMessages()];
  if (messages.length) {
    gSentFolder.deleteMessages(messages, null, true, false, null, false);
  }
}

/**
 * Load local mail account and start fake SMTP server.
 */
add_setup(async function setup() {
  localAccountUtils.loadLocalMailAccount();
  gServer = setupServerDaemon();
  gServer.start();
  registerCleanupFunction(() => {
    gServer.stop();
  });
  gSentFolder = localAccountUtils.rootFolder.createLocalSubfolder("Sent");
});

/**
 * Send a msg with bcc field set, then check the sent mail doesn't contain bcc
 * header, but the mail saved to the Sent folder contains bcc header.
 */
add_task(async function testBcc() {
  gServer.resetTest();
  let identity = getSmtpIdentity(
    "from@tinderbox.invalid",
    getBasicSmtpServer(gServer.port)
  );

  // Prepare the comp fields, including the bcc field.
  let fields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  fields.to = "Nobody <to@tinderbox.invalid>";
  fields.subject = "Test bcc";
  fields.bcc = "bcc@tinderbox.invalid";
  fields.body = "A\r\nBcc: \r\n mail body\r\n.";

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = fields;

  // Send the mail.
  let msgCompose = MailServices.compose.initCompose(params);
  msgCompose.type = Ci.nsIMsgCompType.New;
  let progress = Cc["@mozilla.org/messenger/progress;1"].createInstance(
    Ci.nsIMsgProgress
  );
  let promise = new Promise((resolve, reject) => {
    progressListener.resolve = resolve;
    progressListener.reject = reject;
  });
  progress.registerListener(progressListener);
  msgCompose.sendMsg(
    Ci.nsIMsgSend.nsMsgDeliverNow,
    identity,
    "",
    null,
    progress
  );
  await promise;

  let expectedBody = `\r\n\r\n${fields.body}`;
  // Should not contain extra \r\n between head and body.
  let notExpectedBody = `\r\n\r\n\r\n${fields.body}`;

  Assert.ok(gServer._daemon.post.includes("Subject: Test bcc"));
  // Check that bcc header doesn't exist in the sent mail.
  Assert.ok(!gServer._daemon.post.includes("Bcc: bcc@tinderbox.invalid"));
  Assert.ok(gServer._daemon.post.includes(expectedBody));
  Assert.ok(!gServer._daemon.post.includes(notExpectedBody));

  let msgData = mailTestUtils.loadMessageToString(
    gSentFolder,
    mailTestUtils.getMsgHdrN(gSentFolder, 0)
  );
  Assert.ok(msgData.includes("Subject: Test bcc"));
  // Check that bcc header exists in the mail copy.
  Assert.ok(msgData.includes("Bcc: bcc@tinderbox.invalid"));
  Assert.ok(msgData.includes(fields.body));
  Assert.ok(msgData.includes(expectedBody));
  Assert.ok(!msgData.includes(notExpectedBody));
});

/**
 * Test that non-utf8 eml attachment is intact after sent to a bcc recipient.
 */
add_task(async function testBccWithNonUtf8EmlAttachment() {
  gServer.resetTest();
  let identity = getSmtpIdentity(
    "from@tinderbox.invalid",
    getBasicSmtpServer(gServer.port)
  );

  // Prepare the comp fields, including the bcc field.
  let fields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  fields.to = "Nobody <to@tinderbox.invalid>";
  fields.subject = "Test bcc with non-utf8 eml attachment";
  fields.bcc = "bcc@tinderbox.invalid";

  let testFile = do_get_file("data/shift-jis.eml");
  let attachment = Cc[
    "@mozilla.org/messengercompose/attachment;1"
  ].createInstance(Ci.nsIMsgAttachment);
  attachment.url = "file://" + testFile.path;
  attachment.contentType = "message/rfc822";
  attachment.name = testFile.leafName;
  fields.addAttachment(attachment);

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = fields;

  // Send the mail.
  let msgCompose = MailServices.compose.initCompose(params);
  msgCompose.type = Ci.nsIMsgCompType.New;
  let progress = Cc["@mozilla.org/messenger/progress;1"].createInstance(
    Ci.nsIMsgProgress
  );
  let promise = new Promise((resolve, reject) => {
    progressListener.resolve = resolve;
    progressListener.reject = reject;
  });
  progress.registerListener(progressListener);
  msgCompose.sendMsg(
    Ci.nsIMsgSend.nsMsgDeliverNow,
    identity,
    "",
    null,
    progress
  );
  await promise;

  Assert.ok(
    gServer._daemon.post.includes(
      "Subject: Test bcc with non-utf8 eml attachment"
    )
  );
  // \x8C\xBB\x8B\xB5 is 現況 in SHIFT-JIS.
  Assert.ok(gServer._daemon.post.includes("\r\n\r\n\x8C\xBB\x8B\xB5\r\n"));
});

add_task(async function testBccWithSendLater() {
  gServer.resetTest();
  cleanUpSent();
  let identity = getSmtpIdentity(
    "from@tinderbox.invalid",
    getBasicSmtpServer(gServer.port)
  );
  let account = MailServices.accounts.createAccount();
  account.addIdentity(identity);

  // Prepare the comp fields, including the bcc field.
  let fields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  fields.to = "Nobody <to@tinderbox.invalid>";
  fields.subject = "Test bcc with send later";
  fields.bcc = "bcc@tinderbox.invalid";
  fields.body = "A\r\nBcc: \r\n mail body\r\n.";

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = fields;

  // Queue the mail to send later.
  let msgCompose = MailServices.compose.initCompose(params);
  msgCompose.type = Ci.nsIMsgCompType.New;
  let progress = Cc["@mozilla.org/messenger/progress;1"].createInstance(
    Ci.nsIMsgProgress
  );
  let promise = new Promise((resolve, reject) => {
    progressListener.resolve = resolve;
    progressListener.reject = reject;
  });
  progress.registerListener(progressListener);
  msgCompose.sendMsg(
    Ci.nsIMsgSend.nsMsgQueueForLater,
    identity,
    "",
    null,
    progress
  );
  await promise;

  let onStopSendingPromise = PromiseUtils.defer();
  let msgSendLater = Cc["@mozilla.org/messengercompose/sendlater;1"].getService(
    Ci.nsIMsgSendLater
  );
  let sendLaterListener = {
    onStartSending() {},
    onMessageStartSending() {},
    onMessageSendProgress() {},
    onMessageSendError() {},
    onStopSending() {
      let expectedBody = `\r\n\r\n${fields.body}`;
      // Should not contain extra \r\n between head and body.
      let notExpectedBody = `\r\n\r\n\r\n${fields.body}`;

      Assert.ok(gServer._daemon.post.includes(`Subject: ${fields.subject}`));
      // Check that bcc header doesn't exist in the sent mail.
      Assert.ok(!gServer._daemon.post.includes("Bcc: bcc@tinderbox.invalid"));
      Assert.ok(gServer._daemon.post.includes(expectedBody));
      Assert.ok(!gServer._daemon.post.includes(notExpectedBody));

      let msgData = mailTestUtils.loadMessageToString(
        gSentFolder,
        mailTestUtils.getMsgHdrN(gSentFolder, 0)
      );
      Assert.ok(msgData.includes(`Subject: ${fields.subject}`));
      // Check that bcc header exists in the mail copy.
      Assert.ok(msgData.includes("Bcc: bcc@tinderbox.invalid"));
      Assert.ok(msgData.includes(fields.body));
      Assert.ok(msgData.includes(expectedBody));
      Assert.ok(!msgData.includes(notExpectedBody));

      msgSendLater.removeListener(sendLaterListener);
      onStopSendingPromise.resolve();
    },
  };

  msgSendLater.addListener(sendLaterListener);

  // Actually send the message.
  msgSendLater.sendUnsentMessages(identity);
  await onStopSendingPromise.promise;
});

/**
 * Test that sending bcc only message from Outbox works. With a bcc only
 * message, nsMsgSendLater passes `To: undisclosed-recipients: ;` to
 * SmtpService, but it should not be sent to the SMTP server.
 */
add_task(async function testBccOnlyWithSendLater() {
  gServer.resetTest();
  let identity = getSmtpIdentity(
    "from@tinderbox.invalid",
    getBasicSmtpServer(gServer.port)
  );
  let account = MailServices.accounts.createAccount();
  account.addIdentity(identity);

  // Prepare the comp fields, including the bcc field.
  let fields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  fields.subject = "Test bcc only with send later";
  fields.bcc = "bcc@tinderbox.invalid";
  fields.body = "A\r\nBcc: \r\n mail body\r\n.";

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = fields;

  // Queue the mail to send later.
  let msgCompose = MailServices.compose.initCompose(params);
  msgCompose.type = Ci.nsIMsgCompType.New;
  let progress = Cc["@mozilla.org/messenger/progress;1"].createInstance(
    Ci.nsIMsgProgress
  );
  let promise = new Promise((resolve, reject) => {
    progressListener.resolve = resolve;
    progressListener.reject = reject;
  });
  progress.registerListener(progressListener);
  msgCompose.sendMsg(
    Ci.nsIMsgSend.nsMsgQueueForLater,
    identity,
    "",
    null,
    progress
  );
  await promise;

  let onStopSendingPromise = PromiseUtils.defer();
  let msgSendLater = Cc["@mozilla.org/messengercompose/sendlater;1"].getService(
    Ci.nsIMsgSendLater
  );
  let sendLaterListener = {
    onStartSending() {},
    onMessageStartSending() {},
    onMessageSendProgress() {},
    onMessageSendError() {},
    onStopSending() {
      // Should not include RCPT TO:<undisclosed-recipients: ;>
      do_check_transaction(gServer.playTransaction(), [
        "EHLO test",
        `MAIL FROM:<from@tinderbox.invalid> BODY=8BITMIME SIZE=${gServer._daemon.post.length}`,
        "RCPT TO:<bcc@tinderbox.invalid>",
        "DATA",
      ]);

      msgSendLater.removeListener(sendLaterListener);
      onStopSendingPromise.resolve();
    },
  };

  msgSendLater.addListener(sendLaterListener);

  // Actually send the message.
  msgSendLater.sendUnsentMessages(identity);
  await onStopSendingPromise.promise;
});
