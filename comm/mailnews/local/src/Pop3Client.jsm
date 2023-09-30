/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["Pop3Client"];

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);
var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
var { CommonUtils } = ChromeUtils.importESModule(
  "resource://services-common/utils.sys.mjs"
);
var { CryptoUtils } = ChromeUtils.importESModule(
  "resource://services-crypto/utils.sys.mjs"
);
var { LineReader } = ChromeUtils.import("resource:///modules/LineReader.jsm");
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { MailStringUtils } = ChromeUtils.import(
  "resource:///modules/MailStringUtils.jsm"
);
var { Pop3Authenticator } = ChromeUtils.import(
  "resource:///modules/MailAuthenticator.jsm"
);

/**
 * A structure to represent a response received from the server. A response can
 * be a single status line of a multi-line data block.
 *
 * @typedef {object} Pop3Response
 * @property {boolean} success - True for a positive status indicator ("+OK","+").
 * @property {string} status - The status indicator, can be "+OK", "-ERR" or "+".
 * @property {string} statusText - The status line of the response excluding the
 *   status indicator.
 * @property {string} data - The part of a multi-line data block excluding the
 *   status line.
 *
 * A single char to represent a uidl status, possible values are:
 *   - 'k'=KEEP,
 *   - 'd'=DELETE
 *   - 'b'=TOO_BIG
 *   - 'f'=FETCH_BODY
 * @typedef {string} UidlStatus
 */

const UIDL_KEEP = "k";
const UIDL_DELETE = "d";
const UIDL_TOO_BIG = "b";
const UIDL_FETCH_BODY = "f";

// There can be multiple Pop3Client running concurrently, assign each logger a
// unique prefix.
let loggerId = 0;

function getLoggerId() {
  return loggerId++ % 1000;
}

/**
 * A class to interact with POP3 server.
 */
class Pop3Client {
  /**
   * @param {nsIPop3IncomingServer} server - The associated server instance.
   */
  constructor(server) {
    this._server = server.QueryInterface(Ci.nsIMsgIncomingServer);
    this._server.wrappedJSObject.runningClient = this;
    this._authenticator = new Pop3Authenticator(server);
    this._lineReader = new LineReader();

    // Somehow, Services.io.newURI("pop3://localhost") doesn't work, what we
    // need is just a valid nsIMsgMailNewsUrl to propagate OnStopRunningUrl and
    // secInfo.
    this.runningUri = Services.io
      .newURI(`smtp://${this._server.hostName}:${this._server.port}`)
      .mutate()
      .setScheme("pop3")
      .finalize()
      .QueryInterface(Ci.nsIMsgMailNewsUrl);

    // A list of auth methods detected from the EHLO response.
    this._supportedAuthMethods = [];
    // A list of auth methods that worth a try.
    this._possibleAuthMethods = [];
    // Auth method set by user preference.
    this._preferredAuthMethods =
      {
        [Ci.nsMsgAuthMethod.passwordCleartext]: ["USERPASS", "PLAIN", "LOGIN"],
        [Ci.nsMsgAuthMethod.passwordEncrypted]: ["CRAM-MD5"],
        [Ci.nsMsgAuthMethod.GSSAPI]: ["GSSAPI"],
        [Ci.nsMsgAuthMethod.NTLM]: ["NTLM"],
        [Ci.nsMsgAuthMethod.OAuth2]: ["XOAUTH2"],
        [Ci.nsMsgAuthMethod.secure]: ["CRAM-MD5", "GSSAPI"],
      }[server.authMethod] || [];
    // The next auth method to try if the current failed.
    this._nextAuthMethod = null;

    this._sink = Cc["@mozilla.org/messenger/pop3-sink;1"].createInstance(
      Ci.nsIPop3Sink
    );
    this._sink.popServer = server;

    this._logger = console.createInstance({
      prefix: `mailnews.pop3.${getLoggerId()}`,
      maxLogLevel: "Warn",
      maxLogLevelPref: "mailnews.pop3.loglevel",
    });

    this.onReady = () => {};

    this._cutOffTimestamp = -1;
    if (
      this._server.deleteByAgeFromServer &&
      this._server.numDaysToLeaveOnServer
    ) {
      // We will send DELE request for messages received before this timestamp.
      this._cutOffTimestamp =
        Date.now() / 1000 - this._server.numDaysToLeaveOnServer * 24 * 60 * 60;
    }

    this._maxMessageSize = Infinity;
    if (this._server.limitOfflineMessageSize) {
      this._maxMessageSize = this._server.maxMessageSize
        ? this._server.maxMessageSize * 1024
        : 50 * 1024;
    }

    this._messagesToHandle = [];
  }

  /**
   * Initiate a connection to the server
   */
  connect() {
    let hostname = this._server.hostName.toLowerCase();
    this._logger.debug(`Connecting to pop://${hostname}:${this._server.port}`);
    this.runningUri
      .QueryInterface(Ci.nsIMsgMailNewsUrl)
      .SetUrlState(true, Cr.NS_OK);
    this._server.serverBusy = true;
    this._secureTransport = this._server.socketType == Ci.nsMsgSocketType.SSL;
    this._socket = new TCPSocket(hostname, this._server.port, {
      binaryType: "arraybuffer",
      useSecureTransport: this._secureTransport,
    });
    this._socket.onopen = this._onOpen;
    this._socket.onerror = this._onError;

    this._authenticating = false;
    // Indicates if the connection has been closed and can't be used anymore.
    this._destroyed = false;
    // Save the incomplete server payload, start parsing after seeing \r\n.
    this._pendingPayload = "";
  }

