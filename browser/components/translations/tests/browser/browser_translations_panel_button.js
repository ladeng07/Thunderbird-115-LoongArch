/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that the translations button is correctly visible when navigating between pages.
 */
add_task(async function test_button_visible_navigation() {
  info("Start at a page in Spanish.");
  const { cleanup } = await loadTestPage({
    page: SPANISH_PAGE_URL,
    languagePairs: LANGUAGE_PAIRS,
  });

  await assertTranslationsButton(
    { button: true },
    "The button should be visible since the page can be translated from Spanish."
  );

  navigate(ENGLISH_PAGE_URL, "Navigate to an English page.");

  await assertTranslationsButton(
    { button: false },
    "The button should be invisible since the page is in English."
  );

  navigate(SPANISH_PAGE_URL, "Navigate back to a Spanish page.");

  await assertTranslationsButton(
    { button: true },
    "The button should be visible again since the page is in Spanish."
  );

  await cleanup();
});

/**
 * Test that the translations button is correctly visible when opening and switch tabs.
 */
add_task(async function test_button_visible() {
  info("Start at a page in Spanish.");

  const { cleanup, tab: spanishTab } = await loadTestPage({
    page: SPANISH_PAGE_URL,
    languagePairs: LANGUAGE_PAIRS,
  });

  await assertTranslationsButton(
    { button: true },
    "The button should be visible since the page can be translated from Spanish."
  );

  const { removeTab, tab: englishTab } = await addTab(
    ENGLISH_PAGE_URL,
    "Creating a new tab for a page in English."
  );

  await assertTranslationsButton(
    { button: false },
    "The button should be invisible since the tab is in English."
  );

  await switchTab(spanishTab);

  await assertTranslationsButton(
    { button: true },
    "The button should be visible again since the page is in Spanish."
  );

  await switchTab(englishTab);

  await assertTranslationsButton(
    { button: false },
    "Don't show for english pages"
  );

  await removeTab();
  await cleanup();
});
