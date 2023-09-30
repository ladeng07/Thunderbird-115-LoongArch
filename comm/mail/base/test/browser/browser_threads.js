/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);

let tabmail = document.getElementById("tabmail");
let about3Pane = tabmail.currentAbout3Pane;
let { threadPane, threadTree } = about3Pane;
let { notificationBox } = threadPane;
let rootFolder, testFolder, testMessages;

add_setup(async function () {
  Services.prefs.setStringPref(
    "mail.ignore_thread.learn_more_url",
    "http://mochi.test:8888/"
  );
  document.getElementById("toolbar-menubar").removeAttribute("autohide");

  let generator = new MessageGenerator();

  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  account.addIdentity(MailServices.accounts.createIdentity());
  rootFolder = account.incomingServer.rootFolder;

  rootFolder.createSubfolder("threads", null);
  testFolder = rootFolder
    .getChildNamed("threads")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);

  testFolder.addMessageBatch(
    generator
      .makeMessages({ count: 25, msgsPerThread: 5 })
      .map(message => message.toMboxString())
  );
  testMessages = [...testFolder.messages];

  about3Pane.displayFolder(testFolder.URI);
  about3Pane.paneLayout.messagePaneVisible = false;
  goDoCommand("cmd_expandAllThreads");

  await ensure_table_view();

  // Check the initial state of a sample of messages.

  checkRowThreadState(0, true);
  checkRowThreadState(1, false);
  checkRowThreadState(2, false);
  checkRowThreadState(3, false);
  checkRowThreadState(4, false);
  checkRowThreadState(5, true);
  checkRowThreadState(10, true);
  checkRowThreadState(15, true);
  checkRowThreadState(20, true);

  registerCleanupFunction(async () => {
    await ensure_cards_view();
    MailServices.accounts.removeAccount(account, false);
    about3Pane.paneLayout.messagePaneVisible = true;
    Services.prefs.clearUserPref("mail.ignore_thread.learn_more_url");
  });
});

/**
 * Test that a double click on a button doesn't trigger the opening of the
 * message.
 */
add_task(async function checkDoubleClickOnThreadButton() {
  let row = threadTree.getRowAtIndex(20);
  Assert.ok(
    !row.classList.contains("collapsed"),
    "The thread row should be expanded"
  );

  Assert.equal(tabmail.tabInfo.length, 1, "Only 1 tab currently visible");

  let button = row.querySelector(".thread-container .twisty");
  // Simulate a double click on the twisty icon.
  EventUtils.synthesizeMouseAtCenter(button, { clickCount: 2 }, about3Pane);

  Assert.equal(
    tabmail.tabInfo.length,
    1,
    "The message wasn't opened in another tab"
  );

  // Normally a double click on the twisty would close and open the thread, but
  // this simulated click is too fast and the second click happens before the
  // row is collapsed. Let's click on it again once to return to the original
  // state.
  EventUtils.synthesizeMouseAtCenter(button, {}, about3Pane);

  Assert.ok(
    !row.classList.contains("collapsed"),
    "The double click was registered as 2 separate clicks and the thread row is still expanded"
  );
});

