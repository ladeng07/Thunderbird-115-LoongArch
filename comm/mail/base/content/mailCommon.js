/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

// mailContext.js
/* globals mailContextMenu */

// msgViewNavigation.js
/* globals CrossFolderNavigation */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

ChromeUtils.defineESModuleGetters(this, {
  TreeSelection: "chrome://messenger/content/tree-selection.mjs",
});

XPCOMUtils.defineLazyModuleGetters(this, {
  ConversationOpener: "resource:///modules/ConversationOpener.jsm",
  DBViewWrapper: "resource:///modules/DBViewWrapper.jsm",
  EnigmailPersistentCrypto:
    "chrome://openpgp/content/modules/persistentCrypto.jsm",
  EnigmailURIs: "chrome://openpgp/content/modules/uris.jsm",
  MailUtils: "resource:///modules/MailUtils.jsm",
  MessageArchiver: "resource:///modules/MessageArchiver.jsm",
});

XPCOMUtils.defineLazyServiceGetter(
  this,
  "gEncryptedURIService",
  "@mozilla.org/messenger-smime/smime-encrypted-uris-service;1",
  "nsIEncryptedSMIMEURIsService"
);

const nsMsgViewIndex_None = 0xffffffff;
const nsMsgKey_None = 0xffffffff;

var gDBView, gFolder, gViewWrapper;