  /**
   * Check and fetch new mails.
   *
   * @param {boolean} downloadMail - Whether to download mails using TOP/RETR.
   * @param {nsIMsgWindow} msgWindow - The associated msg window.
   * @param {nsIMsgFolder} folder - The folder to save the messages to.
   */
  async getMail(downloadMail, msgWindow, folder) {
    this._downloadMail = downloadMail;
    this._msgWindow = msgWindow;
    this._sink.folder = folder;
    this._actionAfterAuth = this._actionStat;
    this.urlListener.OnStartRunningUrl(this.runningUri, Cr.NS_OK);

    await this._loadUidlState();
    this._actionCapa();
  }

  /**
   * Verify that we can logon to the server. Exit after auth success/failure.
   *
   * @param {nsIMsgWindow} msgWindow - The associated msg window.
   */
  verifyLogon(msgWindow) {
    this._msgWindow = msgWindow;
    this._verifyLogon = true;
    this._actionAfterAuth = this._actionDone;
    this._actionCapa();
  }

  /**
   * Fetch the full message of a uidl.
   *
   * @param {nsIPop3Sink} sink - The sink to use for this request.
   * @param {string} uidl - The uidl of the message to fetch.
   */
  async fetchBodyForUidl(sink, uidl) {
    this._logger.debug(`Fetching body for uidl=${uidl}`);

    this._downloadMail = true;
    this._sink = sink;
    this._sink.buildMessageUri = true;
    this.urlListener = sink.folder.QueryInterface(Ci.nsIUrlListener);
    this.urlListener.OnStartRunningUrl(this.runningUri, Cr.NS_OK);

    await this._loadUidlState();

    let uidlState = this._uidlMap.get(uidl);
    if (!uidlState) {
      // This uidl is no longer on the server, use this._sink to delete the
      // msgHdr.
      try {
        this._sink.beginMailDelivery(true, null);
        this._folderLocked = true;
        this._logger.debug(
          `Folder lock acquired uri=${this._sink.folder.URI}.`
        );
        this._sink.incorporateBegin(uidl, 0);
        this._actionDone(Cr.NS_ERROR_FAILURE);
      } catch (e) {
        this._actionError("pop3MessageWriteError");
      }
      return;
    }
    if (uidlState.status != UIDL_TOO_BIG) {
      this._actionDone(Cr.NS_ERROR_FAILURE);
      return;
    }

    this._singleUidlToDownload = uidl;
    this._uidlMap.set(uidl, {
      ...uidlState,
      status: UIDL_FETCH_BODY,
    });
    this._actionAfterAuth = this._actionStat;
    this._actionCapa();
  }

  /**
   * Mark uidl status by a passed in Map, then write to popstate.dat.
   *
   * @param {Map<string, UidlStatus>} uidlsToMark - A Map from uidl to status.
   */
  async markMessages(uidlsToMark) {
    this._logger.debug("markMessages", uidlsToMark);
    if (!this._uidlMap) {
      this._loadUidlState();
    }
    // Callers of nsIPop3IncomingServer.markMessages (e.g. filters) expect it to
    // act as a sync function, otherwise, the flags set by filters may not take
    // effect.
    Services.tm.spinEventLoopUntil(
      "nsIPop3IncomingServer.markMessages is a synchronous function",
      () => {
        return this._uidlMap;
      }
    );
    for (let [uidl, status] of uidlsToMark) {
      let uidlState = this._uidlMap.get(uidl);
      this._uidlMap.set(uidl, {
        ...uidlState,
        status,
      });
      this._uidlMapChanged = true;
    }
    await this._writeUidlState(true);
  }

  /**
   * Send `QUIT` request to the server.
   * @param {Function} nextAction - Callback function after QUIT response.
   */
  quit(nextAction) {
    this._onData = () => {};
    this._onError = () => {};
    if (this._socket?.readyState == "open") {
      this._send("QUIT");
      this._nextAction = nextAction || this.close;
    } else if (nextAction) {
      nextAction();
    }
  }

  /**
   * Close the socket.
   */
  close = () => {
    this._socket.close();
  };

  /**
   * The open event handler.
   */
  _onOpen = () => {
    this._logger.debug("Connected");
    this._socket.ondata = this._onData;
    this._socket.onclose = this._onClose;
    this._nextAction = res => {
      // See if there is an APOP timestamp.
      // eslint-disable-next-line no-control-regex
      let matches = res.statusText.match(/<[\x00-\x7F]+@[\x00-\x7F]+>/);
      if (matches?.[0]) {
        this._apopTimestamp = matches[0];
      }
      this.onOpen();
    };
    this._socket.transport.setTimeout(
      Ci.nsISocketTransport.TIMEOUT_READ_WRITE,
      Services.prefs.getIntPref("mailnews.tcptimeout")
    );
  };

  /**
   * Parse the server response.
   *
   * @param {string} str - Response received from the server.
   * @returns {Pop3Response}
   */
  _parse(str) {
    if (this._lineReader.processingMultiLineResponse) {
      // When processing multi-line response, no parsing should happen. If
      // `+something` is treated as status line, _actionRetrResponse will treat
      // it as a new message.
      return { data: str };
    }
    let matches = /^(\+OK|-ERR|\+) ?(.*)\r\n([^]*)/.exec(str);
    if (matches) {
      let [, status, statusText, data] = matches;
      return { success: status != "-ERR", status, statusText, data };
    }
    return { data: str };
  }

  /**
   * The data event handler.
   *
   * @param {TCPSocketEvent} event - The data event.
   */
  _onData = async event => {
    // Some servers close the socket on invalid username/password, this line
    // guarantees onclose is handled before we try another AUTH method. See the
    // same handling in SmtpClient.jsm.
    await new Promise(resolve => setTimeout(resolve));

    let stringPayload = CommonUtils.arrayBufferToByteString(
      new Uint8Array(event.data)
    );
    this._logger.debug(`S: ${stringPayload}`);
    if (this._pendingPayload) {
      stringPayload = this._pendingPayload + stringPayload;
    }
    if (stringPayload.includes("\r\n")) {
      // Start parsing if the payload contains at least one line break.
      this._pendingPayload = "";
      let res = this._parse(stringPayload);
      this._nextAction?.(res);
    } else {
      // Save the incomplete payload for the next ondata event.
      this._pendingPayload = stringPayload;
    }
  };

