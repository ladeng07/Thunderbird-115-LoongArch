/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  RNP: "chrome://openpgp/content/modules/RNP.jsm",
});

/**
 * Database of collected OpenPGP keys.
 */
const EXPORTED_SYMBOLS = ["CollectedKeysDB"];

var log = console.createInstance({
  prefix: "openpgp",
  maxLogLevel: "Warn",
  maxLogLevelPref: "openpgp.loglevel",
});

/**
 * Class that handles storage of OpenPGP keys that were found through various
 * sources.
 */
class CollectedKeysDB {
  /**
   * @param {IDBDatabase} database
   */
  constructor(db) {
    this.db = db;
    this.db.onclose = () => {
      log.debug("DB closed!");
    };
    this.db.onabort = () => {
      log.debug("DB operation aborted!");
    };
  }

  /**
   * Get a database instance.
   *
   * @returns {CollectedKeysDB} a instance.
   */
  static async getInstance() {
    return new Promise((resolve, reject) => {
      const VERSION = 1;
      let DBOpenRequest = indexedDB.open("openpgp_cache", VERSION);
      DBOpenRequest.onupgradeneeded = event => {
        let db = event.target.result;
        if (event.oldVersion < 1) {
          // Create an objectStore for this database
          let objectStore = db.createObjectStore("seen_keys", {
            keyPath: "fingerprint",
          });
          objectStore.createIndex("emails", "emails", {
            unique: false,
            multiEntry: true,
          });
          objectStore.createIndex("created", "created");
          objectStore.createIndex("expires", "expires");
          objectStore.createIndex("timestamp", "timestamp");
        }
        log.debug(`Database ready at version ${VERSION}`);
      };
      DBOpenRequest.onerror = event => {
        log.debug(`Error loading database: ${DBOpenRequest.error.message}`);
        reject(DBOpenRequest.error);
      };
      DBOpenRequest.onsuccess = event => {
        let keyDb = new CollectedKeysDB(DBOpenRequest.result);
        resolve(keyDb);
      };
    });
  }

  /**
   * @typedef {object} CollectedKey - Key details.
   * @property {string[]} emails - Lowercase email addresses associated with this key
   * @property {string} fingerprint - Key fingerprint.
   * @property {string[]} userIds - UserIds for this key.
   * @property {string} id - Key ID with a 0x prefix.
   * @property {string} pubKey - The public key data.
   * @property {Date} created - Key creation date.
   * @property {Date} expires - Key expiry date.
   * @property {Date} timestamp - Timestamp of last time this key was saved/updated.
   * @property {object[]} sources - List of sources we saw this key.
   * @property {string} sources.uri - URI of the source.
   * @property {string} sources.type - Type of source (e.g. attachment, wkd, keyserver)
   * @property {string} sources.description - Description of the source, if any. E.g. the attachment name.
   */

