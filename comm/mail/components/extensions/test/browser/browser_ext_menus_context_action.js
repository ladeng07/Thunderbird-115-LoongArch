/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Load subscript shared with all menu tests.
Services.scriptloader.loadSubScript(
  new URL("head_menus.js", gTestPath).href,
  this
);

let gAccount, gFolders, gMessage;
add_setup(async () => {
  await Services.search.init();

  gAccount = createAccount();
  addIdentity(gAccount);
  gFolders = gAccount.incomingServer.rootFolder.subFolders;
  createMessages(gFolders[0], {
    count: 1,
    body: {
      contentType: "text/html",
      body: await fetch(`${URL_BASE}/content.html`).then(r => r.text()),
    },
  });
  gMessage = [...gFolders[0].messages][0];

  document.getElementById("tabmail").currentAbout3Pane.restoreState({
    folderPaneVisible: true,
    folderURI: gAccount.incomingServer.rootFolder.URI,
  });

  await enforceState({
    mail: ["write-message", "spacer", "search-bar", "spacer"],
  });
  registerCleanupFunction(async () => {
    await enforceState({});
  });
});

async function subtest_action_menu(
  testWindow,
  target,
  expectedInfo,
  expectedTab,
  manifest
) {
  function checkVisibility(menu, visible) {
    let removeExtension = menu.querySelector(
      ".customize-context-removeExtension"
    );
    let manageExtension = menu.querySelector(
      ".customize-context-manageExtension"
    );

    info(`Check visibility: ${visible}`);
    is(!removeExtension.hidden, visible, "Remove Extension should be visible");
    is(!manageExtension.hidden, visible, "Manage Extension should be visible");
  }

  async function testContextMenuRemoveExtension(extension, menu, element) {
    let name = "Generated extension";
    let brand = Services.strings
      .createBundle("chrome://branding/locale/brand.properties")
      .GetStringFromName("brandShorterName");

    info(
      `Choosing 'Remove Extension' in ${menu.id} should show confirm dialog.`
    );
    await rightClick(menu, element);
    await extension.awaitMessage("onShown");
    let removeExtension = menu.querySelector(
      ".customize-context-removeExtension"
    );
    let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
    let promptPromise = BrowserTestUtils.promiseAlertDialog(
      undefined,
      undefined,
      {
        async callback(promptWindow) {
          await TestUtils.waitForCondition(
            () => Services.focus.activeWindow == promptWindow,
            "waiting for prompt to become active"
          );

          let promptDocument = promptWindow.document;
          // Check if the correct add-on is being removed.
          is(promptDocument.title, `Remove ${name}?`);
          if (
            !Services.prefs.getBoolPref("prompts.windowPromptSubDialog", false)
          ) {
            is(
              promptDocument.getElementById("infoBody").textContent,
              `Remove ${name} as well as its configuration and data from ${brand}?`
            );
          }
          let acceptButton = promptDocument
            .querySelector("dialog")
            .getButton("accept");
          is(acceptButton.label, "Remove");
          EventUtils.synthesizeMouseAtCenter(acceptButton, {}, promptWindow);
        },
      }
    );
    menu.activateItem(removeExtension);
    await hiddenPromise;
    await promptPromise;
  }

  async function testContextMenuManageExtension(extension, menu, element) {
    let id = "menus@mochi.test";
    let tabmail = window.document.getElementById("tabmail");

    info(
      `Choosing 'Manage Extension' in ${menu.id} should load the management page.`
    );
    await rightClick(menu, element);
    await extension.awaitMessage("onShown");
    let manageExtension = menu.querySelector(
      ".customize-context-manageExtension"
    );
    let addonManagerPromise = contentTabOpenPromise(tabmail, "about:addons");
    menu.activateItem(manageExtension);
    let managerTab = await addonManagerPromise;

    // Check the UI to make sure that the correct view is loaded.
    let managerWindow = managerTab.linkedBrowser.contentWindow;
    is(
      managerWindow.gViewController.currentViewId,
      `addons://detail/${encodeURIComponent(id)}`,
      "Expected extension details view in about:addons"
    );
    // In HTML about:addons, the default view does not show the inline
    // options browser, so we should not receive an "options-loaded" event.
    // (if we do, the test will fail due to the unexpected message).

    is(managerTab.linkedBrowser.currentURI.spec, "about:addons");
    tabmail.closeTab(managerTab);
  }

  let extension = await getMenuExtension(manifest);

  await extension.startup();
  await extension.awaitMessage("menus-created");

  let element = testWindow.document.querySelector(target.elementSelector);
  let menu = testWindow.document.getElementById(target.menuId);

  await rightClick(menu, element);
  await checkVisibility(menu, true);
  await checkShownEvent(
    extension,
    { menuIds: [target.context], contexts: [target.context, "all"] },
    expectedTab
  );

  let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  let clickedPromise = checkClickedEvent(extension, expectedInfo, expectedTab);
  menu.activateItem(
    menu.querySelector(`#menus_mochi_test-menuitem-_${target.context}`)
  );
  await clickedPromise;
  await hiddenPromise;

  // Test the non actionButton element for visibility of the management menu entries.
  if (target.nonActionButtonSelector) {
    let nonActionButtonElement = testWindow.document.querySelector(
      target.nonActionButtonSelector
    );
    await rightClick(menu, nonActionButtonElement);
    await checkVisibility(menu, false);
    let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
    menu.hidePopup();
    await hiddenPromise;
  }

  await testContextMenuManageExtension(extension, menu, element);
  await testContextMenuRemoveExtension(extension, menu, element);
  await extension.unload();
}
add_task(async function test_browser_action_menu_mv2() {
  await subtest_action_menu(
    window,
    {
      menuId: "unifiedToolbarMenu",
      elementSelector: `.unified-toolbar [extension="menus@mochi.test"]`,
      context: "browser_action",
      nonActionButtonSelector: `.unified-toolbar .write-message button`,
    },
    {
      menuItemId: "browser_action",
    },
    { active: true, index: 0, mailTab: true },
    {
      manifest_version: 2,
      browser_action: {
        default_title: "This is a test",
      },
    }
  );
});
add_task(async function test_message_display_action_menu_pane_mv2() {
  let tab = await openMessageInTab(gMessage);
  // No check for menu entries in nonActionButtonElements as the header-toolbar
  // does not have a context menu associated.
  await subtest_action_menu(
    tab.chromeBrowser.contentWindow,
    {
      menuId: "header-toolbar-context-menu",
      elementSelector: "#menus_mochi_test-messageDisplayAction-toolbarbutton",
      context: "message_display_action",
    },
    {
      pageUrl: /^mailbox\:/,
      menuItemId: "message_display_action",
    },
    { active: true, index: 1, mailTab: false },
    {
      manifest_version: 2,
      message_display_action: {
        default_title: "This is a test",
      },
    }
  );
  window.document.getElementById("tabmail").closeTab(tab);
});
add_task(async function test_message_display_action_menu_window_mv2() {
  let testWindow = await openMessageInWindow(gMessage);
  await focusWindow(testWindow);
  // No check for menu entries in nonActionButtonElements as the header-toolbar
  // does not have a context menu associated.
  await subtest_action_menu(
    testWindow.messageBrowser.contentWindow,
    {
      menuId: "header-toolbar-context-menu",
      elementSelector: "#menus_mochi_test-messageDisplayAction-toolbarbutton",
      context: "message_display_action",
    },
    {
      pageUrl: /^mailbox\:/,
      menuItemId: "message_display_action",
    },
    { active: true, index: 0, mailTab: false },
    {
      manifest_version: 2,
      message_display_action: {
        default_title: "This is a test",
      },
    }
  );
  await BrowserTestUtils.closeWindow(testWindow);
});
add_task(async function test_compose_action_menu_mv2() {
  let testWindow = await openComposeWindow(gAccount);
  await focusWindow(testWindow);
  await subtest_action_menu(
    testWindow,
    {
      menuId: "toolbar-context-menu",
      elementSelector: "#menus_mochi_test-composeAction-toolbarbutton",
      context: "compose_action",
      nonActionButtonSelector: "#button-attach",
    },
    {
      pageUrl: "about:blank?compose",
      menuItemId: "compose_action",
    },
    { active: true, index: 0, mailTab: false },
    {
      manifest_version: 2,
      compose_action: {
        default_title: "This is a test",
      },
    }
  );
  await BrowserTestUtils.closeWindow(testWindow);
});
add_task(async function test_compose_action_menu_formattoolbar_mv2() {
  let testWindow = await openComposeWindow(gAccount);
  await focusWindow(testWindow);
  await subtest_action_menu(
    testWindow,
    {
      menuId: "format-toolbar-context-menu",
      elementSelector: "#menus_mochi_test-composeAction-toolbarbutton",
      context: "compose_action",
    },
    {
      pageUrl: "about:blank?compose",
      menuItemId: "compose_action",
    },
    { active: true, index: 0, mailTab: false },
    {
      manifest_version: 2,
      compose_action: {
        default_title: "This is a test",
        default_area: "formattoolbar",
      },
    }
  );
  await BrowserTestUtils.closeWindow(testWindow);
});

