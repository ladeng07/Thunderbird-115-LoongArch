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
  await ensure_table_view();
});

add_task(async function test_content_mv2() {
  let tabmail = document.getElementById("tabmail");
  let about3Pane = tabmail.currentAbout3Pane;
  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: gFolders[0].URI,
  });

  let oldPref = Services.prefs.getStringPref("mailnews.start_page.url");
  Services.prefs.setStringPref(
    "mailnews.start_page.url",
    `${URL_BASE}/content.html`
  );

  let loadPromise = BrowserTestUtils.browserLoaded(about3Pane.webBrowser);
  window.goDoCommand("cmd_goStartPage");
  await loadPromise;

  let extension = await getMenuExtension({
    manifest_version: 2,
    host_permissions: ["<all_urls>"],
  });

  await extension.startup();

  await extension.awaitMessage("menus-created");
  await subtest_content(
    extension,
    true,
    about3Pane.webBrowser,
    `${URL_BASE}/content.html`,
    {
      active: true,
      index: 0,
      mailTab: true,
    }
  );

  await extension.unload();

  Services.prefs.setStringPref("mailnews.start_page.url", oldPref);
});
add_task(async function test_content_tab_mv2() {
  let tab = window.openContentTab(`${URL_BASE}/content.html`);
  await awaitBrowserLoaded(tab.browser);

  let extension = await getMenuExtension({
    manifest_version: 2,
    host_permissions: ["<all_urls>"],
  });

  await extension.startup();
  await extension.awaitMessage("menus-created");

  await subtest_content(
    extension,
    true,
    tab.browser,
    `${URL_BASE}/content.html`,
    {
      active: true,
      index: 1,
      mailTab: false,
    }
  );

  await extension.unload();

  let tabmail = document.getElementById("tabmail");
  tabmail.closeOtherTabs(0);
});
add_task(async function test_content_window_mv2() {
  let extensionWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
  window.openDialog(
    "chrome://messenger/content/extensionPopup.xhtml",
    "_blank",
    "width=800,height=500,resizable",
    `${URL_BASE}/content.html`
  );
  let extensionWindow = await extensionWindowPromise;
  await focusWindow(extensionWindow);
  await awaitBrowserLoaded(
    extensionWindow.browser,
    url => url != "about:blank"
  );

  let extension = await getMenuExtension({
    manifest_version: 2,
    host_permissions: ["<all_urls>"],
  });

  await extension.startup();
  await extension.awaitMessage("menus-created");

  await subtest_content(
    extension,
    true,
    extensionWindow.browser,
    `${URL_BASE}/content.html`,
    {
      active: true,
      index: 0,
      mailTab: false,
    }
  );

  await extension.unload();

  await BrowserTestUtils.closeWindow(extensionWindow);
});
add_task(async function test_content_mv3() {
  let tabmail = document.getElementById("tabmail");
  let about3Pane = tabmail.currentAbout3Pane;
  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: gFolders[0].URI,
  });

  let oldPref = Services.prefs.getStringPref("mailnews.start_page.url");
  Services.prefs.setStringPref(
    "mailnews.start_page.url",
    `${URL_BASE}/content.html`
  );

  let loadPromise = BrowserTestUtils.browserLoaded(about3Pane.webBrowser);
  window.goDoCommand("cmd_goStartPage");
  await loadPromise;

  let extension = await getMenuExtension({
    manifest_version: 3,
    host_permissions: ["<all_urls>"],
  });

  await extension.startup();

  await extension.awaitMessage("menus-created");
  await subtest_content(
    extension,
    true,
    about3Pane.webBrowser,
    `${URL_BASE}/content.html`,
    {
      active: true,
      index: 0,
      mailTab: true,
    }
  );

  await extension.unload();

  Services.prefs.setStringPref("mailnews.start_page.url", oldPref);
});
add_task(async function test_content_tab_mv3() {
  let tab = window.openContentTab(`${URL_BASE}/content.html`);
  await awaitBrowserLoaded(tab.browser);

  let extension = await getMenuExtension({
    manifest_version: 3,
    host_permissions: ["<all_urls>"],
  });

  await extension.startup();
  await extension.awaitMessage("menus-created");

  await subtest_content(
    extension,
    true,
    tab.browser,
    `${URL_BASE}/content.html`,
    {
      active: true,
      index: 1,
      mailTab: false,
    }
  );

  await extension.unload();

  let tabmail = document.getElementById("tabmail");
  tabmail.closeOtherTabs(0);
});
add_task(async function test_content_window_mv3() {
  let extensionWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
  window.openDialog(
    "chrome://messenger/content/extensionPopup.xhtml",
    "_blank",
    "width=800,height=500,resizable",
    `${URL_BASE}/content.html`
  );
  let extensionWindow = await extensionWindowPromise;
  await focusWindow(extensionWindow);
  await awaitBrowserLoaded(
    extensionWindow.browser,
    url => url != "about:blank"
  );

  let extension = await getMenuExtension({
    manifest_version: 3,
    host_permissions: ["<all_urls>"],
  });

  await extension.startup();
  await extension.awaitMessage("menus-created");

  await subtest_content(
    extension,
    true,
    extensionWindow.browser,
    `${URL_BASE}/content.html`,
    {
      active: true,
      index: 0,
      mailTab: false,
    }
  );

  await extension.unload();

  await BrowserTestUtils.closeWindow(extensionWindow);
});
