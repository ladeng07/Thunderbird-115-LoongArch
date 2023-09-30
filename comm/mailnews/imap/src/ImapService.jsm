/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["ImapService"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  ImapChannel: "resource:///modules/ImapChannel.jsm",
  MailStringUtils: "resource:///modules/MailStringUtils.jsm",
});

/**
 * Set mailnews.imap.jsmodule to true to use this module.
 *
 * @implements {nsIImapService}
 */
class ImapService {
  QueryInterface = ChromeUtils.generateQI(["nsIImapService"]);

  constructor() {
    // Initialize nsIAutoSyncManager.
    Cc["@mozilla.org/imap/autosyncmgr;1"].getService(Ci.nsIAutoSyncManager);
  }

  get cacheStorage() {
    if (!this._cacheStorage) {
      this._cacheStorage = Services.cache2.memoryCacheStorage(
        Services.loadContextInfo.custom(false, {})
      );
    }
    return this._cacheStorage;
  }

  selectFolder(folder, urlListener, msgWindow) {
    return this._withClient(folder, (client, runningUrl) => {
      client.startRunningUrl(
        urlListener || folder.QueryInterface(Ci.nsIUrlListener),
        msgWindow,
        runningUrl
      );
      runningUrl.updatingFolder = true;
      client.onReady = () => {
        client.selectFolder(folder);
      };
    });
  }

  liteSelectFolder(folder, urlListener, msgWindow) {
    return this._withClient(folder, (client, runningUrl) => {
      client.startRunningUrl(
        urlListener || folder.QueryInterface(Ci.nsIUrlListener),
        msgWindow,
        runningUrl
      );
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapLiteSelectFolder;
      client.onReady = () => {
        client.selectFolder(folder);
      };
    });
  }

  discoverAllFolders(folder, urlListener, msgWindow) {
    let server = folder.QueryInterface(
      Ci.nsIMsgImapMailFolder
    ).imapIncomingServer;
    if (server.wrappedJSObject.hasDiscoveredFolders) {
      return;
    }
    server.wrappedJSObject.hasDiscoveredFolders = true;
    this._withClient(folder, client => {
      client.startRunningUrl(urlListener, msgWindow);
      client.onReady = () => {
        client.discoverAllFolders(folder);
      };
    });
  }

  discoverAllAndSubscribedFolders(folder, urlListener, msgWindow) {
    this._withClient(folder, client => {
      let runningUrl = client.startRunningUrl(urlListener, msgWindow);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapDiscoverAllAndSubscribedBoxesUrl;
      client.onReady = () => {
        client.discoverAllAndSubscribedFolders(folder);
      };
    });
  }

  getListOfFoldersOnServer(server, msgWindow) {
    this.discoverAllAndSubscribedFolders(
      server.rootMsgFolder,
      server.QueryInterface(Ci.nsIUrlListener),
      msgWindow
    );
  }

  subscribeFolder(folder, name, urlListener) {
    return this._withClient(folder, client => {
      client.startRunningUrl(urlListener);
      client.onReady = () => {
        client.subscribeFolder(folder, name);
      };
    });
  }

  unsubscribeFolder(folder, name, urlListener) {
    return this._withClient(folder, client => {
      client.startRunningUrl(urlListener);
      client.onReady = () => {
        client.unsubscribeFolder(folder, name);
      };
    });
  }

  addMessageFlags(folder, urlListener, messageIds, flags, messageIdsAreUID) {
    this._updateMessageFlags("+", folder, urlListener, messageIds, flags);
  }

  subtractMessageFlags(
    folder,
    urlListener,
    messageIds,
    flags,
    messageIdsAreUID
  ) {
    this._updateMessageFlags("-", folder, urlListener, messageIds, flags);
  }

  setMessageFlags(
    folder,
    urlListener,
    outURL,
    messageIds,
    flags,
    messageIdsAreUID
  ) {
    outURL.value = this._updateMessageFlags(
      "",
      folder,
      urlListener,
      messageIds,
      flags
    );
  }