var commandController = {
  _composeCommands: {
    cmd_editDraftMsg: Ci.nsIMsgCompType.Draft,
    cmd_newMsgFromTemplate: Ci.nsIMsgCompType.Template,
    cmd_editTemplateMsg: Ci.nsIMsgCompType.EditTemplate,
    cmd_newMessage: Ci.nsIMsgCompType.New,
    cmd_replyGroup: Ci.nsIMsgCompType.ReplyToGroup,
    cmd_replySender: Ci.nsIMsgCompType.ReplyToSender,
    cmd_replyall: Ci.nsIMsgCompType.ReplyAll,
    cmd_replylist: Ci.nsIMsgCompType.ReplyToList,
    cmd_forwardInline: Ci.nsIMsgCompType.ForwardInline,
    cmd_forwardAttachment: Ci.nsIMsgCompType.ForwardAsAttachment,
    cmd_redirect: Ci.nsIMsgCompType.Redirect,
    cmd_editAsNew: Ci.nsIMsgCompType.EditAsNew,
  },
  _navigationCommands: {
    cmd_goForward: Ci.nsMsgNavigationType.forward,
    cmd_goBack: Ci.nsMsgNavigationType.back,
    cmd_nextUnreadMsg: Ci.nsMsgNavigationType.nextUnreadMessage,
    cmd_nextUnreadThread: Ci.nsMsgNavigationType.nextUnreadThread,
    cmd_nextMsg: Ci.nsMsgNavigationType.nextMessage,
    cmd_nextFlaggedMsg: Ci.nsMsgNavigationType.nextFlagged,
    cmd_previousMsg: Ci.nsMsgNavigationType.previousMessage,
    cmd_previousUnreadMsg: Ci.nsMsgNavigationType.previousUnreadMessage,
    cmd_previousFlaggedMsg: Ci.nsMsgNavigationType.previousFlagged,
  },
  _viewCommands: {
    cmd_toggleRead: Ci.nsMsgViewCommandType.toggleMessageRead,
    cmd_markAsRead: Ci.nsMsgViewCommandType.markMessagesRead,
    cmd_markAsUnread: Ci.nsMsgViewCommandType.markMessagesUnread,
    cmd_markThreadAsRead: Ci.nsMsgViewCommandType.markThreadRead,
    cmd_markAllRead: Ci.nsMsgViewCommandType.markAllRead,
    cmd_markAsNotJunk: Ci.nsMsgViewCommandType.unjunk,
    cmd_watchThread: Ci.nsMsgViewCommandType.toggleThreadWatched,
  },
  _callbackCommands: {
    cmd_cancel() {
      gFolder
        .QueryInterface(Ci.nsIMsgNewsFolder)
        .cancelMessage(gDBView.hdrForFirstSelectedMessage, top.msgWindow);
    },
    cmd_openConversation() {
      new ConversationOpener(window).openConversationForMessages(
        gDBView.getSelectedMsgHdrs()
      );
    },
    cmd_reply(event) {
      if (gFolder?.flags & Ci.nsMsgFolderFlags.Newsgroup) {
        commandController.doCommand("cmd_replyGroup", event);
      } else {
        commandController.doCommand("cmd_replySender", event);
      }
    },
    cmd_forward(event) {
      if (Services.prefs.getIntPref("mail.forward_message_mode", 0) == 0) {
        commandController.doCommand("cmd_forwardAttachment", event);
      } else {
        commandController.doCommand("cmd_forwardInline", event);
      }
    },
    cmd_openMessage(event) {
      MailUtils.displayMessages(
        gDBView.getSelectedMsgHdrs(),
        gViewWrapper,
        top.document.getElementById("tabmail"),
        event?.type == "auxclick" && !event?.shiftKey
      );
    },
    cmd_tag() {
      // Does nothing, just here to enable/disable the tags sub-menu.
    },
    cmd_tag1: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 1),
    cmd_tag2: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 2),
    cmd_tag3: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 3),
    cmd_tag4: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 4),
    cmd_tag5: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 5),
    cmd_tag6: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 6),
    cmd_tag7: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 7),
    cmd_tag8: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 8),
    cmd_tag9: mailContextMenu._toggleMessageTagKey.bind(mailContextMenu, 9),
    cmd_addTag() {
      mailContextMenu.addTag();
    },
    cmd_manageTags() {
      window.browsingContext.topChromeWindow.openOptionsDialog(
        "paneGeneral",
        "tagsCategory"
      );
    },
    cmd_removeTags() {
      mailContextMenu.removeAllMessageTags();
    },
    cmd_toggleTag(event) {
      mailContextMenu._toggleMessageTag(
        event.target.value,
        event.target.getAttribute("checked") == "true"
      );
    },
    cmd_markReadByDate() {
      window.browsingContext.topChromeWindow.openDialog(
        "chrome://messenger/content/markByDate.xhtml",
        "",
        "chrome,modal,titlebar,centerscreen",
        gFolder
      );
    },
    cmd_markAsFlagged() {
      gViewWrapper.dbView.doCommand(
        gDBView.hdrForFirstSelectedMessage.isFlagged
          ? Ci.nsMsgViewCommandType.unflagMessages
          : Ci.nsMsgViewCommandType.flagMessages
      );
    },
    cmd_markAsJunk() {
      if (
        Services.prefs.getBoolPref("mailnews.ui.junk.manualMarkAsJunkMarksRead")
      ) {
        gViewWrapper.dbView.doCommand(Ci.nsMsgViewCommandType.markMessagesRead);
      }
      gViewWrapper.dbView.doCommand(Ci.nsMsgViewCommandType.junk);
    },
    /**
     * Moves the selected messages to the destination folder.
     *
     * @param {nsIMsgFolder} destFolder - the destination folder
     */
    cmd_moveMessage(destFolder) {
      if (parent.location.href == "about:3pane") {
        // If we're in about:message inside about:3pane, it's the parent
        // window that needs to advance to the next message.
        parent.commandController.doCommand("cmd_moveMessage");
        return;
      }
      dbViewWrapperListener.threadPaneCommandUpdater.updateNextMessageAfterDelete();
      gViewWrapper.dbView.doCommandWithFolder(
        Ci.nsMsgViewCommandType.moveMessages,
        destFolder
      );
      Services.prefs.setCharPref(
        "mail.last_msg_movecopy_target_uri",
        destFolder.URI
      );
      Services.prefs.setBoolPref("mail.last_msg_movecopy_was_move", true);
    },
    async cmd_copyDecryptedTo(destFolder) {
      let msgHdrs = gDBView.getSelectedMsgHdrs();
      if (!msgHdrs || msgHdrs.length === 0) {
        return;
      }

      let total = msgHdrs.length;
      let failures = 0;
      for (let msgHdr of msgHdrs) {
        await EnigmailPersistentCrypto.cryptMessage(
          msgHdr,
          destFolder.URI,
          false, // not moving
          false
        ).catch(err => {
          failures++;
        });
      }

      if (failures) {
        let info = await document.l10n.formatValue(
          "decrypt-and-copy-failures-multiple",
          {
            failures,
            total,
          }
        );
        Services.prompt.alert(null, document.title, info);
      }
    },
    /**
     * Copies the selected messages to the destination folder.
     *
     * @param {nsIMsgFolder} destFolder - the destination folder
     */
    cmd_copyMessage(destFolder) {
      if (window.gMessageURI?.startsWith("file:")) {
        let file = Services.io
          .newURI(window.gMessageURI)
          .QueryInterface(Ci.nsIFileURL).file;
        MailServices.copy.copyFileMessage(
          file,
          destFolder,
          null,
          false,
          Ci.nsMsgMessageFlags.Read,
          "",
          null,
          top.msgWindow
        );
      } else {
        gViewWrapper.dbView.doCommandWithFolder(
          Ci.nsMsgViewCommandType.copyMessages,
          destFolder
        );
      }
      Services.prefs.setCharPref(
        "mail.last_msg_movecopy_target_uri",
        destFolder.URI
      );
      Services.prefs.setBoolPref("mail.last_msg_movecopy_was_move", false);
    },
    cmd_archive() {
      if (parent.location.href == "about:3pane") {
        // If we're in about:message inside about:3pane, it's the parent
        // window that needs to advance to the next message.
        parent.commandController.doCommand("cmd_archive");
        return;
      }
      dbViewWrapperListener.threadPaneCommandUpdater.updateNextMessageAfterDelete();
      let archiver = new MessageArchiver();
      // The instance of nsITransactionManager to use here is tied to msgWindow. Set
      // this property so the operation can be undone if requested.
      archiver.msgWindow = top.msgWindow;
      // Archive the selected message(s).
      archiver.archiveMessages(gViewWrapper.dbView.getSelectedMsgHdrs());
    },
    cmd_moveToFolderAgain() {
      if (parent.location.href == "about:3pane") {
        // If we're in about:message inside about:3pane, it's the parent
        // window that needs to advance to the next message.
        parent.commandController.doCommand("cmd_moveToFolderAgain");
        return;
      }
      let folder = MailUtils.getOrCreateFolder(
        Services.prefs.getStringPref("mail.last_msg_movecopy_target_uri")
      );
      if (Services.prefs.getBoolPref("mail.last_msg_movecopy_was_move")) {
        dbViewWrapperListener.threadPaneCommandUpdater.updateNextMessageAfterDelete();
        commandController.doCommand("cmd_moveMessage", folder);
      } else {
        commandController.doCommand("cmd_copyMessage", folder);
      }
    },
    cmd_deleteMessage() {
      if (parent.location.href == "about:3pane") {
        // If we're in about:message inside about:3pane, it's the parent
        // window that needs to advance to the next message.
        parent.commandController.doCommand("cmd_deleteMessage");
        return;
      }
      dbViewWrapperListener.threadPaneCommandUpdater.updateNextMessageAfterDelete();
      gViewWrapper.dbView.doCommand(Ci.nsMsgViewCommandType.deleteMsg);
    },
    cmd_shiftDeleteMessage() {
      if (parent.location.href == "about:3pane") {
        // If we're in about:message inside about:3pane, it's the parent
        // window that needs to advance to the next message.
        parent.commandController.doCommand("cmd_shiftDeleteMessage");
        return;
      }
      dbViewWrapperListener.threadPaneCommandUpdater.updateNextMessageAfterDelete();
      gViewWrapper.dbView.doCommand(Ci.nsMsgViewCommandType.deleteNoTrash);
    },
    cmd_createFilterFromMenu() {
      let msgHdr = gDBView.hdrForFirstSelectedMessage;
      let emailAddress =
        MailServices.headerParser.extractHeaderAddressMailboxes(msgHdr.author);
      if (emailAddress) {
        top.MsgFilters(emailAddress, msgHdr.folder);
      }
    },
    cmd_viewPageSource() {
      let uris = window.gMessageURI
        ? [window.gMessageURI]
        : gDBView.getURIsForSelection();
      for (let uri of uris) {
        // Now, we need to get a URL from a URI
        let url = MailServices.mailSession.ConvertMsgURIToMsgURL(
          uri,
          top.msgWindow
        );

        // Strip out the message-display parameter to ensure that attached emails
        // display the message source, not the processed HTML.
        url = url.replace(/type=application\/x-message-display&/, "");
        window.openDialog(
          "chrome://messenger/content/viewSource.xhtml",
          "_blank",
          "all,dialog=no",
          { URL: url }
        );
      }
    },
    cmd_saveAsFile() {
      let uris = window.gMessageURI
        ? [window.gMessageURI]
        : gDBView.getURIsForSelection();
      top.SaveAsFile(uris);
    },
    cmd_saveAsTemplate() {
      top.SaveAsTemplate(gDBView.getURIsForSelection()[0]);
    },
    cmd_applyFilters() {
      let curFilterList = gFolder.getFilterList(top.msgWindow);
      // Create a new filter list and copy over the enabled filters to it.
      // We do this instead of having the filter after the fact code ignore
      // disabled filters because the Filter Dialog filter after the fact
      // code would have to clone filters to allow disabled filters to run,
      // and we don't support cloning filters currently.
      let tempFilterList = MailServices.filters.getTempFilterList(gFolder);
      let numFilters = curFilterList.filterCount;
      // Make sure the temp filter list uses the same log stream.
      tempFilterList.loggingEnabled = curFilterList.loggingEnabled;
      tempFilterList.logStream = curFilterList.logStream;
      let newFilterIndex = 0;
      for (let i = 0; i < numFilters; i++) {
        let curFilter = curFilterList.getFilterAt(i);
        // Only add enabled, UI visible filters that are in the manual context.
        if (
          curFilter.enabled &&
          !curFilter.temporary &&
          curFilter.filterType & Ci.nsMsgFilterType.Manual
        ) {
          tempFilterList.insertFilterAt(newFilterIndex, curFilter);
          newFilterIndex++;
        }
      }
      MailServices.filters.applyFiltersToFolders(
        tempFilterList,
        [gFolder],
        top.msgWindow
      );
    },
    cmd_applyFiltersToSelection() {
      let selectedMessages = gDBView.getSelectedMsgHdrs();
      if (selectedMessages.length) {
        MailServices.filters.applyFilters(
          Ci.nsMsgFilterType.Manual,
          selectedMessages,
          gFolder,
          top.msgWindow
        );
      }
    },
    cmd_space(event) {
      let messagePaneBrowser;
      if (window.messageBrowser) {
        messagePaneBrowser =
          window.messageBrowser.contentWindow.getMessagePaneBrowser();
      } else {
        messagePaneBrowser = window.getMessagePaneBrowser();
      }
      let contentWindow = messagePaneBrowser.contentWindow;

      if (event?.shiftKey) {
        // If at the start of the message, go to the previous one.
        if (contentWindow?.scrollY > 0) {
          contentWindow.scrollByPages(-1);
        } else if (Services.prefs.getBoolPref("mail.advance_on_spacebar")) {
          top.goDoCommand("cmd_previousUnreadMsg");
        }
      } else if (
        Math.ceil(contentWindow?.scrollY) < contentWindow?.scrollMaxY
      ) {
        // If at the end of the message, go to the next one.
        contentWindow.scrollByPages(1);
      } else if (Services.prefs.getBoolPref("mail.advance_on_spacebar")) {
        top.goDoCommand("cmd_nextUnreadMsg");
      }
    },
    cmd_searchMessages(folder = gFolder) {
      // We always open a new search dialog for each search command.
      top.openDialog(
        "chrome://messenger/content/SearchDialog.xhtml",
        "_blank",
        "chrome,resizable,status,centerscreen,dialog=no",
        { folder }
      );
    },
  },
  _isCallbackEnabled: {},

  registerCallback(name, callback, isEnabled = true) {
    this._callbackCommands[name] = callback;
    this._isCallbackEnabled[name] = isEnabled;
  },

  supportsCommand(command) {
    return (
      command in this._composeCommands ||
      command in this._navigationCommands ||
      command in this._viewCommands ||
      command in this._callbackCommands
    );
  },
  // eslint-disable-next-line complexity
  isCommandEnabled(command) {
    let type = typeof this._isCallbackEnabled[command];
    if (type == "function") {
      return this._isCallbackEnabled[command]();
    } else if (type == "boolean") {
      return this._isCallbackEnabled[command];
    }

    const hasIdentities = MailServices.accounts.allIdentities.length;
    switch (command) {
      case "cmd_newMessage":
        return hasIdentities;
      case "cmd_searchMessages":
        // TODO: This shouldn't be here, or should return false if there are no accounts.
        return true;
      case "cmd_space":
      case "cmd_manageTags":
        return true;
    }

    if (!gViewWrapper?.dbView) {
      return false;
    }

    let isDummyMessage = !gViewWrapper.isSynthetic && !gFolder;

    if (["cmd_goBack", "cmd_goForward"].includes(command)) {
      let activeMessageHistory = (
        window.messageBrowser?.contentWindow ?? window
      ).messageHistory;
      let relPos = command === "cmd_goBack" ? -1 : 1;
      if (relPos === -1 && activeMessageHistory.canPop(0)) {
        return !isDummyMessage;
      }
      return !isDummyMessage && activeMessageHistory.canPop(relPos);
    }

    if (command in this._navigationCommands) {
      return !isDummyMessage;
    }

    let numSelectedMessages = isDummyMessage ? 1 : gDBView.numSelected;

    // Evaluate these properties only if needed, not once for each command.
    let folder = () => {
      if (gFolder) {
        return gFolder;
      }
      if (gDBView.numSelected >= 1) {
        return gDBView.hdrForFirstSelectedMessage?.folder;
      }
      return null;
    };
    let isNewsgroup = () =>
      folder()?.isSpecialFolder(Ci.nsMsgFolderFlags.Newsgroup, true);
    let canMove = () =>
      numSelectedMessages >= 1 &&
      (folder()?.canDeleteMessages || gViewWrapper.isSynthetic);

    switch (command) {
      case "cmd_cancel":
        if (numSelectedMessages == 1 && isNewsgroup()) {
          // Ensure author of message matches own identity
          let author = gDBView.hdrForFirstSelectedMessage.author;
          return MailServices.accounts
            .getIdentitiesForServer(folder().server)
            .some(id => id.fullAddress == author);
        }
        return false;
      case "cmd_openConversation":
        return gDBView
          .getSelectedMsgHdrs()
          .some(m => ConversationOpener.isMessageIndexed(m));
      case "cmd_reply":
      case "cmd_replySender":
      case "cmd_replyall":
      case "cmd_replylist":
      case "cmd_forward":
      case "cmd_redirect":
      case "cmd_editAsNew":
        if (!hasIdentities) {
          return false;
        }
      // Falls through.
      case "cmd_viewPageSource":
      case "cmd_saveAsTemplate":
        return numSelectedMessages == 1;
      case "cmd_forwardInline":
      case "cmd_forwardAttachment":
        if (!hasIdentities) {
          return false;
        }
      // Falls through.
      case "cmd_copyMessage":
      case "cmd_saveAsFile":
        return numSelectedMessages >= 1;
      case "cmd_openMessage":
        return (
          (location.href == "about:3pane" ||
            parent.location.href == "about:3pane") &&
          numSelectedMessages >= 1 &&
          !isDummyMessage
        );
      case "cmd_tag":
      case "cmd_tag1":
      case "cmd_tag2":
      case "cmd_tag3":
      case "cmd_tag4":
      case "cmd_tag5":
      case "cmd_tag6":
      case "cmd_tag7":
      case "cmd_tag8":
      case "cmd_tag9":
      case "cmd_addTag":
      case "cmd_removeTags":
      case "cmd_toggleTag":
      case "cmd_toggleRead":
      case "cmd_markReadByDate":
      case "cmd_markAsFlagged":
      case "cmd_moveMessage":
      case "cmd_applyFiltersToSelection":
        return numSelectedMessages >= 1 && !isDummyMessage;
      case "cmd_copyDecryptedTo": {
        let showDecrypt = numSelectedMessages > 1;
        if (numSelectedMessages == 1 && !isDummyMessage) {
          let msgURI = gDBView.URIForFirstSelectedMessage;
          if (msgURI) {
            showDecrypt =
              EnigmailURIs.isEncryptedUri(msgURI) ||
              gEncryptedURIService.isEncrypted(msgURI);
          }
        }
        return showDecrypt;
      }
      case "cmd_editDraftMsg":
        return (
          numSelectedMessages == 1 &&
          folder()?.isSpecialFolder(Ci.nsMsgFolderFlags.Drafts, true)
        );
      case "cmd_newMsgFromTemplate":
      case "cmd_editTemplateMsg":
        return (
          numSelectedMessages == 1 &&
          folder()?.isSpecialFolder(Ci.nsMsgFolderFlags.Templates, true)
        );
      case "cmd_replyGroup":
        return isNewsgroup();
      case "cmd_markAsRead":
        return (
          numSelectedMessages >= 1 &&
          !isDummyMessage &&
          gViewWrapper.dbView.getSelectedMsgHdrs().some(msg => !msg.isRead)
        );
      case "cmd_markAsUnread":
        return (
          numSelectedMessages >= 1 &&
          !isDummyMessage &&
          gViewWrapper.dbView.getSelectedMsgHdrs().some(msg => msg.isRead)
        );
      case "cmd_markThreadAsRead": {
        if (numSelectedMessages == 0 || isDummyMessage) {
          return false;
        }
        let sel = gViewWrapper.dbView.selection;
        for (let i = 0; i < sel.getRangeCount(); i++) {
          let start = {};
          let end = {};
          sel.getRangeAt(i, start, end);
          for (let j = start.value; j <= end.value; j++) {
            if (
              gViewWrapper.dbView.getThreadContainingIndex(j)
                .numUnreadChildren > 0
            ) {
              return true;
            }
          }
        }
        return false;
      }
      case "cmd_markAllRead":
        return gDBView?.msgFolder?.getNumUnread(false) > 0;
      case "cmd_markAsJunk":
      case "cmd_markAsNotJunk":
        return this._getViewCommandStatus(Ci.nsMsgViewCommandType.junk);
      case "cmd_archive":
        return (
          !isDummyMessage &&
          MessageArchiver.canArchive(
            gDBView.getSelectedMsgHdrs(),
            gViewWrapper.isSingleFolder
          )
        );
      case "cmd_moveToFolderAgain": {
        // Disable "Move to <folder> Again" for news and other read only
        // folders since we can't really move messages from there - only copy.
        let canMoveAgain = numSelectedMessages >= 1;
        if (Services.prefs.getBoolPref("mail.last_msg_movecopy_was_move")) {
          canMoveAgain = canMove() && !isNewsgroup();
        }
        if (canMoveAgain) {
          let targetURI = Services.prefs.getStringPref(
            "mail.last_msg_movecopy_target_uri"
          );
          canMoveAgain = targetURI && MailUtils.getExistingFolder(targetURI);
        }
        return !!canMoveAgain;
      }
      case "cmd_deleteMessage":
        return canMove();
      case "cmd_shiftDeleteMessage":
        return this._getViewCommandStatus(
          Ci.nsMsgViewCommandType.deleteNoTrash
        );
      case "cmd_createFilterFromMenu":
        return (
          numSelectedMessages == 1 &&
          !isDummyMessage &&
          folder()?.server.canHaveFilters
        );
      case "cmd_watchThread": {
        let enabledObj = {};
        let checkStatusObj = {};
        gViewWrapper.dbView.getCommandStatus(
          Ci.nsMsgViewCommandType.toggleThreadWatched,
          enabledObj,
          checkStatusObj
        );
        return enabledObj.value;
      }
      case "cmd_applyFilters": {
        return this._getViewCommandStatus(Ci.nsMsgViewCommandType.applyFilters);
      }
    }

    return false;
  },
  doCommand(command, ...args) {
    if (!this.isCommandEnabled(command)) {
      return;
    }

    if (command in this._composeCommands) {
      this._composeMsgByType(this._composeCommands[command], ...args);
      return;
    }

    if (command in this._navigationCommands) {
      if (parent.location.href == "about:3pane") {
        // If we're in about:message inside about:3pane, it's the parent
        // window that needs to advance to the next message.
        parent.commandController.doCommand(command, ...args);
      } else {
        this._navigate(this._navigationCommands[command]);
      }
      return;
    }

    if (command in this._viewCommands) {
      if (command.endsWith("Read") || command.endsWith("Unread")) {
        if (window.ClearPendingReadTimer) {
          window.ClearPendingReadTimer();
        } else {
          window.messageBrowser.contentWindow.ClearPendingReadTimer();
        }
      }
      gViewWrapper.dbView.doCommand(this._viewCommands[command]);
      return;
    }

    if (command in this._callbackCommands) {
      this._callbackCommands[command](...args);
    }
  },

  _getViewCommandStatus(commandType) {
    if (!gViewWrapper?.dbView) {
      return false;
    }

    let enabledObj = {};
    let checkStatusObj = {};
    gViewWrapper.dbView.getCommandStatus(
      commandType,
      enabledObj,
      checkStatusObj
    );
    return enabledObj.value;
  },

  /**
   * Calls the ComposeMessage function with the desired type, and proper default
   * based on the event that fired it.
   *
   * @param composeType  the nsIMsgCompType to pass to the function
   * @param event (optional) the event that triggered the call
   */
  _composeMsgByType(composeType, event) {
    // If we're the hidden window, then we're not going to have a gFolderDisplay
    // to work out existing folders, so just use null.
    let msgFolder = gFolder;
    let msgUris =
      gFolder || gViewWrapper.isSynthetic
        ? gDBView?.getURIsForSelection()
        : [window.gMessageURI];

    let messagePaneBrowser;
    let autodetectCharset;
    let selection;
    if (!mailContextMenu.selectionIsOverridden) {
      if (window.messageBrowser) {
        if (!window.messageBrowser.hidden) {
          messagePaneBrowser =
            window.messageBrowser.contentWindow.getMessagePaneBrowser();
          autodetectCharset =
            window.messageBrowser.contentWindow.autodetectCharset;
        }
      } else {
        messagePaneBrowser = window.getMessagePaneBrowser();
        autodetectCharset = window.autodetectCharset;
      }
      selection = messagePaneBrowser?.contentWindow?.getSelection();
    }

    if (event && event.shiftKey) {
      window.browsingContext.topChromeWindow.ComposeMessage(
        composeType,
        Ci.nsIMsgCompFormat.OppositeOfDefault,
        msgFolder,
        msgUris,
        selection,
        autodetectCharset
      );
    } else {
      window.browsingContext.topChromeWindow.ComposeMessage(
        composeType,
        Ci.nsIMsgCompFormat.Default,
        msgFolder,
        msgUris,
        selection,
        autodetectCharset
      );
    }
  },

  _navigate(navigationType) {
    if (
      [Ci.nsMsgNavigationType.back, Ci.nsMsgNavigationType.forward].includes(
        navigationType
      )
    ) {
      const { messageHistory } = window.messageBrowser?.contentWindow ?? window;
      const noCurrentMessage = messageHistory.canPop(0);
      let relativePosition = -1;
      if (navigationType === Ci.nsMsgNavigationType.forward) {
        relativePosition = 1;
      } else if (noCurrentMessage) {
        relativePosition = 0;
      }
      let newMessageURI = messageHistory.pop(relativePosition)?.messageURI;
      if (!newMessageURI) {
        return;
      }
      let msgHdr =
        MailServices.messageServiceFromURI(newMessageURI).messageURIToMsgHdr(
          newMessageURI
        );
      if (msgHdr) {
        if (window.threadPane) {
          window.selectMessage(msgHdr);
        } else {
          window.displayMessage(newMessageURI);
        }
      }
      return;
    }

    let resultKey = { value: nsMsgKey_None };
    let resultIndex = { value: nsMsgViewIndex_None };
    let threadIndex = {};
    gViewWrapper.dbView.viewNavigate(
      navigationType,
      resultKey,
      resultIndex,
      threadIndex,
      true
    );
    if (resultIndex.value == nsMsgViewIndex_None) {
      if (CrossFolderNavigation(navigationType)) {
        this._navigate(navigationType);
      }
      return;
    }

    if (resultKey.value == nsMsgKey_None) {
      return;
    }

    if (window.threadTree) {
      if (
        gDBView.selection.count == 1 &&
        window.threadTree.selectedIndex == resultIndex.value
      ) {
        return;
      }

      window.threadTree.expandRowAtIndex(resultIndex.value);
      // Do an instant scroll before setting the index to avoid animation.
      window.threadTree.scrollToIndex(resultIndex.value, true);
      window.threadTree.selectedIndex = resultIndex.value;
      // Focus the thread tree, unless the message pane has focus.
      if (
        Services.focus.focusedWindow !=
        window.messageBrowser.contentWindow?.getMessagePaneBrowser()
          .contentWindow
      ) {
        // There's something strange going on here – calling `focus`
        // immediately can cause the scroll position to return to where it was
        // before changing folders, which starts a cascade of "scroll" events
        // until the tree scrolls to the top.
        setTimeout(() => window.threadTree.table.body.focus());
      }
    } else {
      if (window.gMessage.messageKey == resultKey.value) {
        return;
      }

      gViewWrapper.dbView.selection.select(resultIndex.value);
      window.displayMessage(
        gViewWrapper.dbView.URIForFirstSelectedMessage,
        gViewWrapper
      );
    }
  },
};
// Add the controller to this window's controllers, so that built-in commands
// such as cmd_selectAll run our code instead of the default code.
window.controllers.insertControllerAt(0, commandController);

