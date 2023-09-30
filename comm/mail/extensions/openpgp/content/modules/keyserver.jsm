/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

const EXPORTED_SYMBOLS = ["EnigmailKeyServer"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  EnigmailConstants: "chrome://openpgp/content/modules/constants.jsm",
  EnigmailCryptoAPI: "chrome://openpgp/content/modules/cryptoAPI.jsm",
  EnigmailData: "chrome://openpgp/content/modules/data.jsm",
  EnigmailFuncs: "chrome://openpgp/content/modules/funcs.jsm",
  EnigmailKeyRing: "chrome://openpgp/content/modules/keyRing.jsm",
  EnigmailLog: "chrome://openpgp/content/modules/log.jsm",
  FeedUtils: "resource:///modules/FeedUtils.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "l10n", () => {
  return new Localization(["messenger/openpgp/openpgp.ftl"], true);
});

const ENIG_DEFAULT_HKP_PORT = "11371";
const ENIG_DEFAULT_HKPS_PORT = "443";
const ENIG_DEFAULT_LDAP_PORT = "389";

/**
 KeySrvListener API
 Object implementing:
  - onProgress: function(percentComplete) [only implemented for download()]
  - onCancel: function() - the body will be set by the callee
*/

function createError(errId) {
  let msg = "";

  switch (errId) {
    case lazy.EnigmailConstants.KEYSERVER_ERR_ABORTED:
      msg = lazy.l10n.formatValueSync("keyserver-error-aborted");
      break;
    case lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR:
      msg = lazy.l10n.formatValueSync("keyserver-error-server-error");
      break;
    case lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_UNAVAILABLE:
      msg = lazy.l10n.formatValueSync("keyserver-error-unavailable");
      break;
    case lazy.EnigmailConstants.KEYSERVER_ERR_SECURITY_ERROR:
      msg = lazy.l10n.formatValueSync("keyserver-error-security-error");
      break;
    case lazy.EnigmailConstants.KEYSERVER_ERR_CERTIFICATE_ERROR:
      msg = lazy.l10n.formatValueSync("keyserver-error-certificate-error");
      break;
    case lazy.EnigmailConstants.KEYSERVER_ERR_IMPORT_ERROR:
      msg = lazy.l10n.formatValueSync("keyserver-error-import-error");
      break;
    case lazy.EnigmailConstants.KEYSERVER_ERR_UNKNOWN:
      msg = lazy.l10n.formatValueSync("keyserver-error-unknown");
      break;
  }

  return {
    result: errId,
    errorDetails: msg,
  };
}

/**
 * parse a keyserver specification and return host, protocol and port
 *
 * @param keyserver: String - name of keyserver with optional protocol and port.
 *                       E.g. keys.gnupg.net, hkps://keys.gnupg.net:443
 *
 * @returns Object: {port, host, protocol} (all Strings)
 */
