/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// This test must be first, since we need the actor not to be created already.
exported_symbols.testGetDirectoryTwice = async function () {
  const promise1 = navigator.storage.getDirectory();
  const promise2 = navigator.storage.getDirectory();

  await Promise.all([promise1, promise2]);

  Assert.ok(true, "Should not have thrown");
};

exported_symbols.testGetDirectoryDoesNotThrow = async function () {
  await navigator.storage.getDirectory();

  Assert.ok(true, "Should not have thrown");
};

exported_symbols.testGetDirectoryKindIsDirectory = async function () {
  const root = await navigator.storage.getDirectory();

  Assert.equal(root.kind, "directory");
};

exported_symbols.testDirectoryHandleStringConversion = async function () {
  const root = await navigator.storage.getDirectory();

  Assert.equal(
    "" + root,
    "[object FileSystemDirectoryHandle]",
    "Is directoryHandle convertible to string?"
  );
};

exported_symbols.testNewDirectoryHandleFromPrototype = async function () {
  const root = await navigator.storage.getDirectory();

  try {
    Object.create(root.prototype);
    Assert.ok(false, "Should have thrown");
  } catch (ex) {
    Assert.ok(true, "Should have thrown");
    Assert.ok(ex instanceof TypeError, "Threw the right error type");
  }
};

exported_symbols.testIsSameEntryRoot = async function () {
  const root = await navigator.storage.getDirectory();
  try {
    await root.move(root);
    Assert.ok(false, "root should not be movable");
  } catch (ex) {
    Assert.ok(true, "root isn't movable");
  }
};

exported_symbols.testDirectoryHandleSupportsKeysIterator = async function () {
  const root = await navigator.storage.getDirectory();

  const it = await root.keys();
  Assert.ok(!!it, "Does root support keys iterator?");
};

exported_symbols.testKeysIteratorNextIsCallable = async function () {
  const root = await navigator.storage.getDirectory();

  const it = await root.keys();
  Assert.ok(!!it, "Does root support keys iterator?");

  const item = await it.next();
  Assert.ok(!!item, "Should return an item");
};

exported_symbols.testDirectoryHandleSupportsValuesIterator = async function () {
  const root = await navigator.storage.getDirectory();

  const it = await root.values();
  Assert.ok(!!it, "Does root support values iterator?");
};

exported_symbols.testValuesIteratorNextIsCallable = async function () {
  const root = await navigator.storage.getDirectory();

  const it = await root.values();
  Assert.ok(!!it, "Does root support values iterator?");

  const item = await it.next();
  Assert.ok(!!item, "Should return an item");
};

exported_symbols.testDirectoryHandleSupportsEntriesIterator =
  async function () {
    const root = await navigator.storage.getDirectory();

    const it = await root.entries();
    Assert.ok(!!it, "Does root support entries iterator?");
  };

exported_symbols.testEntriesIteratorNextIsCallable = async function () {
  const root = await navigator.storage.getDirectory();

  const it = await root.entries();
  Assert.ok(!!it, "Does root support entries iterator?");

  const item = await it.next();
  Assert.ok(!!item, "Should return an item");
};

exported_symbols.testGetFileHandleIsCallable = async function () {
  const root = await navigator.storage.getDirectory();
  const allowCreate = { create: true };

  const item = await root.getFileHandle("fileName", allowCreate);
  Assert.ok(!!item, "Should return an item");
};

exported_symbols.testGetDirectoryHandleIsCallable = async function () {
  const root = await navigator.storage.getDirectory();
  const allowCreate = { create: true };

  const item = await root.getDirectoryHandle("dirName", allowCreate);
  Assert.ok(!!item, "Should return an item");
};

exported_symbols.testRemoveEntryIsCallable = async function () {
  const root = await navigator.storage.getDirectory();
  const removeOptions = { recursive: true };

  await root.removeEntry("fileName", removeOptions);
  await root.removeEntry("dirName", removeOptions);
  try {
    await root.removeEntry("doesNotExist", removeOptions);
    Assert.ok(false, "Should have thrown");
  } catch (ex) {
    Assert.ok(true, "Should have thrown");
    Assert.equal(
      ex.message,
      "Entry not found",
      "Threw the right error message"
    );
  }
};