add_task(async function testIgnoreThread() {
  // Check the menu items for the root message in a thread.

  threadTree.selectedIndex = 0;
  await checkMessageMenu({ killThread: false });
  await checkContextMenu(0, { "mailContext-ignoreThread": false });

  // Check and use the menu items for a message inside a thread. Ignoring a
  // thread should work from any message in the thread.
  threadTree.selectedIndex = 2;
  await checkMessageMenu({ killThread: false });
  await checkContextMenu(
    2,
    { "mailContext-ignoreThread": false },
    "mailContext-ignoreThread"
  );

  // Check the thread is ignored and collapsed.

  checkRowThreadState(0, "ignore");
  Assert.ok(
    threadTree.getRowAtIndex(0).classList.contains("collapsed"),
    "ignored row should have the 'collapsed' class"
  );

  // Restore the thread using the context menu item.

  threadTree.selectedIndex = 0;
  await checkMessageMenu({ killThread: true });
  await checkContextMenu(
    0,
    { "mailContext-ignoreThread": true },
    "mailContext-ignoreThread"
  );

  checkRowThreadState(0, true);

  // Ignore the next thread. The first thread was collapsed by ignoring it,
  // so the next thread is at index 1.

  threadTree.selectedIndex = 1;
  await checkMessageMenu({ killThread: false });
  await checkContextMenu(
    1,
    { "mailContext-ignoreThread": false },
    "mailContext-ignoreThread"
  );

  checkRowThreadState(1, "ignore");
  Assert.ok(
    threadTree.getRowAtIndex(1).classList.contains("collapsed"),
    "ignored row should have the 'collapsed' class"
  );

  // Check the notification about the ignored thread.

  let notification =
    notificationBox.getNotificationWithValue("ignoreThreadInfo");
  let label = notification.shadowRoot.querySelector(
    "label.notification-message"
  );
  Assert.stringContains(label.textContent, testMessages[5].subject);
  let buttons = notification.shadowRoot.querySelectorAll(
    "button.notification-button"
  );
  Assert.equal(buttons.length, 2);

  // Click the Learn More button, and check it opens the support page in a new tab.
  let tabOpenPromise = BrowserTestUtils.waitForEvent(
    tabmail.tabContainer,
    "TabOpen"
  );
  EventUtils.synthesizeMouseAtCenter(buttons[0], {}, about3Pane);
  let event = await tabOpenPromise;
  await BrowserTestUtils.browserLoaded(event.detail.tabInfo.browser);
  Assert.equal(
    event.detail.tabInfo.browser.currentURI.spec,
    "http://mochi.test:8888/"
  );
  tabmail.closeTab(event.detail.tabInfo);
  Assert.ok(notification.parentNode, "notification should not be closed");

  // Click the Undo button, and check it stops ignoring the thread.
  EventUtils.synthesizeMouseAtCenter(buttons[1], {}, about3Pane);
  await TestUtils.waitForCondition(() => !notification.parentNode);
  checkRowThreadState(1, true);

  goDoCommand("cmd_expandAllThreads");
});

add_task(async function testIgnoreSubthread() {
  // Check and use the menu items for a message inside a thread.

  threadTree.selectedIndex = 12;
  await checkMessageMenu({ killSubthread: false });
  await checkContextMenu(
    12,
    { "mailContext-ignoreSubthread": false },
    "mailContext-ignoreSubthread"
  );

  // Check all messages in that subthread are marked as ignored.

  checkRowThreadState(12, "ignoreSubthread");
  checkRowThreadState(13, "ignoreSubthread");
  checkRowThreadState(14, "ignoreSubthread");

  // Restore the subthread using the context menu item.

  threadTree.selectedIndex = 12;
  await checkMessageMenu({ killSubthread: true });
  await checkContextMenu(
    12,
    { "mailContext-ignoreSubthread": true },
    "mailContext-ignoreSubthread"
  );

  checkRowThreadState(12, false);
  checkRowThreadState(13, false);
  checkRowThreadState(14, false);

  // Ignore a different subthread.

  threadTree.selectedIndex = 17;
  await checkMessageMenu({ killSubthread: false });
  await checkContextMenu(
    17,
    { "mailContext-ignoreSubthread": false },
    "mailContext-ignoreSubthread"
  );

  checkRowThreadState(17, "ignoreSubthread");
  checkRowThreadState(18, "ignoreSubthread");
  checkRowThreadState(19, "ignoreSubthread");

  // Check the notification about the ignored subthread.

  let notification =
    notificationBox.getNotificationWithValue("ignoreThreadInfo");
  let label = notification.shadowRoot.querySelector(
    "label.notification-message"
  );
  Assert.stringContains(label.textContent, testMessages[17].subject);
  let buttons = notification.shadowRoot.querySelectorAll(
    "button.notification-button"
  );
  Assert.equal(buttons.length, 2);

  // Click the Undo button, and check it stops ignoring the subthread.
  EventUtils.synthesizeMouseAtCenter(buttons[1], {}, about3Pane);
  await TestUtils.waitForCondition(() => !notification.parentNode);
  checkRowThreadState(17, false);
  checkRowThreadState(18, false);
  checkRowThreadState(19, false);
});