function parseKeyserverUrl(keyserver) {
  if (keyserver.length > 1024) {
    // insane length of keyserver is forbidden
    throw Components.Exception("", Cr.NS_ERROR_FAILURE);
  }

  keyserver = keyserver.toLowerCase().trim();
  let protocol = "";
  if (keyserver.search(/^[a-zA-Z0-9_.-]+:\/\//) === 0) {
    protocol = keyserver.replace(/^([a-zA-Z0-9_.-]+)(:\/\/.*)/, "$1");
    keyserver = keyserver.replace(/^[a-zA-Z0-9_.-]+:\/\//, "");
  } else {
    protocol = "hkp";
  }

  let port = "";
  switch (protocol) {
    case "hkp":
      port = ENIG_DEFAULT_HKP_PORT;
      break;
    case "https":
    case "hkps":
      port = ENIG_DEFAULT_HKPS_PORT;
      break;
    case "ldap":
      port = ENIG_DEFAULT_LDAP_PORT;
      break;
  }

  let m = keyserver.match(/^(.+)(:)(\d+)$/);
  if (m && m.length == 4) {
    keyserver = m[1];
    port = m[3];
  }

  if (keyserver.search(/^(keys\.mailvelope\.com|api\.protonmail\.ch)$/) === 0) {
    protocol = "hkps";
    port = ENIG_DEFAULT_HKPS_PORT;
  }
  if (keyserver.search(/^(keybase\.io)$/) === 0) {
    protocol = "keybase";
    port = ENIG_DEFAULT_HKPS_PORT;
  }

  return {
    protocol,
    host: keyserver,
    port,
  };
}

/**
 Object to handle HKP/HKPS requests via builtin XMLHttpRequest()
 */
const accessHkpInternal = {
  /**
   * Create the payload of hkp requests (upload only)
   *
   */
  async buildHkpPayload(actionFlag, searchTerms) {
    switch (actionFlag) {
      case lazy.EnigmailConstants.UPLOAD_KEY:
        let exitCodeObj = {};
        let keyData = await lazy.EnigmailKeyRing.extractPublicKeys(
          ["0x" + searchTerms], // TODO: confirm input is ID or fingerprint
          null,
          null,
          null,
          exitCodeObj,
          {}
        );
        if (exitCodeObj.value !== 0 || keyData.length === 0) {
          return null;
        }
        return 'keytext="' + encodeURIComponent(keyData) + '"';

      case lazy.EnigmailConstants.DOWNLOAD_KEY:
      case lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT:
      case lazy.EnigmailConstants.SEARCH_KEY:
        return "";
    }

    // other actions are not yet implemented
    return null;
  },

  /**
   * return the URL and the HTTP access method for a given action
   */
  createRequestUrl(keyserver, actionFlag, searchTerm) {
    let keySrv = parseKeyserverUrl(keyserver);

    let method = "GET";
    let protocol;

    switch (keySrv.protocol) {
      case "hkp":
        protocol = "http";
        break;
      case "ldap":
        throw Components.Exception("", Cr.NS_ERROR_FAILURE);
      default:
        // equals to hkps
        protocol = "https";
    }

    let url = protocol + "://" + keySrv.host + ":" + keySrv.port;

    if (actionFlag === lazy.EnigmailConstants.UPLOAD_KEY) {
      url += "/pks/add";
      method = "POST";
    } else if (
      actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY ||
      actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT
    ) {
      if (searchTerm.indexOf("0x") !== 0) {
        searchTerm = "0x" + searchTerm;
      }
      url += "/pks/lookup?search=" + searchTerm + "&op=get&options=mr";
    } else if (actionFlag === lazy.EnigmailConstants.SEARCH_KEY) {
      url +=
        "/pks/lookup?search=" +
        escape(searchTerm) +
        "&fingerprint=on&op=index&options=mr&exact=on";
    }

    return {
      url,
      host: keySrv.host,
      method,
    };
  },

  /**
   * Upload, search or download keys from a keyserver
   *
   * @param actionFlag:  Number  - Keyserver Action Flags: from EnigmailConstants
   * @param keyId:      String  - space-separated list of search terms or key IDs
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Number (Status-ID)>
   */
  async accessKeyServer(actionFlag, keyserver, keyId, listener) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessHkpInternal.accessKeyServer(${keyserver})\n`
    );
    if (!keyserver) {
      throw new Error("accessKeyServer requires explicit keyserver parameter");
    }

    let payLoad = await this.buildHkpPayload(actionFlag, keyId);

    return new Promise((resolve, reject) => {
      let xmlReq = null;
      if (listener && typeof listener === "object") {
        listener.onCancel = function () {
          lazy.EnigmailLog.DEBUG(
            `keyserver.jsm: accessHkpInternal.accessKeyServer - onCancel() called\n`
          );
          if (xmlReq) {
            xmlReq.abort();
          }
          reject(createError(lazy.EnigmailConstants.KEYSERVER_ERR_ABORTED));
        };
      }
      if (actionFlag === lazy.EnigmailConstants.REFRESH_KEY) {
        // we don't (need to) distinguish between refresh and download for our internal protocol
        actionFlag = lazy.EnigmailConstants.DOWNLOAD_KEY;
      }

      if (payLoad === null) {
        reject(createError(lazy.EnigmailConstants.KEYSERVER_ERR_UNKNOWN));
        return;
      }

      xmlReq = new XMLHttpRequest();

      xmlReq.onload = function () {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: accessHkpInternal: onload(): status=" +
            xmlReq.status +
            "\n"
        );
        switch (actionFlag) {
          case lazy.EnigmailConstants.UPLOAD_KEY:
            lazy.EnigmailLog.DEBUG(
              "keyserver.jsm: accessHkpInternal: onload: " +
                xmlReq.responseText +
                "\n"
            );
            if (xmlReq.status >= 400) {
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              resolve(0);
            }
            return;

          case lazy.EnigmailConstants.SEARCH_KEY:
            if (xmlReq.status === 404) {
              // key not found
              resolve("");
            } else if (xmlReq.status >= 400) {
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              resolve(xmlReq.responseText);
            }
            return;

          case lazy.EnigmailConstants.DOWNLOAD_KEY:
          case lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT:
            if (xmlReq.status >= 400 && xmlReq.status < 500) {
              // key not found
              resolve(1);
            } else if (xmlReq.status >= 500) {
              lazy.EnigmailLog.DEBUG(
                "keyserver.jsm: accessHkpInternal: onload: " +
                  xmlReq.responseText +
                  "\n"
              );
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              let errorMsgObj = {},
                importedKeysObj = {};

              if (actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY) {
                let importMinimal = false;
                let r = lazy.EnigmailKeyRing.importKey(
                  null,
                  false,
                  xmlReq.responseText,
                  false,
                  "",
                  errorMsgObj,
                  importedKeysObj,
                  importMinimal
                );
                if (r === 0) {
                  resolve(importedKeysObj.value);
                } else {
                  reject(
                    createError(
                      lazy.EnigmailConstants.KEYSERVER_ERR_IMPORT_ERROR
                    )
                  );
                }
              } else {
                // DOWNLOAD_KEY_NO_IMPORT
                resolve(xmlReq.responseText);
              }
            }
            return;
        }
        resolve(-1);
      };

      xmlReq.onerror = function (e) {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: accessHkpInternal.accessKeyServer: onerror: " +
            e +
            "\n"
        );
        let err = lazy.FeedUtils.createTCPErrorFromFailedXHR(e.target);
        switch (err.type) {
          case "SecurityCertificate":
            reject(
              createError(
                lazy.EnigmailConstants.KEYSERVER_ERR_CERTIFICATE_ERROR
              )
            );
            break;
          case "SecurityProtocol":
            reject(
              createError(lazy.EnigmailConstants.KEYSERVER_ERR_SECURITY_ERROR)
            );
            break;
          case "Network":
            reject(
              createError(
                lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_UNAVAILABLE
              )
            );
            break;
        }
        reject(
          createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_UNAVAILABLE)
        );
      };

      xmlReq.onloadend = function () {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: accessHkpInternal.accessKeyServer: loadEnd\n"
        );
      };

      let { url, method } = this.createRequestUrl(keyserver, actionFlag, keyId);

      lazy.EnigmailLog.DEBUG(
        `keyserver.jsm: accessHkpInternal.accessKeyServer: requesting ${url}\n`
      );
      xmlReq.open(method, url);
      xmlReq.send(payLoad);
    });
  },

  /**
   * Download keys from a keyserver
   *
   * @param keyIDs:      String  - space-separated list of search terms or key IDs
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<...>
   */
  async download(autoImport, keyIDs, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessHkpInternal.download(${keyIDs})\n`
    );
    let keyIdArr = keyIDs.split(/ +/);
    let retObj = {
      result: 0,
      errorDetails: "",
      keyList: [],
    };

    for (let i = 0; i < keyIdArr.length; i++) {
      try {
        let r = await this.accessKeyServer(
          autoImport
            ? lazy.EnigmailConstants.DOWNLOAD_KEY
            : lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT,
          keyserver,
          keyIdArr[i],
          listener
        );
        if (autoImport) {
          if (Array.isArray(r)) {
            retObj.keyList = retObj.keyList.concat(r);
          }
        } else if (typeof r == "string") {
          retObj.keyData = r;
        } else {
          retObj.result = r;
        }
      } catch (ex) {
        retObj.result = ex.result;
        retObj.errorDetails = ex.errorDetails;
        throw retObj;
      }

      if (listener && "onProgress" in listener) {
        listener.onProgress(((i + 1) / keyIdArr.length) * 100);
      }
    }

    return retObj;
  },

  refresh(keyServer, listener = null) {
    let keyList = lazy.EnigmailKeyRing.getAllKeys()
      .keyList.map(keyObj => {
        return "0x" + keyObj.fpr;
      })
      .join(" ");

    return this.download(true, keyList, keyServer, listener);
  },

  /**
   * Upload keys to a keyserver
   *
   * @param keyIDs: String - space-separated list of search terms or key IDs
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return {boolean} - Returns true if the key was sent successfully
   */
  async upload(keyIDs, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessHkpInternal.upload(${keyIDs})\n`
    );
    let keyIdArr = keyIDs.split(/ +/);
    let rv = false;

    for (let i = 0; i < keyIdArr.length; i++) {
      try {
        let r = await this.accessKeyServer(
          lazy.EnigmailConstants.UPLOAD_KEY,
          keyserver,
          keyIdArr[i],
          listener
        );
        if (r === 0) {
          rv = true;
        } else {
          rv = false;
          break;
        }
      } catch (ex) {
        console.log(ex.errorDetails);
        rv = false;
        break;
      }

      if (listener && "onProgress" in listener) {
        listener.onProgress(((i + 1) / keyIdArr.length) * 100);
      }
    }

    return rv;
  },

  /**
   * Search for keys on a keyserver
   *
   * @param searchTerm:  String  - search term
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Object>
   *    - result: Number
   *    - pubKeys: Array of Object:
   *         PubKeys: Object with:
   *           - keyId: String
   *           - keyLen: String
   *           - keyType: String
   *           - created: String (YYYY-MM-DD)
   *           - status: String: one of ''=valid, r=revoked, e=expired
   *           - uid: Array of Strings with UIDs
   */
  async searchKeyserver(searchTerm, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessHkpInternal.search(${searchTerm})\n`
    );
    let retObj = {
      result: 0,
      errorDetails: "",
      pubKeys: [],
    };
    let key = null;

    let searchArr = searchTerm.split(/ +/);

    for (let k in searchArr) {
      let r = await this.accessKeyServer(
        lazy.EnigmailConstants.SEARCH_KEY,
        keyserver,
        searchArr[k],
        listener
      );

      let lines = r.split(/\r?\n/);

      for (var i = 0; i < lines.length; i++) {
        let line = lines[i].split(/:/).map(unescape);
        if (line.length <= 1) {
          continue;
        }

        switch (line[0]) {
          case "info":
            if (line[1] !== "1") {
              // protocol version not supported
              retObj.result = 7;
              retObj.errorDetails = await lazy.l10n.formatValue(
                "keyserver-error-unsupported"
              );
              retObj.pubKeys = [];
              return retObj;
            }
            break;
          case "pub":
            if (line.length >= 6) {
              if (key) {
                retObj.pubKeys.push(key);
                key = null;
              }
              let dat = new Date(line[4] * 1000);
              let month = String(dat.getMonth() + 101).substr(1);
              let day = String(dat.getDate() + 100).substr(1);
              key = {
                keyId: line[1],
                keyLen: line[3],
                keyType: line[2],
                created: dat.getFullYear() + "-" + month + "-" + day,
                uid: [],
                status: line[6],
              };
            }
            break;
          case "uid":
            key.uid.push(
              lazy.EnigmailData.convertToUnicode(line[1].trim(), "utf-8")
            );
        }
      }

      if (key) {
        retObj.pubKeys.push(key);
      }
    }

    return retObj;
  },
};

