/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Avoid about:blank's non-standard behavior.
const BLANK_PAGE =
  "data:text/html;charset=utf-8,<!DOCTYPE html><title>Blank</title>Blank page";

const URL_COM_PREFIX = "https://example.com/browser/";
const URL_ORG_PREFIX = "https://example.org/browser/";
const CHROME_URL_PREFIX = "chrome://mochitests/content/browser/";
const DIR_PATH = "toolkit/components/translations/tests/browser/";
const TRANSLATIONS_TESTER_EN =
  URL_COM_PREFIX + DIR_PATH + "translations-tester-en.html";
const TRANSLATIONS_TESTER_ES =
  URL_COM_PREFIX + DIR_PATH + "translations-tester-es.html";
const TRANSLATIONS_TESTER_ES_2 =
  URL_COM_PREFIX + DIR_PATH + "translations-tester-es-2.html";
const TRANSLATIONS_TESTER_ES_DOT_ORG =
  URL_ORG_PREFIX + DIR_PATH + "translations-tester-es.html";
const TRANSLATIONS_TESTER_NO_TAG =
  URL_COM_PREFIX + DIR_PATH + "translations-tester-no-tag.html";

/**
 * The mochitest runs in the parent process. This function opens up a new tab,
 * opens up about:translations, and passes the test requirements into the content process.
 *
 * @template T
 *
 * @param {object} options
 *
 * @param {T} options.dataForContent
 * The data must support structural cloning and will be passed into the
 * content process.
 *
 * @param {(args: { dataForContent: T, selectors: Record<string, string> }) => Promise<void>} options.runInPage
 * This function must not capture any values, as it will be cloned in the content process.
 * Any required data should be passed in using the "dataForContent" parameter. The
 * "selectors" property contains any useful selectors for the content.
 *
 * @param {boolean} [options.disabled]
 * Disable the panel through a pref.
 *
 * @param {number} detectedLanguageConfidence
 * This is the value for the MockedLanguageIdEngine to give as a confidence score for
 * the mocked detected language.
 *
 * @param {string} detectedLangTag
 * This is the BCP 47 language tag for the MockedLanguageIdEngine to return as
 * the mocked detected language.
 *
 * @param {Array<{ fromLang: string, toLang: string, isBeta: boolean }>} options.languagePairs
 * The translation languages pairs to mock for the test.
 *
 * @param {Array<[string, string]>} options.prefs
 * Prefs to push on for the test.
 */
async function openAboutTranslations({
  dataForContent,
  disabled,
  runInPage,
  detectedLanguageConfidence,
  detectedLangTag,
  languagePairs = DEFAULT_LANGUAGE_PAIRS,
  prefs,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [
      // Enabled by default.
      ["browser.translations.enable", !disabled],
      ["browser.translations.logLevel", "All"],
      ...(prefs ?? []),
    ],
  });

  /**
   * Collect any relevant selectors for the page here.
   */
  const selectors = {
    pageHeader: '[data-l10n-id="about-translations-header"]',
    fromLanguageSelect: "select#language-from",
    toLanguageSelect: "select#language-to",
    translationTextarea: "textarea#translation-from",
    translationResult: "#translation-to",
    translationResultBlank: "#translation-to-blank",
    translationInfo: "#translation-info",
    noSupportMessage: "[data-l10n-id='about-translations-no-support']",
  };

  // Start the tab at a blank page.
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    BLANK_PAGE,
    true // waitForLoad
  );

  const { removeMocks, remoteClients } = await createAndMockRemoteSettings({
    languagePairs,
    // TODO(Bug 1814168) - Do not test download behavior as this is not robustly
    // handled for about:translations yet.
    autoDownloadFromRemoteSettings: true,
    detectedLangTag,
    detectedLanguageConfidence,
  });

  // Now load the about:translations page, since the actor could be mocked.
  BrowserTestUtils.loadURIString(tab.linkedBrowser, "about:translations");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  // Resolve the files.
  await remoteClients.languageIdModels.resolvePendingDownloads(1);
  // The language id and translation engine each have a wasm file, so expect 2 downloads.
  await remoteClients.translationsWasm.resolvePendingDownloads(2);
  await remoteClients.translationModels.resolvePendingDownloads(
    languagePairs.length * FILES_PER_LANGUAGE_PAIR
  );

  await ContentTask.spawn(
    tab.linkedBrowser,
    { dataForContent, selectors },
    runInPage
  );

  removeMocks();

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
}

