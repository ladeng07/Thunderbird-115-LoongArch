/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. *
 */

// Load subscript shared with all menu tests.
Services.scriptloader.loadSubScript(
  new URL("head_menus.js", gTestPath).href,
  this
);

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
    return this._loadedURLs.includes(url);
  },
  QueryInterface: ChromeUtils.generateQI(["nsIExternalProtocolService"]),
};

let mockExternalProtocolServiceCID = MockRegistrar.register(
  "@mozilla.org/uriloader/external-protocol-service;1",
  mockExternalProtocolService
);

add_setup(async () => {
  let account = createAccount();
  let rootFolder = account.incomingServer.rootFolder;
  let subFolders = rootFolder.subFolders;
  createMessages(subFolders[0], 10);

  let about3Pane = document.getElementById("tabmail").currentAbout3Pane;
  about3Pane.restoreState({
    folderPaneVisible: true,
    folderURI: subFolders[0],
    messagePaneVisible: true,
  });
  about3Pane.threadTree.selectedIndex = 0;
  await awaitBrowserLoaded(
    about3Pane.messageBrowser.contentWindow.getMessagePaneBrowser()
  );
});

registerCleanupFunction(() => {
  MockRegistrar.unregister(mockExternalProtocolServiceCID);
});

const subtest_clickOpenInBrowserContextMenu = async (extension, getBrowser) => {
  async function contextClick(elementSelector, browser) {
    await awaitBrowserLoaded(browser, url => url != "about:blank");

    let menuId = browser.getAttribute("context");
    let menu = browser.ownerGlobal.top.document.getElementById(menuId);
    let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
    await rightClickOnContent(menu, elementSelector, browser);
    Assert.ok(
      menu.querySelector("#browserContext-openInBrowser"),
      "menu item should exist"
    );
    menu.activateItem(menu.querySelector("#browserContext-openInBrowser"));
    await hiddenPromise;
  }

  await extension.startup();

  // Wait for click on #description
  {
    let { elementSelector, url } = await extension.awaitMessage("contextClick");
    Assert.equal(
      "#description",
      elementSelector,
      `Test should click on the correct element.`
    );
    Assert.equal(
      "https://example.org/browser/comm/mail/components/extensions/test/browser/data/content.html",
      url,
      `Test should open the correct page.`
    );
    await contextClick(elementSelector, getBrowser());
    Assert.ok(
      mockExternalProtocolService.urlLoaded(url),
      `Page should have correctly been opened in external browser.`
    );
    await extension.sendMessage();
  }

  await extension.awaitFinish();
  await extension.unload();
};

add_task(async function test_tabs() {
  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "utils.js": await getUtilsJS(),
      "background.js": async () => {
        // Open remote file and re-open it in the browser.
        const url =
          "https://example.org/browser/comm/mail/components/extensions/test/browser/data/content.html";
        const elementSelector = "#description";

        let testTab = await browser.tabs.create({ url });
        await window.sendMessage("contextClick", { elementSelector, url });
        await browser.tabs.remove(testTab.id);

        browser.test.notifyPass();
      },
    },
    manifest: {
      background: {
        scripts: ["utils.js", "background.js"],
      },
      permissions: ["tabs"],
    },
  });

  await subtest_clickOpenInBrowserContextMenu(
    extension,
    () => document.getElementById("tabmail").currentTabInfo.browser
  );
});

add_task(async function test_windows() {
  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "utils.js": await getUtilsJS(),
      "background.js": async () => {
        // Open remote file and re-open it in the browser.
        const url =
          "https://example.org/browser/comm/mail/components/extensions/test/browser/data/content.html";
        const elementSelector = "#description";

        let testWindow = await browser.windows.create({ type: "popup", url });
        await window.sendMessage("contextClick", { elementSelector, url });
        await browser.windows.remove(testWindow.id);

        browser.test.notifyPass();
      },
    },
    manifest: {
      background: {
        scripts: ["utils.js", "background.js"],
      },
      permissions: ["tabs"],
    },
  });

  await subtest_clickOpenInBrowserContextMenu(
    extension,
    () => Services.wm.getMostRecentWindow("mail:extensionPopup").browser
  );
});

add_task(async function test_mail3pane() {
  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "utils.js": await getUtilsJS(),
      "background.js": async () => {
        // Open remote file and re-open it in the browser.
        const url =
          "https://example.org/browser/comm/mail/components/extensions/test/browser/data/content.html";
        const elementSelector = "#description";

        let mailTabs = await browser.tabs.query({ type: "mail" });
        browser.test.assertEq(
          1,
          mailTabs.length,
          "Should find a single mailTab"
        );
        await browser.tabs.update(mailTabs[0].id, { url });
        await window.sendMessage("contextClick", { elementSelector, url });

        browser.test.notifyPass();
      },
    },
    manifest: {
      background: {
        scripts: ["utils.js", "background.js"],
      },
      permissions: ["tabs"],
    },
  });

  await subtest_clickOpenInBrowserContextMenu(
    extension,
    () => document.getElementById("tabmail").currentTabInfo.browser
  );
});
