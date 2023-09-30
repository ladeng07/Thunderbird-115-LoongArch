/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This file tests hdr parsing in the filter running context, specifically
 * filters on custom headers.
 * See https://bugzilla.mozilla.org/show_bug.cgi?id=655578
 * for more info.
 *
 * Original author: David Bienvenu <bienvenu@mozilla.com>
 */

var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

// IMAP pump

var { IMAPPump, setupIMAPPump, teardownIMAPPump } = ChromeUtils.import(
  "resource://testing-common/mailnews/IMAPpump.jsm"
);

add_setup(async function () {
  setupIMAPPump();
  // Create a test filter.
  let filterList = IMAPPump.incomingServer.getFilterList(null);
  let filter = filterList.createFilter("test list-id");
  let searchTerm = filter.createTerm();
  searchTerm.attrib = Ci.nsMsgSearchAttrib.OtherHeader + 1;
  searchTerm.op = Ci.nsMsgSearchOp.Contains;
  let value = searchTerm.value;
  value.attrib = Ci.nsMsgSearchAttrib.OtherHeader;
  value.str = "gnupg-users.gnupg.org";
  searchTerm.value = value;
  searchTerm.booleanAnd = false;
  searchTerm.arbitraryHeader = "List-Id";
  filter.appendTerm(searchTerm);
  filter.enabled = true;

  // create a mark read action
  let action = filter.createAction();
  action.type = Ci.nsMsgFilterAction.MarkRead;
  filter.appendAction(action);
  filterList.insertFilterAt(0, filter);
  Services.prefs.setBoolPref(
    "mail.server.default.autosync_offline_stores",
    false
  );
  let file = do_get_file("../../../data/bugmail19");
  let msgfileuri = Services.io.newFileURI(file).QueryInterface(Ci.nsIFileURL);

  IMAPPump.mailbox.addMessage(
    new ImapMessage(msgfileuri.spec, IMAPPump.mailbox.uidnext++, [])
  );
  let listener = new PromiseTestUtils.PromiseUrlListener();
  IMAPPump.inbox.updateFolderWithListener(null, listener);
  await listener.promise;
});

add_task(function checkFilterResults() {
  let msgHdr = mailTestUtils.firstMsgHdr(IMAPPump.inbox);
  Assert.ok(msgHdr.isRead);
  IMAPPump.server.performTest("UID STORE");
  teardownIMAPPump();
});