/**
 * Naively prettify's html based on the opening and closing tags. This is not robust
 * for general usage, but should be adequate for these tests.
 * @param {string} html
 * @returns {string}
 */
function naivelyPrettify(html) {
  let result = "";
  let indent = 0;

  function addText(actualEndIndex) {
    const text = html.slice(startIndex, actualEndIndex).trim();
    if (text) {
      for (let i = 0; i < indent; i++) {
        result += "  ";
      }
      result += text + "\n";
    }
    startIndex = actualEndIndex;
  }

  let startIndex = 0;
  let endIndex = 0;
  for (; endIndex < html.length; endIndex++) {
    if (
      html[endIndex] === " " ||
      html[endIndex] === "\t" ||
      html[endIndex] === "n"
    ) {
      // Skip whitespace.
      // "   <div>foobar</div>"
      //  ^^^
      startIndex = endIndex;
      continue;
    }

    // Find all of the text.
    // "<div>foobar</div>"
    //       ^^^^^^
    while (endIndex < html.length && html[endIndex] !== "<") {
      endIndex++;
    }

    addText(endIndex);

    if (html[endIndex] === "<") {
      if (html[endIndex + 1] === "/") {
        // "<div>foobar</div>"
        //             ^
        while (endIndex < html.length && html[endIndex] !== ">") {
          endIndex++;
        }
        indent--;
        addText(endIndex + 1);
      } else {
        // "<div>foobar</div>"
        //  ^
        while (endIndex < html.length && html[endIndex] !== ">") {
          endIndex++;
        }
        // "<div>foobar</div>"
        //      ^
        addText(endIndex + 1);
        indent++;
      }
    }
  }

  return result.trim();
}

/**
 * This fake translator reports on the batching of calls by replacing the text
 * with a letter. Each call of the function moves the letter forward alphabetically.
 *
 * So consecutive calls would transform things like:
 *   "First translation" -> "aaaa aaaaaaaaa"
 *   "Second translation" -> "bbbbb bbbbbbbbb"
 *   "Third translation" -> "cccc ccccccccc"
 *
 * This can visually show what the translation batching behavior looks like.
 */
function createBatchFakeTranslator() {
  let letter = "a";
  /**
   * @param {string} message
   */
  return async function fakeTranslator(message) {
    /**
     * @param {Node} node
     */
    function transformNode(node) {
      if (typeof node.nodeValue === "string") {
        node.nodeValue = node.nodeValue.replace(/\w/g, letter);
      }
      for (const childNode of node.childNodes) {
        transformNode(childNode);
      }
    }

    const parser = new DOMParser();
    const translatedDoc = parser.parseFromString(message, "text/html");
    transformNode(translatedDoc.body);

    // "Increment" the letter.
    letter = String.fromCodePoint(letter.codePointAt(0) + 1);

    return [translatedDoc.body.innerHTML];
  };
}

/**
 * This fake translator reorders Nodes to be in alphabetical order, and then
 * uppercases the text. This allows for testing the reordering behavior of the
 * translation engine.
 *
 * @param {string} message
 */
async function reorderingTranslator(message) {
  /**
   * @param {Node} node
   */
  function transformNode(node) {
    if (typeof node.nodeValue === "string") {
      node.nodeValue = node.nodeValue.toUpperCase();
    }
    const nodes = [...node.childNodes];
    nodes.sort((a, b) =>
      (a.textContent?.trim() ?? "").localeCompare(b.textContent?.trim() ?? "")
    );
    for (const childNode of nodes) {
      childNode.remove();
    }
    for (const childNode of nodes) {
      // Re-append in sorted order.
      node.appendChild(childNode);
      transformNode(childNode);
    }
  }

  const parser = new DOMParser();
  const translatedDoc = parser.parseFromString(message, "text/html");
  transformNode(translatedDoc.body);

  return [translatedDoc.body.innerHTML];
}

