/* -*- Mode: Javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from utilityOverlay.js */

/* globals msgWindow, messenger */ // From mailWindow.js
/* globals openComposeWindowForRSSArticle */ // From newsblogOverlay.js

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "FeedUtils",
  "resource:///modules/FeedUtils.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "MailUtils",
  "resource:///modules/MailUtils.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "MsgHdrToMimeMessage",
  "resource:///modules/gloda/MimeMessage.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "EnigmailMime",
  "chrome://openpgp/content/modules/mime.jsm"
);

function GetNextNMessages(folder) {
  if (folder) {
    var newsFolder = folder.QueryInterface(Ci.nsIMsgNewsFolder);
    if (newsFolder) {
      newsFolder.getNextNMessages(msgWindow);
    }
  }
}

/**
 * Figure out the message key from the message uri.
 *
 * @param uri string defining internal storage
 */
function GetMsgKeyFromURI(uri) {
  // Format of 'uri' : protocol://email/folder#key?params
  //                   '?params' are optional
  //   ex : mailbox-message://john%2Edoe@pop.isp.invalid/Drafts#12345
  // We keep only the part after '#' and before an optional '?'.
  // The regexp expects 'key' to be an integer (a series of digits) : '\d+'.
  let match = /.+#(\d+)/.exec(uri);
  return match ? match[1] : null;
}

/* eslint-disable complexity */
/**
 * Compose a message.
 *
 * @param {nsIMsgCompType} type - Type of composition (new message, reply, draft, etc.)
 * @param {nsIMsgCompFormat} format - Requested format (plain text, html, default)
 * @param {nsIMsgFolder} folder - Folder where the original message is stored
 * @param {string[]} messageArray - Array of message URIs to process, often only
 *   holding one element.
 * @param {Selection} [selection=null] - A DOM selection to be quoted, or null
 *   to quote the whole message, if quoting is appropriate (e.g. in a reply).
 * @param {boolean} [autodetectCharset=false] - If quoting the whole message,
 *   whether automatic character set detection should be used.
 */
