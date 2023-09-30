/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Checks various remote content policy workings, including:
 *
 * - Images
 * - Video
 *
 * In:
 *
 * - Messages
 * - Reply email compose window
 * - Forward email compose window
 * - Content tab
 * - Feed message
 */

"use strict";

var utils = ChromeUtils.import("resource://testing-common/mozmill/utils.jsm");
var {
  close_compose_window,
  open_compose_new_mail,
  open_compose_with_forward,
  open_compose_with_reply,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
var { open_content_tab_with_url } = ChromeUtils.import(
  "resource://testing-common/mozmill/ContentTabHelpers.jsm"
);
var {
  assert_nothing_selected,
  assert_selected_and_displayed,
  be_in_folder,
  close_message_window,
  create_folder,
  get_about_message,
  mc,
  open_message_from_file,
  open_selected_message,
  plan_for_message_display,
  select_click_row,
  set_open_message_behavior,
  wait_for_message_display_completion,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { input_value } = ChromeUtils.import(
  "resource://testing-common/mozmill/KeyboardHelpers.jsm"
);
var {
  get_notification_button,
  wait_for_notification_to_show,
  wait_for_notification_to_stop,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/NotificationBoxHelpers.jsm"
);
var {
  async_plan_for_new_window,
  click_menus_in_sequence,
  plan_for_modal_dialog,
  wait_for_modal_dialog,
  wait_for_new_window,
  wait_for_window_close,
} = ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var folder = null;
var gMsgNo = -1; // msg index in folder

var url =
  "http://mochi.test:8888/browser/comm/mail/test/browser/content-policy/html/";

/**
 * The TESTS array is constructed from objects containing the following:
 *
 * type:            The type of the test being run.
 * body:            The html to be inserted into the body of the message under
 *                  test. Note: the element under test for content
 *                  allowed/disallowed should have id 'testelement'.
 * webPage:         The web page to load during the content tab part of the
 *                  test.
 * checkForAllowed: A function that is passed the element with id 'testelement'
 *                  to check for remote content being allowed/disallowed.
 *                  This function should return true if remote content was
 *                  allowed, false otherwise.
 */
var TESTS = [
  {
    type: "Iframe-Image",
    description: "iframe img served over http should be blocked",
    shouldBeBlocked: true,

    // Blocked from showing by other means. Network request can happen.
    neverAllowed: true,
    body: `<iframe id='testelement' src='${url}remoteimage.html' />\n`,
    checkForAllowed: async element => {
      await new Promise(window.requestAnimationFrame);
      return element.contentDocument.readyState != "uninitialized";
    },
  },
  {
    type: "Iframe-datauri-Image",
    description: "iframe datauri img served over http should be blocked",
    shouldBeBlocked: true,

    // Blocked by other means. MsgContentPolicy accepts the iframe load since
    // data: is not a mailnews url. No blocked content notification will show.
    neverAllowed: true,
    body: `<iframe id='testelement' src='data:text/html,<html><p>data uri iframe with pic</p><img src='${url}pass.png' /></html>\n`,
    checkForAllowed: async element => {
      await new Promise(window.requestAnimationFrame);
      return element.contentDocument.readyState != "uninitialized";
    },
  },
  {
    type: "Image",
    description: "img served over http should be blocked",
    shouldBeBlocked: true,
    checkRemoteImg: true,
    body: '<img id="testelement" src="' + url + 'pass.png"/>\n',
    webPage: "remoteimage.html",
    checkForAllowed: async element => {
      await new Promise(window.requestAnimationFrame);
      return !element.matches(":-moz-broken") && element.naturalWidth > 0;
    },
    checkForAllowedRemote: () => {
      let element = content.document.getElementById("testelement");
      return !element.matches(":-moz-broken") && element.naturalWidth > 0;
    },
  },
  {
    type: "Video",
    description: "video served over http should be blocked",
    shouldBeBlocked: true,
    body: '<video id="testelement" src="' + url + 'video.ogv"/>\n',
    webPage: "remotevideo.html",
    checkForAllowed: async element => {
      await new Promise(window.requestAnimationFrame);
      return element.networkState != element.NETWORK_NO_SOURCE;
    },
    checkForAllowedRemote: () => {
      let element = content.document.getElementById("testelement");
      return element.networkState != element.NETWORK_NO_SOURCE;
    },
  },
  {
    type: "Image-Data",
    description: "img from data url should be allowed",
    shouldBeBlocked: false,
    body: '<img id="testelement" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAC4UlEQVR42o2UW0gUURzGZ7Wa3fW2667XF/OyPQSmmZaZEYWRFN1QEYxeCi3CCCmxl6CHEMzQyAi1IAktLxSipkJghl0swswShbxFD+Hiquvqus7OzNf5T7uhslsN/OCc//f9vz17zpzhOM+PD2Mjg2doXPCumg/3H4+KzLcu++yvL+WeNZZxUy3lnEzQmGqkuQJVfwvRPrqhutd6Z4Mw+mY75qZzIcvFCjSmGmnkIa+nMFXmHs7YXK4aet0UhiXbGUjLpyHMZWLFnK5AY6qRRh7yUs/6MP5xmW/Hh44oQC6CuHAQw28TMdCzDc7ZNAX3nDTykLe+1LfNtXe/N7aiWHOss1Yji0IhpMUDEK2pOHdSj1MZgcp4/VzxMC/1lF/RHHEfAP/kprp7fCgFsjMP0tIuhey9/jiUqPY6Jy/1sN5O96oC2u/yM7b5PCZmQBZ2KhSfNeJ8jt7rnLzU01bFmymDgvTPazSiJF2CLLFfklIUrHNJsHw3QZiOwvJUGMyDBvz8qMficADsY0bYx0PhXMlGZ7XGQRkUFNz5wE90ChfYJrIgMRFOSwyWx4JhHwn0zqgeov04uu5rBcpQVtRd4z9vs+axE4mHgwU4vun/ifAjCgvmDHRXB1jcKwpoqdC9m/icAMmWiuprfqi6qsVEHzNPGtdANdLIQ96JwXg0V+j63HvEl+TrCnqbjLLI/vPiZDSKctUw+XF/OKrmkMVzKNzEKRp5yEs9JQW6fPep0TsQ/vR2yPuhVyZAyoFkNmGkJwS11wPxIi4OX9PYC8nojo5WNPKQt6XS2E+9qy8yH7dZm9JVGzo10BMDu+0EYN8HeXYr6vy0mI+MVGgIClK0Ty9jQV7qWf1muy+sPyPhYWloR29TmDjxZQesM4fREBEBISubkaWMSSMPeV09Ko+3nxFTkGu42FwZ3t9TF2pp321CY2ycQmvSFgdp5PF2+9d8jxgGhomRzEh3keyqGTx9j34B1t40GMHNFqwAAAAASUVORK5CYII="/>\n',
    webPage: "remoteimagedata.html",
    checkForAllowed: async element => {
      await new Promise(window.requestAnimationFrame);
      return !element.matches(":-moz-broken") && element.naturalWidth > 0;
    },
    checkForAllowedRemote: () => {
      let element = content.document.getElementById("testelement");
      return !element.matches(":-moz-broken") && element.naturalWidth > 0;
    },
  },
  {
    type: "Iframe-srcdoc-Image",
    description: "iframe srcdoc img served over http should be blocked",
    shouldBeBlocked: true,

    body: `<html><iframe id='testelement' srcdoc='<html><img src="${url}pass.png" alt="pichere"/>'></html>`,
    checkForAllowed: async element => {
      await new Promise(window.requestAnimationFrame);
      let img = element.contentDocument.querySelector("img");
      return img && !img.matches(":-moz-broken") && img.naturalWidth > 0;
    },
  },
];

// TESTS = [TESTS[0]]; // To test single tests.

// These two constants are used to build the message body.
var msgBodyStart =
  '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">\n' +
  "<html>\n" +
  "<head>\n" +
  "\n" +
  '<meta http-equiv="content-type" content="text/html; charset=ISO-8859-1">\n' +
  "</head>\n" +
  '<body bgcolor="#ffffff" text="#000000">\n';

var msgBodyEnd = "</body>\n</html>\n";

add_setup(async () => {
  requestLongerTimeout(3);
  folder = await create_folder("generalContentPolicy");
  Assert.ok(folder, "folder should be set up");
  folder.QueryInterface(Ci.nsIMsgLocalMailFolder);
  registerCleanupFunction(() => {
    folder.deleteSelf(null);
  });
});

// We can't call it test since that it would be run as subtest.
function checkPermission(aURI) {
  let principal = Services.scriptSecurityManager.createContentPrincipal(
    aURI,
    {}
  );
  return Services.perms.testPermissionFromPrincipal(principal, "image");
}

function addPermission(aURI, aAllowDeny) {
  let principal = Services.scriptSecurityManager.createContentPrincipal(
    aURI,
    {}
  );
  return Services.perms.addFromPrincipal(principal, "image", aAllowDeny);
}

function removePermission(aURI) {
  let principal = Services.scriptSecurityManager.createContentPrincipal(
    aURI,
    {}
  );
  return Services.perms.removeFromPrincipal(principal, "image");
}

function addToFolder(aSubject, aBody, aFolder) {
  let msgId = Services.uuid.generateUUID() + "@mozillamessaging.invalid";

  gMsgNo++;
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
    " #" +
    gMsgNo +
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

async function addMsgToFolderAndCheckContent(folder, test) {
  info(`Checking msg in folder; test=${test.type}`);
  let msgDbHdr = addToFolder(
    test.type + " test message ",
    msgBodyStart + test.body + msgBodyEnd,
    folder
  );

  // select the newly created message
  let msgHdr = select_click_row(gMsgNo);

  if (msgDbHdr != msgHdr) {
    throw new Error(
      "Selected Message Header is not the same as generated header"
    );
  }

  assert_selected_and_displayed(gMsgNo);

  // Now check that the content hasn't been loaded
  let messageDocument =
    get_about_message().getMessagePaneBrowser().contentDocument;
  let testelement = messageDocument.getElementById("testelement");
  Assert.ok(testelement, "testelement should be found");
  if (test.shouldBeBlocked) {
    if (await test.checkForAllowed(testelement)) {
      throw new Error(
        test.type + " has not been blocked in message content as expected."
      );
    }
  } else if (!(await test.checkForAllowed(testelement))) {
    throw new Error(
      test.type + " has been unexpectedly blocked in message content."
    );
  }
}

/**
 * Check remote content in a compose window.
 *
 * @param test        The test from TESTS that is being performed.
 * @param replyType   The type of the compose window, set to true for "reply",
 *                    false for "forward".
 * @param loadAllowed Whether or not the load is expected to be allowed.
 */
async function checkComposeWindow(test, replyType, loadAllowed) {
  if (loadAllowed && test.neverAllowed) {
    return;
  }
  info(
    `Checking compose win; replyType=${replyType}, test=${test.type}; shouldLoad=${loadAllowed}`
  );
  let replyWindow = replyType
    ? open_compose_with_reply()
    : open_compose_with_forward();

  let what =
    test.description +
    ": " +
    test.type +
    " has not been " +
    (loadAllowed ? "allowed" : "blocked") +
    " in reply window as expected.";
  await TestUtils.waitForCondition(async () => {
    return (
      (await test.checkForAllowed(
        replyWindow.window.document
          .getElementById("messageEditor")
          .contentDocument.getElementById("testelement")
      )) == loadAllowed
    );
  }, what);

  close_compose_window(replyWindow);
}

/**
 * Check remote content in stand-alone message window, and reload
 */
async function checkStandaloneMessageWindow(test, loadAllowed) {
  if (loadAllowed && test.neverAllowed) {
    return;
  }
  info(
    `Checking standalong msg win; test=${test.type}; shouldLoad=${loadAllowed}`
  );
  let newWindowPromise = async_plan_for_new_window("mail:messageWindow");
  // Open it
  set_open_message_behavior("NEW_WINDOW");
  open_selected_message();
  let msgc = await newWindowPromise;
  wait_for_message_display_completion(msgc, true);
  if (
    (await test.checkForAllowed(
      get_about_message(msgc.window)
        .getMessagePaneBrowser()
        .contentDocument.getElementById("testelement")
    )) != loadAllowed
  ) {
    let expected = loadAllowed ? "allowed" : "blocked";
    throw new Error(
      `${test.type} was not ${expected} in standalone message content`
    );
  }

  // Clean up, close the window
  close_message_window(msgc);
}

/**
 * Check remote content in stand-alone message window loaded from .eml file.
 * Make sure there's a notification bar.
 */
async function checkEMLMessageWindow(test, emlFile) {
  let msgc = await open_message_from_file(emlFile);
  let aboutMessage = get_about_message(msgc.window);
  if (!aboutMessage.document.getElementById("mail-notification-top")) {
    throw new Error(test.type + " has no content notification bar.");
  }
  if (aboutMessage.document.getElementById("mail-notification-top").collapsed) {
    throw new Error(test.type + " content notification bar not shown.");
  }

  // Clean up, close the window
  close_message_window(msgc);
}

/**
 * Helper method to save one of the test files as an .eml file.
 *
 * @returns the file the message was safed to
 */
async function saveAsEMLFile(msgNo) {
  let msgHdr = select_click_row(msgNo);
  let messenger = Cc["@mozilla.org/messenger;1"].createInstance(
    Ci.nsIMessenger
  );
  let profD = Services.dirsvc.get("ProfD", Ci.nsIFile);
  var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  file.initWithFile(profD);
  file.append("content-policy-test-" + msgNo + ".eml");
  messenger.saveAs(
    msgHdr.folder.getUriForMsg(msgHdr),
    true,
    null,
    file.path,
    true
  );
  // no listener for saveAs, though we should add one.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 5000));
  return file;
}

async function allowRemoteContentAndCheck(test) {
  if (test.neverAllowed) {
    return;
  }
  info(`Checking allow remote content; test=${test.type}`);
  await addMsgToFolderAndCheckContent(folder, test);

  let aboutMessage = get_about_message();

  // Click on the allow remote content button
  const kBoxId = "mail-notification-top";
  const kNotificationValue = "remoteContent";
  wait_for_notification_to_show(aboutMessage, kBoxId, kNotificationValue);
  let prefButton = get_notification_button(
    aboutMessage,
    kBoxId,
    kNotificationValue,
    {
      popup: "remoteContentOptions",
    }
  );
  EventUtils.synthesizeMouseAtCenter(
    prefButton,
    { clickCount: 1 },
    aboutMessage
  );
  aboutMessage.document
    .getElementById("remoteContentOptions")
    .activateItem(
      aboutMessage.document.getElementById("remoteContentOptionAllowForMsg")
    );
  wait_for_notification_to_stop(aboutMessage, kBoxId, kNotificationValue);

  wait_for_message_display_completion(mc, true);

  if (
    !(await test.checkForAllowed(
      aboutMessage
        .getMessagePaneBrowser()
        .contentDocument.getElementById("testelement")
    ))
  ) {
    throw new Error(
      test.type + " has been unexpectedly blocked in message content"
    );
  }
}

async function checkContentTab(test) {
  if (!test.webPage) {
    return;
  }
  // To open a tab we're going to have to cheat and use tabmail so we can load
  // in the data of what we want.
  let preCount =
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length;

  let newTab = open_content_tab_with_url(url + test.webPage);

  if (
    !(await SpecialPowers.spawn(newTab.browser, [], test.checkForAllowedRemote))
  ) {
    throw new Error(
      test.type + " has been unexpectedly blocked in content tab"
    );
  }

  mc.window.document.getElementById("tabmail").closeTab(newTab);

  if (
    mc.window.document.getElementById("tabmail").tabContainer.allTabs.length !=
    preCount
  ) {
    throw new Error("The content tab didn't close");
  }
}

/**
 * Check remote content is not blocked in feed message (flagged with
 * nsMsgMessageFlags::FeedMsg)
 */
async function checkAllowFeedMsg(test) {
  if (test.neverAllowed) {
    return;
  }
  let msgDbHdr = addToFolder(
    test.type + " test feed message",
    msgBodyStart + test.body + msgBodyEnd,
    folder
  );
  msgDbHdr.orFlags(Ci.nsMsgMessageFlags.FeedMsg);

  // select the newly created message
  let msgHdr = select_click_row(gMsgNo);

  Assert.equal(msgDbHdr, msgHdr);
  assert_selected_and_displayed(gMsgNo);

  // Now check that the content hasn't been blocked
  let messageDocument =
    get_about_message().getMessagePaneBrowser().contentDocument;
  if (
    !(await test.checkForAllowed(messageDocument.getElementById("testelement")))
  ) {
    throw new Error(
      test.type + " has been unexpectedly blocked in feed message content."
    );
  }
}

/**
 * Check remote content is not blocked for a sender with permissions.
 */
async function checkAllowForSenderWithPerms(test) {
  if (test.neverAllowed) {
    return;
  }
  let msgDbHdr = addToFolder(
    test.type + " priv sender test message ",
    msgBodyStart + test.body + msgBodyEnd,
    folder
  );

  let addresses = MailServices.headerParser.parseEncodedHeader(msgDbHdr.author);
  let authorEmailAddress = addresses[0].email;

  let uri = Services.io.newURI(
    "chrome://messenger/content/email=" + authorEmailAddress
  );
  addPermission(uri, Services.perms.ALLOW_ACTION);
  Assert.equal(checkPermission(uri), Services.perms.ALLOW_ACTION);

  // select the newly created message
  let msgHdr = select_click_row(gMsgNo);

  Assert.equal(msgDbHdr, msgHdr);
  assert_selected_and_displayed(gMsgNo);

  // Now check that the content hasn't been blocked
  let messageDocument =
    get_about_message().getMessagePaneBrowser().contentDocument;
  if (
    !(await test.checkForAllowed(messageDocument.getElementById("testelement")))
  ) {
    throw new Error(
      `${test.type} has been unexpectedly blocked for sender=${authorEmailAddress}`
    );
  }

  // Clean up after ourselves, and make sure that worked as expected.
  removePermission(uri);
  Assert.equal(checkPermission(uri), Services.perms.UNKNOWN_ACTION);
}

/**
 * Check remote content is not blocked for a hosts with permissions.
 */
async function checkAllowForHostsWithPerms(test) {
  if (test.neverAllowed) {
    return;
  }
  let msgDbHdr = addToFolder(
    test.type + " priv host test message ",
    msgBodyStart + test.body + msgBodyEnd,
    folder
  );

  // Select the newly created message.
  let msgHdr = select_click_row(gMsgNo);
  Assert.equal(msgDbHdr, msgHdr);
  assert_selected_and_displayed(gMsgNo);

  let aboutMessage = get_about_message();
  let messageDocument = aboutMessage.getMessagePaneBrowser().contentDocument;
  let src = messageDocument.getElementById("testelement").src;

  if (!src.startsWith("http")) {
    // Just test http in this test.
    return;
  }

  let uri = Services.io.newURI(src);
  addPermission(uri, Services.perms.ALLOW_ACTION);
  Assert.equal(checkPermission(uri), Services.perms.ALLOW_ACTION);

  // Click back one msg, then the original again, which should now allow loading.
  select_click_row(gMsgNo - 1);
  // Select the newly created message.
  msgHdr = select_click_row(gMsgNo);
  Assert.equal(msgDbHdr, msgHdr);
  assert_selected_and_displayed(gMsgNo);

  // Now check that the content hasn't been blocked.
  messageDocument = aboutMessage.getMessagePaneBrowser().contentDocument;
  if (
    !(await test.checkForAllowed(messageDocument.getElementById("testelement")))
  ) {
    throw new Error(
      test.type + " has been unexpectedly blocked for url=" + uri.spec
    );
  }

  // Clean up after ourselves, and make sure that worked as expected.
  removePermission(uri);
  Assert.equal(checkPermission(uri), Services.perms.UNKNOWN_ACTION);
}

add_task(async function test_generalContentPolicy() {
  await be_in_folder(folder);

  assert_nothing_selected();

  for (let i = 0; i < TESTS.length; ++i) {
    // Check for denied in mail
    info("Doing test: " + TESTS[i].description + " ...\n");
    await addMsgToFolderAndCheckContent(folder, TESTS[i]);

    if (TESTS[i].shouldBeBlocked) {
      // Check denied in reply window
      await checkComposeWindow(TESTS[i], true, false);

      // Check denied in forward window
      await checkComposeWindow(TESTS[i], false, false);

      if (TESTS[i].checkRemoteImg) {
        // Now check that image is visible after site is whitelisted.
        // Only want to do this for the test case which has the remote image.

        // Add the site to the whitelist.
        let messageDocument =
          get_about_message().getMessagePaneBrowser().contentDocument;
        let src = messageDocument.getElementById("testelement").src;

        let uri = Services.io.newURI(src);
        addPermission(uri, Services.perms.ALLOW_ACTION);
        Assert.equal(checkPermission(uri), Services.perms.ALLOW_ACTION);

        // Check allowed in reply window
        await checkComposeWindow(TESTS[i], true, true);

        // Check allowed in forward window
        await checkComposeWindow(TESTS[i], false, true);

        // Clean up after ourselves, and make sure that worked as expected.
        removePermission(uri);
        Assert.equal(checkPermission(uri), Services.perms.UNKNOWN_ACTION);
      }

      // Check denied in standalone message window
      await checkStandaloneMessageWindow(TESTS[i], false);

      // Now allow the remote content and check result
      await allowRemoteContentAndCheck(TESTS[i]);
    }

    // Check allowed in reply window
    await checkComposeWindow(TESTS[i], true, true);

    // Check allowed in forward window
    await checkComposeWindow(TESTS[i], false, true);

    // Check allowed in standalone message window
    await checkStandaloneMessageWindow(TESTS[i], true);

    // Check allowed in content tab
    await checkContentTab(TESTS[i]);

    // Check allowed in a feed message
    await checkAllowFeedMsg(TESTS[i]);

    // Check per sender privileges.
    await checkAllowForSenderWithPerms(TESTS[i]);

    // Check per host privileges.
    await checkAllowForHostsWithPerms(TESTS[i]);

    // Only want to do this for the test case which has the remote image.
    if (TESTS[i].checkRemoteImg) {
      let emlFile = await saveAsEMLFile(i);
      await checkEMLMessageWindow(TESTS[i], emlFile);
      emlFile.remove(false);
    }
  }
});

/** Test that an image requiring auth won't ask for credentials in compose. */
add_task(async function test_imgAuth() {
  addToFolder(
    `Image auth test - msg`,
    `${msgBodyStart}<img alt="[401!]" id="401img" src="${url}401.sjs"/>${msgBodyEnd}`,
    folder
  );

  // Allow loading remote, to be able to test.
  Services.prefs.setBoolPref(
    "mailnews.message_display.disable_remote_image",
    false
  );

  // Select the newly created message.
  await be_in_folder(folder);
  select_click_row(gMsgNo);

  // Open reply/fwd. If we get a prompt the test will timeout.
  let rwc = open_compose_with_reply();
  close_compose_window(rwc);

  let fwc = open_compose_with_forward();
  close_compose_window(fwc);

  Services.prefs.clearUserPref("mailnews.message_display.disable_remote_image");
});

/** Make sure remote images work in signatures. */
add_task(async function test_sigPic() {
  let identity = MailServices.accounts.allIdentities[0];
  identity.htmlSigFormat = true;
  identity.htmlSigText = `Tb remote! <img id='testelement' alt='[sigpic]' src='${url}pass.png' />`;

  let wasAllowed = element => {
    return !element.matches(":-moz-broken") && element.naturalWidth > 0;
  };

  be_in_folder(folder);
  select_click_row(gMsgNo);

  let nwc = open_compose_new_mail();
  await TestUtils.waitForCondition(async () => {
    return wasAllowed(
      nwc.window.document
        .getElementById("messageEditor")
        .contentDocument.getElementById("testelement")
    );
  }, "Should allow remote sig in new mail");
  close_compose_window(nwc);

  let rwc = open_compose_with_reply();
  await TestUtils.waitForCondition(async () => {
    return wasAllowed(
      rwc.window.document
        .getElementById("messageEditor")
        .contentDocument.getElementById("testelement")
    );
  }, "Should allow remote sig in reply");

  close_compose_window(rwc);

  identity.htmlSigFormat = false;
  identity.htmlSigText = "";
});

// Copied from test-blocked-content.js.
async function putHTMLOnClipboard(html) {
  let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );

  // Register supported data flavors
  trans.init(null);
  trans.addDataFlavor("text/html");

  let wapper = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  wapper.data = html;
  trans.setTransferData("text/html", wapper);

  Services.clipboard.setData(trans, null, Ci.nsIClipboard.kGlobalClipboard);
  // NOTE: this doesn't seem to work in headless mode.
}

async function subtest_insertImageIntoReplyForward(aReplyType) {
  Assert.ok(folder, "folder should be set up");
  let msgDbHdr = addToFolder(
    "Test insert image into reply or forward",
    "Stand by for image insertion ;-)",
    folder
  );

  // Select the newly created message.
  await be_in_folder(folder);
  let msgHdr = select_click_row(gMsgNo);

  if (msgDbHdr != msgHdr) {
    throw new Error(
      "Selected Message Header is not the same as generated header"
    );
  }

  assert_selected_and_displayed(gMsgNo);

  let replyWindow = aReplyType
    ? open_compose_with_reply()
    : open_compose_with_forward();

  // Now insert the image
  // (copied from test-compose-mailto.js:test_checkInsertImage()).

  // First focus on the editor element
  replyWindow.window.document.getElementById("messageEditor").focus();

  // Now open the image window
  plan_for_modal_dialog("Mail:image", async function insert_image(mwc) {
    // Insert the url of the image.
    let srcloc = mwc.window.document.getElementById("srcInput");
    srcloc.focus();

    input_value(mwc, url + "pass.png");

    // Don't add alternate text
    let noAlt = mwc.window.document.getElementById("noAltTextRadio");
    EventUtils.synthesizeMouseAtCenter(noAlt, {}, noAlt.ownerGlobal);
    await new Promise(resolve => setTimeout(resolve));

    // Accept the dialog
    mwc.window.document.querySelector("dialog").acceptDialog();
  });

  let insertMenu =
    replyWindow.window.document.getElementById("InsertPopupButton");
  let insertMenuPopup =
    replyWindow.window.document.getElementById("InsertPopup");

  EventUtils.synthesizeMouseAtCenter(insertMenu, {}, insertMenu.ownerGlobal);
  await click_menus_in_sequence(insertMenuPopup, [{ id: "InsertImageItem" }]);

  wait_for_modal_dialog();
  wait_for_window_close();
  await new Promise(resolve => setTimeout(resolve));

  // Paste an image.
  try {
    await putHTMLOnClipboard("<img id='tmp-img' src='" + url + "pass.png' />");
  } catch (e) {
    Assert.ok(false, "Paste should have worked: " + e);
    throw e;
  }

  // Ctrl+V = Paste
  EventUtils.synthesizeKey(
    "v",
    { shiftKey: false, accelKey: true },
    replyWindow.window
  );

  // Now wait for the paste.
  utils.waitFor(function () {
    let img = replyWindow.window.document
      .getElementById("messageEditor")
      .contentDocument.getElementById("tmp-img");
    return img != null && img.complete;
  }, "Timeout waiting for pasted tmp image to be loaded ok");

  // Test that the image load has not been denied
  let childImages = replyWindow.window.document
    .getElementById("messageEditor")
    .contentDocument.getElementsByTagName("img");

  Assert.equal(childImages.length, 2, "Should have two images in the doc.");

  // Check both images.
  Assert.ok(
    !childImages[0].matches(":-moz-broken"),
    "Loading of image #0 should not be blocked"
  );
  Assert.ok(
    childImages[0].naturalWidth > 0,
    "Loading of image #0 should not be blocked (and have width)"
  );
  Assert.ok(
    !childImages[1].matches(":-moz-broken"),
    "Loading of image #1 should not be blocked"
  );
  Assert.ok(
    childImages[1].naturalWidth > 0,
    "Loading of image #1 should not be blocked (and have width)"
  );

  close_compose_window(replyWindow);
}

add_task(async function test_insertImageIntoReply() {
  await subtest_insertImageIntoReplyForward(true);
});

add_task(async function test_insertImageIntoForward() {
  await subtest_insertImageIntoReplyForward(false);
});
