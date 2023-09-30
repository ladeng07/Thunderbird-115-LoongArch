/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { ConversationOpener } = ChromeUtils.import(
  "resource:///modules/ConversationOpener.jsm"
);
var { Gloda } = ChromeUtils.import("resource:///modules/gloda/Gloda.jsm");
var { GlodaSyntheticView } = ChromeUtils.import(
  "resource:///modules/gloda/GlodaSyntheticView.jsm"
);
var { MailConsts } = ChromeUtils.import("resource:///modules/MailConsts.jsm");
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
var { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);

const TEST_MESSAGE_URL =
  "http://mochi.test:8888/browser/comm/mail/base/test/browser/files/sampleContent.eml";

let tabmail = document.getElementById("tabmail");
let testFolder, testMessages;
let draftsFolder, draftsMessages;

let singleSelectionMessagePane = [
  "singleMessage",
  "draftsFolder",
  "syntheticFolderDraft",
  "syntheticFolder",
];
let singleSelectionThreadPane = [
  "singleMessageTree",
  "draftsFolderTree",
  "syntheticFolderDraftTree",
  "syntheticFolderTree",
];
let onePane = ["messageTab", "messageWindow"];
let external = ["externalMessageTab", "externalMessageWindow"];
let allSingleSelection = [
  ...singleSelectionMessagePane,
  ...singleSelectionThreadPane,
  ...onePane,
  ...external,
];
let allThreePane = [
  ...singleSelectionMessagePane,
  ...singleSelectionThreadPane,
  "multipleMessagesTree",
];
let notExternal = [...allThreePane, ...onePane];

const mailContextData = {
  "mailContext-selectall": [
    ...singleSelectionMessagePane,
    ...onePane,
    ...external,
  ],
  "mailContext-editDraftMsg": [
    "draftsFolder",
    "draftsFolderTree",
    "syntheticFolderDraft",
    "syntheticFolderDraftTree",
  ],
  "mailContext-openNewTab": singleSelectionThreadPane,
  "mailContext-openNewWindow": singleSelectionThreadPane,
  "mailContext-openConversation": notExternal,
  "mailContext-openContainingFolder": [
    "syntheticFolderDraft",
    "syntheticFolderDraftTree",
    "syntheticFolder",
    "syntheticFolderTree",
    ...onePane,
  ],
  "mailContext-replySender": allSingleSelection,
  "mailContext-replyAll": allSingleSelection,
  "mailContext-replyList": allSingleSelection,
  "mailContext-forward": allSingleSelection,
  "mailContext-forwardAsMenu": allSingleSelection,
  "mailContext-multiForwardAsAttachment": ["multipleMessagesTree"],
  "mailContext-redirect": allSingleSelection,
  "mailContext-editAsNew": allSingleSelection,
  "mailContext-tags": true, // Should be notExternal really.
  "mailContext-mark": true, // Should be notExternal really.
  "mailContext-archive": notExternal,
  "mailContext-moveMenu": notExternal,
  "mailContext-copyMenu": true,
  "mailContext-decryptToFolder": ["multipleMessagesTree"],
  "mailContext-calendar-convert-menu": allSingleSelection,
  "mailContext-delete": notExternal,
  "mailContext-ignoreThread": allThreePane,
  "mailContext-ignoreSubthread": allThreePane,
  "mailContext-watchThread": notExternal,
  "mailContext-saveAs": true,
  "mailContext-print": true,
  "mailContext-downloadSelected": ["multipleMessagesTree"],
};

