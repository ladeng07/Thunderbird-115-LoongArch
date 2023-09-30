/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals synthesizeMouseAtCenterAndRetry, awaitBrowserLoaded */

"use strict";

const { ExtensionPermissions } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionPermissions.sys.mjs"
);

const { mailTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/MailTestUtils.jsm"
);

const treeClick = mailTestUtils.treeClick.bind(null, EventUtils, window);

var URL_BASE =
  "http://mochi.test:8888/browser/comm/mail/components/extensions/test/browser/data";

/**
 * Left-click on something and wait for the context menu to appear.
 * For elements in the parent process only.
 *
 * @param {Element} menu - The <menu> that should appear.
 * @param {Element} element - The element to be clicked on.
 * @returns {Promise} A promise that resolves when the menu appears.
 */
function leftClick(menu, element) {
  let shownPromise = BrowserTestUtils.waitForEvent(menu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(element, {}, element.ownerGlobal);
  return shownPromise;
}
/**
 * Right-click on something and wait for the context menu to appear.
 * For elements in the parent process only.
 *
 * @param {Element} menu - The <menu> that should appear.
 * @param {Element} element - The element to be clicked on.
 * @returns {Promise} A promise that resolves when the menu appears.
 */
function rightClick(menu, element) {
  let shownPromise = BrowserTestUtils.waitForEvent(menu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    element,
    { type: "contextmenu" },
    element.ownerGlobal
  );
  return shownPromise;
}

/**
 * Right-click on something in a content document and wait for the context
 * menu to appear.
 *
 * @param {Element} menu - The <menu> that should appear.
 * @param {string} selector - CSS selector of the element to be clicked on.
 * @param {Element} browser - <browser> containing the element.
 * @returns {Promise} A promise that resolves when the menu appears.
 */
async function rightClickOnContent(menu, selector, browser) {
  let shownPromise = BrowserTestUtils.waitForEvent(menu, "popupshown");
  await synthesizeMouseAtCenterAndRetry(
    selector,
    { type: "contextmenu" },
    browser
  );
  return shownPromise;
}

/**
 * Check the parameters of a browser.onShown event was fired.
 *
 * @see mail/components/extensions/schemas/menus.json
 *
 * @param extension
 * @param {object} expectedInfo
 * @param {Array?} expectedInfo.menuIds
 * @param {Array?} expectedInfo.contexts
 * @param {Array?} expectedInfo.attachments
 * @param {object?} expectedInfo.displayedFolder
 * @param {object?} expectedInfo.selectedFolder
 * @param {Array?} expectedInfo.selectedMessages
 * @param {RegExp?} expectedInfo.pageUrl
 * @param {string?} expectedInfo.selectionText
 * @param {object} expectedTab
 * @param {boolean} expectedTab.active
 * @param {integer} expectedTab.index
 * @param {boolean} expectedTab.mailTab
 */
async function checkShownEvent(extension, expectedInfo, expectedTab) {
  let [info, tab] = await extension.awaitMessage("onShown");
  Assert.deepEqual(info.menuIds, expectedInfo.menuIds);
  Assert.deepEqual(info.contexts, expectedInfo.contexts);

  Assert.equal(
    !!info.attachments,
    !!expectedInfo.attachments,
    "attachments in info"
  );
  if (expectedInfo.attachments) {
    Assert.equal(info.attachments.length, expectedInfo.attachments.length);
    for (let i = 0; i < expectedInfo.attachments.length; i++) {
      Assert.equal(info.attachments[i].name, expectedInfo.attachments[i].name);
      Assert.equal(info.attachments[i].size, expectedInfo.attachments[i].size);
    }
  }

  for (let infoKey of ["displayedFolder", "selectedFolder"]) {
    Assert.equal(
      !!info[infoKey],
      !!expectedInfo[infoKey],
      `${infoKey} in info`
    );
    if (expectedInfo[infoKey]) {
      Assert.equal(info[infoKey].accountId, expectedInfo[infoKey].accountId);
      Assert.equal(info[infoKey].path, expectedInfo[infoKey].path);
      Assert.ok(Array.isArray(info[infoKey].subFolders));
    }
  }

  Assert.equal(
    !!info.selectedMessages,
    !!expectedInfo.selectedMessages,
    "selectedMessages in info"
  );
  if (expectedInfo.selectedMessages) {
    Assert.equal(info.selectedMessages.id, null);
    Assert.equal(
      info.selectedMessages.messages.length,
      expectedInfo.selectedMessages.messages.length
    );
    for (let i = 0; i < expectedInfo.selectedMessages.messages.length; i++) {
      Assert.equal(
        info.selectedMessages.messages[i].subject,
        expectedInfo.selectedMessages.messages[i].subject
      );
    }
  }

  Assert.equal(!!info.pageUrl, !!expectedInfo.pageUrl, "pageUrl in info");
  if (expectedInfo.pageUrl) {
    if (typeof expectedInfo.pageUrl == "string") {
      Assert.equal(info.pageUrl, expectedInfo.pageUrl);
    } else {
      Assert.ok(info.pageUrl.match(expectedInfo.pageUrl));
    }
  }

  Assert.equal(
    !!info.selectionText,
    !!expectedInfo.selectionText,
    "selectionText in info"
  );
  if (expectedInfo.selectionText) {
    Assert.equal(info.selectionText, expectedInfo.selectionText);
  }

  Assert.equal(tab.active, expectedTab.active, "tab is active");
  Assert.equal(tab.index, expectedTab.index, "tab index");
  Assert.equal(tab.mailTab, expectedTab.mailTab, "tab is mailTab");
}

/**
 * Check the parameters of a browser.onClicked event was fired.
 *
 * @see mail/components/extensions/schemas/menus.json
 *
 * @param extension
 * @param {object} expectedInfo
 * @param {string?} expectedInfo.selectionText
 * @param {string?} expectedInfo.linkText
 * @param {RegExp?} expectedInfo.pageUrl
 * @param {RegExp?} expectedInfo.linkUrl
 * @param {RegExp?} expectedInfo.srcUrl
 * @param {object} expectedTab
 * @param {boolean} expectedTab.active
 * @param {integer} expectedTab.index
 * @param {boolean} expectedTab.mailTab
 */
async function checkClickedEvent(extension, expectedInfo, expectedTab) {
  let [info, tab] = await extension.awaitMessage("onClicked");

  Assert.equal(info.selectionText, expectedInfo.selectionText, "selectionText");
  Assert.equal(info.linkText, expectedInfo.linkText, "linkText");
  if (expectedInfo.menuItemId) {
    Assert.equal(info.menuItemId, expectedInfo.menuItemId, "menuItemId");
  }

  for (let infoKey of ["pageUrl", "linkUrl", "srcUrl"]) {
    Assert.equal(
      !!info[infoKey],
      !!expectedInfo[infoKey],
      `${infoKey} in info`
    );
    if (expectedInfo[infoKey]) {
      if (typeof expectedInfo[infoKey] == "string") {
        Assert.equal(info[infoKey], expectedInfo[infoKey]);
      } else {
        Assert.ok(info[infoKey].match(expectedInfo[infoKey]));
      }
    }
  }

  Assert.equal(tab.active, expectedTab.active, "tab is active");
  Assert.equal(tab.index, expectedTab.index, "tab index");
  Assert.equal(tab.mailTab, expectedTab.mailTab, "tab is mailTab");
}

async function getMenuExtension(manifest) {
  let details = {
    files: {
      "background.js": async () => {
        let contexts = [
          "audio",
          "compose_action",
          "compose_action_menu",
          "message_display_action",
          "message_display_action_menu",
          "editable",
          "frame",
          "image",
          "link",
          "page",
          "password",
          "selection",
          "tab",
          "video",
          "message_list",
          "folder_pane",
          "compose_attachments",
          "compose_body",
          "tools_menu",
        ];
        if (browser.runtime.getManifest().manifest_version > 2) {
          contexts.push("action", "action_menu");
        } else {
          contexts.push("browser_action", "browser_action_menu");
        }

        for (let context of contexts) {
          browser.menus.create({
            id: context,
            title: context,
            contexts: [context],
          });
        }

        browser.menus.onShown.addListener((...args) => {
          browser.test.sendMessage("onShown", args);
        });

        browser.menus.onClicked.addListener((...args) => {
          browser.test.sendMessage("onClicked", args);
        });
        browser.test.sendMessage("menus-created");
      },
    },
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: "menus@mochi.test",
        },
      },
      background: { scripts: ["background.js"] },
      ...manifest,
    },
    useAddonManager: "temporary",
  };

  if (!details.manifest.permissions) {
    details.manifest.permissions = [];
  }
  details.manifest.permissions.push("menus");
  console.log(JSON.stringify(details, 2));
  let extension = ExtensionTestUtils.loadExtension(details);
  if (details.manifest.host_permissions) {
    // MV3 has to manually grant the requested permission.
    await ExtensionPermissions.add("menus@mochi.test", {
      permissions: [],
      origins: details.manifest.host_permissions,
    });
  }
  return extension;
}

