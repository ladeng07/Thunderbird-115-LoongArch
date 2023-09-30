"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SecretStorage = void 0;
var _secretStorage = require("../secret-storage");
var _SecretSharing = require("./SecretSharing");
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                          Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.
                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                          Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                          you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                          You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                              http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                          Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                          distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                          WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                          See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                          limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                          */
/* re-exports for backwards compatibility */

/**
 * Implements Secure Secret Storage and Sharing (MSC1946)
 *
 * @deprecated This is just a backwards-compatibility hack which will be removed soon.
 *    Use {@link SecretStorage.ServerSideSecretStorageImpl} from `../secret-storage` and/or {@link SecretSharing} from `./SecretSharing`.
 */
class SecretStorage {
  // In its pure javascript days, this was relying on some proper Javascript-style
  // type-abuse where sometimes we'd pass in a fake client object with just the account
  // data methods implemented, which is all this class needs unless you use the secret
  // sharing code, so it was fine. As a low-touch TypeScript migration, we added
  // an extra, optional param for a real matrix client, so you can not pass it as long
  // as you don't request any secrets.
  //
  // Nowadays, the whole class is scheduled for destruction, once we get rid of the legacy
  // Crypto impl that exposes it.
  constructor(accountDataAdapter, cryptoCallbacks, baseApis) {
    _defineProperty(this, "storageImpl", void 0);
    _defineProperty(this, "sharingImpl", void 0);
    this.storageImpl = new _secretStorage.ServerSideSecretStorageImpl(accountDataAdapter, cryptoCallbacks);
    this.sharingImpl = new _SecretSharing.SecretSharing(baseApis, cryptoCallbacks);
  }
  getDefaultKeyId() {
    return this.storageImpl.getDefaultKeyId();
  }
  setDefaultKeyId(keyId) {
    return this.storageImpl.setDefaultKeyId(keyId);
  }

  /**
   * Add a key for encrypting secrets.
   */
  addKey(algorithm, opts = {}, keyId) {
    return this.storageImpl.addKey(algorithm, opts, keyId);
  }

  /**
   * Get the key information for a given ID.
   */
  getKey(keyId) {
    return this.storageImpl.getKey(keyId);
  }

  /**
   * Check whether we have a key with a given ID.
   */
  hasKey(keyId) {
    return this.storageImpl.hasKey(keyId);
  }

  /**
   * Check whether a key matches what we expect based on the key info
   */
  checkKey(key, info) {
    return this.storageImpl.checkKey(key, info);
  }

  /**
   * Store an encrypted secret on the server
   */
  store(name, secret, keys) {
    return this.storageImpl.store(name, secret, keys);
  }

  /**
   * Get a secret from storage.
   */
  get(name) {
    return this.storageImpl.get(name);
  }

  /**
   * Check if a secret is stored on the server.
   */
  async isStored(name) {
    return this.storageImpl.isStored(name);
  }

  /**
   * Request a secret from another device
   */
  request(name, devices) {
    return this.sharingImpl.request(name, devices);
  }
  onRequestReceived(event) {
    return this.sharingImpl.onRequestReceived(event);
  }
  onSecretReceived(event) {
    this.sharingImpl.onSecretReceived(event);
  }
}
exports.SecretStorage = SecretStorage;