function checkMenuitems(menu, mode) {
  if (!mode) {
    // Menu should not be shown.
    Assert.equal(menu.state, "closed");
    return;
  }

  Assert.notEqual(menu.state, "closed");

  let expectedItems = [];
  for (let [id, modes] of Object.entries(mailContextData)) {
    if (modes === true || modes.includes(mode)) {
      expectedItems.push(id);
    }
  }

  let actualItems = [];
  for (let item of menu.children) {
    if (["menu", "menuitem"].includes(item.localName) && !item.hidden) {
      actualItems.push(item.id);
    }
  }

  let notFoundItems = expectedItems.filter(i => !actualItems.includes(i));
  if (notFoundItems.length) {
    Assert.report(
      true,
      undefined,
      undefined,
      "items expected but not found: " + notFoundItems.join(", ")
    );
  }

  let unexpectedItems = actualItems.filter(i => !expectedItems.includes(i));
  if (unexpectedItems.length) {
    Assert.report(
      true,
      undefined,
      undefined,
      "items found but not expected: " + unexpectedItems.join(", ")
    );
  }

  Assert.deepEqual(actualItems, expectedItems);

  menu.hidePopup();
}

add_setup(async function () {
  let generator = new MessageGenerator();

  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  account.addIdentity(MailServices.accounts.createIdentity());
  let rootFolder = account.incomingServer.rootFolder;
  rootFolder.createSubfolder("mailContextFolder", null);
  testFolder = rootFolder
    .getChildNamed("mailContextFolder")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  let message = await fetch(TEST_MESSAGE_URL).then(r => r.text());
  testFolder.addMessageBatch([message]);
  let messages = [
    ...generator.makeMessages({ count: 5 }),
    ...generator.makeMessages({ count: 5, msgsPerThread: 5 }),
    ...generator.makeMessages({ count: 200 }),
  ];
  let messageStrings = messages.map(message => message.toMboxString());
  testFolder.addMessageBatch(messageStrings);
  testMessages = [...testFolder.messages];
  rootFolder.createSubfolder("mailContextDrafts", null);
  draftsFolder = rootFolder
    .getChildNamed("mailContextDrafts")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  draftsFolder.setFlag(Ci.nsMsgFolderFlags.Drafts);
  draftsFolder.addMessageBatch(
    generator.makeMessages({ count: 5 }).map(message => message.toMboxString())
  );
  draftsMessages = [...draftsFolder.messages];

  tabmail.currentAbout3Pane.restoreState({
    folderURI: testFolder.URI,
    messagePaneVisible: true,
  });

  registerCleanupFunction(() => {
    MailServices.accounts.removeAccount(account, false);
    Services.prefs.clearUserPref("mail.openMessageBehavior");
  });
});

/**
 * Tests the mailContext menu on the thread tree and message pane when no
 * messages are selected.
 */
add_task(async function testNoMessages() {
  let about3Pane = tabmail.currentAbout3Pane;
  let mailContext = about3Pane.document.getElementById("mailContext");
  let { messageBrowser, messagePane, threadTree } = about3Pane;
  messagePane.clearAll();

  // The message pane browser isn't visible.

  Assert.ok(
    BrowserTestUtils.is_hidden(messageBrowser),
    "message browser should be hidden"
  );
  Assert.equal(messageBrowser.currentURI.spec, "about:message");
  Assert.equal(
    messageBrowser.contentWindow.getMessagePaneBrowser().currentURI.spec,
    "about:blank"
  );
  EventUtils.synthesizeMouseAtCenter(
    about3Pane.document.getElementById("messagePane"),
    { type: "contextmenu" }
  );
  checkMenuitems(mailContext);

  // Open the menu from an empty part of the thread pane.

  let treeRect = threadTree.getBoundingClientRect();
  EventUtils.synthesizeMouse(
    threadTree,
    treeRect.x + treeRect.width / 2,
    treeRect.bottom - 10,
    { type: "contextmenu" },
    about3Pane
  );
  checkMenuitems(mailContext);
});

/**
 * Tests the mailContext menu on the thread tree and message pane when one
 * message is selected.
 */
