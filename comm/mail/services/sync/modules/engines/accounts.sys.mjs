/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

import { CryptoWrapper } from "resource://services-sync/record.sys.mjs";
import {
  Store,
  SyncEngine,
  Tracker,
} from "resource://services-sync/engines.sys.mjs";
import { Utils } from "resource://services-sync/util.sys.mjs";

const { SCORE_INCREMENT_XLARGE } = ChromeUtils.import(
  "resource://services-sync/constants.js"
);
const { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

const SYNCED_SMTP_PROPERTIES = {
  authMethod: "authMethod",
  port: "port",
  description: "name",
  socketType: "socketType",
};

const SYNCED_SERVER_PROPERTIES = {
  authMethod: "authMethod",
  biffMinutes: "check_time",
  doBiff: "check_new_mail",
  downloadOnBiff: "download_on_biff",
  emptyTrashOnExit: "empty_trash_on_exit",
  incomingDuplicateAction: "dup_action",
  limitOfflineMessageSize: "limit_offline_message_size",
  loginAtStartUp: "login_at_startup",
  maxMessageSize: "max_size",
  port: "port",
  prettyName: "name",
  socketType: "socketType",
};

/**
 * AccountRecord represents the state of an add-on in an application.
 *
 * Each add-on has its own record for each application ID it is installed
 * on.
 *
 * The ID of add-on records is a randomly-generated GUID. It is random instead
 * of deterministic so the URIs of the records cannot be guessed and so
 * compromised server credentials won't result in disclosure of the specific
 * add-ons present in a Sync account.
 *
 * The record contains the following fields:
 *
 */
export function AccountRecord(collection, id) {
  CryptoWrapper.call(this, collection, id);
}

AccountRecord.prototype = {
  __proto__: CryptoWrapper.prototype,
  _logName: "Record.Account",
};
Utils.deferGetSet(AccountRecord, "cleartext", [
  "username",
  "hostname",
  "type",
  "prefs",
  "isDefault",
]);

export function AccountsEngine(service) {
  SyncEngine.call(this, "Accounts", service);
}

AccountsEngine.prototype = {
  __proto__: SyncEngine.prototype,
  _storeObj: AccountStore,
  _trackerObj: AccountTracker,
  _recordObj: AccountRecord,
  version: 1,
  syncPriority: 3,

  /*
   * Returns a changeset for this sync. Engine implementations can override this
   * method to bypass the tracker for certain or all changed items.
   */
  async getChangedIDs() {
    return this._tracker.getChangedIDs();
  },
};

function AccountStore(name, engine) {
  Store.call(this, name, engine);
}
AccountStore.prototype = {
  __proto__: Store.prototype,

  /**
   * Create an item in the store from a record.
   *
   * This is called by the default implementation of applyIncoming(). If using
   * applyIncomingBatch(), this won't be called unless your store calls it.
   *
   * @param record
   *        The store record to create an item from
   */
  async create(record) {
    if (record.type == "smtp") {
      let smtpServer = MailServices.smtp.createServer();
      smtpServer.UID = record.id;
      smtpServer.username = record.username;
      smtpServer.hostname = record.hostname;
      for (let key of Object.keys(SYNCED_SMTP_PROPERTIES)) {
        if (key in record.prefs) {
          smtpServer[key] = record.prefs[key];
        }
      }
      if (record.isDefault) {
        MailServices.smtp.defaultServer = smtpServer;
      }
      return;
    }

    try {
      // Ensure there is a local mail account...
      MailServices.accounts.localFoldersServer;
    } catch {
      // ... if not, make one.
      MailServices.accounts.createLocalMailAccount();
    }

    let server = MailServices.accounts.createIncomingServer(
      record.username,
      record.hostname,
      record.type
    );
    server.UID = record.id;

    for (let key of Object.keys(SYNCED_SERVER_PROPERTIES)) {
      if (key in record.prefs) {
        server[key] = record.prefs[key];
      }
    }

    let account = MailServices.accounts.createAccount();
    account.incomingServer = server;

    if (server.loginAtStartUp) {
      Services.wm
        .getMostRecentWindow("mail:3pane")
        ?.GetNewMsgs(server, server.rootFolder);
    }
  },

  /**
   * Remove an item in the store from a record.
   *
   * This is called by the default implementation of applyIncoming(). If using
   * applyIncomingBatch(), this won't be called unless your store calls it.
   *
   * @param record
   *        The store record to delete an item from
   */
  async remove(record) {
    let smtpServer = MailServices.smtp.servers.find(s => s.UID == record.id);
    if (smtpServer) {
      MailServices.smtp.deleteServer(smtpServer);
      return;
    }

    let server = MailServices.accounts.allServers.find(s => s.UID == record.id);
    if (!server) {
      this._log.trace("Asked to remove record that doesn't exist, ignoring");
      return;
    }

    let account = MailServices.accounts.FindAccountForServer(server);
    if (account) {
      MailServices.accounts.removeAccount(account, true);
    } else {
      // Is this even possible?
      MailServices.accounts.removeIncomingServer(account, true);
    }
  },

  /**
   * Update an item from a record.
   *
   * This is called by the default implementation of applyIncoming(). If using
   * applyIncomingBatch(), this won't be called unless your store calls it.
   *
   * @param record
   *        The record to use to update an item from
   */
  async update(record) {
    if (record.type == "smtp") {
      await this._updateSMTP(record);
      return;
    }

    await this._updateIncoming(record);
  },

  async _updateSMTP(record) {
    let smtpServer = MailServices.smtp.servers.find(s => s.UID == record.id);
    if (!smtpServer) {
      this._log.trace("Skipping update for unknown item: " + record.id);
      return;
    }
    smtpServer.username = record.username;
    smtpServer.hostname = record.hostname;
    for (let key of Object.keys(SYNCED_SMTP_PROPERTIES)) {
      if (key in record.prefs) {
        smtpServer[key] = record.prefs[key];
      }
    }
    if (record.isDefault) {
      MailServices.smtp.defaultServer = smtpServer;
    }
  },

  async _updateIncoming(record) {
    let server = MailServices.accounts.allServers.find(s => s.UID == record.id);
    if (!server) {
      this._log.trace("Skipping update for unknown item: " + record.id);
      return;
    }
    if (server.type != record.type) {
      throw new Components.Exception(
        `Refusing to change server type from ${server.type} to ${record.type}`,
        Cr.NS_ERROR_FAILURE
      );
    }

    for (let key of Object.keys(SYNCED_SERVER_PROPERTIES)) {
      if (key in record.prefs) {
        server[key] = record.prefs[key];
      }
    }
  },

  /**
   * Determine whether a record with the specified ID exists.
   *
   * Takes a string record ID and returns a booleans saying whether the record
   * exists.
   *
   * @param  id
   *         string record ID
   * @return boolean indicating whether record exists locally
   */
  async itemExists(id) {
    return id in (await this.getAllIDs());
  },

  /**
   * Obtain the set of all known record IDs.
   *
   * @return Object with ID strings as keys and values of true. The values
   *         are ignored.
   */
  async getAllIDs() {
    let ids = {};
    for (let s of MailServices.smtp.servers) {
      ids[s.UID] = true;
    }
    for (let s of MailServices.accounts.allServers) {
      if (["imap", "pop3"].includes(s.type)) {
        ids[s.UID] = true;
      }
    }
    return ids;
  },

  /**
   * Create a record from the specified ID.
   *
   * If the ID is known, the record should be populated with metadata from
   * the store. If the ID is not known, the record should be created with the
   * delete field set to true.
   *
   * @param  id
   *         string record ID
   * @param  collection
   *         Collection to add record to. This is typically passed into the
   *         constructor for the newly-created record.
   * @return record type for this engine
   */
  async createRecord(id, collection) {
    let record = new AccountRecord(collection, id);

    let server = MailServices.smtp.servers.find(s => s.UID == id);
    if (server) {
      record.type = "smtp";
      record.username = server.username;
      record.hostname = server.hostname;
      record.prefs = {};
      for (let key of Object.keys(SYNCED_SMTP_PROPERTIES)) {
        record.prefs[key] = server[key];
      }
      record.isDefault = MailServices.smtp.defaultServer == server;
      return record;
    }

    server = MailServices.accounts.allServers.find(s => s.UID == id);
    // If we don't know about this ID, mark the record as deleted.
    if (!server) {
      record.deleted = true;
      return record;
    }

    record.type = server.type;
    record.username = server.username;
    record.hostname = server.hostName;
    record.prefs = {};
    for (let key of Object.keys(SYNCED_SERVER_PROPERTIES)) {
      record.prefs[key] = server[key];
    }

    return record;
  },
};

function AccountTracker(name, engine) {
  Tracker.call(this, name, engine);
}
AccountTracker.prototype = {
  __proto__: Tracker.prototype,

  _changedIDs: new Set(),
  _ignoreAll: false,

  async getChangedIDs() {
    let changes = {};
    for (let id of this._changedIDs) {
      changes[id] = 0;
    }
    return changes;
  },

  clearChangedIDs() {
    this._changedIDs.clear();
  },

  get ignoreAll() {
    return this._ignoreAll;
  },

  set ignoreAll(value) {
    this._ignoreAll = value;
  },

  onStart() {
    Services.prefs.addObserver("mail.server.", this);
    Services.obs.addObserver(this, "message-server-removed");
  },

  onStop() {
    Services.prefs.removeObserver("mail.server.", this);
    Services.obs.removeObserver(this, "message-server-removed");
  },

  observe(subject, topic, data) {
    if (this._ignoreAll) {
      return;
    }

    let server;
    if (topic == "message-server-removed") {
      server = subject.QueryInterface(Ci.nsIMsgIncomingServer);
    } else {
      let serverKey = data.split(".")[2];
      let prefName = data.substring(serverKey.length + 13);
      if (!Object.values(SYNCED_SERVER_PROPERTIES).includes(prefName)) {
        return;
      }

      // Don't use getIncomingServer or it'll throw if the server doesn't exist.
      server = MailServices.accounts.allServers.find(s => s.key == serverKey);
    }

    if (
      server &&
      ["imap", "pop3"].includes(server.type) &&
      !this._changedIDs.has(server.UID)
    ) {
      this._changedIDs.add(server.UID);
      this.score += SCORE_INCREMENT_XLARGE;
    }
  },
};
