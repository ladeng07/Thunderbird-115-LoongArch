/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests whether JavaScript in a local/remote message works. The test
 * mailnews/extensions/newsblog/test/browser/browser_feedDisplay.js does the
 * same thing for feeds.
 *
 * @note This assumes an existing local account.
 */

"use strict";

var {
  assert_nothing_selected,
  assert_selected_and_displayed,
  be_in_folder,
  create_folder,
  get_about_message,
  select_click_row,
  select_none,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

var {
  close_compose_window,
  open_compose_with_forward,
  open_compose_with_reply,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");

var { MailE10SUtils } = ChromeUtils.import(
  "resource:///modules/MailE10SUtils.jsm"
);

let aboutMessage = get_about_message();

var folder;
registerCleanupFunction(async () => {
  let promptPromise = BrowserTestUtils.promiseAlertDialog("accept");
  folder.deleteSelf(window.msgWindow);
  await promptPromise;

  Services.focus.focusedWindow = window;
});

var url =
  "http://mochi.test:8888/browser/comm/mail/test/browser/content-policy/html/";

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
    "Content-Base: " +
    url +
    "remote-noscript.html\n" +
    "\n" +
    aBody +
    "\n";

  aFolder.QueryInterface(Ci.nsIMsgLocalMailFolder);
  aFolder.gettingNewMessages = true;

  aFolder.addMessage(source);
  aFolder.gettingNewMessages = false;

  return aFolder.msgDatabase.getMsgHdrForMessageID(msgId);
}

/*
 * Runs in the browser process via SpecialPowers.spawn to check JavaScript
 * is disabled.
 */
function assertJSDisabled() {
  Assert.ok(content.location.href);
  Assert.ok(
    !content.wrappedJSObject.jsIsTurnedOn,
    "JS should not be turned on in content."
  );

  let noscript = content.document.querySelector("noscript");
  let display = content.getComputedStyle(noscript).display;
  Assert.equal(display, "inline", "noscript display should be 'inline'");
}

/*
 * Runs in the browser process via SpecialPowers.spawn to check JavaScript
 * is enabled.
 */
function assertJSEnabled() {
  Assert.ok(content.location.href);
  Assert.ok(
    content.wrappedJSObject.jsIsTurnedOn,
    "JS should be turned on in content."
  );

  let noscript = content.document.querySelector("noscript");
  let display = content.getComputedStyle(noscript).display;
  Assert.equal(display, "none", "noscript display should be 'none'");
}

var jsMsgBody =
  '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n' +
  "<html>\n" +
  "<head>\n" +
  "\n" +
  '<meta http-equiv="content-type" content="text/html; charset=ISO-8859-1">\n' +
  "</head>\n" +
  '<body bgcolor="#ffffff" text="#000000">\n' +
  "this is a test<big><big><big> stuff\n" +
  "<br><br>\n" +
  "</big></big></big>\n" +
  "<noscript>\n" +
  "hello, this content is noscript!\n" +
  "</noscript>\n" +
  "<script>\n" +
  "var jsIsTurnedOn = true;\n" +
  "</script>\n" +
  "\n" +
  "</body>\n" +
  "</html>\n";

var gMsgNo = 0;

var messagePane = aboutMessage.document.getElementById("messagepane");

add_setup(async function () {
  folder = await create_folder("jsContentPolicy");
});

/**
 * Check JavaScript is disabled when loading messages in the message pane.
 */
add_task(async function testJsInMail() {
  await be_in_folder(folder);

  let msgDbHdr = addToFolder("JS test message " + gMsgNo, jsMsgBody, folder);

  // select the newly created message
  let msgHdr = select_click_row(gMsgNo);

  Assert.equal(
    msgDbHdr,
    msgHdr,
    "selected message header should be the same as generated header"
  );

  assert_selected_and_displayed(gMsgNo);

  await SpecialPowers.spawn(messagePane, [], assertJSDisabled);

  ++gMsgNo;
  select_none();
});

/**
 * Check JavaScript is enabled when loading local content in the message pane.
 */
add_task(async function testJsInNonMessageContent() {
  let loadedPromise = BrowserTestUtils.browserLoaded(messagePane);
  MailE10SUtils.loadURI(
    messagePane,
    "data:text/html;charset=utf-8,<script>var jsIsTurnedOn%3Dtrue%3B<%2Fscript>bar" +
      "<noscript><p id='noscript-p'>hey this is noscript</p><%2Fnoscript>"
  );
  await loadedPromise;

  await SpecialPowers.spawn(messagePane, [], assertJSEnabled);

  MailE10SUtils.loadURI(messagePane, "about:blank");
});

/**
 * Check JavaScript is enabled when loading remote content in the message pane.
 */
add_task(async function testJsInRemoteContent() {
  // load something non-message-like in the message pane
  let loadedPromise = BrowserTestUtils.browserLoaded(messagePane);
  MailE10SUtils.loadURI(messagePane, url + "remote-noscript.html");
  await loadedPromise;

  await SpecialPowers.spawn(messagePane, [], assertJSEnabled);

  MailE10SUtils.loadURI(messagePane, "about:blank");
});

/**
 * Check JavaScript is disabled when loading messages in the message pane,
 * after remote content has been displayed there.
 */
add_task(async function testJsInMailAgain() {
  await be_in_folder(folder);

  let msgDbHdr = addToFolder("JS test message " + gMsgNo, jsMsgBody, folder);

  // select the newly created message
  let msgHdr = select_click_row(gMsgNo);

  Assert.equal(
    msgDbHdr,
    msgHdr,
    "selected message header should be the same as generated header"
  );

  assert_selected_and_displayed(gMsgNo);

  await SpecialPowers.spawn(messagePane, [], assertJSDisabled);

  ++gMsgNo;
  select_none();
});

/*
 * Runs in the browser process via SpecialPowers.spawn to check JavaScript
 * is disabled.
 */
function assertJSDisabledInEditor() {
  Assert.ok(content.location.href);
  Assert.ok(
    !content.wrappedJSObject.jsIsTurnedOn,
    "JS should not be turned on in editor."
  );

  // <noscript> is not shown in the editor, independent of whether scripts
  // are on or off. So we can't check that like in assertJSDisabledIn.
}

/**
 * Check JavaScript is disabled in the editor.
 */
add_task(async function testJsInMailReply() {
  await be_in_folder(folder);

  var body = jsMsgBody.replace(
    "</body>",
    "<img src=x onerror=alert(1)></body>"
  );

  let msgDbHdr = addToFolder("js msg reply " + gMsgNo, body, folder);

  // select the newly created message
  let msgHdr = select_click_row(gMsgNo);

  Assert.equal(
    msgDbHdr,
    msgHdr,
    "selected message header should be the same as generated header"
  );

  assert_selected_and_displayed(gMsgNo);

  await SpecialPowers.spawn(messagePane, [], assertJSDisabledInEditor);

  let replyWin = open_compose_with_reply();
  // If JavaScript is on, loading the window will actually show an alert(1)
  // so execution doesn't go further from here.
  let editor = replyWin.window.document.getElementById("messageEditor");
  await SpecialPowers.spawn(editor, [], assertJSDisabledInEditor);
  close_compose_window(replyWin);

  let fwdWin = open_compose_with_forward();
  editor = fwdWin.window.document.getElementById("messageEditor");
  await SpecialPowers.spawn(editor, [], assertJSDisabledInEditor);
  close_compose_window(fwdWin);

  ++gMsgNo;
  select_none();
});
