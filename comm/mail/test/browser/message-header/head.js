/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { MailConsts } = ChromeUtils.import("resource:///modules/MailConsts.jsm");
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);

registerCleanupFunction(() => {
  let tabmail = document.getElementById("tabmail");
  is(tabmail.tabInfo.length, 1);

  while (tabmail.tabInfo.length > 1) {
    tabmail.closeTab(tabmail.tabInfo[1]);
  }

  // Some tests that open new windows don't return focus to the main window
  // in a way that satisfies mochitest, and the test times out.
  Services.focus.focusedWindow = window;
  // Focus an element in the main window, then blur it again to avoid it
  // hijacking keypresses.
  let mainWindowElement = document.getElementById("button-appmenu");
  mainWindowElement.focus();
  mainWindowElement.blur();

  Services.prefs.clearUserPref("mail.pane_config.dynamic");
  Services.xulStore.removeValue(
    "chrome://messenger/content/messenger.xhtml",
    "threadPane",
    "view"
  );
});

function createAccount(type = "none") {
  let account;

  if (type == "local") {
    MailServices.accounts.createLocalMailAccount();
    account = MailServices.accounts.FindAccountForServer(
      MailServices.accounts.localFoldersServer
    );
  } else {
    account = MailServices.accounts.createAccount();
    account.incomingServer = MailServices.accounts.createIncomingServer(
      `${account.key}user`,
      "localhost",
      type
    );
  }

  info(`Created account ${account.toString()}`);
  return account;
}

async function createSubfolder(parent, name) {
  parent.createSubfolder(name, null);
  return parent.getChildNamed(name);
}

function createMessages(folder, makeMessagesArg) {
  if (typeof makeMessagesArg == "number") {
    makeMessagesArg = { count: makeMessagesArg };
  }
  if (!createMessages.messageGenerator) {
    createMessages.messageGenerator = new MessageGenerator();
  }

  let messages = createMessages.messageGenerator.makeMessages(makeMessagesArg);
  let messageStrings = messages.map(message => message.toMboxString());
  folder.QueryInterface(Ci.nsIMsgLocalMailFolder);
  folder.addMessageBatch(messageStrings);
}

async function openMessageInTab(msgHdr) {
  if (!msgHdr.QueryInterface(Ci.nsIMsgDBHdr)) {
    throw new Error("No message passed to openMessageInTab");
  }

  // Ensure the behaviour pref is set to open a new tab. It is the default,
  // but you never know.
  let oldPrefValue = Services.prefs.getIntPref("mail.openMessageBehavior");
  Services.prefs.setIntPref(
    "mail.openMessageBehavior",
    MailConsts.OpenMessageBehavior.NEW_TAB
  );
  MailUtils.displayMessages([msgHdr]);
  Services.prefs.setIntPref("mail.openMessageBehavior", oldPrefValue);

  let win = Services.wm.getMostRecentWindow("mail:3pane");
  let tab = win.document.getElementById("tabmail").currentTabInfo;
  let browser = tab.browser;

  await promiseMessageLoaded(browser, msgHdr);
  return tab;
}

async function openMessageInWindow(msgHdr) {
  if (!msgHdr.QueryInterface(Ci.nsIMsgDBHdr)) {
    throw new Error("No message passed to openMessageInWindow");
  }

  let messageWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded(
    undefined,
    async win =>
      win.document.documentURI ==
      "chrome://messenger/content/messageWindow.xhtml"
  );
  MailUtils.openMessageInNewWindow(msgHdr);

  let messageWindow = await messageWindowPromise;
  let browser = messageWindow.document.getElementById("messagepane");

  await promiseMessageLoaded(browser, msgHdr);
  return messageWindow;
}

async function promiseMessageLoaded(browser, msgHdr) {
  let messageURI = msgHdr.folder.getUriForMsg(msgHdr);
  messageURI = MailServices.messageServiceFromURI(messageURI).getUrlForUri(
    messageURI,
    null
  );

  if (
    browser.webProgress?.isLoadingDocument ||
    !browser.currentURI?.equals(messageURI)
  ) {
    await BrowserTestUtils.browserLoaded(
      browser,
      null,
      uri => uri == messageURI.spec
    );
  }
}

async function assertVisibility(element, isVisible, msg) {
  await TestUtils.waitForCondition(
    () => BrowserTestUtils.is_visible(element) == isVisible,
    `The ${element.id} should be ${isVisible ? "visible" : "hidden"}: ${msg}`
  );
}

/**
 * Helper method to switch to a cards view with vertical layout.
 */
async function ensure_cards_view() {
  const { threadTree, threadPane } =
    document.getElementById("tabmail").currentAbout3Pane;

  Services.prefs.setIntPref("mail.pane_config.dynamic", 2);
  Services.xulStore.setValue(
    "chrome://messenger/content/messenger.xhtml",
    "threadPane",
    "view",
    "cards"
  );
  threadPane.updateThreadView("cards");

  await BrowserTestUtils.waitForCondition(
    () => threadTree.getAttribute("rows") == "thread-card",
    "The tree view switched to a cards layout"
  );
}

/**
 * Helper method to switch to a table view with classic layout.
 */
async function ensure_table_view() {
  const { threadTree, threadPane } =
    document.getElementById("tabmail").currentAbout3Pane;

  Services.prefs.setIntPref("mail.pane_config.dynamic", 0);
  Services.xulStore.setValue(
    "chrome://messenger/content/messenger.xhtml",
    "threadPane",
    "view",
    "table"
  );
  threadPane.updateThreadView("table");

  await BrowserTestUtils.waitForCondition(
    () => threadTree.getAttribute("rows") == "thread-row",
    "The tree view switched to a table layout"
  );
}
