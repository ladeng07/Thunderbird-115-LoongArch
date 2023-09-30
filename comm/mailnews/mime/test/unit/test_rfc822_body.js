/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This test verifies that we emit a message/rfc822 body part as an attachment
 * whether or not mail.inline_attachments is true.
 */

var { MessageGenerator, SyntheticMessageSet } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { MessageInjection } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageInjection.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);
var messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
var msgGen = new MessageGenerator();
var messageInjection = new MessageInjection({ mode: "local" });
var inbox = messageInjection.getInboxFolder();

add_task(async function test_rfc822_body_display_inline() {
  Services.prefs.setBoolPref("mail.inline_attachments", true);
  await help_test_rfc822_body({
    // a message whose body is itself a message
    bodyPart: msgGen.makeMessage(),
    attachmentCount: 1,
  });
  await help_test_rfc822_body({
    // a message whose body is itself a message, and which has an attachment
    bodyPart: msgGen.makeMessage({
      attachments: [
        {
          body: "I'm an attachment!",
          filename: "attachment.txt",
          format: "",
        },
      ],
    }),
    attachmentCount: 2,
  });
});

add_task(async function test_rfc822_body_no_display_inline() {
  Services.prefs.setBoolPref("mail.inline_attachments", false);
  await help_test_rfc822_body({
    // a message whose body is itself a message
    bodyPart: msgGen.makeMessage(),
    attachmentCount: 1,
  });
  await help_test_rfc822_body({
    // a message whose body is itself a message, and which has an attachment
    bodyPart: msgGen.makeMessage({
      attachments: [
        {
          body: "I'm an attachment!",
          filename: "attachment.txt",
          format: "",
        },
      ],
    }),
    attachmentCount: 1,
  });
});

async function help_test_rfc822_body(info) {
  let synMsg = msgGen.makeMessage(info);
  let synSet = new SyntheticMessageSet([synMsg]);
  await messageInjection.addSetsToFolders([inbox], [synSet]);

  let msgURI = synSet.getMsgURI(0);
  let msgService = MailServices.messageServiceFromURI(msgURI);

  let streamListener = new PromiseTestUtils.PromiseStreamListener({
    onStopRequest(request, statusCode) {
      request.QueryInterface(Ci.nsIMailChannel);
      Assert.equal(request.attachments.length, info.attachmentCount);
    },
  });
  msgService.streamMessage(
    msgURI,
    streamListener,
    null,
    null,
    true, // have them create the converter
    // additional uri payload, note that "header=" is prepended automatically
    "filter",
    false
  );

  await streamListener.promise;
}
