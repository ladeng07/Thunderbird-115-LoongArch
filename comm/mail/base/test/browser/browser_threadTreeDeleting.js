/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

requestLongerTimeout(2);

const { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);

let tabmail = document.getElementById("tabmail");
let about3Pane = tabmail.currentAbout3Pane;
let threadTree = about3Pane.threadTree;
// Not `currentAboutMessage` as (a) that's null right now, and (b) we'll be
// testing things that happen when about:message is hidden.
let aboutMessage = about3Pane.messageBrowser.contentWindow;
let messagePaneBrowser = aboutMessage.getMessagePaneBrowser();
let multiMessageView = about3Pane.multiMessageBrowser.contentWindow;
let generator = new MessageGenerator();
let rootFolder, sourceMessageIDs;

add_setup(async function () {
  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  account.addIdentity(MailServices.accounts.createIdentity());
  rootFolder = account.incomingServer.rootFolder.QueryInterface(
    Ci.nsIMsgLocalMailFolder
  );

  registerCleanupFunction(() => {
    MailServices.accounts.removeAccount(account, false);
  });
});

/** Test a real folder, unthreaded. */
add_task(async function testUnthreaded() {
  let folderA = rootFolder
    .createLocalSubfolder("threadTreeDeletingA")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderA.addMessageBatch(
    generator.makeMessages({ count: 15 }).map(message => message.toMboxString())
  );

  sourceMessageIDs = Array.from(folderA.messages, m => m.messageId);

  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderA.URI,
  });
  await ensure_cards_view();
  goDoCommand("cmd_sort", { target: { value: "unthreaded" } });

  await subtest();
});

/** Test a real folder with threads. */
add_task(async function testThreaded() {
  let folderB = rootFolder
    .createLocalSubfolder("threadTreeDeletingB")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderB.addMessageBatch(
    [
      // No real reason for the values here other than the total count.
      ...generator.makeMessages({ count: 4 }),
      ...generator.makeMessages({ count: 6, msgsPerThread: 3 }),
      ...generator.makeMessages({ count: 1 }),
      ...generator.makeMessages({ count: 2, msgsPerThread: 2 }),
      ...generator.makeMessages({ count: 2 }),
    ].map(message => message.toMboxString())
  );

  sourceMessageIDs = Array.from(folderB.messages, m => m.messageId);

  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderB.URI,
  });
  goDoCommand("cmd_sort", { target: { value: "threaded" } });
  goDoCommand("cmd_expandAllThreads");

  await subtest();
});

/** Test a virtual folder with a single backing folder. */
add_task(async function testSingleVirtual() {
  let folderC = rootFolder
    .createLocalSubfolder("threadTreeDeletingC")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderC.addMessageBatch(
    generator.makeMessages({ count: 15 }).map(message => message.toMboxString())
  );

  let virtualFolderC = rootFolder.createLocalSubfolder(
    "threadTreeDeletingVirtualC"
  );
  virtualFolderC.setFlag(Ci.nsMsgFolderFlags.Virtual);
  let folderInfoC = virtualFolderC.msgDatabase.dBFolderInfo;
  // Search for something instead of all messages, as the "ALL" search could
  // detected and the backing folder displayed instead, defeating the point of
  // this test.
  folderInfoC.setCharProperty("searchStr", "AND (date,is after,31-Dec-1999)");
  folderInfoC.setCharProperty("searchFolderUri", folderC.URI);

  sourceMessageIDs = Array.from(folderC.messages, m => m.messageId);

  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: virtualFolderC.URI,
  });

  await subtest();
});