async function ComposeMessage(
  type,
  format,
  folder,
  messageArray,
  selection = null,
  autodetectCharset = false
) {
  let aboutMessage =
    document.getElementById("tabmail")?.currentAboutMessage ||
    document.getElementById("messageBrowser")?.contentWindow;
  let currentHeaderData = aboutMessage?.currentHeaderData;

  function isCurrentlyDisplayed(hdr) {
    return (
      currentHeaderData && // ignoring enclosing brackets:
      currentHeaderData["message-id"]?.headerValue.includes(hdr.messageId)
    );
  }

  function findDeliveredToIdentityEmail(hdr) {
    // This function reads from currentHeaderData, which is only useful if we're
    // looking at the currently-displayed message. Otherwise, just return
    // immediately so we don't waste time.
    if (!isCurrentlyDisplayed(hdr)) {
      return "";
    }

    // Get the delivered-to headers.
    let key = "delivered-to";
    let deliveredTos = [];
    let index = 0;
    let header = "";
    while ((header = currentHeaderData[key])) {
      deliveredTos.push(header.headerValue.toLowerCase().trim());
      key = "delivered-to" + index++;
    }

    // Reverse the array so that the last delivered-to header will show at front.
    deliveredTos.reverse();

    for (let i = 0; i < deliveredTos.length; i++) {
      for (let identity of MailServices.accounts.allIdentities) {
        if (!identity.email) {
          continue;
        }
        // If the deliver-to header contains the defined identity, that's it.
        if (
          deliveredTos[i] == identity.email.toLowerCase() ||
          deliveredTos[i].includes("<" + identity.email.toLowerCase() + ">")
        ) {
          return identity.email;
        }
      }
    }
    return "";
  }

  let msgKey;
  if (messageArray && messageArray.length == 1) {
    msgKey = GetMsgKeyFromURI(messageArray[0]);
  }

  // Check if the draft is already open in another window. If it is, just focus the window.
  if (type == Ci.nsIMsgCompType.Draft && messageArray.length == 1) {
    // We'll search this uri in the opened windows.
    for (let win of Services.wm.getEnumerator("")) {
      // Check if it is a compose window.
      if (
        win.document.defaultView.gMsgCompose &&
        win.document.defaultView.gMsgCompose.compFields.draftId
      ) {
        let wKey = GetMsgKeyFromURI(
          win.document.defaultView.gMsgCompose.compFields.draftId
        );
        if (wKey == msgKey) {
          // Found ! just focus it...
          win.focus();
          // ...and nothing to do anymore.
          return;
        }
      }
    }
  }
  var identity = null;
  var newsgroup = null;
  var hdr;

  // dump("ComposeMessage folder=" + folder + "\n");
  try {
    if (folder) {
      // Get the incoming server associated with this uri.
      var server = folder.server;

      // If they hit new or reply and they are reading a newsgroup,
      // turn this into a new post or a reply to group.
      if (
        !folder.isServer &&
        server.type == "nntp" &&
        type == Ci.nsIMsgCompType.New
      ) {
        type = Ci.nsIMsgCompType.NewsPost;
        newsgroup = folder.folderURL;
      }

      identity = folder.customIdentity;
      if (!identity) {
        [identity] = MailUtils.getIdentityForServer(server);
      }
      // dump("identity = " + identity + "\n");
    }
  } catch (ex) {
    dump("failed to get an identity to pre-select: " + ex + "\n");
  }

  // dump("\nComposeMessage from XUL: " + identity + "\n");

  switch (type) {
    case Ci.nsIMsgCompType.New: // new message
      // dump("OpenComposeWindow with " + identity + "\n");

      MailServices.compose.OpenComposeWindow(
        null,
        null,
        null,
        type,
        format,
        identity,
        null,
        msgWindow
      );
      return;
    case Ci.nsIMsgCompType.NewsPost:
      // dump("OpenComposeWindow with " + identity + " and " + newsgroup + "\n");
      MailServices.compose.OpenComposeWindow(
        null,
        null,
        newsgroup,
        type,
        format,
        identity,
        null,
        msgWindow
      );
      return;
    case Ci.nsIMsgCompType.ForwardAsAttachment:
      if (messageArray && messageArray.length) {
        // If we have more than one ForwardAsAttachment then pass null instead
        // of the header to tell the compose service to work out the attachment
        // subjects from the URIs.
        hdr =
          messageArray.length > 1
            ? null
            : messenger.msgHdrFromURI(messageArray[0]);
        MailServices.compose.OpenComposeWindow(
          null,
          hdr,
          messageArray.join(","),
          type,
          format,
          identity,
          null,
          msgWindow
        );
      }
      return;
    default:
      if (!messageArray) {
        return;
      }

      // Limit the number of new compose windows to 8. Why 8 ?
      // I like that number :-)
      if (messageArray.length > 8) {
        messageArray.length = 8;
      }

      for (var i = 0; i < messageArray.length; ++i) {
        var messageUri = messageArray[i];
        hdr = messenger.msgHdrFromURI(messageUri);

        if (
          [
            Ci.nsIMsgCompType.Reply,
            Ci.nsIMsgCompType.ReplyAll,
            Ci.nsIMsgCompType.ReplyToSender,
            // Author's address doesn't matter for followup to a newsgroup.
            // Ci.nsIMsgCompType.ReplyToGroup,
            Ci.nsIMsgCompType.ReplyToSenderAndGroup,
            Ci.nsIMsgCompType.ReplyWithTemplate,
            Ci.nsIMsgCompType.ReplyToList,
          ].includes(type)
        ) {
          let replyTo = hdr.getStringProperty("replyTo");
          let from = replyTo || hdr.author;
          let fromAddrs = MailServices.headerParser.parseEncodedHeader(
            from,
            null
          );
          let email = fromAddrs[0]?.email;
          if (
            type == Ci.nsIMsgCompType.ReplyToList &&
            isCurrentlyDisplayed(hdr)
          ) {
            // ReplyToList is only enabled for current message (if at all), so
            // using currentHeaderData is ok.
            // List-Post value is of the format <mailto:list@example.com>
            let listPost = currentHeaderData["list-post"]?.headerValue;
            if (listPost) {
              email = listPost.replace(/.*<mailto:(.+)>.*/, "$1");
            }
          }

          if (
            /^(.*[._-])?(do[._-]?not|no)[._-]?reply([._-].*)?@/i.test(email)
          ) {
            let [title, message, replyAnywayButton] =
              await document.l10n.formatValues([
                { id: "no-reply-title" },
                { id: "no-reply-message", args: { email } },
                { id: "no-reply-reply-anyway-button" },
              ]);

            let buttonFlags =
              Ci.nsIPrompt.BUTTON_TITLE_IS_STRING * Ci.nsIPrompt.BUTTON_POS_0 +
              Ci.nsIPrompt.BUTTON_TITLE_CANCEL * Ci.nsIPrompt.BUTTON_POS_1 +
              Ci.nsIPrompt.BUTTON_POS_1_DEFAULT;

            if (
              Services.prompt.confirmEx(
                window,
                title,
                message,
                buttonFlags,
                replyAnywayButton,
                null, // cancel
                null,
                null,
                {}
              )
            ) {
              continue;
            }
          }
        }

        if (FeedUtils.isFeedMessage(hdr)) {
          // Do not use the header derived identity for feeds, pass on only a
          // possible server identity from above.
          openComposeWindowForRSSArticle(
            null,
            hdr,
            messageUri,
            type,
            format,
            identity,
            msgWindow
          );
        } else {
          // Replies come here.

          let useCatchAll = false;
          // Check if we are using catchAll on any identity. If current
          // folder has some customIdentity set, ignore catchAll settings.
          // CatchAll is not applicable to news (and doesn't work, bug 545365).
          if (
            hdr.folder &&
            hdr.folder.server.type != "nntp" &&
            !hdr.folder.customIdentity
          ) {
            useCatchAll = MailServices.accounts.allIdentities.some(
              identity => identity.catchAll
            );
          }

          if (useCatchAll) {
            // If we use catchAll, we need to get all headers.
            // MsgHdr retrieval is asynchronous, do everything in the callback.
            MsgHdrToMimeMessage(
              hdr,
              null,
              function (hdr, mimeMsg) {
                let catchAllHeaders = Services.prefs
                  .getStringPref("mail.compose.catchAllHeaders")
                  .split(",")
                  .map(header => header.toLowerCase().trim());
                // Collect catchAll hints from given headers.
                let collectedHeaderAddresses = "";
                for (let header of catchAllHeaders) {
                  if (mimeMsg.has(header)) {
                    for (let mimeMsgHeader of mimeMsg.headers[header]) {
                      collectedHeaderAddresses +=
                        MailServices.headerParser
                          .parseEncodedHeaderW(mimeMsgHeader)
                          .toString() + ",";
                    }
                  }
                }

                let [identity, matchingHint] = MailUtils.getIdentityForHeader(
                  hdr,
                  type,
                  collectedHeaderAddresses
                );

                // The found identity might have no catchAll enabled.
                if (identity.catchAll && matchingHint) {
                  // If name is not set in matchingHint, search trough other hints.
                  if (matchingHint.email && !matchingHint.name) {
                    let hints =
                      MailServices.headerParser.makeFromDisplayAddress(
                        hdr.recipients +
                          "," +
                          hdr.ccList +
                          "," +
                          collectedHeaderAddresses
                      );
                    for (let hint of hints) {
                      if (
                        hint.name &&
                        hint.email.toLowerCase() ==
                          matchingHint.email.toLowerCase()
                      ) {
                        matchingHint =
                          MailServices.headerParser.makeMailboxObject(
                            hint.name,
                            matchingHint.email
                          );
                        break;
                      }
                    }
                  }
                } else {
                  matchingHint = MailServices.headerParser.makeMailboxObject(
                    "",
                    ""
                  );
                }

                // Now open compose window and use matching hint as reply sender.
                MailServices.compose.OpenComposeWindow(
                  null,
                  hdr,
                  messageUri,
                  type,
                  format,
                  identity,
                  matchingHint.toString(),
                  msgWindow,
                  selection,
                  autodetectCharset
                );
              },
              true,
              { saneBodySize: true }
            );
          } else {
            // Fall back to traditional behavior.
            let [hdrIdentity] = MailUtils.getIdentityForHeader(
              hdr,
              type,
              findDeliveredToIdentityEmail(hdr)
            );
            MailServices.compose.OpenComposeWindow(
              null,
              hdr,
              messageUri,
              type,
              format,
              hdrIdentity,
              null,
              msgWindow,
              selection,
              autodetectCharset
            );
          }
        }
      }
  }
}
/* eslint-enable complexity */