add_task(async function testWatchThread() {
  threadTree.selectedIndex = 20;
  await checkMessageMenu({ watchThread: false });
  await checkContextMenu(
    20,
    { "mailContext-watchThread": false },
    "mailContext-watchThread"
  );

  checkRowThreadState(20, "watched");
  checkRowThreadState(21, false);

  await checkMessageMenu({ watchThread: true });
  await checkContextMenu(
    20,
    { "mailContext-watchThread": true },
    "mailContext-watchThread"
  );

  checkRowThreadState(20, true);
  checkRowThreadState(21, false);
});

async function checkContextMenu(index, expectedStates, itemToActivate) {
  let contextMenu = about3Pane.document.getElementById("mailContext");
  let row = threadTree.getRowAtIndex(index);

  let shownPromise = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(
    row.querySelector(".subject-line"),
    { type: "contextmenu" },
    about3Pane
  );
  await shownPromise;

  for (let [id, checkedState] of Object.entries(expectedStates)) {
    assertCheckedState(about3Pane.document.getElementById(id), checkedState);
  }

  let hiddenPromise = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  if (itemToActivate) {
    contextMenu.activateItem(
      about3Pane.document.getElementById(itemToActivate)
    );
  } else {
    contextMenu.hidePopup();
  }
  await hiddenPromise;
}

async function checkMessageMenu(expectedStates) {
  if (AppConstants.platform == "macosx") {
    // Can't check the menu.
    return;
  }

  let messageMenu = document.getElementById("messageMenu");

  let shownPromise = BrowserTestUtils.waitForEvent(
    messageMenu.menupopup,
    "popupshown"
  );
  EventUtils.synthesizeMouseAtCenter(messageMenu, {}, window);
  await shownPromise;

  for (let [id, checkedState] of Object.entries(expectedStates)) {
    assertCheckedState(document.getElementById(id), checkedState);
  }

  messageMenu.menupopup.hidePopup();
}

function assertCheckedState(menuItem, checkedState) {
  if (checkedState) {
    Assert.equal(menuItem.getAttribute("checked"), "true");
  } else {
    Assert.ok(
      !menuItem.hasAttribute("checked") ||
        menuItem.getAttribute("checked") == "false"
    );
  }
}

function checkRowThreadState(index, expected) {
  let row = threadTree.getRowAtIndex(index);
  let icon = row.querySelector(".threadcol-column img");

  if (!expected) {
    Assert.ok(
      !row.classList.contains("children"),
      "row should not have the 'children' class"
    );
    Assert.ok(BrowserTestUtils.is_hidden(icon), "icon should be hidden");
    return;
  }

  Assert.ok(BrowserTestUtils.is_visible(icon), "icon should be visible");

  let shouldHaveChildrenClass = true;
  let iconContent = getComputedStyle(icon).content;

  switch (expected) {
    case true:
      Assert.stringContains(iconContent, "/thread-sm.svg");
      break;
    case "ignore":
      Assert.stringContains(row.dataset.properties, "ignore");
      Assert.stringContains(iconContent, "/thread-ignored.svg");
      break;
    case "ignoreSubthread":
      Assert.stringContains(row.dataset.properties, "ignoreSubthread");
      Assert.stringContains(iconContent, "/subthread-ignored.svg");
      shouldHaveChildrenClass = false;
      break;
    case "watched":
      Assert.stringContains(row.dataset.properties, "watch");
      Assert.stringContains(iconContent, "/eye.svg");
      break;
  }

  Assert.equal(
    row.classList.contains("children"),
    shouldHaveChildrenClass,
    `row should${
      shouldHaveChildrenClass ? "" : " not"
    } have the 'children' class`
  );
}
