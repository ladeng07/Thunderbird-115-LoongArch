/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Sticky logic only needs to test the general sticky logic plus any filters
 *  with custom propagateState implementations (currently: tags, text filter.)
 */

"use strict";

var {
  assert_messages_in_view,
  be_in_folder,
  close_tab,
  create_folder,
  get_about_3pane,
  make_message_sets_in_folders,
  mc,
  open_folder_in_new_tab,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var {
  assert_constraints_expressed,
  assert_filter_text,
  assert_tag_constraints_visible,
  clear_constraints,
  set_filter_text,
  toggle_boolean_constraints,
  toggle_tag_constraints,
  toggle_quick_filter_bar,
  cleanup_qfb_button,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/QuickFilterBarHelpers.jsm"
);

add_setup(async function () {
  // Quick filter bar is hidden by default, need to toggle it on. To toggle
  // quick filter bar, we need to be inside folder
  const folder = await create_folder("QuickFilterBarFilterStickySetup");
  await be_in_folder(folder);
  await ensure_table_view();
  await toggle_quick_filter_bar();

  registerCleanupFunction(async () => {
    await ensure_cards_view();
    await cleanup_qfb_button();
    // Quick filter bar is hidden by default, need to toggle it off.
    await toggle_quick_filter_bar();
  });
});

/**
 * Persist the current settings through folder change and inherit into a new tab.
 */
add_task(async function test_sticky_basics() {
  let folderOne = await create_folder("QuickFilterBarStickyBasics1");
  let [unreadOne, readOne] = await make_message_sets_in_folders(
    [folderOne],
    [{ count: 1 }, { count: 1 }]
  );
  readOne.setRead(true);

  let folderTwo = await create_folder("QuickFilterBarStickyBasics2");
  let [unreadTwo, readTwo] = await make_message_sets_in_folders(
    [folderTwo],
    [{ count: 1 }, { count: 1 }]
  );
  readTwo.setRead(true);

  // -- setup
  await be_in_folder(folderOne);
  toggle_boolean_constraints("sticky", "unread");
  assert_messages_in_view(unreadOne);

  // -- change folders
  await be_in_folder(folderTwo);
  assert_constraints_expressed({ sticky: true, unread: true });
  assert_messages_in_view(unreadTwo);

  // -- inherit into a new folder
  // TODO: Reimplement this behaviour.
  // let tabB = await open_folder_in_new_tab(folderOne);
  // assert_constraints_expressed({ sticky: true, unread: true });
  // assert_messages_in_view(unreadOne);

  // close_tab(tabB);
  teardownTest();
});

/**
 * The semantics of sticky tags are not obvious; there were decisions involved:
 * - If the user has the tag facet enabled but not explicitly filtered on
 *   specific tags then we propagate just "true" to cause the faceting to
 *   run in the new folder.  In other words, the list of displayed tags should
 *   change.
 * - If the user has filtered on specific tags, then we do and must propagate
 *   the list of tags.
 *
 * We only need to do folder changes from here on out since the logic is
 *  identical (and tested to be identical in |test_sticky_basics|).
 */
add_task(async function test_sticky_tags() {
  let folderOne = await create_folder("QuickFilterBarStickyTags1");
  let folderTwo = await create_folder("QuickFilterBarStickyTags2");
  const tagA = "$label1",
    tagB = "$label2",
    tagC = "$label3";
  let [, setTagA1, setTagB1] = await make_message_sets_in_folders(
    [folderOne],
    [{ count: 1 }, { count: 1 }, { count: 1 }]
  );
  let [, setTagA2, setTagC2] = await make_message_sets_in_folders(
    [folderTwo],
    [{ count: 1 }, { count: 1 }, { count: 1 }]
  );
  setTagA1.addTag(tagA);
  setTagB1.addTag(tagB);
  setTagA2.addTag(tagA);
  setTagC2.addTag(tagC);

  await be_in_folder(folderOne);
  toggle_boolean_constraints("sticky", "tags");
  assert_tag_constraints_visible(tagA, tagB);
  assert_messages_in_view([setTagA1, setTagB1]);

  // -- re-facet when we change folders since constraint was just true
  await be_in_folder(folderTwo);
  assert_tag_constraints_visible(tagA, tagC);
  assert_messages_in_view([setTagA2, setTagC2]);

  // -- do not re-facet since tag A was selected
  toggle_tag_constraints(tagA);
  await be_in_folder(folderOne);
  assert_tag_constraints_visible(tagA, tagC);
  assert_messages_in_view([setTagA1]);

  // -- if we turn off sticky, make sure that things clear when we change
  //     folders.  (we had a bug with this before.)
  toggle_boolean_constraints("sticky");
  await be_in_folder(folderTwo);
  assert_constraints_expressed({});
  teardownTest();
});

/**
 * All we are testing propagating is the text value; the text states are always
 *  propagated and that is tested in test-filter-logic.js by
 *  |test_filter_text_constraints_propagate|.
 */
add_task(async function test_sticky_text() {
  let folderOne = await create_folder("QuickFilterBarStickyText1");
  let folderTwo = await create_folder("QuickFilterBarStickyText2");

  await be_in_folder(folderOne);
  toggle_boolean_constraints("sticky");
  set_filter_text("foo");

  await be_in_folder(folderTwo);
  assert_filter_text("foo");
  teardownTest();
});

function teardownTest() {
  clear_constraints();
}