/**
 Object to handle KeyBase requests (search & download only)
 */
const accessKeyBase = {
  /**
   * return the URL and the HTTP access method for a given action
   */
  createRequestUrl(actionFlag, searchTerm) {
    let url = "https://keybase.io/_/api/1.0/user/";

    if (actionFlag === lazy.EnigmailConstants.UPLOAD_KEY) {
      // not supported
      throw Components.Exception("", Cr.NS_ERROR_FAILURE);
    } else if (
      actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY ||
      actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT
    ) {
      if (searchTerm.indexOf("0x") === 0) {
        searchTerm = searchTerm.substr(0, 40);
      }
      url +=
        "lookup.json?key_fingerprint=" +
        escape(searchTerm) +
        "&fields=public_keys";
    } else if (actionFlag === lazy.EnigmailConstants.SEARCH_KEY) {
      url += "autocomplete.json?q=" + escape(searchTerm);
    }

    return {
      url,
      method: "GET",
    };
  },

  /**
   * Upload, search or download keys from a keyserver
   *
   * @param actionFlag:  Number  - Keyserver Action Flags: from EnigmailConstants
   * @param keyId:      String  - space-separated list of search terms or key IDs
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Number (Status-ID)>
   */
  async accessKeyServer(actionFlag, keyId, listener) {
    lazy.EnigmailLog.DEBUG(`keyserver.jsm: accessKeyBase: accessKeyServer()\n`);

    return new Promise((resolve, reject) => {
      let xmlReq = null;
      if (listener && typeof listener === "object") {
        listener.onCancel = function () {
          lazy.EnigmailLog.DEBUG(
            `keyserver.jsm: accessKeyBase: accessKeyServer - onCancel() called\n`
          );
          if (xmlReq) {
            xmlReq.abort();
          }
          reject(createError(lazy.EnigmailConstants.KEYSERVER_ERR_ABORTED));
        };
      }
      if (actionFlag === lazy.EnigmailConstants.REFRESH_KEY) {
        // we don't (need to) distinguish between refresh and download for our internal protocol
        actionFlag = lazy.EnigmailConstants.DOWNLOAD_KEY;
      }

      xmlReq = new XMLHttpRequest();

      xmlReq.onload = function () {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: onload(): status=" + xmlReq.status + "\n"
        );
        switch (actionFlag) {
          case lazy.EnigmailConstants.SEARCH_KEY:
            if (xmlReq.status >= 400) {
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              resolve(xmlReq.responseText);
            }
            return;

          case lazy.EnigmailConstants.DOWNLOAD_KEY:
          case lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT:
            if (xmlReq.status >= 400 && xmlReq.status < 500) {
              // key not found
              resolve(1);
            } else if (xmlReq.status >= 500) {
              lazy.EnigmailLog.DEBUG(
                "keyserver.jsm: onload: " + xmlReq.responseText + "\n"
              );
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              try {
                let resp = JSON.parse(xmlReq.responseText);
                if (resp.status.code === 0) {
                  for (let hit in resp.them) {
                    lazy.EnigmailLog.DEBUG(
                      JSON.stringify(resp.them[hit].public_keys.primary) + "\n"
                    );

                    if (resp.them[hit] !== null) {
                      let errorMsgObj = {},
                        importedKeysObj = {};

                      if (actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY) {
                        let r = lazy.EnigmailKeyRing.importKey(
                          null,
                          false,
                          resp.them[hit].public_keys.primary.bundle,
                          false,
                          "",
                          errorMsgObj,
                          importedKeysObj
                        );
                        if (r === 0) {
                          resolve(importedKeysObj.value);
                        } else {
                          reject(
                            createError(
                              lazy.EnigmailConstants.KEYSERVER_ERR_IMPORT_ERROR
                            )
                          );
                        }
                      } else {
                        // DOWNLOAD_KEY_NO_IMPORT
                        resolve(resp.them[hit].public_keys.primary.bundle);
                      }
                    }
                  }
                }
              } catch (ex) {
                reject(
                  createError(lazy.EnigmailConstants.KEYSERVER_ERR_UNKNOWN)
                );
              }
            }
            return;
        }
        resolve(-1);
      };

      xmlReq.onerror = function (e) {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: accessKeyBase: onerror: " + e + "\n"
        );
        let err = lazy.FeedUtils.createTCPErrorFromFailedXHR(e.target);
        switch (err.type) {
          case "SecurityCertificate":
            reject(
              createError(
                lazy.EnigmailConstants.KEYSERVER_ERR_CERTIFICATE_ERROR
              )
            );
            break;
          case "SecurityProtocol":
            reject(
              createError(lazy.EnigmailConstants.KEYSERVER_ERR_SECURITY_ERROR)
            );
            break;
          case "Network":
            reject(
              createError(
                lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_UNAVAILABLE
              )
            );
            break;
        }
        reject(
          createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_UNAVAILABLE)
        );
      };

      xmlReq.onloadend = function () {
        lazy.EnigmailLog.DEBUG("keyserver.jsm: accessKeyBase: loadEnd\n");
      };

      let { url, method } = this.createRequestUrl(actionFlag, keyId);

      lazy.EnigmailLog.DEBUG(
        `keyserver.jsm: accessKeyBase: requesting ${url}\n`
      );
      xmlReq.open(method, url);
      xmlReq.send("");
    });
  },

  /**
   * Download keys from a KeyBase
   *
   * @param keyIDs:      String  - space-separated list of search terms or key IDs
   * @param keyserver:   (not used for keybase)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<...>
   */
  async download(autoImport, keyIDs, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(`keyserver.jsm: accessKeyBase: download()\n`);
    let keyIdArr = keyIDs.split(/ +/);
    let retObj = {
      result: 0,
      errorDetails: "",
      keyList: [],
    };

    for (let i = 0; i < keyIdArr.length; i++) {
      try {
        let r = await this.accessKeyServer(
          autoImport
            ? lazy.EnigmailConstants.DOWNLOAD_KEY
            : lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT,
          keyIdArr[i],
          listener
        );
        if (r.length > 0) {
          retObj.keyList = retObj.keyList.concat(r);
        }
      } catch (ex) {
        retObj.result = ex.result;
        retObj.errorDetails = ex.result;
        throw retObj;
      }

      if (listener && "onProgress" in listener) {
        listener.onProgress(i / keyIdArr.length);
      }
    }

    return retObj;
  },

  /**
   * Search for keys on a keyserver
   *
   * @param searchTerm:  String  - search term
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Object>
   *    - result: Number
   *    - pubKeys: Array of Object:
   *         PubKeys: Object with:
   *           - keyId: String
   *           - keyLen: String
   *           - keyType: String
   *           - created: String (YYYY-MM-DD)
   *           - status: String: one of ''=valid, r=revoked, e=expired
   *           - uid: Array of Strings with UIDs

   */
  async searchKeyserver(searchTerm, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(`keyserver.jsm: accessKeyBase: search()\n`);
    let retObj = {
      result: 0,
      errorDetails: "",
      pubKeys: [],
    };

    try {
      let r = await this.accessKeyServer(
        lazy.EnigmailConstants.SEARCH_KEY,
        searchTerm,
        listener
      );

      let res = JSON.parse(r);
      let completions = res.completions;

      for (let hit in completions) {
        if (
          completions[hit] &&
          completions[hit].components.key_fingerprint !== undefined
        ) {
          let uid = completions[hit].components.username.val;
          if ("full_name" in completions[hit].components) {
            uid += " (" + completions[hit].components.full_name.val + ")";
          }
          let key = {
            keyId:
              completions[hit].components.key_fingerprint.val.toUpperCase(),
            keyLen:
              completions[hit].components.key_fingerprint.nbits.toString(),
            keyType:
              completions[hit].components.key_fingerprint.algo.toString(),
            created: 0, //date.toDateString(),
            uid: [uid],
            status: "",
          };
          retObj.pubKeys.push(key);
        }
      }
    } catch (ex) {
      retObj.result = ex.result;
      retObj.errorDetails = ex.errorDetails;
      throw retObj;
    }

    return retObj;
  },

  upload() {
    throw Components.Exception("", Cr.NS_ERROR_FAILURE);
  },

  refresh(keyServer, listener = null) {
    lazy.EnigmailLog.DEBUG(`keyserver.jsm: accessKeyBase: refresh()\n`);
    let keyList = lazy.EnigmailKeyRing.getAllKeys()
      .keyList.map(keyObj => {
        return "0x" + keyObj.fpr;
      })
      .join(" ");

    return this.download(true, keyList, keyServer, listener);
  },
};

