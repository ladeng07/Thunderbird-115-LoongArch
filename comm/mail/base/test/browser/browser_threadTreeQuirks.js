/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);
const { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);

let tabmail = document.getElementById("tabmail");
let about3Pane = tabmail.currentAbout3Pane;
let threadTree = about3Pane.threadTree;
// Not `currentAboutMessage` as (a) that's null right now, and (b) we'll be
// testing things that happen when about:message is hidden.
let aboutMessage = about3Pane.messageBrowser.contentWindow;
let messagePaneBrowser = aboutMessage.getMessagePaneBrowser();
let rootFolder, folderA, folderB, trashFolder, sourceMessages, sourceMessageIDs;

add_setup(async function () {
  let generator = new MessageGenerator();

  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  account.addIdentity(MailServices.accounts.createIdentity());
  rootFolder = account.incomingServer.rootFolder;

  rootFolder.createSubfolder("threadTreeQuirksA", null);
  folderA = rootFolder
    .getChildNamed("threadTreeQuirksA")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);

  rootFolder.createSubfolder("threadTreeQuirksB", null);
  folderB = rootFolder.getChildNamed("threadTreeQuirksB");
  trashFolder = rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);

  // Make some messages, then change their dates to simulate a different order.
  let syntheticMessages = generator.makeMessages({
    count: 15,
    msgsPerThread: 5,
  });
  syntheticMessages[1].date = generator.makeDate();
  syntheticMessages[2].date = generator.makeDate();
  syntheticMessages[3].date = generator.makeDate();
  syntheticMessages[4].date = generator.makeDate();

  folderA.addMessageBatch(
    syntheticMessages.map(message => message.toMboxString())
  );
  sourceMessages = [...folderA.messages];
  sourceMessageIDs = sourceMessages.map(m => m.messageId);

  registerCleanupFunction(() => {
    MailServices.accounts.removeAccount(account, false);
  });
});

add_task(async function testExpandCollapseUpdates() {
  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderA.URI,
  });

  // Clicking the twisty to collapse a row should update the message display.
  goDoCommand("cmd_expandAllThreads");
  threadTree.selectedIndex = 5;
  await messageLoaded(10);

  let selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  EventUtils.synthesizeMouseAtCenter(
    threadTree.getRowAtIndex(5).querySelector(".twisty"),
    {},
    about3Pane
  );
  await selectPromise;
  // Thread root still selected.
  await validateTree(11, [5], 5);
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.messageBrowser),
    "messageBrowser became hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.multiMessageBrowser),
    "multiMessageBrowser became visible"
  );

  // Clicking the twisty to expand a row should update the message display.
  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  EventUtils.synthesizeMouseAtCenter(
    threadTree.getRowAtIndex(5).querySelector(".twisty"),
    {},
    about3Pane
  );
  await selectPromise;
  await messageLoaded(10);
  await validateTree(15, [5], 5);
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.multiMessageBrowser),
    "multiMessageBrowser became hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.messageBrowser),
    "messageBrowser became visible"
  );

  // Collapsing all rows while the first message in a thread is selected should
  // update the message display.
  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_collapseAllThreads");
  await selectPromise;
  // Thread root still selected.
  await validateTree(3, [1], 1);
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.messageBrowser),
    "messageBrowser became hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.multiMessageBrowser),
    "multiMessageBrowser became visible"
  );

  // Expanding all rows while the first message in a thread is selected should
  // update the message display.
  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_expandAllThreads");
  await selectPromise;
  await messageLoaded(10);
  await validateTree(15, [5], 5);
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.multiMessageBrowser),
    "multiMessageBrowser became hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.messageBrowser),
    "messageBrowser became visible"
  );

  // Collapsing all rows while a message inside a thread is selected should
  // select the first message in the thread and update the message display.
  threadTree.selectedIndex = 2;
  await messageLoaded(7);

  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_collapseAllThreads");
  await selectPromise;
  // Thread root became selected.
  await validateTree(3, [0], 0);
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.messageBrowser),
    "messageBrowser became hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.multiMessageBrowser),
    "multiMessageBrowser became visible"
  );

  // Expanding all rows while the first message in a thread is selected should
  // update the message display. (This is effectively the same test as earlier.)
  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_expandAllThreads");
  await selectPromise;
  await messageLoaded(5);
  await validateTree(15, [0], 0);
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.multiMessageBrowser),
    "multiMessageBrowser became hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.messageBrowser),
    "messageBrowser became visible"
  );

  // Select several things and collapse all.
  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  threadTree.selectedIndices = [2, 3, 5];
  await selectPromise;
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.messageBrowser),
    "messageBrowser became hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.multiMessageBrowser),
    "multiMessageBrowser became visible"
  );

  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_collapseAllThreads");
  await selectPromise;
  // Thread roots became selected.
  await validateTree(3, [0, 1], 1);
  Assert.ok(
    BrowserTestUtils.is_hidden(about3Pane.messageBrowser),
    "messageBrowser stayed hidden"
  );
  Assert.ok(
    BrowserTestUtils.is_visible(about3Pane.multiMessageBrowser),
    "multiMessageBrowser stayed visible"
  );
});