/**
 * @returns {import("../../actors/TranslationsParent.sys.mjs").TranslationsParent}
 */
function getTranslationsParent() {
  return gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getActor(
    "Translations"
  );
}

/**
 * This is for tests that don't need a browser page to run.
 */
async function setupActorTest({
  languagePairs,
  prefs,
  detectedLanguageConfidence,
  detectedLangTag,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [
      // Enabled by default.
      ["browser.translations.enable", true],
      ["browser.translations.logLevel", "All"],
      ...(prefs ?? []),
    ],
  });

  const { remoteClients, removeMocks } = await createAndMockRemoteSettings({
    languagePairs,
    detectedLangTag,
    detectedLanguageConfidence,
  });

  // Create a new tab so each test gets a new actor, and doesn't re-use the old one.
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    BLANK_PAGE,
    true // waitForLoad
  );

  return {
    actor: getTranslationsParent(),
    remoteClients,
    cleanup() {
      BrowserTestUtils.removeTab(tab);
      removeMocks();
      return SpecialPowers.popPrefEnv();
    },
  };
}

/**
 * Provide some default language pairs when none are provided.
 */
const DEFAULT_LANGUAGE_PAIRS = [
  { fromLang: "en", toLang: "es", isBeta: false },
  { fromLang: "es", toLang: "en", isBeta: false },
];

async function createAndMockRemoteSettings({
  languagePairs = DEFAULT_LANGUAGE_PAIRS,
  detectedLanguageConfidence = 0.5,
  detectedLangTag = "en",
  autoDownloadFromRemoteSettings = false,
}) {
  const remoteClients = {
    translationModels: await createTranslationModelsRemoteClient(
      autoDownloadFromRemoteSettings,
      languagePairs
    ),
    translationsWasm: await createTranslationsWasmRemoteClient(
      autoDownloadFromRemoteSettings
    ),
    languageIdModels: await createLanguageIdModelsRemoteClient(
      autoDownloadFromRemoteSettings
    ),
  };

  TranslationsParent.mockTranslationsEngine(
    remoteClients.translationModels.client,
    remoteClients.translationsWasm.client
  );

  TranslationsParent.mockLanguageIdentification(
    detectedLangTag,
    detectedLanguageConfidence,
    remoteClients.languageIdModels.client
  );
  return {
    removeMocks() {
      TranslationsParent.unmockTranslationsEngine();
      TranslationsParent.unmockLanguageIdentification();
    },
    remoteClients,
  };
}

async function loadTestPage({
  languagePairs,
  autoDownloadFromRemoteSettings = false,
  detectedLanguageConfidence,
  detectedLangTag,
  page,
  prefs,
  permissionsUrls = [],
}) {
  Services.fog.testResetFOG();
  await SpecialPowers.pushPrefEnv({
    set: [
      // Enabled by default.
      ["browser.translations.enable", true],
      ["browser.translations.logLevel", "All"],
      ...(prefs ?? []),
    ],
  });
  await SpecialPowers.pushPermissions(
    permissionsUrls.map(url => ({
      type: "translations",
      allow: true,
      context: url,
    }))
  );

  // Start the tab at a blank page.
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    BLANK_PAGE,
    true // waitForLoad
  );

  const { remoteClients, removeMocks } = await createAndMockRemoteSettings({
    languagePairs,
    detectedLanguageConfidence,
    detectedLangTag,
    autoDownloadFromRemoteSettings,
  });

  BrowserTestUtils.loadURIString(tab.linkedBrowser, page);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  return {
    tab,
    remoteClients,

    /**
     * @param {number} count - Count of the language pairs expected.
     */
    async resolveDownloads(count) {
      await remoteClients.translationsWasm.resolvePendingDownloads(1);
      await remoteClients.translationModels.resolvePendingDownloads(
        FILES_PER_LANGUAGE_PAIR * count
      );
    },

    /**
     * @param {number} count - Count of the language pairs expected.
     */
    async rejectDownloads(count) {
      await remoteClients.translationsWasm.rejectPendingDownloads(1);
      await remoteClients.translationModels.rejectPendingDownloads(
        FILES_PER_LANGUAGE_PAIR * count
      );
    },

    async resolveLanguageIdDownloads() {
      await remoteClients.translationsWasm.resolvePendingDownloads(1);
      await remoteClients.languageIdModels.resolvePendingDownloads(1);
    },

    /**
     * @returns {Promise<void>}
     */
    cleanup() {
      removeMocks();
      Services.fog.testResetFOG();
      BrowserTestUtils.removeTab(tab);
      return Promise.all([
        SpecialPowers.popPrefEnv(),
        SpecialPowers.popPermissions(),
      ]);
    },

    /**
     * Runs a callback in the content page. The function's contents are serialized as
     * a string, and run in the page. The `translations-test.mjs` module is made
     * available to the page.
     *
     * @param {(TranslationsTest: import("./translations-test.mjs")) => any} callback
     * @returns {Promise<void>}
     */
    runInPage(callback) {
      // ContentTask.spawn runs the `Function.prototype.toString` on this function in
      // order to send it into the content process. The following function is doing its
      // own string manipulation in order to load in the TranslationsTest module.
      const fn = new Function(/* js */ `
        const TranslationsTest = ChromeUtils.importESModule(
          "chrome://mochitests/content/browser/toolkit/components/translations/tests/browser/translations-test.mjs"
        );

        // Pass in the values that get injected by the task runner.
        TranslationsTest.setup({Assert, ContentTaskUtils, content});

        return (${callback.toString()})(TranslationsTest);
      `);

      return ContentTask.spawn(
        tab.linkedBrowser,
        {}, // Data to inject.
        fn
      );
    },
  };
}