function getAccessType(keyserver) {
  if (!keyserver) {
    throw new Error("getAccessType requires explicit keyserver parameter");
  }

  let srv = parseKeyserverUrl(keyserver);
  switch (srv.protocol) {
    case "keybase":
      return accessKeyBase;
    case "vks":
      return accessVksServer;
  }

  if (srv.host.search(/keys.openpgp.org$/i) >= 0) {
    return accessVksServer;
  }

  return accessHkpInternal;
}

/**
 Object to handle VKS requests (for example keys.openpgp.org)
 */
const accessVksServer = {
  /**
   * Create the payload of VKS requests (currently upload only)
   *
   */
  async buildJsonPayload(actionFlag, searchTerms, locale) {
    switch (actionFlag) {
      case lazy.EnigmailConstants.UPLOAD_KEY:
        let exitCodeObj = {};
        let keyData = await lazy.EnigmailKeyRing.extractPublicKeys(
          ["0x" + searchTerms], // must be id or fingerprint
          null,
          null,
          null,
          exitCodeObj,
          {}
        );
        if (exitCodeObj.value !== 0 || keyData.length === 0) {
          return null;
        }

        return JSON.stringify({
          keytext: keyData,
        });

      case lazy.EnigmailConstants.GET_CONFIRMATION_LINK:
        return JSON.stringify({
          token: searchTerms.token,
          addresses: searchTerms.addresses,
          locale: [locale],
        });

      case lazy.EnigmailConstants.DOWNLOAD_KEY:
      case lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT:
      case lazy.EnigmailConstants.SEARCH_KEY:
        return "";
    }

    // other actions are not yet implemented
    return null;
  },

  /**
   * return the URL and the HTTP access method for a given action
   */
  createRequestUrl(keyserver, actionFlag, searchTerm) {
    let keySrv = parseKeyserverUrl(keyserver);
    let contentType = "text/plain;charset=UTF-8";

    let method = "GET";

    let url = "https://" + keySrv.host;

    if (actionFlag === lazy.EnigmailConstants.UPLOAD_KEY) {
      url += "/vks/v1/upload";
      method = "POST";
      contentType = "application/json";
    } else if (actionFlag === lazy.EnigmailConstants.GET_CONFIRMATION_LINK) {
      url += "/vks/v1/request-verify";
      method = "POST";
      contentType = "application/json";
    } else if (
      actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY ||
      actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT ||
      actionFlag === lazy.EnigmailConstants.SEARCH_KEY
    ) {
      if (searchTerm) {
        let lookup = "/vks/";
        if (searchTerm.indexOf("0x") === 0) {
          searchTerm = searchTerm.substr(2);
          if (
            searchTerm.length == 16 &&
            searchTerm.search(/^[A-F0-9]+$/) === 0
          ) {
            lookup = "/vks/v1/by-keyid/" + searchTerm;
          } else if (
            searchTerm.length == 40 &&
            searchTerm.search(/^[A-F0-9]+$/) === 0
          ) {
            lookup = "/vks/v1/by-fingerprint/" + searchTerm;
          }
        } else {
          try {
            searchTerm = lazy.EnigmailFuncs.stripEmail(searchTerm);
          } catch (x) {}
          lookup = "/vks/v1/by-email/" + searchTerm;
        }
        url += lookup;
      }
    }

    return {
      url,
      method,
      contentType,
    };
  },

  /**
   * Upload, search or download keys from a keyserver
   *
   * @param actionFlag:  Number  - Keyserver Action Flags: from EnigmailConstants
   * @param keyId:       String  - space-separated list of search terms or key IDs
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Number (Status-ID)>
   */
  async accessKeyServer(actionFlag, keyserver, keyId, listener) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessVksServer.accessKeyServer(${keyserver})\n`
    );
    if (keyserver === null) {
      keyserver = "keys.openpgp.org";
    }

    let uiLocale = Services.locale.appLocalesAsBCP47[0];
    let payLoad = await this.buildJsonPayload(actionFlag, keyId, uiLocale);

    return new Promise((resolve, reject) => {
      let xmlReq = null;
      if (listener && typeof listener === "object") {
        listener.onCancel = function () {
          lazy.EnigmailLog.DEBUG(
            `keyserver.jsm: accessVksServer.accessKeyServer - onCancel() called\n`
          );
          if (xmlReq) {
            xmlReq.abort();
          }
          reject(createError(lazy.EnigmailConstants.KEYSERVER_ERR_ABORTED));
        };
      }
      if (actionFlag === lazy.EnigmailConstants.REFRESH_KEY) {
        // we don't (need to) distinguish between refresh and download for our internal protocol
        actionFlag = lazy.EnigmailConstants.DOWNLOAD_KEY;
      }

      if (payLoad === null) {
        reject(createError(lazy.EnigmailConstants.KEYSERVER_ERR_UNKNOWN));
        return;
      }

      xmlReq = new XMLHttpRequest();

      xmlReq.onload = function () {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: accessVksServer.onload(): status=" +
            xmlReq.status +
            "\n"
        );
        switch (actionFlag) {
          case lazy.EnigmailConstants.UPLOAD_KEY:
          case lazy.EnigmailConstants.GET_CONFIRMATION_LINK:
            lazy.EnigmailLog.DEBUG(
              "keyserver.jsm: accessVksServer.onload: " +
                xmlReq.responseText +
                "\n"
            );
            if (xmlReq.status >= 400) {
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              resolve(xmlReq.responseText);
            }
            return;

          case lazy.EnigmailConstants.SEARCH_KEY:
            if (xmlReq.status === 404) {
              // key not found
              resolve("");
            } else if (xmlReq.status >= 400) {
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              resolve(xmlReq.responseText);
            }
            return;

          case lazy.EnigmailConstants.DOWNLOAD_KEY:
          case lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT:
            if (xmlReq.status >= 400 && xmlReq.status < 500) {
              // key not found
              resolve(1);
            } else if (xmlReq.status >= 500) {
              lazy.EnigmailLog.DEBUG(
                "keyserver.jsm: accessVksServer.onload: " +
                  xmlReq.responseText +
                  "\n"
              );
              reject(
                createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_ERROR)
              );
            } else {
              let errorMsgObj = {},
                importedKeysObj = {};
              if (actionFlag === lazy.EnigmailConstants.DOWNLOAD_KEY) {
                let r = lazy.EnigmailKeyRing.importKey(
                  null,
                  false,
                  xmlReq.responseText,
                  false,
                  "",
                  errorMsgObj,
                  importedKeysObj
                );
                if (r === 0) {
                  resolve(importedKeysObj.value);
                } else {
                  reject(
                    createError(
                      lazy.EnigmailConstants.KEYSERVER_ERR_IMPORT_ERROR
                    )
                  );
                }
              } else {
                // DOWNLOAD_KEY_NO_IMPORT
                resolve(xmlReq.responseText);
              }
            }
            return;
        }
        resolve(-1);
      };

      xmlReq.onerror = function (e) {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: accessVksServer.accessKeyServer: onerror: " + e + "\n"
        );
        let err = lazy.FeedUtils.createTCPErrorFromFailedXHR(e.target);
        switch (err.type) {
          case "SecurityCertificate":
            reject(
              createError(
                lazy.EnigmailConstants.KEYSERVER_ERR_CERTIFICATE_ERROR
              )
            );
            break;
          case "SecurityProtocol":
            reject(
              createError(lazy.EnigmailConstants.KEYSERVER_ERR_SECURITY_ERROR)
            );
            break;
          case "Network":
            reject(
              createError(
                lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_UNAVAILABLE
              )
            );
            break;
        }
        reject(
          createError(lazy.EnigmailConstants.KEYSERVER_ERR_SERVER_UNAVAILABLE)
        );
      };

      xmlReq.onloadend = function () {
        lazy.EnigmailLog.DEBUG(
          "keyserver.jsm: accessVksServer.accessKeyServer: loadEnd\n"
        );
      };

      let { url, method, contentType } = this.createRequestUrl(
        keyserver,
        actionFlag,
        keyId
      );

      lazy.EnigmailLog.DEBUG(
        `keyserver.jsm: accessVksServer.accessKeyServer: requesting ${method} for ${url}\n`
      );
      xmlReq.open(method, url);
      xmlReq.setRequestHeader("Content-Type", contentType);
      xmlReq.send(payLoad);
    });
  },

  /**
   * Download keys from a keyserver
   *
   * @param keyIDs:      String  - space-separated list of search terms or key IDs
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<...>
   */
  async download(autoImport, keyIDs, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessVksServer.download(${keyIDs})\n`
    );
    let keyIdArr = keyIDs.split(/ +/);
    let retObj = {
      result: 0,
      errorDetails: "",
      keyList: [],
    };

    for (let i = 0; i < keyIdArr.length; i++) {
      try {
        let r = await this.accessKeyServer(
          autoImport
            ? lazy.EnigmailConstants.DOWNLOAD_KEY
            : lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT,
          keyserver,
          keyIdArr[i],
          listener
        );
        if (autoImport) {
          if (Array.isArray(r)) {
            retObj.keyList = retObj.keyList.concat(r);
          }
        } else if (typeof r == "string") {
          retObj.keyData = r;
        } else {
          retObj.result = r;
        }
      } catch (ex) {
        retObj.result = ex.result;
        retObj.errorDetails = ex.errorDetails;
        throw retObj;
      }

      if (listener && "onProgress" in listener) {
        listener.onProgress(((i + 1) / keyIdArr.length) * 100);
      }
    }

    return retObj;
  },

  refresh(keyServer, listener = null) {
    let keyList = lazy.EnigmailKeyRing.getAllKeys()
      .keyList.map(keyObj => {
        return "0x" + keyObj.fpr;
      })
      .join(" ");

    return this.download(true, keyList, keyServer, listener);
  },

  async requestConfirmationLink(keyserver, jsonFragment) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessVksServer.requestConfirmationLink()\n`
    );

    let response = JSON.parse(jsonFragment);

    let addr = [];

    for (let email in response.status) {
      if (response.status[email] !== "published") {
        addr.push(email);
      }
    }

    if (addr.length > 0) {
      let r = await this.accessKeyServer(
        lazy.EnigmailConstants.GET_CONFIRMATION_LINK,
        keyserver,
        {
          token: response.token,
          addresses: addr,
        },
        null
      );

      if (typeof r === "string") {
        return addr.length;
      }
    }

    return 0;
  },

  /**
   * Upload keys to a keyserver
   *
   * @param keyIDs: String - space-separated list of search terms or key IDs
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return {boolean} - Returns true if the key was sent successfully
   */
  async upload(keyIDs, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessVksServer.upload(${keyIDs})\n`
    );
    let keyIdArr = keyIDs.split(/ +/);
    let rv = false;

    for (let i = 0; i < keyIdArr.length; i++) {
      let keyObj = lazy.EnigmailKeyRing.getKeyById(keyIdArr[i]);

      if (!keyObj.secretAvailable) {
        throw new Error(
          "public keyserver uploading supported only for user's own keys"
        );
      }

      try {
        let r = await this.accessKeyServer(
          lazy.EnigmailConstants.UPLOAD_KEY,
          keyserver,
          keyIdArr[i],
          listener
        );
        if (typeof r === "string") {
          let req = await this.requestConfirmationLink(keyserver, r);
          if (req >= 0) {
            rv = true;
          }
        } else {
          rv = false;
          break;
        }
      } catch (ex) {
        console.log(ex.errorDetails);
        rv = false;
        break;
      }

      if (listener && "onProgress" in listener) {
        listener.onProgress(((i + 1) / keyIdArr.length) * 100);
      }
    }

    return rv;
  },

  /**
   * Search for keys on a keyserver
   *
   * @param searchTerm:  String  - search term
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Object>
   *    - result: Number
   *    - pubKeys: Array of Object:
   *         PubKeys: Object with:
   *           - keyId: String
   *           - keyLen: String
   *           - keyType: String
   *           - created: String (YYYY-MM-DD)
   *           - status: String: one of ''=valid, r=revoked, e=expired
   *           - uid: Array of Strings with UIDs
   */
  async searchKeyserver(searchTerm, keyserver, listener = null) {
    lazy.EnigmailLog.DEBUG(
      `keyserver.jsm: accessVksServer.search(${searchTerm})\n`
    );
    let retObj = {
      result: 0,
      errorDetails: "",
      pubKeys: [],
    };
    let key = null;

    let searchArr = searchTerm.split(/ +/);

    try {
      for (let i in searchArr) {
        let r = await this.accessKeyServer(
          lazy.EnigmailConstants.SEARCH_KEY,
          keyserver,
          searchArr[i],
          listener
        );

        const cApi = lazy.EnigmailCryptoAPI();
        let keyList = await cApi.getKeyListFromKeyBlockAPI(
          r,
          true,
          false,
          true,
          false
        );
        if (!keyList) {
          retObj.result = -1;
          // TODO: should we set retObj.errorDetails to a string?
          return retObj;
        }

        for (let k in keyList) {
          key = {
            keyId: keyList[k].fpr,
            keyLen: "0",
            keyType: "",
            created: keyList[k].created,
            uid: [keyList[k].name],
            status: keyList[k].revoke ? "r" : "",
          };

          for (let uid of keyList[k].uids) {
            key.uid.push(uid);
          }

          retObj.pubKeys.push(key);
        }
      }
    } catch (ex) {
      retObj.result = ex.result;
      retObj.errorDetails = ex.errorDetails;
      throw retObj;
    }

    return retObj;
  },
};