  /**
   * The error event handler.
   *
   * @param {TCPSocketErrorEvent} event - The error event.
   */
  _onError = async event => {
    this._logger.error(`${event.name}: a ${event.message} error occurred`);
    this._server.serverBusy = false;
    this.quit();
    let secInfo =
      await event.target.transport?.tlsSocketControl?.asyncGetSecurityInfo();
    if (secInfo) {
      this.runningUri.failedSecInfo = secInfo;
      // Notify about the error directly. Due to the await above, the _onClose
      // event is likely to complete before we get here, which means _actionDone
      // ran and won't run again.
      this.urlListener.OnStopRunningUrl(this.runningUri, event.errorCode);
    }
    this._actionDone(event.errorCode);
  };

  /**
   * The close event handler.
   */
  _onClose = () => {
    this._logger.debug("Connection closed.");
    this._server.serverBusy = false;
    this._destroyed = true;
    if (this._authenticating) {
      // In some cases, socket is closed for invalid username/password.
      this._actionAuthResponse({ success: false });
    } else {
      this._actionDone();
    }
  };

  _lineSeparator = AppConstants.platform == "win" ? "\r\n" : "\n";

  /**
   * Read popstate.dat into this._uidlMap.
   */
  async _loadUidlState() {
    let stateFile = this._server.localPath;
    stateFile.append("popstate.dat");
    if (!(await IOUtils.exists(stateFile.path))) {
      this._uidlMap = new Map();
      return;
    }

    let content = await IOUtils.readUTF8(stateFile.path);
    this._uidlMap = new Map();
    let uidlLine = false;
    for (let line of content.split(this._lineSeparator)) {
      if (!line) {
        continue;
      }
      if (uidlLine) {
        let [status, uidl, receivedAt] = line.split(" ");
        this._uidlMap.set(uidl, {
          status, // @type {UidlStatus}
          uidl,
          receivedAt,
        });
      }
      if (line.startsWith("#")) {
        // A comment line.
        continue;
      }
      if (line.startsWith("*")) {
        // The host & user line.
        uidlLine = true;
      }
    }
  }

  /**
   * Write this._uidlMap into popstate.dat.
   *
   * @param {boolean} [resetFlag] - If true, reset _uidlMapChanged to false.
   */
  async _writeUidlState(resetFlag) {
    if (!this._uidlMapChanged) {
      return;
    }

    let stateFile = this._server.localPath;
    stateFile.append("popstate.dat");
    let content = [
      "# POP3 State File",
      "# This is a generated file!  Do not edit.",
      "",
      `*${this._server.hostName} ${this._server.username}`,
    ];
    for (let msg of this._messagesToHandle) {
      // _messagesToHandle is not empty means an error happened, put them back
      // to _uidlMap to prevent loss of popstate.
      this._uidlMap.set(msg.uidl, msg);
    }
    for (let { status, uidl, receivedAt } of this._uidlMap.values()) {
      if (receivedAt) {
        content.push(`${status} ${uidl} ${receivedAt}`);
      }
    }
    this._writeUidlPromise = IOUtils.writeUTF8(
      stateFile.path,
      content.join(this._lineSeparator)
    );
    await this._writeUidlPromise;
    this._writeUidlPromise = null;

    if (resetFlag) {
      this._uidlMapChanged = false;
    }
  }

  /**
   * Send a command to the server.
   *
   * @param {string} str - The command string to send.
   * @param {boolean} [suppressLogging=false] - Whether to suppress logging the str.
   */
  _send(str, suppressLogging) {
    if (this._socket?.readyState != "open") {
      if (str != "QUIT") {
        this._logger.warn(
          `Socket state is ${this._socket?.readyState} - won't send command.`
        );
      }
      return;
    }

    if (suppressLogging && AppConstants.MOZ_UPDATE_CHANNEL != "default") {
      this._logger.debug(
        "C: Logging suppressed (it probably contained auth information)"
      );
    } else {
      // Do not suppress for non-release builds, so that debugging auth problems
      // is easier.
      this._logger.debug(`C: ${str}`);
    }

    this._socket.send(CommonUtils.byteStringToArrayBuffer(str + "\r\n").buffer);
  }

  /**
   * Send `CAPA` request to the server.
   */
  _actionCapa = () => {
    this._nextAction = this._actionCapaResponse;
    this._capabilities = [];
    this._newMessageDownloaded = 0;
    this._newMessageTotal = 0;
    this._send("CAPA");
  };

  /**
   * Handle `CAPA` response.
   *
   * @param {Pop3Response} res - CAPA response received from the server.
   */
  _actionCapaResponse = res => {
    if (res.status && !res.success) {
      this._actionChooseFirstAuthMethod();
      return;
    }
    this._lineReader.read(
      res.data,
      line => {
        line = line.trim().toUpperCase();
        if (line == "USER") {
          this._supportedAuthMethods.push("USERPASS");
        } else if (line.startsWith("SASL ")) {
          this._supportedAuthMethods.push(...line.slice(5).split(" "));
        } else {
          this._capabilities.push(line.split(" ")[0]);
        }
      },
      () => this._actionChooseFirstAuthMethod()
    );
  };

