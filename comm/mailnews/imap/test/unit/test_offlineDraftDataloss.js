/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file tests that a message saved as draft in an IMAP folder in offline
 * mode is not lost when going back online
 * See Bug 805626
 */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);
var { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

var gDraftsFolder;

add_setup(function () {
  setupIMAPPump();
  Services.prefs.setBoolPref(
    "mail.server.default.autosync_offline_stores",
    false
  );
});

add_task(async function createDraftsFolder() {
  IMAPPump.incomingServer.rootFolder.createSubfolder("Drafts", null);
  await PromiseTestUtils.promiseFolderAdded("Drafts");
  gDraftsFolder = IMAPPump.incomingServer.rootFolder.getChildNamed("Drafts");
  Assert.ok(gDraftsFolder instanceof Ci.nsIMsgImapMailFolder);
  let listener = new PromiseTestUtils.PromiseUrlListener();
  gDraftsFolder.updateFolderWithListener(null, listener);
  await listener.promise;
});

add_task(async function goOffline() {
  // Don't prompt about offline download when going offline.
  Services.prefs.setIntPref("offline.download.download_messages", 2);

  IMAPPump.incomingServer.closeCachedConnections();
  let thread = gThreadManager.currentThread;
  while (thread.hasPendingEvents()) {
    thread.processNextEvent(true);
  }
  IMAPPump.server.stop();
  Services.io.offline = true;
});

add_task(async function saveDraft() {
  let msgCompose = Cc["@mozilla.org/messengercompose/compose;1"].createInstance(
    Ci.nsIMsgCompose
  );
  let fields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);
  fields.from = "Nobody <nobody@tinderbox.test>";

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = fields;
  msgCompose.initialize(params);

  // Set up the identity.
  let identity = MailServices.accounts.createIdentity();
  identity.draftFolder = gDraftsFolder.URI;

  let progress = Cc["@mozilla.org/messenger/progress;1"].createInstance(
    Ci.nsIMsgProgress
  );
  let progressListener = new WebProgressListener();
  progress.registerListener(progressListener);
  msgCompose.sendMsg(
    Ci.nsIMsgSend.nsMsgSaveAsDraft,
    identity,
    "",
    null,
    progress
  );
  await progressListener.promise;
  // Verify that message is not on the server yet.
  Assert.equal(IMAPPump.daemon.getMailbox("Drafts")._messages.length, 0);
});

add_task(async function goOnline() {
  let offlineManager = Cc[
    "@mozilla.org/messenger/offline-manager;1"
  ].getService(Ci.nsIMsgOfflineManager);
  IMAPPump.daemon.closing = false;
  Services.io.offline = false;

  IMAPPump.server.start();
  offlineManager.inProgress = true;
  offlineManager.goOnline(false, true, null);
  // There seem to be some untraceable postprocessing with 100ms.
  //  (Found through xpcshell-test --verify)
  await PromiseTestUtils.promiseDelay(100);
  await TestUtils.waitForCondition(
    () => !offlineManager.inProgress,
    "wait for offlineManager not in progress"
  );
  // Verify that message is now on the server.
  Assert.equal(IMAPPump.daemon.getMailbox("Drafts")._messages.length, 1);
});

add_task(function endTest() {
  teardownIMAPPump();
});

/*
 * helper functions
 */

function WebProgressListener() {
  this._promise = new Promise(resolve => {
    this._resolve = resolve;
  });
}
WebProgressListener.prototype = {
  onStateChange(aWebProgress, aRequest, aStateFlags, aStatus) {
    if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) {
      this._resolve();
    }
  },

  onProgressChange(
    aWebProgress,
    aRequest,
    aCurSelfProgress,
    aMaxSelfProgress,
    aCurTotalProgress,
    aMaxTotalProgress
  ) {},
  onLocationChange(aWebProgress, aRequest, aLocation, aFlags) {},
  onStatusChange(aWebProgress, aRequest, aStatus, aMessage) {},
  onSecurityChange(aWebProgress, aRequest, state) {},
  onContentBlockingEvent(aWebProgress, aRequest, aEvent) {},

  QueryInterface: ChromeUtils.generateQI([
    "nsIWebProgressListener",
    "nsISupportsWeakReference",
  ]),

  get promise() {
    return this._promise;
  },
};
