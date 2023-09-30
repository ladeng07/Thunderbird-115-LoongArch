/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["RNP", "RnpPrivateKeyUnlockTracker"];

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ctypes: "resource://gre/modules/ctypes.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  EnigmailConstants: "chrome://openpgp/content/modules/constants.jsm",
  EnigmailFuncs: "chrome://openpgp/content/modules/funcs.jsm",
  GPGME: "chrome://openpgp/content/modules/GPGME.jsm",
  OpenPGPMasterpass: "chrome://openpgp/content/modules/masterpass.jsm",
  PgpSqliteDb2: "chrome://openpgp/content/modules/sqliteDb.jsm",
  RNPLibLoader: "chrome://openpgp/content/modules/RNPLib.jsm",
});

var l10n = new Localization(["messenger/openpgp/openpgp.ftl"]);

const str_encrypt = "encrypt";
const str_sign = "sign";
const str_certify = "certify";
const str_authenticate = "authenticate";
const RNP_PHOTO_USERID_ID = "(photo)"; // string is hardcoded inside RNP

var RNPLib;

/**
 * Opens a prompt, asking the user to enter passphrase for given key id.

 * @param {?nsIWindow} win - Parent window, may be null
 * @param {string} promptString - This message will be shown to the user
 * @param {object} resultFlags - Attribute .canceled is set to true
 *   if the user clicked cancel, other it's set to false.
 * @returns {string} - The passphrase the user entered
 */
function passphrasePromptCallback(win, promptString, resultFlags) {
  let password = { value: "" };
  if (!Services.prompt.promptPassword(win, "", promptString, password)) {
    resultFlags.canceled = true;
    return "";
  }

  resultFlags.canceled = false;
  return password.value;
}

/**
 * Helper class to track resources related to a private/secret key,
 * holding the key handle obtained from RNP, and offering services
 * related to that key and its handle, including releasing the handle
 * when done. Tracking a null handle is allowed.
 */
class RnpPrivateKeyUnlockTracker {
  #rnpKeyHandle = null;
  #wasUnlocked = false;
  #allowPromptingUserForPassword = false;
  #allowAutoUnlockWithCachedPasswords = false;
  #passwordCache = null;
  #fingerprint = "";
  #passphraseCallback = null;
  #rememberUnlockPasswordForUnprotect = false;
  #unlockPassword = null;
  #isLocked = true;

  /**
   * Initialize this object as a tracker for the private key identified
   * by the given fingerprint. The fingerprint will be looked up in an
   * RNP space (FFI) and the resulting handle will be tracked. The
   * default FFI is used for performing the lookup, unless a specific
   * FFI is given. If no key can be found, the object is initialized
   * with a null handle. If a handle was found, the handle and any
   * additional resources can be freed by calling the object's release()
   * method.
   *
   * @param {string} fingerprint - the fingerprint of a key to look up.
   * @param {rnp_ffi_t} ffi - An optional specific FFI.
   * @returns {RnpPrivateKeyUnlockTracker} - a new instance, which was
   *   either initialized with a found key handle, or with null-
   */
  static constructFromFingerprint(fingerprint, ffi = RNPLib.ffi) {
    if (fingerprint.startsWith("0x")) {
      throw new Error("fingerprint must not start with 0x");
    }

    let handle = RNP.getKeyHandleByKeyIdOrFingerprint(ffi, `0x${fingerprint}`);

    return new RnpPrivateKeyUnlockTracker(handle);
  }