  /**
   * Decide the first auth method to try.
   */
  _actionChooseFirstAuthMethod = () => {
    if (
      [
        Ci.nsMsgSocketType.trySTARTTLS,
        Ci.nsMsgSocketType.alwaysSTARTTLS,
      ].includes(this._server.socketType) &&
      !this._secureTransport
    ) {
      if (this._capabilities.includes("STLS")) {
        // Init STARTTLS negotiation if required by user pref and supported.
        this._nextAction = this._actionStlsResponse;
        // STLS is the POP3 command to init STARTTLS.
        this._send("STLS");
      } else {
        // Abort if not supported.
        this._logger.error("Server doesn't support STLS. Aborting.");
        this._actionError("nsErrorCouldNotConnectViaTls");
      }
      return;
    }

    // If a preferred method is not supported by the server, no need to try it.
    this._possibleAuthMethods = this._preferredAuthMethods.filter(x =>
      this._supportedAuthMethods.includes(x)
    );
    if (!this._possibleAuthMethods.length) {
      if (this._server.authMethod == Ci.nsMsgAuthMethod.passwordCleartext) {
        this._possibleAuthMethods.unshift("USERPASS");
      } else if (
        this._server.authMethod == Ci.nsMsgAuthMethod.passwordEncrypted
      ) {
        this._possibleAuthMethods.unshift(
          this._apopTimestamp ? "APOP" : "CRAM-MD5"
        );
      } else if (this._server.authMethod == Ci.nsMsgAuthMethod.GSSAPI) {
        this._possibleAuthMethods.unshift("GSSAPI");
      } else if (this._server.authMethod == Ci.nsMsgAuthMethod.NTLM) {
        this._possibleAuthMethods.unshift("NTLM");
      } else if (this._server.authMethod == Ci.nsMsgAuthMethod.OAuth2) {
        // Some servers don't return XOAUTH2 in CAPA correctly.
        this._possibleAuthMethods.unshift("XOAUTH2");
      }
    }
    this._logger.debug(`Possible auth methods: ${this._possibleAuthMethods}`);
    this._nextAuthMethod = this._nextAuthMethod || this._possibleAuthMethods[0];

    if (this._nextAuthMethod) {
      this._updateStatus("hostContact");
      this._actionAuth();
      return;
    }

    // Preferred auth methods don't match any supported auth methods. Give user
    // some hints to change the config.
    if (
      this._server.authMethod == Ci.nsMsgAuthMethod.passwordCleartext &&
      this._supportedAuthMethods.includes("CRAM-MD5")
    ) {
      // Suggest changing from plain password to encrypted password.
      this._actionError("pop3AuthChangePlainToEncrypt");
    } else if (
      this._server.authMethod == Ci.nsMsgAuthMethod.passwordEncrypted &&
      (this._supportedAuthMethods.includes("PLAIN") ||
        this._supportedAuthMethods.includes("LOGIN"))
    ) {
      // Suggest changing from encrypted password to plain password.
      this._actionError(
        this._secureTransport
          ? "pop3AuthChangeEncryptToPlainSSL"
          : "pop3AuthChangeEncryptToPlainNoSSL"
      );
    } else {
      // General suggestion about changing auth method.
      this._actionError("pop3AuthMechNotSupported");
    }
  };

  /**
   * Handle STLS response. STLS is the POP3 command to init STARTTLS.
   *
   * @param {Pop3Response} res - STLS response received from the server.
   */
  _actionStlsResponse = res => {
    if (!res.success) {
      this._actionDone(Cr.NS_ERROR_FAILURE);
      return;
    }
    this._socket.upgradeToSecure();
    this._secureTransport = true;
    this._actionCapa();
  };

  /**
   * Init authentication depending on server capabilities and user prefs.
   */
  _actionAuth = async () => {
    if (!this._nextAuthMethod) {
      this._actionDone(Cr.NS_ERROR_FAILURE);
      return;
    }

    if (this._destroyed) {
      // If connection is lost, reconnect.
      this.connect();
      return;
    }

    this._authenticating = true;

    this._currentAuthMethod = this._nextAuthMethod;
    this._nextAuthMethod =
      this._possibleAuthMethods[
        this._possibleAuthMethods.indexOf(this._currentAuthMethod) + 1
      ];
    this._logger.debug(`Current auth method: ${this._currentAuthMethod}`);
    this._nextAction = this._actionAuthResponse;

    switch (this._currentAuthMethod) {
      case "USERPASS":
        this._nextAction = this._actionAuthUserPass;
        this._send(`USER ${this._authenticator.username}`);
        break;
      case "PLAIN":
        this._nextAction = this._actionAuthPlain;
        this._send("AUTH PLAIN");
        break;
      case "LOGIN":
        this._nextAction = this._actionAuthLoginUser;
        this._send("AUTH LOGIN");
        break;
      case "CRAM-MD5":
        this._nextAction = this._actionAuthCramMd5;
        this._send("AUTH CRAM-MD5");
        break;
      case "APOP": {
        let hasher = Cc["@mozilla.org/security/hash;1"].createInstance(
          Ci.nsICryptoHash
        );
        hasher.init(hasher.MD5);
        let data =
          this._apopTimestamp +
          (await this._authenticator.getByteStringPassword());
        let digest = CommonUtils.bytesAsHex(
          CryptoUtils.digestBytes(data, hasher)
        );
        this._send(`APOP ${this._authenticator.username} ${digest}`, true);
        break;
      }
      case "GSSAPI": {
        this._authenticator.initGssapiAuth("pop");
        try {
          let token = this._authenticator.getNextGssapiToken("");
          this._nextAction = res => this._actionAuthGssapi(res, token);
        } catch (e) {
          this._logger.error(e);
          this._actionError("pop3GssapiFailure");
          return;
        }
        this._send("AUTH GSSAPI");
        break;
      }
      case "NTLM": {
        this._authenticator.initNtlmAuth("pop");
        try {
          let token = this._authenticator.getNextNtlmToken("");
          this._nextAction = res => this._actionAuthNtlm(res, token);
        } catch (e) {
          this._logger.error(e);
          this._actionDone(Cr.NS_ERROR_FAILURE);
          return;
        }
        this._send("AUTH NTLM");
        break;
      }
      case "XOAUTH2":
        this._nextAction = this._actionAuthXoauth;
        this._send("AUTH XOAUTH2");
        break;
      default:
        this._actionDone();
    }
  };