/** Test a virtual folder with multiple backing folders. */
add_task(async function testXFVirtual() {
  let folderD = rootFolder
    .createLocalSubfolder("threadTreeDeletingD")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderD.addMessageBatch(
    generator.makeMessages({ count: 4 }).map(message => message.toMboxString())
  );

  let folderE = rootFolder
    .createLocalSubfolder("threadTreeDeletingE")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderE.addMessageBatch(
    generator
      .makeMessages({ count: 11, msgsPerThread: 3 })
      .map(message => message.toMboxString())
  );

  let virtualFolderDE = rootFolder.createLocalSubfolder(
    "threadTreeDeletingVirtualDE"
  );
  virtualFolderDE.setFlag(Ci.nsMsgFolderFlags.Virtual);
  let folderInfoY = virtualFolderDE.msgDatabase.dBFolderInfo;
  folderInfoY.setCharProperty("searchStr", "AND (date,is after,31-Dec-1999)");
  folderInfoY.setCharProperty(
    "searchFolderUri",
    `${folderD.URI}|${folderE.URI}`
  );

  sourceMessageIDs = [
    ...Array.from(folderD.messages, m => m.messageId),
    ...Array.from(folderE.messages, m => m.messageId),
  ];

  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: virtualFolderDE.URI,
  });
  goDoCommand("cmd_sort", { target: { value: "threaded" } });
  goDoCommand("cmd_expandAllThreads");

  await subtest();
});

/** Test a real folder with a quick filter applied. */
add_task(async function testQuickFiltered() {
  let folderF = rootFolder
    .createLocalSubfolder("threadTreeDeletingF")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderF.addMessageBatch(
    generator.makeMessages({ count: 30 }).map(message => message.toMboxString())
  );
  let flaggedMessages = [];
  let i = 0;
  for (let message of folderF.messages) {
    if (i++ % 2) {
      flaggedMessages.push(message);
    }
  }
  folderF.markMessagesFlagged(flaggedMessages, true);

  sourceMessageIDs = flaggedMessages.map(m => m.messageId);
  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderF.URI,
  });
  let filterer = about3Pane.quickFilterBar.filterer;
  filterer.clear();
  filterer.visible = true;
  filterer.setFilterValue("starred", true);
  about3Pane.quickFilterBar.updateSearch();

  await subtest();
});

/** Test a folder sorted by date descending. */
add_task(async function testSortDescending() {
  let folderG = rootFolder
    .createLocalSubfolder("threadTreeDeletingG")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderG.addMessageBatch(
    generator.makeMessages({ count: 15 }).map(message => message.toMboxString())
  );

  sourceMessageIDs = Array.from(folderG.messages, m => m.messageId).reverse();

  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderG.URI,
  });
  goDoCommand("cmd_sort", { target: { value: "descending" } });

  await subtest();
});

/** Test a folder sorted by subject. */
add_task(async function testSortBySubject() {
  let folderH = rootFolder
    .createLocalSubfolder("threadTreeDeletingH")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  folderH.addMessageBatch(
    generator.makeMessages({ count: 15 }).map(message => message.toMboxString())
  );

  sourceMessageIDs = Array.from(folderH.messages)
    .sort((m1, m2) => (m1.subject < m2.subject ? -1 : 1))
    .map(m => m.messageId);

  about3Pane.restoreState({
    messagePaneVisible: true,
    folderURI: folderH.URI,
  });
  goDoCommand("cmd_sort", { target: { value: "bySubject" } });

  await subtest();
});