var EnigmailKeyServer = {
  /**
   * Download keys from a keyserver
   *
   * @param keyIDs:      String  - space-separated list of FPRs or key IDs
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Object>
   *     Object: - result: Number           - result Code (0 = OK),
   *             - keyList: Array of String - imported key FPR
   */
  async download(keyIDs, keyserver = null, listener) {
    let acc = getAccessType(keyserver);
    return acc.download(true, keyIDs, keyserver, listener);
  },

  async downloadNoImport(keyIDs, keyserver = null, listener) {
    let acc = getAccessType(keyserver);
    return acc.download(false, keyIDs, keyserver, listener);
  },

  serverReqURL(keyIDs, keyserver) {
    let acc = getAccessType(keyserver);
    let { url } = acc.createRequestUrl(
      keyserver,
      lazy.EnigmailConstants.DOWNLOAD_KEY_NO_IMPORT,
      keyIDs
    );
    return url;
  },

  /**
   * Upload keys to a keyserver
   *
   * @param keyIDs:      String  - space-separated list of key IDs or FPR
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return {boolean} - Returns true if the key was sent successfully
   */

  async upload(keyIDs, keyserver = null, listener) {
    let acc = getAccessType(keyserver);
    return acc.upload(keyIDs, keyserver, listener);
  },

  /**
   * Search keys on a keyserver
   *
   * @param searchString: String - search term. Multiple email addresses can be search by spaces
   * @param keyserver:    String - keyserver URL (optionally incl. protocol)
   * @param listener:     optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<Object>
   *    - result: Number
   *    - pubKeys: Array of Object:
   *         PubKeys: Object with:
   *           - keyId: String
   *           - keyLen: String
   *           - keyType: String
   *           - created: String (YYYY-MM-DD)
   *           - status: String: one of ''=valid, r=revoked, e=expired
   *           - uid: Array of Strings with UIDs
   */
  async searchKeyserver(searchString, keyserver = null, listener) {
    let acc = getAccessType(keyserver);
    return acc.search(searchString, keyserver, listener);
  },

  async searchAndDownloadSingleResultNoImport(
    searchString,
    keyserver = null,
    listener
  ) {
    let acc = getAccessType(keyserver);
    let searchResult = await acc.searchKeyserver(
      searchString,
      keyserver,
      listener
    );
    if (searchResult.result != 0 || searchResult.pubKeys.length != 1) {
      return null;
    }
    return this.downloadNoImport(
      searchResult.pubKeys[0].keyId,
      keyserver,
      listener
    );
  },

  /**
   * Refresh all keys
   *
   * @param keyserver:   String  - keyserver URL (optionally incl. protocol)
   * @param listener:    optional Object implementing the KeySrvListener API (above)
   *
   * @return:   Promise<resultStatus> (identical to download)
   */
  refresh(keyserver = null, listener) {
    let acc = getAccessType(keyserver);
    return acc.refresh(keyserver, listener);
  },
};