  /**
   * Handle authentication response.
   *
   * @param {Pop3Response} res - Authentication response received from the server.
   */
  _actionAuthResponse = res => {
    this._authenticating = false;
    if (res.success) {
      this._actionAfterAuth();
      return;
    }

    if (this._nextAuthMethod) {
      // Try the next auth method.
      this._actionAuth();
      return;
    }

    if (this._verifyLogon) {
      this.runningUri.errorCode = "pop3PasswordFailed";
      this._actionDone(Cr.NS_ERROR_FAILURE);
      return;
    }

    if (
      ["USERPASS", "PLAIN", "LOGIN", "CRAM-MD5"].includes(
        this._currentAuthMethod
      )
    ) {
      this._actionError(
        "pop3PasswordFailed",
        [this._server.username],
        res.statusText
      );

      // Ask user what to do.
      let action = this._authenticator.promptAuthFailed();
      if (action == 1) {
        // Cancel button pressed.
        this._actionDone(Cr.NS_ERROR_FAILURE);
        return;
      }
      if (action == 2) {
        // 'New password' button pressed.
        this._authenticator.forgetPassword();
      }

      // Retry.
      this._nextAuthMethod = this._possibleAuthMethods[0];
      this._actionAuth();
    } else if (this._currentAuthMethod == "GSSAPI") {
      this._actionError("pop3GssapiFailure", [], res.statusText);
    }
  };

  /**
   * The second step of USER/PASS auth, send the password to the server.
   */
  _actionAuthUserPass = async res => {
    if (!res.success) {
      this._actionError("pop3UsernameFailure", [], res.statusText);
      return;
    }
    this._nextAction = this._actionAuthResponse;
    this._send(
      `PASS ${await this._authenticator.getByteStringPassword()}`,
      true
    );
  };

  /**
   * The second step of PLAIN auth, send the auth token to the server.
   */
  _actionAuthPlain = async res => {
    if (!res.success) {
      this._actionError("pop3UsernameFailure", [], res.statusText);
      return;
    }
    this._nextAction = this._actionAuthResponse;
    this._send(await this._authenticator.getPlainToken(), true);
  };

  /**
   * The second step of LOGIN auth, send the username to the server.
   */
  _actionAuthLoginUser = () => {
    this._nextAction = this._actionAuthLoginPass;
    this._logger.debug("AUTH LOGIN USER");
    this._send(btoa(this._authenticator.username), true);
  };

  /**
   * The third step of LOGIN auth, send the password to the server.
   */
  _actionAuthLoginPass = async res => {
    if (!res.success) {
      this._actionError("pop3UsernameFailure", [], res.statusText);
      return;
    }
    this._nextAction = this._actionAuthResponse;
    this._logger.debug("AUTH LOGIN PASS");
    let password = await this._authenticator.getPassword();
    if (
      !Services.prefs.getBoolPref(
        "mail.smtp_login_pop3_user_pass_auth_is_latin1",
        true
      ) ||
      !/^[\x00-\xFF]+$/.test(password) // eslint-disable-line no-control-regex
    ) {
      // Unlike PLAIN auth, the payload of LOGIN auth is not standardized. When
      // `mail.smtp_login_pop3_user_pass_auth_is_latin1` is true, we apply
      // base64 encoding directly. Otherwise, we convert it to UTF-8
      // BinaryString first, to make it work with btoa().
      password = MailStringUtils.stringToByteString(password);
    }
    this._send(btoa(password), true);
  };

  /**
   * The second step of CRAM-MD5 auth, send a HMAC-MD5 signature to the server.
   *
   * @param {Pop3Response} res - AUTH response received from the server.
   */
  _actionAuthCramMd5 = async res => {
    if (!res.success) {
      this._actionError("pop3UsernameFailure", [], res.statusText);
      return;
    }
    this._nextAction = this._actionAuthResponse;
    this._send(
      this._authenticator.getCramMd5Token(
        await this._authenticator.getPassword(),
        res.statusText
      ),
      true
    );
  };

  /**
   * The second and next step of GSSAPI auth.
   *
   * @param {Pop3Response} res - AUTH response received from the server.
   * @param {string} firstToken - The first GSSAPI token to send.
   */
  _actionAuthGssapi = (res, firstToken) => {
    if (res.status != "+") {
      this._actionAuthResponse(res);
      return;
    }

    if (firstToken) {
      this._nextAction = this._actionAuthGssapi;
      this._send(firstToken, true);
      return;
    }

    // Server returns a challenge, we send a new token. Can happen multiple times.
    let token;
    try {
      token = this._authenticator.getNextGssapiToken(res.statusText);
    } catch (e) {
      this._logger.error(e);
      this._actionAuthResponse({ success: false, data: "AUTH GSSAPI" });
      return;
    }
    this._send(token, true);
  };

  /**
   * The second and next step of NTLM auth.
   *
   * @param {Pop3Response} res - AUTH response received from the server.
   * @param {string} firstToken - The first NTLM token to send.
   */
  _actionAuthNtlm = (res, firstToken) => {
    if (res.status != "+") {
      this._actionAuthResponse(res);
      return;
    }

    if (firstToken) {
      this._nextAction = this._actionAuthNtlm;
      this._send(firstToken, true);
      return;
    }

    // Server returns a challenge, we send a new token. Can happen multiple times.
    let token;
    try {
      token = this._authenticator.getNextNtlmToken(res.statusText);
    } catch (e) {
      this._logger.error(e);
      this._actionAuthResponse({ success: false, data: "AUTH NTLM" });
      return;
    }
    this._send(token, true);
  };

  /**
   * The second step of XOAUTH2 auth.
   *
   * @param {Pop3Response} res - AUTH response received from the server.
   */
  _actionAuthXoauth = async res => {
    if (res.status != "+") {
      this._actionAuthResponse(res);
      return;
    }
    this._nextAction = this._actionAuthResponse;
    let token = await this._authenticator.getOAuthToken();
    this._send(token, true);
  };