async function subtest() {
  await TestUtils.waitForCondition(
    () => threadTree.table.body.rows.length == 15,
    "waiting for all of the table rows"
  );

  let dbView = about3Pane.gDBView;
  let subjects = [];
  for (let i = 0; i < 15; i++) {
    subjects.push(dbView.cellTextForColumn(i, "subjectCol"));
  }
  verifySubjects(subjects);

  threadTree.table.body.focus();
  threadTree.selectedIndex = 3;
  await messageLoaded(3);

  // Delete a single message.
  await doDeleteCommand(4);
  await verifySelection(14, [3], 3);
  verifySubjects([subjects[0], subjects[1], subjects[2], ...subjects.slice(4)]);

  // Delete a single message.
  await doDeleteCommand(5);
  await verifySelection(13, [3], 3);
  verifySubjects([subjects[0], subjects[1], subjects[2], ...subjects.slice(5)]);

  // Delete a single message by clicking the about:message Delete button.
  await doDeleteClick(6);
  await verifySelection(12, [3], 3);
  verifySubjects([subjects[0], subjects[1], subjects[2], ...subjects.slice(6)]);

  // Delete adjacent messages.
  threadTree.selectedIndices = [3, 4, 5];
  threadTree.currentIndex = 6;
  await doDeleteCommand(9);
  await verifySelection(9, [3], 3);
  verifySubjects([subjects[0], subjects[1], subjects[2], ...subjects.slice(9)]);

  // Delete non-adjacent messages.
  threadTree.selectedIndices = [2, 4];
  threadTree.currentIndex = 4;
  // We should select the message below the current index, but we select the
  // message below the first selected one.
  await doDeleteCommand(9);
  await verifySelection(7, [2], 2);
  verifySubjects([
    subjects[0],
    subjects[1],
    subjects[9],
    ...subjects.slice(11),
  ]);

  // Delete the last message.
  threadTree.selectedIndex = 6;
  await messageLoaded(14);
  await doDeleteCommand(13);
  await verifySelection(6, [5], 5);
  verifySubjects([
    subjects[0],
    subjects[1],
    subjects[9],
    ...subjects.slice(11, 14),
  ]);

  // Now cause a delete to happen from outside the UI.
  await doDeleteExternal(1);
  await verifySelection(5, [4], 4);
  verifySubjects([subjects[0], subjects[9], ...subjects.slice(11, 14)]);

  // Delete the selected message from outside the UI.
  threadTree.selectedIndex = 2;
  await messageLoaded(11);
  await doDeleteExternal(2, 12);
  await verifySelection(4, [2], 2);
  verifySubjects([subjects[0], subjects[9], ...subjects.slice(12, 14)]);
}

async function messageLoaded(index) {
  await BrowserTestUtils.browserLoaded(messagePaneBrowser);
  Assert.equal(
    aboutMessage.gMessage.messageId,
    sourceMessageIDs[index],
    "correct message loaded"
  );
}

async function _doDelete(callback, index, expectedLoad) {
  let selectCount = 0;
  let onSelect = () => selectCount++;
  threadTree.addEventListener("select", onSelect);

  let selectPromise;
  if (expectedLoad !== undefined) {
    selectPromise = BrowserTestUtils.waitForEvent(threadTree, "select");
  }
  await callback();
  if (selectPromise) {
    await selectPromise;
    await messageLoaded(expectedLoad);
  }
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 25));
  if (selectPromise) {
    Assert.equal(selectCount, 1, "'select' event should've happened only once");
  } else {
    Assert.equal(selectCount, 0, "'select' event should not have happened");
  }

  threadTree.removeEventListener("select", onSelect);
}

async function doDeleteCommand(expectedLoad) {
  await _doDelete(
    function () {
      goDoCommand("cmd_delete");
    },
    undefined,
    expectedLoad
  );
}

async function doDeleteClick(expectedLoad) {
  await _doDelete(
    function () {
      let messageView =
        threadTree.selectedIndices.length == 1
          ? aboutMessage
          : multiMessageView;
      EventUtils.synthesizeMouseAtCenter(
        messageView.document.getElementById("hdrTrashButton"),
        {},
        messageView
      );
    },
    undefined,
    expectedLoad
  );
}

async function doDeleteExternal(index, expectedLoad) {
  await _doDelete(
    function () {
      let message = about3Pane.gDBView.getMsgHdrAt(index);
      message.folder.deleteMessages(
        [message], // messages
        null, // msgWindow
        true, // deleteStorage
        false, // isMove
        null, // listener
        false // canUndo
      );
    },
    index,
    expectedLoad
  );
}

async function verifySelection(rowCount, selectedIndices, currentIndex) {
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
    `.current row at ${currentIndex} is expected`
  );

  let contextTargetRows = threadTree.querySelectorAll(".context-menu-target");
  Assert.equal(
    contextTargetRows.length,
    0,
    "no rows should have .context-menu-target"
  );
}

function verifySubjects(expectedSubjects) {
  let actualSubjects = Array.from(
    threadTree.table.body.rows,
    row =>
      row.querySelector(".thread-card-subject-container > .subject").textContent
  );
  Assert.equal(actualSubjects.length, expectedSubjects.length, "row count");
  for (let i = 0; i < expectedSubjects.length; i++) {
    Assert.equal(actualSubjects[i], expectedSubjects[i], `subject at ${i}`);
  }
}
