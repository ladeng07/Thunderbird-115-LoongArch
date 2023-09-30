/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { IMServices } from "resource:///modules/IMServices.sys.mjs";
import {
  ClassInfo,
  initLogModule,
} from "resource:///modules/imXPCOMUtils.sys.mjs";

var kQuitApplicationGranted = "quit-application-granted";
var kProtocolPluginCategory = "im-protocol-plugin";

var kPrefReportIdle = "messenger.status.reportIdle";
var kPrefUserIconFilename = "messenger.status.userIconFileName";
var kPrefUserDisplayname = "messenger.status.userDisplayName";
var kPrefTimeBeforeIdle = "messenger.status.timeBeforeIdle";
var kPrefAwayWhenIdle = "messenger.status.awayWhenIdle";
var kPrefDefaultMessage = "messenger.status.defaultIdleAwayMessage";

var NS_IOSERVICE_GOING_OFFLINE_TOPIC = "network:offline-about-to-go-offline";
var NS_IOSERVICE_OFFLINE_STATUS_TOPIC = "network:offline-status-changed";

function UserStatus() {
  this._observers = [];

  if (Services.prefs.getBoolPref(kPrefReportIdle)) {
    this._addIdleObserver();
  }
  Services.prefs.addObserver(kPrefReportIdle, this);

  if (Services.io.offline) {
    this._offlineStatusType = Ci.imIStatusInfo.STATUS_OFFLINE;
  }
  Services.obs.addObserver(this, NS_IOSERVICE_GOING_OFFLINE_TOPIC);
  Services.obs.addObserver(this, NS_IOSERVICE_OFFLINE_STATUS_TOPIC);
}
UserStatus.prototype = {
  __proto__: ClassInfo("imIUserStatusInfo", "User status info"),

  unInit() {
    this._observers = [];
    Services.prefs.removeObserver(kPrefReportIdle, this);
    if (this._observingIdleness) {
      this._removeIdleObserver();
    }
    Services.obs.removeObserver(this, NS_IOSERVICE_GOING_OFFLINE_TOPIC);
    Services.obs.removeObserver(this, NS_IOSERVICE_OFFLINE_STATUS_TOPIC);
  },
  _observingIdleness: false,
  _addIdleObserver() {
    this._observingIdleness = true;
    this._idleService = Cc["@mozilla.org/widget/useridleservice;1"].getService(
      Ci.nsIUserIdleService
    );
    Services.obs.addObserver(this, "im-sent");

    this._timeBeforeIdle = Services.prefs.getIntPref(kPrefTimeBeforeIdle);
    if (this._timeBeforeIdle < 0) {
      this._timeBeforeIdle = 0;
    }
    Services.prefs.addObserver(kPrefTimeBeforeIdle, this);
    if (this._timeBeforeIdle) {
      this._idleService.addIdleObserver(this, this._timeBeforeIdle);
    }
  },
  _removeIdleObserver() {
    if (this._timeBeforeIdle) {
      this._idleService.removeIdleObserver(this, this._timeBeforeIdle);
    }

    Services.prefs.removeObserver(kPrefTimeBeforeIdle, this);
    delete this._timeBeforeIdle;

    Services.obs.removeObserver(this, "im-sent");
    delete this._idleService;
    delete this._observingIdleness;
  },

  observe(aSubject, aTopic, aData) {
    if (aTopic == "nsPref:changed") {
      if (aData == kPrefReportIdle) {
        let reportIdle = Services.prefs.getBoolPref(kPrefReportIdle);
        if (reportIdle && !this._observingIdleness) {
          this._addIdleObserver();
        } else if (!reportIdle && this._observingIdleness) {
          this._removeIdleObserver();
        }
      } else if (aData == kPrefTimeBeforeIdle) {
        let timeBeforeIdle = Services.prefs.getIntPref(kPrefTimeBeforeIdle);
        if (timeBeforeIdle != this._timeBeforeIdle) {
          if (this._timeBeforeIdle) {
            this._idleService.removeIdleObserver(this, this._timeBeforeIdle);
          }
          this._timeBeforeIdle = timeBeforeIdle;
          if (this._timeBeforeIdle) {
            this._idleService.addIdleObserver(this, this._timeBeforeIdle);
          }
        }
      } else {
        throw Components.Exception("", Cr.NS_ERROR_UNEXPECTED);
      }
    } else if (aTopic == NS_IOSERVICE_GOING_OFFLINE_TOPIC) {
      this.offline = true;
    } else if (
      aTopic == NS_IOSERVICE_OFFLINE_STATUS_TOPIC &&
      aData == "online"
    ) {
      this.offline = false;
    } else {
      this._checkIdle();
    }
  },

  _offlineStatusType: Ci.imIStatusInfo.STATUS_AVAILABLE,
  set offline(aOffline) {
    let statusType = this.statusType;
    let statusText = this.statusText;
    if (aOffline) {
      this._offlineStatusType = Ci.imIStatusInfo.STATUS_OFFLINE;
    } else {
      delete this._offlineStatusType;
    }
    if (this.statusType != statusType || this.statusText != statusText) {
      this._notifyObservers("status-changed", this.statusText);
    }
  },

  _idleTime: 0,
  get idleTime() {
    return this._idleTime;
  },
  set idleTime(aIdleTime) {
    this._idleTime = aIdleTime;
    this._notifyObservers("idle-time-changed", aIdleTime);
  },
  _idle: false,
  _idleStatusText: "",
  _idleStatusType: Ci.imIStatusInfo.STATUS_AVAILABLE,
  _checkIdle() {
    let idleTime = Math.floor(this._idleService.idleTime / 1000);
    let idle = this._timeBeforeIdle && idleTime >= this._timeBeforeIdle;
    if (idle == this._idle) {
      return;
    }

    let statusType = this.statusType;
    let statusText = this.statusText;
    this._idle = idle;
    if (idle) {
      this.idleTime = idleTime;
      if (Services.prefs.getBoolPref(kPrefAwayWhenIdle)) {
        this._idleStatusType = Ci.imIStatusInfo.STATUS_AWAY;
        this._idleStatusText = Services.prefs.getComplexValue(
          kPrefDefaultMessage,
          Ci.nsIPrefLocalizedString
        ).data;
      }
    } else {
      this.idleTime = 0;
      delete this._idleStatusType;
      delete this._idleStatusText;
    }
    if (this.statusType != statusType || this.statusText != statusText) {
      this._notifyObservers("status-changed", this.statusText);
    }
  },

  _statusText: "",
  get statusText() {
    return this._statusText || this._idleStatusText;
  },
  _statusType: Ci.imIStatusInfo.STATUS_AVAILABLE,
  get statusType() {
    return Math.min(
      this._statusType,
      this._idleStatusType,
      this._offlineStatusType
    );
  },
  setStatus(aStatus, aMessage) {
    if (aStatus != Ci.imIStatusInfo.STATUS_UNKNOWN) {
      this._statusType = aStatus;
    }
    if (aStatus != Ci.imIStatusInfo.STATUS_OFFLINE) {
      this._statusText = aMessage;
    }
    this._notifyObservers("status-changed", aMessage);
  },

  _getProfileDir: () => Services.dirsvc.get("ProfD", Ci.nsIFile),
  setUserIcon(aIconFile) {
    let folder = this._getProfileDir();

    let newName = "";
    if (aIconFile) {
      // Get the extension (remove trailing dots - invalid Windows extension).
      let ext = aIconFile.leafName.replace(/.*(\.[a-z0-9]+)\.*/i, "$1");
      // newName = userIcon-<timestamp(now)>.<aIconFile.extension>
      newName = "userIcon-" + Math.floor(Date.now() / 1000) + ext;

      // Copy the new icon file to newName in the profile folder.
      aIconFile.copyTo(folder, newName);
    }

    // Get the previous file name before saving the new file name.
    let oldFileName = Services.prefs.getCharPref(kPrefUserIconFilename);
    Services.prefs.setCharPref(kPrefUserIconFilename, newName);

    // Now that the new icon has been copied to the profile directory
    // and the pref value changed, we can remove the old icon. Ignore
    // failures so that we always fire the user-icon-changed notification.
    try {
      if (oldFileName) {
        folder.append(oldFileName);
        if (folder.exists()) {
          folder.remove(false);
        }
      }
    } catch (e) {
      console.error(e);
    }

    this._notifyObservers("user-icon-changed", newName);
  },
  getUserIcon() {
    let filename = Services.prefs.getCharPref(kPrefUserIconFilename);
    if (!filename) {
      // No icon has been set.
      return null;
    }

    let file = this._getProfileDir();
    file.append(filename);

    if (!file.exists()) {
      Services.console.logStringMessage("Invalid userIconFileName preference");
      return null;
    }

    return Services.io.newFileURI(file);
  },

  get displayName() {
    return Services.prefs.getStringPref(kPrefUserDisplayname);
  },
  set displayName(aDisplayName) {
    Services.prefs.setStringPref(kPrefUserDisplayname, aDisplayName);
    this._notifyObservers("user-display-name-changed", aDisplayName);
  },

  addObserver(aObserver) {
    if (!this._observers.includes(aObserver)) {
      this._observers.push(aObserver);
    }
  },
  removeObserver(aObserver) {
    this._observers = this._observers.filter(o => o !== aObserver);
  },
  _notifyObservers(aTopic, aData) {
    for (let observer of this._observers) {
      observer.observe(this, aTopic, aData);
    }
  },
};

