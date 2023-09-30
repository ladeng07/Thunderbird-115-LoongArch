/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/* Test of accessing over 2 GiB local folder. */

const { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

// Find hdr for message whose offset is over 2 GiB.
function findHugeMessageHdr(folder) {
  //getMessageHdr() {
  for (let header of folder.msgDatabase.enumerateMessages()) {
    if (header.messageOffset >= 0x80000000) {
      return header;
    }
  }

  do_throw("Over 2 GiB msgkey was not found!");
  return null; // This won't ever happen, but we're keeping the linter happy.
}

let gInboxFile;
let gInbox;
let gSmallMsgFile = do_get_file("../../../data/bugmail10");

add_setup(async function () {
  // Make sure we're using mbox.
  Services.prefs.setCharPref(
    "mail.serverDefaultStoreContractID",
    "@mozilla.org/msgstore/berkeleystore;1"
  );

  localAccountUtils.loadLocalMailAccount();

  gInbox = localAccountUtils.inboxFolder;
  gInboxFile = gInbox.filePath;

  let neededFreeSpace = 0x100000000;
  let freeDiskSpace = gInboxFile.diskSpaceAvailable;
  info("Free disk space = " + mailTestUtils.toMiBString(freeDiskSpace));
  if (freeDiskSpace < neededFreeSpace) {
    throw new Error(
      "This test needs " +
        mailTestUtils.toMiBString(neededFreeSpace) +
        " free space to run. Aborting."
    );
  }
});

// Extend mbox file to over 2 GiB.
add_task(async function extendPast2GiB() {
  let outputStream = Cc["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Ci.nsIFileOutputStream)
    .QueryInterface(Ci.nsISeekableStream);
  // Open in write-only mode, no truncate.
  outputStream.init(gInboxFile, 0x02, -1, 0);
  // seek past 2GB.
  outputStream.seek(0, 0x80000010);
  // Write a "space" character.
  outputStream.write(" ", 1);
  outputStream.close();
});

// Copy another (normal sized) message into the local folder.
// This message should be past the 2GiB position.
add_task(async function appendSmallMessage() {
  // Remember initial mbox file size.
  let initialInboxSize = gInbox.filePath.fileSize;
  info(`Local inbox size (before copyFileMessage()) = ${initialInboxSize}`);

  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyFileMessage(
    gSmallMsgFile,
    gInbox,
    null /* msgToReplace*/,
    false /* isDraftOrTemplate */,
    0 /* message flags */,
    "" /* keywords */,
    copyListener,
    null /* window */
  );
  await copyListener.promise;

  // Make sure inbox file grew (i.e., we were not writing over data).
  let localInboxSize = gInbox.filePath.fileSize;
  info(
    "Local inbox size (after copyFileMessageInLocalFolder()) = " +
      localInboxSize
  );
  Assert.greater(localInboxSize, initialInboxSize);
});

// Copy the huge message into a subfolder.
add_task(async function copyHugeMessage() {
  let trash =
    localAccountUtils.incomingServer.rootMsgFolder.getChildNamed("Trash");
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyMessages(
    gInbox,
    [findHugeMessageHdr(gInbox)],
    trash /* destFolder */,
    false,
    copyListener,
    null,
    false
  );
  await copyListener.promise;
});

// Read out the smaller message beyond the 2 GiB offset and make sure
// it matches what we expect.
add_task(async function verifySmallMessage() {
  let msghdr = findHugeMessageHdr(gInbox);
  let msgURI = msghdr.folder.getUriForMsg(msghdr);
  let msgServ = MailServices.messageServiceFromURI(msgURI);

  let streamListener = new PromiseTestUtils.PromiseStreamListener();
  msgServ.streamMessage(msgURI, streamListener, null, null, false, "", true);
  let got = await streamListener.promise;

  let expected = await IOUtils.readUTF8(gSmallMsgFile.path);
  Assert.equal(got, expected);
});

add_task(async function cleanup() {
  // Free up disk space - if you want to look at the file after running
  // this test, comment out this line.
  gInbox.filePath.remove(false);
});
