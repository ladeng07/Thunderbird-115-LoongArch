/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests the gloda folder logic.
 */

var { glodaTestHelperInitialize } = ChromeUtils.import(
  "resource://testing-common/gloda/GlodaTestHelper.jsm"
);
var { Gloda } = ChromeUtils.import("resource:///modules/gloda/GlodaPublic.jsm");
var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
var { MessageInjection } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageInjection.jsm"
);

var msgGen;
var messageInjection;

add_setup(function () {
  msgGen = new MessageGenerator();
  // Tests in this file assume that returned folders are nsIMsgFolders and not
  //  handles which currently only local injection supports.
  messageInjection = new MessageInjection({ mode: "local" }, msgGen);
  glodaTestHelperInitialize(messageInjection);
});

/**
 * Newly created folders should not be filthy (at least as long as they have
 *  nothing in them.)
 */
add_task(async function test_newly_created_folders_start_clean() {
  let msgFolder = await messageInjection.makeEmptyFolder();
  let glodaFolder = Gloda.getFolderForFolder(msgFolder);
  Assert.equal(glodaFolder.dirtyStatus, glodaFolder.kFolderClean);
});

/**
 * Deleted folders should not leave behind any mapping, and that mapping
 *  definitely should not interfere with a newly created folder of the same
 *  name.
 */
add_task(async function test_deleted_folder_tombstones_get_forgotten() {
  let oldFolder = await messageInjection.makeEmptyFolder("volver");
  let oldGlodaFolder = Gloda.getFolderForFolder(oldFolder);
  messageInjection.deleteFolder(oldFolder);

  // The tombstone needs to know it is deleted.
  Assert.ok(oldGlodaFolder._deleted);

  let newFolder = await messageInjection.makeEmptyFolder("volver");
  let newGlodaFolder = Gloda.getFolderForFolder(newFolder);

  // This folder better not be the same and better not think it is deleted.
  Assert.notEqual(oldGlodaFolder, newGlodaFolder);
  Assert.ok(!newGlodaFolder._deleted);
});