exported_symbols.testResolveIsCallable = async function () {
  const root = await navigator.storage.getDirectory();
  const allowCreate = { create: true };
  const item = await root.getFileHandle("fileName", allowCreate);

  let path = await root.resolve(item);
  Assert.equal(path.length, 1);
  Assert.equal(path[0], "fileName", "Resolve got the right path");
};

exported_symbols.testFileType = async function () {
  const root = await navigator.storage.getDirectory();
  const allowCreate = { create: true };
  const nameStem = "testFileType";
  const empty = "";

  const extensions = [
    "txt",
    "jS",
    "JSON",
    "css",
    "html",
    "htm",
    "xhtml",
    "xml",
    "xhtml+xml",
    "png",
    "apng",
    "jPg",
    "Jpeg",
    "pdF",
    "out",
    "sh",
    "ExE",
    "psid",
    "EXE ",
    " EXE",
    "EX\uff65",
    "\udbff\udbff\udbff",
    "\udc00\udc00\udc00",
    "js\udbff",
    "\udc00js",
    "???",
    "\root",
    empty,
    "AXS",
    "dll",
    "ocx",
    "1",
    "ps1",
    "cmd",
    "xpi",
    "swf",
  ];

  const expectedTypes = [
    "text/plain",
    "application/javascript",
    "application/json",
    "text/css",
    "text/html",
    "text/html",
    "application/xhtml+xml",
    "text/xml",
    empty,
    "image/png",
    "image/apng",
    "image/jpeg",
    "image/jpeg",
    "application/pdf",
    empty,
    "application/x-sh",
    "application/octet-stream",
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    "application/olescript",
    "application/x-msdownload",
    "application/octet-stream",
    empty,
    empty,
    "text/plain",
    "application/x-xpinstall",
    "application/x-shockwave-flash",
  ];

  Assert.equal(extensions.length, expectedTypes.length);

  await Promise.all(
    extensions.map(async (ext, i) => {
      const fileName = nameStem + "." + ext;
      const fileHandle = await root.getFileHandle(fileName, allowCreate);
      const fileObject = await fileHandle.getFile();
      Assert.equal(fileObject.name, fileHandle.name);
      Assert.equal(fileObject.type, expectedTypes[i]);
    })
  );
};

exported_symbols.testContentTypeChangesOnMove = async function () {
  const allowCreate = { create: true };
  const root = await navigator.storage.getDirectory();
  const oldName = "testFile.txt";
  const oldType = "text/plain";
  const subdir = await root.getDirectoryHandle("subdir", allowCreate);

  const testName = "testFile.json";
  const testType = "application/json";

  const fileHandle = await root.getFileHandle(oldName, allowCreate);

  async function checkMove(newName, newType) {
    Assert.equal(fileHandle.name, newName, "Has filename changed?");
    {
      const fileObject = await fileHandle.getFile();
      Assert.equal(fileObject.name, newName, "Is the fileobject renamed?");
      Assert.equal(fileObject.type, newType, "Is the fileobject type updated?");
    }
  }

  // No name change
  await checkMove(oldName, oldType);
  await fileHandle.move(subdir);
  await checkMove(oldName, oldType);
  await fileHandle.move(root, oldName);
  await checkMove(oldName, oldType);

  // With name change

  async function testMoveCall(...combo) {
    await fileHandle.move(...combo);
    await checkMove(testName, testType);
    await fileHandle.move(root, oldName);
    await checkMove(oldName, oldType);
  }

  await testMoveCall(subdir, testName);
  await testMoveCall(root, testName);
  await testMoveCall(testName);
};

for (const [key, value] of Object.entries(exported_symbols)) {
  Object.defineProperty(value, "name", {
    value: key,
    writable: false,
  });
}
