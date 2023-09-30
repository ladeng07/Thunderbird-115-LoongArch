/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Tests imap save and detach attachments.
 */

var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

// javascript mime emitter functions
var { MsgHdrToMimeMessage } = ChromeUtils.import(
  "resource:///modules/gloda/MimeMessage.jsm"
);

var kAttachFileName = "bob.txt";
function SaveAttachmentCallback() {
  this.attachments = null;
  this._promise = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });
}

SaveAttachmentCallback.prototype = {
  callback: function saveAttachmentCallback_callback(aMsgHdr, aMimeMessage) {
    this.attachments = aMimeMessage.allAttachments;
    this._resolve();
  },
  get promise() {
    return this._promise;
  },
};
var gCallbackObject = new SaveAttachmentCallback();

// Dummy message window so we can say the inbox is open in a window.
var dummyMsgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(
  Ci.nsIMsgWindow
);

function MsgsDeletedListener() {
  this._promise = new Promise(resolve => (this._resolve = resolve));
}
MsgsDeletedListener.prototype = {
  msgsDeleted(aMsgArray) {
    this._resolve();
  },
  get promise() {
    return this._promise;
  },
};
var trackDeletionMessageListener = new MsgsDeletedListener();

add_setup(function () {
  setupIMAPPump();

  // Add folder listeners that will capture async events
  MailServices.mfn.addListener(
    trackDeletionMessageListener,
    Ci.nsIMsgFolderNotificationService.msgsDeleted
  );

  // We need to register the dummyMsgWindow so that when we've finished running
  // the append url, in nsImapMailFolder::OnStopRunningUrl, we'll think the
  // Inbox is open in a folder and update it, which the detach code relies
  // on to finish the detach.

  dummyMsgWindow.openFolder = IMAPPump.inbox;
  MailServices.mailSession.AddMsgWindow(dummyMsgWindow);
});

// load and update a message in the imap fake server
add_task(async function loadImapMessage() {
  let gMessageGenerator = new MessageGenerator();
  // create a synthetic message with attachment
  let smsg = gMessageGenerator.makeMessage({
    attachments: [{ filename: kAttachFileName, body: "I like cheese!" }],
  });

  let msgURI = Services.io.newURI(
    "data:text/plain;base64," + btoa(smsg.toMessageString())
  );
  let imapInbox = IMAPPump.daemon.getMailbox("INBOX");
  let message = new ImapMessage(msgURI.spec, imapInbox.uidnext++, []);
  IMAPPump.mailbox.addMessage(message);
  let listener = new PromiseTestUtils.PromiseUrlListener();
  IMAPPump.inbox.updateFolderWithListener(null, listener);
  await listener.promise;
  Assert.equal(1, IMAPPump.inbox.getTotalMessages(false));
  let msgHdr = mailTestUtils.firstMsgHdr(IMAPPump.inbox);
  Assert.ok(msgHdr instanceof Ci.nsIMsgDBHdr);
});

// process the message through mime
add_task(async function startMime() {
  let msgHdr = mailTestUtils.firstMsgHdr(IMAPPump.inbox);

  MsgHdrToMimeMessage(
    msgHdr,
    gCallbackObject,
    gCallbackObject.callback,
    true // allowDownload
  );
  await gCallbackObject.promise;
});

// detach any found attachments
add_task(async function startDetach() {
  let msgHdr = mailTestUtils.firstMsgHdr(IMAPPump.inbox);
  let msgURI = msgHdr.folder.generateMessageURI(msgHdr.messageKey);

  let messenger = Cc["@mozilla.org/messenger;1"].createInstance(
    Ci.nsIMessenger
  );
  let attachment = gCallbackObject.attachments[0];

  messenger.detachAttachmentsWOPrompts(
    do_get_profile(),
    [attachment.contentType],
    [attachment.url],
    [attachment.name],
    [msgURI],
    null
  );
  // deletion of original message should kick async_driver.
  await trackDeletionMessageListener.promise;
});

// test that the detachment was successful
add_task(async function testDetach() {
  // Check that the file attached to the message now exists in the profile
  // directory.
  let checkFile = do_get_profile().clone();
  checkFile.append(kAttachFileName);
  Assert.ok(checkFile.exists());

  // The message should now have a detached attachment. Read the message,
  //  and search for "AttachmentDetached" which is added on detachment.

  // Get the message header - detached copy has UID 2.
  let msgHdr = IMAPPump.inbox.GetMessageHeader(2);
  Assert.ok(msgHdr !== null);
  let messageContent = await getContentFromMessage(msgHdr);
  Assert.ok(messageContent.includes("AttachmentDetached"));
});

// Cleanup
add_task(function endTest() {
  teardownIMAPPump();
});

/**
 * Get the full message content.
 *
 * @param aMsgHdr - nsIMsgDBHdr object whose text body will be read.
 * @returns {Promise<string>} full message contents.
 */
function getContentFromMessage(aMsgHdr) {
  let msgFolder = aMsgHdr.folder;
  let msgUri = msgFolder.getUriForMsg(aMsgHdr);

  return new Promise((resolve, reject) => {
    let streamListener = {
      QueryInterface: ChromeUtils.generateQI(["nsIStreamListener"]),
      sis: Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
        Ci.nsIScriptableInputStream
      ),
      content: "",
      onDataAvailable(request, inputStream, offset, count) {
        this.sis.init(inputStream);
        this.content += this.sis.read(count);
      },
      onStartRequest(request) {},
      onStopRequest(request, statusCode) {
        this.sis.close();
        if (Components.isSuccessCode(statusCode)) {
          resolve(this.content);
        } else {
          reject(new Error(statusCode));
        }
      },
    };
    // Pass true for aLocalOnly since message should be in offline store.
    MailServices.messageServiceFromURI(msgUri).streamMessage(
      msgUri,
      streamListener,
      null,
      null,
      false,
      "",
      true
    );
  });
}