/**
 * Captures any reported errors in the TranslationsParent.
 *
 * @param {Function} callback
 * @returns {Array<{ error: Error, args: any[] }>}
 */
async function captureTranslationsError(callback) {
  const { reportError } = TranslationsParent;

  let errors = [];
  TranslationsParent.reportError = (error, ...args) => {
    errors.push({ error, args });
  };

  await callback();

  // Restore the original function.
  TranslationsParent.reportError = reportError;
  return errors;
}

/**
 * Load a test page and run
 * @param {Object} options - The options for `loadTestPage` plus a `runInPage` function.
 */
async function autoTranslatePage(options) {
  const { cleanup, runInPage } = await loadTestPage({
    autoDownloadFromRemoteSettings: true,
    prefs: [
      ["browser.translations.autoTranslate", true],
      ...(options.prefs ?? []),
    ],
    ...options,
  });
  await runInPage(options.runInPage);
  await cleanup();
}

/**
 * @param {RemoteSettingsClient} client
 * @param {boolean} autoDownloadFromRemoteSettings - Skip the manual download process,
 *  and automatically download the files. Normally it's preferrable to manually trigger
 *  the downloads to trigger the download behavior, but this flag lets you bypass this
 *  and automatically download the files.
 */
function createAttachmentMock(client, autoDownloadFromRemoteSettings) {
  const pendingDownloads = [];
  client.attachments.download = record =>
    new Promise((resolve, reject) => {
      console.log("Download requested:", client.collectionName, record.name);
      if (autoDownloadFromRemoteSettings) {
        resolve({ buffer: new ArrayBuffer() });
      } else {
        pendingDownloads.push({ record, resolve, reject });
      }
    });

  function resolvePendingDownloads(expectedDownloadCount) {
    info(
      `Resolving ${expectedDownloadCount} mocked downloads for "${client.collectionName}"`
    );
    return downloadHandler(expectedDownloadCount, download =>
      download.resolve({ buffer: new ArrayBuffer() })
    );
  }

  async function rejectPendingDownloads(expectedDownloadCount) {
    info(
      `Intentionally rejecting ${expectedDownloadCount} mocked downloads for "${client.collectionName}"`
    );

    // Add 1 to account for the original attempt.
    const attempts = TranslationsParent.MAX_DOWNLOAD_RETRIES + 1;
    return downloadHandler(expectedDownloadCount * attempts, download =>
      download.reject(new Error("Intentionally rejecting downloads."))
    );
  }

  async function downloadHandler(expectedDownloadCount, action) {
    const names = [];
    let maxTries = 100;
    while (names.length < expectedDownloadCount && maxTries-- > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
      let download = pendingDownloads.shift();
      if (!download) {
        // Uncomment the following to debug download issues:
        // console.log(`No pending download:`, client.collectionName, names.length);
        continue;
      }
      console.log(`Handling download:`, client.collectionName);
      action(download);
      names.push(download.record.name);
    }

    // This next check is not guaranteed to catch an unexpected download, but wait
    // at least one event loop tick to see if any more downloads were added.
    await new Promise(resolve => setTimeout(resolve, 0));

    if (pendingDownloads.length) {
      throw new Error(
        `An unexpected download was found, only expected ${expectedDownloadCount} downloads`
      );
    }

    return names.sort((a, b) => a.localeCompare(b));
  }

  async function assertNoNewDownloads() {
    await new Promise(resolve => setTimeout(resolve, 0));
    is(
      pendingDownloads.length,
      0,
      `No downloads happened for "${client.collectionName}"`
    );
  }

  return {
    client,
    pendingDownloads,
    resolvePendingDownloads,
    rejectPendingDownloads,
    assertNoNewDownloads,
  };
}