export function CoreService() {}
CoreService.prototype = {
  globalUserStatus: null,

  _initialized: false,
  get initialized() {
    return this._initialized;
  },
  init() {
    if (this._initialized) {
      return;
    }

    initLogModule("core", this);

    Services.obs.addObserver(this, kQuitApplicationGranted);
    this._initialized = true;

    IMServices.cmd.initCommands();
    this._protos = {};

    this.globalUserStatus = new UserStatus();
    this.globalUserStatus.addObserver({
      observe(aSubject, aTopic, aData) {
        Services.obs.notifyObservers(aSubject, aTopic, aData);
      },
    });

    IMServices.accounts.initAccounts();
    IMServices.contacts.initContacts();
    IMServices.conversations.initConversations();
    Services.obs.notifyObservers(this, "prpl-init");

    // Wait with automatic connections until the password service
    // is available.
    if (
      IMServices.accounts.autoLoginStatus ==
      Ci.imIAccountsService.AUTOLOGIN_ENABLED
    ) {
      Services.logins.initializationPromise.then(() => {
        IMServices.accounts.processAutoLogin();
      });
    }
  },
  observe(aObject, aTopic, aData) {
    if (aTopic == kQuitApplicationGranted) {
      this.quit();
    }
  },
  quit() {
    if (!this._initialized) {
      throw Components.Exception("", Cr.NS_ERROR_NOT_INITIALIZED);
    }

    Services.obs.removeObserver(this, kQuitApplicationGranted);
    Services.obs.notifyObservers(this, "prpl-quit");

    IMServices.conversations.unInitConversations();
    IMServices.accounts.unInitAccounts();
    IMServices.contacts.unInitContacts();
    IMServices.cmd.unInitCommands();

    this.globalUserStatus.unInit();
    delete this.globalUserStatus;
    delete this._protos;
    delete this._initialized;
  },

  getProtocols() {
    if (!this._initialized) {
      throw Components.Exception("", Cr.NS_ERROR_NOT_INITIALIZED);
    }

    let protocols = [];
    for (let entry of Services.catMan.enumerateCategory(
      kProtocolPluginCategory
    )) {
      let id = entry.data;

      // If the preference is set to disable this prpl, don't show it in the
      // full list of protocols.
      let pref = "chat.prpls." + id + ".disable";
      if (
        Services.prefs.getPrefType(pref) == Services.prefs.PREF_BOOL &&
        Services.prefs.getBoolPref(pref)
      ) {
        this.LOG("Disabling prpl: " + id);
        continue;
      }

      let proto = this.getProtocolById(id);
      if (proto) {
        protocols.push(proto);
      }
    }
    return protocols;
  },

  getProtocolById(aPrplId) {
    if (!this._initialized) {
      throw Components.Exception("", Cr.NS_ERROR_NOT_INITIALIZED);
    }

    if (this._protos.hasOwnProperty(aPrplId)) {
      return this._protos[aPrplId];
    }

    let cid;
    try {
      cid = Services.catMan.getCategoryEntry(kProtocolPluginCategory, aPrplId);
    } catch (e) {
      return null; // no protocol registered for this id.
    }

    let proto = null;
    try {
      proto = Cc[cid].createInstance(Ci.prplIProtocol);
    } catch (e) {
      // This is a real error, the protocol is registered and failed to init.
      let error = "failed to create an instance of " + cid + ": " + e;
      dump(error + "\n");
      console.error(error);
    }
    if (!proto) {
      return null;
    }

    try {
      proto.init(aPrplId);
    } catch (e) {
      console.error("Could not initialize protocol " + aPrplId + ": " + e);
      return null;
    }

    this._protos[aPrplId] = proto;
    return proto;
  },

  QueryInterface: ChromeUtils.generateQI(["imICoreService"]),
  classDescription: "Core",
};