add_task(async function test_browser_action_menu_mv3() {
  await subtest_action_menu(
    window,
    {
      menuId: "unifiedToolbarMenu",
      elementSelector: `.unified-toolbar [extension="menus@mochi.test"]`,
      context: "action",
      nonActionButtonSelector: `.unified-toolbar .write-message button`,
    },
    {
      menuItemId: "action",
    },
    { active: true, index: 0, mailTab: true },
    {
      manifest_version: 3,
      action: {
        default_title: "This is a test",
      },
    }
  );
});
add_task(async function test_message_display_action_menu_pane_mv3() {
  let tab = await openMessageInTab(gMessage);
  // No check for menu entries in nonActionButtonElements as the header-toolbar
  // does not have a context menu associated.
  await subtest_action_menu(
    tab.chromeBrowser.contentWindow,
    {
      menuId: "header-toolbar-context-menu",
      elementSelector: "#menus_mochi_test-messageDisplayAction-toolbarbutton",
      context: "message_display_action",
    },
    {
      pageUrl: /^mailbox\:/,
      menuItemId: "message_display_action",
    },
    { active: true, index: 1, mailTab: false },
    {
      manifest_version: 3,
      message_display_action: {
        default_title: "This is a test",
      },
    }
  );
  window.document.getElementById("tabmail").closeTab(tab);
});
add_task(async function test_message_display_action_menu_window_mv3() {
  let testWindow = await openMessageInWindow(gMessage);
  await focusWindow(testWindow);
  // No check for menu entries in nonActionButtonElements as the header-toolbar
  // does not have a context menu associated.
  await subtest_action_menu(
    testWindow.messageBrowser.contentWindow,
    {
      menuId: "header-toolbar-context-menu",
      elementSelector: "#menus_mochi_test-messageDisplayAction-toolbarbutton",
      context: "message_display_action",
    },
    {
      pageUrl: /^mailbox\:/,
      menuItemId: "message_display_action",
    },
    { active: true, index: 0, mailTab: false },
    {
      manifest_version: 3,
      message_display_action: {
        default_title: "This is a test",
      },
    }
  );
  await BrowserTestUtils.closeWindow(testWindow);
});
add_task(async function test_compose_action_menu_mv3() {
  let testWindow = await openComposeWindow(gAccount);
  await focusWindow(testWindow);
  await subtest_action_menu(
    testWindow,
    {
      menuId: "toolbar-context-menu",
      elementSelector: "#menus_mochi_test-composeAction-toolbarbutton",
      context: "compose_action",
      nonActionButtonSelector: "#button-attach",
    },
    {
      pageUrl: "about:blank?compose",
      menuItemId: "compose_action",
    },
    { active: true, index: 0, mailTab: false },
    {
      manifest_version: 3,
      compose_action: {
        default_title: "This is a test",
      },
    }
  );
  await BrowserTestUtils.closeWindow(testWindow);
});
add_task(async function test_compose_action_menu_formattoolbar_mv3() {
  let testWindow = await openComposeWindow(gAccount);
  await focusWindow(testWindow);
  await subtest_action_menu(
    testWindow,
    {
      menuId: "format-toolbar-context-menu",
      elementSelector: "#menus_mochi_test-composeAction-toolbarbutton",
      context: "compose_action",
    },
    {
      pageUrl: "about:blank?compose",
      menuItemId: "compose_action",
    },
    { active: true, index: 0, mailTab: false },
    {
      manifest_version: 3,
      compose_action: {
        default_title: "This is a test",
        default_area: "formattoolbar",
      },
    }
  );
  await BrowserTestUtils.closeWindow(testWindow);
});
