/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Status } from "resource:///modules/imStatusUtils.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { ClassInfo } from "resource:///modules/imXPCOMUtils.sys.mjs";
import { Message } from "resource:///modules/jsProtoHelper.sys.mjs";

var gLastUIConvId = 0;
var gLastPrplConvId = 0;

const lazy = {};

XPCOMUtils.defineLazyGetter(lazy, "bundle", () =>
  Services.strings.createBundle("chrome://chat/locale/conversations.properties")
);

export function imMessage(aPrplMessage) {
  this.prplMessage = aPrplMessage;
}

imMessage.prototype = {
  __proto__: ClassInfo(["imIMessage", "prplIMessage"], "IM Message"),
  cancelled: false,
  color: "",
  _displayMessage: null,
  otrEncrypted: false,

  get displayMessage() {
    // Explicitly test for null so that blank messages don't fall back to
    // the original. Especially problematic in encryption extensions like OTR.
    return this._displayMessage !== null
      ? this._displayMessage
      : this.prplMessage.originalMessage;
  },
  set displayMessage(aMsg) {
    this._displayMessage = aMsg;
  },

  get message() {
    return this.prplMessage.message;
  },
  set message(aMsg) {
    this.prplMessage.message = aMsg;
  },

  // from prplIMessage
  get who() {
    return this.prplMessage.who;
  },
  get time() {
    return this.prplMessage.time;
  },
  get id() {
    return this.prplMessage.id;
  },
  get remoteId() {
    return this.prplMessage.remoteId;
  },
  get alias() {
    return this.prplMessage.alias;
  },
  get iconURL() {
    return this.prplMessage.iconURL;
  },
  get conversation() {
    return this.prplMessage.conversation;
  },
  set conversation(aConv) {
    this.prplMessage.conversation = aConv;
  },
  get outgoing() {
    return this.prplMessage.outgoing;
  },
  get incoming() {
    return this.prplMessage.incoming;
  },
  get system() {
    return this.prplMessage.system;
  },
  get autoResponse() {
    return this.prplMessage.autoResponse;
  },
  get containsNick() {
    return this.prplMessage.containsNick;
  },
  get noLog() {
    return this.prplMessage.noLog;
  },
  get error() {
    return this.prplMessage.error;
  },
  get delayed() {
    return this.prplMessage.delayed;
  },
  get noFormat() {
    return this.prplMessage.noFormat;
  },
  get containsImages() {
    return this.prplMessage.containsImages;
  },
  get notification() {
    return this.prplMessage.notification;
  },
  get noLinkification() {
    return this.prplMessage.noLinkification;
  },
  get noCollapse() {
    return this.prplMessage.noCollapse;
  },
  get isEncrypted() {
    return this.prplMessage.isEncrypted || this.otrEncrypted;
  },
  get action() {
    return this.prplMessage.action;
  },
  get deleted() {
    return this.prplMessage.deleted;
  },
  get originalMessage() {
    return this.prplMessage.originalMessage;
  },
  getActions() {
    return this.prplMessage.getActions();
  },
  whenDisplayed() {
    return this.prplMessage.whenDisplayed();
  },
  whenRead() {
    return this.prplMessage.whenRead();
  },
};

/**
 * @param {prplIConversation} aPrplConversation
 * @param {number} [idToReuse] - ID to use for this UI conversation if it replaces another UI conversation.
 */
export function UIConversation(aPrplConversation, idToReuse) {
  this._prplConv = {};
  if (idToReuse) {
    this.id = idToReuse;
  } else {
    this.id = ++gLastUIConvId;
  }
  // Observers listening to this instance's notifications.
  this._observers = [];
  // Observers this instance has attached to prplIConversations.
  this._convObservers = new WeakMap();
  this._messages = [];
  this.changeTargetTo(aPrplConversation);
  let iface = Ci["prplIConv" + (aPrplConversation.isChat ? "Chat" : "IM")];
  this._interfaces = this._interfaces.concat(iface);
  // XPConnect will create a wrapper around 'this' after here,
  // so the list of exposed interfaces shouldn't change anymore.
  this.updateContactObserver();
  if (!idToReuse) {
    Services.obs.notifyObservers(this, "new-ui-conversation");
  }
}