async function subtest_content(
  extension,
  extensionHasPermission,
  browser,
  pageUrl,
  tab
) {
  await awaitBrowserLoaded(browser, url => url != "about:blank");

  let menuId = browser.getAttribute("context");
  let ownerDocument;
  if (browser.ownerGlobal.parent.location.href == "about:3pane") {
    ownerDocument = browser.ownerGlobal.parent.document;
  } else if (menuId == "browserContext") {
    ownerDocument = browser.ownerGlobal.top.document;
  } else {
    ownerDocument = browser.ownerDocument;
  }
  let menu = ownerDocument.getElementById(menuId);

  await synthesizeMouseAtCenterAndRetry("body", {}, browser);

  info("Test a part of the page with no content.");

  await rightClickOnContent(menu, "body", browser);
  Assert.ok(menu.querySelector("#menus_mochi_test-menuitem-_page"));
  let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  menu.hidePopup();
  await hiddenPromise;
  // Sometimes, the popup will open then instantly disappear. It seems to
  // still be hiding after the previous appearance. If we wait a little bit,
  // this doesn't happen.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, 250));

  await checkShownEvent(
    extension,
    {
      menuIds: ["page"],
      contexts: ["page", "all"],
      pageUrl: extensionHasPermission ? pageUrl : undefined,
    },
    tab
  );

  info("Test selection.");

  await SpecialPowers.spawn(browser, [], () => {
    let text = content.document.querySelector("p");
    content.getSelection().selectAllChildren(text);
  });
  await rightClickOnContent(menu, "p", browser);
  Assert.ok(menu.querySelector("#menus_mochi_test-menuitem-_selection"));
  await checkShownEvent(
    extension,
    {
      pageUrl: extensionHasPermission ? pageUrl : undefined,
      selectionText: extensionHasPermission ? "This is text." : undefined,
      menuIds: ["selection"],
      contexts: ["selection", "all"],
    },
    tab
  );

  hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  let clickedPromise = checkClickedEvent(
    extension,
    {
      pageUrl,
      selectionText: "This is text.",
    },
    tab
  );
  menu.activateItem(
    menu.querySelector("#menus_mochi_test-menuitem-_selection")
  );
  await clickedPromise;
  await hiddenPromise;

  // Sometimes, the popup will open then instantly disappear. It seems to
  // still be hiding after the previous appearance. If we wait a little bit,
  // this doesn't happen.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, 250));

  await synthesizeMouseAtCenterAndRetry("body", {}, browser); // Select nothing.

  info("Test link.");

  await rightClickOnContent(menu, "a", browser);
  Assert.ok(menu.querySelector("#menus_mochi_test-menuitem-_link"));
  await checkShownEvent(
    extension,
    {
      pageUrl: extensionHasPermission ? pageUrl : undefined,
      menuIds: ["link"],
      contexts: ["link", "all"],
    },
    tab
  );

  hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  clickedPromise = checkClickedEvent(
    extension,
    {
      pageUrl,
      linkUrl: "http://mochi.test:8888/",
      linkText: "This is a link with text.",
    },
    tab
  );
  menu.activateItem(menu.querySelector("#menus_mochi_test-menuitem-_link"));
  await clickedPromise;
  await hiddenPromise;
  // Sometimes, the popup will open then instantly disappear. It seems to
  // still be hiding after the previous appearance. If we wait a little bit,
  // this doesn't happen.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, 250));

  info("Test image.");

  await rightClickOnContent(menu, "img", browser);
  Assert.ok(menu.querySelector("#menus_mochi_test-menuitem-_image"));
  await checkShownEvent(
    extension,
    {
      pageUrl: extensionHasPermission ? pageUrl : undefined,
      menuIds: ["image"],
      contexts: ["image", "all"],
    },
    tab
  );

  hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  clickedPromise = checkClickedEvent(
    extension,
    {
      pageUrl,
      srcUrl: `${URL_BASE}/tb-logo.png`,
    },
    tab
  );
  menu.activateItem(menu.querySelector("#menus_mochi_test-menuitem-_image"));
  await clickedPromise;
  await hiddenPromise;
  // Sometimes, the popup will open then instantly disappear. It seems to
  // still be hiding after the previous appearance. If we wait a little bit,
  // this doesn't happen.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, 250));
}