add_task(async function testThreadUpdateKeepsSelection() {
  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderB.URI,
  });

  // Put some messages from different threads in the folder and select one.
  await move([sourceMessages[0]], folderA, folderB);
  await move([sourceMessages[5]], folderA, folderB);
  threadTree.selectedIndex = 1;
  await messageLoaded(5);

  // Move a "newer" message into the folder. This should switch the order of
  // the threads, but no selection change should occur.
  threadTree.addEventListener("select", reportBadSelectEvent);
  messagePaneBrowser.addEventListener("load", reportBadLoad, true);
  await move([sourceMessages[1]], folderA, folderB);
  // Selection should have moved.
  await validateTree(2, [0], 0);
  Assert.equal(
    aboutMessage.gMessage.messageId,
    sourceMessageIDs[5],
    "correct message still loaded"
  );

  // Wait to prove unwanted selection or load didn't happen.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  threadTree.removeEventListener("select", reportBadSelectEvent);
  messagePaneBrowser.removeEventListener("load", reportBadLoad, true);

  await restoreMessages();
});

add_task(async function testArchiveDeleteUpdates() {
  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderA.URI,
  });
  about3Pane.sortController.sortUnthreaded();

  threadTree.table.body.focus();
  threadTree.selectedIndex = 3;
  await messageLoaded(7);

  let selectCount = 0;
  let onSelect = () => selectCount++;
  threadTree.addEventListener("select", onSelect);

  let selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_delete");
  await selectPromise;
  await messageLoaded(8);
  await validateTree(14, [3], 3);
  Assert.equal(selectCount, 1, "'select' event should've happened only once");

  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_delete");
  await selectPromise;
  await messageLoaded(9);
  await validateTree(13, [3], 3);
  Assert.equal(selectCount, 2, "'select' event should've happened only once");

  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_archive");
  await selectPromise;
  await messageLoaded(10);
  await validateTree(12, [3], 3);
  Assert.equal(selectCount, 3, "'select' event should've happened only once");

  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_archive");
  await selectPromise;
  await messageLoaded(11);
  await validateTree(11, [3], 3);
  Assert.equal(selectCount, 4, "'select' event should've happened only once");

  selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  goDoCommand("cmd_delete");
  await selectPromise;
  await messageLoaded(12);
  await validateTree(10, [3], 3);
  Assert.equal(selectCount, 5, "'select' event should've happened only once");

  threadTree.removeEventListener("select", onSelect);

  await restoreMessages();
});

