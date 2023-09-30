/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

let { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

/** @implements {nsIExternalProtocolService} */
let mockExternalProtocolService = {
  _loadedURLs: [],
  externalProtocolHandlerExists(protocolScheme) {},
  getApplicationDescription(scheme) {},
  getProtocolHandlerInfo(protocolScheme) {},
  getProtocolHandlerInfoFromOS(protocolScheme, found) {},
  isExposedProtocol(protocolScheme) {},
  loadURI(uri, windowContext) {
    this._loadedURLs.push(uri.spec);
  },
  setProtocolHandlerDefaults(handlerInfo, osHandlerExists) {},
  urlLoaded(url) {
    let found = this._loadedURLs.includes(url);
    this._loadedURLs = this._loadedURLs.filter(e => e != url);
    return found;
  },
  QueryInterface: ChromeUtils.generateQI(["nsIExternalProtocolService"]),
};

let mockExternalProtocolServiceCID = MockRegistrar.register(
  "@mozilla.org/uriloader/external-protocol-service;1",
  mockExternalProtocolService
);

registerCleanupFunction(() => {
  MockRegistrar.unregister(mockExternalProtocolServiceCID);
});

add_task(async function test_openDefaultBrowser() {
  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      const urls = {
        // eslint-disable-next-line @microsoft/sdl/no-insecure-url
        "http://www.google.de/": true,
        "https://www.google.de/": true,
        "ftp://www.google.de/": false,
      };

      for (let [url, expected] of Object.entries(urls)) {
        let rv = null;
        try {
          await browser.windows.openDefaultBrowser(url);
          rv = true;
        } catch (e) {
          rv = false;
        }
        browser.test.assertEq(
          rv,
          expected,
          `Checking result for browser.windows.openDefaultBrowser(${url})`
        );
      }
      browser.test.sendMessage("ready", urls);
    },
  });

  await extension.startup();
  let urls = await extension.awaitMessage("ready");
  for (let [url, expected] of Object.entries(urls)) {
    Assert.equal(
      mockExternalProtocolService.urlLoaded(url),
      expected,
      `Double check result for browser.windows.openDefaultBrowser(${url})`
    );
  }

  await extension.unload();
});

