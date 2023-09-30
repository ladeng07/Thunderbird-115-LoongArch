/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The purpose of this test is to ensure that remote content can't gain access
 * to messages by loading their URIs.
 */

"use strict";

var composeHelper = ChromeUtils.import(
  "resource://testing-common/mozmill/ComposeHelpers.jsm"
);
var { open_content_tab_with_url } = ChromeUtils.import(
  "resource://testing-common/mozmill/ContentTabHelpers.jsm"
);
var {
  assert_nothing_selected,
  assert_selected_and_displayed,
  be_in_folder,
  create_folder,
  mc,
  select_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var folder = null;
var gMsgNo = 0;

var url =
  "http://mochi.test:8888/browser/comm/mail/test/browser/content-policy/html/";

// These two constants are used to build the message body.
var msgBody =
  '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n' +
  "<html>\n" +
  "<head>\n" +
  "\n" +
  '<meta http-equiv="content-type" content="text/html; charset=ISO-8859-1">\n' +
  "</head>\n" +
  '<body bgcolor="#ffffff" text="#000000">\n' +
  '<img id="testelement" src="' +
  url +
  'pass.png"/>\n' +
  "</body>\n</html>\n";

add_setup(async function () {
  folder = await create_folder("exposedInContent");
});

function addToFolder(aSubject, aBody, aFolder) {
  let msgId = Services.uuid.generateUUID() + "@mozillamessaging.invalid";

  let source =
    "From - Sat Nov  1 12:39:54 2008\n" +
    "X-Mozilla-Status: 0001\n" +
    "X-Mozilla-Status2: 00000000\n" +
    "Message-ID: <" +
    msgId +
    ">\n" +
    "Date: Wed, 11 Jun 2008 20:32:02 -0400\n" +
    "From: Tester <tests@mozillamessaging.invalid>\n" +
    "User-Agent: Thunderbird 3.0a2pre (Macintosh/2008052122)\n" +
    "MIME-Version: 1.0\n" +
    "To: recipient@mozillamessaging.invalid\n" +
    "Subject: " +
    aSubject +
    "\n" +
    "Content-Type: text/html; charset=ISO-8859-1\n" +
    "Content-Transfer-Encoding: 7bit\n" +
    "\n" +
    aBody +
    "\n";

  aFolder.QueryInterface(Ci.nsIMsgLocalMailFolder);
  aFolder.gettingNewMessages = true;

  aFolder.addMessage(source);
  aFolder.gettingNewMessages = false;

  return aFolder.msgDatabase.getMsgHdrForMessageID(msgId);
}

function addMsgToFolder(folder) {
  let msgDbHdr = addToFolder("exposed test message " + gMsgNo, msgBody, folder);

  // select the newly created message
  let msgHdr = select_click_row(gMsgNo);

  if (msgDbHdr != msgHdr) {
    throw new Error(
      "Selected Message Header is not the same as generated header"
    );
  }

  assert_selected_and_displayed(gMsgNo);

  ++gMsgNo;

  // We also want to return the url of the message, so save that here.
  let msgSimpleURL = msgHdr.folder.getUriForMsg(msgHdr);

  let msgService = MailServices.messageServiceFromURI(msgSimpleURL);

  let neckoURL = msgService.getUrlForUri(msgSimpleURL);

  // This is the full url to the message that we want (i.e. passing this to
  // a browser element or iframe will display it).
  return neckoURL.spec;
}

async function checkContentTab(msgURL) {
  // To open a tab we're going to have to cheat and use tabmail so we can load
  // in the data of what we want.
  let preCount =
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length;

  let dataurl =
    "data:text/html,<html><head><title>test exposed</title>" +
    '</head><body><iframe id="msgIframe" src="' +
    encodeURI(msgURL) +
    '"/></body></html>';

  let newTab = open_content_tab_with_url(dataurl);

  Assert.notEqual(newTab.browser.currentURI.spec, "about:blank");
  Assert.equal(newTab.browser.webProgress.isLoadingDocument, false);
  Assert.equal(
    newTab.browser.browsingContext.children[0].currentWindowGlobal,
    null,
    "Message display/access has been blocked from remote content!"
  );

  await SpecialPowers.spawn(newTab.browser, [], () => {
    Assert.equal(
      content.frames[0].location.href,
      "about:blank",
      "Message display/access has been blocked from remote content!"
    );
  });

  mc.window.document.getElementById("tabmail").closeTab(newTab);

  if (
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length !=
    preCount
  ) {
    throw new Error("The content tab didn't close");
  }
}

add_task(async function test_exposedInContentTabs() {
  await be_in_folder(folder);

  assert_nothing_selected();

  // Check for denied in mail
  let msgURL = addMsgToFolder(folder);

  // Check allowed in content tab
  await checkContentTab(msgURL);

  Assert.report(
    false,
    undefined,
    undefined,
    "Test ran to completion successfully"
  );
});