add_task(async function testMessagePaneSelection() {
  await move(sourceMessages.slice(6, 9), folderA, folderB);
  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderB.URI,
  });
  about3Pane.sortController.sortUnthreaded();
  about3Pane.sortController.sortThreadPane("byDate");
  about3Pane.sortController.sortDescending();

  threadTree.table.body.focus();
  threadTree.selectedIndex = 1;
  await messageLoaded(7);
  await validateTree(3, [1], 1);

  // Check the initial selection in about:message.
  Assert.equal(aboutMessage.gDBView.selection.getRangeCount(), 1);
  let min = {},
    max = {};
  aboutMessage.gDBView.selection.getRangeAt(0, min, max);
  Assert.equal(min.value, 1);
  Assert.equal(max.value, 1);

  // Add a new message to the folder, which should appear first.
  threadTree.addEventListener("select", reportBadSelectEvent);
  messagePaneBrowser.addEventListener("load", reportBadLoad, true);
  await move(sourceMessages.slice(9, 10), folderA, folderB);
  await validateTree(4, [2], 2);

  Assert.deepEqual(
    Array.from(folderB.messages, m => m.messageId),
    sourceMessageIDs.slice(6, 10),
    "all expected messages are in the folder"
  );

  // Check the selection in about:message.
  Assert.equal(aboutMessage.gDBView.selection.getRangeCount(), 1);
  aboutMessage.gDBView.selection.getRangeAt(0, min, max);
  Assert.equal(min.value, 2);
  Assert.equal(max.value, 2);

  // Wait to prove unwanted selection or load didn't happen.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));
  threadTree.removeEventListener("select", reportBadSelectEvent);
  messagePaneBrowser.removeEventListener("load", reportBadLoad, true);

  // Now click the delete button in about:message.
  let deletePromise = PromiseTestUtils.promiseFolderEvent(
    folderB,
    "DeleteOrMoveMsgCompleted"
  );
  let loadPromise = messageLoaded(6);
  EventUtils.synthesizeMouseAtCenter(
    aboutMessage.document.getElementById("hdrTrashButton"),
    {},
    aboutMessage
  );
  await Promise.all([deletePromise, loadPromise]);

  // Check which message was deleted.
  Assert.deepEqual(
    Array.from(trashFolder.messages, m => m.messageId),
    [sourceMessageIDs[7]],
    "the right message was deleted"
  );
  Assert.deepEqual(
    Array.from(folderB.messages, m => m.messageId),
    [sourceMessageIDs[6], sourceMessageIDs[8], sourceMessageIDs[9]],
    "the right messages were kept"
  );

  await validateTree(3, [2], 2);

  // Check the selection in about:message again.
  Assert.equal(aboutMessage.gDBView.selection.getRangeCount(), 1);
  aboutMessage.gDBView.selection.getRangeAt(0, min, max);
  Assert.equal(min.value, 2);
  Assert.equal(max.value, 2);

  await restoreMessages();
});