  /**
   * Send `STAT` request to the server.
   */
  _actionStat = () => {
    this._nextAction = this._actionStatResponse;
    this._send("STAT");
  };

  /**
   * Handle `STAT` response.
   *
   * @param {Pop3Response} res - STAT response received from the server.
   */
  _actionStatResponse = res => {
    if (!res.success) {
      this._actionError("pop3StatFail", [], res.statusText);
      return;
    }

    let numberOfMessages = Number.parseInt(res.statusText);
    if (!numberOfMessages) {
      if (this._uidlMap.size) {
        this._uidlMap.clear();
        this._uidlMapChanged = true;
      }
      // Finish if there is no message.
      MailServices.pop3.notifyDownloadCompleted(this._sink.folder, 0);
      this._actionDone();
      return;
    }
    if (!this._downloadMail && !this._server.leaveMessagesOnServer) {
      // We are not downloading new mails, so finish now.
      this._sink.setBiffStateAndUpdateFE(
        Ci.nsIMsgFolder.nsMsgBiffState_NewMail,
        numberOfMessages,
        true
      );
      this._actionDone();
      return;
    }

    if (this._downloadMail) {
      try {
        this._sink.beginMailDelivery(
          this._singleUidlToDownload,
          this._msgWindow
        );
        this._folderLocked = true;
        this._logger.debug(
          `Folder lock acquired uri=${this._sink.folder.URI}.`
        );
      } catch (e) {
        const NS_MSG_FOLDER_BUSY = 2153054218;
        if (e.result == NS_MSG_FOLDER_BUSY) {
          this._actionError("pop3ServerBusy", [this._server.prettyName]);
        } else {
          this._actionError("pop3MessageWriteError");
        }
        return;
      }
    }
    this._actionList();
  };

  /**
   * Send `LIST` request to the server.
   */
  _actionList = () => {
    this._messageSizeMap = new Map();
    this._nextAction = this._actionListResponse;
    this._send("LIST");
  };

  /**
   * Handle `LIST` response.
   *
   * @param {Pop3Response} res - LIST response received from the server.
   */
  _actionListResponse = res => {
    if (res.status && !res.success) {
      this._actionError("pop3ListFailure", [], res.statusText);
      return;
    }
    this._lineReader.read(
      res.data,
      line => {
        let [messageNumber, messageSize] = line.split(" ");
        this._messageSizeMap.set(messageNumber, Number(messageSize));
      },
      () => {
        this._actionUidl();
      }
    );
  };

  /**
   * Send `UIDL` request to the server.
   */
  _actionUidl = () => {
    this._messagesToHandle = [];
    this._newUidlMap = new Map();
    this._nextAction = this._actionUidlResponse;
    this._send("UIDL");
  };

  /**
   * Handle `UIDL` response.
   *
   * @param {Pop3Response} res - UIDL response received from the server.
   */
  _actionUidlResponse = ({ status, success, data }) => {
    if (status && !success) {
      this._actionNoUidl();
      return;
    }
    this._lineReader.read(
      data,
      line => {
        let [messageNumber, uidl] = line.split(" ");
        uidl = uidl.trim();
        let uidlState = this._uidlMap.get(uidl);
        if (uidlState) {
          if (
            uidlState.status == UIDL_KEEP &&
            (!this._server.leaveMessagesOnServer ||
              uidlState.receivedAt < this._cutOffTimestamp)
          ) {
            // Delete this message.
            this._messagesToHandle.push({
              ...uidlState,
              messageNumber,
              status: UIDL_DELETE,
            });
          } else if (
            [UIDL_FETCH_BODY, UIDL_DELETE].includes(uidlState.status)
          ) {
            // Fetch the full message.
            this._messagesToHandle.push({
              ...uidlState,
              messageNumber,
              status: uidlState.status,
            });
          } else {
            // Do nothing to this message.
            this._newUidlMap.set(uidl, uidlState);
          }
        } else {
          this._newMessageTotal++;
          // Fetch the full message or only headers depending on server settings
          // and message size.
          let status =
            this._server.headersOnly ||
            this._messageSizeMap.get(messageNumber) > this._maxMessageSize
              ? UIDL_TOO_BIG
              : UIDL_FETCH_BODY;
          this._messagesToHandle.push({
            messageNumber,
            uidl,
            status,
          });
        }
      },
      () => {
        if (!this._downloadMail) {
          let numberOfMessages = this._messagesToHandle.filter(
            // No receivedAt means we're seeing it for the first time.
            msg => !msg.receivedAt
          ).length;
          if (numberOfMessages) {
            this._sink.setBiffStateAndUpdateFE(
              Ci.nsIMsgFolder.nsMsgBiffState_NewMail,
              numberOfMessages,
              true
            );
          }
          this._actionDone();
          return;
        }

        if (this._singleUidlToDownload) {
          this._messagesToHandle = this._messagesToHandle.filter(
            msg => msg.uidl == this._singleUidlToDownload
          );
          this._newUidlMap = this._uidlMap;
        }

        this._messagesToDownload = this._messagesToHandle.filter(msg =>
          [UIDL_FETCH_BODY, UIDL_TOO_BIG].includes(msg.status)
        );
        this._totalDownloadSize = this._messagesToDownload.reduce(
          (acc, msg) => acc + this._messageSizeMap.get(msg.messageNumber),
          0
        );
        this._totalReceivedSize = 0;
        try {
          let localFolder = this._sink.folder.QueryInterface(
            Ci.nsIMsgLocalMailFolder
          );
          if (
            localFolder.warnIfLocalFileTooBig(
              this._msgWindow,
              this._totalDownloadSize
            )
          ) {
            throw new Error("Not enough disk space");
          }
        } catch (e) {
          this._logger.error(e);
          this._actionDone(Cr.NS_ERROR_FAILURE);
          return;
        }

        this._uidlMapChanged =
          this._uidlMap.size != this._newUidlMap.size ||
          this._messagesToHandle.length;
        // This discards staled uidls that are no longer on the server.
        this._uidlMap = this._newUidlMap;

        this._sink.setMsgsToDownload(this._messagesToDownload.length);
        this._actionHandleMessage();
        this._updateProgress();
      }
    );
  };

