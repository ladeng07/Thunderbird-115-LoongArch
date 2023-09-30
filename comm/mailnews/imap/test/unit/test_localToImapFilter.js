/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file tests copies of multiple messages using filters
 * from incoming POP3, with filter actions copying and moving
 * messages to IMAP folders. This test is adapted from
 * test_imapFolderCopy.js
 *
 * Original author: Kent James <kent@caspia.com>
 */

/**
 * NOTE:
 * There's a problem with this test in chaos mode (mach xpcshell-test --verify)
 * with the filter applying.
 * It's either a problem with the POP3Pump implementation (testing infrastructure failure)
 * or a problem with the copy filter.
 */

/* import-globals-from ../../../test/resources/POP3pump.js */
load("../../../resources/POP3pump.js");

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

var gEmptyLocal1, gEmptyLocal2;
var gFiles = ["../../../data/bugmail1", "../../../data/draft1"];

add_setup(async function () {
  setupIMAPPump();
  let emptyFolder1Listener = PromiseTestUtils.promiseFolderAdded("empty 1");
  gEmptyLocal1 = localAccountUtils.rootFolder.createLocalSubfolder("empty 1");
  await emptyFolder1Listener;
  let emptyFolder2Listener = PromiseTestUtils.promiseFolderAdded("empty 2");
  gEmptyLocal2 = localAccountUtils.rootFolder.createLocalSubfolder("empty 2");
  await emptyFolder2Listener;

  // These hacks are required because we've created the inbox before
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

add_task(async function updateTrash() {
  let trashFolder = IMAPPump.incomingServer.rootFolder
    .getChildNamed("Trash")
    .QueryInterface(Ci.nsIMsgImapMailFolder);
  let listener = new PromiseTestUtils.PromiseUrlListener();
  // hack to force uid validity to get initialized for trash.
  trashFolder.updateFolderWithListener(null, listener);
  await listener.promise;
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

add_task(async function getLocalMessages() {
  // setup copy then move mail filters on the inbox
  let filterList = gPOP3Pump.fakeServer.getFilterList(null);
  let filter = filterList.createFilter("copyThenMoveAll");
  let searchTerm = filter.createTerm();
  searchTerm.matchAll = true;
  filter.appendTerm(searchTerm);
  let copyAction = filter.createAction();
  copyAction.type = Ci.nsMsgFilterAction.CopyToFolder;
  copyAction.targetFolderUri = IMAPPump.inbox.getChildNamed("empty 1").URI;
  filter.appendAction(copyAction);
  let moveAction = filter.createAction();
  moveAction.type = Ci.nsMsgFilterAction.MoveToFolder;
  moveAction.targetFolderUri = IMAPPump.inbox.getChildNamed("empty 2").URI;
  filter.appendAction(moveAction);
  filter.enabled = true;
  filterList.insertFilterAt(0, filter);
  let resolveOnDone;
  let promiseOnDone = new Promise(resolve => {
    resolveOnDone = resolve;
  });
  gPOP3Pump.files = gFiles;
  gPOP3Pump.onDone = resolveOnDone;
  gPOP3Pump.run();

  await promiseOnDone;
});

add_task(async function test_update1_copyFilter() {
  let listener = new PromiseTestUtils.PromiseUrlListener();
  let folder1 = IMAPPump.inbox
    .getChildNamed("empty 1")
    .QueryInterface(Ci.nsIMsgImapMailFolder);
  folder1.updateFolderWithListener(null, listener);
  await listener.promise;
  Assert.ok(folder1 !== null);
  Assert.equal(
    folderCount(folder1),
    2,
    "the two filtered messages should be in empty 1"
  );
});

add_task(async function test_update2_moveFilter() {
  let listener = new PromiseTestUtils.PromiseUrlListener();
  let folder2 = IMAPPump.inbox
    .getChildNamed("empty 2")
    .QueryInterface(Ci.nsIMsgImapMailFolder);
  folder2.updateFolderWithListener(null, listener);
  await listener.promise;
  Assert.ok(folder2 !== null);
  Assert.equal(
    folderCount(folder2),
    2,
    "the two filtered messages should be in empty 2"
  );
});

add_task(async function verifyLocalFolder() {
  // the local inbox folder should now be empty, since the second
  // operation was a move
  Assert.equal(folderCount(localAccountUtils.inboxFolder), 0);
});

add_task(function endTest() {
  gEmptyLocal1 = null;
  gEmptyLocal2 = null;
  gPOP3Pump = null;
  teardownIMAPPump();
});

function folderCount(folder) {
  return [...folder.msgDatabase.enumerateMessages()].length;
}