add_task(async function testSingleMessage() {
  await TestUtils.waitForCondition(
    () => ConversationOpener.isMessageIndexed(testMessages[0]),
    "waiting for Gloda to finish indexing",
    500
  );

  let about3Pane = tabmail.currentAbout3Pane;
  let mailContext = about3Pane.document.getElementById("mailContext");
  let { gDBView, messageBrowser, threadTree } = about3Pane;
  let messagePaneBrowser = messageBrowser.contentWindow.getMessagePaneBrowser();

  let loadedPromise = BrowserTestUtils.browserLoaded(
    messagePaneBrowser,
    undefined,
    url => url.endsWith(gDBView.getKeyAt(0))
  );
  threadTree.selectedIndex = 0;
  threadTree.scrollToIndex(0, true);
  await loadedPromise;

  // Open the menu from the message pane.

  Assert.ok(
    BrowserTestUtils.is_visible(messageBrowser),
    "message browser should be visible"
  );
  let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    messagePaneBrowser
  );
  await shownPromise;
  checkMenuitems(mailContext, "singleMessage");

  // Open the menu from the thread pane.

  shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    threadTree.getRowAtIndex(0),
    { type: "contextmenu" },
    about3Pane
  );
  await shownPromise;
  checkMenuitems(mailContext, "singleMessageTree");

  // Open the menu through the keyboard.

  shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  const row = threadTree.getRowAtIndex(0);
  row.focus();
  EventUtils.synthesizeMouseAtCenter(
    row,
    { type: "contextmenu", button: 0 },
    about3Pane
  );
  await shownPromise;
  Assert.ok(
    BrowserTestUtils.is_visible(mailContext),
    "Context menu is shown through keyboard action"
  );
  mailContext.hidePopup();

  // Open the menu on a message that is scrolled out of view.

  shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  threadTree.scrollToIndex(200, true);
  await new Promise(resolve => window.requestAnimationFrame(resolve));
  Assert.ok(!row.parentNode, "Row element should no longer be attached");
  Assert.equal(threadTree.currentIndex, 0, "Row 0 is the current row");
  Assert.ok(
    !threadTree.getRowAtIndex(threadTree.currentIndex),
    "Current row is scrolled out of view"
  );
  EventUtils.synthesizeMouseAtCenter(
    threadTree,
    { type: "contextmenu", button: 0 },
    about3Pane
  );
  await shownPromise;
  Assert.ok(
    threadTree.getRowAtIndex(threadTree.currentIndex),
    "Current row is scrolled into view when showing context menu"
  );
  mailContext.hidePopup();

  Assert.ok(BrowserTestUtils.is_hidden(mailContext), "Context menu is hidden");
});

/**
 * Tests the mailContext menu on the thread tree and message pane when more
 * than one message is selected.
 */
add_task(async function testMultipleMessages() {
  await TestUtils.waitForCondition(
    () => ConversationOpener.isMessageIndexed(testMessages[1]),
    "waiting for Gloda to finish indexing",
    500
  );

  let about3Pane = tabmail.currentAbout3Pane;
  let mailContext = about3Pane.document.getElementById("mailContext");
  let { messageBrowser, multiMessageBrowser, threadTree } = about3Pane;
  threadTree.scrollToIndex(1, true);
  threadTree.selectedIndices = [1, 2, 3];

  // The message pane browser isn't visible.

  Assert.ok(
    BrowserTestUtils.is_hidden(messageBrowser),
    "message browser should be hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(multiMessageBrowser),
    "multimessage browser should be visible"
  );
  EventUtils.synthesizeMouseAtCenter(
    about3Pane.document.getElementById("messagePane"),
    { type: "contextmenu" }
  );
  checkMenuitems(mailContext);

  // Open the menu from the thread pane.
  EventUtils.synthesizeMouseAtCenter(
    threadTree.getRowAtIndex(2),
    { type: "contextmenu" },
    about3Pane
  );
  checkMenuitems(mailContext, "multipleMessagesTree");

  // Open the menu in the thread pane on a message scrolled out of view.
  threadTree.selectAll();
  threadTree.currentIndex = 200;
  await TestUtils.waitForTick();
  await new Promise(resolve => window.requestAnimationFrame(resolve));
  threadTree.scrollToIndex(0, true);
  await new Promise(resolve => window.requestAnimationFrame(resolve));
  Assert.ok(
    !threadTree.getRowAtIndex(threadTree.currentIndex),
    "Current row is scrolled out of view"
  );

  const shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    threadTree,
    { type: "contextmenu", button: 0 },
    about3Pane
  );
  await shownPromise;
  Assert.ok(
    threadTree.getRowAtIndex(threadTree.currentIndex),
    "Current row is scrolled into view when popup is shown"
  );
  mailContext.hidePopup();
});