  /**
   * If the server doesn't support UIDL, leaveMessagesOnServer and headersOnly
   * feature can't be used.
   */
  _actionNoUidl = () => {
    if (
      this._server.leaveMessagesOnServer ||
      this._server.headersOnly ||
      this._server.limitOfflineMessageSize ||
      this._singleUidlToDownload
    ) {
      this._actionError("pop3ServerDoesNotSupportUidlEtc", [
        this._server.hostName,
      ]);
      return;
    }
    for (let [messageNumber] of this._messageSizeMap) {
      // Send RETR for each message.
      this._messagesToHandle.push({
        status: UIDL_FETCH_BODY,
        messageNumber,
      });
    }
    this._actionHandleMessage();
  };

  /**
   * Consume a message from this._messagesToHandle, decide to send TOP, RETR or
   * DELE request.
   */
  _actionHandleMessage = () => {
    this._currentMessage = this._messagesToHandle.shift();
    if (
      this._messagesToHandle.length > 0 &&
      this._messagesToHandle.length % 20 == 0 &&
      !this._writeUidlPromise
    ) {
      // Update popstate.dat every 20 messages, so that even if an error
      // happens, no need to re-download all messages.
      this._writeUidlState();
    }
    if (this._currentMessage) {
      switch (this._currentMessage.status) {
        case UIDL_TOO_BIG:
          if (this._topFailed) {
            this._actionRetr();
          } else {
            this._actionTop();
          }
          break;
        case UIDL_FETCH_BODY:
          this._actionRetr();
          break;
        case UIDL_DELETE:
          this._actionDelete();
          break;
        default:
          break;
      }
    } else {
      this._sink.setBiffStateAndUpdateFE(
        Ci.nsIMsgFolder.nsMsgBiffState_NewMail,
        this._messagesToDownload
          ? this._messagesToDownload.length
          : // No UIDL support, every message is new.
            this._messageSizeMap.size,
        false
      );
      try {
        this._sink.endMailDelivery(this);
        this._folderLocked = false;
        this._logger.debug("Folder lock released.");
      } catch (e) {
        this._logger.error("endMailDelivery failed", e);
        this._actionDone(e.result || Cr.NS_ERROR_FAILURE);
        return;
      }
      this._actionDone();
    }
  };

  /**
   * Send `TOP` request to the server.
   */
  _actionTop = () => {
    this._nextAction = this._actionTopResponse;
    let lineNumber = this._server.headersOnly ? 0 : 20;
    this._send(`TOP ${this._currentMessage.messageNumber} ${lineNumber}`);
    this._updateStatus("receivingMessages", [
      ++this._newMessageDownloaded,
      this._newMessageTotal,
    ]);
  };

  /**
   * Handle `TOP` response.
   *
   * @param {Pop3Response} res - TOP response received from the server.
   */
  _actionTopResponse = res => {
    if (res.status) {
      if (res.success) {
        try {
          // Call incorporateBegin only once for each message.
          this._sink.incorporateBegin(
            this._currentMessage.uidl,
            Ci.nsMsgMessageFlags.Partial
          );
        } catch (e) {
          this._actionError("pop3MessageWriteError");
          return;
        }
      } else {
        // TOP is not supported.
        this._topFailed = true;
        this._actionRetr();
        return;
      }
    }
    this._lineReader.read(
      res.data,
      line => {
        // Remove \r\n and use the OS native line ending.
        line = line.slice(0, -2) + this._lineSeparator;
        try {
          this._sink.incorporateWrite(line, line.length);
        } catch (e) {
          this._actionError("pop3MessageWriteError");
          throw e; // Stop reading.
        }
      },
      () => {
        try {
          this._sink.incorporateComplete(
            this._msgWindow,
            // Set size because it's a partial message.
            this._messageSizeMap.get(this._currentMessage.messageNumber)
          );
        } catch (e) {
          this._actionError("pop3MessageWriteError");
          return;
        }

        let state = this._uidlMap.get(this._currentMessage.uidl);
        if (state?.status == UIDL_FETCH_BODY) {
          this._actionRetr();
          return;
        }
        if (state?.status == UIDL_DELETE) {
          this._actionDelete();
          return;
        }
        this._uidlMap.set(this._currentMessage.uidl, {
          status: UIDL_TOO_BIG,
          uidl: this._currentMessage.uidl,
          receivedAt: Math.floor(Date.now() / 1000),
        });
        this._uidlMapChanged = true;
        this._actionHandleMessage();
      }
    );
  };

  /**
   * Send `RETR` request to the server.
   */
  _actionRetr = () => {
    this._nextAction = this._actionRetrResponse;
    this._send(`RETR ${this._currentMessage.messageNumber}`);
    this._updateStatus("receivingMessages", [
      ++this._newMessageDownloaded,
      this._newMessageTotal,
    ]);
  };

