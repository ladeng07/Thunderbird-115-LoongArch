/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This tests that renaming non-ASCII name folder works.

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

add_setup(async function () {
  setupIMAPPump();
  Services.prefs.setBoolPref(
    "mail.server.default.autosync_offline_stores",
    false
  );
  IMAPPump.incomingServer.rootFolder.createSubfolder("folder 1", null);
  await PromiseTestUtils.promiseFolderAdded("folder 1");

  let listener = new PromiseTestUtils.PromiseUrlListener();
  IMAPPump.inbox.updateFolderWithListener(null, listener);
  await listener.promise;
});

add_task(async function test_rename() {
  let rootFolder = IMAPPump.incomingServer.rootFolder;
  let targetFolder = rootFolder.getChildNamed("folder 1");

  targetFolder.rename("folder \u00e1", null);

  IMAPPump.server.performTest("RENAME");
  let listener = new PromiseTestUtils.PromiseUrlListener();
  IMAPPump.inbox.updateFolderWithListener(null, listener);
  await listener.promise;

  let folder = rootFolder.getChildNamed("folder \u00e1");
  Assert.ok(folder.msgDatabase.summaryValid);
  Assert.equal("folder &AOE-", folder.filePath.leafName);
  Assert.equal("folder \u00e1", folder.prettyName);
});
