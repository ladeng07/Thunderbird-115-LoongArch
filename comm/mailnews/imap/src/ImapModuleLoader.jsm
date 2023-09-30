/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["ImapModuleLoader"];

/**
 * Determine whether to use nsImapService.cpp or ImapService.jsm. When
 * `mailnews.imap.jsmodule` is `true`, use ImapService.jsm.
 */
function ImapModuleLoader() {
  try {
    this.loadModule();
  } catch (e) {
    console.error(e);
  }
}

var imapJSModules = [
  // moduleName, interfaceId, contractId
  [
    "ImapIncomingServer",
    "{b02a4e1c-0d9e-498c-8b9d-18917ba9f65b}",
    "@mozilla.org/messenger/server;1?type=imap",
  ],
  [
    "ImapService",
    "{2ea8fbe6-029b-4bff-ae05-b794cf955afb}",
    "@mozilla.org/messenger/imapservice;1",
  ],
  [
    "ImapMessageService",
    "{d63af753-c2f3-4f1d-b650-9d12229de8ad}",
    "@mozilla.org/messenger/messageservice;1?type=imap",
    "ImapMessageService",
  ],
  [
    "ImapFolderContentHandler",
    "{d927a82f-2d15-4972-ab88-6d84601aae68}",
    "@mozilla.org/uriloader/content-handler;1?type=x-application-imapfolder",
  ],
  [
    "ImapMessageMessageService",
    "{2532ae4f-a852-4c96-be45-1308ba23d62e}",
    "@mozilla.org/messenger/messageservice;1?type=imap-message",
    "ImapMessageService",
  ],
  [
    "ImapProtocolHandler",
    "{ebb06c58-6ccd-4bde-9087-40663e0388ae}",
    "@mozilla.org/network/protocol;1?name=imap",
  ],
  [
    "ImapProtocolInfo",
    "{1d9473bc-423a-4632-ad5d-802154e80f6f}",
    "@mozilla.org/messenger/protocol/info;1?type=imap",
  ],
];

ImapModuleLoader.prototype = {
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),

  observe() {
    // Nothing to do here, just need the entry so this is instantiated.
  },

  loadModule() {
    if (Services.prefs.getBoolPref("mailnews.imap.jsmodule", false)) {
      let registrar = Components.manager.QueryInterface(
        Ci.nsIComponentRegistrar
      );

      for (let [
        moduleName,
        interfaceId,
        contractId,
        fileName,
      ] of imapJSModules) {
        // Register a module.
        let classId = Components.ID(interfaceId);
        registrar.registerFactory(
          classId,
          "",
          contractId,
          lazyFactoryFor(fileName || moduleName, moduleName)
        );
      }

      dump("[ImapModuleLoader] Using ImapService.jsm\n");

      const { ImapProtocolHandler } = ChromeUtils.import(
        `resource:///modules/ImapProtocolHandler.jsm`
      );
      let protocolFlags =
        Ci.nsIProtocolHandler.URI_NORELATIVE |
        Ci.nsIProtocolHandler.URI_FORBIDS_AUTOMATIC_DOCUMENT_REPLACEMENT |
        Ci.nsIProtocolHandler.URI_DANGEROUS_TO_LOAD |
        Ci.nsIProtocolHandler.ALLOWS_PROXY |
        Ci.nsIProtocolHandler.URI_FORBIDS_COOKIE_ACCESS |
        Ci.nsIProtocolHandler.ORIGIN_IS_FULL_SPEC;

      Services.io.registerProtocolHandler(
        "imap",
        new ImapProtocolHandler(),
        protocolFlags,
        Ci.nsIImapUrl.DEFAULT_IMAP_PORT
      );
    } else {
      dump("[ImapModuleLoader] Using nsImapService.cpp\n");
    }
  },
};

function lazyFactoryFor(fileName, constructorName) {
  let factory = {
    get scope() {
      delete this.scope;
      this.scope = ChromeUtils.import(`resource:///modules/${fileName}.jsm`);
      return this.scope;
    },
    createInstance(interfaceID) {
      let componentConstructor = this.scope[constructorName];
      return new componentConstructor().QueryInterface(interfaceID);
    },
  };
  return factory;
}