  /**
   * Handle `RETR` response.
   *
   * @param {Pop3Response} res - RETR response received from the server.
   */
  _actionRetrResponse = res => {
    if (res.status) {
      if (!res.success) {
        this._actionError("pop3RetrFailure", [], res.statusText);
        return;
      }
      try {
        // Call incorporateBegin only once for each message.
        this._sink.incorporateBegin(this._currentMessage.uidl, 0);
      } catch (e) {
        this._actionError("pop3MessageWriteError");
        return;
      }
    }
    this._lineReader.read(
      res.data,
      line => {
        line = line.slice(0, -2) + this._lineSeparator;
        try {
          this._sink.incorporateWrite(line, line.length);
        } catch (e) {
          this._actionError("pop3MessageWriteError");
          throw e; // Stop reading.
        }
      },
      () => {
        // Don't count the ending indicator.
        this._totalReceivedSize -= ".\r\n".length;
        try {
          this._sink.incorporateComplete(
            this._msgWindow,
            0 // Set size only when it's a partial message.
          );
        } catch (e) {
          this._actionError("pop3MessageWriteError");
          return;
        }
        if (this._server.leaveMessagesOnServer) {
          let state = this._uidlMap.get(this._currentMessage.uidl);
          if (state?.status == UIDL_DELETE) {
            this._actionDelete();
          } else {
            this._uidlMap.set(this._currentMessage.uidl, {
              status: UIDL_KEEP,
              uidl: this._currentMessage.uidl,
              receivedAt: Math.floor(Date.now() / 1000),
            });
            this._uidlMapChanged = true;
            this._actionHandleMessage();
          }
        } else {
          this._actionDelete();
        }
      }
    );

    this._totalReceivedSize += res.data.length;
    this._updateProgress();
  };

  /**
   * Send `DELE` request to the server.
   */
  _actionDelete = () => {
    this._nextAction = this._actionDeleteResponse;
    this._send(`DELE ${this._currentMessage.messageNumber}`);
  };

  /**
   * Handle `DELE` response.
   *
   * @param {Pop3Response} res - DELE response received from the server.
   */
  _actionDeleteResponse = res => {
    if (!res.success) {
      this._actionError("pop3DeleFailure", [], res.statusText);
      return;
    }
    this._actionHandleMessage();
  };

  /**
   * Show an error prompt.
   *
   * @param {string} errorName - An error name corresponds to an entry of
   *   localMsgs.properties.
   * @param {string[]} errorParams - Params to construct the error message.
   * @param {string} serverErrorMsg - Error message returned by the server.
   */
  _actionError(errorName, errorParams, serverErrorMsg) {
    this._logger.error(`Got an error name=${errorName}`);
    if (errorName != "pop3PasswordFailed") {
      this._actionDone(Cr.NS_ERROR_FAILURE);
    }

    if (!this._msgWindow) {
      return;
    }
    let bundle = Services.strings.createBundle(
      "chrome://messenger/locale/localMsgs.properties"
    );
    let errorMsg;
    if (errorParams) {
      errorMsg = bundle.formatStringFromName(errorName, errorParams);
    } else {
      errorMsg = bundle.GetStringFromName(errorName);
    }
    if (serverErrorMsg) {
      let serverSaidPrefix = bundle.formatStringFromName("pop3ServerSaid", [
        this._server.hostName,
      ]);
      errorMsg += ` ${serverSaidPrefix} ${serverErrorMsg}`;
    }

    let errorTitle = bundle.formatStringFromName("pop3ErrorDialogTitle", [
      this._server.prettyName,
    ]);
    Services.prompt.alert(this._msgWindow.domWindow, errorTitle, errorMsg);
  }

  /**
   * Save popstate.dat when necessary, send QUIT.
   * @param {nsresult} status - Indicate if the last action succeeded.
   */
  _actionDone = (status = Cr.NS_OK) => {
    if (this._done) {
      return;
    }
    this._done = true;
    this._logger.debug(`Done with status=${status}`);
    this._authenticating = false;
    if (status == Cr.NS_OK) {
      if (this._newMessageTotal) {
        this._updateStatus("receivedMsgs", [
          this._newMessageTotal,
          this._newMessageTotal,
        ]);
      } else {
        this._updateStatus("noNewMessages");
      }
    } else if (this._currentMessage) {
      // Put _currentMessage back to the queue to prevent loss of popstate.
      this._messagesToHandle.unshift(this._currentMessage);
    }
    this._writeUidlState(true);
    // Normally we clean up after QUIT response.
    this.quit(() => this._cleanUp(status));
    // If we didn't receive QUIT response after 3 seconds, clean up anyway.
    setTimeout(() => {
      if (!this._cleanedUp) {
        this._cleanUp(status);
      }
    }, 3000);
  };

  /**
   * Notify listeners, close the socket and rest states.
   * @param {nsresult} status - Indicate if the last action succeeded.
   */
  _cleanUp = status => {
    this._cleanedUp = true;
    this.close();
    this.urlListener.OnStopRunningUrl(this.runningUri, status);
    this.runningUri.SetUrlState(false, Cr.NS_OK);
    this.onDone?.(status);
    if (this._folderLocked) {
      this._sink.abortMailDelivery(this);
      this._folderLocked = false;
      this._logger.debug("Folder lock released.");
    }
    this._server.wrappedJSObject.runningClient = null;
  };

  /**
   * Show a status message in the status bar.
   *
   * @param {string} statusName - A string name in localMsgs.properties.
   * @param {string[]} [params] - Params to format the string.
   */
  _updateStatus(statusName, params) {
    if (!this._msgWindow?.statusFeedback) {
      return;
    }
    if (!this._localBundle) {
      this._localBundle = Services.strings.createBundle(
        "chrome://messenger/locale/localMsgs.properties"
      );
      this._messengerBundle = Services.strings.createBundle(
        "chrome://messenger/locale/messenger.properties"
      );
    }
    let status = params
      ? this._localBundle.formatStringFromName(statusName, params)
      : this._localBundle.GetStringFromName(statusName);
    this._msgWindow.statusFeedback.showStatusString(
      this._messengerBundle.formatStringFromName("statusMessage", [
        this._server.prettyName,
        status,
      ])
    );
  }

  /**
   * Show a progress bar in the status bar.
   */
  _updateProgress() {
    this._msgWindow?.statusFeedback?.showProgress(
      Math.floor((this._totalReceivedSize * 100) / this._totalDownloadSize)
    );
  }

  /** @see nsIPop3Protocol */
  checkMessage(uidl) {
    return this._uidlMap.has(uidl);
  }
}
