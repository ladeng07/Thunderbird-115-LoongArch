/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Sanity checks for nsIMsgFolderCache/nsIMsgFolderCacheElement.
 */
add_task(function test_basics() {
  let profileDir = do_get_profile();
  let jsonFile = profileDir.clone();
  jsonFile.append("folderCache.json");
  let legacyFile = profileDir.clone();
  legacyFile.append("panacea.dat");

  // Create an empty cache object and start poking it.
  {
    let cache = Cc["@mozilla.org/messenger/msgFolderCache;1"].createInstance(
      Ci.nsIMsgFolderCache
    );
    // Neither of these files exist, and that's fine.
    Assert.ok(!jsonFile.exists());
    Assert.ok(!legacyFile.exists());
    cache.init(jsonFile, legacyFile);

    // getCacheElement has to be told to create non-existent keys.
    Assert.throws(function () {
      cache.getCacheElement("a/non/existent/key", false);
    }, /NS_ERROR_NOT_AVAILABLE/);
    let e1 = cache.getCacheElement("/made/up/path/Inbox", true);

    // Can set, get and modify Int32 values?
    e1.setCachedInt32("wibble", -1);
    Assert.equal(e1.getCachedInt32("wibble"), -1);
    e1.setCachedInt32("wibble", 42);
    Assert.equal(e1.getCachedInt32("wibble"), 42);

    // Check some allowed conversions from Int32.
    Assert.equal(e1.getCachedUInt32("wibble"), 42);
    Assert.equal(e1.getCachedInt64("wibble"), 42);
    Assert.equal(e1.getCachedString("wibble"), "42");

    // Can set, get and modify UInt32 values?
    e1.setCachedUInt32("pibble", 0xffffffff);
    Assert.equal(e1.getCachedUInt32("pibble"), 0xffffffff);
    e1.setCachedUInt32("pibble", 42);
    Assert.equal(e1.getCachedUInt32("pibble"), 42);

    // Check some allowed conversions from UInt32.
    Assert.equal(e1.getCachedInt32("pibble"), 42);
    Assert.equal(e1.getCachedInt64("pibble"), 42);
    Assert.equal(e1.getCachedString("pibble"), "42");

    // Can set, get and modify Int64 values?
    e1.setCachedInt64("foo", 2305843009213694000);
    Assert.equal(e1.getCachedInt64("foo"), 2305843009213694000);
    e1.setCachedInt64("foo", -2305843009213694000);
    Assert.equal(e1.getCachedInt64("foo"), -2305843009213694000);
    e1.setCachedInt64("foo", 42);
    Assert.equal(e1.getCachedInt64("foo"), 42);

    // Check some allowed conversions from Int64.
    Assert.equal(e1.getCachedInt32("foo"), 42);
    Assert.equal(e1.getCachedUInt32("foo"), 42);
    Assert.equal(e1.getCachedString("foo"), "42");

    // Can set, get and modify String values?
    e1.setCachedString("bar", "Before");
    Assert.equal(e1.getCachedString("bar"), "Before");
    e1.setCachedString("bar", "After");
    Assert.equal(e1.getCachedString("bar"), "After");
    e1.setCachedString("bar", "日本語");
    Assert.equal(e1.getCachedString("bar"), "日本語");

    // Check some disallowed conversions from String.
    Assert.throws(function () {
      e1.getCachedInt32("bar");
    }, /NS_ERROR_NOT_AVAILABLE/);
    Assert.throws(function () {
      e1.getCachedUInt32("bar");
    }, /NS_ERROR_NOT_AVAILABLE/);
    Assert.throws(function () {
      e1.getCachedInt64("bar");
    }, /NS_ERROR_NOT_AVAILABLE/);

    // Trying to read missing properties is an error.
    Assert.throws(function () {
      e1.getCachedInt32("non-existent-property");
    }, /NS_ERROR_NOT_AVAILABLE/);
    Assert.throws(function () {
      e1.getCachedUInt32("non-existent-property");
    }, /NS_ERROR_NOT_AVAILABLE/);
    Assert.throws(function () {
      e1.getCachedInt64("non-existent-property");
    }, /NS_ERROR_NOT_AVAILABLE/);
    Assert.throws(function () {
      e1.getCachedString("non-existent-property");
    }, /NS_ERROR_NOT_AVAILABLE/);

    // Force a save to jsonFile. The changes we made will have queued up a
    // cache autosave but we don't want to wait that long. The cache dtor
    // would also save, but we don't want to second-guess JS garbage
    // collection here.
    cache.flush();
  }

  // Create a new cache object, reload jsonFile and make sure all the expected
  // values are there.
  {
    let cache = Cc["@mozilla.org/messenger/msgFolderCache;1"].createInstance(
      Ci.nsIMsgFolderCache
    );
    // jsonFile is there now.
    Assert.ok(jsonFile.exists());
    Assert.ok(!legacyFile.exists());
    cache.init(jsonFile, legacyFile);
    // Make sure all the values we previously set are intact.
    let e1 = cache.getCacheElement("/made/up/path/Inbox", true);
    Assert.equal(e1.getCachedInt32("wibble"), 42);
    Assert.equal(e1.getCachedUInt32("pibble"), 42);
    Assert.equal(e1.getCachedInt64("foo"), 42);
    Assert.equal(e1.getCachedString("bar"), "日本語");
  }

  // clean up for next test
  jsonFile.remove(false);
});

