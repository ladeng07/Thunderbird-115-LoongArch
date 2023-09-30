/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);

let folderA, messagesA, folderB, messagesB;

add_setup(async function () {
  let tabmail = document.getElementById("tabmail");
  if (tabmail.tabInfo.length > 1) {
    info(`Will close ${tabmail.tabInfo.length - 1} tabs left over from others`);
    for (let i = tabmail.tabInfo.length - 1; i > 0; i--) {
      tabmail.closeTab(i);
    }
  }
  Assert.equal(tabmail.tabInfo.length, 1, "should be set up with one tab");

  let generator = new MessageGenerator();

  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  let rootFolder = account.incomingServer.rootFolder;

  rootFolder.createSubfolder("mailTabsA", null);
  folderA = rootFolder
    .getChildNamed("mailTabsA")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderA.addMessageBatch(
    generator.makeMessages({ count: 5 }).map(message => message.toMboxString())
  );
  messagesA = [...folderA.messages];

  rootFolder.createSubfolder("mailTabsB", null);
  folderB = rootFolder
    .getChildNamed("mailTabsB")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderB.addMessageBatch(
    generator.makeMessages({ count: 2 }).map(message => message.toMboxString())
  );
  messagesB = [...folderB.messages];

  registerCleanupFunction(() => {
    MailServices.accounts.removeAccount(account, false);
  });
});

