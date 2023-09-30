/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * nsIMsgPluggableStore interface tests
 */

function test_discoverSubFolders() {
  let mailbox = setup_mailbox("none", create_temporary_directory());
  mailbox.msgStore.discoverSubFolders(mailbox, true);
}

function test_sliceStream() {
  let mailbox = setup_mailbox("none", create_temporary_directory());

  let str = "Just a test string.";
  let strStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(
    Ci.nsIStringInputStream
  );
  strStream.setData(str, str.length);

  let sliced = mailbox.msgStore.sliceStream(strStream, 7, 4);

  let s = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
    Ci.nsIScriptableInputStream
  );
  s.init(sliced);

  let chunk = s.read(1024);
  Assert.equal(chunk, "test", "Check we got the expected subset.");
  Assert.equal(s.available(), 0, "Check no more bytes available.");
  Assert.equal(s.read(1024), "", "Check read() returns EOF.");
}

// Return a wrapper which sets the store type before running fn().
function withStore(store, fn) {
  return () => {
    Services.prefs.setCharPref("mail.serverDefaultStoreContractID", store);
    fn();
  };
}

const pluggableStores = [
  "@mozilla.org/msgstore/berkeleystore;1",
  "@mozilla.org/msgstore/maildirstore;1",
];

for (let store of pluggableStores) {
  add_task(withStore(store, test_discoverSubFolders));
  add_task(withStore(store, test_sliceStream));
}