  _updateMessageFlags(action, folder, urlListener, messageIds, flags) {
    return this._withClient(folder, (client, runningUrl) => {
      client.startRunningUrl(urlListener, null, runningUrl);
      client.onReady = () => {
        client.updateMessageFlags(action, folder, messageIds, flags);
      };
    });
  }

  renameLeaf(folder, newName, urlListener, msgWindow) {
    this._withClient(folder, client => {
      client.startRunningUrl(urlListener, msgWindow);
      client.onReady = () => {
        client.renameFolder(folder, newName);
      };
    });
  }

  fetchMessage(
    imapUrl,
    imapAction,
    folder,
    msgSink,
    msgWindow,
    displayConsumer,
    msgIds,
    convertDataToText
  ) {
    imapUrl.imapAction = imapAction;
    imapUrl.QueryInterface(Ci.nsIMsgMailNewsUrl).msgWindow = msgWindow;
    if (displayConsumer instanceof Ci.nsIDocShell) {
      imapUrl
        .QueryInterface(Ci.nsIMsgMailNewsUrl)
        .loadURI(
          displayConsumer.QueryInterface(Ci.nsIDocShell),
          Ci.nsIWebNavigation.LOAD_FLAGS_NONE
        );
    } else {
      let streamListener = displayConsumer.QueryInterface(Ci.nsIStreamListener);
      let channel = new lazy.ImapChannel(imapUrl, {
        QueryInterface: ChromeUtils.generateQI(["nsILoadInfo"]),
        loadingPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        securityFlags:
          Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
        internalContentPolicy: Ci.nsIContentPolicy.TYPE_OTHER,
      });
      let listener = streamListener;
      if (convertDataToText) {
        let converter = Cc["@mozilla.org/streamConverters;1"].getService(
          Ci.nsIStreamConverterService
        );
        listener = converter.asyncConvertData(
          "message/rfc822",
          "*/*",
          streamListener,
          channel
        );
      }
      channel.asyncOpen(listener);
    }
  }

  fetchCustomMsgAttribute(folder, msgWindow, attribute, uids) {
    return this._withClient(folder, (client, runningUrl) => {
      client.startRunningUrl(null, msgWindow, runningUrl);
      client.onReady = () => {
        client.fetchMsgAttribute(folder, uids, attribute);
      };
    });
  }

  expunge(folder, urlListener, msgWindow) {
    this._withClient(folder, client => {
      client.startRunningUrl(urlListener, msgWindow);
      client.onReady = () => {
        client.expunge(folder);
      };
    });
  }

  onlineMessageCopy(
    folder,
    messageIds,
    dstFolder,
    idsAreUids,
    isMove,
    urlListener,
    outURL,
    copyState,
    msgWindow
  ) {
    this._withClient(folder, client => {
      let runningUrl = client.startRunningUrl(urlListener, msgWindow);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction = isMove
        ? Ci.nsIImapUrl.nsImapOnlineMove
        : Ci.nsIImapUrl.nsImapOnlineCopy;
      client.onReady = () => {
        client.copy(folder, dstFolder, messageIds, idsAreUids, isMove);
      };
    });
  }

  appendMessageFromFile(
    file,
    dstFolder,
    messageId,
    idsAreUids,
    inSelectedState,
    urlListener,
    copyState,
    msgWindow
  ) {
    let server = dstFolder.server;
    let imapUrl = Services.io
      .newURI(
        `imap://${server.hostName}:${server.port}/fetch>UID>/${dstFolder.name}>${messageId}`
      )
      .QueryInterface(Ci.nsIImapUrl);
    imapUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
      Ci.nsIImapUrl.nsImapAppendMsgFromFile;
    imapUrl.copyState = copyState;
    if (Services.io.offline) {
      this._offlineAppendMessageFile(file, imapUrl, dstFolder, urlListener);
      return;
    }
    this._withClient(dstFolder, client => {
      client.startRunningUrl(urlListener, msgWindow, imapUrl);
      client.onReady = () => {
        client.uploadMessageFromFile(
          file,
          dstFolder,
          copyState,
          inSelectedState
        );
      };
    });
  }