/**
 * Tests the mailContext menu on the thread tree and message pane of a Drafts
 * folder.
 */
add_task(async function testDraftsFolder() {
  let about3Pane = tabmail.currentAbout3Pane;
  about3Pane.restoreState({ folderURI: draftsFolder.URI });

  await TestUtils.waitForCondition(
    () => ConversationOpener.isMessageIndexed(draftsMessages[0]),
    "waiting for Gloda to finish indexing",
    500
  );

  let mailContext = about3Pane.document.getElementById("mailContext");
  let { gDBView, messageBrowser, threadTree } = about3Pane;
  let messagePaneBrowser = messageBrowser.contentWindow.getMessagePaneBrowser();

  let loadedPromise = BrowserTestUtils.browserLoaded(
    messagePaneBrowser,
    undefined,
    url => url.endsWith(gDBView.getKeyAt(0))
  );
  threadTree.selectedIndex = 0;
  await loadedPromise;

  // Open the menu from the message pane.

  Assert.ok(
    BrowserTestUtils.is_visible(messageBrowser),
    "message browser should be visible"
  );
  let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    messagePaneBrowser
  );
  await shownPromise;
  checkMenuitems(mailContext, "draftsFolder");

  // Open the menu from the thread pane.

  shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    threadTree.getRowAtIndex(0),
    { type: "contextmenu" },
    about3Pane
  );
  await shownPromise;
  checkMenuitems(mailContext, "draftsFolderTree");
});

/**
 * Tests the mailContext menu on the thread tree and message pane of a Gloda
 * synthetic view (in this case a conversation, but a list of search results
 * should be the same).
 */
add_task(async function testSyntheticFolder() {
  await TestUtils.waitForCondition(
    () => ConversationOpener.isMessageIndexed(testMessages[9]),
    "waiting for Gloda to finish indexing",
    500
  );
  await TestUtils.waitForCondition(
    () => ConversationOpener.isMessageIndexed(draftsMessages[4]),
    "waiting for Gloda to finish indexing",
    500
  );

  let tabPromise = BrowserTestUtils.waitForEvent(window, "aboutMessageLoaded");
  tabmail.openTab("mail3PaneTab", {
    syntheticView: new GlodaSyntheticView({
      collection: Gloda.getMessageCollectionForHeaders([
        ...draftsMessages,
        ...testMessages.slice(6),
      ]),
    }),
    title: "Test gloda results",
  });
  await tabPromise;
  await new Promise(resolve => setTimeout(resolve));

  let about3Pane = tabmail.currentAbout3Pane;
  let mailContext = about3Pane.document.getElementById("mailContext");
  let { gDBView, messageBrowser, threadTree } = about3Pane;
  let messagePaneBrowser = messageBrowser.contentWindow.getMessagePaneBrowser();

  let loadedPromise = BrowserTestUtils.browserLoaded(
    messagePaneBrowser,
    undefined,
    url => url.endsWith(gDBView.getKeyAt(0))
  );
  threadTree.selectedIndex = 0;
  await loadedPromise;

  // Open the menu from the message pane.

  Assert.ok(
    BrowserTestUtils.is_visible(messageBrowser),
    "message browser should be visible"
  );
  let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    messagePaneBrowser
  );
  await shownPromise;
  checkMenuitems(mailContext, "syntheticFolderDraft");

  // Open the menu from the thread pane.

  shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    threadTree.getRowAtIndex(0),
    { type: "contextmenu" },
    about3Pane
  );
  await shownPromise;
  checkMenuitems(mailContext, "syntheticFolderDraftTree");

  loadedPromise = BrowserTestUtils.browserLoaded(
    messagePaneBrowser,
    undefined,
    url => url.endsWith(gDBView.getKeyAt(5))
  );
  threadTree.selectedIndex = 5;
  await loadedPromise;

  // Open the menu from the message pane.

  Assert.ok(
    BrowserTestUtils.is_visible(messageBrowser),
    "message browser should be visible"
  );
  shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    messagePaneBrowser
  );
  await shownPromise;
  checkMenuitems(mailContext, "syntheticFolder");

  // Open the menu from the thread pane.

  shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    threadTree.getRowAtIndex(5),
    { type: "contextmenu" },
    about3Pane
  );
  await shownPromise;
  checkMenuitems(mailContext, "syntheticFolderTree");

  tabmail.closeOtherTabs(0);
});