var dbViewWrapperListener = {
  _nextViewIndexAfterDelete: null,

  messenger: null,
  msgWindow: top.msgWindow,
  threadPaneCommandUpdater: {
    QueryInterface: ChromeUtils.generateQI([
      "nsIMsgDBViewCommandUpdater",
      "nsISupportsWeakReference",
    ]),
    updateCommandStatus() {},
    displayMessageChanged(folder, subject, keywords) {},
    updateNextMessageAfterDelete() {
      dbViewWrapperListener._nextViewIndexAfterDelete = gDBView
        ? gDBView.msgToSelectAfterDelete
        : null;
    },
    summarizeSelection() {
      return true;
    },
    selectedMessageRemoved() {
      // We need to invalidate the tree, but this method could get called
      // multiple times, so we won't invalidate until we get to the end of the
      // event loop.
      if (this._timeout) {
        return;
      }
      this._timeout = setTimeout(() => {
        dbViewWrapperListener.onMessagesRemoved();
        window.threadTree?.invalidate();
        delete this._timeout;
      });
    },
  },

  get shouldUseMailViews() {
    return false;
  },
  get shouldDeferMessageDisplayUntilAfterServerConnect() {
    return false;
  },
  shouldMarkMessagesReadOnLeavingFolder(msgFolder) {
    return false;
  },
  onFolderLoading(isFolderLoading) {},
  onSearching(isSearching) {},
  onCreatedView() {
    if (window.threadTree) {
      window.threadPane.setTreeView(gViewWrapper.dbView);

      if (
        gViewWrapper.sortImpliesTemporalOrdering &&
        gViewWrapper.isSortedAscending
      ) {
        window.threadTree.scrollToIndex(gDBView.rowCount - 1, true);
      } else {
        window.threadTree.scrollToIndex(0, true);
      }
    }
  },
  onDestroyingView(folderIsComingBack) {
    if (!window.threadTree) {
      return;
    }

    if (folderIsComingBack) {
      // We'll get a new view of the same folder (e.g. with a quick filter) -
      // try to preserve the selection.
      window.threadPane.saveSelection();
    } else {
      if (gDBView) {
        gDBView.setJSTree(null);
      }
      window.threadTree.view = gDBView = null;
    }
  },
  onLoadingFolder(dbFolderInfo) {
    window.quickFilterBar?.onFolderChanged();
  },
  onDisplayingFolder() {},
  onLeavingFolder() {},
  onMessagesLoaded(all) {
    // Try to restore what was selected. Keep the saved selection (if there is
    // one) until we have all of the messages.
    window.threadPane?.restoreSelection(all);

    if (all) {
      window.threadTree?.invalidate();
    }
    window.quickFilterBar?.onMessagesChanged();
  },
  onMailViewChanged() {},
  onSortChanged() {
    if (window.threadTree && gDBView.selection.count == 0) {
      // If there is no selection, scroll to the most relevant end.
      if (
        gViewWrapper.sortImpliesTemporalOrdering &&
        gViewWrapper.isSortedAscending
      ) {
        window.threadTree.scrollToIndex(gDBView.rowCount - 1, true);
      } else {
        window.threadTree.scrollToIndex(0, true);
      }
    }
  },
  onMessagesRemoved() {
    window.quickFilterBar?.onMessagesChanged();

    if (!gDBView || !gFolder) {
      // This can't be a notification about the message currently displayed.
      return;
    }

    let rowCount = gDBView.rowCount;

    // There's no messages left.
    if (rowCount == 0) {
      if (location.href == "about:3pane") {
        // In a 3-pane tab, clear the message pane and selection.
        window.threadTree.selectedIndex = -1;
      } else if (parent?.location != "about:3pane") {
        // In a standalone message tab or window, close the tab or window.
        let tabmail = top.document.getElementById("tabmail");
        if (tabmail) {
          tabmail.closeTab(window.tabOrWindow);
        } else {
          top.close();
        }
      }
      this._nextViewIndexAfterDelete = null;
      return;
    }

    if (
      this._nextViewIndexAfterDelete != null &&
      this._nextViewIndexAfterDelete != nsMsgViewIndex_None
    ) {
      // Select the next message in the view, based on what we were told in
      // updateNextMessageAfterDelete.
      if (this._nextViewIndexAfterDelete >= rowCount) {
        this._nextViewIndexAfterDelete = rowCount - 1;
      }
      if (
        this._nextViewIndexAfterDelete > -1 &&
        !mailContextMenu.selectionIsOverridden
      ) {
        if (location.href == "about:3pane") {
          // A "select" event should fire here, but setting the selected index
          // might not fire it. OTOH, we want it to fire only once, so see if
          // the event is fired, and if not, fire it.
          let eventFired = false;
          let onSelect = () => (eventFired = true);

          window.threadTree.addEventListener("select", onSelect, {
            once: true,
          });
          window.threadTree.selectedIndex = this._nextViewIndexAfterDelete;
          window.threadTree.removeEventListener("select", onSelect);

          if (!eventFired) {
            window.threadTree.dispatchEvent(new CustomEvent("select"));
          }
        } else if (parent?.location != "about:3pane") {
          if (
            Services.prefs.getBoolPref("mail.close_message_window.on_delete")
          ) {
            // Close the tab or window if the displayed message is deleted.
            let tabmail = top.document.getElementById("tabmail");
            if (tabmail) {
              tabmail.closeTab(window.tabOrWindow);
            } else {
              top.close();
            }
            return;
          }
          gDBView.selection.select(this._nextViewIndexAfterDelete);
          window.displayMessage(
            gDBView.getURIForViewIndex(this._nextViewIndexAfterDelete),
            gViewWrapper
          );
        }
      }
      this._nextViewIndexAfterDelete = null;
    }
  },
  onMessageRemovalFailed() {
    this._nextViewIndexAfterDelete = null;
  },
  onMessageCountsChanged() {
    window.quickFilterBar?.onMessagesChanged();
  },
};