  /**
   * Append a message file to a folder locally.
   *
   * @param {nsIFile} file - The message file to append.
   * @param {nsIURI} url - The imap url to run.
   * @param {nsIMsgFolder} dstFolder - The target message folder.
   * @param {nsIUrlListener} urlListener - Callback for the request.
   */
  async _offlineAppendMessageFile(file, url, dstFolder, urlListener) {
    if (dstFolder.locked) {
      const NS_MSG_FOLDER_BUSY = 2153054218;
      throw Components.Exception(
        "Destination folder locked",
        NS_MSG_FOLDER_BUSY
      );
    }

    let db = dstFolder.msgDatabase.QueryInterface(Ci.nsIMsgOfflineOpsDatabase);
    let fakeKey = db.nextFakeOfflineMsgKey;
    let op = db.getOfflineOpForKey(fakeKey, true);
    op.operation = Ci.nsIMsgOfflineImapOperation.kAppendDraft;
    op.destinationFolderURI = dstFolder.URI;
    // Release op eagerly, to make test_offlineDraftDataloss happy in debug build.
    op = null;
    Cu.forceGC();

    let server = dstFolder.server;
    let newMsgHdr = db.createNewHdr(fakeKey);
    let outputStream = dstFolder.getOfflineStoreOutputStream(newMsgHdr);
    let content = lazy.MailStringUtils.uint8ArrayToByteString(
      await IOUtils.read(file.path)
    );

    let msgParser = Cc[
      "@mozilla.org/messenger/messagestateparser;1"
    ].createInstance(Ci.nsIMsgParseMailMsgState);
    msgParser.SetMailDB(db);
    msgParser.state = Ci.nsIMsgParseMailMsgState.ParseHeadersState;
    msgParser.newMsgHdr = newMsgHdr;
    msgParser.setNewKey(fakeKey);

    for (let line of content.split("\r\n")) {
      line += "\r\n";
      msgParser.ParseAFolderLine(line, line.length);
      outputStream.write(line, line.length);
    }
    msgParser.FinishHeader();

    newMsgHdr.orFlags(Ci.nsMsgMessageFlags.Offline | Ci.nsMsgMessageFlags.Read);
    newMsgHdr.offlineMessageSize = content.length;
    db.addNewHdrToDB(newMsgHdr, true);
    dstFolder.setFlag(Ci.nsMsgFolderFlags.OfflineEvents);
    if (server.msgStore) {
      server.msgStore.finishNewMessage(outputStream, newMsgHdr);
    }

    urlListener.OnStopRunningUrl(url, Cr.NS_OK);
    outputStream.close();
    db.close(true);
  }

  ensureFolderExists(parent, folderName, msgWindow, urlListener) {
    this._withClient(parent, client => {
      let runningUrl = client.startRunningUrl(urlListener, msgWindow);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapEnsureExistsFolder;
      client.onReady = () => {
        client.ensureFolderExists(parent, folderName);
      };
    });
  }

  updateFolderStatus(folder, urlListener) {
    this._withClient(folder, client => {
      let runningUrl = client.startRunningUrl(urlListener);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapFolderStatus;
      client.onReady = () => {
        client.updateFolderStatus(folder);
      };
    });
  }

  createFolder(parent, folderName, urlListener) {
    return this._withClient(parent, (client, runningUrl) => {
      client.startRunningUrl(urlListener, null, runningUrl);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapCreateFolder;
      client.onReady = () => {
        client.createFolder(parent, folderName);
      };
    });
  }

  moveFolder(srcFolder, dstFolder, urlListener, msgWindow) {
    this._withClient(srcFolder, client => {
      let runningUrl = client.startRunningUrl(urlListener, msgWindow);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapMoveFolderHierarchy;
      client.onReady = () => {
        client.moveFolder(srcFolder, dstFolder);
      };
    });
  }

