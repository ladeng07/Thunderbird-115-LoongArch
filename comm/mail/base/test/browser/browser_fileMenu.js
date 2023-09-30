/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const { MessageGenerator } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageGenerator.jsm"
);

/** @type MenuData */
const fileMenuData = {
  menu_New: {},
  menu_newNewMsgCmd: {},
  "calendar-new-event-menuitem": { hidden: true },
  "calendar-new-task-menuitem": { hidden: true },
  menu_newFolder: { hidden: ["mailMessageTab", "contentTab"] },
  menu_newVirtualFolder: { hidden: ["mailMessageTab", "contentTab"] },
  newCreateEmailAccountMenuItem: {},
  newMailAccountMenuItem: {},
  newIMAccountMenuItem: {},
  newFeedAccountMenuItem: {},
  newNewsgroupAccountMenuItem: {},
  "calendar-new-calendar-menuitem": {},
  menu_newCard: {},
  newIMContactMenuItem: { disabled: true },
  menu_Open: {},
  openMessageFileMenuitem: {},
  "calendar-open-calendar-file-menuitem": {},
  menu_close: {},
  "calendar-save-menuitem": { hidden: true },
  "calendar-save-and-close-menuitem": { hidden: true },
  menu_saveAs: {},
  menu_saveAsFile: { disabled: ["mail3PaneTab", "contentTab"] },
  menu_saveAsTemplate: { disabled: ["mail3PaneTab", "contentTab"] },
  menu_getAllNewMsg: {},
  menu_getnewmsgs_all_accounts: { disabled: true },
  menu_getnewmsgs_current_account: { disabled: true },
  menu_getnextnmsg: { hidden: true },
  menu_sendunsentmsgs: { disabled: true },
  menu_subscribe: { disabled: true },
  menu_deleteFolder: { disabled: true },
  menu_renameFolder: { disabled: true },
  menu_compactFolder: { disabled: ["mailMessageTab", "contentTab"] },
  menu_emptyTrash: { disabled: ["mailMessageTab", "contentTab"] },
  offlineMenuItem: {},
  goOfflineMenuItem: {},
  menu_synchronizeOffline: {},
  menu_settingsOffline: { disabled: true },
  menu_downloadFlagged: { disabled: true },
  menu_downloadSelected: { disabled: true },
  printMenuItem: { disabled: ["mail3PaneTab"] },
  menu_FileQuitItem: {},
};
let helper = new MenuTestHelper("menu_File", fileMenuData);

let tabmail = document.getElementById("tabmail");
let inboxFolder, plainFolder, rootFolder, testMessages, trashFolder;

add_setup(async function () {
  document.getElementById("toolbar-menubar").removeAttribute("autohide");

  let generator = new MessageGenerator();

  MailServices.accounts.createLocalMailAccount();
  let account = MailServices.accounts.accounts[0];
  account.addIdentity(MailServices.accounts.createIdentity());
  rootFolder = account.incomingServer.rootFolder;

  rootFolder.createSubfolder("file menu inbox", null);
  inboxFolder = rootFolder
    .getChildNamed("file menu inbox")
    .QueryInterface(Ci.nsIMsgLocalMailFolder);
  inboxFolder.setFlag(Ci.nsMsgFolderFlags.Inbox);
  inboxFolder.addMessageBatch(
    generator.makeMessages({ count: 5 }).map(message => message.toMboxString())
  );
  testMessages = [...inboxFolder.messages];

  rootFolder.createSubfolder("file menu plain", null);
  plainFolder = rootFolder.getChildNamed("file menu plain");

  trashFolder = rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);

  window.OpenMessageInNewTab(testMessages[0], { background: true });
  await BrowserTestUtils.waitForEvent(
    tabmail.tabInfo[1].chromeBrowser,
    "MsgLoaded"
  );

  window.openTab("contentTab", {
    url: "https://example.com/",
    background: true,
  });

  registerCleanupFunction(() => {
    tabmail.closeOtherTabs(0);
    MailServices.accounts.removeAccount(account, false);
  });
});

add_task(async function test3PaneTab() {
  tabmail.currentAbout3Pane.displayFolder(rootFolder);
  await helper.testAllItems("mail3PaneTab");

  tabmail.currentAbout3Pane.displayFolder(inboxFolder);
  await helper.testItems({
    menu_deleteFolder: { disabled: true },
    menu_renameFolder: { disabled: true },
    menu_compactFolder: { disabled: false },
    menu_emptyTrash: {},
  });

  tabmail.currentAbout3Pane.displayFolder(plainFolder);
  await helper.testItems({
    menu_deleteFolder: { disabled: false },
    menu_renameFolder: { disabled: false },
    menu_compactFolder: { disabled: false },
    menu_emptyTrash: {},
  });

  tabmail.currentAbout3Pane.displayFolder(trashFolder);
  await helper.testItems({
    menu_deleteFolder: { disabled: true },
    menu_renameFolder: { disabled: true },
    menu_compactFolder: { disabled: false },
    menu_emptyTrash: {},
  });
});

add_task(async function testMessageTab() {
  tabmail.switchToTab(1);
  await helper.testAllItems("mailMessageTab");
});

add_task(async function testContentTab() {
  tabmail.switchToTab(2);
  await helper.testAllItems("contentTab");
});
