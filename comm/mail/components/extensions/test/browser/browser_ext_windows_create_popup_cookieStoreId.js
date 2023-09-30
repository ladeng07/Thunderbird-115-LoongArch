/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

add_task(async function no_cookies_permission() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.userContext.enabled", true]],
  });

  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      await browser.test.assertRejects(
        browser.windows.create({
          type: "popup",
          cookieStoreId: "firefox-container-1",
        }),
        /No permission for cookieStoreId/,
        "cookieStoreId requires cookies permission"
      );
      browser.test.sendMessage("done");
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

add_task(async function invalid_cookieStoreId() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.userContext.enabled", true]],
  });

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["cookies"],
    },
    async background() {
      await browser.test.assertRejects(
        browser.windows.create({
          type: "popup",
          cookieStoreId: "not-firefox-container-1",
        }),
        /Illegal cookieStoreId/,
        "cookieStoreId must be valid"
      );

      await browser.test.assertRejects(
        browser.windows.create({
          type: "popup",
          cookieStoreId: "firefox-private",
        }),
        /Illegal to set private cookieStoreId in a non-private window/,
        "cookieStoreId cannot be private in a non-private window"
      );

      browser.test.sendMessage("done");
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

add_task(async function userContext_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.userContext.enabled", false]],
  });
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["tabs", "cookies"],
    },
    async background() {
      await browser.test.assertRejects(
        browser.windows.create({
          type: "popup",
          cookieStoreId: "firefox-container-1",
        }),
        /Contextual identities are currently disabled/,
        "cookieStoreId cannot be a container tab ID when contextual identities are disabled"
      );
      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
  await SpecialPowers.popPrefEnv();
});

add_task(async function valid_cookieStoreId() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.userContext.enabled", true]],
  });

  const testCases = [
    {
      description: "one URL",
      createParams: {
        type: "popup",
        url: "about:blank",
        cookieStoreId: "firefox-container-1",
      },
      expectedCookieStoreIds: ["firefox-container-1"],
      expectedExecuteScriptResult: ["about:blank - null"],
    },
    {
      description: "one URL in an array",
      createParams: {
        type: "popup",
        url: ["about:blank"],
        cookieStoreId: "firefox-container-1",
      },
      expectedCookieStoreIds: ["firefox-container-1"],
      expectedExecuteScriptResult: ["about:blank - null"],
    },
  ];

  async function background(testCases) {
    let readyTabs = new Map();
    let tabReadyCheckers = new Set();
    browser.webNavigation.onCompleted.addListener(({ url, tabId, frameId }) => {
      if (frameId === 0) {
        readyTabs.set(tabId, url);
        browser.test.log(`Detected navigation in tab ${tabId} to ${url}.`);

        for (let check of tabReadyCheckers) {
          check(tabId, url);
        }
      }
    });
    async function awaitTabReady(tabId, expectedUrl) {
      if (readyTabs.get(tabId) === expectedUrl) {
        browser.test.log(`Tab ${tabId} was ready with URL ${expectedUrl}.`);
        return;
      }
      await new Promise(resolve => {
        browser.test.log(
          `Waiting for tab ${tabId} to load URL ${expectedUrl}...`
        );
        tabReadyCheckers.add(function check(completedTabId, completedUrl) {
          if (completedTabId === tabId && completedUrl === expectedUrl) {
            tabReadyCheckers.delete(check);
            resolve();
          }
        });
      });
      browser.test.log(`Tab ${tabId} is ready with URL ${expectedUrl}.`);
    }

    async function executeScriptAndGetResult(tabId) {
      try {
        return (
          await browser.tabs.executeScript(tabId, {
            matchAboutBlank: true,
            code: "`${document.URL} - ${origin}`",
          })
        )[0];
      } catch (e) {
        return e.message;
      }
    }
    for (let {
      description,
      createParams,
      expectedCookieStoreIds,
      expectedExecuteScriptResult,
    } of testCases) {
      let win = await browser.windows.create(createParams);

      browser.test.assertEq(
        expectedCookieStoreIds.length,
        win.tabs.length,
        "Expected number of tabs"
      );

      for (let [i, expectedCookieStoreId] of Object.entries(
        expectedCookieStoreIds
      )) {
        browser.test.assertEq(
          expectedCookieStoreId,
          win.tabs[i].cookieStoreId,
          `expected cookieStoreId for tab ${i} (${description})`
        );
      }

      for (let [i, expectedResult] of Object.entries(
        expectedExecuteScriptResult
      )) {
        // Wait until the the tab can process the tabs.executeScript calls.
        // TODO: Remove this when bug 1418655 and bug 1397667 are fixed.
        let expectedUrl = Array.isArray(createParams.url)
          ? createParams.url[i]
          : createParams.url || "about:home";
        await awaitTabReady(win.tabs[i].id, expectedUrl);

        let result = await executeScriptAndGetResult(win.tabs[i].id);
        browser.test.assertEq(
          expectedResult,
          result,
          `expected executeScript result for tab ${i} (${description})`
        );
      }

      await browser.windows.remove(win.id);
    }
    browser.test.sendMessage("done");
  }
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["cookies", "webNavigation"],
    },
    background: `(${background})(${JSON.stringify(testCases)})`,
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

add_task(async function cookieStoreId_and_tabId() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.userContext.enabled", true]],
  });

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["cookies"],
    },
    async background() {
      for (let cookieStoreId of ["firefox-default", "firefox-container-1"]) {
        let { id: normalTabId } = await browser.tabs.create({ cookieStoreId });

        await browser.test.assertRejects(
          browser.windows.create({
            type: "popup",
            cookieStoreId: "firefox-container-2",
            tabId: normalTabId,
          }),
          /`tabId` may not be used in conjunction with `cookieStoreId`/,
          "Cannot use cookieStoreId for pre-existing tabs"
        );

        await browser.tabs.remove(normalTabId);
      }

      browser.test.sendMessage("done");
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});