add_task(async function test_null_entries() {
  // Write out a trivial foldercache file with a null value.
  let data = { "a-folder-key": { foo: null } };
  let jsonFilename = PathUtils.join(PathUtils.tempDir, "foo.json");
  await IOUtils.writeJSON(jsonFilename, data);

  // Load it into an msIMsgFolderCache
  let cache = Cc["@mozilla.org/messenger/msgFolderCache;1"].createInstance(
    Ci.nsIMsgFolderCache
  );
  let jsonFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  jsonFile.initWithPath(jsonFilename);
  let morkFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  morkFile.initWithPath(
    PathUtils.join(PathUtils.tempDir, "non-existent-file.dat")
  );
  cache.init(jsonFile, morkFile);

  //
  let e1 = cache.getCacheElement("a-folder-key", false);

  // Make sure all accessors convert the null appropriately.
  Assert.equal(e1.getCachedInt32("foo"), 0);
  Assert.equal(e1.getCachedUInt32("foo"), 0);
  Assert.equal(e1.getCachedInt64("foo"), 0);
  Assert.equal(e1.getCachedString("foo"), "");
});

/**
 * Test foldercache migration from mork DB (panacea.dat) to JSON.
 */
add_task(async function test_migration() {
  let profileDir = do_get_profile();
  let jsonFile = profileDir.clone();
  jsonFile.append("folderCache.json");
  let legacyFile = profileDir.clone();
  legacyFile.append("panacea.dat");

  Assert.ok(!jsonFile.exists());
  Assert.ok(!legacyFile.exists());

  // Install our test legacy file.
  do_get_file("data/panacea.dat").copyTo(profileDir, legacyFile.leafName);

  // Set up the cache.
  {
    let cache = Cc["@mozilla.org/messenger/msgFolderCache;1"].createInstance(
      Ci.nsIMsgFolderCache
    );
    cache.init(jsonFile, legacyFile);

    // Migration should have occurred.
    Assert.ok(jsonFile.exists());
    Assert.ok(!legacyFile.exists());

    // Done with the cache now.
  }

  // Compare the migrated json to the json we expect.
  let raw = await IOUtils.readUTF8(jsonFile.path);
  let got = JSON.parse(raw);

  raw = await IOUtils.readUTF8(do_get_file("data/folderCache.json").path);
  let expect = JSON.parse(raw);

  Assert.deepEqual(got, expect);

  // clean up for next test
  jsonFile.remove(false);
});

/**
 * Test foldercache migration doesn't crash with a dud panacea.dat.
 */
add_task(async function test_bad_pancea_dat() {
  let profileDir = do_get_profile();
  let jsonFile = profileDir.clone();
  jsonFile.append("folderCache.json");
  let legacyFile = profileDir.clone();
  legacyFile.append("panacea.dat");

  Assert.ok(!jsonFile.exists());
  Assert.ok(!legacyFile.exists());

  // Install our bad panacea.dat. It has only the first line - the mork magic
  // cookie - so it's valid enough for mork to open, but doesn't have
  // anything the migration is looking for.
  do_get_file("data/panacea_empty.dat").copyTo(profileDir, legacyFile.leafName);

  // Set up the cache.
  let cache = Cc["@mozilla.org/messenger/msgFolderCache;1"].createInstance(
    Ci.nsIMsgFolderCache
  );
  // init() returns OK even if migration fails - the show must go on!
  cache.init(jsonFile, legacyFile);

  // If we get this far, we didn't crash, which is good.
  // The migration should have left everything as it was.
  Assert.ok(legacyFile.exists());
  Assert.ok(!jsonFile.exists());
});