add_task(async function test_focusWindows() {
  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      let listener = {
        waitingPromises: [],
        waitForEvent() {
          return new Promise(resolve => {
            listener.waitingPromises.push(resolve);
          });
        },
        checkWaiting() {
          if (listener.waitingPromises.length < 1) {
            browser.test.fail("Unexpected event fired");
          }
        },
        created(win) {
          listener.checkWaiting();
          listener.waitingPromises.shift()(["onCreated", win]);
        },
        focusChanged(windowId) {
          listener.checkWaiting();
          listener.waitingPromises.shift()(["onFocusChanged", windowId]);
        },
        removed(windowId) {
          listener.checkWaiting();
          listener.waitingPromises.shift()(["onRemoved", windowId]);
        },
      };
      browser.windows.onCreated.addListener(listener.created);
      browser.windows.onFocusChanged.addListener(listener.focusChanged);
      browser.windows.onRemoved.addListener(listener.removed);

      let firstWindow = await browser.windows.getCurrent();
      browser.test.assertEq("normal", firstWindow.type);

      let currentWindows = await browser.windows.getAll();
      browser.test.assertEq(1, currentWindows.length);
      browser.test.assertEq(firstWindow.id, currentWindows[0].id);

      // Open a new mail window.

      let createdWindowPromise = listener.waitForEvent();
      let focusChangedPromise1 = listener.waitForEvent();
      let focusChangedPromise2 = listener.waitForEvent();
      let eventName, createdWindow, windowId;

      browser.test.sendMessage("openWindow");
      [eventName, createdWindow] = await createdWindowPromise;
      browser.test.assertEq("onCreated", eventName);
      browser.test.assertEq("normal", createdWindow.type);

      [eventName, windowId] = await focusChangedPromise1;
      browser.test.assertEq("onFocusChanged", eventName);
      browser.test.assertEq(browser.windows.WINDOW_ID_NONE, windowId);

      [eventName, windowId] = await focusChangedPromise2;
      browser.test.assertEq("onFocusChanged", eventName);
      browser.test.assertEq(createdWindow.id, windowId);

      currentWindows = await browser.windows.getAll();
      browser.test.assertEq(2, currentWindows.length);
      browser.test.assertEq(firstWindow.id, currentWindows[0].id);
      browser.test.assertEq(createdWindow.id, currentWindows[1].id);

      // Focus the first window.

      let platformInfo = await browser.runtime.getPlatformInfo();

      let focusChangedPromise3;
      if (["mac", "win"].includes(platformInfo.os)) {
        // Mac and Windows don't fire this event. Pretend they do.
        focusChangedPromise3 = Promise.resolve([
          "onFocusChanged",
          browser.windows.WINDOW_ID_NONE,
        ]);
      } else {
        focusChangedPromise3 = listener.waitForEvent();
      }
      let focusChangedPromise4 = listener.waitForEvent();

      browser.test.sendMessage("switchWindows");
      [eventName, windowId] = await focusChangedPromise3;
      browser.test.assertEq("onFocusChanged", eventName);
      browser.test.assertEq(browser.windows.WINDOW_ID_NONE, windowId);

      [eventName, windowId] = await focusChangedPromise4;
      browser.test.assertEq("onFocusChanged", eventName);
      browser.test.assertEq(firstWindow.id, windowId);

      // Close the first window.

      let removedWindowPromise = listener.waitForEvent();

      browser.test.sendMessage("closeWindow");
      [eventName, windowId] = await removedWindowPromise;
      browser.test.assertEq("onRemoved", eventName);
      browser.test.assertEq(createdWindow.id, windowId);

      currentWindows = await browser.windows.getAll();
      browser.test.assertEq(1, currentWindows.length);
      browser.test.assertEq(firstWindow.id, currentWindows[0].id);

      browser.windows.onCreated.removeListener(listener.created);
      browser.windows.onFocusChanged.removeListener(listener.focusChanged);
      browser.windows.onRemoved.removeListener(listener.removed);

      browser.test.notifyPass();
    },
  });

  let account = createAccount();

  await extension.startup();

  await extension.awaitMessage("openWindow");
  let newWindowPromise = BrowserTestUtils.domWindowOpened();
  window.MsgOpenNewWindowForFolder(account.incomingServer.rootFolder.URI);
  let newWindow = await newWindowPromise;

  await extension.awaitMessage("switchWindows");
  window.focus();

  await extension.awaitMessage("closeWindow");
  newWindow.close();

  await extension.awaitFinish();
  await extension.unload();
});

