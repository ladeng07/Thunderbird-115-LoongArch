/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { mailTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/MailTestUtils.jsm"
);
var { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

add_task(async () => {
  function folderTreeClick(row, event = {}) {
    EventUtils.synthesizeMouseAtCenter(
      folderTree.rows[row].querySelector(".name"),
      event,
      about3Pane
    );
  }
  function threadTreeClick(row, event = {}) {
    EventUtils.synthesizeMouseAtCenter(
      threadTree.getRowAtIndex(row),
      event,
      about3Pane
    );
  }

  /** @implements {nsIExternalProtocolService} */
  let mockExternalProtocolService = {
    QueryInterface: ChromeUtils.generateQI(["nsIExternalProtocolService"]),
    _loadedURLs: [],
    loadURI(uri, windowContext) {
      this._loadedURLs.push(uri.spec);
    },
    isExposedProtocol(scheme) {
      return true;
    },
    urlLoaded(url) {
      return this._loadedURLs.includes(url);
    },
  };

  let mockExternalProtocolServiceCID = MockRegistrar.register(
    "@mozilla.org/uriloader/external-protocol-service;1",
    mockExternalProtocolService
  );

  registerCleanupFunction(() => {
    MockRegistrar.unregister(mockExternalProtocolServiceCID);

    // Some tests that open new windows don't return focus to the main window
    // in a way that satisfies mochitest, and the test times out.
    Services.focus.focusedWindow = about3Pane;
  });

  let tabmail = document.getElementById("tabmail");
  let about3Pane = tabmail.currentAbout3Pane;
  let { folderTree, threadTree, messageBrowser } = about3Pane;
  let menu = about3Pane.document.getElementById("folderPaneContext");
  let menuItem = about3Pane.document.getElementById(
    "folderPaneContext-subscribe"
  );
  // Not `currentAboutMessage` as that's null right now.
  let aboutMessage = messageBrowser.contentWindow;
  let messagePane = aboutMessage.getMessagePaneBrowser();

  let account = MailServices.accounts.getAccount("account1");
  let rootFolder = account.incomingServer.rootFolder;
  about3Pane.displayFolder(rootFolder.URI);
  let index = about3Pane.folderTree.selectedIndex;
  Assert.equal(index, 0);

  let shownPromise = BrowserTestUtils.waitForEvent(menu, "popupshown");
  folderTreeClick(index, { type: "contextmenu" });
  await shownPromise;

  let hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  let dialogPromise = BrowserTestUtils.promiseAlertDialog(
    null,
    "chrome://messenger-newsblog/content/feed-subscriptions.xhtml",
    {
      async callback(dialogWindow) {
        let dialogDocument = dialogWindow.document;

        let list = dialogDocument.getElementById("rssSubscriptionsList");
        let locationInput = dialogDocument.getElementById("locationValue");
        let addFeedButton = dialogDocument.getElementById("addFeed");

        await BrowserTestUtils.waitForEvent(list, "select");

        EventUtils.synthesizeMouseAtCenter(locationInput, {}, dialogWindow);
        await TestUtils.waitForCondition(() => !addFeedButton.disabled);
        EventUtils.sendString(
          "https://example.org/browser/comm/mailnews/extensions/newsblog/test/browser/data/rss.xml",
          dialogWindow
        );
        EventUtils.synthesizeKey("VK_TAB", {}, dialogWindow);

        // There's no good way to know if we're ready to continue.
        await new Promise(r => dialogWindow.setTimeout(r, 250));

        let hiddenPromise = BrowserTestUtils.waitForAttribute(
          "hidden",
          addFeedButton,
          "true"
        );
        EventUtils.synthesizeMouseAtCenter(addFeedButton, {}, dialogWindow);
        await hiddenPromise;

        EventUtils.synthesizeMouseAtCenter(
          dialogDocument.querySelector("dialog").getButton("accept"),
          {},
          dialogWindow
        );
      },
    }
  );
  menu.activateItem(menuItem);
  await Promise.all([hiddenPromise, dialogPromise]);

  let folder = rootFolder.subFolders.find(f => f.name == "Test Feed");
  Assert.ok(folder);

  about3Pane.displayFolder(folder.URI);
  index = folderTree.selectedIndex;
  Assert.equal(about3Pane.threadTree.view.rowCount, 1);

  // Description mode.

  let loadedPromise = BrowserTestUtils.browserLoaded(messagePane);
  threadTreeClick(0);
  await loadedPromise;

  Assert.notEqual(messagePane.currentURI.spec, "about:blank");
  await SpecialPowers.spawn(messagePane, [], () => {
    let doc = content.document;

    let p = doc.querySelector("p");
    Assert.equal(p.textContent, "This is the description.");

    let style = content.getComputedStyle(doc.body);
    Assert.equal(style.backgroundColor, "rgba(0, 0, 0, 0)");

    let noscript = doc.querySelector("noscript");
    style = content.getComputedStyle(noscript);
    Assert.equal(style.display, "inline");
  });

  Assert.ok(
    aboutMessage.document.getElementById("expandedtoRow").hidden,
    "The To field is not visible"
  );
  Assert.equal(
    aboutMessage.document.getElementById("dateLabel").textContent,
    aboutMessage.document.getElementById("dateLabelSubject").textContent,
    "The regular date label and the subject date have the same value"
  );
  Assert.ok(
    BrowserTestUtils.is_hidden(
      aboutMessage.document.getElementById("dateLabel"),
      "The regular date label is not visible"
    )
  );
  Assert.ok(
    BrowserTestUtils.is_visible(
      aboutMessage.document.getElementById("dateLabelSubject")
    ),
    "The date label on the subject line is visible"
  );

  await BrowserTestUtils.synthesizeMouseAtCenter("a", {}, messagePane);
  Assert.deepEqual(mockExternalProtocolService._loadedURLs, [
    "https://example.org/link/from/description",
  ]);
  mockExternalProtocolService._loadedURLs.length = 0;

  // Web mode.

  loadedPromise = BrowserTestUtils.browserLoaded(
    messagePane,
    false,
    "https://example.org/browser/comm/mailnews/extensions/newsblog/test/browser/data/article.html"
  );
  window.FeedMessageHandler.onSelectPref = 0;
  await loadedPromise;

  await SpecialPowers.spawn(messagePane, [], () => {
    let doc = content.document;

    let p = doc.querySelector("p");
    Assert.equal(p.textContent, "This is the article.");

    let style = content.getComputedStyle(doc.body);
    Assert.equal(style.backgroundColor, "rgb(0, 128, 0)");

    let noscript = doc.querySelector("noscript");
    style = content.getComputedStyle(noscript);
    Assert.equal(style.display, "none");
  });
  await BrowserTestUtils.synthesizeMouseAtCenter("a", {}, messagePane);
  Assert.deepEqual(mockExternalProtocolService._loadedURLs, [
    "https://example.org/link/from/article",
  ]);
  mockExternalProtocolService._loadedURLs.length = 0;

  // Clean up.

  shownPromise = BrowserTestUtils.waitForEvent(menu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    about3Pane.folderTree.selectedRow,
    { type: "contextmenu" },
    about3Pane
  );
  await shownPromise;

  hiddenPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  let promptPromise = BrowserTestUtils.promiseAlertDialog("accept");
  menuItem = about3Pane.document.getElementById("folderPaneContext-remove");
  menu.activateItem(menuItem);
  await Promise.all([hiddenPromise, promptPromise]);

  window.FeedMessageHandler.onSelectPref = 1;

  folderTree.selectedIndex = 0;
});