async function openExtensionSubMenu(menu) {
  // The extension submenu ends with a number, which increases over time, but it
  // does not have a underscore.
  let submenu;
  for (let item of menu.querySelectorAll("[id^=menus_mochi_test-menuitem-]")) {
    if (!item.id.includes("-_")) {
      submenu = item;
      break;
    }
  }
  Assert.ok(submenu, `Found submenu: ${submenu.id}`);

  // Open submenu.
  let submenuPromise = BrowserTestUtils.waitForEvent(menu, "popupshown");
  submenu.openMenu(true);
  await submenuPromise;

  return submenu;
}

async function subtest_compose_body(
  extension,
  extensionHasPermission,
  browser,
  pageUrl,
  tab
) {
  await awaitBrowserLoaded(browser, url => url != "about:blank");

  let ownerDocument = browser.ownerDocument;
  let menu = ownerDocument.getElementById(browser.getAttribute("context"));

  await synthesizeMouseAtCenterAndRetry("body", {}, browser);

  info("Test a part of the page with no content.");
  {
    await rightClickOnContent(menu, "body", browser);
    Assert.ok(menu.querySelector(`#menus_mochi_test-menuitem-_compose_body`));
    Assert.ok(menu.querySelector(`#menus_mochi_test-menuitem-_editable`));
    let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
    menu.hidePopup();
    await hiddenPromise;
    // Sometimes, the popup will open then instantly disappear. It seems to
    // still be hiding after the previous appearance. If we wait a little bit,
    // this doesn't happen.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 250));

    await checkShownEvent(
      extension,
      {
        menuIds: ["editable", "compose_body"],
        contexts: ["editable", "compose_body", "all"],
        pageUrl: extensionHasPermission ? pageUrl : undefined,
      },
      tab
    );
  }

  info("Test selection.");
  {
    await SpecialPowers.spawn(browser, [], () => {
      let text = content.document.querySelector("p");
      content.getSelection().selectAllChildren(text);
    });

    await rightClickOnContent(menu, "p", browser);
    let submenu = await openExtensionSubMenu(menu);

    await checkShownEvent(
      extension,
      {
        pageUrl: extensionHasPermission ? pageUrl : undefined,
        selectionText: extensionHasPermission ? "This is text." : undefined,
        menuIds: ["editable", "selection", "compose_body"],
        contexts: ["editable", "selection", "compose_body", "all"],
      },
      tab
    );
    Assert.ok(submenu.querySelector("#menus_mochi_test-menuitem-_selection"));
    Assert.ok(
      submenu.querySelector("#menus_mochi_test-menuitem-_compose_body")
    );
    Assert.ok(submenu.querySelector("#menus_mochi_test-menuitem-_editable"));

    let hiddenPromise = BrowserTestUtils.waitForEvent(submenu, "popuphidden");
    let clickedPromise = checkClickedEvent(
      extension,
      {
        pageUrl,
        selectionText: "This is text.",
      },
      tab
    );
    menu.activateItem(
      submenu.querySelector("#menus_mochi_test-menuitem-_selection")
    );
    await clickedPromise;
    await hiddenPromise;

    // Sometimes, the popup will open then instantly disappear. It seems to
    // still be hiding after the previous appearance. If we wait a little bit,
    // this doesn't happen.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 250));
    await synthesizeMouseAtCenterAndRetry("body", {}, browser); // Select nothing.
  }

  info("Test link.");
  {
    await rightClickOnContent(menu, "a", browser);
    let submenu = await openExtensionSubMenu(menu);

    await checkShownEvent(
      extension,
      {
        pageUrl: extensionHasPermission ? pageUrl : undefined,
        menuIds: ["editable", "link", "compose_body"],
        contexts: ["editable", "link", "compose_body", "all"],
      },
      tab
    );
    Assert.ok(submenu.querySelector("#menus_mochi_test-menuitem-_link"));
    Assert.ok(submenu.querySelector("#menus_mochi_test-menuitem-_editable"));
    Assert.ok(
      submenu.querySelector("#menus_mochi_test-menuitem-_compose_body")
    );

    let hiddenPromise = BrowserTestUtils.waitForEvent(submenu, "popuphidden");
    let clickedPromise = checkClickedEvent(
      extension,
      {
        pageUrl,
        linkUrl: "http://mochi.test:8888/",
        linkText: "This is a link with text.",
      },
      tab
    );
    menu.activateItem(
      submenu.querySelector("#menus_mochi_test-menuitem-_link")
    );
    await clickedPromise;
    await hiddenPromise;

    // Sometimes, the popup will open then instantly disappear. It seems to
    // still be hiding after the previous appearance. If we wait a little bit,
    // this doesn't happen.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 250));
    await synthesizeMouseAtCenterAndRetry("body", {}, browser); // Select nothing.
  }

  info("Test image.");
  {
    await rightClickOnContent(menu, "img", browser);
    let submenu = await openExtensionSubMenu(menu);

    await checkShownEvent(
      extension,
      {
        pageUrl: extensionHasPermission ? pageUrl : undefined,
        menuIds: ["editable", "image", "compose_body"],
        contexts: ["editable", "image", "compose_body", "all"],
      },
      tab
    );
    Assert.ok(submenu.querySelector("#menus_mochi_test-menuitem-_image"));
    Assert.ok(submenu.querySelector("#menus_mochi_test-menuitem-_editable"));
    Assert.ok(
      submenu.querySelector("#menus_mochi_test-menuitem-_compose_body")
    );

    let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
    let clickedPromise = checkClickedEvent(
      extension,
      {
        pageUrl,
        srcUrl: `${URL_BASE}/tb-logo.png`,
      },
      tab
    );
    menu.activateItem(
      submenu.querySelector("#menus_mochi_test-menuitem-_image")
    );
    await clickedPromise;
    await hiddenPromise;

    // Sometimes, the popup will open then instantly disappear. It seems to
    // still be hiding after the previous appearance. If we wait a little bit,
    // this doesn't happen.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 250));
    await synthesizeMouseAtCenterAndRetry("body", {}, browser); // Select nothing.
  }
}