  /**
   * Store a key.
   *
   * @param {CollectedKey} key - the key to store.
   */
  async storeKey(key) {
    if (key.fingerprint?.length != 40) {
      throw new Error(`Invalid fingerprint: ${key.fingerprint}`);
    }
    return new Promise((resolve, reject) => {
      let transaction = this.db.transaction(["seen_keys"], "readwrite");
      transaction.oncomplete = () => {
        log.debug(`Stored key 0x${key.id} for ${key.emails}`);
        let window = Services.wm.getMostRecentWindow("mail:3pane");
        window.dispatchEvent(
          new CustomEvent("keycollected", { detail: { key } })
        );
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
      // log.debug(`Storing key: ${JSON.stringify(key, null, 2)}`);
      key.timestamp = new Date();
      transaction.objectStore("seen_keys").put(key);
      transaction.commit();
    });
  }

  /**
   * Find key for fingerprint.
   *
   * @param {string} fingerprint - Fingerprint to find key for.
   * @returns {CollectedKey} the key found, or null.
   */
  async findKeyForFingerprint(fingerprint) {
    if (fingerprint?.length != 40) {
      throw new Error(`Invalid fingerprint: ${fingerprint}`);
    }
    return new Promise((resolve, reject) => {
      let request = this.db
        .transaction("seen_keys")
        .objectStore("seen_keys")
        .get(fingerprint);

      request.onsuccess = event => {
        // If we didn't find anything, result is undefined. If so return null
        // so that we make it clear we found "something", but it was nothing.
        resolve(request.result || null);
      };
      request.onerror = event => {
        log.debug(`Find key failed: ${request.error.message}`);
        reject(request.error);
      };
    });
  }

  /**
   * Find keys for email.
   *
   * @param {string} email - Email to find keys for.
   * @returns {CollectedKey[]} the keys found.
   */
  async findKeysForEmail(email) {
    email = email.toLowerCase();
    return new Promise((resolve, reject) => {
      let keys = [];
      let index = this.db
        .transaction("seen_keys")
        .objectStore("seen_keys")
        .index("emails");
      index.openCursor(IDBKeyRange.only(email)).onsuccess = function (event) {
        let cursor = event.target.result;
        if (!cursor) {
          // All results done.
          resolve(keys);
          return;
        }
        keys.push(cursor.value);
        cursor.continue();
      };
    });
  }

  /**
   * Find existing key in the database, and use RNP to merge such a key
   * with the passed in keyBlock.
   * Merging will always use the email addresses and user IDs of the merged key,
   * which causes old revoked entries to be removed.
   * We keep the list of previously seen source locations.
   *
   * @param {EnigmailKeyOb} - key object
   * @param {string} keyBlock - public key to merge
   * @param {object} source - source of the information
   * @param {string} source.type - source type
   * @param {string} source.uri - source uri
   * @param {string?} source.description - source description
   * @returns {CollectedKey} merged key - not yet stored in the database
   */
  async mergeExisting(keyobj, keyBlock, source) {
    let fpr = keyobj.fpr;
    let existing = await this.findKeyForFingerprint(fpr);
    let newKey;
    let pubKey;
    if (existing) {
      pubKey = await lazy.RNP.mergePublicKeyBlocks(
        fpr,
        existing.pubKey,
        keyBlock
      );
      // Don't use EnigmailKey.getKeyListFromKeyBlock interactive.
      // Use low level API for obtaining key list, we don't want to
      // poison the app key cache.
      // We also don't want to obtain any additional revocation certs.
      let keys = await lazy.RNP.getKeyListFromKeyBlockImpl(
        pubKey,
        true,
        false,
        false,
        false
      );
      if (!keys || !keys.length) {
        throw new Error("Error getting keys from block");
      }
      if (keys.length != 1) {
        throw new Error(`Got ${keys.length} keys for fpr=${fpr}`);
      }
      newKey = keys[0];
    } else {
      pubKey = keyBlock;
      newKey = keyobj;
    }

    let key = {
      emails: newKey.userIds.map(uid =>
        MailServices.headerParser
          .makeFromDisplayAddress(uid.userId)[0]
          ?.email.toLowerCase()
          .trim()
      ),
      fingerprint: newKey.fpr,
      userIds: newKey.userIds.map(uid => uid.userId),
      id: newKey.keyId,
      pubKey,
      created: new Date(newKey.keyCreated * 1000),
      expires: newKey.expiryTime ? new Date(newKey.expiryTime * 1000) : null,
      sources: [source],
    };
    if (existing) {
      // Keep existing sources meta information.
      let sourceType = source.type;
      let sourceURI = source.uri;
      for (let oldSource of existing.sources.filter(
        s => !(s.type == sourceType && s.uri == sourceURI)
      )) {
        key.sources.push(oldSource);
      }
    }
    return key;
  }

  /**
   * Delete keys for email.
   *
   * @param {string} email - Email to delete keys for.
   */
  async deleteKeysForEmail(email) {
    email = email.toLowerCase();
    return new Promise((resolve, reject) => {
      let transaction = this.db.transaction(["seen_keys"], "readwrite");
      let objectStore = transaction.objectStore("seen_keys");
      let request = objectStore.index("emails").openKeyCursor();
      request.onsuccess = event => {
        let cursor = request.result;
        if (cursor) {
          objectStore.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          log.debug(`Deleted all keys for ${email}.`);
        }
      };
      transaction.oncomplete = () => {
        log.debug(`Keys gone for email ${email}.`);
        resolve(email);
      };
      transaction.onerror = event => {
        log.debug(
          `Could not delete keys for email ${email}: ${transaction.error.message}`
        );
        reject(transaction.error);
      };
    });
  }

  /**
   * Delete key by fingerprint.
   *
   * @param {string} fingerprint - fingerprint of key to delete.
   */
  async deleteKey(fingerprint) {
    if (fingerprint.length != 40) {
      throw new Error(`Invalid fingerprint: ${fingerprint}`);
    }
    return new Promise((resolve, reject) => {
      let transaction = this.db.transaction(["seen_keys"], "readwrite");
      let request = transaction.objectStore("seen_keys").delete(fingerprint);
      request.onsuccess = () => {
        log.debug(`Keys gone for fingerprint ${fingerprint}.`);
        resolve(fingerprint);
      };
      request.onerror = event => {
        log.debug(
          `Could not delete keys for fingerprint ${fingerprint}: ${transaction.error.message}`
        );
        reject(transaction.error);
      };
    });
  }

  /**
   * Clear out data from the database.
   */
  async reset() {
    return new Promise((resolve, reject) => {
      let transaction = this.db.transaction(["seen_keys"], "readwrite");
      let objectStore = transaction.objectStore("seen_keys");
      transaction.oncomplete = () => {
        log.debug(`Objectstore cleared.`);
        resolve();
      };
      transaction.onerror = () => {
        log.debug(`Could not clear objectstore: ${transaction.error.message}`);
        reject(transaction.error);
      };
      objectStore.clear();
      transaction.commit();
    });
  }

  /**
   * Delete database.
   */
  static async deleteDb() {
    return new Promise((resolve, reject) => {
      let DBOpenRequest = indexedDB.deleteDatabase("seen_keys");
      DBOpenRequest.onsuccess = () => {
        log.debug(`Success deleting database.`);
        resolve();
      };
      DBOpenRequest.onerror = () => {
        log.debug(`Error deleting database: ${DBOpenRequest.error.message}`);
        reject(DBOpenRequest.error);
      };
    });
  }
}
