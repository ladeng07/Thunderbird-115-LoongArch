/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file tests the folder copying with IMAP. In particular, we're
// going to test copying local folders to imap servers, but other tests
// could be added.

var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

var gEmptyLocal1, gEmptyLocal2, gEmptyLocal3, gNotEmptyLocal4;

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

add_setup(function () {
  setupIMAPPump();

  gEmptyLocal1 = localAccountUtils.rootFolder.createLocalSubfolder("empty 1");
  gEmptyLocal2 = localAccountUtils.rootFolder.createLocalSubfolder("empty 2");
  gEmptyLocal3 = localAccountUtils.rootFolder.createLocalSubfolder("empty 3");
  gNotEmptyLocal4 =
    localAccountUtils.rootFolder.createLocalSubfolder("not empty 4");

  let messageGenerator = new MessageGenerator();
  let message = messageGenerator.makeMessage();
  gNotEmptyLocal4.QueryInterface(Ci.nsIMsgLocalMailFolder);
  gNotEmptyLocal4.addMessage(message.toMboxString());

  // these hacks are required because we've created the inbox before
  // running initial folder discovery, and adding the folder bails
  // out before we set it as verified online, so we bail out, and
  // then remove the INBOX folder since it's not verified.
  IMAPPump.inbox.hierarchyDelimiter = "/";
  IMAPPump.inbox.verifiedAsOnlineFolder = true;
});

add_task(async function copyFolder1() {
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFolder(
    gEmptyLocal1,
    IMAPPump.inbox,
    false,
    copyListener,
    null
  );
  await copyListener.promise;
});

add_task(async function copyFolder2() {
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFolder(
    gEmptyLocal2,
    IMAPPump.inbox,
    false,
    copyListener,
    null
  );
  await copyListener.promise;
});

add_task(async function copyFolder3() {
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFolder(
    gEmptyLocal3,
    IMAPPump.inbox,
    false,
    copyListener,
    null
  );
  await copyListener.promise;
});

add_task(function verifyFolders() {
  let folder1 = IMAPPump.inbox.getChildNamed("empty 1");
  let folder2 = IMAPPump.inbox.getChildNamed("empty 2");
  let folder3 = IMAPPump.inbox.getChildNamed("empty 3");
  Assert.ok(folder1 !== null);
  Assert.ok(folder2 !== null);
  Assert.ok(folder3 !== null);
});

add_task(async function moveImapFolder1() {
  let folder1 = IMAPPump.inbox.getChildNamed("empty 1");
  let folder2 = IMAPPump.inbox.getChildNamed("empty 2");
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFolder(folder2, folder1, true, copyListener, null);
  await copyListener.promise;
});

add_task(async function moveImapFolder2() {
  let folder1 = IMAPPump.inbox.getChildNamed("empty 1");
  let folder3 = IMAPPump.inbox.getChildNamed("empty 3");
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFolder(folder3, folder1, true, copyListener, null);
  await copyListener.promise;
});

add_task(function verifyImapFolders() {
  let folder1 = IMAPPump.inbox.getChildNamed("empty 1");
  let folder2 = folder1.getChildNamed("empty 2");
  let folder3 = folder1.getChildNamed("empty 3");
  Assert.ok(folder1 !== null);
  Assert.ok(folder2 !== null);
  Assert.ok(folder3 !== null);
});

add_task(async function testImapFolderCopyFailure() {
  IMAPPump.daemon.commandToFail = "APPEND";
  // we expect NS_MSG_ERROR_IMAP_COMMAND_FAILED;
  const NS_MSG_ERROR_IMAP_COMMAND_FAILED = 0x80550021;
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFolder(
    gNotEmptyLocal4,
    IMAPPump.inbox,
    false,
    copyListener,
    null
  );
  await Assert.rejects(
    copyListener.promise,
    e => {
      return e === NS_MSG_ERROR_IMAP_COMMAND_FAILED;
    },
    "NS_MSG_ERROR_IMAP_COMMAND_FAILED should be the cause of the error"
  );
});

add_task(function teardown() {
  teardownIMAPPump();
});