// Test UI elements which have been made accessible for the menus API.
// Assumed to be run after subtest_content, so we know everything has finished
// loading.
async function subtest_element(
  extension,
  extensionHasPermission,
  element,
  pageUrl,
  tab
) {
  for (let selectedTest of [false, true]) {
    element.focus();
    if (selectedTest) {
      element.value = "This is selected text.";
      element.select();
    } else {
      element.value = "";
    }

    let event = await rightClick(element.ownerGlobal, element);
    let menu = event.target;
    let trigger = menu.triggerNode;
    let menuitem = menu.querySelector("#menus_mochi_test-menuitem-_editable");
    Assert.equal(
      element.id,
      trigger.id,
      "Contextmenu of correct element has been triggered."
    );
    Assert.equal(
      menuitem.id,
      "menus_mochi_test-menuitem-_editable",
      "Contextmenu includes menu."
    );

    await checkShownEvent(
      extension,
      {
        menuIds: selectedTest ? ["editable", "selection"] : ["editable"],
        contexts: selectedTest
          ? ["editable", "selection", "all"]
          : ["editable", "all"],
        pageUrl: extensionHasPermission ? pageUrl : undefined,
        selectionText:
          extensionHasPermission && selectedTest
            ? "This is selected text."
            : undefined,
      },
      tab
    );

    // With text being selected, there will be two "context" entries in an
    // extension submenu. Open the submenu.
    let submenu = null;
    if (selectedTest) {
      for (let foundMenu of menu.querySelectorAll(
        "[id^='menus_mochi_test-menuitem-']"
      )) {
        if (!foundMenu.id.startsWith("menus_mochi_test-menuitem-_")) {
          submenu = foundMenu;
        }
      }
      Assert.ok(submenu, "Submenu found.");
      let submenuPromise = BrowserTestUtils.waitForEvent(
        element.ownerGlobal,
        "popupshown"
      );
      submenu.openMenu(true);
      await submenuPromise;
    }

    let hiddenPromise = BrowserTestUtils.waitForEvent(
      element.ownerGlobal,
      "popuphidden"
    );
    let clickedPromise = checkClickedEvent(
      extension,
      {
        pageUrl,
        selectionText: selectedTest ? "This is selected text." : undefined,
      },
      tab
    );
    if (submenu) {
      submenu.menupopup.activateItem(menuitem);
    } else {
      menu.activateItem(menuitem);
    }
    await clickedPromise;
    await hiddenPromise;

    // Sometimes, the popup will open then instantly disappear. It seems to
    // still be hiding after the previous appearance. If we wait a little bit,
    // this doesn't happen.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 250));
  }
}