add_task(async function testNonSelectionContextMenu() {
  let mailContext = about3Pane.document.getElementById("mailContext");
  let openNewTabItem = about3Pane.document.getElementById(
    "mailContext-openNewTab"
  );
  let replyItem = about3Pane.document.getElementById("mailContext-replySender");

  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderA.URI,
  });
  about3Pane.sortController.sortUnthreaded();
  threadTree.scrollToIndex(0, true);

  threadTree.selectedIndex = 0;
  await messageLoaded(0);
  await validateTree(15, [0], 0);
  await subtestOpenTab(1, sourceMessageIDs[5]);
  await subtestReply(6, sourceMessageIDs[10]);

  threadTree.selectedIndices = [3, 6, 9];
  await BrowserTestUtils.browserLoaded(
    messagePaneBrowser,
    false,
    "about:blank"
  );
  await subtestOpenTab(0, sourceMessageIDs[0]);

  async function doContextMenu(testIndex, messageId, itemToActivate) {
    let originalSelection = threadTree.selectedIndices;

    threadTree.addEventListener("select", reportBadSelectEvent);
    messagePaneBrowser.addEventListener("load", reportBadLoad, true);

    let shownPromise = BrowserTestUtils.waitForEvent(mailContext, "popupshown");
    EventUtils.synthesizeMouseAtCenter(
      threadTree
        .getRowAtIndex(testIndex)
        .querySelector(".thread-card-subject-container"),
      { type: "contextmenu" },
      about3Pane
    );
    await shownPromise;

    Assert.ok(about3Pane.mailContextMenu.selectionIsOverridden);
    Assert.deepEqual(
      threadTree.selectedIndices,
      [testIndex],
      "selection should be only the right-clicked-on row"
    );
    let contextTargetRows = threadTree.querySelectorAll(".context-menu-target");
    Assert.equal(
      contextTargetRows.length,
      1,
      "one row should have .context-menu-target"
    );
    Assert.equal(
      contextTargetRows[0].index,
      testIndex,
      "correct row has .context-menu-target"
    );

    let hiddenPromise = BrowserTestUtils.waitForEvent(
      mailContext,
      "popuphidden"
    );
    mailContext.activateItem(itemToActivate);
    await hiddenPromise;

    Assert.ok(!about3Pane.mailContextMenu.selectionIsOverridden);
    Assert.equal(
      document.activeElement,
      tabmail.tabInfo[0].chromeBrowser,
      "about:3pane should have focus after context menu"
    );
    Assert.equal(
      about3Pane.document.activeElement,
      threadTree.table.body,
      "table body should have focus after context menu"
    );

    // Selection should be restored.
    await validateTree(
      15,
      threadTree.selectedIndices,
      originalSelection.at(-1)
    );

    // Wait to prove unwanted selection or load didn't happen.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 500));

    threadTree.removeEventListener("select", reportBadSelectEvent);
    messagePaneBrowser.removeEventListener("load", reportBadLoad, true);
  }

  // Opening a new tab should open the clicked-on message, not the selected.
  async function subtestOpenTab(testIndex, messageId) {
    let newAboutMessagePromise = BrowserTestUtils.waitForEvent(
      tabmail,
      "aboutMessageLoaded"
    ).then(async function (event) {
      await BrowserTestUtils.browserLoaded(
        event.target.getMessagePaneBrowser()
      );
      return event.target;
    });
    await doContextMenu(testIndex, messageId, openNewTabItem);

    let newAboutMessage = await newAboutMessagePromise;
    Assert.equal(
      newAboutMessage.gMessage.messageId,
      messageId,
      "correct message should have opened in a tab"
    );
    Assert.equal(
      tabmail.tabInfo.length,
      2,
      "only one new tab should have opened"
    );
    tabmail.closeOtherTabs(0);
  }

  // Replying should quote the clicked-on message, not the selected, even when
  // some text is selected in the message pane.
  async function subtestReply(testIndex, messageId) {
    Assert.stringContains(
      messagePaneBrowser.contentDocument.body.textContent,
      "Hello Bob Bell!"
    );
    messagePaneBrowser.contentWindow
      .getSelection()
      .selectAllChildren(messagePaneBrowser.contentDocument.body);

    let composeWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    await doContextMenu(testIndex, messageId, replyItem);
    let composeWindow = await composeWindowPromise;
    let composeEditor = composeWindow.GetCurrentEditorElement();
    let composeBody = await TestUtils.waitForCondition(
      () => composeEditor.contentDocument.body.textContent
    );

    Assert.stringContains(
      composeBody,
      "Hello Felix Flowers!",
      "new message should quote the right-clicked-on message"
    );
    Assert.ok(
      !composeBody.includes("Hello Bob Bell!"),
      "new message should not quote the selected message"
    );

    await BrowserTestUtils.closeWindow(composeWindow);
  }
});

async function messageLoaded(index) {
  await BrowserTestUtils.browserLoaded(messagePaneBrowser);
  Assert.equal(
    aboutMessage.gMessage.messageId,
    sourceMessageIDs[index],
    "correct message loaded"
  );
}