/**
 * The amount of files that are generated per mocked language pair.
 */
const FILES_PER_LANGUAGE_PAIR = 3;

/**
 * Creates a local RemoteSettingsClient for use within tests.
 *
 * @param {boolean} autoDownloadFromRemoteSettings
 * @param {Object[]} langPairs
 * @returns {RemoteSettingsClient}
 */
async function createTranslationModelsRemoteClient(
  autoDownloadFromRemoteSettings,
  langPairs
) {
  const records = [];
  for (const { fromLang, toLang, isBeta } of langPairs) {
    const lang = fromLang + toLang;
    const models = [
      { fileType: "model", name: `model.${lang}.intgemm.alphas.bin` },
      { fileType: "lex", name: `lex.50.50.${lang}.s2t.bin` },
      { fileType: "vocab", name: `vocab.${lang}.spm` },
    ];

    if (models.length !== FILES_PER_LANGUAGE_PAIR) {
      throw new Error("Files per language pair was wrong.");
    }

    for (const { fileType, name } of models) {
      records.push({
        id: crypto.randomUUID(),
        name,
        fromLang,
        toLang,
        fileType,
        version: isBeta ? "0.1" : "1.0",
        last_modified: Date.now(),
        schema: Date.now(),
      });
    }
  }

  const { RemoteSettings } = ChromeUtils.importESModule(
    "resource://services-settings/remote-settings.sys.mjs"
  );
  const client = RemoteSettings("test-translation-models");
  const metadata = {};
  await client.db.clear();
  await client.db.importChanges(metadata, Date.now(), records);

  return createAttachmentMock(client, autoDownloadFromRemoteSettings);
}

/**
 * Creates a local RemoteSettingsClient for use within tests.
 *
 * @param {boolean} autoDownloadFromRemoteSettings
 * @returns {RemoteSettingsClient}
 */
async function createTranslationsWasmRemoteClient(
  autoDownloadFromRemoteSettings
) {
  const records = ["bergamot-translator", "fasttext-wasm"].map(name => ({
    id: crypto.randomUUID(),
    name,
    version: "1.0",
    last_modified: Date.now(),
    schema: Date.now(),
  }));

  const { RemoteSettings } = ChromeUtils.importESModule(
    "resource://services-settings/remote-settings.sys.mjs"
  );
  const client = RemoteSettings("test-translations-wasm");
  const metadata = {};
  await client.db.clear();
  await client.db.importChanges(metadata, Date.now(), records);

  return createAttachmentMock(client, autoDownloadFromRemoteSettings);
}

/**
 * Creates a local RemoteSettingsClient for use within tests.
 *
 * @param {boolean} autoDownloadFromRemoteSettings
 * @returns {RemoteSettingsClient}
 */