add_task(async function testTabs() {
  let tabmail = document.getElementById("tabmail");
  Assert.equal(tabmail.tabInfo.length, 1, "should start off with one tab open");
  Assert.equal(tabmail.currentTabInfo, tabmail.tabInfo[0], "should show tab0");

  // Check the first tab.

  let firstTab = tabmail.currentTabInfo;
  Assert.equal(firstTab.mode.name, "mail3PaneTab");
  Assert.equal(firstTab.mode.tabType.name, "mailTab");

  let firstChromeBrowser = firstTab.chromeBrowser;
  Assert.equal(firstChromeBrowser.currentURI.spec, "about:3pane");
  Assert.equal(tabmail.currentAbout3Pane, firstChromeBrowser.contentWindow);

  let firstMessageBrowser =
    firstChromeBrowser.contentDocument.getElementById("messageBrowser");
  Assert.equal(firstMessageBrowser.currentURI.spec, "about:message");

  let firstMessagePane =
    firstMessageBrowser.contentDocument.getElementById("messagepane");
  Assert.equal(firstMessagePane.currentURI.spec, "about:blank");
  Assert.equal(
    tabmail.currentAboutMessage,
    null,
    "currentAboutMessage should be null with no message selected"
  );
  Assert.equal(firstTab.browser, null);
  Assert.equal(firstTab.linkedBrowser, null);

  let { folderTree, threadTree, messagePane, paneLayout } =
    firstChromeBrowser.contentWindow;

  firstTab.folder = folderA;
  Assert.equal(firstTab.folder, folderA);
  Assert.equal(
    folderTree.querySelector(".selected .name").textContent,
    "mailTabsA"
  );
  Assert.equal(threadTree.view.rowCount, 5);
  Assert.equal(threadTree.selectedIndex, -1);

  Assert.equal(firstTab.message, null);
  threadTree.selectedIndex = 0;
  Assert.equal(
    tabmail.currentAboutMessage,
    firstMessageBrowser.contentWindow,
    "currentAboutMessage should have a value with a message selected"
  );
  Assert.equal(firstTab.message, messagesA[0]);
  Assert.equal(firstTab.browser, firstMessagePane);
  Assert.equal(firstTab.linkedBrowser, firstMessagePane);

  Assert.ok(BrowserTestUtils.is_visible(folderTree));
  Assert.ok(BrowserTestUtils.is_visible(firstMessageBrowser));

  paneLayout.folderPaneVisible = false;
  Assert.ok(BrowserTestUtils.is_hidden(folderTree));
  Assert.ok(BrowserTestUtils.is_visible(firstMessageBrowser));

  paneLayout.messagePaneVisible = false;
  Assert.ok(BrowserTestUtils.is_hidden(folderTree));
  Assert.ok(BrowserTestUtils.is_hidden(firstMessageBrowser));
  Assert.equal(
    tabmail.currentAboutMessage,
    null,
    "currentAboutMessage should be null with the message pane hidden"
  );
  Assert.equal(firstTab.browser, null);
  Assert.equal(firstTab.linkedBrowser, null);

  paneLayout.folderPaneVisible = true;
  Assert.ok(BrowserTestUtils.is_visible(folderTree));
  Assert.ok(BrowserTestUtils.is_hidden(firstMessageBrowser));

  paneLayout.messagePaneVisible = true;
  Assert.ok(BrowserTestUtils.is_visible(folderTree));
  Assert.ok(BrowserTestUtils.is_visible(firstMessageBrowser));
  Assert.equal(
    tabmail.currentAboutMessage,
    firstMessageBrowser.contentWindow,
    "currentAboutMessage should have a value with the message pane shown"
  );
  Assert.equal(firstTab.browser, firstMessagePane);
  Assert.equal(firstTab.linkedBrowser, firstMessagePane);

  Assert.equal(firstChromeBrowser.contentWindow.tabOrWindow, firstTab);
  Assert.equal(firstMessageBrowser.contentWindow.tabOrWindow, firstTab);

  // Select multiple messages.

  let firstMultiMessageBrowser =
    firstChromeBrowser.contentDocument.getElementById("multiMessageBrowser");
  let firstWebBrowser =
    firstChromeBrowser.contentDocument.getElementById("webBrowser");

  threadTree.selectedIndices = [1, 2];
  Assert.ok(BrowserTestUtils.is_hidden(firstWebBrowser));
  Assert.ok(BrowserTestUtils.is_hidden(firstMessageBrowser));
  Assert.ok(BrowserTestUtils.is_visible(firstMultiMessageBrowser));
  Assert.equal(
    tabmail.currentAboutMessage,
    null,
    "currentAboutMessage should be null with multiple messages selected"
  );
  Assert.equal(firstTab.browser, null);
  Assert.equal(firstTab.linkedBrowser, null);

  // Load a web page.

  let loadedPromise = BrowserTestUtils.browserLoaded(
    firstWebBrowser,
    false,
    "http://mochi.test:8888/"
  );
  messagePane.displayWebPage("http://mochi.test:8888/");
  await loadedPromise;
  Assert.ok(BrowserTestUtils.is_visible(firstWebBrowser));
  Assert.ok(BrowserTestUtils.is_hidden(firstMessageBrowser));
  Assert.ok(BrowserTestUtils.is_hidden(firstMultiMessageBrowser));
  Assert.equal(firstWebBrowser.currentURI.spec, "http://mochi.test:8888/");
  Assert.equal(
    tabmail.currentAboutMessage,
    null,
    "currentAboutMessage should be null with a web page loaded"
  );
  Assert.equal(firstTab.browser, firstWebBrowser);
  Assert.equal(firstTab.linkedBrowser, firstWebBrowser);

  // Go back to a single selection.

  threadTree.selectedIndex = 0;
  Assert.ok(BrowserTestUtils.is_hidden(firstWebBrowser));
  Assert.ok(BrowserTestUtils.is_visible(firstMessageBrowser));
  Assert.ok(BrowserTestUtils.is_hidden(firstMultiMessageBrowser));
  Assert.equal(
    tabmail.currentAboutMessage,
    firstMessageBrowser.contentWindow,
    "currentAboutMessage should have a value with a single message selected"
  );
  Assert.equal(firstTab.browser, firstMessagePane);
  Assert.equal(firstTab.linkedBrowser, firstMessagePane);

  // Open some more tabs. These should open in the background.

  window.MsgOpenNewTabForFolders([folderB], {
    folderPaneVisible: true,
    messagePaneVisible: true,
  });

  for (let message of messagesB) {
    window.OpenMessageInNewTab(message, {});
  }

  Assert.equal(tabmail.tabInfo.length, 4);
  Assert.equal(tabmail.currentTabInfo, firstTab);
  Assert.equal(tabmail.currentAbout3Pane, firstChromeBrowser.contentWindow);
  Assert.equal(tabmail.currentAboutMessage, firstMessageBrowser.contentWindow);

  // Check the second tab.

  tabmail.switchToTab(1);
  Assert.equal(tabmail.currentTabInfo, tabmail.tabInfo[1]);

  let secondTab = tabmail.currentTabInfo;
  Assert.equal(secondTab.mode.name, "mail3PaneTab");
  Assert.equal(secondTab.mode.tabType.name, "mailTab");

  let secondChromeBrowser = secondTab.chromeBrowser;
  await ensureBrowserLoaded(secondChromeBrowser);
  Assert.equal(secondChromeBrowser.currentURI.spec, "about:3pane");
  Assert.equal(tabmail.currentAbout3Pane, secondChromeBrowser.contentWindow);

  let secondMessageBrowser =
    secondChromeBrowser.contentDocument.getElementById("messageBrowser");
  await ensureBrowserLoaded(secondMessageBrowser);
  Assert.equal(secondMessageBrowser.currentURI.spec, "about:message");

  let secondMessagePane =
    secondMessageBrowser.contentDocument.getElementById("messagepane");
  Assert.equal(secondMessagePane.currentURI.spec, "about:blank");
  Assert.equal(
    tabmail.currentAboutMessage,
    null,
    "currentAboutMessage should be null with no message selected"
  );
  Assert.equal(secondTab.browser, null);
  Assert.equal(secondTab.linkedBrowser, null);

  Assert.equal(secondTab.folder, folderB);

  secondChromeBrowser.contentWindow.threadTree.selectedIndex = 0;
  Assert.equal(
    tabmail.currentAboutMessage,
    secondMessageBrowser.contentWindow,
    "currentAboutMessage should have a value with a message selected"
  );

  Assert.equal(secondChromeBrowser.contentWindow.tabOrWindow, secondTab);
  Assert.equal(secondMessageBrowser.contentWindow.tabOrWindow, secondTab);

  // Check the third tab.

  tabmail.switchToTab(2);
  Assert.equal(tabmail.currentTabInfo, tabmail.tabInfo[2]);

  let thirdTab = tabmail.currentTabInfo;
  Assert.equal(thirdTab.mode.name, "mailMessageTab");
  Assert.equal(thirdTab.mode.tabType.name, "mailTab");

  let thirdChromeBrowser = thirdTab.chromeBrowser;
  await ensureBrowserLoaded(thirdChromeBrowser);
  Assert.equal(thirdChromeBrowser.currentURI.spec, "about:message");
  Assert.equal(tabmail.currentAbout3Pane, null);
  Assert.equal(tabmail.currentAboutMessage, thirdChromeBrowser.contentWindow);

  let thirdMessagePane =
    thirdChromeBrowser.contentDocument.getElementById("messagepane");
  Assert.equal(thirdMessagePane.currentURI.spec, messageToURL(messagesB[0]));
  Assert.equal(thirdTab.browser, thirdMessagePane);
  Assert.equal(thirdTab.linkedBrowser, thirdMessagePane);

  Assert.equal(thirdTab.folder, folderB);
  Assert.equal(thirdTab.message, messagesB[0]);

  Assert.equal(thirdChromeBrowser.contentWindow.tabOrWindow, thirdTab);

  // Check the fourth tab.

  tabmail.switchToTab(3);
  Assert.equal(tabmail.currentTabInfo, tabmail.tabInfo[3]);

  let fourthTab = tabmail.currentTabInfo;
  Assert.equal(fourthTab.mode.name, "mailMessageTab");
  Assert.equal(fourthTab.mode.tabType.name, "mailTab");

  let fourthChromeBrowser = fourthTab.chromeBrowser;
  await ensureBrowserLoaded(fourthChromeBrowser);
  Assert.equal(fourthChromeBrowser.currentURI.spec, "about:message");
  Assert.equal(tabmail.currentAbout3Pane, null);
  Assert.equal(tabmail.currentAboutMessage, fourthChromeBrowser.contentWindow);

  let fourthMessagePane =
    fourthChromeBrowser.contentDocument.getElementById("messagepane");
  Assert.equal(fourthMessagePane.currentURI.spec, messageToURL(messagesB[1]));
  Assert.equal(fourthTab.browser, fourthMessagePane);
  Assert.equal(fourthTab.linkedBrowser, fourthMessagePane);

  Assert.equal(fourthTab.folder, folderB);
  Assert.equal(fourthTab.message, messagesB[1]);

  Assert.equal(fourthChromeBrowser.contentWindow.tabOrWindow, fourthTab);

  // Close tabs.

  tabmail.closeTab(3);
  Assert.equal(tabmail.currentTabInfo, thirdTab);
  Assert.equal(tabmail.currentAbout3Pane, null);
  Assert.equal(tabmail.currentAboutMessage, thirdChromeBrowser.contentWindow);

  tabmail.closeTab(2);
  Assert.equal(tabmail.currentTabInfo, secondTab);
  Assert.equal(tabmail.currentAbout3Pane, secondChromeBrowser.contentWindow);
  Assert.equal(tabmail.currentAboutMessage, secondMessageBrowser.contentWindow);

  tabmail.closeTab(1);
  Assert.equal(tabmail.currentTabInfo, firstTab);
  Assert.equal(tabmail.currentAbout3Pane, firstChromeBrowser.contentWindow);
  Assert.equal(tabmail.currentAboutMessage, firstMessageBrowser.contentWindow);
});

add_task(async function testMessageWindow() {
  let messageWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded(
    undefined,
    async win =>
      win.document.documentURI ==
      "chrome://messenger/content/messageWindow.xhtml"
  );
  MailUtils.openMessageInNewWindow(messagesB[0]);

  let messageWindow = await messageWindowPromise;
  let messageBrowser = messageWindow.messageBrowser;
  await ensureBrowserLoaded(messageBrowser);
  Assert.equal(messageBrowser.contentWindow.tabOrWindow, messageWindow);

  await BrowserTestUtils.closeWindow(messageWindow);
});

async function ensureBrowserLoaded(browser) {
  await TestUtils.waitForCondition(
    () =>
      browser.currentURI.spec != "about:blank" &&
      browser.contentDocument.readyState == "complete",
    "waiting for browser to finish loading"
  );
}

function messageToURL(message) {
  let messageService = MailServices.messageServiceFromURI("mailbox-message://");
  let uri = message.folder.getUriForMsg(message);
  return messageService.getUrlForUri(uri).spec;
}
