/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Test that the message failed to move to a local folder remains on IMAP
 * server. */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

function stop_server() {
  IMAPPump.incomingServer.closeCachedConnections();
  IMAPPump.server.stop();
  let thread = gThreadManager.currentThread;
  while (thread.hasPendingEvents()) {
    thread.processNextEvent(true);
  }
}

add_setup(function () {
  setupIMAPPump();
  Services.prefs.setBoolPref(
    "mail.server.default.autosync_offline_stores",
    false
  );
});

add_setup(async function () {
  let messageGenerator = new MessageGenerator();
  let messageString = messageGenerator.makeMessage().toMessageString();
  let dataUri = Services.io.newURI(
    "data:text/plain;base64," + btoa(messageString)
  );
  let imapMsg = new ImapMessage(dataUri.spec, IMAPPump.mailbox.uidnext++, []);
  IMAPPump.mailbox.addMessage(imapMsg);

  let listener = new PromiseTestUtils.PromiseUrlListener();
  IMAPPump.inbox.updateFolderWithListener(null, listener);
  await listener.promise;
});

add_task(async function move_messages() {
  let msg = IMAPPump.inbox.msgDatabase.getMsgHdrForKey(
    IMAPPump.mailbox.uidnext - 1
  );
  let copyListener = new PromiseTestUtils.PromiseCopyListener({
    OnProgress(aProgress, aProgressMax) {
      stop_server();
    },
  });
  MailServices.copy.copyMessages(
    IMAPPump.inbox,
    [msg],
    localAccountUtils.inboxFolder,
    true,
    copyListener,
    null,
    false
  );
  await copyListener.promise;
});

add_task(function check_messages() {
  Assert.equal(IMAPPump.inbox.getTotalMessages(false), 1);
  Assert.equal(localAccountUtils.inboxFolder.getTotalMessages(false), 0);
});

add_task(function endTest() {
  // IMAPPump.server.performTest() brings this test to a halt,
  // so we need teardownIMAPPump() without IMAPPump.server.performTest().
  IMAPPump.inbox = null;
  IMAPPump.server.resetTest();
  try {
    IMAPPump.incomingServer.closeCachedConnections();
    let serverSink = IMAPPump.incomingServer.QueryInterface(
      Ci.nsIImapServerSink
    );
    serverSink.abortQueuedUrls();
  } catch (ex) {
    dump(ex);
  }
  IMAPPump.server.stop();
  let thread = gThreadManager.currentThread;
  while (thread.hasPendingEvents()) {
    thread.processNextEvent(true);
  }
});