async function createLanguageIdModelsRemoteClient(
  autoDownloadFromRemoteSettings
) {
  const records = [
    {
      id: crypto.randomUUID(),
      name: "lid.176.ftz",
      version: "1.0",
      last_modified: Date.now(),
      schema: Date.now(),
    },
  ];

  const { RemoteSettings } = ChromeUtils.importESModule(
    "resource://services-settings/remote-settings.sys.mjs"
  );
  const client = RemoteSettings("test-language-id-models");
  const metadata = {};
  await client.db.clear();
  await client.db.importChanges(metadata, Date.now(), records);

  return createAttachmentMock(client, autoDownloadFromRemoteSettings);
}

async function selectAboutPreferencesElements() {
  const document = gBrowser.selectedBrowser.contentDocument;

  const rows = await TestUtils.waitForCondition(() => {
    const elements = document.querySelectorAll(".translations-manage-language");
    if (elements.length !== 3) {
      return false;
    }
    return elements;
  }, "Waiting for manage language rows.");

  const [downloadAllRow, frenchRow, spanishRow] = rows;

  const downloadAllLabel = downloadAllRow.querySelector("label");
  const downloadAll = downloadAllRow.querySelector(
    "#translations-manage-install-all"
  );
  const deleteAll = downloadAllRow.querySelector(
    "#translations-manage-delete-all"
  );
  const frenchLabel = frenchRow.querySelector("label");
  const frenchDownload = frenchRow.querySelector(
    `[data-l10n-id="translations-manage-download-button"]`
  );
  const frenchDelete = frenchRow.querySelector(
    `[data-l10n-id="translations-manage-delete-button"]`
  );
  const spanishLabel = spanishRow.querySelector("label");
  const spanishDownload = spanishRow.querySelector(
    `[data-l10n-id="translations-manage-download-button"]`
  );
  const spanishDelete = spanishRow.querySelector(
    `[data-l10n-id="translations-manage-delete-button"]`
  );

  return {
    document,
    downloadAllLabel,
    downloadAll,
    deleteAll,
    frenchLabel,
    frenchDownload,
    frenchDelete,
    spanishLabel,
    spanishDownload,
    spanishDelete,
  };
}

function click(button, message) {
  info(message);
  if (button.hidden) {
    throw new Error("The button was hidden when trying to click it.");
  }
  button.click();
}

/**
 * @param {Object} options
 * @param {string} options.message
 * @param {Record<string, Element[]>} options.visible
 * @param {Record<string, Element[]>} options.hidden
 */
async function assertVisibility({ message, visible, hidden }) {
  info(message);
  try {
    // First wait for the condition to be met.
    await TestUtils.waitForCondition(() => {
      for (const element of Object.values(visible)) {
        if (element.hidden) {
          return false;
        }
      }
      for (const element of Object.values(hidden)) {
        if (!element.hidden) {
          return false;
        }
      }
      return true;
    });
  } catch (error) {
    // Ignore, this will get caught below.
  }
  // Now report the conditions.
  for (const [name, element] of Object.entries(visible)) {
    ok(!element.hidden, `${name} is visible.`);
  }
  for (const [name, element] of Object.entries(hidden)) {
    ok(element.hidden, `${name} is hidden.`);
  }
}

async function setupAboutPreferences(languagePairs) {
  await SpecialPowers.pushPrefEnv({
    set: [
      // Enabled by default.
      ["browser.translations.enable", true],
      ["browser.translations.logLevel", "All"],
    ],
  });
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    BLANK_PAGE,
    true // waitForLoad
  );

  const { remoteClients, removeMocks } = await createAndMockRemoteSettings({
    languagePairs,
  });

  BrowserTestUtils.loadURIString(tab.linkedBrowser, "about:preferences");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  const elements = await selectAboutPreferencesElements();

  async function cleanup() {
    gBrowser.removeCurrentTab();
    removeMocks();
    await SpecialPowers.popPrefEnv();
  }

  return {
    cleanup,
    remoteClients,
    elements,
  };
}

function waitForAppLocaleChanged() {
  new Promise(resolve => {
    function onChange() {
      Services.obs.removeObserver(onChange, "intl:app-locales-changed");
      resolve();
    }
    Services.obs.addObserver(onChange, "intl:app-locales-changed");
  });
}