add_task(async function checkTitlePreface() {
  let l10n = new Localization([
    "branding/brand.ftl",
    "messenger/extensions/popup.ftl",
  ]);

  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "content.html": `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <title>A test document</title>
          <script type="text/javascript" src="content.js"></script>
        </head>
        <body>
          <p>This is text.</p>
        </body>
        </html>
      `,
      "content.js": `
        browser.runtime.onMessage.addListener(
          (data, sender) => {
            if (data.command == "close") {
              window.close();
            }
          }
        );`,
      "utils.js": await getUtilsJS(),
      "background.js": async () => {
        let popup;

        // Test titlePreface during window creation.
        {
          let titlePreface = "PREFACE1";
          let windowCreatePromise = window.waitForEvent("windows.onCreated");
          // Do not await the create statement, but instead check if the onCreated
          // event is delayed correctly to get the correct values.
          browser.windows.create({
            titlePreface,
            url: "content.html",
            type: "popup",
            allowScriptsToClose: true,
          });
          popup = (await windowCreatePromise)[0];
          let [expectedTitle] = await window.sendMessage(
            "checkTitle",
            titlePreface
          );
          browser.test.assertEq(
            expectedTitle,
            popup.title,
            `Should find the correct title`
          );
          browser.test.assertEq(
            true,
            popup.focused,
            `Should find the correct focus state`
          );
        }

        // Test titlePreface during window update.
        {
          let titlePreface = "PREFACE2";
          let updated = await browser.windows.update(popup.id, {
            titlePreface,
          });
          let [expectedTitle] = await window.sendMessage(
            "checkTitle",
            titlePreface
          );
          browser.test.assertEq(
            expectedTitle,
            updated.title,
            `Should find the correct title`
          );
          browser.test.assertEq(
            true,
            updated.focused,
            `Should find the correct focus state`
          );
        }

        // Finish
        {
          let windowRemovePromise = window.waitForEvent("windows.onRemoved");
          browser.test.log(
            "Testing allowScriptsToClose, waiting for window to close."
          );
          await browser.runtime.sendMessage({ command: "close" });
          await windowRemovePromise;
        }

        // Test title after create without a preface.
        {
          let popup = await browser.windows.create({
            url: "content.html",
            type: "popup",
            allowScriptsToClose: true,
          });
          let [expectedTitle] = await window.sendMessage("checkTitle", "");
          browser.test.assertEq(
            expectedTitle,
            popup.title,
            `Should find the correct title`
          );
          browser.test.assertEq(
            true,
            popup.focused,
            `Should find the correct focus state`
          );
        }

        browser.test.notifyPass("finished");
      },
    },
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
    },
  });

  extension.onMessage("checkTitle", async titlePreface => {
    let win = Services.wm.getMostRecentWindow("mail:extensionPopup");

    let defaultTitle = await l10n.formatValue("extension-popup-default-title");

    let expectedTitle = titlePreface + "A test document";
    // If we're on Mac, we don't display the separator and the app name (which
    // is also used as default title).
    if (AppConstants.platform != "macosx") {
      expectedTitle += ` - ${defaultTitle}`;
    }

    Assert.equal(
      win.document.title,
      expectedTitle,
      `Check if title is as expected.`
    );
    extension.sendMessage(expectedTitle);
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});

add_task(async function test_popupLayoutProperties() {
  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "test.html": `<!DOCTYPE HTML>
        <html>
        <head>
          <title>TEST</title>
          <meta http-equiv="content-type" content="text/html; charset=utf-8">
        </head>
        <body>
        <p>Test body</p>
        </body>
        </html>`,
      "background.js": async () => {
        async function checkWindow(windowId, expected, retries = 0) {
          let win = await browser.windows.get(windowId);

          if (
            retries &&
            Object.keys(expected).some(key => expected[key] != win[key])
          ) {
            browser.test.log(
              `Got mismatched size (${JSON.stringify(
                expected
              )} != ${JSON.stringify(win)}). Retrying after a short delay.`
            );
            // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
            await new Promise(resolve => setTimeout(resolve, 200));
            return checkWindow(windowId, expected, retries - 1);
          }

          for (let [key, value] of Object.entries(expected)) {
            browser.test.assertEq(
              value,
              win[key],
              `Should find the correct updated value for ${key}`
            );
          }

          return true;
        }

        let tests = [
          { retries: 0, properties: { state: "minimized" } },
          { retries: 0, properties: { state: "maximized" } },
          { retries: 0, properties: { state: "fullscreen" } },
          {
            retries: 5,
            properties: { width: 210, height: 220, left: 90, top: 80 },
          },
        ];

        // Test create.
        for (let test of tests) {
          let win = await browser.windows.create({
            type: "popup",
            url: "test.html",
            ...test.properties,
          });
          await checkWindow(win.id, test.properties, test.retries);
          await browser.windows.remove(win.id);
        }

        // Test update.
        for (let test of tests) {
          let win = await browser.windows.create({
            type: "popup",
            url: "test.html",
          });
          await browser.windows.update(win.id, test.properties);
          await checkWindow(win.id, test.properties, test.retries);
          await browser.windows.remove(win.id);
        }

        browser.test.notifyPass();
      },
    },
    manifest: {
      background: { scripts: ["background.js"] },
    },
  });
  await extension.startup();
  await extension.awaitFinish();
  await extension.unload();
});