UIConversation.prototype = {
  __proto__: ClassInfo(
    ["imIConversation", "prplIConversation", "nsIObserver"],
    "UI conversation"
  ),
  _observedContact: null,
  get contact() {
    let target = this.target;
    if (!target.isChat && target.buddy) {
      return target.buddy.buddy.contact;
    }
    return null;
  },
  updateContactObserver() {
    let contact = this.contact;
    if (contact && !this._observedContact) {
      contact.addObserver(this);
      this._observedContact = contact;
    } else if (!contact && this.observedContact) {
      this._observedContact.removeObserver(this);
      delete this._observedContact;
    }
  },
  /**
   * @type {prplIConversation}
   */
  get target() {
    return this._prplConv[this._currentTargetId];
  },
  set target(aPrplConversation) {
    this.changeTargetTo(aPrplConversation);
  },
  get hasMultipleTargets() {
    return Object.keys(this._prplConv).length > 1;
  },
  getTargetByAccount(aAccount) {
    let accountId = aAccount.id;
    for (let id in this._prplConv) {
      let prplConv = this._prplConv[id];
      if (prplConv.account.id == accountId) {
        return prplConv;
      }
    }
    return null;
  },
  _currentTargetId: 0,
  changeTargetTo(aPrplConversation) {
    let id = aPrplConversation.id;
    if (this._currentTargetId == id) {
      return;
    }

    if (!(id in this._prplConv)) {
      this._prplConv[id] = aPrplConversation;
      let observeConv = this.observeConv.bind(this, id);
      this._convObservers.set(aPrplConversation, observeConv);
      aPrplConversation.addObserver(observeConv);
    }

    let shouldNotify = this._currentTargetId;
    this._currentTargetId = id;
    if (!this.isChat) {
      let buddy = this.buddy;
      if (buddy) {
        ({ statusType: this.statusType, statusText: this.statusText } = buddy);
      }
    }
    if (shouldNotify) {
      this.notifyObservers(this, "target-prpl-conversation-changed");
      let target = this.target;
      let params = [target.title, target.account.protocol.name];
      this.systemMessage(
        lazy.bundle.formatStringFromName("targetChanged", params)
      );
    }
  },
  // Returns a boolean indicating if the ui-conversation was closed.
  // If the conversation was closed, aContactId.value is set to the contact id
  // or 0 if no contact was associated with the conversation.
  removeTarget(aPrplConversation, aContactId) {
    let id = aPrplConversation.id;
    if (!(id in this._prplConv)) {
      throw new Error("unknown prpl conversation");
    }

    delete this._prplConv[id];
    if (this._currentTargetId != id) {
      return false;
    }

    for (let newId in this._prplConv) {
      this.changeTargetTo(this._prplConv[newId]);
      return false;
    }

    if (this._observedContact) {
      this._observedContact.removeObserver(this);
      aContactId.value = this._observedContact.id;
      delete this._observedContact;
    } else {
      aContactId.value = 0;
    }

    delete this._currentTargetId;
    this.notifyObservers(this, "ui-conversation-closed");
    return true;
  },

  _unreadMessageCount: 0,
  get unreadMessageCount() {
    return this._unreadMessageCount;
  },
  _unreadTargetedMessageCount: 0,
  get unreadTargetedMessageCount() {
    return this._unreadTargetedMessageCount;
  },
  _unreadIncomingMessageCount: 0,
  get unreadIncomingMessageCount() {
    return this._unreadIncomingMessageCount;
  },
  _unreadOTRNotificationCount: 0,
  get unreadOTRNotificationCount() {
    return this._unreadOTRNotificationCount;
  },
  markAsRead() {
    delete this._unreadMessageCount;
    delete this._unreadTargetedMessageCount;
    delete this._unreadIncomingMessageCount;
    delete this._unreadOTRNotificationCount;
    if (this._messages.length) {
      this._messages[this._messages.length - 1].whenDisplayed();
    }
    this._notifyUnreadCountChanged();
  },
  _lastNotifiedUnreadCount: 0,
  _notifyUnreadCountChanged() {
    if (this._unreadIncomingMessageCount == this._lastNotifiedUnreadCount) {
      return;
    }

    this._lastNotifiedUnreadCount = this._unreadIncomingMessageCount;
    for (let observer of this._observers) {
      observer.observe(
        this,
        "unread-message-count-changed",
        this._unreadIncomingMessageCount.toString()
      );
    }
  },
  getMessages() {
    return this._messages;
  },
  checkClose() {
    if (!this._currentTargetId) {
      // Already closed.
      return true;
    }

    if (
      !Services.prefs.getBoolPref("messenger.conversations.alwaysClose") &&
      ((this.isChat && !this.left) ||
        (!this.isChat &&
          (this.unreadIncomingMessageCount != 0 ||
            Services.prefs.getBoolPref(
              "messenger.conversations.holdByDefault"
            ))))
    ) {
      return false;
    }

    this.close();
    return true;
  },

  observe(aSubject, aTopic, aData) {
    if (aTopic == "contact-no-longer-dummy") {
      let oldId = parseInt(aData);
      // gConversationsService is ugly... :(
      delete gConversationsService._uiConvByContactId[oldId];
      gConversationsService._uiConvByContactId[aSubject.id] = this;
    } else if (aTopic == "account-buddy-status-changed") {
      if (
        !this._statusUpdatePending &&
        aSubject.account.id == this.account.id &&
        aSubject.buddy.id == this.buddy.buddy.id
      ) {
        this._statusUpdatePending = true;
        Services.tm.mainThread.dispatch(
          this.updateBuddyStatus.bind(this),
          Ci.nsIEventTarget.DISPATCH_NORMAL
        );
      }
    } else if (aTopic == "account-buddy-icon-changed") {
      if (
        !this._statusUpdatePending &&
        aSubject.account.id == this.account.id &&
        aSubject.buddy.id == this.buddy.buddy.id
      ) {
        this._iconUpdatePending = true;
        Services.tm.mainThread.dispatch(
          this.updateIcon.bind(this),
          Ci.nsIEventTarget.DISPATCH_NORMAL
        );
      }
    } else if (
      aTopic == "account-buddy-display-name-changed" &&
      aSubject.account.id == this.account.id &&
      aSubject.buddy.id == this.buddy.buddy.id
    ) {
      this.notifyObservers(this, "update-buddy-display-name");
    }
  },

  _iconUpdatePending: false,
  updateIcon() {
    delete this._iconUpdatePending;
    this.notifyObservers(this, "update-buddy-icon");
  },

  _statusUpdatePending: false,
  updateBuddyStatus() {
    delete this._statusUpdatePending;
    let { statusType: statusType, statusText: statusText } = this.buddy;

    if (
      "statusType" in this &&
      this.statusType == statusType &&
      this.statusText == statusText
    ) {
      return;
    }

    let wasUnknown = this.statusType == Ci.imIStatusInfo.STATUS_UNKNOWN;
    this.statusType = statusType;
    this.statusText = statusText;

    this.notifyObservers(this, "update-buddy-status");

    let msg;
    if (statusType == Ci.imIStatusInfo.STATUS_UNKNOWN) {
      msg = lazy.bundle.formatStringFromName("statusUnknown", [this.title]);
    } else {
      let status = Status.toLabel(statusType);
      let stringId = wasUnknown ? "statusChangedFromUnknown" : "statusChanged";
      if (this._justReconnected) {
        stringId = "statusKnown";
        delete this._justReconnected;
      }
      if (statusText) {
        msg = lazy.bundle.formatStringFromName(stringId + "WithStatusText", [
          this.title,
          status,
          statusText,
        ]);
      } else {
        msg = lazy.bundle.formatStringFromName(stringId, [this.title, status]);
      }
    }
    this.systemMessage(msg);
  },

  _disconnected: false,
  disconnecting() {
    if (this._disconnected) {
      return;
    }

    this._disconnected = true;
    if (this.contact) {
      // Handled by the contact observer.
      return;
    }

    if (this.isChat && this.left) {
      this._wasLeft = true;
    } else {
      this.systemMessage(lazy.bundle.GetStringFromName("accountDisconnected"));
    }
    this.notifyObservers(this, "update-buddy-status");
  },
  connected() {
    if (this._disconnected) {
      delete this._disconnected;
      let msg = lazy.bundle.GetStringFromName("accountReconnected");
      if (this.isChat) {
        if (!this._wasLeft) {
          this.systemMessage(msg);
          // Reconnect chat if possible.
          let chatRoomFields = this.target.chatRoomFields;
          if (chatRoomFields) {
            this.account.joinChat(chatRoomFields);
          }
        }
        delete this._wasLeft;
      } else {
        this._justReconnected = true;
        // Exclude convs with contacts, these receive presence info updates
        // (and therefore a reconnected message).
        if (!this.contact) {
          this.systemMessage(msg);
        }
      }
    }
    this.notifyObservers(this, "update-buddy-status");
  },

  observeConv(aTargetId, aSubject, aTopic, aData) {
    if (
      aTargetId != this._currentTargetId &&
      (aTopic == "new-text" ||
        aTopic == "update-text" ||
        aTopic == "remove-text" ||
        (aTopic == "update-typing" &&
          this._prplConv[aTargetId].typingState == Ci.prplIConvIM.TYPING))
    ) {
      this.target = this._prplConv[aTargetId];
    }

    this.notifyObservers(aSubject, aTopic, aData);
  },

  systemMessage(aText, aIsError, aNoCollapse) {
    let flags = {
      system: true,
      noLog: true,
      error: !!aIsError,
      noCollapse: !!aNoCollapse,
    };
    const message = new Message("system", aText, flags, this);
    this.notifyObservers(message, "new-text");
  },

  /**
   * Emit a notification sound for a new chat message and trigger the
   * global notificationbox to prompt the user with the verifiation request.
   *
   * @param String aText - The system message.
   */
  notifyVerifyOTR(aText) {
    this._unreadOTRNotificationCount++;
    this.systemMessage(aText, false, true);
    for (let observer of this._observers) {
      observer.observe(
        this,
        "unread-message-count-changed",
        this._unreadOTRNotificationCount.toString()
      );
    }
  },

  // prplIConversation
  get isChat() {
    return this.target.isChat;
  },
  get account() {
    return this.target.account;
  },
  get name() {
    return this.target.name;
  },
  get normalizedName() {
    return this.target.normalizedName;
  },
  get title() {
    return this.target.title;
  },
  get startDate() {
    return this.target.startDate;
  },
  get convIconFilename() {
    return this.target.convIconFilename;
  },
  get encryptionState() {
    return this.target.encryptionState;
  },
  initializeEncryption() {
    this.target.initializeEncryption();
  },
  sendMsg(aMsg, aAction = false, aNotice = false) {
    this.target.sendMsg(aMsg, aAction, aNotice);
  },
  unInit() {
    for (let id in this._prplConv) {
      let conv = this._prplConv[id];
      gConversationsService.forgetConversation(conv);
    }
    if (this._observedContact) {
      this._observedContact.removeObserver(this);
      delete this._observedContact;
    }
    this._prplConv = {}; // Prevent .close from failing.
    delete this._currentTargetId;
    this.notifyObservers(this, "ui-conversation-destroyed");
  },
  close() {
    for (let id in this._prplConv) {
      let conv = this._prplConv[id];
      conv.close();
    }
    if (!this.hasOwnProperty("_currentTargetId")) {
      return;
    }
    delete this._currentTargetId;
    this.notifyObservers(this, "ui-conversation-closed");
    Services.obs.notifyObservers(this, "ui-conversation-closed");
  },
  addObserver(aObserver) {
    if (!this._observers.includes(aObserver)) {
      this._observers.push(aObserver);
    }
  },
  removeObserver(aObserver) {
    this._observers = this._observers.filter(o => o !== aObserver);
  },
  notifyObservers(aSubject, aTopic, aData) {
    if (aTopic == "new-text" || aTopic == "update-text") {
      aSubject = new imMessage(aSubject);
      this.notifyObservers(aSubject, "received-message");
      if (aSubject.cancelled) {
        return;
      }
      if (!aSubject.system) {
        aSubject.conversation.prepareForDisplaying(aSubject);
      }
    }
    if (aTopic == "new-text") {
      this._messages.push(aSubject);
      ++this._unreadMessageCount;
      if (aSubject.incoming && !aSubject.system) {
        ++this._unreadIncomingMessageCount;
        if (!this.isChat || aSubject.containsNick) {
          ++this._unreadTargetedMessageCount;
        }
      }
    } else if (aTopic == "update-text") {
      const index = this._messages.findIndex(
        msg => msg.remoteId == aSubject.remoteId
      );
      if (index != -1) {
        this._messages.splice(index, 1, aSubject);
      }
    } else if (aTopic == "remove-text") {
      const index = this._messages.findIndex(msg => msg.remoteId == aData);
      if (index != -1) {
        this._messages.splice(index, 1);
      }
    }

    if (aTopic == "chat-update-type") {
      // bail if there is no change of the conversation type
      if (
        (this.target.isChat && this._interfaces.includes(Ci.prplIConvChat)) ||
        (!this.target.isChat && this._interfaces.includes(Ci.prplIConvIM))
      ) {
        return;
      }
      if (this._observedContact) {
        this._observedContact.removeObserver(this);
      }
      this.target.removeObserver(this._convObservers.get(this.target));
      gConversationsService.updateConversation(this.target);
      return;
    }

    for (let observer of this._observers) {
      if (!observer.observe && !this._observers.includes(observer)) {
        // Observer removed by a previous call to another observer.
        continue;
      }
      observer.observe(aSubject, aTopic, aData);
    }
    this._notifyUnreadCountChanged();

    if (aTopic == "new-text" || aTopic == "update-text") {
      // Even updated messages should be treated as new message for logs.
      // TODO proper handling in logs is bug 1735353
      Services.obs.notifyObservers(aSubject, "new-text", aData);
      if (
        aTopic == "new-text" &&
        aSubject.incoming &&
        !aSubject.system &&
        (!this.isChat || aSubject.containsNick)
      ) {
        this.notifyObservers(aSubject, "new-directed-incoming-message", aData);
        Services.obs.notifyObservers(
          aSubject,
          "new-directed-incoming-message",
          aData
        );
      }
    }
  },

  // Used above when notifying of new-texts originating in the
  // UIConversation. This happens when this.systemMessage() is called. The
  // conversation for the message is set as the UIConversation.
  prepareForDisplaying(aMsg) {},

  // prplIConvIM
  get buddy() {
    return this.target.buddy;
  },
  get typingState() {
    return this.target.typingState;
  },
  sendTyping(aString) {
    return this.target.sendTyping(aString);
  },

  // Chat only
  getParticipants() {
    return this.target.getParticipants();
  },
  get topic() {
    return this.target.topic;
  },
  set topic(aTopic) {
    this.target.topic = aTopic;
  },
  get topicSetter() {
    return this.target.topicSetter;
  },
  get topicSettable() {
    return this.target.topicSettable;
  },
  get noTopicString() {
    return lazy.bundle.GetStringFromName("noTopic");
  },
  get nick() {
    return this.target.nick;
  },
  get left() {
    return this.target.left;
  },
  get joining() {
    return this.target.joining;
  },
};