async function mockLocales({ systemLocales, appLocales, webLanguages }) {
  const appLocaleChanged1 = waitForAppLocaleChanged();

  TranslationsParent.mockedSystemLocales = systemLocales;
  const { availableLocales, requestedLocales } = Services.locale;

  info("Mocking locales, so expect potential .ftl resource errors.");
  Services.locale.availableLocales = appLocales;
  Services.locale.requestedLocales = appLocales;

  await appLocaleChanged1;

  await SpecialPowers.pushPrefEnv({
    set: [["intl.accept_languages", webLanguages.join(",")]],
  });

  return async () => {
    const appLocaleChanged2 = waitForAppLocaleChanged();

    // Reset back to the originals.
    TranslationsParent.mockedSystemLocales = null;
    Services.locale.availableLocales = availableLocales;
    Services.locale.requestedLocales = requestedLocales;

    await appLocaleChanged2;

    await SpecialPowers.popPrefEnv();
  };
}

/**
 * Helpful test functions for translations telemetry
 */
class TestTranslationsTelemetry {
  /**
   * Asserts qualities about a counter telemetry metric.
   *
   * @param {string} name - The name of the metric.
   * @param {Object} counter - The Glean counter object.
   * @param {Object} expectedCount - The expected value of the counter.
   */
  static async assertCounter(name, counter, expectedCount) {
    // Ensures that glean metrics are collected from all child processes
    // so that calls to testGetValue() are up to date.
    await Services.fog.testFlushAllChildren();
    const count = counter.testGetValue() ?? 0;
    is(
      count,
      expectedCount,
      `Telemetry counter ${name} should have expected count`
    );
  }

  /**
   * Asserts qualities about an event telemetry metric.
   *
   * @param {string} name - The name of the metric.
   * @param {Object} event - The Glean event object.
   * @param {Object} expectations - The test expectations.
   * @param {number} expectations.expectedLength - The expected length of the event.
   * @param {Array<function>} [expectations.allValuePredicates=[]]
   * - An array of function predicates to assert for all event values.
   * @param {Array<function>} [expectations.finalValuePredicates=[]]
   * - An array of function predicates to assert for only the final event value.
   */
  static async assertEvent(
    name,
    event,
    { expectedLength, allValuePredicates = [], finalValuePredicates = [] }
  ) {
    // Ensures that glean metrics are collected from all child processes
    // so that calls to testGetValue() are up to date.
    await Services.fog.testFlushAllChildren();
    const values = event.testGetValue() ?? [];
    const length = values.length;

    is(
      length,
      expectedLength,
      `Telemetry event ${name} should have length ${expectedLength}`
    );

    if (allValuePredicates.length !== 0) {
      is(
        length > 0,
        true,
        `Telemetry event ${name} should contain values if allPredicates are specified`
      );
      for (const value of values) {
        for (const predicate of allValuePredicates) {
          is(
            predicate(value),
            true,
            `Telemetry event ${name} allPredicate { ${predicate.toString()} } should pass for each value`
          );
        }
      }
    }

    if (finalValuePredicates.length !== 0) {
      is(
        length > 0,
        true,
        `Telemetry event ${name} should contain values if finalPredicates are specified`
      );
      for (const predicate of finalValuePredicates) {
        is(
          predicate(values[length - 1]),
          true,
          `Telemetry event ${name} finalPredicate { ${predicate.toString()} } should pass for final value`
        );
      }
    }
  }

  /**
   * Asserts qualities about a rate telemetry metric.
   *
   * @param {string} name - The name of the metric.
   * @param {Object} rate - The Glean rate object.
   * @param {Object} expectations - The test expectations.
   * @param {number} expectations.expectedNumerator - The expected value of the numerator.
   * @param {number} expectations.expectedDenominator - The expected value of the denominator.
   */
  static async assertRate(
    name,
    rate,
    { expectedNumerator, expectedDenominator }
  ) {
    // Ensures that glean metrics are collected from all child processes
    // so that calls to testGetValue() are up to date.
    await Services.fog.testFlushAllChildren();
    const { numerator = 0, denominator = 0 } = rate.testGetValue() ?? {};
    is(
      numerator,
      expectedNumerator,
      `Telemetry rate ${name} should have expected numerator`
    );
    is(
      denominator,
      expectedDenominator,
      `Telemetry rate ${name} should have expected denominator`
    );
  }
}
