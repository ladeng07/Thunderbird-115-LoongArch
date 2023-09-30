/**
 * Protocol tests for SMTP.
 *
 * This test currently consists of verifying the correct protocol sequence
 * between mailnews and SMTP server. It does not check the data of the message
 * either side of the link, it will be extended later to do that.
 */
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
const { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

var server;

var kIdentityMail = "identity@foo.invalid";
var kSender = "from@foo.invalid";
var kTo = "to@foo.invalid";
var kUsername = "testsmtp";
var kPassword = "smtptest";

async function test_RFC2821() {
  // Test file
  var testFile = do_get_file("data/message1.eml");

  // Ensure we have at least one mail account
  localAccountUtils.loadLocalMailAccount();

  server.start();
  var smtpServer = getBasicSmtpServer(server.port);
  var identity = getSmtpIdentity(kIdentityMail, smtpServer);

  // Handle the server in a try/catch/finally loop so that we always will stop
  // the server if something fails.
  try {
    // Just a basic test to check we're sending mail correctly.
    test = "Basic sendMailMessage";

    // First do test with identity email address used for smtp MAIL FROM.
    Services.prefs.setBoolPref("mail.smtp.useSenderForSmtpMailFrom", false);

    let urlListener = new PromiseTestUtils.PromiseUrlListener();
    MailServices.smtp.sendMailMessage(
      testFile,
      kTo,
      identity,
      kSender,
      null,
      urlListener,
      null,
      null,
      false,
      "",
      {},
      {}
    );

    await urlListener.promise;

    var transaction = server.playTransaction();
    do_check_transaction(transaction, [
      "EHLO test",
      "MAIL FROM:<" + kIdentityMail + "> BODY=8BITMIME SIZE=159",
      "RCPT TO:<" + kTo + ">",
      "DATA",
    ]);

    smtpServer.closeCachedConnections();
    server.resetTest();

    // Now do the same test with sender's email address used for smtp MAIL FROM.
    Services.prefs.setBoolPref("mail.smtp.useSenderForSmtpMailFrom", true);

    urlListener = new PromiseTestUtils.PromiseUrlListener();
    MailServices.smtp.sendMailMessage(
      testFile,
      kTo,
      identity,
      kSender,
      null,
      urlListener,
      null,
      null,
      false,
      "",
      {},
      {}
    );

    await urlListener.promise;

    transaction = server.playTransaction();
    do_check_transaction(transaction, [
      "EHLO test",
      "MAIL FROM:<" + kSender + "> BODY=8BITMIME SIZE=159",
      "RCPT TO:<" + kTo + ">",
      "DATA",
    ]);

    smtpServer.closeCachedConnections();
    server.resetTest();

    // This time with auth.
    test = "Auth sendMailMessage";

    smtpServer.authMethod = Ci.nsMsgAuthMethod.passwordCleartext;
    smtpServer.socketType = Ci.nsMsgSocketType.plain;
    smtpServer.username = kUsername;
    smtpServer.password = kPassword;

    // First do test with identity email address used for smtp MAIL FROM.
    Services.prefs.setBoolPref("mail.smtp.useSenderForSmtpMailFrom", false);

    urlListener = new PromiseTestUtils.PromiseUrlListener();
    MailServices.smtp.sendMailMessage(
      testFile,
      kTo,
      identity,
      kSender,
      null,
      urlListener,
      null,
      null,
      false,
      "",
      {},
      {}
    );

    await urlListener.promise;

    transaction = server.playTransaction();
    do_check_transaction(transaction, [
      "EHLO test",
      "AUTH PLAIN " + AuthPLAIN.encodeLine(kUsername, kPassword),
      "MAIL FROM:<" + kIdentityMail + "> BODY=8BITMIME SIZE=159",
      "RCPT TO:<" + kTo + ">",
      "DATA",
    ]);

    smtpServer.closeCachedConnections();
    server.resetTest();

    // Now do the same test with sender's email address used for smtp MAIL FROM.
    Services.prefs.setBoolPref("mail.smtp.useSenderForSmtpMailFrom", true);

    urlListener = new PromiseTestUtils.PromiseUrlListener();
    MailServices.smtp.sendMailMessage(
      testFile,
      kTo,
      identity,
      kSender,
      null,
      urlListener,
      null,
      null,
      false,
      "",
      {},
      {}
    );

    await urlListener.promise;

    transaction = server.playTransaction();
    do_check_transaction(transaction, [
      "EHLO test",
      "AUTH PLAIN " + AuthPLAIN.encodeLine(kUsername, kPassword),
      "MAIL FROM:<" + kSender + "> BODY=8BITMIME SIZE=159",
      "RCPT TO:<" + kTo + ">",
      "DATA",
    ]);
  } catch (e) {
    do_throw(e);
  } finally {
    server.stop();

    var thread = gThreadManager.currentThread;
    while (thread.hasPendingEvents()) {
      thread.processNextEvent(true);
    }
  }
}

add_task(async function run() {
  server = setupServerDaemon();
  await test_RFC2821();
});