/**
 * Tests the mailContext menu on the message pane of a message in a tab.
 */
add_task(async function testMessageTab() {
  let tabPromise = BrowserTestUtils.waitForEvent(window, "MsgLoaded");
  window.OpenMessageInNewTab(testMessages[0], { background: false });
  await tabPromise;
  await new Promise(resolve => setTimeout(resolve));

  let aboutMessage = tabmail.currentAboutMessage;
  let mailContext = aboutMessage.document.getElementById("mailContext");

  let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    aboutMessage.getMessagePaneBrowser()
  );
  await shownPromise;
  checkMenuitems(mailContext, "messageTab");

  tabmail.closeOtherTabs(0);
});

/**
 * Tests the mailContext menu on the message pane of a file message in a tab.
 */
add_task(async function testExternalMessageTab() {
  let tabPromise = BrowserTestUtils.waitForEvent(window, "MsgLoaded");
  let messageFile = new FileUtils.File(
    getTestFilePath("files/sampleContent.eml")
  );
  Services.prefs.setIntPref(
    "mail.openMessageBehavior",
    MailConsts.OpenMessageBehavior.NEW_TAB
  );
  MailUtils.openEMLFile(
    window,
    messageFile,
    Services.io.newFileURI(messageFile)
  );
  await tabPromise;
  await new Promise(resolve => setTimeout(resolve));

  let aboutMessage = tabmail.currentAboutMessage;
  let mailContext = aboutMessage.document.getElementById("mailContext");

  let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    aboutMessage.getMessagePaneBrowser()
  );
  await shownPromise;
  checkMenuitems(mailContext, "externalMessageTab");

  tabmail.closeOtherTabs(0);
});

/**
 * Tests the mailContext menu on the message pane of a message in a window.
 */
add_task(async function testMessageWindow() {
  let winPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
  window.MsgOpenNewWindowForMessage(testMessages[0]);
  let win = await winPromise;
  await BrowserTestUtils.waitForEvent(win, "MsgLoaded");
  await TestUtils.waitForCondition(() => Services.focus.activeWindow == win);

  let aboutMessage = win.messageBrowser.contentWindow;
  let mailContext = aboutMessage.document.getElementById("mailContext");

  let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    aboutMessage.getMessagePaneBrowser()
  );
  await shownPromise;
  checkMenuitems(mailContext, "messageWindow");

  await BrowserTestUtils.closeWindow(win);
});

/**
 * Tests the mailContext menu on the message pane of a file message in a window.
 */
add_task(async function testExternalMessageWindow() {
  let winPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
  let messageFile = new FileUtils.File(
    getTestFilePath("files/sampleContent.eml")
  );
  Services.prefs.setIntPref(
    "mail.openMessageBehavior",
    MailConsts.OpenMessageBehavior.NEW_WINDOW
  );
  MailUtils.openEMLFile(
    window,
    messageFile,
    Services.io.newFileURI(messageFile)
  );
  let win = await winPromise;
  await BrowserTestUtils.waitForEvent(win, "MsgLoaded");
  await TestUtils.waitForCondition(() => Services.focus.activeWindow == win);

  let aboutMessage = win.messageBrowser.contentWindow;
  let mailContext = aboutMessage.document.getElementById("mailContext");

  let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ":root",
    { type: "contextmenu" },
    aboutMessage.getMessagePaneBrowser()
  );
  await shownPromise;
  checkMenuitems(mailContext, "externalMessageWindow");

  await BrowserTestUtils.closeWindow(win);
});