  listFolder(folder, urlListener) {
    this._withClient(folder, client => {
      let runningUrl = client.startRunningUrl(urlListener);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapListFolder;
      client.onReady = () => {
        client.listFolder(folder);
      };
    });
  }

  deleteFolder(folder, urlListener, msgWindow) {
    this._withClient(folder, client => {
      client.startRunningUrl(urlListener, msgWindow);
      client.onReady = () => {
        client.deleteFolder(folder);
      };
    });
  }

  storeCustomKeywords(folder, msgWindow, flagsToAdd, flagsToSubtract, uids) {
    return this._withClient(folder, (client, runningUrl) => {
      client.startRunningUrl(null, msgWindow, runningUrl);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapMsgStoreCustomKeywords;
      client.onReady = () => {
        client.storeCustomKeywords(folder, flagsToAdd, flagsToSubtract, uids);
      };
    });
  }

  downloadMessagesForOffline(messageIds, folder, urlListener, msgWindow) {
    let server = folder.QueryInterface(
      Ci.nsIMsgImapMailFolder
    ).imapIncomingServer;
    let imapUrl = Services.io
      .newURI(
        `imap://${server.hostName}:${server.port}/fetch>UID>/${folder.name}>${messageIds}`
      )
      .QueryInterface(Ci.nsIImapUrl);
    imapUrl.storeResultsOffline = true;
    if (urlListener) {
      imapUrl
        .QueryInterface(Ci.nsIMsgMailNewsUrl)
        .RegisterListener(urlListener);
    }
    this._withClient(folder, client => {
      client.startRunningUrl(urlListener, msgWindow, imapUrl);
      client.onReady = () => {
        client.fetchMessage(folder, messageIds);
      };
    });
  }

  playbackAllOfflineOperations(msgWindow, urlListener) {
    let offlineSync = Cc["@mozilla.org/imap/offlinesync;1"].createInstance(
      Ci.nsIImapOfflineSync
    );
    offlineSync.init(msgWindow, urlListener, null, false);
    offlineSync.processNextOperation();
  }

  getHeaders(folder, urlListener, outURL, messageIds, messageIdsAreUID) {
    return this._withClient(folder, (client, runningUrl) => {
      client.startRunningUrl(urlListener, null, runningUrl);
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapMsgFetch;
      client.onReady = () => {
        client.getHeaders(folder, messageIds);
      };
    });
  }

  getBodyStart(folder, urlListener, messageIds, numBytes) {
    return this._withClient(folder, (client, runningUrl) => {
      runningUrl.QueryInterface(Ci.nsIImapUrl).imapAction =
        Ci.nsIImapUrl.nsImapMsgPreview;
      client.startRunningUrl(urlListener, null, runningUrl);
      client.onReady = () => {
        client.fetchMessage(folder, messageIds, numBytes);
      };
    });
  }

  deleteAllMessages(folder, urlListener) {
    this._withClient(folder, client => {
      client.startRunningUrl(urlListener);
      client.onReady = () => {
        client.deleteAllMessages(folder);
      };
    });
  }

  verifyLogon(folder, urlListener, msgWindow) {
    return this._withClient(folder, (client, runningUrl) => {
      client.verifyLogon = true;
      client.startRunningUrl(urlListener, msgWindow, runningUrl);
      client.onReady = () => {};
    });
  }

  /**
   * Do some actions with a connection.
   *
   * @param {nsIMsgFolder} folder - The associated folder.
   * @param {Function} handler - A callback function to take a ImapClient
   *   instance, and do some actions.
   */
  _withClient(folder, handler) {
    let server = folder.server.QueryInterface(Ci.nsIMsgIncomingServer);
    let runningUrl = Services.io
      .newURI(`imap://${server.hostName}:${server.port}`)
      .QueryInterface(Ci.nsIMsgMailNewsUrl);
    server.wrappedJSObject.withClient(folder, client =>
      handler(client, runningUrl)
    );
    return runningUrl;
  }
}

ImapService.prototype.classID = Components.ID(
  "{2ea8fbe6-029b-4bff-ae05-b794cf955afb}"
);