function Subscribe(preselectedMsgFolder) {
  window.openDialog(
    "chrome://messenger/content/subscribe.xhtml",
    "subscribe",
    "chrome,modal,titlebar,resizable=yes",
    {
      folder: preselectedMsgFolder,
      okCallback: SubscribeOKCallback,
    }
  );
}

function SubscribeOKCallback(changeTable) {
  for (var serverURI in changeTable) {
    var folder = MailUtils.getExistingFolder(serverURI);
    var server = folder.server;
    var subscribableServer = server.QueryInterface(Ci.nsISubscribableServer);

    for (var name in changeTable[serverURI]) {
      if (changeTable[serverURI][name]) {
        try {
          subscribableServer.subscribe(name);
        } catch (ex) {
          dump("failed to subscribe to " + name + ": " + ex + "\n");
        }
      } else if (!changeTable[serverURI][name]) {
        try {
          subscribableServer.unsubscribe(name);
        } catch (ex) {
          dump("failed to unsubscribe to " + name + ": " + ex + "\n");
        }
      }
    }

    try {
      subscribableServer.commitSubscribeChanges();
    } catch (ex) {
      dump("failed to commit the changes: " + ex + "\n");
    }
  }
}

function SaveAsFile(uris) {
  let filenames = [];

  for (let uri of uris) {
    let msgHdr =
      MailServices.messageServiceFromURI(uri).messageURIToMsgHdr(uri);
    let nameBase = GenerateFilenameFromMsgHdr(msgHdr);
    let name = GenerateValidFilename(nameBase, ".eml");

    let number = 2;
    while (filenames.includes(name)) {
      // should be unlikely
      name = GenerateValidFilename(nameBase + "-" + number, ".eml");
      number++;
    }
    filenames.push(name);
  }

  if (uris.length == 1) {
    messenger.saveAs(uris[0], true, null, filenames[0]);
  } else {
    messenger.saveMessages(filenames, uris);
  }
}