var gConversationsService;

export function ConversationsService() {
  gConversationsService = this;
}

ConversationsService.prototype = {
  get wrappedJSObject() {
    return this;
  },

  initConversations() {
    this._uiConv = {};
    this._uiConvByContactId = {};
    this._prplConversations = [];
    Services.obs.addObserver(this, "account-disconnecting");
    Services.obs.addObserver(this, "account-connected");
    Services.obs.addObserver(this, "account-buddy-added");
    Services.obs.addObserver(this, "account-buddy-removed");
  },

  unInitConversations() {
    let UIConvs = this.getUIConversations();
    for (let UIConv of UIConvs) {
      UIConv.unInit();
    }
    delete this._uiConv;
    delete this._uiConvByContactId;
    // This should already be empty, but just to be sure...
    for (let prplConv of this._prplConversations) {
      prplConv.unInit();
    }
    delete this._prplConversations;
    Services.obs.removeObserver(this, "account-disconnecting");
    Services.obs.removeObserver(this, "account-connected");
    Services.obs.removeObserver(this, "account-buddy-added");
    Services.obs.removeObserver(this, "account-buddy-removed");
  },

  observe(aSubject, aTopic, aData) {
    if (aTopic == "account-connected") {
      for (let id in this._uiConv) {
        let conv = this._uiConv[id];
        if (conv.account.id == aSubject.id) {
          conv.connected();
        }
      }
    } else if (aTopic == "account-disconnecting") {
      for (let id in this._uiConv) {
        let conv = this._uiConv[id];
        if (conv.account.id == aSubject.id) {
          conv.disconnecting();
        }
      }
    } else if (aTopic == "account-buddy-added") {
      let accountBuddy = aSubject;
      let prplConversation = this.getConversationByNameAndAccount(
        accountBuddy.normalizedName,
        accountBuddy.account,
        false
      );
      if (!prplConversation) {
        return;
      }

      let uiConv = this.getUIConversation(prplConversation);
      let contactId = accountBuddy.buddy.contact.id;
      if (contactId in this._uiConvByContactId) {
        // Trouble! There is an existing uiConv for this contact.
        // We should avoid having two uiConvs with the same contact.
        // This is ugly UX, but at least can only happen if there is
        // already an accountBuddy with the same name for the same
        // protocol on a different account, which should be rare.
        this.removeConversation(prplConversation);
        return;
      }
      // Link the existing uiConv to the contact.
      this._uiConvByContactId[contactId] = uiConv;
      uiConv.updateContactObserver();
      uiConv.notifyObservers(uiConv, "update-conv-buddy");
    } else if (aTopic == "account-buddy-removed") {
      let accountBuddy = aSubject;
      let contactId = accountBuddy.buddy.contact.id;
      if (!(contactId in this._uiConvByContactId)) {
        return;
      }
      let uiConv = this._uiConvByContactId[contactId];

      // If there is more than one target on the uiConv, close the
      // prplConv as we can't dissociate the uiConv from the contact.
      // The conversation with the contact will continue with a different
      // target.
      if (uiConv.hasMultipleTargets) {
        let prplConversation = uiConv.getTargetByAccount(accountBuddy.account);
        if (prplConversation) {
          this.removeConversation(prplConversation);
        }
        return;
      }

      delete this._uiConvByContactId[contactId];
      uiConv.updateContactObserver();
      uiConv.notifyObservers(uiConv, "update-conv-buddy");
    }
  },

  addConversation(aPrplConversation) {
    // Give an id to the new conversation.
    aPrplConversation.id = ++gLastPrplConvId;
    this._prplConversations.push(aPrplConversation);

    // Notify observers.
    Services.obs.notifyObservers(aPrplConversation, "new-conversation");

    // Update or create the corresponding UI conversation.
    let contactId;
    if (!aPrplConversation.isChat) {
      let accountBuddy = aPrplConversation.buddy;
      if (accountBuddy) {
        contactId = accountBuddy.buddy.contact.id;
      }
    }

    if (contactId) {
      if (contactId in this._uiConvByContactId) {
        let uiConv = this._uiConvByContactId[contactId];
        uiConv.target = aPrplConversation;
        this._uiConv[aPrplConversation.id] = uiConv;
        return;
      }
    }

    let newUIConv = new UIConversation(aPrplConversation);
    this._uiConv[aPrplConversation.id] = newUIConv;
    if (contactId) {
      this._uiConvByContactId[contactId] = newUIConv;
    }
  },
  /**
   * Informs the conversation service that the type of the conversation changed, which then lets the
   * UI components know to use a new UI conversation instance.
   *
   * @param {prplIConversation} aPrplConversation - The prpl conversation to update the UI conv for.
   */
  updateConversation(aPrplConversation) {
    let contactId;
    let uiConv = this.getUIConversation(aPrplConversation);

    if (!aPrplConversation.isChat) {
      let accountBuddy = aPrplConversation.buddy;
      if (accountBuddy) {
        contactId = accountBuddy.buddy.contact.id;
      }
    }
    // Ensure conv is not in the by contact ID map
    for (const [contactId, uiConversation] of Object.entries(
      this._uiConvByContactId
    )) {
      if (uiConversation === uiConv) {
        delete this._uiConvByContactId[contactId];
        break;
      }
    }
    Services.obs.notifyObservers(uiConv, "ui-conversation-replaced");
    let uiConvId = uiConv.id;
    // create new UI conv with correct interfaces.
    uiConv = new UIConversation(aPrplConversation, uiConvId);
    this._uiConv[aPrplConversation.id] = uiConv;

    // Ensure conv is in the by contact ID map if it has a contact
    if (contactId) {
      this._uiConvByContactId[contactId] = uiConv;
    }
    Services.obs.notifyObservers(uiConv, "conversation-update-type");
  },
  removeConversation(aPrplConversation) {
    Services.obs.notifyObservers(aPrplConversation, "conversation-closed");

    let uiConv = this.getUIConversation(aPrplConversation);
    delete this._uiConv[aPrplConversation.id];
    let contactId = {};
    if (uiConv.removeTarget(aPrplConversation, contactId)) {
      if (contactId.value) {
        delete this._uiConvByContactId[contactId.value];
      }
      Services.obs.notifyObservers(uiConv, "ui-conversation-closed");
    }
    this.forgetConversation(aPrplConversation);
  },
  forgetConversation(aPrplConversation) {
    aPrplConversation.unInit();

    this._prplConversations = this._prplConversations.filter(
      c => c !== aPrplConversation
    );
  },

  getUIConversations() {
    let rv = [];
    if (this._uiConv) {
      for (let prplConvId in this._uiConv) {
        // Since an UIConversation may be linked to multiple prplConversations,
        // we must ensure we don't return the same UIConversation twice,
        // by checking the id matches that of the active prplConversation.
        let uiConv = this._uiConv[prplConvId];
        if (prplConvId == uiConv.target.id) {
          rv.push(uiConv);
        }
      }
    }
    return rv;
  },
  getUIConversation(aPrplConversation) {
    let id = aPrplConversation.id;
    if (this._uiConv && id in this._uiConv) {
      return this._uiConv[id];
    }
    throw new Error("Unknown conversation");
  },
  getUIConversationByContactId(aId) {
    return aId in this._uiConvByContactId ? this._uiConvByContactId[aId] : null;
  },

  getConversations() {
    return this._prplConversations;
  },
  getConversationById(aId) {
    for (let conv of this._prplConversations) {
      if (conv.id == aId) {
        return conv;
      }
    }
    return null;
  },
  getConversationByNameAndAccount(aName, aAccount, aIsChat) {
    let normalizedName = aAccount.normalize(aName);
    for (let conv of this._prplConversations) {
      if (
        aAccount.normalize(conv.name) == normalizedName &&
        aAccount.numericId == conv.account.numericId &&
        conv.isChat == aIsChat
      ) {
        return conv;
      }
    }
    return null;
  },

  QueryInterface: ChromeUtils.generateQI(["imIConversationsService"]),
  classDescription: "Conversations",
};