async function validateTree(rowCount, selectedIndices, currentIndex) {
  Assert.equal(threadTree.view.rowCount, rowCount, "row count of view");
  await TestUtils.waitForCondition(
    () => threadTree.table.body.rows.length == rowCount,
    "waiting table row count to match the view's row count"
  );

  Assert.deepEqual(
    threadTree.selectedIndices,
    selectedIndices,
    "table's selected indices"
  );
  let selectedRows = Array.from(threadTree.querySelectorAll(".selected"));
  Assert.equal(
    selectedRows.length,
    selectedIndices.length,
    "number of rows with .selected class"
  );
  for (let index of selectedIndices) {
    let row = threadTree.getRowAtIndex(index);
    Assert.ok(
      selectedRows.includes(row),
      `.selected row at ${index} is expected`
    );
  }

  Assert.equal(threadTree.currentIndex, currentIndex, "table's current index");
  let currentRows = threadTree.querySelectorAll(".current");
  Assert.equal(currentRows.length, 1, "one row should have .current");
  Assert.equal(
    currentRows[0],
    threadTree.getRowAtIndex(currentIndex),
    ".current row is expected"
  );

  let contextTargetRows = threadTree.querySelectorAll(".context-menu-target");
  Assert.equal(
    contextTargetRows.length,
    0,
    "no rows should have .context-menu-target"
  );
}

async function move(messages, source, dest) {
  let copyListener = new PromiseTestUtils.PromiseCopyListener();
  MailServices.copy.copyMessages(
    source,
    messages,
    dest,
    true,
    copyListener,
    top.msgWindow,
    false
  );
  await copyListener.promise;
}

function reportBadSelectEvent() {
  Assert.report(
    true,
    undefined,
    undefined,
    "should not have fired a select event"
  );
}

function reportBadLoad() {
  Assert.report(true, undefined, undefined, "should not have loaded a message");
}

async function restoreMessages() {
  // Move all of the messages back to folder A.
  await move([...folderB.messages], folderB, folderA);
  let archiveFolder = rootFolder.getFolderWithFlags(
    Ci.nsMsgFolderFlags.Archive
  );
  if (archiveFolder) {
    for (let folder of archiveFolder.subFolders) {
      await move([...folder.messages], folder, folderA);
    }
  }
  await move([...trashFolder.messages], trashFolder, folderA);

  // Restore all of the messages in `sourceMessages`, in the right order.
  sourceMessages = [...folderA.messages].sort(
    (a, b) =>
      sourceMessageIDs.indexOf(a.messageId) -
      sourceMessageIDs.indexOf(b.messageId)
  );
}

add_task(async function testThreadTreeA11yRoles() {
  Assert.equal(
    threadTree.table.body.getAttribute("role"),
    "listbox",
    "The tree view should be presented as ListBox"
  );
  Assert.equal(
    threadTree.getRowAtIndex(0).getAttribute("role"),
    "option",
    "The message row should be presented as Option"
  );

  about3Pane.sortController.sortThreaded();

  await BrowserTestUtils.waitForCondition(
    () => threadTree.table.body.getAttribute("role") == "tree",
    "The tree view should switch to a Tree View role"
  );
  Assert.equal(
    threadTree.getRowAtIndex(0).getAttribute("role"),
    "treeitem",
    "The message row should be presented as Tree Item"
  );

  about3Pane.sortController.groupBySort();
  threadTree.scrollToIndex(0, true);

  await BrowserTestUtils.waitForCondition(
    () => threadTree.table.body.getAttribute("role") == "tree",
    "The message list table should remain presented as Tree View"
  );
  Assert.equal(
    threadTree.getRowAtIndex(0).getAttribute("role"),
    "treeitem",
    "The first dummy message row should be presented as Tree Item"
  );

  about3Pane.sortController.sortUnthreaded();
});