function GenerateFilenameFromMsgHdr(msgHdr) {
  function MakeIS8601ODateString(date) {
    function pad(n) {
      return n < 10 ? "0" + n : n;
    }
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      "" +
      pad(date.getMinutes()) +
      ""
    );
  }

  let filename;
  if (msgHdr.flags & Ci.nsMsgMessageFlags.HasRe) {
    filename = msgHdr.mime2DecodedSubject
      ? "Re: " + msgHdr.mime2DecodedSubject
      : "Re: ";
  } else {
    filename = msgHdr.mime2DecodedSubject;
  }

  filename += " - ";
  filename += msgHdr.mime2DecodedAuthor + " - ";
  filename += MakeIS8601ODateString(new Date(msgHdr.date / 1000));

  return filename;
}

function saveAsUrlListener(aUri, aIdentity) {
  this.uri = aUri;
  this.identity = aIdentity;
}

saveAsUrlListener.prototype = {
  OnStartRunningUrl(aUrl) {},
  OnStopRunningUrl(aUrl, aExitCode) {
    messenger.saveAs(this.uri, false, this.identity, null);
  },
};

function SaveAsTemplate(uri) {
  if (uri) {
    let hdr = messenger.msgHdrFromURI(uri);
    let [identity] = MailUtils.getIdentityForHeader(
      hdr,
      Ci.nsIMsgCompType.Template
    );
    let templates = MailUtils.getOrCreateFolder(identity.stationeryFolder);
    if (!templates.parent) {
      templates.setFlag(Ci.nsMsgFolderFlags.Templates);
      let isAsync = templates.server.protocolInfo.foldersCreatedAsync;
      templates.createStorageIfMissing(new saveAsUrlListener(uri, identity));
      if (isAsync) {
        return;
      }
    }
    messenger.saveAs(uri, false, identity, null);
  }
}

function viewEncryptedPart(message) {
  let url;
  try {
    url = MailServices.mailSession.ConvertMsgURIToMsgURL(message, msgWindow);
  } catch (e) {
    console.debug(e);
    // Couldn't get mail session
    return false;
  }

  // Strip out the message-display parameter to ensure that attached emails
  // display the message source, not the processed HTML.
  url = url.replace(/type=application\/x-message-display&/, "");

  /**
   * Save the given string to a file, then open it as an .eml file.
   *
   * @param {string} data - The message data.
   */
  let msgOpenMessageFromString = function (data) {
    let tempFile = Services.dirsvc.get("TmpD", Ci.nsIFile);
    tempFile.append("subPart.eml");
    tempFile.createUnique(0, 0o600);

    let outputStream = Cc[
      "@mozilla.org/network/file-output-stream;1"
    ].createInstance(Ci.nsIFileOutputStream);
    outputStream.init(tempFile, 2, 0x200, false); // open as "write only"
    outputStream.write(data, data.length);
    outputStream.close();

    // Delete file on exit, because Windows locks the file
    let extAppLauncher = Cc[
      "@mozilla.org/uriloader/external-helper-app-service;1"
    ].getService(Ci.nsPIExternalAppLauncher);
    extAppLauncher.deleteTemporaryFileOnExit(tempFile);

    let url = Services.io
      .getProtocolHandler("file")
      .QueryInterface(Ci.nsIFileProtocolHandler)
      .newFileURI(tempFile);

    MailUtils.openEMLFile(window, tempFile, url);
  };

  function recursiveEmitEncryptedParts(mimeTree) {
    for (let part of mimeTree.subParts) {
      const ct = part.headers.contentType.type;
      if (ct == "multipart/encrypted") {
        const boundary = part.headers.contentType.get("boundary");
        let full = `${part.headers.rawHeaderText}\n\n`;
        for (let subPart of part.subParts) {
          full += `${boundary}\n${subPart.headers.rawHeaderText}\n\n${subPart.body}\n`;
        }
        full += `${boundary}--\n`;
        msgOpenMessageFromString(full);
        continue;
      }
      recursiveEmitEncryptedParts(part);
    }
  }

  EnigmailMime.getMimeTreeFromUrl(url, true, recursiveEmitEncryptedParts);
  return true;
}

function viewEncryptedParts(messages) {
  if (!messages?.length) {
    dump("viewEncryptedParts(): No messages selected.\n");
    return false;
  }

  if (messages.length > 1) {
    dump("viewEncryptedParts(): Too many messages selected.\n");
    return false;
  }

  return viewEncryptedPart(messages[0]);
}