  /**
   * Construct this object as a tracker for the private key referenced
   * by the given handle. The object may also be initialized
   * with null, if no key was found. A valid handle and any additional
   * resources can be freed by calling the object's release() method.
   *
   * @param {?rnp_key_handle_t} handle - the handle of a RNP key, or null
   */
  constructor(handle) {
    if (this.#rnpKeyHandle) {
      throw new Error("Instance already initialized");
    }
    if (!handle) {
      return;
    }
    this.#rnpKeyHandle = handle;

    if (!this.available()) {
      // Not a private key. We tolerate this use to enable automatic
      // handle releasing, for code that sometimes needs to track a
      // secret key, and sometimes only a public key.
      // The only functionality that is allowed on such a key is to
      // call the .available() and the .release() methods.
      this.#isLocked = false;
    } else {
      let is_locked = new lazy.ctypes.bool();
      if (RNPLib.rnp_key_is_locked(this.#rnpKeyHandle, is_locked.address())) {
        throw new Error("rnp_key_is_locked failed");
      }
      this.#isLocked = is_locked.value;
    }

    if (!this.#fingerprint) {
      let fingerprint = new lazy.ctypes.char.ptr();
      if (
        RNPLib.rnp_key_get_fprint(this.#rnpKeyHandle, fingerprint.address())
      ) {
        throw new Error("rnp_key_get_fprint failed");
      }
      this.#fingerprint = fingerprint.readString();
      RNPLib.rnp_buffer_destroy(fingerprint);
    }
  }

  /**
   * @param {Function} cb - Override the callback function that this
   *   object will call to obtain the passphrase to unlock the private
   *   key for tracked key handle, if the object needs to unlock
   *   the key and prompting the user is allowed.
   *   If no alternative callback is set, the global
   *   passphrasePromptCallback function will be used.
   */
  setPassphraseCallback(cb) {
    this.#passphraseCallback = cb;
  }

  /**
   * Allow or forbid prompting the user for a passphrase.
   *
   * @param {boolean} isAllowed - True if allowed, false if forbidden
   */
  setAllowPromptingUserForPassword(isAllowed) {
    this.#allowPromptingUserForPassword = isAllowed;
  }

  /**
   * Allow or forbid automatically using passphrases from a configured
   * cache of passphrase, if it's necessary to obtain a passphrase
   * for unlocking.
   *
   * @param {boolean} isAllowed - True if allowed, false if forbidden
   */
  setAllowAutoUnlockWithCachedPasswords(isAllowed) {
    this.#allowAutoUnlockWithCachedPasswords = isAllowed;
  }

  /**
   * Allow or forbid this object to remember the passphrase that was
   * successfully used to to unlock it. This is necessary when intending
   * to subsequently call the unprotect() function to remove the key's
   * passphrase protection. Care should be taken that a tracker object
   * with a remembered passphrase is held in memory only for a short
   * amount of time, and should be released as soon as a task has
   * completed.
   *
   * @param {boolean} isAllowed - True if allowed, false if forbidden
   */
  setRememberUnlockPassword(isAllowed) {
    this.#rememberUnlockPasswordForUnprotect = isAllowed;
  }

  /**
   * Registers a reference to shared object that implements an optional
   * password cache. Will be used to look up passwords if
   * #allowAutoUnlockWithCachedPasswords is set to true. Will be used
   * to store additional passwords that are found to unlock a key.
   */
  setPasswordCache(cacheObj) {
    this.#passwordCache = cacheObj;
  }

  /**
   * Completely remove the encryption layer that protects the private
   * key. Requires that setRememberUnlockPassword(true) was already
   * called on this object, prior to unlocking the key, because this
   * code requires that the unlock/unprotect passphrase has been cached
   * in this object already, and that the tracked key has already been
   * unlocked.
   */
  unprotect() {
    if (
      !this.#rnpKeyHandle ||
      !this.#isLocked ||
      !this.#wasUnlocked ||
      !this.#rememberUnlockPasswordForUnprotect
    ) {
      return;
    }

    if (RNPLib.rnp_key_unprotect(this.#rnpKeyHandle, this.#unlockPassword)) {
      throw new Error(`Failed to unprotect private key ${this.#fingerprint}`);
    }
  }

  /**
   * Attempt to unlock the tracked key with the given passphrase,
   * can also be used with the empty string, which will unlock the key
   * if no passphrase is set.
   *
   * @param {string} pass - try to unlock the key using this passphrase
   */
  unlockWithPassword(pass) {
    if (!this.#rnpKeyHandle || !this.#isLocked) {
      return;
    }
    this.#wasUnlocked = false;

    if (!RNPLib.rnp_key_unlock(this.#rnpKeyHandle, pass)) {
      this.#isLocked = false;
      this.#wasUnlocked = true;
      if (this.#rememberUnlockPasswordForUnprotect) {
        this.#unlockPassword = pass;
      }
    }
  }

  /**
   * Attempt to unlock the tracked key, using the allowed unlock
   * mechanisms that have been configured/allowed for this tracker,
   * which must been configured as desired prior to calling this function.
   * Attempts will potentially be made to unlock using the automatic
   * passphrase, or using password available in the password cache,
   * or by prompting the user for a password, repeatedly prompting
   * until the user enters the correct password or cancels.
   * When prompting the user for a passphrase, and the key is a subkey,
   * it might be necessary to lookup the primary key. A RNP FFI handle
   * is necessary for that potential lookup.
   * Unless a ffi parameter is provided, the default ffi is used.
   *
   * @param {rnp_ffi_t} ffi - An optional specific FFI.
   */
  async unlock(ffi = RNPLib.ffi) {
    if (!this.#rnpKeyHandle || !this.#isLocked) {
      return;
    }
    this.#wasUnlocked = false;
    let autoPassword = await lazy.OpenPGPMasterpass.retrieveOpenPGPPassword();

    if (!RNPLib.rnp_key_unlock(this.#rnpKeyHandle, autoPassword)) {
      this.#isLocked = false;
      this.#wasUnlocked = true;
      if (this.#rememberUnlockPasswordForUnprotect) {
        this.#unlockPassword = autoPassword;
      }
      return;
    }

    if (this.#allowAutoUnlockWithCachedPasswords && this.#passwordCache) {
      for (let pw of this.#passwordCache.passwords) {
        if (!RNPLib.rnp_key_unlock(this.#rnpKeyHandle, pw)) {
          this.#isLocked = false;
          this.#wasUnlocked = true;
          if (this.#rememberUnlockPasswordForUnprotect) {
            this.#unlockPassword = pw;
          }
          return;
        }
      }
    }

    if (!this.#allowPromptingUserForPassword) {
      return;
    }

    let promptString = await RNP.getPassphrasePrompt(this.#rnpKeyHandle, ffi);

    while (true) {
      let userFlags = { canceled: false };
      let pass;
      if (this.#passphraseCallback) {
        pass = this.#passphraseCallback(null, promptString, userFlags);
      } else {
        pass = passphrasePromptCallback(null, promptString, userFlags);
      }
      if (userFlags.canceled) {
        return;
      }

      if (!RNPLib.rnp_key_unlock(this.#rnpKeyHandle, pass)) {
        this.#isLocked = false;
        this.#wasUnlocked = true;
        if (this.#rememberUnlockPasswordForUnprotect) {
          this.#unlockPassword = pass;
        }

        if (this.#passwordCache) {
          this.#passwordCache.passwords.push(pass);
        }
        return;
      }
    }
  }

  /**
   * Check that this tracker has a reference to a private key.
   *
   * @returns {boolean} - true if the tracked key is a secret/private
   */
  isSecret() {
    return (
      this.#rnpKeyHandle &&
      RNPLib.getSecretAvailableFromHandle(this.#rnpKeyHandle)
    );
  }

  /**
   * Check that this tracker has a reference to a valid private key.
   * The check will fail e.g. for offline secret keys, where a
   * primary key is marked as being a secret key, but not having
   * the raw key data available. (In that scenario, the raw key data
   * for subkeys is usually available.)
   *
   * @returns {boolean} - true if the tracked key is a secret/private
   *   key with its key material available.
   */
  available() {
    return (
      this.#rnpKeyHandle &&
      RNPLib.getSecretAvailableFromHandle(this.#rnpKeyHandle) &&
      RNPLib.isSecretKeyMaterialAvailable(this.#rnpKeyHandle)
    );
  }

  /**
   * Obtain the raw RNP key handle managed by this tracker.
   * The returned handle may be temporarily used by the caller,
   * but the caller must not destroy the handle. The returned handle
   * will become invalid as soon as the release() function is called
   * on this tracker object.
   *
   * @returns {rnp_key_handle_t} - the handle of the tracked private key
   *   or null, if no key is tracked by this tracker.
   */
  getHandle() {
    return this.#rnpKeyHandle;
  }

  /**
   * @returns {string} - key fingerprint of the tracked key, or the
   *   empty string.
   */
  getFingerprint() {
    return this.#fingerprint;
  }

  /**
   * @returns {boolean} - true if the tracked key is currently unlocked.
   */
  isUnlocked() {
    return !this.#isLocked;
  }

  /**
   * Protect the key with the automatic passphrase mechanism, that is,
   * using the classic mechanism that uses an automatically generated
   * passphrase, which is either unprotected, or protected by the
   * primary password.
   * Requires that the key is unlocked already.
   */
  async setAutoPassphrase() {
    if (!this.#rnpKeyHandle) {
      return;
    }

    let autoPassword = await lazy.OpenPGPMasterpass.retrieveOpenPGPPassword();
    if (
      RNPLib.rnp_key_protect(
        this.#rnpKeyHandle,
        autoPassword,
        null,
        null,
        null,
        0
      )
    ) {
      throw new Error(`rnp_key_protect failed for ${this.#fingerprint}`);
    }
  }

  /**
   * Protect the key with the given passphrase.
   * Requires that the key is unlocked already.
   *
   * @param {string} pass - protect the key with this passphrase
   */
  setPassphrase(pass) {
    if (!this.#rnpKeyHandle) {
      return;
    }

    if (RNPLib.rnp_key_protect(this.#rnpKeyHandle, pass, null, null, null, 0)) {
      throw new Error(`rnp_key_protect failed for ${this.#fingerprint}`);
    }
  }

  /**
   * Release all data managed by this tracker, if necessary locking the
   * tracked private key, forgetting the remembered unlock password,
   * and destroying the handle.
   * Note that data passed on to a password cache isn't released.
   */
  release() {
    if (!this.#rnpKeyHandle) {
      return;
    }

    this.#unlockPassword = null;
    if (!this.#isLocked && this.#wasUnlocked) {
      RNPLib.rnp_key_lock(this.#rnpKeyHandle);
      this.#isLocked = true;
    }

    RNPLib.rnp_key_handle_destroy(this.#rnpKeyHandle);
    this.#rnpKeyHandle = null;
  }
}

var RNP = {
  hasRan: false,
  libLoaded: false,
  async once() {
    this.hasRan = true;
    try {
      RNPLib = lazy.RNPLibLoader.init();
      if (!RNPLib || !RNPLib.loaded) {
        return;
      }
      if (await RNPLib.init()) {
        //this.initUiOps();
        RNP.libLoaded = true;
      }
      await lazy.OpenPGPMasterpass.ensurePasswordIsCached();
    } catch (e) {
      console.log(e);
    }
  },

  getRNPLibStatus() {
    return RNPLib.getRNPLibStatus();
  },

  async init(opts) {
    opts = opts || {};

    if (!this.hasRan) {
      await this.once();
    }

    return RNP.libLoaded;
  },

  isAllowedPublicKeyAlgo(algo) {
    // see rnp/src/lib/rnp.cpp pubkey_alg_map
    switch (algo) {
      case "SM2":
        return false;

      default:
        return true;
    }
  },

  /**
   * returns {integer} - the raw value of the key's creation date
   */
  getKeyCreatedValueFromHandle(handle) {
    let key_creation = new lazy.ctypes.uint32_t();
    if (RNPLib.rnp_key_get_creation(handle, key_creation.address())) {
      throw new Error("rnp_key_get_creation failed");
    }
    return key_creation.value;
  },

  addKeyAttributes(handle, meta, keyObj, is_subkey, forListing) {
    let algo = new lazy.ctypes.char.ptr();
    let bits = new lazy.ctypes.uint32_t();
    let key_expiration = new lazy.ctypes.uint32_t();
    let allowed = new lazy.ctypes.bool();

    keyObj.secretAvailable = this.getSecretAvailableFromHandle(handle);

    if (keyObj.secretAvailable) {
      keyObj.secretMaterial = RNPLib.isSecretKeyMaterialAvailable(handle);
    } else {
      keyObj.secretMaterial = false;
    }

    if (is_subkey) {
      keyObj.type = "sub";
    } else {
      keyObj.type = "pub";
    }

    keyObj.keyId = this.getKeyIDFromHandle(handle);
    if (forListing) {
      keyObj.id = keyObj.keyId;
    }

    keyObj.fpr = this.getFingerprintFromHandle(handle);

    if (RNPLib.rnp_key_get_alg(handle, algo.address())) {
      throw new Error("rnp_key_get_alg failed");
    }
    keyObj.algoSym = algo.readString();
    RNPLib.rnp_buffer_destroy(algo);

    if (RNPLib.rnp_key_get_bits(handle, bits.address())) {
      throw new Error("rnp_key_get_bits failed");
    }
    keyObj.keySize = bits.value;

    keyObj.keyCreated = this.getKeyCreatedValueFromHandle(handle);
    keyObj.created = new Services.intl.DateTimeFormat().format(
      new Date(keyObj.keyCreated * 1000)
    );

    if (RNPLib.rnp_key_get_expiration(handle, key_expiration.address())) {
      throw new Error("rnp_key_get_expiration failed");
    }
    if (key_expiration.value > 0) {
      keyObj.expiryTime = keyObj.keyCreated + key_expiration.value;
    } else {
      keyObj.expiryTime = 0;
    }
    keyObj.expiry = keyObj.expiryTime
      ? new Services.intl.DateTimeFormat().format(
          new Date(keyObj.expiryTime * 1000)
        )
      : "";
    keyObj.keyUseFor = "";

    if (!this.isAllowedPublicKeyAlgo(keyObj.algoSym)) {
      return;
    }

    let key_revoked = new lazy.ctypes.bool();
    if (RNPLib.rnp_key_is_revoked(handle, key_revoked.address())) {
      throw new Error("rnp_key_is_revoked failed");
    }

    if (key_revoked.value) {
      keyObj.keyTrust = "r";
      if (forListing) {
        keyObj.revoke = true;
      }
    } else if (this.isExpiredTime(keyObj.expiryTime)) {
      keyObj.keyTrust = "e";
    } else if (keyObj.secretAvailable) {
      keyObj.keyTrust = "u";
    } else {
      keyObj.keyTrust = "o";
    }

    if (RNPLib.rnp_key_allows_usage(handle, str_encrypt, allowed.address())) {
      throw new Error("rnp_key_allows_usage failed");
    }
    if (allowed.value) {
      keyObj.keyUseFor += "e";
      meta.e = true;
    }
    if (RNPLib.rnp_key_allows_usage(handle, str_sign, allowed.address())) {
      throw new Error("rnp_key_allows_usage failed");
    }
    if (allowed.value) {
      keyObj.keyUseFor += "s";
      meta.s = true;
    }
    if (RNPLib.rnp_key_allows_usage(handle, str_certify, allowed.address())) {
      throw new Error("rnp_key_allows_usage failed");
    }
    if (allowed.value) {
      keyObj.keyUseFor += "c";
      meta.c = true;
    }
    if (
      RNPLib.rnp_key_allows_usage(handle, str_authenticate, allowed.address())
    ) {
      throw new Error("rnp_key_allows_usage failed");
    }
    if (allowed.value) {
      keyObj.keyUseFor += "a";
      meta.a = true;
    }
  },

  async getKeys(onlyKeys = null) {
    return this.getKeysFromFFI(RNPLib.ffi, false, onlyKeys, false);
  },

  async getSecretKeys(onlyKeys = null) {
    return this.getKeysFromFFI(RNPLib.ffi, false, onlyKeys, true);
  },

  getProtectedKeysCount() {
    return RNPLib.getProtectedKeysCount();
  },

  async protectUnprotectedKeys() {
    return RNPLib.protectUnprotectedKeys();
  },

  /**
   * This function inspects the keys contained in the RNP space "ffi",
   * and returns objects of type KeyObj that describe the keys.
   *
   * Some consumers want a different listing of keys, and expect
   * slightly different attribute names.
   * If forListing is true, we'll set those additional attributes.
   * If onlyKeys is given: only returns keys in that array.
   *
   * @param {rnp_ffi_t} ffi - RNP library handle to key storage area
   * @param {boolean} forListing - Request additional attributes
   *   in the returned objects, for backwards compatibility.
   * @param {string[]} onlyKeys - An array of key IDs or fingerprints.
   *   If non-null, only the given elements will be returned.
   *   If null, all elements are returned.
   * @param {boolean} onlySecret - If true, only information for
   *   available secret keys is returned.
   * @param {boolean} withPubKey - If true, an additional attribute
   *   "pubKey" will be added to each returned KeyObj, which will
   *   contain an ascii armor copy of the public key.
   * @returns {KeyObj[]} - An array of KeyObj objects that describe the
   *                       available keys.
   */
  async getKeysFromFFI(
    ffi,
    forListing,
    onlyKeys = null,
    onlySecret = false,
    withPubKey = false
  ) {
    if (!!onlyKeys && onlySecret) {
      throw new Error(
        "filtering by both white list and only secret keys isn't supported"
      );
    }

    let keys = [];

    if (onlyKeys) {
      for (let ki = 0; ki < onlyKeys.length; ki++) {
        let handle = await this.getKeyHandleByIdentifier(ffi, onlyKeys[ki]);
        if (!handle || handle.isNull()) {
          continue;
        }

        let keyObj = {};
        try {
          // Skip if it is a sub key, it will be processed together with primary key later.
          let ok = this.getKeyInfoFromHandle(
            ffi,
            handle,
            keyObj,
            false,
            forListing,
            false
          );
          if (!ok) {
            continue;
          }
        } catch (ex) {
          console.log(ex);
        } finally {
          RNPLib.rnp_key_handle_destroy(handle);
        }

        if (keyObj) {
          if (withPubKey) {
            let pubKey = await this.getPublicKey("0x" + keyObj.id, ffi);
            if (pubKey) {
              keyObj.pubKey = pubKey;
            }
          }
          keys.push(keyObj);
        }
      }
    } else {
      let rv;

      let iter = new RNPLib.rnp_identifier_iterator_t();
      let grip = new lazy.ctypes.char.ptr();

      rv = RNPLib.rnp_identifier_iterator_create(ffi, iter.address(), "grip");
      if (rv) {
        return null;
      }

      while (!RNPLib.rnp_identifier_iterator_next(iter, grip.address())) {
        if (grip.isNull()) {
          break;
        }

        let handle = new RNPLib.rnp_key_handle_t();

        if (RNPLib.rnp_locate_key(ffi, "grip", grip, handle.address())) {
          throw new Error("rnp_locate_key failed");
        }

        let keyObj = {};
        try {
          if (RNP.isBadKey(handle, null, ffi)) {
            continue;
          }

          // Skip if it is a sub key, it will be processed together with primary key later.
          if (
            !this.getKeyInfoFromHandle(
              ffi,
              handle,
              keyObj,
              false,
              forListing,
              onlySecret
            )
          ) {
            continue;
          }
        } catch (ex) {
          console.log(ex);
        } finally {
          RNPLib.rnp_key_handle_destroy(handle);
        }

        if (keyObj) {
          if (withPubKey) {
            let pubKey = await this.getPublicKey("0x" + keyObj.id, ffi);
            if (pubKey) {
              keyObj.pubKey = pubKey;
            }
          }
          keys.push(keyObj);
        }
      }
      RNPLib.rnp_identifier_iterator_destroy(iter);
    }
    return keys;
  },

  getFingerprintFromHandle(handle) {
    let fingerprint = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_key_get_fprint(handle, fingerprint.address())) {
      throw new Error("rnp_key_get_fprint failed");
    }
    let result = fingerprint.readString();
    RNPLib.rnp_buffer_destroy(fingerprint);
    return result;
  },

  getKeyIDFromHandle(handle) {
    let ctypes_key_id = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_key_get_keyid(handle, ctypes_key_id.address())) {
      throw new Error("rnp_key_get_keyid failed");
    }
    let result = ctypes_key_id.readString();
    RNPLib.rnp_buffer_destroy(ctypes_key_id);
    return result;
  },

  getSecretAvailableFromHandle(handle) {
    return RNPLib.getSecretAvailableFromHandle(handle);
  },

  // We already know sub_handle is a subkey
  getPrimaryKeyHandleFromSub(ffi, sub_handle) {
    let newHandle = new RNPLib.rnp_key_handle_t();
    // test my expectation is correct
    if (!newHandle.isNull()) {
      throw new Error("unexpected, new handle isn't null");
    }
    let primary_grip = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_key_get_primary_grip(sub_handle, primary_grip.address())) {
      throw new Error("rnp_key_get_primary_grip failed");
    }
    if (primary_grip.isNull()) {
      return newHandle;
    }
    if (RNPLib.rnp_locate_key(ffi, "grip", primary_grip, newHandle.address())) {
      throw new Error("rnp_locate_key failed");
    }
    return newHandle;
  },

  // We don't know if handle is a subkey. If it's not, return null handle
  getPrimaryKeyHandleIfSub(ffi, handle) {
    let is_subkey = new lazy.ctypes.bool();
    if (RNPLib.rnp_key_is_sub(handle, is_subkey.address())) {
      throw new Error("rnp_key_is_sub failed");
    }
    if (!is_subkey.value) {
      let nullHandle = new RNPLib.rnp_key_handle_t();
      // test my expectation is correct
      if (!nullHandle.isNull()) {
        throw new Error("unexpected, new handle isn't null");
      }
      return nullHandle;
    }
    return this.getPrimaryKeyHandleFromSub(ffi, handle);
  },

  hasKeyWeakSelfSignature(selfId, handle) {
    let sig_count = new lazy.ctypes.size_t();
    if (RNPLib.rnp_key_get_signature_count(handle, sig_count.address())) {
      throw new Error("rnp_key_get_signature_count failed");
    }

    let hasWeak = false;
    for (let i = 0; !hasWeak && i < sig_count.value; i++) {
      let sig_handle = new RNPLib.rnp_signature_handle_t();

      if (RNPLib.rnp_key_get_signature_at(handle, i, sig_handle.address())) {
        throw new Error("rnp_key_get_signature_at failed");
      }

      hasWeak = RNP.isWeakSelfSignature(selfId, sig_handle);
      RNPLib.rnp_signature_handle_destroy(sig_handle);
    }
    return hasWeak;
  },

  isWeakSelfSignature(selfId, sig_handle) {
    let sig_id_str = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_signature_get_keyid(sig_handle, sig_id_str.address())) {
      throw new Error("rnp_signature_get_keyid failed");
    }

    let sigId = sig_id_str.readString();
    RNPLib.rnp_buffer_destroy(sig_id_str);

    // Is it a self-signature?
    if (sigId != selfId) {
      return false;
    }

    let creation = new lazy.ctypes.uint32_t();
    if (RNPLib.rnp_signature_get_creation(sig_handle, creation.address())) {
      throw new Error("rnp_signature_get_creation failed");
    }

    let hash_str = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_signature_get_hash_alg(sig_handle, hash_str.address())) {
      throw new Error("rnp_signature_get_hash_alg failed");
    }

    let creation64 = new lazy.ctypes.uint64_t();
    creation64.value = creation.value;

    let level = new lazy.ctypes.uint32_t();

    if (
      RNPLib.rnp_get_security_rule(
        RNPLib.ffi,
        RNPLib.RNP_FEATURE_HASH_ALG,
        hash_str,
        creation64,
        null,
        null,
        level.address()
      )
    ) {
      throw new Error("rnp_get_security_rule failed");
    }

    RNPLib.rnp_buffer_destroy(hash_str);
    return level.value < RNPLib.RNP_SECURITY_DEFAULT;
  },

  // return false if handle refers to subkey and should be ignored
  getKeyInfoFromHandle(
    ffi,
    handle,
    keyObj,
    usePrimaryIfSubkey,
    forListing,
    onlyIfSecret
  ) {
    keyObj.ownerTrust = null;
    keyObj.userId = null;
    keyObj.userIds = [];
    keyObj.subKeys = [];
    keyObj.photoAvailable = false;
    keyObj.hasIgnoredAttributes = false;

    let is_subkey = new lazy.ctypes.bool();
    let sub_count = new lazy.ctypes.size_t();
    let uid_count = new lazy.ctypes.size_t();

    if (RNPLib.rnp_key_is_sub(handle, is_subkey.address())) {
      throw new Error("rnp_key_is_sub failed");
    }
    if (is_subkey.value) {
      if (!usePrimaryIfSubkey) {
        return false;
      }
      let rv = false;
      let newHandle = this.getPrimaryKeyHandleFromSub(ffi, handle);
      if (!newHandle.isNull()) {
        // recursively call ourselves to get primary key info
        rv = this.getKeyInfoFromHandle(
          ffi,
          newHandle,
          keyObj,
          false,
          forListing,
          onlyIfSecret
        );
        RNPLib.rnp_key_handle_destroy(newHandle);
      }
      return rv;
    }

    if (onlyIfSecret) {
      let have_secret = new lazy.ctypes.bool();
      if (RNPLib.rnp_key_have_secret(handle, have_secret.address())) {
        throw new Error("rnp_key_have_secret failed");
      }
      if (!have_secret.value) {
        return false;
      }
    }

    let meta = {
      a: false,
      s: false,
      c: false,
      e: false,
    };
    this.addKeyAttributes(handle, meta, keyObj, false, forListing);

    let hasAnySecretKey = keyObj.secretAvailable;

    /* The remaining actions are done for primary keys, only. */
    if (!is_subkey.value) {
      if (RNPLib.rnp_key_get_uid_count(handle, uid_count.address())) {
        throw new Error("rnp_key_get_uid_count failed");
      }
      let firstValidUid = null;
      for (let i = 0; i < uid_count.value; i++) {
        let uid_handle = new RNPLib.rnp_uid_handle_t();

        if (RNPLib.rnp_key_get_uid_handle_at(handle, i, uid_handle.address())) {
          throw new Error("rnp_key_get_uid_handle_at failed");
        }

        // Never allow revoked user IDs
        let uidOkToUse = !this.isRevokedUid(uid_handle);
        if (uidOkToUse) {
          // Usually, we don't allow user IDs reported as not valid
          uidOkToUse = !this.isBadUid(uid_handle);

          let { hasGoodSignature, hasWeakSignature } =
            this.getUidSignatureQuality(keyObj.keyId, uid_handle);

          if (hasWeakSignature) {
            keyObj.hasIgnoredAttributes = true;
          }

          if (!uidOkToUse && keyObj.keyTrust == "e") {
            // However, a user might be not valid, because it has
            // expired. If the primary key has expired, we should show
            // some user ID, even if all user IDs have expired,
            // otherwise the user cannot see any text description.
            // We allow showing user IDs with a good self-signature.
            uidOkToUse = hasGoodSignature;
          }
        }

        if (uidOkToUse) {
          let uid_str = new lazy.ctypes.char.ptr();
          if (RNPLib.rnp_key_get_uid_at(handle, i, uid_str.address())) {
            throw new Error("rnp_key_get_uid_at failed");
          }
          let userIdStr = uid_str.readStringReplaceMalformed();
          RNPLib.rnp_buffer_destroy(uid_str);

          if (userIdStr !== RNP_PHOTO_USERID_ID) {
            if (!firstValidUid) {
              firstValidUid = userIdStr;
            }

            if (!keyObj.userId && this.isPrimaryUid(uid_handle)) {
              keyObj.userId = userIdStr;
            }

            let uidObj = {};
            uidObj.userId = userIdStr;
            uidObj.type = "uid";
            uidObj.keyTrust = keyObj.keyTrust;
            uidObj.uidFpr = "??fpr??";

            keyObj.userIds.push(uidObj);
          }
        }

        RNPLib.rnp_uid_handle_destroy(uid_handle);
      }

      if (!keyObj.userId && firstValidUid) {
        // No user ID marked as primary, so let's use the first valid.
        keyObj.userId = firstValidUid;
      }

      if (!keyObj.userId) {
        keyObj.userId = "?";
      }

      if (forListing) {
        keyObj.name = keyObj.userId;
      }

      if (RNPLib.rnp_key_get_subkey_count(handle, sub_count.address())) {
        throw new Error("rnp_key_get_subkey_count failed");
      }
      for (let i = 0; i < sub_count.value; i++) {
        let sub_handle = new RNPLib.rnp_key_handle_t();
        if (RNPLib.rnp_key_get_subkey_at(handle, i, sub_handle.address())) {
          throw new Error("rnp_key_get_subkey_at failed");
        }

        if (RNP.hasKeyWeakSelfSignature(keyObj.keyId, sub_handle)) {
          keyObj.hasIgnoredAttributes = true;
        }

        if (!RNP.isBadKey(sub_handle, handle, null)) {
          let subKeyObj = {};
          this.addKeyAttributes(sub_handle, meta, subKeyObj, true, forListing);
          keyObj.subKeys.push(subKeyObj);
          hasAnySecretKey = hasAnySecretKey || subKeyObj.secretAvailable;
        }

        RNPLib.rnp_key_handle_destroy(sub_handle);
      }

      let haveNonExpiringEncryptionKey = false;
      let haveNonExpiringSigningKey = false;

      let effectiveEncryptionExpiry = keyObj.expiry;
      let effectiveSigningExpiry = keyObj.expiry;
      let effectiveEncryptionExpiryTime = keyObj.expiryTime;
      let effectiveSigningExpiryTime = keyObj.expiryTime;

      if (keyObj.keyUseFor.match(/e/) && !keyObj.expiryTime) {
        haveNonExpiringEncryptionKey = true;
      }

      if (keyObj.keyUseFor.match(/s/) && !keyObj.expiryTime) {
        haveNonExpiringSigningKey = true;
      }

      let mostFutureEncExpiryTime = 0;
      let mostFutureSigExpiryTime = 0;
      let mostFutureEncExpiry = "";
      let mostFutureSigExpiry = "";

      for (let aSub of keyObj.subKeys) {
        if (aSub.keyTrust == "r") {
          continue;
        }

        // Expiring subkeys may shorten the effective expiry,
        // unless the primary key is non-expiring and can be used
        // for a purpose.
        // Subkeys cannot extend the expiry beyond the primary key's.

        // Strategy: If we don't have a non-expiring usable primary key,
        // then find the usable subkey that has the most future
        // expiration date. Stop searching is a non-expiring subkey
        // is found. Then compare with primary key expiry.

        if (!haveNonExpiringEncryptionKey && aSub.keyUseFor.match(/e/)) {
          if (!aSub.expiryTime) {
            haveNonExpiringEncryptionKey = true;
          } else if (!mostFutureEncExpiryTime) {
            mostFutureEncExpiryTime = aSub.expiryTime;
            mostFutureEncExpiry = aSub.expiry;
          } else if (aSub.expiryTime > mostFutureEncExpiryTime) {
            mostFutureEncExpiryTime = aSub.expiryTime;
            mostFutureEncExpiry = aSub.expiry;
          }
        }

        // We only need to calculate the effective signing expiration
        // if it's about a personal key (we require both signing and
        // encryption capability).
        if (
          hasAnySecretKey &&
          !haveNonExpiringSigningKey &&
          aSub.keyUseFor.match(/s/)
        ) {
          if (!aSub.expiryTime) {
            haveNonExpiringSigningKey = true;
          } else if (!mostFutureSigExpiryTime) {
            mostFutureSigExpiryTime = aSub.expiryTime;
            mostFutureSigExpiry = aSub.expiry;
          } else if (aSub.expiryTime > mostFutureEncExpiryTime) {
            mostFutureSigExpiryTime = aSub.expiryTime;
            mostFutureSigExpiry = aSub.expiry;
          }
        }
      }

      if (
        !haveNonExpiringEncryptionKey &&
        mostFutureEncExpiryTime &&
        (!keyObj.expiryTime || mostFutureEncExpiryTime < keyObj.expiryTime)
      ) {
        effectiveEncryptionExpiryTime = mostFutureEncExpiryTime;
        effectiveEncryptionExpiry = mostFutureEncExpiry;
      }

      if (
        !haveNonExpiringSigningKey &&
        mostFutureSigExpiryTime &&
        (!keyObj.expiryTime || mostFutureSigExpiryTime < keyObj.expiryTime)
      ) {
        effectiveSigningExpiryTime = mostFutureSigExpiryTime;
        effectiveSigningExpiry = mostFutureSigExpiry;
      }

      if (!hasAnySecretKey) {
        keyObj.effectiveExpiryTime = effectiveEncryptionExpiryTime;
        keyObj.effectiveExpiry = effectiveEncryptionExpiry;
      } else {
        let effectiveSignOrEncExpiry = "";
        let effectiveSignOrEncExpiryTime = 0;

        if (!effectiveEncryptionExpiryTime) {
          if (effectiveSigningExpiryTime) {
            effectiveSignOrEncExpiryTime = effectiveSigningExpiryTime;
            effectiveSignOrEncExpiry = effectiveSigningExpiry;
          }
        } else if (!effectiveSigningExpiryTime) {
          effectiveSignOrEncExpiryTime = effectiveEncryptionExpiryTime;
          effectiveSignOrEncExpiry = effectiveEncryptionExpiry;
        } else if (effectiveSigningExpiryTime < effectiveEncryptionExpiryTime) {
          effectiveSignOrEncExpiryTime = effectiveSigningExpiryTime;
          effectiveSignOrEncExpiry = effectiveSigningExpiry;
        } else {
          effectiveSignOrEncExpiryTime = effectiveEncryptionExpiryTime;
          effectiveSignOrEncExpiry = effectiveEncryptionExpiry;
        }

        keyObj.effectiveExpiryTime = effectiveSignOrEncExpiryTime;
        keyObj.effectiveExpiry = effectiveSignOrEncExpiry;
      }

      if (meta.s) {
        keyObj.keyUseFor += "S";
      }
      if (meta.a) {
        keyObj.keyUseFor += "A";
      }
      if (meta.c) {
        keyObj.keyUseFor += "C";
      }
      if (meta.e) {
        keyObj.keyUseFor += "E";
      }

      if (RNP.hasKeyWeakSelfSignature(keyObj.keyId, handle)) {
        keyObj.hasIgnoredAttributes = true;
      }
    }

    return true;
  },

  /*
  // We don't need these functions currently, but it's helpful
  // information that I'd like to keep around as documentation.

  isUInt64WithinBounds(val) {
    // JS integers are limited to 53 bits precision.
    // Numbers smaller than 2^53 -1 are safe to use.
    // (For comparison, that's 8192 TB or 8388608 GB).
    const num53BitsMinus1 = ctypes.UInt64("0x1fffffffffffff");
    return ctypes.UInt64.compare(val, num53BitsMinus1) < 0;
  },

  isUInt64Max(val) {
    // 2^64-1, 18446744073709551615
    const max = ctypes.UInt64("0xffffffffffffffff");
    return ctypes.UInt64.compare(val, max) == 0;
  },
  */

  isBadKey(handle, knownPrimaryKey, knownContextFFI) {
    let validTill64 = new lazy.ctypes.uint64_t();
    if (RNPLib.rnp_key_valid_till64(handle, validTill64.address())) {
      throw new Error("rnp_key_valid_till64 failed");
    }

    // For the purpose of this function, we define bad as: there isn't
    // any valid self-signature on the key, and thus the key should
    // be completely avoided.
    // In this scenario, zero is returned. In other words,
    // if a non-zero value is returned, we know the key isn't completely
    // bad according to our definition.

    // ctypes.uint64_t().value is of type ctypes.UInt64

    if (
      lazy.ctypes.UInt64.compare(validTill64.value, lazy.ctypes.UInt64("0")) > 0
    ) {
      return false;
    }

    // If zero was returned, it could potentially have been revoked.
    // If it was revoked, we don't treat is as generally bad,
    // to allow importing it and to consume the revocation information.
    // If the key was not revoked, then treat it as a bad key.
    let key_revoked = new lazy.ctypes.bool();
    if (RNPLib.rnp_key_is_revoked(handle, key_revoked.address())) {
      throw new Error("rnp_key_is_revoked failed");
    }

    if (!key_revoked.value) {
      // Also check if the primary key was revoked. If the primary key
      // is revoked, the subkey is considered revoked, too.
      if (knownPrimaryKey) {
        if (RNPLib.rnp_key_is_revoked(knownPrimaryKey, key_revoked.address())) {
          throw new Error("rnp_key_is_revoked failed");
        }
      } else if (knownContextFFI) {
        let primaryHandle = this.getPrimaryKeyHandleIfSub(
          knownContextFFI,
          handle
        );
        if (!primaryHandle.isNull()) {
          if (RNPLib.rnp_key_is_revoked(primaryHandle, key_revoked.address())) {
            throw new Error("rnp_key_is_revoked failed");
          }
          RNPLib.rnp_key_handle_destroy(primaryHandle);
        }
      }
    }

    return !key_revoked.value;
  },

  isPrimaryUid(uid_handle) {
    let is_primary = new lazy.ctypes.bool();

    if (RNPLib.rnp_uid_is_primary(uid_handle, is_primary.address())) {
      throw new Error("rnp_uid_is_primary failed");
    }

    return is_primary.value;
  },

  getUidSignatureQuality(self_key_id, uid_handle) {
    let result = {
      hasGoodSignature: false,
      hasWeakSignature: false,
    };

    let sig_count = new lazy.ctypes.size_t();
    if (RNPLib.rnp_uid_get_signature_count(uid_handle, sig_count.address())) {
      throw new Error("rnp_uid_get_signature_count failed");
    }

    for (let i = 0; i < sig_count.value; i++) {
      let sig_handle = new RNPLib.rnp_signature_handle_t();

      if (
        RNPLib.rnp_uid_get_signature_at(uid_handle, i, sig_handle.address())
      ) {
        throw new Error("rnp_uid_get_signature_at failed");
      }

      let sig_id_str = new lazy.ctypes.char.ptr();
      if (RNPLib.rnp_signature_get_keyid(sig_handle, sig_id_str.address())) {
        throw new Error("rnp_signature_get_keyid failed");
      }

      if (sig_id_str.readString() == self_key_id) {
        if (!result.hasGoodSignature) {
          let sig_validity = RNPLib.rnp_signature_is_valid(sig_handle, 0);
          result.hasGoodSignature =
            sig_validity == RNPLib.RNP_SUCCESS ||
            sig_validity == RNPLib.RNP_ERROR_SIGNATURE_EXPIRED;
        }

        if (!result.hasWeakSignature) {
          result.hasWeakSignature = RNP.isWeakSelfSignature(
            self_key_id,
            sig_handle
          );
        }
      }

      RNPLib.rnp_buffer_destroy(sig_id_str);
      RNPLib.rnp_signature_handle_destroy(sig_handle);
    }

    return result;
  },

  isBadUid(uid_handle) {
    let is_valid = new lazy.ctypes.bool();

    if (RNPLib.rnp_uid_is_valid(uid_handle, is_valid.address())) {
      throw new Error("rnp_uid_is_valid failed");
    }

    return !is_valid.value;
  },

  isRevokedUid(uid_handle) {
    let is_revoked = new lazy.ctypes.bool();

    if (RNPLib.rnp_uid_is_revoked(uid_handle, is_revoked.address())) {
      throw new Error("rnp_uid_is_revoked failed");
    }

    return is_revoked.value;
  },

  getKeySignatures(keyId, ignoreUnknownUid) {
    let handle = this.getKeyHandleByKeyIdOrFingerprint(
      RNPLib.ffi,
      "0x" + keyId
    );
    if (handle.isNull()) {
      return null;
    }

    let mainKeyObj = {};
    this.getKeyInfoFromHandle(
      RNPLib.ffi,
      handle,
      mainKeyObj,
      false,
      true,
      false
    );

    let result = RNP._getSignatures(mainKeyObj, handle, ignoreUnknownUid);
    RNPLib.rnp_key_handle_destroy(handle);
    return result;
  },

  getKeyObjSignatures(keyObj, ignoreUnknownUid) {
    let handle = this.getKeyHandleByKeyIdOrFingerprint(
      RNPLib.ffi,
      "0x" + keyObj.keyId
    );
    if (handle.isNull()) {
      return null;
    }

    let result = RNP._getSignatures(keyObj, handle, ignoreUnknownUid);
    RNPLib.rnp_key_handle_destroy(handle);
    return result;
  },

  _getSignatures(keyObj, handle, ignoreUnknownUid) {
    let rList = [];

    try {
      let uid_count = new lazy.ctypes.size_t();
      if (RNPLib.rnp_key_get_uid_count(handle, uid_count.address())) {
        throw new Error("rnp_key_get_uid_count failed");
      }
      let outputIndex = 0;
      for (let i = 0; i < uid_count.value; i++) {
        let uid_handle = new RNPLib.rnp_uid_handle_t();

        if (RNPLib.rnp_key_get_uid_handle_at(handle, i, uid_handle.address())) {
          throw new Error("rnp_key_get_uid_handle_at failed");
        }

        if (!this.isBadUid(uid_handle) && !this.isRevokedUid(uid_handle)) {
          let uid_str = new lazy.ctypes.char.ptr();
          if (RNPLib.rnp_key_get_uid_at(handle, i, uid_str.address())) {
            throw new Error("rnp_key_get_uid_at failed");
          }
          let userIdStr = uid_str.readStringReplaceMalformed();
          RNPLib.rnp_buffer_destroy(uid_str);

          if (userIdStr !== RNP_PHOTO_USERID_ID) {
            let id = outputIndex;
            ++outputIndex;

            let subList = {};

            subList = {};
            subList.keyCreated = keyObj.keyCreated;
            subList.created = keyObj.created;
            subList.fpr = keyObj.fpr;
            subList.keyId = keyObj.keyId;

            subList.userId = userIdStr;
            subList.sigList = [];

            let sig_count = new lazy.ctypes.size_t();
            if (
              RNPLib.rnp_uid_get_signature_count(
                uid_handle,
                sig_count.address()
              )
            ) {
              throw new Error("rnp_uid_get_signature_count failed");
            }
            for (let j = 0; j < sig_count.value; j++) {
              let sigObj = {};

              let sig_handle = new RNPLib.rnp_signature_handle_t();
              if (
                RNPLib.rnp_uid_get_signature_at(
                  uid_handle,
                  j,
                  sig_handle.address()
                )
              ) {
                throw new Error("rnp_uid_get_signature_at failed");
              }

              let creation = new lazy.ctypes.uint32_t();
              if (
                RNPLib.rnp_signature_get_creation(
                  sig_handle,
                  creation.address()
                )
              ) {
                throw new Error("rnp_signature_get_creation failed");
              }
              sigObj.keyCreated = creation.value;
              sigObj.created = new Services.intl.DateTimeFormat().format(
                new Date(sigObj.keyCreated * 1000)
              );
              sigObj.sigType = "?";

              let sig_id_str = new lazy.ctypes.char.ptr();
              if (
                RNPLib.rnp_signature_get_keyid(sig_handle, sig_id_str.address())
              ) {
                throw new Error("rnp_signature_get_keyid failed");
              }

              let sigIdStr = sig_id_str.readString();
              sigObj.signerKeyId = sigIdStr;
              RNPLib.rnp_buffer_destroy(sig_id_str);

              let signerHandle = new RNPLib.rnp_key_handle_t();

              if (
                RNPLib.rnp_signature_get_signer(
                  sig_handle,
                  signerHandle.address()
                )
              ) {
                throw new Error("rnp_signature_get_signer failed");
              }

              if (
                signerHandle.isNull() ||
                this.isBadKey(signerHandle, null, RNPLib.ffi)
              ) {
                if (!ignoreUnknownUid) {
                  sigObj.userId = "?";
                  sigObj.sigKnown = false;
                  subList.sigList.push(sigObj);
                }
              } else {
                let signer_uid_str = new lazy.ctypes.char.ptr();
                if (
                  RNPLib.rnp_key_get_primary_uid(
                    signerHandle,
                    signer_uid_str.address()
                  )
                ) {
                  throw new Error("rnp_key_get_primary_uid failed");
                }
                sigObj.userId = signer_uid_str.readStringReplaceMalformed();
                RNPLib.rnp_buffer_destroy(signer_uid_str);
                sigObj.sigKnown = true;
                subList.sigList.push(sigObj);
                RNPLib.rnp_key_handle_destroy(signerHandle);
              }
              RNPLib.rnp_signature_handle_destroy(sig_handle);
            }
            rList[id] = subList;
          }
        }

        RNPLib.rnp_uid_handle_destroy(uid_handle);
      }
    } catch (ex) {
      console.log(ex);
    }
    return rList;
  },

  policyForbidsAlg(alg) {
    // TODO: implement policy
    // Currently, all algorithms are allowed
    return false;
  },

  getKeyIdsFromRecipHandle(recip_handle, resultRecipAndPrimary) {
    resultRecipAndPrimary.keyId = "";
    resultRecipAndPrimary.primaryKeyId = "";

    let c_key_id = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_recipient_get_keyid(recip_handle, c_key_id.address())) {
      throw new Error("rnp_recipient_get_keyid failed");
    }
    let recip_key_id = c_key_id.readString();
    resultRecipAndPrimary.keyId = recip_key_id;
    RNPLib.rnp_buffer_destroy(c_key_id);

    let recip_key_handle = this.getKeyHandleByKeyIdOrFingerprint(
      RNPLib.ffi,
      "0x" + recip_key_id
    );
    if (!recip_key_handle.isNull()) {
      let primary_signer_handle = this.getPrimaryKeyHandleIfSub(
        RNPLib.ffi,
        recip_key_handle
      );
      if (!primary_signer_handle.isNull()) {
        resultRecipAndPrimary.primaryKeyId = this.getKeyIDFromHandle(
          primary_signer_handle
        );
        RNPLib.rnp_key_handle_destroy(primary_signer_handle);
      }
      RNPLib.rnp_key_handle_destroy(recip_key_handle);
    }
  },

  getCharCodeArray(pgpData) {
    return pgpData.split("").map(e => e.charCodeAt());
  },

  is8Bit(charCodeArray) {
    for (let i = 0; i < charCodeArray.length; i++) {
      if (charCodeArray[i] > 255) {
        return false;
      }
    }
    return true;
  },

  removeCommentLines(str) {
    const commentLine = /^Comment:.*(\r?\n|\r)/gm;
    return str.replace(commentLine, "");
  },

  /**
   * This function analyzes an encrypted message. It will check if one
   * of the available secret keys can be used to decrypt a message,
   * without actually performing the decryption.
   * This is done by performing a decryption attempt in an empty
   * environment, which doesn't have any keys available. The decryption
   * attempt allows us to use the RNP APIs that list the key IDs of
   * keys that would be able to decrypt the object.
   * If a matching available secret ID is found, then the handle to that
   * available secret key is returned.
   *
   * @param {rnp_input_t} - A prepared RNP input object that contains
   *   the encrypted message that should be analyzed.
   * @returns {rnp_key_handle_t} - the handle of a private key that can
   *   be used to decrypt the message, or null, if no usable key was
   *   found.
   */
  getFirstAvailableDecryptionKeyHandle(encrypted_rnp_input_from_memory) {
    let resultKey = null;

    let dummyFfi = RNPLib.prepare_ffi();
    if (!dummyFfi) {
      return null;
    }

    const dummy_max_output_size = 1;
    let dummy_output_to_memory = new RNPLib.rnp_output_t();
    RNPLib.rnp_output_to_memory(
      dummy_output_to_memory.address(),
      dummy_max_output_size
    );

    let dummy_verify_op = new RNPLib.rnp_op_verify_t();
    RNPLib.rnp_op_verify_create(
      dummy_verify_op.address(),
      dummyFfi,
      encrypted_rnp_input_from_memory,
      dummy_output_to_memory
    );

    // It's expected and ok that this function returns an error,
    // e.r. RNP_ERROR_NO_SUITABLE_KEY, we'll query detailed results.
    RNPLib.rnp_op_verify_execute(dummy_verify_op);

    let all_recip_count = new lazy.ctypes.size_t();
    if (
      RNPLib.rnp_op_verify_get_recipient_count(
        dummy_verify_op,
        all_recip_count.address()
      )
    ) {
      throw new Error("rnp_op_verify_get_recipient_count failed");
    }

    // Loop is skipped if all_recip_count is zero.
    for (
      let recip_i = 0;
      recip_i < all_recip_count.value && !resultKey;
      recip_i++
    ) {
      let recip_handle = new RNPLib.rnp_recipient_handle_t();
      if (
        RNPLib.rnp_op_verify_get_recipient_at(
          dummy_verify_op,
          recip_i,
          recip_handle.address()
        )
      ) {
        throw new Error("rnp_op_verify_get_recipient_at failed");
      }

      let c_key_id = new lazy.ctypes.char.ptr();
      if (RNPLib.rnp_recipient_get_keyid(recip_handle, c_key_id.address())) {
        throw new Error("rnp_recipient_get_keyid failed");
      }
      let recip_key_id = c_key_id.readString();
      RNPLib.rnp_buffer_destroy(c_key_id);

      let recip_key_handle = this.getKeyHandleByKeyIdOrFingerprint(
        RNPLib.ffi,
        "0x" + recip_key_id
      );
      if (!recip_key_handle.isNull()) {
        if (
          RNPLib.getSecretAvailableFromHandle(recip_key_handle) &&
          RNPLib.isSecretKeyMaterialAvailable(recip_key_handle)
        ) {
          resultKey = recip_key_handle;
        } else {
          RNPLib.rnp_key_handle_destroy(recip_key_handle);
        }
      }
    }

    RNPLib.rnp_output_destroy(dummy_output_to_memory);
    RNPLib.rnp_op_verify_destroy(dummy_verify_op);
    RNPLib.rnp_ffi_destroy(dummyFfi);

    return resultKey;
  },

  async decrypt(encrypted, options, alreadyDecrypted = false) {
    let arr = encrypted.split("").map(e => e.charCodeAt());
    var encrypted_array = lazy.ctypes.uint8_t.array()(arr);

    let result = {};
    result.decryptedData = "";
    result.statusFlags = 0;
    result.extStatusFlags = 0;

    result.userId = "";
    result.keyId = "";
    result.encToDetails = {};
    result.encToDetails.myRecipKey = {};
    result.encToDetails.allRecipKeys = [];
    result.sigDetails = {};
    result.sigDetails.sigDate = null;

    if (alreadyDecrypted) {
      result.encToDetails = options.encToDetails;
    }

    // We cannot reuse the same rnp_input_t for both the dummy operation
    // and the real decryption operation, as the rnp_input_t object
    // apparently becomes unusable after operating on it.
    // That's why we produce a separate rnp_input_t based on the same
    // data for the dummy operation.
    let dummy_input_from_memory = new RNPLib.rnp_input_t();
    RNPLib.rnp_input_from_memory(
      dummy_input_from_memory.address(),
      encrypted_array,
      encrypted_array.length,
      false
    );

    let rnpCannotDecrypt = true;

    let decryptKey = new RnpPrivateKeyUnlockTracker(
      this.getFirstAvailableDecryptionKeyHandle(dummy_input_from_memory)
    );

    decryptKey.setAllowPromptingUserForPassword(true);
    decryptKey.setAllowAutoUnlockWithCachedPasswords(true);

    if (decryptKey.available()) {
      // If the key cannot be automatically unlocked, we'll rely on
      // the password prompt callback from RNP, and on the user to unlock.
      await decryptKey.unlock();
    }

    // Even if we don't have a matching decryption key, run
    // through full processing, to obtain all the various status flags,
    // and because decryption might not be necessary.
    try {
      let input_from_memory = new RNPLib.rnp_input_t();
      RNPLib.rnp_input_from_memory(
        input_from_memory.address(),
        encrypted_array,
        encrypted_array.length,
        false
      );

      // Allow compressed encrypted messages, max factor 1200, up to 100 MiB.
      const max_decrypted_message_size = 100 * 1024 * 1024;
      let max_out = Math.min(
        encrypted.length * 1200,
        max_decrypted_message_size
      );

      let output_to_memory = new RNPLib.rnp_output_t();
      RNPLib.rnp_output_to_memory(output_to_memory.address(), max_out);

      let verify_op = new RNPLib.rnp_op_verify_t();
      // Apparently the exit code here is ignored (replaced below)
      result.exitCode = RNPLib.rnp_op_verify_create(
        verify_op.address(),
        RNPLib.ffi,
        input_from_memory,
        output_to_memory
      );

      result.exitCode = RNPLib.rnp_op_verify_execute(verify_op);

      rnpCannotDecrypt = false;
      let queryAllEncryptionRecipients = false;
      let stillUndecidedIfSignatureIsBad = false;

      let useDecodedData;
      let processSignature;
      switch (result.exitCode) {
        case RNPLib.RNP_SUCCESS:
          useDecodedData = true;
          processSignature = true;
          break;
        case RNPLib.RNP_ERROR_SIGNATURE_INVALID:
          // Either the signing key is unavailable, or the signature is
          // indeed bad. Must check signature status below.
          stillUndecidedIfSignatureIsBad = true;
          useDecodedData = true;
          processSignature = true;
          break;
        case RNPLib.RNP_ERROR_SIGNATURE_EXPIRED:
          useDecodedData = true;
          processSignature = false;
          result.statusFlags |= lazy.EnigmailConstants.EXPIRED_SIGNATURE;
          break;
        case RNPLib.RNP_ERROR_DECRYPT_FAILED:
          rnpCannotDecrypt = true;
          useDecodedData = false;
          processSignature = false;
          queryAllEncryptionRecipients = true;
          result.statusFlags |= lazy.EnigmailConstants.DECRYPTION_FAILED;
          break;
        case RNPLib.RNP_ERROR_NO_SUITABLE_KEY:
          rnpCannotDecrypt = true;
          useDecodedData = false;
          processSignature = false;
          queryAllEncryptionRecipients = true;
          result.statusFlags |=
            lazy.EnigmailConstants.DECRYPTION_FAILED |
            lazy.EnigmailConstants.NO_SECKEY;
          break;
        default:
          useDecodedData = false;
          processSignature = false;
          console.debug(
            "rnp_op_verify_execute returned unexpected: " + result.exitCode
          );
          break;
      }

      if (useDecodedData && alreadyDecrypted) {
        result.statusFlags |= lazy.EnigmailConstants.DECRYPTION_OKAY;
      } else if (useDecodedData && !alreadyDecrypted) {
        let prot_mode_str = new lazy.ctypes.char.ptr();
        let prot_cipher_str = new lazy.ctypes.char.ptr();
        let prot_is_valid = new lazy.ctypes.bool();

        if (
          RNPLib.rnp_op_verify_get_protection_info(
            verify_op,
            prot_mode_str.address(),
            prot_cipher_str.address(),
            prot_is_valid.address()
          )
        ) {
          throw new Error("rnp_op_verify_get_protection_info failed");
        }
        let mode = prot_mode_str.readString();
        let cipher = prot_cipher_str.readString();
        let validIntegrityProtection = prot_is_valid.value;

        if (mode != "none") {
          if (!validIntegrityProtection) {
            useDecodedData = false;
            result.statusFlags |=
              lazy.EnigmailConstants.MISSING_MDC |
              lazy.EnigmailConstants.DECRYPTION_FAILED;
          } else if (mode == "null" || this.policyForbidsAlg(cipher)) {
            // don't indicate decryption, because a non-protecting or insecure cipher was used
            result.statusFlags |= lazy.EnigmailConstants.UNKNOWN_ALGO;
          } else {
            queryAllEncryptionRecipients = true;

            let recip_handle = new RNPLib.rnp_recipient_handle_t();
            let rv = RNPLib.rnp_op_verify_get_used_recipient(
              verify_op,
              recip_handle.address()
            );
            if (rv) {
              throw new Error("rnp_op_verify_get_used_recipient failed");
            }

            let c_alg = new lazy.ctypes.char.ptr();
            rv = RNPLib.rnp_recipient_get_alg(recip_handle, c_alg.address());
            if (rv) {
              throw new Error("rnp_recipient_get_alg failed");
            }

            if (this.policyForbidsAlg(c_alg.readString())) {
              result.statusFlags |= lazy.EnigmailConstants.UNKNOWN_ALGO;
            } else {
              this.getKeyIdsFromRecipHandle(
                recip_handle,
                result.encToDetails.myRecipKey
              );
              result.statusFlags |= lazy.EnigmailConstants.DECRYPTION_OKAY;
            }
          }
        }
      }

      if (queryAllEncryptionRecipients) {
        let all_recip_count = new lazy.ctypes.size_t();
        if (
          RNPLib.rnp_op_verify_get_recipient_count(
            verify_op,
            all_recip_count.address()
          )
        ) {
          throw new Error("rnp_op_verify_get_recipient_count failed");
        }
        if (all_recip_count.value > 1) {
          for (let recip_i = 0; recip_i < all_recip_count.value; recip_i++) {
            let other_recip_handle = new RNPLib.rnp_recipient_handle_t();
            if (
              RNPLib.rnp_op_verify_get_recipient_at(
                verify_op,
                recip_i,
                other_recip_handle.address()
              )
            ) {
              throw new Error("rnp_op_verify_get_recipient_at failed");
            }
            let encTo = {};
            this.getKeyIdsFromRecipHandle(other_recip_handle, encTo);
            result.encToDetails.allRecipKeys.push(encTo);
          }
        }
      }

      if (useDecodedData) {
        let result_buf = new lazy.ctypes.uint8_t.ptr();
        let result_len = new lazy.ctypes.size_t();
        let rv = RNPLib.rnp_output_memory_get_buf(
          output_to_memory,
          result_buf.address(),
          result_len.address(),
          false
        );

        // result_len is of type UInt64, I don't know of a better way
        // to convert it to an integer.
        let b_len = parseInt(result_len.value.toString());

        if (!rv) {
          // type casting the pointer type to an array type allows us to
          // access the elements by index.
          let uint8_array = lazy.ctypes.cast(
            result_buf,
            lazy.ctypes.uint8_t.array(result_len.value).ptr
          ).contents;

          let str = "";
          for (let i = 0; i < b_len; i++) {
            str += String.fromCharCode(uint8_array[i]);
          }

          result.decryptedData = str;
        }

        if (processSignature) {
          // ignore "no signature" result, that's ok
          await this.getVerifyDetails(
            RNPLib.ffi,
            options.fromAddr,
            options.msgDate,
            verify_op,
            result
          );

          if (
            (result.statusFlags &
              (lazy.EnigmailConstants.GOOD_SIGNATURE |
                lazy.EnigmailConstants.UNCERTAIN_SIGNATURE |
                lazy.EnigmailConstants.EXPIRED_SIGNATURE |
                lazy.EnigmailConstants.BAD_SIGNATURE)) !=
            0
          ) {
            // A decision was already made.
            stillUndecidedIfSignatureIsBad = false;
          }
        }
      }

      if (stillUndecidedIfSignatureIsBad) {
        // We didn't find more details above, so conclude it's bad.
        result.statusFlags |= lazy.EnigmailConstants.BAD_SIGNATURE;
      }

      RNPLib.rnp_input_destroy(input_from_memory);
      RNPLib.rnp_output_destroy(output_to_memory);
      RNPLib.rnp_op_verify_destroy(verify_op);
    } finally {
      decryptKey.release();
      RNPLib.rnp_input_destroy(dummy_input_from_memory);
    }

    if (
      rnpCannotDecrypt &&
      !alreadyDecrypted &&
      Services.prefs.getBoolPref("mail.openpgp.allow_external_gnupg") &&
      lazy.GPGME.allDependenciesLoaded()
    ) {
      // failure processing with RNP, attempt decryption with GPGME
      let r2 = await lazy.GPGME.decrypt(
        encrypted,
        this.enArmorCDataMessage.bind(this)
      );
      if (!r2.exitCode && r2.decryptedData) {
        // TODO: obtain info which key ID was used for decryption
        //       and set result.decryptKey*
        //       It isn't obvious how to do that with GPGME, because
        //       gpgme_op_decrypt_result provides the list of all the
        //       encryption keys, only.

        // The result may still contain wrapping like compression,
        // and optional signature data. Recursively call ourselves
        // to perform the remaining processing.
        options.encToDetails = result.encToDetails;
        return RNP.decrypt(r2.decryptedData, options, true);
      }
    }

    return result;
  },

  async getVerifyDetails(ffi, fromAddr, msgDate, verify_op, result) {
    if (!fromAddr) {
      // We cannot correctly verify without knowing the fromAddr.
      // This scenario is reached when quoting an encrypted MIME part.
      return false;
    }

    let sig_count = new lazy.ctypes.size_t();
    if (
      RNPLib.rnp_op_verify_get_signature_count(verify_op, sig_count.address())
    ) {
      throw new Error("rnp_op_verify_get_signature_count failed");
    }

    // TODO: How should handle (sig_count.value > 1) ?
    if (sig_count.value == 0) {
      // !sig_count.value didn't work, === also doesn't work
      return false;
    }

    let sig = new RNPLib.rnp_op_verify_signature_t();
    if (RNPLib.rnp_op_verify_get_signature_at(verify_op, 0, sig.address())) {
      throw new Error("rnp_op_verify_get_signature_at failed");
    }

    let sig_handle = new RNPLib.rnp_signature_handle_t();
    if (RNPLib.rnp_op_verify_signature_get_handle(sig, sig_handle.address())) {
      throw new Error("rnp_op_verify_signature_get_handle failed");
    }

    let sig_id_str = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_signature_get_keyid(sig_handle, sig_id_str.address())) {
      throw new Error("rnp_signature_get_keyid failed");
    }
    result.keyId = sig_id_str.readString();
    RNPLib.rnp_buffer_destroy(sig_id_str);
    RNPLib.rnp_signature_handle_destroy(sig_handle);

    let sig_status = RNPLib.rnp_op_verify_signature_get_status(sig);
    if (sig_status != RNPLib.RNP_SUCCESS && !result.exitCode) {
      /* Don't allow a good exit code. Keep existing bad code. */
      result.exitCode = -1;
    }

    let query_signer = true;

    switch (sig_status) {
      case RNPLib.RNP_SUCCESS:
        result.statusFlags |= lazy.EnigmailConstants.GOOD_SIGNATURE;
        break;
      case RNPLib.RNP_ERROR_KEY_NOT_FOUND:
        result.statusFlags |=
          lazy.EnigmailConstants.UNCERTAIN_SIGNATURE |
          lazy.EnigmailConstants.NO_PUBKEY;
        query_signer = false;
        break;
      case RNPLib.RNP_ERROR_SIGNATURE_EXPIRED:
        result.statusFlags |= lazy.EnigmailConstants.EXPIRED_SIGNATURE;
        break;
      case RNPLib.RNP_ERROR_SIGNATURE_INVALID:
        result.statusFlags |= lazy.EnigmailConstants.BAD_SIGNATURE;
        break;
      default:
        result.statusFlags |= lazy.EnigmailConstants.BAD_SIGNATURE;
        query_signer = false;
        break;
    }

    if (msgDate && result.statusFlags & lazy.EnigmailConstants.GOOD_SIGNATURE) {
      let created = new lazy.ctypes.uint32_t();
      let expires = new lazy.ctypes.uint32_t(); //relative

      if (
        RNPLib.rnp_op_verify_signature_get_times(
          sig,
          created.address(),
          expires.address()
        )
      ) {
        throw new Error("rnp_op_verify_signature_get_times failed");
      }

      result.sigDetails.sigDate = new Date(created.value * 1000);

      let timeDelta;
      if (result.sigDetails.sigDate > msgDate) {
        timeDelta = result.sigDetails.sigDate - msgDate;
      } else {
        timeDelta = msgDate - result.sigDetails.sigDate;
      }

      if (timeDelta > 1000 * 60 * 60 * 1) {
        result.statusFlags &= ~lazy.EnigmailConstants.GOOD_SIGNATURE;
        result.statusFlags |= lazy.EnigmailConstants.MSG_SIG_INVALID;
      }
    }

    let signer_key = new RNPLib.rnp_key_handle_t();
    let have_signer_key = false;
    let use_signer_key = false;

    if (query_signer) {
      if (RNPLib.rnp_op_verify_signature_get_key(sig, signer_key.address())) {
        // If sig_status isn't RNP_ERROR_KEY_NOT_FOUND then we must
        // be able to obtain the signer key.
        throw new Error("rnp_op_verify_signature_get_key");
      }

      have_signer_key = true;
      use_signer_key = !this.isBadKey(signer_key, null, RNPLib.ffi);
    }

    if (use_signer_key) {
      let keyInfo = {};
      let ok = this.getKeyInfoFromHandle(
        ffi,
        signer_key,
        keyInfo,
        true,
        false,
        false
      );
      if (!ok) {
        throw new Error("getKeyInfoFromHandle failed");
      }

      let fromMatchesAnyUid = false;
      let fromLower = fromAddr ? fromAddr.toLowerCase() : "";

      for (let uid of keyInfo.userIds) {
        if (uid.type !== "uid") {
          continue;
        }

        if (
          lazy.EnigmailFuncs.getEmailFromUserID(uid.userId).toLowerCase() ===
          fromLower
        ) {
          fromMatchesAnyUid = true;
          break;
        }
      }

      let useUndecided = true;

      if (keyInfo.secretAvailable) {
        let isPersonal = await lazy.PgpSqliteDb2.isAcceptedAsPersonalKey(
          keyInfo.fpr
        );
        if (isPersonal && fromMatchesAnyUid) {
          result.extStatusFlags |= lazy.EnigmailConstants.EXT_SELF_IDENTITY;
          useUndecided = false;
        } else {
          result.statusFlags |= lazy.EnigmailConstants.INVALID_RECIPIENT;
          useUndecided = true;
        }
      } else if (result.statusFlags & lazy.EnigmailConstants.GOOD_SIGNATURE) {
        if (!fromMatchesAnyUid) {
          /* At the time the user had accepted the key,
           * a different set of email addresses might have been
           * contained inside the key. In the meantime, we might
           * have refreshed the key, a email addresses
           * might have been removed or revoked.
           * If the current from was removed/revoked, we'd still
           * get an acceptance match, but the from is no longer found
           * in the key's UID list. That should get "undecided".
           */
          result.statusFlags |= lazy.EnigmailConstants.INVALID_RECIPIENT;
          useUndecided = true;
        } else {
          let acceptanceResult = {};
          try {
            await lazy.PgpSqliteDb2.getAcceptance(
              keyInfo.fpr,
              fromLower,
              acceptanceResult
            );
          } catch (ex) {
            console.debug("getAcceptance failed: " + ex);
          }

          // unverified key acceptance means, we consider the signature OK,
          //   but it's not a trusted identity.
          // unverified signature means, we cannot decide if the signature
          //   is ok.

          if (
            "emailDecided" in acceptanceResult &&
            acceptanceResult.emailDecided &&
            "fingerprintAcceptance" in acceptanceResult &&
            acceptanceResult.fingerprintAcceptance.length &&
            acceptanceResult.fingerprintAcceptance != "undecided"
          ) {
            if (acceptanceResult.fingerprintAcceptance == "rejected") {
              result.statusFlags &= ~lazy.EnigmailConstants.GOOD_SIGNATURE;
              result.statusFlags |=
                lazy.EnigmailConstants.BAD_SIGNATURE |
                lazy.EnigmailConstants.INVALID_RECIPIENT;
              useUndecided = false;
            } else if (acceptanceResult.fingerprintAcceptance == "verified") {
              result.statusFlags |= lazy.EnigmailConstants.TRUSTED_IDENTITY;
              useUndecided = false;
            } else if (acceptanceResult.fingerprintAcceptance == "unverified") {
              useUndecided = false;
            }
          }
        }
      }

      if (useUndecided) {
        result.statusFlags &= ~lazy.EnigmailConstants.GOOD_SIGNATURE;
        result.statusFlags |= lazy.EnigmailConstants.UNCERTAIN_SIGNATURE;
      }
    }

    if (have_signer_key) {
      RNPLib.rnp_key_handle_destroy(signer_key);
    }

    return true;
  },

  async verifyDetached(data, options) {
    let result = {};
    result.decryptedData = "";
    result.statusFlags = 0;
    result.exitCode = -1;
    result.extStatusFlags = 0;
    result.userId = "";
    result.keyId = "";
    result.sigDetails = {};
    result.sigDetails.sigDate = null;

    let sig_arr = options.mimeSignatureData.split("").map(e => e.charCodeAt());
    var sig_array = lazy.ctypes.uint8_t.array()(sig_arr);

    let input_sig = new RNPLib.rnp_input_t();
    RNPLib.rnp_input_from_memory(
      input_sig.address(),
      sig_array,
      sig_array.length,
      false
    );

    let input_from_memory = new RNPLib.rnp_input_t();

    let arr = data.split("").map(e => e.charCodeAt());
    var data_array = lazy.ctypes.uint8_t.array()(arr);

    RNPLib.rnp_input_from_memory(
      input_from_memory.address(),
      data_array,
      data_array.length,
      false
    );

    let verify_op = new RNPLib.rnp_op_verify_t();
    if (
      RNPLib.rnp_op_verify_detached_create(
        verify_op.address(),
        RNPLib.ffi,
        input_from_memory,
        input_sig
      )
    ) {
      throw new Error("rnp_op_verify_detached_create failed");
    }

    result.exitCode = RNPLib.rnp_op_verify_execute(verify_op);

    let haveSignature = await this.getVerifyDetails(
      RNPLib.ffi,
      options.fromAddr,
      options.msgDate,
      verify_op,
      result
    );
    if (!haveSignature) {
      if (!result.exitCode) {
        /* Don't allow a good exit code. Keep existing bad code. */
        result.exitCode = -1;
      }
      result.statusFlags |= lazy.EnigmailConstants.BAD_SIGNATURE;
    }

    RNPLib.rnp_input_destroy(input_from_memory);
    RNPLib.rnp_input_destroy(input_sig);
    RNPLib.rnp_op_verify_destroy(verify_op);

    return result;
  },

  async genKey(userId, keyType, keyBits, expiryDays, passphrase) {
    let newKeyId = "";
    let newKeyFingerprint = "";

    let primaryKeyType;
    let primaryKeyBits = 0;
    let subKeyType;
    let subKeyBits = 0;
    let primaryKeyCurve = null;
    let subKeyCurve = null;
    let expireSeconds = 0;

    if (keyType == "RSA") {
      primaryKeyType = subKeyType = "rsa";
      primaryKeyBits = subKeyBits = keyBits;
    } else if (keyType == "ECC") {
      primaryKeyType = "eddsa";
      subKeyType = "ecdh";
      subKeyCurve = "Curve25519";
    } else {
      return null;
    }

    if (expiryDays != 0) {
      expireSeconds = expiryDays * 24 * 60 * 60;
    }

    let genOp = new RNPLib.rnp_op_generate_t();
    if (
      RNPLib.rnp_op_generate_create(genOp.address(), RNPLib.ffi, primaryKeyType)
    ) {
      throw new Error("rnp_op_generate_create primary failed");
    }

    if (RNPLib.rnp_op_generate_set_userid(genOp, userId)) {
      throw new Error("rnp_op_generate_set_userid failed");
    }

    if (passphrase != null && passphrase.length != 0) {
      if (RNPLib.rnp_op_generate_set_protection_password(genOp, passphrase)) {
        throw new Error("rnp_op_generate_set_protection_password failed");
      }
    }

    if (primaryKeyBits != 0) {
      if (RNPLib.rnp_op_generate_set_bits(genOp, primaryKeyBits)) {
        throw new Error("rnp_op_generate_set_bits primary failed");
      }
    }

    if (primaryKeyCurve != null) {
      if (RNPLib.rnp_op_generate_set_curve(genOp, primaryKeyCurve)) {
        throw new Error("rnp_op_generate_set_curve primary failed");
      }
    }

    if (RNPLib.rnp_op_generate_set_expiration(genOp, expireSeconds)) {
      throw new Error("rnp_op_generate_set_expiration primary failed");
    }

    if (RNPLib.rnp_op_generate_execute(genOp)) {
      throw new Error("rnp_op_generate_execute primary failed");
    }

    let primaryKey = new RNPLib.rnp_key_handle_t();
    if (RNPLib.rnp_op_generate_get_key(genOp, primaryKey.address())) {
      throw new Error("rnp_op_generate_get_key primary failed");
    }

    RNPLib.rnp_op_generate_destroy(genOp);

    newKeyFingerprint = this.getFingerprintFromHandle(primaryKey);
    newKeyId = this.getKeyIDFromHandle(primaryKey);

    if (
      RNPLib.rnp_op_generate_subkey_create(
        genOp.address(),
        RNPLib.ffi,
        primaryKey,
        subKeyType
      )
    ) {
      throw new Error("rnp_op_generate_subkey_create primary failed");
    }

    if (passphrase != null && passphrase.length != 0) {
      if (RNPLib.rnp_op_generate_set_protection_password(genOp, passphrase)) {
        throw new Error("rnp_op_generate_set_protection_password failed");
      }
    }

    if (subKeyBits != 0) {
      if (RNPLib.rnp_op_generate_set_bits(genOp, subKeyBits)) {
        throw new Error("rnp_op_generate_set_bits sub failed");
      }
    }

    if (subKeyCurve != null) {
      if (RNPLib.rnp_op_generate_set_curve(genOp, subKeyCurve)) {
        throw new Error("rnp_op_generate_set_curve sub failed");
      }
    }

    if (RNPLib.rnp_op_generate_set_expiration(genOp, expireSeconds)) {
      throw new Error("rnp_op_generate_set_expiration sub failed");
    }

    let unlocked = false;
    try {
      if (passphrase != null && passphrase.length != 0) {
        if (RNPLib.rnp_key_unlock(primaryKey, passphrase)) {
          throw new Error("rnp_key_unlock failed");
        }
        unlocked = true;
      }

      if (RNPLib.rnp_op_generate_execute(genOp)) {
        throw new Error("rnp_op_generate_execute sub failed");
      }
    } finally {
      if (unlocked) {
        RNPLib.rnp_key_lock(primaryKey);
      }
    }

    RNPLib.rnp_op_generate_destroy(genOp);
    RNPLib.rnp_key_handle_destroy(primaryKey);

    await lazy.PgpSqliteDb2.acceptAsPersonalKey(newKeyFingerprint);

    return newKeyId;
  },

  async saveKeyRings() {
    RNPLib.saveKeys();
    Services.obs.notifyObservers(null, "openpgp-key-change");
  },

  importToFFI(ffi, keyBlockStr, usePublic, useSecret, permissive) {
    let input_from_memory = new RNPLib.rnp_input_t();

    if (!keyBlockStr) {
      throw new Error("no keyBlockStr parameter in importToFFI");
    }

    if (typeof keyBlockStr != "string") {
      throw new Error(
        "keyBlockStr of unepected type importToFFI: %o",
        keyBlockStr
      );
    }

    // Input might be either plain text or binary data.
    // If the input is binary, do not modify it.
    // If the input contains characters with a multi-byte char code value,
    // we know the input doesn't consist of binary 8-bit values. Rather,
    // it contains text with multi-byte characters. The only scenario
    // in which we can tolerate those are comment lines, which we can
    // filter out.

    let arr = this.getCharCodeArray(keyBlockStr);
    if (!this.is8Bit(arr)) {
      let trimmed = this.removeCommentLines(keyBlockStr);
      arr = this.getCharCodeArray(trimmed);
      if (!this.is8Bit(arr)) {
        throw new Error(`Non-ascii key block: ${keyBlockStr}`);
      }
    }
    var key_array = lazy.ctypes.uint8_t.array()(arr);

    if (
      RNPLib.rnp_input_from_memory(
        input_from_memory.address(),
        key_array,
        key_array.length,
        false
      )
    ) {
      throw new Error("rnp_input_from_memory failed");
    }

    let jsonInfo = new lazy.ctypes.char.ptr();

    let flags = 0;
    if (usePublic) {
      flags |= RNPLib.RNP_LOAD_SAVE_PUBLIC_KEYS;
    }
    if (useSecret) {
      flags |= RNPLib.RNP_LOAD_SAVE_SECRET_KEYS;
    }

    if (permissive) {
      flags |= RNPLib.RNP_LOAD_SAVE_PERMISSIVE;
    }

    let rv = RNPLib.rnp_import_keys(
      ffi,
      input_from_memory,
      flags,
      jsonInfo.address()
    );

    // TODO: parse jsonInfo and return a list of keys,
    // as seen in keyRing.importKeyAsync.
    // (should prevent the incorrect popup "no keys imported".)

    if (rv) {
      console.debug("rnp_import_keys failed with  rv: " + rv);
    }

    RNPLib.rnp_buffer_destroy(jsonInfo);
    RNPLib.rnp_input_destroy(input_from_memory);

    return rv;
  },

  maxImportKeyBlockSize: 5000000,

  async getOnePubKeyFromKeyBlock(keyBlockStr, fpr, permissive = true) {
    if (!keyBlockStr) {
      throw new Error(`Invalid parameter; keyblock: ${keyBlockStr}`);
    }

    if (keyBlockStr.length > RNP.maxImportKeyBlockSize) {
      throw new Error("rejecting big keyblock");
    }

    let tempFFI = RNPLib.prepare_ffi();
    if (!tempFFI) {
      throw new Error("Couldn't initialize librnp.");
    }

    let pubKey;
    if (!this.importToFFI(tempFFI, keyBlockStr, true, false, permissive)) {
      pubKey = await this.getPublicKey("0x" + fpr, tempFFI);
    }

    RNPLib.rnp_ffi_destroy(tempFFI);
    return pubKey;
  },

  async getKeyListFromKeyBlockImpl(
    keyBlockStr,
    pubkey = true,
    seckey = false,
    permissive = true,
    withPubKey = false
  ) {
    if (!keyBlockStr) {
      throw new Error(`Invalid parameter; keyblock: ${keyBlockStr}`);
    }

    if (keyBlockStr.length > RNP.maxImportKeyBlockSize) {
      throw new Error("rejecting big keyblock");
    }

    let tempFFI = RNPLib.prepare_ffi();
    if (!tempFFI) {
      throw new Error("Couldn't initialize librnp.");
    }

    let keyList = null;
    if (!this.importToFFI(tempFFI, keyBlockStr, pubkey, seckey, permissive)) {
      keyList = await this.getKeysFromFFI(
        tempFFI,
        true,
        null,
        false,
        withPubKey
      );
    }

    RNPLib.rnp_ffi_destroy(tempFFI);
    return keyList;
  },

  /**
   * Take two or more ASCII armored key blocks and import them into memory,
   * and return the merged public key for the given fingerprint.
   * (Other keys included in the key blocks are ignored.)
   * The intention is to use it to combine keys obtained from different places,
   * possibly with updated/different expiration date and userIds etc. to
   * a canonical representation of them.
   *
   * @param {string} fingerprint - Key fingerprint.
   * @param {...string} - Key blocks.
   * @returns {string} the resulting public key of the blocks
   */
  async mergePublicKeyBlocks(fingerprint, ...keyBlocks) {
    if (keyBlocks.some(b => b.length > RNP.maxImportKeyBlockSize)) {
      throw new Error("keyBlock too big");
    }

    let tempFFI = RNPLib.prepare_ffi();
    if (!tempFFI) {
      throw new Error("Couldn't initialize librnp.");
    }

    const pubkey = true;
    const seckey = false;
    const permissive = false;
    for (let block of new Set(keyBlocks)) {
      if (this.importToFFI(tempFFI, block, pubkey, seckey, permissive)) {
        throw new Error("Merging public keys failed");
      }
    }
    let pubKey = await this.getPublicKey(`0x${fingerprint}`, tempFFI);

    RNPLib.rnp_ffi_destroy(tempFFI);
    return pubKey;
  },

  async importRevImpl(data) {
    if (!data || typeof data != "string") {
      throw new Error("invalid data parameter");
    }

    let arr = data.split("").map(e => e.charCodeAt());
    var key_array = lazy.ctypes.uint8_t.array()(arr);

    let input_from_memory = new RNPLib.rnp_input_t();
    if (
      RNPLib.rnp_input_from_memory(
        input_from_memory.address(),
        key_array,
        key_array.length,
        false
      )
    ) {
      throw new Error("rnp_input_from_memory failed");
    }

    let jsonInfo = new lazy.ctypes.char.ptr();

    let flags = 0;
    let rv = RNPLib.rnp_import_signatures(
      RNPLib.ffi,
      input_from_memory,
      flags,
      jsonInfo.address()
    );

    // TODO: parse jsonInfo

    if (rv) {
      console.debug("rnp_import_signatures failed with rv: " + rv);
    }

    RNPLib.rnp_buffer_destroy(jsonInfo);
    RNPLib.rnp_input_destroy(input_from_memory);
    await this.saveKeyRings();

    return rv;
  },

  async importSecKeyBlockImpl(
    win,
    passCB,
    keepPassphrases,
    keyBlockStr,
    permissive = false,
    limitedFPRs = []
  ) {
    return this._importKeyBlockWithAutoAccept(
      win,
      passCB,
      keepPassphrases,
      keyBlockStr,
      false,
      true,
      null,
      permissive,
      limitedFPRs
    );
  },

  async importPubkeyBlockAutoAcceptImpl(
    win,
    keyBlockStr,
    acceptance,
    permissive = false,
    limitedFPRs = []
  ) {
    return this._importKeyBlockWithAutoAccept(
      win,
      null,
      false,
      keyBlockStr,
      true,
      false,
      acceptance,
      permissive,
      limitedFPRs
    );
  },

  /**
   * Import either a public key or a secret key.
   * Importing both at the same time isn't supported by this API.
   *
   * @param {?nsIWindow} win - Parent window, may be null
   * @param {Function} passCB - a callback function that will be called if the user needs
   *   to enter a passphrase to unlock a secret key. See passphrasePromptCallback
   *   for the function signature.
   * @param {boolean} keepPassphrases - controls which passphrase will
   *   be used to protect imported secret keys. If true, the existing
   *   passphrase will be kept. If false, (of if currently there's no
   *   passphrase set), passphrase protection will be changed to use
   *   our automatic passphrase (to allow automatic protection by
   *   primary password, whether's it's currently enabled or not).
   * @param {string} keyBlockStr - An block of OpenPGP key data. See
   *   implementation of function importToFFI for allowed contents.
   *   TODO: Write better documentation for this parameter.
   * @param {boolean} pubkey - If true, import the public keys found in
   *   keyBlockStr.
   * @param {boolean} seckey - If true, import the secret keys found in
   *   keyBlockStr.
   * @param {string} acceptance - The key acceptance level that should
   *   be assigned to imported public keys.
   *   TODO: Write better documentation for the allowed values.
   * @param {boolean} permissive - Whether it's allowed to fall back
   *   to a permissive import, if strict import fails.
   *   (See RNP documentation for RNP_LOAD_SAVE_PERMISSIVE.)
   * @param {string[]} limitedFPRs - This is a filtering parameter.
   *   If the array is empty, all keys will be imported.
   *   If the array contains at least one entry, a key will be imported
   *   only if its fingerprint (of the primary key) is listed in this
   *   array.
   */
  async _importKeyBlockWithAutoAccept(
    win,
    passCB,
    keepPassphrases,
    keyBlockStr,
    pubkey,
    seckey,
    acceptance,
    permissive = false,
    limitedFPRs = []
  ) {
    if (keyBlockStr.length > RNP.maxImportKeyBlockSize) {
      throw new Error("rejecting big keyblock");
    }
    if (pubkey && seckey) {
      // Currently no caller needs to import both at the save time,
      // and the implementation hasn't been reviewed, whether it
      // supports it or not, so we refuse this request.
      throw new Error("Cannot import public and secret keys at the same time");
    }

    /*
     * Import strategy:
     * - import file into a temporary space, in-memory only (ffi)
     * - if we failed to decrypt the secret keys, return null
     * - set the password of secret keys that don't have one yet
     * - get the key listing of all keys from the temporary space,
     *   which is want we want to return as the import report
     * - export all keys from the temporary space, and import them
     *   into our permanent space.
     */
    let userFlags = { canceled: false };

    let result = {};
    result.exitCode = -1;
    result.importedKeys = [];
    result.errorMsg = "";

    let tempFFI = RNPLib.prepare_ffi();
    if (!tempFFI) {
      throw new Error("Couldn't initialize librnp.");
    }

    // TODO: check result
    if (this.importToFFI(tempFFI, keyBlockStr, pubkey, seckey, permissive)) {
      result.errorMsg = "RNP.importToFFI failed";
      return result;
    }

    let keys = await this.getKeysFromFFI(tempFFI, true);
    let pwCache = {
      passwords: [],
    };

    // Prior to importing, ensure the user is able to unlock all keys

    // If anything goes wrong during our attempt to unlock keys,
    // we don't want to keep key material remain unprotected in memory,
    // that's why we remember the trackers, including the respective
    // unlock passphrase, temporarily in memory, and we'll minimize
    // the period of time during which the key remains unprotected.
    let secretKeyTrackers = new Map();

    let unableToUnlockId = null;

    for (let k of keys) {
      let fprStr = "0x" + k.fpr;
      if (limitedFPRs.length && !limitedFPRs.includes(fprStr)) {
        continue;
      }

      let impKey = await this.getKeyHandleByIdentifier(tempFFI, fprStr);
      if (impKey.isNull()) {
        throw new Error("cannot get key handle for imported key: " + k.fpr);
      }

      if (!k.secretAvailable) {
        RNPLib.rnp_key_handle_destroy(impKey);
        impKey = null;
      } else {
        let primaryKey = new RnpPrivateKeyUnlockTracker(impKey);
        impKey = null;

        // Don't attempt to unlock secret keys that are unavailable.
        if (primaryKey.available()) {
          // Is it unprotected?
          primaryKey.unlockWithPassword("");
          if (primaryKey.isUnlocked()) {
            // yes, it's unprotected (empty passphrase)
            await primaryKey.setAutoPassphrase();
          } else {
            // try to unlock with the recently entered passwords,
            // or ask the user, if allowed
            primaryKey.setPasswordCache(pwCache);
            primaryKey.setAllowAutoUnlockWithCachedPasswords(true);
            primaryKey.setAllowPromptingUserForPassword(!!passCB);
            primaryKey.setPassphraseCallback(passCB);
            primaryKey.setRememberUnlockPassword(true);
            await primaryKey.unlock(tempFFI);
            if (!primaryKey.isUnlocked()) {
              userFlags.canceled = true;
              unableToUnlockId = RNP.getKeyIDFromHandle(primaryKey.getHandle());
            } else {
              secretKeyTrackers.set(fprStr, primaryKey);
            }
          }
        }

        if (!userFlags.canceled) {
          let sub_count = new lazy.ctypes.size_t();
          if (
            RNPLib.rnp_key_get_subkey_count(
              primaryKey.getHandle(),
              sub_count.address()
            )
          ) {
            throw new Error("rnp_key_get_subkey_count failed");
          }

          for (let i = 0; i < sub_count.value && !userFlags.canceled; i++) {
            let sub_handle = new RNPLib.rnp_key_handle_t();
            if (
              RNPLib.rnp_key_get_subkey_at(
                primaryKey.getHandle(),
                i,
                sub_handle.address()
              )
            ) {
              throw new Error("rnp_key_get_subkey_at failed");
            }

            let subTracker = new RnpPrivateKeyUnlockTracker(sub_handle);
            sub_handle = null;

            if (subTracker.available()) {
              // Is it unprotected?
              subTracker.unlockWithPassword("");
              if (subTracker.isUnlocked()) {
                // yes, it's unprotected (empty passphrase)
                await subTracker.setAutoPassphrase();
              } else {
                // try to unlock with the recently entered passwords,
                // or ask the user, if allowed
                subTracker.setPasswordCache(pwCache);
                subTracker.setAllowAutoUnlockWithCachedPasswords(true);
                subTracker.setAllowPromptingUserForPassword(!!passCB);
                subTracker.setPassphraseCallback(passCB);
                subTracker.setRememberUnlockPassword(true);
                await subTracker.unlock(tempFFI);
                if (!subTracker.isUnlocked()) {
                  userFlags.canceled = true;
                  unableToUnlockId = RNP.getKeyIDFromHandle(
                    subTracker.getHandle()
                  );
                  break;
                } else {
                  secretKeyTrackers.set(
                    this.getFingerprintFromHandle(subTracker.getHandle()),
                    subTracker
                  );
                }
              }
            }
          }
        }
      }

      if (userFlags.canceled) {
        break;
      }
    }

    if (unableToUnlockId) {
      result.errorMsg = "Cannot unlock key " + unableToUnlockId;
    }

    if (!userFlags.canceled) {
      for (let k of keys) {
        let fprStr = "0x" + k.fpr;
        if (limitedFPRs.length && !limitedFPRs.includes(fprStr)) {
          continue;
        }

        // We allow importing, if any of the following is true
        // - it contains a secret key
        // - it contains at least one user ID
        // - it is an update for an existing key (possibly new validity/revocation)

        if (k.userIds.length == 0 && !k.secretAvailable) {
          let existingKey = await this.getKeyHandleByIdentifier(
            RNPLib.ffi,
            "0x" + k.fpr
          );
          if (existingKey.isNull()) {
            continue;
          }
          RNPLib.rnp_key_handle_destroy(existingKey);
        }

        let impKeyPub;
        let impKeySecTracker = secretKeyTrackers.get(fprStr);
        if (!impKeySecTracker) {
          impKeyPub = await this.getKeyHandleByIdentifier(tempFFI, fprStr);
        }

        if (impKeySecTracker && !keepPassphrases) {
          impKeySecTracker.unprotect();
          await impKeySecTracker.setAutoPassphrase();

          let sub_count = new lazy.ctypes.size_t();
          if (
            RNPLib.rnp_key_get_subkey_count(
              impKeySecTracker.getHandle(),
              sub_count.address()
            )
          ) {
            throw new Error("rnp_key_get_subkey_count failed");
          }

          for (let i = 0; i < sub_count.value; i++) {
            let sub_handle = new RNPLib.rnp_key_handle_t();
            if (
              RNPLib.rnp_key_get_subkey_at(
                impKeySecTracker.getHandle(),
                i,
                sub_handle.address()
              )
            ) {
              throw new Error("rnp_key_get_subkey_at failed");
            }

            let subTracker = secretKeyTrackers.get(
              this.getFingerprintFromHandle(sub_handle)
            );
            if (!subTracker) {
              // There is no secret key material for this subkey available,
              // that's why no tracker was created, we can skip it.
              continue;
            }
            subTracker.unprotect();
            await subTracker.setAutoPassphrase();
          }
        }

        let exportFlags =
          RNPLib.RNP_KEY_EXPORT_ARMORED | RNPLib.RNP_KEY_EXPORT_SUBKEYS;

        if (pubkey) {
          exportFlags |= RNPLib.RNP_KEY_EXPORT_PUBLIC;
        }
        if (seckey) {
          exportFlags |= RNPLib.RNP_KEY_EXPORT_SECRET;
        }

        let output_to_memory = new RNPLib.rnp_output_t();
        if (RNPLib.rnp_output_to_memory(output_to_memory.address(), 0)) {
          throw new Error("rnp_output_to_memory failed");
        }

        if (
          RNPLib.rnp_key_export(
            impKeySecTracker ? impKeySecTracker.getHandle() : impKeyPub,
            output_to_memory,
            exportFlags
          )
        ) {
          throw new Error("rnp_key_export failed");
        }

        if (impKeyPub) {
          RNPLib.rnp_key_handle_destroy(impKeyPub);
          impKeyPub = null;
        }

        let result_buf = new lazy.ctypes.uint8_t.ptr();
        let result_len = new lazy.ctypes.size_t();
        if (
          RNPLib.rnp_output_memory_get_buf(
            output_to_memory,
            result_buf.address(),
            result_len.address(),
            false
          )
        ) {
          throw new Error("rnp_output_memory_get_buf failed");
        }

        let input_from_memory = new RNPLib.rnp_input_t();

        if (
          RNPLib.rnp_input_from_memory(
            input_from_memory.address(),
            result_buf,
            result_len,
            false
          )
        ) {
          throw new Error("rnp_input_from_memory failed");
        }

        let importFlags = 0;
        if (pubkey) {
          importFlags |= RNPLib.RNP_LOAD_SAVE_PUBLIC_KEYS;
        }
        if (seckey) {
          importFlags |= RNPLib.RNP_LOAD_SAVE_SECRET_KEYS;
        }
        if (permissive) {
          importFlags |= RNPLib.RNP_LOAD_SAVE_PERMISSIVE;
        }

        if (
          RNPLib.rnp_import_keys(
            RNPLib.ffi,
            input_from_memory,
            importFlags,
            null
          )
        ) {
          throw new Error("rnp_import_keys failed");
        }

        result.importedKeys.push("0x" + k.id);

        RNPLib.rnp_input_destroy(input_from_memory);
        RNPLib.rnp_output_destroy(output_to_memory);

        // For acceptance "undecided", we don't store it, because that's
        // the default if no value is stored.
        let actionableAcceptances = ["rejected", "unverified", "verified"];

        if (
          pubkey &&
          !k.secretAvailable &&
          actionableAcceptances.includes(acceptance)
        ) {
          // For each imported public key and associated email address,
          // update the acceptance to unverified, but only if it's only
          // currently undecided. In other words, we keep the acceptance
          // if it's rejected or verified.

          let currentAcceptance =
            await lazy.PgpSqliteDb2.getFingerprintAcceptance(null, k.fpr);

          if (!currentAcceptance || currentAcceptance == "undecided") {
            // Currently undecided, allowed to change.
            let allEmails = [];

            for (let uid of k.userIds) {
              if (uid.type != "uid") {
                continue;
              }

              let uidEmail = lazy.EnigmailFuncs.getEmailFromUserID(uid.userId);
              if (uidEmail) {
                allEmails.push(uidEmail);
              }
            }
            await lazy.PgpSqliteDb2.updateAcceptance(
              k.fpr,
              allEmails,
              acceptance
            );
          }
        }
      }

      result.exitCode = 0;
      await this.saveKeyRings();
    }

    for (let valTracker of secretKeyTrackers.values()) {
      valTracker.release();
    }

    RNPLib.rnp_ffi_destroy(tempFFI);
    return result;
  },

  async deleteKey(keyFingerprint, deleteSecret) {
    let handle = new RNPLib.rnp_key_handle_t();
    if (
      RNPLib.rnp_locate_key(
        RNPLib.ffi,
        "fingerprint",
        keyFingerprint,
        handle.address()
      )
    ) {
      throw new Error("rnp_locate_key failed");
    }

    let flags = RNPLib.RNP_KEY_REMOVE_PUBLIC | RNPLib.RNP_KEY_REMOVE_SUBKEYS;
    if (deleteSecret) {
      flags |= RNPLib.RNP_KEY_REMOVE_SECRET;
    }

    if (RNPLib.rnp_key_remove(handle, flags)) {
      throw new Error("rnp_key_remove failed");
    }

    RNPLib.rnp_key_handle_destroy(handle);
    await this.saveKeyRings();
  },

  async revokeKey(keyFingerprint) {
    let tracker =
      RnpPrivateKeyUnlockTracker.constructFromFingerprint(keyFingerprint);
    if (!tracker.available()) {
      return;
    }
    tracker.setAllowPromptingUserForPassword(true);
    tracker.setAllowAutoUnlockWithCachedPasswords(true);
    await tracker.unlock();
    if (!tracker.isUnlocked()) {
      return;
    }

    let flags = 0;
    let revokeResult = RNPLib.rnp_key_revoke(
      tracker.getHandle(),
      flags,
      null,
      null,
      null
    );
    tracker.release();
    if (revokeResult) {
      throw new Error(
        `rnp_key_revoke failed for fingerprint=${keyFingerprint}`
      );
    }
    await this.saveKeyRings();
  },

  _getKeyHandleByKeyIdOrFingerprint(ffi, id, findPrimary) {
    if (!id.startsWith("0x")) {
      throw new Error("unexpected identifier " + id);
    } else {
      // remove 0x
      id = id.substring(2);
    }

    let type = null;
    if (id.length == 16) {
      type = "keyid";
    } else if (id.length == 40 || id.length == 32) {
      type = "fingerprint";
    } else {
      throw new Error("key/fingerprint identifier of unexpected length: " + id);
    }

    let key = new RNPLib.rnp_key_handle_t();
    if (RNPLib.rnp_locate_key(ffi, type, id, key.address())) {
      throw new Error("rnp_locate_key failed, " + type + ", " + id);
    }

    if (!key.isNull() && findPrimary) {
      let is_subkey = new lazy.ctypes.bool();
      if (RNPLib.rnp_key_is_sub(key, is_subkey.address())) {
        throw new Error("rnp_key_is_sub failed");
      }
      if (is_subkey.value) {
        let primaryKey = this.getPrimaryKeyHandleFromSub(ffi, key);
        RNPLib.rnp_key_handle_destroy(key);
        key = primaryKey;
      }
    }

    if (!key.isNull() && this.isBadKey(key, null, ffi)) {
      RNPLib.rnp_key_handle_destroy(key);
      key = new RNPLib.rnp_key_handle_t();
    }

    return key;
  },

  getPrimaryKeyHandleByKeyIdOrFingerprint(ffi, id) {
    return this._getKeyHandleByKeyIdOrFingerprint(ffi, id, true);
  },

  getKeyHandleByKeyIdOrFingerprint(ffi, id) {
    return this._getKeyHandleByKeyIdOrFingerprint(ffi, id, false);
  },

  async getKeyHandleByIdentifier(ffi, id) {
    let key = null;

    if (id.startsWith("<")) {
      //throw new Error("search by email address not yet implemented: " + id);
      if (!id.endsWith(">")) {
        throw new Error(
          "if search identifier starts with < then it must end with > : " + id
        );
      }
      key = await this.findKeyByEmail(id);
    } else {
      key = this.getKeyHandleByKeyIdOrFingerprint(ffi, id);
    }
    return key;
  },

  isKeyUsableFor(key, usage) {
    let allowed = new lazy.ctypes.bool();
    if (RNPLib.rnp_key_allows_usage(key, usage, allowed.address())) {
      throw new Error("rnp_key_allows_usage failed");
    }
    if (!allowed.value) {
      return false;
    }

    if (usage != str_sign) {
      return true;
    }

    return (
      RNPLib.getSecretAvailableFromHandle(key) &&
      RNPLib.isSecretKeyMaterialAvailable(key)
    );
  },

  getSuitableSubkey(primary, usage) {
    let sub_count = new lazy.ctypes.size_t();
    if (RNPLib.rnp_key_get_subkey_count(primary, sub_count.address())) {
      throw new Error("rnp_key_get_subkey_count failed");
    }

    // For compatibility with GnuPG, when encrypting to a single subkey,
    // encrypt to the most recently created subkey. (Bug 1665281)
    let newest_created = null;
    let newest_handle = null;

    for (let i = 0; i < sub_count.value; i++) {
      let sub_handle = new RNPLib.rnp_key_handle_t();
      if (RNPLib.rnp_key_get_subkey_at(primary, i, sub_handle.address())) {
        throw new Error("rnp_key_get_subkey_at failed");
      }
      let skip =
        this.isBadKey(sub_handle, primary, null) ||
        this.isKeyExpired(sub_handle);
      if (!skip) {
        let key_revoked = new lazy.ctypes.bool();
        if (RNPLib.rnp_key_is_revoked(sub_handle, key_revoked.address())) {
          throw new Error("rnp_key_is_revoked failed");
        }
        if (key_revoked.value) {
          skip = true;
        }
      }
      if (!skip) {
        if (!this.isKeyUsableFor(sub_handle, usage)) {
          skip = true;
        }
      }

      if (!skip) {
        let created = this.getKeyCreatedValueFromHandle(sub_handle);
        if (!newest_handle || created > newest_created) {
          if (newest_handle) {
            RNPLib.rnp_key_handle_destroy(newest_handle);
          }
          newest_handle = sub_handle;
          sub_handle = null;
          newest_created = created;
        }
      }

      if (sub_handle) {
        RNPLib.rnp_key_handle_destroy(sub_handle);
      }
    }

    return newest_handle;
  },

  addSuitableEncryptKey(key, op) {
    // Prefer usable subkeys, because they are always newer
    // (or same age) as primary key.

    let use_sub = this.getSuitableSubkey(key, str_encrypt);
    if (!use_sub && !this.isKeyUsableFor(key, str_encrypt)) {
      throw new Error("no suitable subkey found for " + str_encrypt);
    }

    if (
      RNPLib.rnp_op_encrypt_add_recipient(op, use_sub != null ? use_sub : key)
    ) {
      throw new Error("rnp_op_encrypt_add_recipient sender failed");
    }
    if (use_sub) {
      RNPLib.rnp_key_handle_destroy(use_sub);
    }
  },

  addAliasKeys(aliasKeys, op) {
    for (let ak of aliasKeys) {
      let key = this.getKeyHandleByKeyIdOrFingerprint(RNPLib.ffi, "0x" + ak);
      if (!key || key.isNull()) {
        console.debug(
          "addAliasKeys: cannot find key used by alias rule: " + ak
        );
        return false;
      }
      this.addSuitableEncryptKey(key, op);
      RNPLib.rnp_key_handle_destroy(key);
    }
    return true;
  },

  async addEncryptionKeyForEmail(email, op) {
    let key = await this.findKeyByEmail(email, true);
    if (!key || key.isNull()) {
      return false;
    }
    this.addSuitableEncryptKey(key, op);
    RNPLib.rnp_key_handle_destroy(key);
    return true;
  },

  getEmailWithoutBrackets(email) {
    if (email.startsWith("<") && email.endsWith(">")) {
      return email.substring(1, email.length - 1);
    }
    return email;
  },

  async encryptAndOrSign(plaintext, args, resultStatus) {
    let signedInner;

    if (args.sign && args.senderKeyIsExternal) {
      if (!lazy.GPGME.allDependenciesLoaded()) {
        throw new Error(
          "invalid configuration, request to use external GnuPG key, but GPGME isn't working"
        );
      }
      if (args.sigTypeClear) {
        throw new Error(
          "unexpected signing request with external GnuPG key configuration"
        );
      }

      if (args.encrypt) {
        // If we are asked to encrypt and sign at the same time, it
        // means we're asked to produce the combined OpenPGP encoding.
        // We ask GPG to produce a regular signature, and will then
        // combine it with the encryption produced by RNP.
        let orgEncrypt = args.encrypt;
        args.encrypt = false;
        signedInner = await lazy.GPGME.sign(plaintext, args, resultStatus);
        args.encrypt = orgEncrypt;
      } else {
        // We aren't asked to encrypt, but sign only. That means the
        // caller needs the detatched signature, either for MIME
        // mime encoding with separate signature part, or for the nested
        // approach with separate signing and encryption layers.
        return lazy.GPGME.signDetached(plaintext, args, resultStatus);
      }
    }

    resultStatus.exitCode = -1;
    resultStatus.statusFlags = 0;
    resultStatus.statusMsg = "";
    resultStatus.errorMsg = "";

    let data_array;
    if (args.sign && args.senderKeyIsExternal) {
      data_array = lazy.ctypes.uint8_t.array()(signedInner);
    } else {
      let arr = plaintext.split("").map(e => e.charCodeAt());
      data_array = lazy.ctypes.uint8_t.array()(arr);
    }

    let input = new RNPLib.rnp_input_t();
    if (
      RNPLib.rnp_input_from_memory(
        input.address(),
        data_array,
        data_array.length,
        false
      )
    ) {
      throw new Error("rnp_input_from_memory failed");
    }

    let output = new RNPLib.rnp_output_t();
    if (RNPLib.rnp_output_to_memory(output.address(), 0)) {
      throw new Error("rnp_output_to_memory failed");
    }

    let op;
    if (args.encrypt) {
      op = new RNPLib.rnp_op_encrypt_t();
      if (
        RNPLib.rnp_op_encrypt_create(op.address(), RNPLib.ffi, input, output)
      ) {
        throw new Error("rnp_op_encrypt_create failed");
      }
    } else if (args.sign && !args.senderKeyIsExternal) {
      op = new RNPLib.rnp_op_sign_t();
      if (args.sigTypeClear) {
        if (
          RNPLib.rnp_op_sign_cleartext_create(
            op.address(),
            RNPLib.ffi,
            input,
            output
          )
        ) {
          throw new Error("rnp_op_sign_cleartext_create failed");
        }
      } else if (args.sigTypeDetached) {
        if (
          RNPLib.rnp_op_sign_detached_create(
            op.address(),
            RNPLib.ffi,
            input,
            output
          )
        ) {
          throw new Error("rnp_op_sign_detached_create failed");
        }
      } else {
        throw new Error(
          "not yet implemented scenario: signing, neither clear nor encrypt, without encryption"
        );
      }
    } else {
      throw new Error("invalid parameters, neither encrypt nor sign");
    }

    let senderKeyTracker = null;
    let subKeyTracker = null;

    try {
      if ((args.sign && !args.senderKeyIsExternal) || args.encryptToSender) {
        {
          // Use a temporary scope to ensure the senderKey variable
          // cannot be accessed later on.
          let senderKey = await this.getKeyHandleByIdentifier(
            RNPLib.ffi,
            args.sender
          );
          if (!senderKey || senderKey.isNull()) {
            return null;
          }

          senderKeyTracker = new RnpPrivateKeyUnlockTracker(senderKey);
          senderKeyTracker.setAllowPromptingUserForPassword(true);
          senderKeyTracker.setAllowAutoUnlockWithCachedPasswords(true);
        }

        // Manually configured external key overrides the check for
        // a valid personal key.
        if (!args.senderKeyIsExternal) {
          if (!senderKeyTracker.isSecret()) {
            throw new Error(
              `configured sender key ${args.sender} isn't available`
            );
          }
          if (
            !(await lazy.PgpSqliteDb2.isAcceptedAsPersonalKey(
              senderKeyTracker.getFingerprint()
            ))
          ) {
            throw new Error(
              `configured sender key ${args.sender} isn't accepted as a personal key`
            );
          }
        }

        if (args.encryptToSender) {
          this.addSuitableEncryptKey(senderKeyTracker.getHandle(), op);
        }

        if (args.sign && !args.senderKeyIsExternal) {
          let signingKeyTrackerReference = senderKeyTracker;

          // Prefer usable subkeys, because they are always newer
          // (or same age) as primary key.
          let usableSubKeyHandle = this.getSuitableSubkey(
            senderKeyTracker.getHandle(),
            str_sign
          );
          if (
            !usableSubKeyHandle &&
            !this.isKeyUsableFor(senderKeyTracker.getHandle(), str_sign)
          ) {
            throw new Error("no suitable (sub)key found for " + str_sign);
          }
          if (usableSubKeyHandle) {
            subKeyTracker = new RnpPrivateKeyUnlockTracker(usableSubKeyHandle);
            subKeyTracker.setAllowPromptingUserForPassword(true);
            subKeyTracker.setAllowAutoUnlockWithCachedPasswords(true);
            if (subKeyTracker.available()) {
              signingKeyTrackerReference = subKeyTracker;
            }
          }

          await signingKeyTrackerReference.unlock();

          if (args.encrypt) {
            if (
              RNPLib.rnp_op_encrypt_add_signature(
                op,
                signingKeyTrackerReference.getHandle(),
                null
              )
            ) {
              throw new Error("rnp_op_encrypt_add_signature failed");
            }
          } else if (
            RNPLib.rnp_op_sign_add_signature(
              op,
              signingKeyTrackerReference.getHandle(),
              null
            )
          ) {
            throw new Error("rnp_op_sign_add_signature failed");
          }
          // This was just a reference, no ownership.
          signingKeyTrackerReference = null;
        }
      }

      if (args.encrypt) {
        // If we have an alias definition, it will be used, and the usual
        // lookup by email address will be skipped. Earlier code should
        // have already checked that alias keys are available and usable
        // for encryption, so we fail if a problem is found.

        for (let rcpList of [args.to, args.bcc]) {
          for (let rcpEmail of rcpList) {
            rcpEmail = rcpEmail.toLowerCase();
            let aliasKeys = args.aliasKeys.get(
              this.getEmailWithoutBrackets(rcpEmail)
            );
            if (aliasKeys) {
              if (!this.addAliasKeys(aliasKeys, op)) {
                resultStatus.statusFlags |=
                  lazy.EnigmailConstants.INVALID_RECIPIENT;
                return null;
              }
            } else if (!(await this.addEncryptionKeyForEmail(rcpEmail, op))) {
              resultStatus.statusFlags |=
                lazy.EnigmailConstants.INVALID_RECIPIENT;
              return null;
            }
          }
        }

        if (AppConstants.MOZ_UPDATE_CHANNEL != "release") {
          let debugKey = Services.prefs.getStringPref(
            "mail.openpgp.debug.extra_encryption_key"
          );
          if (debugKey) {
            let handle = this.getKeyHandleByKeyIdOrFingerprint(
              RNPLib.ffi,
              debugKey
            );
            if (!handle.isNull()) {
              console.debug("encrypting to debug key " + debugKey);
              this.addSuitableEncryptKey(handle, op);
              RNPLib.rnp_key_handle_destroy(handle);
            }
          }
        }

        // Don't use AEAD as long as RNP uses v5 packets which aren't
        // widely compatible with other clients.
        if (RNPLib.rnp_op_encrypt_set_aead(op, "NONE")) {
          throw new Error("rnp_op_encrypt_set_aead failed");
        }

        if (RNPLib.rnp_op_encrypt_set_cipher(op, "AES256")) {
          throw new Error("rnp_op_encrypt_set_cipher failed");
        }

        // TODO, map args.signatureHash string to RNP and call
        //       rnp_op_encrypt_set_hash
        if (RNPLib.rnp_op_encrypt_set_hash(op, "SHA256")) {
          throw new Error("rnp_op_encrypt_set_hash failed");
        }

        if (RNPLib.rnp_op_encrypt_set_armor(op, args.armor)) {
          throw new Error("rnp_op_encrypt_set_armor failed");
        }

        if (args.sign && args.senderKeyIsExternal) {
          if (RNPLib.rnp_op_encrypt_set_flags(op, RNPLib.RNP_ENCRYPT_NOWRAP)) {
            throw new Error("rnp_op_encrypt_set_flags failed");
          }
        }

        let rv = RNPLib.rnp_op_encrypt_execute(op);
        if (rv) {
          throw new Error("rnp_op_encrypt_execute failed: " + rv);
        }
        RNPLib.rnp_op_encrypt_destroy(op);
      } else if (args.sign && !args.senderKeyIsExternal) {
        if (RNPLib.rnp_op_sign_set_hash(op, "SHA256")) {
          throw new Error("rnp_op_sign_set_hash failed");
        }
        // TODO, map args.signatureHash string to RNP and call
        //       rnp_op_encrypt_set_hash

        if (RNPLib.rnp_op_sign_set_armor(op, args.armor)) {
          throw new Error("rnp_op_sign_set_armor failed");
        }

        if (RNPLib.rnp_op_sign_execute(op)) {
          throw new Error("rnp_op_sign_execute failed");
        }
        RNPLib.rnp_op_sign_destroy(op);
      }
    } finally {
      if (subKeyTracker) {
        subKeyTracker.release();
      }
      if (senderKeyTracker) {
        senderKeyTracker.release();
      }
    }

    RNPLib.rnp_input_destroy(input);

    let result = null;

    let result_buf = new lazy.ctypes.uint8_t.ptr();
    let result_len = new lazy.ctypes.size_t();
    if (
      !RNPLib.rnp_output_memory_get_buf(
        output,
        result_buf.address(),
        result_len.address(),
        false
      )
    ) {
      let char_array = lazy.ctypes.cast(
        result_buf,
        lazy.ctypes.char.array(result_len.value).ptr
      ).contents;

      result = char_array.readString();
    }

    RNPLib.rnp_output_destroy(output);

    resultStatus.exitCode = 0;

    if (args.encrypt) {
      resultStatus.statusFlags |= lazy.EnigmailConstants.END_ENCRYPTION;
    }

    if (args.sign) {
      resultStatus.statusFlags |= lazy.EnigmailConstants.SIG_CREATED;
    }

    return result;
  },

  /**
   * @param {number} expiryTime - Time to check, in seconds from the epoch.
   * @returns {boolean} - true if the given time is after now.
   */
  isExpiredTime(expiryTime) {
    if (!expiryTime) {
      return false;
    }
    let nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds > expiryTime;
  },

  isKeyExpired(handle) {
    let expiration = new lazy.ctypes.uint32_t();
    if (RNPLib.rnp_key_get_expiration(handle, expiration.address())) {
      throw new Error("rnp_key_get_expiration failed");
    }
    if (!expiration.value) {
      return false;
    }

    let created = this.getKeyCreatedValueFromHandle(handle);
    let expirationSeconds = created + expiration.value;
    return this.isExpiredTime(expirationSeconds);
  },

  async findKeyByEmail(id, onlyIfAcceptableAsRecipientKey = false) {
    if (!id.startsWith("<") || !id.endsWith(">") || id.includes(" ")) {
      throw new Error(`Invalid argument; id=${id}`);
    }

    let emailWithoutBrackets = id.substring(1, id.length - 1);

    let iter = new RNPLib.rnp_identifier_iterator_t();
    let grip = new lazy.ctypes.char.ptr();

    if (
      RNPLib.rnp_identifier_iterator_create(RNPLib.ffi, iter.address(), "grip")
    ) {
      throw new Error("rnp_identifier_iterator_create failed");
    }

    let foundHandle = null;
    let tentativeUnverifiedHandle = null;

    while (
      !foundHandle &&
      !RNPLib.rnp_identifier_iterator_next(iter, grip.address())
    ) {
      if (grip.isNull()) {
        break;
      }

      let have_handle = false;
      let handle = new RNPLib.rnp_key_handle_t();

      try {
        let is_subkey = new lazy.ctypes.bool();
        let uid_count = new lazy.ctypes.size_t();

        if (RNPLib.rnp_locate_key(RNPLib.ffi, "grip", grip, handle.address())) {
          throw new Error("rnp_locate_key failed");
        }
        have_handle = true;
        if (RNPLib.rnp_key_is_sub(handle, is_subkey.address())) {
          throw new Error("rnp_key_is_sub failed");
        }
        if (is_subkey.value) {
          continue;
        }
        if (this.isBadKey(handle, null, RNPLib.ffi)) {
          continue;
        }
        let key_revoked = new lazy.ctypes.bool();
        if (RNPLib.rnp_key_is_revoked(handle, key_revoked.address())) {
          throw new Error("rnp_key_is_revoked failed");
        }

        if (key_revoked.value) {
          continue;
        }

        if (this.isKeyExpired(handle)) {
          continue;
        }

        if (RNPLib.rnp_key_get_uid_count(handle, uid_count.address())) {
          throw new Error("rnp_key_get_uid_count failed");
        }

        let foundUid = false;
        for (let i = 0; i < uid_count.value && !foundUid; i++) {
          let uid_handle = new RNPLib.rnp_uid_handle_t();

          if (
            RNPLib.rnp_key_get_uid_handle_at(handle, i, uid_handle.address())
          ) {
            throw new Error("rnp_key_get_uid_handle_at failed");
          }

          if (!this.isBadUid(uid_handle) && !this.isRevokedUid(uid_handle)) {
            let uid_str = new lazy.ctypes.char.ptr();
            if (RNPLib.rnp_key_get_uid_at(handle, i, uid_str.address())) {
              throw new Error("rnp_key_get_uid_at failed");
            }

            let userId = uid_str.readStringReplaceMalformed();
            RNPLib.rnp_buffer_destroy(uid_str);

            if (
              lazy.EnigmailFuncs.getEmailFromUserID(userId).toLowerCase() ==
              emailWithoutBrackets
            ) {
              foundUid = true;

              if (onlyIfAcceptableAsRecipientKey) {
                // a key is acceptable, either:
                // - without secret key, it's accepted verified or unverified
                // - with secret key, must be marked as personal

                let have_secret = new lazy.ctypes.bool();
                if (RNPLib.rnp_key_have_secret(handle, have_secret.address())) {
                  throw new Error("rnp_key_have_secret failed");
                }

                let fingerprint = new lazy.ctypes.char.ptr();
                if (RNPLib.rnp_key_get_fprint(handle, fingerprint.address())) {
                  throw new Error("rnp_key_get_fprint failed");
                }
                let fpr = fingerprint.readString();
                RNPLib.rnp_buffer_destroy(fingerprint);

                if (have_secret.value) {
                  let isAccepted =
                    await lazy.PgpSqliteDb2.isAcceptedAsPersonalKey(fpr);
                  if (isAccepted) {
                    foundHandle = handle;
                    have_handle = false;
                    if (tentativeUnverifiedHandle) {
                      RNPLib.rnp_key_handle_destroy(tentativeUnverifiedHandle);
                      tentativeUnverifiedHandle = null;
                    }
                  }
                } else {
                  let acceptanceResult = {};
                  try {
                    await lazy.PgpSqliteDb2.getAcceptance(
                      fpr,
                      emailWithoutBrackets,
                      acceptanceResult
                    );
                  } catch (ex) {
                    console.debug("getAcceptance failed: " + ex);
                  }

                  if (!acceptanceResult.emailDecided) {
                    continue;
                  }
                  if (acceptanceResult.fingerprintAcceptance == "unverified") {
                    /* keep searching for a better, verified key */
                    if (!tentativeUnverifiedHandle) {
                      tentativeUnverifiedHandle = handle;
                      have_handle = false;
                    }
                  } else if (
                    acceptanceResult.fingerprintAcceptance == "verified"
                  ) {
                    foundHandle = handle;
                    have_handle = false;
                    if (tentativeUnverifiedHandle) {
                      RNPLib.rnp_key_handle_destroy(tentativeUnverifiedHandle);
                      tentativeUnverifiedHandle = null;
                    }
                  }
                }
              } else {
                foundHandle = handle;
                have_handle = false;
              }
            }
          }
          RNPLib.rnp_uid_handle_destroy(uid_handle);
        }
      } catch (ex) {
        console.log(ex);
      } finally {
        if (have_handle) {
          RNPLib.rnp_key_handle_destroy(handle);
        }
      }
    }

    if (!foundHandle && tentativeUnverifiedHandle) {
      foundHandle = tentativeUnverifiedHandle;
      tentativeUnverifiedHandle = null;
    }

    RNPLib.rnp_identifier_iterator_destroy(iter);
    return foundHandle;
  },

  async getPublicKey(id, store = RNPLib.ffi) {
    let result = "";
    let key = await this.getKeyHandleByIdentifier(store, id);

    if (key.isNull()) {
      return result;
    }

    let flags =
      RNPLib.RNP_KEY_EXPORT_ARMORED |
      RNPLib.RNP_KEY_EXPORT_PUBLIC |
      RNPLib.RNP_KEY_EXPORT_SUBKEYS;

    let output_to_memory = new RNPLib.rnp_output_t();
    RNPLib.rnp_output_to_memory(output_to_memory.address(), 0);

    if (RNPLib.rnp_key_export(key, output_to_memory, flags)) {
      throw new Error("rnp_key_export failed");
    }

    let result_buf = new lazy.ctypes.uint8_t.ptr();
    let result_len = new lazy.ctypes.size_t();
    let exitCode = RNPLib.rnp_output_memory_get_buf(
      output_to_memory,
      result_buf.address(),
      result_len.address(),
      false
    );

    if (!exitCode) {
      let char_array = lazy.ctypes.cast(
        result_buf,
        lazy.ctypes.char.array(result_len.value).ptr
      ).contents;

      result = char_array.readString();
    }

    RNPLib.rnp_output_destroy(output_to_memory);
    RNPLib.rnp_key_handle_destroy(key);
    return result;
  },

  /**
   * Exports a public key, strips all signatures added by others,
   * and optionally also strips user IDs. Self-signatures are kept.
   * The given key handle will not be modified. The input key will be
   * copied to a temporary area, only the temporary copy will be
   * modified. The result key will be streamed to the given output.
   *
   * @param {rnp_key_handle_t} expKey - RNP key handle
   * @param {boolean} keepUserIDs - if true keep users IDs
   * @param {rnp_output_t} out_binary - output stream handle
   *
   */
  export_pubkey_strip_sigs_uids(expKey, keepUserIDs, out_binary) {
    let expKeyId = this.getKeyIDFromHandle(expKey);

    let tempFFI = RNPLib.prepare_ffi();
    if (!tempFFI) {
      throw new Error("Couldn't initialize librnp.");
    }

    let exportFlags =
      RNPLib.RNP_KEY_EXPORT_SUBKEYS | RNPLib.RNP_KEY_EXPORT_PUBLIC;
    let importFlags = RNPLib.RNP_LOAD_SAVE_PUBLIC_KEYS;

    let output_to_memory = new RNPLib.rnp_output_t();
    if (RNPLib.rnp_output_to_memory(output_to_memory.address(), 0)) {
      throw new Error("rnp_output_to_memory failed");
    }

    if (RNPLib.rnp_key_export(expKey, output_to_memory, exportFlags)) {
      throw new Error("rnp_key_export failed");
    }

    let result_buf = new lazy.ctypes.uint8_t.ptr();
    let result_len = new lazy.ctypes.size_t();
    if (
      RNPLib.rnp_output_memory_get_buf(
        output_to_memory,
        result_buf.address(),
        result_len.address(),
        false
      )
    ) {
      throw new Error("rnp_output_memory_get_buf failed");
    }

    let input_from_memory = new RNPLib.rnp_input_t();

    if (
      RNPLib.rnp_input_from_memory(
        input_from_memory.address(),
        result_buf,
        result_len,
        false
      )
    ) {
      throw new Error("rnp_input_from_memory failed");
    }

    if (RNPLib.rnp_import_keys(tempFFI, input_from_memory, importFlags, null)) {
      throw new Error("rnp_import_keys failed");
    }

    let tempKey = this.getKeyHandleByKeyIdOrFingerprint(
      tempFFI,
      "0x" + expKeyId
    );

    // Strip

    if (!keepUserIDs) {
      let uid_count = new lazy.ctypes.size_t();
      if (RNPLib.rnp_key_get_uid_count(tempKey, uid_count.address())) {
        throw new Error("rnp_key_get_uid_count failed");
      }
      for (let i = uid_count.value; i > 0; i--) {
        let uid_handle = new RNPLib.rnp_uid_handle_t();
        if (
          RNPLib.rnp_key_get_uid_handle_at(tempKey, i - 1, uid_handle.address())
        ) {
          throw new Error("rnp_key_get_uid_handle_at failed");
        }
        if (RNPLib.rnp_uid_remove(tempKey, uid_handle)) {
          throw new Error("rnp_uid_remove failed");
        }
        RNPLib.rnp_uid_handle_destroy(uid_handle);
      }
    }

    if (
      RNPLib.rnp_key_remove_signatures(
        tempKey,
        RNPLib.RNP_KEY_SIGNATURE_NON_SELF_SIG,
        null,
        null
      )
    ) {
      throw new Error("rnp_key_remove_signatures failed");
    }

    if (RNPLib.rnp_key_export(tempKey, out_binary, exportFlags)) {
      throw new Error("rnp_key_export failed");
    }
    RNPLib.rnp_key_handle_destroy(tempKey);

    RNPLib.rnp_input_destroy(input_from_memory);
    RNPLib.rnp_output_destroy(output_to_memory);
    RNPLib.rnp_ffi_destroy(tempFFI);
  },

  /**
   * Export one or multiple public keys.
   *
   * @param {string[]} idArrayFull - an array of key IDs or fingerprints
   *   that should be exported as full keys including all attributes.
   * @param {string[]} idArrayReduced - an array of key IDs or
   *   fingerprints that should be exported with all self-signatures,
   *   but without signatures from others.
   * @param {string[]} idArrayMinimal - an array of key IDs or
   *   fingerprints that should be exported as minimized keys.
   * @returns {string} - An ascii armored key block containing all
   *   requested (available) keys.
   */
  getMultiplePublicKeys(idArrayFull, idArrayReduced, idArrayMinimal) {
    let out_final = new RNPLib.rnp_output_t();
    RNPLib.rnp_output_to_memory(out_final.address(), 0);

    let out_binary = new RNPLib.rnp_output_t();
    let rv;
    if (
      (rv = RNPLib.rnp_output_to_armor(
        out_final,
        out_binary.address(),
        "public key"
      ))
    ) {
      throw new Error("rnp_output_to_armor failed:" + rv);
    }

    if ((rv = RNPLib.rnp_output_armor_set_line_length(out_binary, 64))) {
      throw new Error("rnp_output_armor_set_line_length failed:" + rv);
    }

    let flags = RNPLib.RNP_KEY_EXPORT_PUBLIC | RNPLib.RNP_KEY_EXPORT_SUBKEYS;

    if (idArrayFull) {
      for (let id of idArrayFull) {
        let key = this.getKeyHandleByKeyIdOrFingerprint(RNPLib.ffi, id);
        if (key.isNull()) {
          continue;
        }

        if (RNPLib.rnp_key_export(key, out_binary, flags)) {
          throw new Error("rnp_key_export failed");
        }

        RNPLib.rnp_key_handle_destroy(key);
      }
    }

    if (idArrayReduced) {
      for (let id of idArrayReduced) {
        let key = this.getPrimaryKeyHandleByKeyIdOrFingerprint(RNPLib.ffi, id);
        if (key.isNull()) {
          continue;
        }

        this.export_pubkey_strip_sigs_uids(key, true, out_binary);

        RNPLib.rnp_key_handle_destroy(key);
      }
    }

    if (idArrayMinimal) {
      for (let id of idArrayMinimal) {
        let key = this.getPrimaryKeyHandleByKeyIdOrFingerprint(RNPLib.ffi, id);
        if (key.isNull()) {
          continue;
        }

        this.export_pubkey_strip_sigs_uids(key, false, out_binary);

        RNPLib.rnp_key_handle_destroy(key);
      }
    }

    if ((rv = RNPLib.rnp_output_finish(out_binary))) {
      throw new Error("rnp_output_finish failed: " + rv);
    }

    let result_buf = new lazy.ctypes.uint8_t.ptr();
    let result_len = new lazy.ctypes.size_t();
    let exitCode = RNPLib.rnp_output_memory_get_buf(
      out_final,
      result_buf.address(),
      result_len.address(),
      false
    );

    let result = "";
    if (!exitCode) {
      let char_array = lazy.ctypes.cast(
        result_buf,
        lazy.ctypes.char.array(result_len.value).ptr
      ).contents;
      result = char_array.readString();
    }

    RNPLib.rnp_output_destroy(out_binary);
    RNPLib.rnp_output_destroy(out_final);

    return result;
  },

  /**
   * The RNP library may store keys in a format that isn't compatible
   * with GnuPG, see bug 1713621 for an example where this happened.
   *
   * This function modifies the input key to make it compatible.
   *
   * The caller must ensure that the key is unprotected when calling
   * this function, and must apply the desired protection afterwards.
   */
  ensureECCSubkeyIsGnuPGCompatible(tempKey) {
    let algo = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_key_get_alg(tempKey, algo.address())) {
      throw new Error("rnp_key_get_alg failed");
    }
    let algoStr = algo.readString();
    RNPLib.rnp_buffer_destroy(algo);

    if (algoStr.toLowerCase() != "ecdh") {
      return;
    }

    let curve = new lazy.ctypes.char.ptr();
    if (RNPLib.rnp_key_get_curve(tempKey, curve.address())) {
      throw new Error("rnp_key_get_curve failed");
    }
    let curveStr = curve.readString();
    RNPLib.rnp_buffer_destroy(curve);

    if (curveStr.toLowerCase() != "curve25519") {
      return;
    }

    let tweak_status = new lazy.ctypes.bool();
    let rc = RNPLib.rnp_key_25519_bits_tweaked(tempKey, tweak_status.address());
    if (rc) {
      throw new Error("rnp_key_25519_bits_tweaked failed: " + rc);
    }

    // If it's not tweaked yet, then tweak to make it compatible.
    if (!tweak_status.value) {
      rc = RNPLib.rnp_key_25519_bits_tweak(tempKey);
      if (rc) {
        throw new Error("rnp_key_25519_bits_tweak failed: " + rc);
      }
    }
  },

  async backupSecretKeys(fprs, backupPassword) {
    if (!fprs.length) {
      throw new Error("invalid fprs parameter");
    }

    /*
     * Strategy:
     * - copy keys to a temporary space, in-memory only (ffi)
     * - if we failed to decrypt the secret keys, return null
     * - change the password of all secret keys in the temporary space
     * - export from the temporary space
     */

    let out_final = new RNPLib.rnp_output_t();
    RNPLib.rnp_output_to_memory(out_final.address(), 0);

    let out_binary = new RNPLib.rnp_output_t();
    let rv;
    if (
      (rv = RNPLib.rnp_output_to_armor(
        out_final,
        out_binary.address(),
        "secret key"
      ))
    ) {
      throw new Error("rnp_output_to_armor failed:" + rv);
    }

    let tempFFI = RNPLib.prepare_ffi();
    if (!tempFFI) {
      throw new Error("Couldn't initialize librnp.");
    }

    let exportFlags =
      RNPLib.RNP_KEY_EXPORT_SUBKEYS | RNPLib.RNP_KEY_EXPORT_SECRET;
    let importFlags =
      RNPLib.RNP_LOAD_SAVE_PUBLIC_KEYS | RNPLib.RNP_LOAD_SAVE_SECRET_KEYS;

    let unlockFailed = false;
    let pwCache = {
      passwords: [],
    };

    for (let fpr of fprs) {
      let fprStr = fpr;
      let expKey = await this.getKeyHandleByIdentifier(
        RNPLib.ffi,
        "0x" + fprStr
      );

      let output_to_memory = new RNPLib.rnp_output_t();
      if (RNPLib.rnp_output_to_memory(output_to_memory.address(), 0)) {
        throw new Error("rnp_output_to_memory failed");
      }

      if (RNPLib.rnp_key_export(expKey, output_to_memory, exportFlags)) {
        throw new Error("rnp_key_export failed");
      }
      RNPLib.rnp_key_handle_destroy(expKey);
      expKey = null;

      let result_buf = new lazy.ctypes.uint8_t.ptr();
      let result_len = new lazy.ctypes.size_t();
      if (
        RNPLib.rnp_output_memory_get_buf(
          output_to_memory,
          result_buf.address(),
          result_len.address(),
          false
        )
      ) {
        throw new Error("rnp_output_memory_get_buf failed");
      }

      let input_from_memory = new RNPLib.rnp_input_t();
      if (
        RNPLib.rnp_input_from_memory(
          input_from_memory.address(),
          result_buf,
          result_len,
          false
        )
      ) {
        throw new Error("rnp_input_from_memory failed");
      }

      if (
        RNPLib.rnp_import_keys(tempFFI, input_from_memory, importFlags, null)
      ) {
        throw new Error("rnp_import_keys failed");
      }

      RNPLib.rnp_input_destroy(input_from_memory);
      RNPLib.rnp_output_destroy(output_to_memory);
      input_from_memory = null;
      output_to_memory = null;
      result_buf = null;

      let tracker = RnpPrivateKeyUnlockTracker.constructFromFingerprint(
        fprStr,
        tempFFI
      );
      if (!tracker.available()) {
        tracker.release();
        continue;
      }

      tracker.setAllowPromptingUserForPassword(true);
      tracker.setAllowAutoUnlockWithCachedPasswords(true);
      tracker.setPasswordCache(pwCache);
      tracker.setRememberUnlockPassword(true);

      await tracker.unlock();
      if (!tracker.isUnlocked()) {
        unlockFailed = true;
        tracker.release();
        break;
      }

      tracker.unprotect();
      tracker.setPassphrase(backupPassword);

      let sub_count = new lazy.ctypes.size_t();
      if (
        RNPLib.rnp_key_get_subkey_count(
          tracker.getHandle(),
          sub_count.address()
        )
      ) {
        throw new Error("rnp_key_get_subkey_count failed");
      }
      for (let i = 0; i < sub_count.value; i++) {
        let sub_handle = new RNPLib.rnp_key_handle_t();
        if (
          RNPLib.rnp_key_get_subkey_at(
            tracker.getHandle(),
            i,
            sub_handle.address()
          )
        ) {
          throw new Error("rnp_key_get_subkey_at failed");
        }

        let subTracker = new RnpPrivateKeyUnlockTracker(sub_handle);
        if (subTracker.available()) {
          subTracker.setAllowPromptingUserForPassword(true);
          subTracker.setAllowAutoUnlockWithCachedPasswords(true);
          subTracker.setPasswordCache(pwCache);
          subTracker.setRememberUnlockPassword(true);

          await subTracker.unlock();
          if (!subTracker.isUnlocked()) {
            unlockFailed = true;
          } else {
            subTracker.unprotect();
            this.ensureECCSubkeyIsGnuPGCompatible(subTracker.getHandle());
            subTracker.setPassphrase(backupPassword);
          }
        }
        subTracker.release();
        if (unlockFailed) {
          break;
        }
      }

      if (
        !unlockFailed &&
        RNPLib.rnp_key_export(tracker.getHandle(), out_binary, exportFlags)
      ) {
        throw new Error("rnp_key_export failed");
      }

      tracker.release();
      if (unlockFailed) {
        break;
      }
    }
    RNPLib.rnp_ffi_destroy(tempFFI);

    let result = "";
    if (!unlockFailed) {
      if ((rv = RNPLib.rnp_output_finish(out_binary))) {
        throw new Error("rnp_output_finish failed: " + rv);
      }

      let result_buf = new lazy.ctypes.uint8_t.ptr();
      let result_len = new lazy.ctypes.size_t();
      let exitCode = RNPLib.rnp_output_memory_get_buf(
        out_final,
        result_buf.address(),
        result_len.address(),
        false
      );

      if (!exitCode) {
        let char_array = lazy.ctypes.cast(
          result_buf,
          lazy.ctypes.char.array(result_len.value).ptr
        ).contents;
        result = char_array.readString();
      }
    }

    RNPLib.rnp_output_destroy(out_binary);
    RNPLib.rnp_output_destroy(out_final);

    return result;
  },

  async unlockAndGetNewRevocation(id, pass) {
    let result = "";
    let key = await this.getKeyHandleByIdentifier(RNPLib.ffi, id);

    if (key.isNull()) {
      return result;
    }

    let tracker = new RnpPrivateKeyUnlockTracker(key);
    tracker.setAllowPromptingUserForPassword(false);
    tracker.setAllowAutoUnlockWithCachedPasswords(false);
    tracker.unlockWithPassword(pass);
    if (!tracker.isUnlocked()) {
      throw new Error(`Couldn't unlock key ${key.fpr}`);
    }

    let out_final = new RNPLib.rnp_output_t();
    RNPLib.rnp_output_to_memory(out_final.address(), 0);

    let out_binary = new RNPLib.rnp_output_t();
    let rv;
    if (
      (rv = RNPLib.rnp_output_to_armor(
        out_final,
        out_binary.address(),
        "public key"
      ))
    ) {
      throw new Error("rnp_output_to_armor failed:" + rv);
    }

    if (
      (rv = RNPLib.rnp_key_export_revocation(
        key,
        out_binary,
        0,
        null,
        null,
        null
      ))
    ) {
      throw new Error("rnp_key_export_revocation failed: " + rv);
    }

    if ((rv = RNPLib.rnp_output_finish(out_binary))) {
      throw new Error("rnp_output_finish failed: " + rv);
    }

    let result_buf = new lazy.ctypes.uint8_t.ptr();
    let result_len = new lazy.ctypes.size_t();
    let exitCode = RNPLib.rnp_output_memory_get_buf(
      out_final,
      result_buf.address(),
      result_len.address(),
      false
    );

    if (!exitCode) {
      let char_array = lazy.ctypes.cast(
        result_buf,
        lazy.ctypes.char.array(result_len.value).ptr
      ).contents;
      result = char_array.readString();
    }

    RNPLib.rnp_output_destroy(out_binary);
    RNPLib.rnp_output_destroy(out_final);
    tracker.release();
    return result;
  },

  enArmorString(input, type) {
    let arr = input.split("").map(e => e.charCodeAt());
    let input_array = lazy.ctypes.uint8_t.array()(arr);

    return this.enArmorCData(input_array, input_array.length, type);
  },

  enArmorCDataMessage(buf, len) {
    return this.enArmorCData(buf, len, "message");
  },

  enArmorCData(buf, len, type) {
    let input_array = lazy.ctypes.cast(buf, lazy.ctypes.uint8_t.array(len));

    let input_from_memory = new RNPLib.rnp_input_t();
    RNPLib.rnp_input_from_memory(
      input_from_memory.address(),
      input_array,
      len,
      false
    );

    let max_out = len * 2 + 150; // extra bytes for head/tail/hash lines

    let output_to_memory = new RNPLib.rnp_output_t();
    RNPLib.rnp_output_to_memory(output_to_memory.address(), max_out);

    if (RNPLib.rnp_enarmor(input_from_memory, output_to_memory, type)) {
      throw new Error("rnp_enarmor failed");
    }

    let result = "";
    let result_buf = new lazy.ctypes.uint8_t.ptr();
    let result_len = new lazy.ctypes.size_t();
    if (
      !RNPLib.rnp_output_memory_get_buf(
        output_to_memory,
        result_buf.address(),
        result_len.address(),
        false
      )
    ) {
      let char_array = lazy.ctypes.cast(
        result_buf,
        lazy.ctypes.char.array(result_len.value).ptr
      ).contents;

      result = char_array.readString();
    }

    RNPLib.rnp_input_destroy(input_from_memory);
    RNPLib.rnp_output_destroy(output_to_memory);

    return result;
  },

  // Will change the expiration date of all given keys to newExpiry.
  // fingerprintArray is an array, containing fingerprints, both
  // primary key fingerprints and subkey fingerprints are allowed.
  // The function assumes that all involved keys have already been
  // unlocked. We shouldn't rely on password callbacks for unlocking,
  // as it would be confusing if only some keys are changed.
  async changeExpirationDate(fingerprintArray, newExpiry) {
    for (let fingerprint of fingerprintArray) {
      let handle = this.getKeyHandleByKeyIdOrFingerprint(
        RNPLib.ffi,
        "0x" + fingerprint
      );

      if (handle.isNull()) {
        continue;
      }

      if (RNPLib.rnp_key_set_expiration(handle, newExpiry)) {
        throw new Error(`rnp_key_set_expiration failed for ${fingerprint}`);
      }
      RNPLib.rnp_key_handle_destroy(handle);
    }

    await this.saveKeyRings();
    return true;
  },

  /**
   * Get a minimal Autocrypt-compatible key for the given key ID.
   * If subKeyId is given, it must refer to an existing encryption subkey.
   * This is a wrapper around RNP function rnp_key_export_autocrypt.
   *
   * @param {string} primaryKeyId - the ID of a primary key
   * @param {?string} subKeyId - the ID of an encryption subkey or null
   * @param {string} uidString - the ID of a primary key
   * @returns {string} - The encoded key, or the empty string on failure.
   */
  getAutocryptKeyB64(primaryKeyId, subKeyId, uidString) {
    let subHandle = null;

    if (subKeyId) {
      subHandle = this.getKeyHandleByKeyIdOrFingerprint(RNPLib.ffi, subKeyId);
      if (subHandle.isNull()) {
        // Although subKeyId is optional, if it's given, it must be valid.
        return "";
      }
    }

    let primHandle = this.getKeyHandleByKeyIdOrFingerprint(
      RNPLib.ffi,
      primaryKeyId
    );

    let output_to_memory = new RNPLib.rnp_output_t();
    if (RNPLib.rnp_output_to_memory(output_to_memory.address(), 0)) {
      throw new Error("rnp_output_to_memory failed");
    }

    let result = "";

    if (!primHandle.isNull()) {
      if (
        RNPLib.rnp_key_export_autocrypt(
          primHandle,
          subHandle,
          uidString,
          output_to_memory,
          0
        )
      ) {
        console.debug("rnp_key_export_autocrypt failed");
      } else {
        let result_buf = new lazy.ctypes.uint8_t.ptr();
        let result_len = new lazy.ctypes.size_t();
        let rv = RNPLib.rnp_output_memory_get_buf(
          output_to_memory,
          result_buf.address(),
          result_len.address(),
          false
        );

        if (!rv) {
          // result_len is of type UInt64, I don't know of a better way
          // to convert it to an integer.
          let b_len = parseInt(result_len.value.toString());

          // type casting the pointer type to an array type allows us to
          // access the elements by index.
          let uint8_array = lazy.ctypes.cast(
            result_buf,
            lazy.ctypes.uint8_t.array(result_len.value).ptr
          ).contents;

          let str = "";
          for (let i = 0; i < b_len; i++) {
            str += String.fromCharCode(uint8_array[i]);
          }

          result = btoa(str);
        }
      }
    }

    RNPLib.rnp_output_destroy(output_to_memory);

    if (!primHandle.isNull()) {
      RNPLib.rnp_key_handle_destroy(primHandle);
    }
    if (subHandle) {
      RNPLib.rnp_key_handle_destroy(subHandle);
    }
    return result;
  },

  /**
   * Helper function to produce the string that will be shown to the
   * user, when the user is asked to unlock a key. If the key is a
   * subkey, it might help to user to identify the respective key by
   * also mentioning the key ID of the primary key, so both IDs are
   * shown when prompting to unlock a subkey.
   * Parameter nonDefaultFFI is required, if the prompt is related to
   * a key that isn't (yet) stored in the global storage, for example
   * a key that is being prepared for import or export in a temporary
   * ffi space.
   *
   * @param {rnp_key_handle_t} handle - produce a passphrase prompt
   *   string based on the properties of this key.
   * @param {rnp_ffi_t} ffi - the RNP FFI that relates the handle
   * @returns {String} - a string that asks the user to enter the
   *   passphrase for the given string parameter, including details
   *   that allow the user to identify the key.
   */
  async getPassphrasePrompt(handle, ffi) {
    let parentOfHandle = this.getPrimaryKeyHandleIfSub(ffi, handle);
    let useThisHandle = !parentOfHandle.isNull() ? parentOfHandle : handle;

    let keyObj = {};
    if (
      !this.getKeyInfoFromHandle(ffi, useThisHandle, keyObj, false, true, true)
    ) {
      return "";
    }

    let mainKeyId = keyObj.keyId;
    let subKeyId;
    if (!parentOfHandle.isNull()) {
      subKeyId = this.getKeyIDFromHandle(handle);
    }

    if (subKeyId) {
      return l10n.formatValue("passphrase-prompt2-sub", {
        subkey: subKeyId,
        key: mainKeyId,
        date: keyObj.created,
        username_and_email: keyObj.userId,
      });
    }
    return l10n.formatValue("passphrase-prompt2", {
      key: mainKeyId,
      date: keyObj.created,
      username_and_email: keyObj.userId,
    });
  },
};
