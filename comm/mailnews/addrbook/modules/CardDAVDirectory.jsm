/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["CardDAVDirectory"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

const { SQLiteDirectory } = ChromeUtils.import(
  "resource:///modules/SQLiteDirectory.jsm"
);

ChromeUtils.defineESModuleGetters(lazy, {
  clearInterval: "resource://gre/modules/Timer.sys.mjs",
  setInterval: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  CardDAVUtils: "resource:///modules/CardDAVUtils.jsm",
  NotificationCallbacks: "resource:///modules/CardDAVUtils.jsm",
  OAuth2Module: "resource:///modules/OAuth2Module.jsm",
  OAuth2Providers: "resource:///modules/OAuth2Providers.jsm",
  VCardProperties: "resource:///modules/VCardUtils.jsm",
  VCardUtils: "resource:///modules/VCardUtils.jsm",
});

const PREFIX_BINDINGS = {
  card: "urn:ietf:params:xml:ns:carddav",
  cs: "http://calendarserver.org/ns/",
  d: "DAV:",
};
const NAMESPACE_STRING = Object.entries(PREFIX_BINDINGS)
  .map(([prefix, url]) => `xmlns:${prefix}="${url}"`)
  .join(" ");

const log = console.createInstance({
  prefix: "carddav.sync",
  maxLogLevel: "Warn",
  maxLogLevelPref: "carddav.sync.loglevel",
});

/**
 * Adds CardDAV sync to SQLiteDirectory.
 */
class CardDAVDirectory extends SQLiteDirectory {
  /** nsIAbDirectory */

  init(uri) {
    super.init(uri);

    let serverURL = this._serverURL;
    if (serverURL) {
      // Google's server enforces some vCard 3.0-isms (or just fails badly if
      // you don't provide exactly what it wants) so we use this property to
      // determine when to do things differently. Cards from this directory
      // inherit the same property.
      if (this.getBoolValue("carddav.vcard3")) {
        this._isGoogleCardDAV = true;
      } else {
        this._isGoogleCardDAV = serverURL.startsWith(
          "https://www.googleapis.com/"
        );
        if (this._isGoogleCardDAV) {
          this.setBoolValue("carddav.vcard3", true);
        }
      }

      // If this directory is configured, start sync'ing with the server in 30s.
      // Don't do this immediately, as this code runs at start-up and could
      // impact performance if there are lots of changes to process.
      if (this.getIntValue("carddav.syncinterval", 30) > 0) {
        this._syncTimer = lazy.setTimeout(() => this.syncWithServer(), 30000);
      }
    }

    let uidsToSync = this.getStringValue("carddav.uidsToSync", "");
    if (uidsToSync) {
      this._uidsToSync = new Set(uidsToSync.split(" ").filter(Boolean));
      this.setStringValue("carddav.uidsToSync", "");
      log.debug(`Retrieved list of cards to sync: ${uidsToSync}`);
    } else {
      this._uidsToSync = new Set();
    }

    let hrefsToRemove = this.getStringValue("carddav.hrefsToRemove", "");
    if (hrefsToRemove) {
      this._hrefsToRemove = new Set(hrefsToRemove.split(" ").filter(Boolean));
      this.setStringValue("carddav.hrefsToRemove", "");
      log.debug(`Retrieved list of cards to remove: ${hrefsToRemove}`);
    } else {
      this._hrefsToRemove = new Set();
    }
  }
  async cleanUp() {
    await super.cleanUp();

    if (this._syncTimer) {
      lazy.clearInterval(this._syncTimer);
      this._syncTimer = null;
    }

    if (this._uidsToSync.size) {
      let uidsToSync = [...this._uidsToSync].join(" ");
      this.setStringValue("carddav.uidsToSync", uidsToSync);
      log.debug(`Stored list of cards to sync: ${uidsToSync}`);
    }
    if (this._hrefsToRemove.size) {
      let hrefsToRemove = [...this._hrefsToRemove].join(" ");
      this.setStringValue("carddav.hrefsToRemove", hrefsToRemove);
      log.debug(`Stored list of cards to remove: ${hrefsToRemove}`);
    }
  }

  get propertiesChromeURI() {
    return "chrome://messenger/content/addressbook/abCardDAVProperties.xhtml";
  }
  get dirType() {
    return Ci.nsIAbManager.CARDDAV_DIRECTORY_TYPE;
  }
  get supportsMailingLists() {
    return false;
  }

  modifyCard(card) {
    // Well this is awkward. Because it's defined in nsIAbDirectory,
    // modifyCard must not be async, but we need to do async operations.
    let newCard = super.modifyCard(card);
    this._modifyCard(newCard);
  }
  async _modifyCard(card) {
    try {
      await this._sendCardToServer(card);
    } catch (ex) {
      console.error(ex);
    }
  }
  deleteCards(cards) {
    super.deleteCards(cards);
    this._deleteCards(cards);
  }
  async _deleteCards(cards) {
    for (let card of cards) {
      try {
        await this._deleteCardFromServer(card);
      } catch (ex) {
        console.error(ex);
        break;
      }
    }

    for (let card of cards) {
      this._uidsToSync.delete(card.UID);
    }
  }
  dropCard(card, needToCopyCard) {
    // Ideally, we'd not add the card until it was on the server, but we have
    // to return newCard synchronously.
    let newCard = super.dropCard(card, needToCopyCard);
    this._sendCardToServer(newCard).catch(console.error);
    return newCard;
  }
  addMailList() {
    throw Components.Exception(
      "CardDAVDirectory does not implement addMailList",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }
  setIntValue(name, value) {
    super.setIntValue(name, value);

    // Capture changes to the sync interval from the UI.
    if (name == "carddav.syncinterval") {
      this._scheduleNextSync();
    }
  }

  /** CardDAV specific */
  _syncInProgress = false;
  _syncTimer = null;

  get _serverURL() {
    return this.getStringValue("carddav.url", "");
  }
  get _syncToken() {
    return this.getStringValue("carddav.token", "");
  }
  set _syncToken(value) {
    this.setStringValue("carddav.token", value);
  }

  /**
   * Wraps CardDAVUtils.makeRequest, resolving path this directory's server
   * URL, and providing a mechanism to give a username and password specific
   * to this directory.
   *
   * @param {string} path - A path relative to the server URL.
   * @param {object} details - See CardDAVUtils.makeRequest.
   * @returns {Promise<object>} - See CardDAVUtils.makeRequest.
   */
  async _makeRequest(path, details = {}) {
    let serverURI = Services.io.newURI(this._serverURL);
    let uri = serverURI.resolve(path);

    if (!("_oAuth" in this)) {
      if (lazy.OAuth2Providers.getHostnameDetails(serverURI.host)) {
        this._oAuth = new lazy.OAuth2Module();
        this._oAuth.initFromABDirectory(this, serverURI.host);
      } else {
        this._oAuth = null;
      }
    }
    details.oAuth = this._oAuth;

    let username = this.getStringValue("carddav.username", "");
    let callbacks = new lazy.NotificationCallbacks(username);
    details.callbacks = callbacks;

    details.userContextId =
      this._userContextId ?? lazy.CardDAVUtils.contextForUsername(username);

    let response;
    try {
      Services.obs.notifyObservers(
        this,
        "addrbook-directory-request-start",
        this.UID
      );
      response = await lazy.CardDAVUtils.makeRequest(uri, details);
    } finally {
      Services.obs.notifyObservers(
        this,
        "addrbook-directory-request-end",
        this.UID
      );
    }
    if (
      details.expectedStatuses &&
      !details.expectedStatuses.includes(response.status)
    ) {
      throw Components.Exception(
        `Incorrect response from server: ${response.status} ${response.statusText}`,
        Cr.NS_ERROR_FAILURE
      );
    }

    if (callbacks.shouldSaveAuth) {
      // The user was prompted for a username and password. Save the response.
      this.setStringValue("carddav.username", callbacks.authInfo?.username);
      callbacks.saveAuth();
    }
    return response;
  }

  /**
   * Gets or creates the path for storing this card on the server. Cards that
   * already exist on the server have this value in the _href property.
   *
   * @param {nsIAbCard} card
   * @returns {string}
   */
  _getCardHref(card) {
    let href = card.getProperty("_href", "");
    if (href) {
      return href;
    }
    href = Services.io.newURI(this._serverURL).resolve(`${card.UID}.vcf`);
    return new URL(href).pathname;
  }

  _multigetRequest(hrefsToFetch) {
    hrefsToFetch = hrefsToFetch.map(
      href => `      <d:href>${xmlEncode(href)}</d:href>`
    );
    let data = `<card:addressbook-multiget ${NAMESPACE_STRING}>
      <d:prop>
        <d:getetag/>
        <card:address-data/>
      </d:prop>
      ${hrefsToFetch.join("\n")}
    </card:addressbook-multiget>`;

    return this._makeRequest("", {
      method: "REPORT",
      body: data,
      headers: {
        Depth: 1,
      },
      expectedStatuses: [207],
    });
  }

  /**
   * Performs a multiget request for the provided hrefs, and adds each response
   * to the directory, adding or modifying as necessary.
   *
   * @param {string[]} hrefsToFetch - The href of each card to be requested.
   */
  async _fetchAndStore(hrefsToFetch) {
    if (hrefsToFetch.length == 0) {
      return;
    }

    let response = await this._multigetRequest(hrefsToFetch);

    // If this directory is set to read-only, the following operations would
    // throw NS_ERROR_FAILURE, but sync operations are allowed on a read-only
    // directory, so set this._overrideReadOnly to avoid the exception.
    //
    // Do not use await while it is set, and use a try/finally block to ensure
    // it is cleared.

    try {
      this._overrideReadOnly = true;
      for (let { href, properties } of this._readResponse(response.dom)) {
        if (!properties) {
          continue;
        }

        let etag = properties.querySelector("getetag")?.textContent;
        let vCard = normalizeLineEndings(
          properties.querySelector("address-data")?.textContent
        );

        let abCard = lazy.VCardUtils.vCardToAbCard(vCard);
        abCard.setProperty("_etag", etag);
        abCard.setProperty("_href", href);

        if (!this.cards.has(abCard.UID)) {
          super.dropCard(abCard, false);
        } else if (this.loadCardProperties(abCard.UID).get("_etag") != etag) {
          super.modifyCard(abCard);
        }
      }
    } finally {
      this._overrideReadOnly = false;
    }
  }

  /**
   * Reads a multistatus response, yielding once for each response element.
   *
   * @param {Document} dom - as returned by CardDAVUtils.makeRequest.
   * @yields {object} - An object representing a single <response> element
   *     from the document:
   *     - href, the href of the object represented
   *     - notFound, if a 404 status applies to this response
   *     - properties, the <prop> element, if any, containing properties
   *         of the object represented
   */
  _readResponse = function* (dom) {
    if (!dom || dom.documentElement.localName != "multistatus") {
      throw Components.Exception(
        `Expected a multistatus response, but didn't get one`,
        Cr.NS_ERROR_FAILURE
      );
    }

    for (let r of dom.querySelectorAll("response")) {
      let response = {
        href: r.querySelector("href")?.textContent,
      };

      let responseStatus = r.querySelector("response > status");
      if (responseStatus?.textContent.startsWith("HTTP/1.1 404")) {
        response.notFound = true;
        yield response;
        continue;
      }

      for (let p of r.querySelectorAll("response > propstat")) {
        let status = p.querySelector("propstat > status").textContent;
        if (status == "HTTP/1.1 200 OK") {
          response.properties = p.querySelector("propstat > prop");
        }
      }

      yield response;
    }
  };

  /**
   * Converts the card to a vCard and performs a PUT request to store it on the
   * server. Then immediately performs a GET request ensuring the local copy
   * matches the server copy. Stores the card in the database on success.
   *
   * @param {nsIAbCard} card
   * @returns {boolean} true if the PUT request succeeded without conflict,
   *     false if there was a conflict.
   * @throws if the server responded with anything other than a success or
   *     conflict status code.
   */
  async _sendCardToServer(card) {
    let href = this._getCardHref(card);
    let requestDetails = {
      method: "PUT",
      contentType: "text/vcard",
    };

    let vCard = card.getProperty("_vCard", "");
    if (this._isGoogleCardDAV) {
      // There must be an `N` property, even if empty.
      let vCardProperties = lazy.VCardProperties.fromVCard(vCard);
      if (!vCardProperties.getFirstEntry("n")) {
        vCardProperties.addValue("n", ["", "", "", "", ""]);
      }
      requestDetails.body = vCardProperties.toVCard();
    } else {
      requestDetails.body = vCard;
    }

    let response;
    try {
      log.debug(`Sending ${href} to server.`);
      response = await this._makeRequest(href, requestDetails);
    } catch (ex) {
      Services.obs.notifyObservers(this, "addrbook-directory-sync-failed");
      this._uidsToSync.add(card.UID);
      throw ex;
    }

    if (response.status >= 400) {
      throw Components.Exception(
        `Sending card to the server failed, response was ${response.status} ${response.statusText}`,
        Cr.NS_ERROR_FAILURE
      );
    }

    // At this point we *should* be able to make a simple GET request and
    // store the response. But Google moves the data (fair enough) without
    // telling us where it went (c'mon, really?). Fortunately a multiget
    // request at the original location works.

    response = await this._multigetRequest([href]);

    for (let { href, properties } of this._readResponse(response.dom)) {
      if (!properties) {
        continue;
      }

      let etag = properties.querySelector("getetag")?.textContent;
      let vCard = normalizeLineEndings(
        properties.querySelector("address-data")?.textContent
      );

      let abCard = lazy.VCardUtils.vCardToAbCard(vCard);
      abCard.setProperty("_etag", etag);
      abCard.setProperty("_href", href);

      if (abCard.UID == card.UID) {
        super.modifyCard(abCard);
      } else {
        // Add a property so the UI can work out if it's still displaying the
        // old card and respond appropriately.
        abCard.setProperty("_originalUID", card.UID);
        super.dropCard(abCard, false);
        super.deleteCards([card]);
      }
    }
  }

  /**
   * Deletes card from the server.
   *
   * @param {nsIAbCard|string} cardOrHRef
   */
  async _deleteCardFromServer(cardOrHRef) {
    let href;
    if (typeof cardOrHRef == "string") {
      href = cardOrHRef;
    } else {
      href = cardOrHRef.getProperty("_href", "");
    }
    if (!href) {
      return;
    }

    try {
      log.debug(`Removing ${href} from server.`);
      await this._makeRequest(href, { method: "DELETE" });
    } catch (ex) {
      Services.obs.notifyObservers(this, "addrbook-directory-sync-failed");
      this._hrefsToRemove.add(href);
      throw ex;
    }
  }

  /**
   * Set up a repeating timer for synchronisation with the server. The timer's
   * interval is defined by pref, set it to 0 to disable sync'ing altogether.
   */
  _scheduleNextSync() {
    if (this._syncTimer) {
      lazy.clearInterval(this._syncTimer);
      this._syncTimer = null;
    }

    let interval = this.getIntValue("carddav.syncinterval", 30);
    if (interval <= 0) {
      return;
    }

    this._syncTimer = lazy.setInterval(
      () => this.syncWithServer(false),
      interval * 60000
    );
  }

  /**
   * Get all cards on the server and add them to this directory.
   *
   * This is usually used for the initial population of a directory, but it
   * can also be used for a complete re-sync.
   */
  async fetchAllFromServer() {
    log.log("Fetching all cards from the server.");
    this._syncInProgress = true;

    let data = `<propfind xmlns="${PREFIX_BINDINGS.d}" ${NAMESPACE_STRING}>
      <prop>
        <resourcetype/>
        <getetag/>
        <cs:getctag/>
      </prop>
    </propfind>`;

    let response = await this._makeRequest("", {
      method: "PROPFIND",
      body: data,
      headers: {
        Depth: 1,
      },
      expectedStatuses: [207],
    });

    // A map of all existing hrefs and etags. If the etag for an href matches
    // what we already have, we won't fetch it.
    let currentHrefs = new Map(
      Array.from(this.cards.values(), c => [c.get("_href"), c.get("_etag")])
    );

    let hrefsToFetch = [];
    for (let { href, properties } of this._readResponse(response.dom)) {
      if (!properties || properties.querySelector("resourcetype collection")) {
        continue;
      }

      let currentEtag = currentHrefs.get(href);
      currentHrefs.delete(href);

      let etag = properties.querySelector("getetag")?.textContent;
      if (etag && currentEtag == etag) {
        continue;
      }

      hrefsToFetch.push(href);
    }

    // Delete any existing cards we didn't see. They're not on the server so
    // they shouldn't be on the client.
    let cardsToDelete = [];
    for (let href of currentHrefs.keys()) {
      cardsToDelete.push(this.getCardFromProperty("_href", href, true));
    }
    if (cardsToDelete.length > 0) {
      super.deleteCards(cardsToDelete);
    }

    // Fetch any cards we don't already have, or that have changed.
    if (hrefsToFetch.length > 0) {
      response = await this._multigetRequest(hrefsToFetch);

      let abCards = [];

      for (let { href, properties } of this._readResponse(response.dom)) {
        if (!properties) {
          continue;
        }

        let etag = properties.querySelector("getetag")?.textContent;
        let vCard = normalizeLineEndings(
          properties.querySelector("address-data")?.textContent
        );

        try {
          let abCard = lazy.VCardUtils.vCardToAbCard(vCard);
          abCard.setProperty("_etag", etag);
          abCard.setProperty("_href", href);
          abCards.push(abCard);
        } catch (ex) {
          log.error(`Error parsing: ${vCard}`);
          console.error(ex);
        }
      }

      await this.bulkAddCards(abCards);
    }

    await this._getSyncToken();

    log.log("Sync with server completed successfully.");
    Services.obs.notifyObservers(this, "addrbook-directory-synced");

    this._scheduleNextSync();
    this._syncInProgress = false;
  }

  /**
   * Begin a sync operation. This function will decide which sync protocol to
   * use based on the directory's configuration. It will also (re)start the
   * timer for the next synchronisation unless told not to.
   *
   * @param {boolean} shouldResetTimer
   */
  async syncWithServer(shouldResetTimer = true) {
    if (this._syncInProgress || !this._serverURL) {
      return;
    }

    log.log("Performing sync with server.");
    this._syncInProgress = true;

    try {
      // First perform all pending removals. We don't want to have deleted cards
      // reappearing when we sync.
      for (let href of this._hrefsToRemove) {
        await this._deleteCardFromServer(href);
      }
      this._hrefsToRemove.clear();

      // Now update any cards that were modified while not connected to the server.
      for (let uid of this._uidsToSync) {
        let card = this.getCard(uid);
        // The card may no longer exist. It shouldn't still be listed to send,
        // but it might be.
        if (card) {
          await this._sendCardToServer(card);
        }
      }
      this._uidsToSync.clear();

      if (this._syncToken) {
        await this.updateAllFromServerV2();
      } else {
        await this.updateAllFromServerV1();
      }
    } catch (ex) {
      log.error("Sync with server failed.");
      throw ex;
    } finally {
      if (shouldResetTimer) {
        this._scheduleNextSync();
      }
      this._syncInProgress = false;
    }
  }

  /**
   * Compares cards in the directory with cards on the server, and updates the
   * directory to match what is on the server.
   */
  async updateAllFromServerV1() {
    let data = `<propfind xmlns="${PREFIX_BINDINGS.d}" ${NAMESPACE_STRING}>
      <prop>
        <resourcetype/>
        <getetag/>
        <cs:getctag/>
      </prop>
    </propfind>`;

    let response = await this._makeRequest("", {
      method: "PROPFIND",
      body: data,
      headers: {
        Depth: 1,
      },
      expectedStatuses: [207],
    });

    let hrefMap = new Map();
    for (let { href, properties } of this._readResponse(response.dom)) {
      if (
        !properties ||
        !properties.querySelector("resourcetype") ||
        properties.querySelector("resourcetype collection")
      ) {
        continue;
      }

      let etag = properties.querySelector("getetag").textContent;
      hrefMap.set(href, etag);
    }

    let cardMap = new Map();
    let hrefsToFetch = [];
    let cardsToDelete = [];
    for (let card of this.childCards) {
      let href = card.getProperty("_href", "");
      let etag = card.getProperty("_etag", "");

      if (!href || !etag) {
        // Not sure how we got here. Ignore it.
        continue;
      }
      cardMap.set(href, card);
      if (hrefMap.has(href)) {
        if (hrefMap.get(href) != etag) {
          // The card was updated on server.
          hrefsToFetch.push(href);
        }
      } else {
        // The card doesn't exist on the server.
        cardsToDelete.push(card);
      }
    }

    for (let href of hrefMap.keys()) {
      if (!cardMap.has(href)) {
        // The card is new on the server.
        hrefsToFetch.push(href);
      }
    }

    // If this directory is set to read-only, the following operations would
    // throw NS_ERROR_FAILURE, but sync operations are allowed on a read-only
    // directory, so set this._overrideReadOnly to avoid the exception.
    //
    // Do not use await while it is set, and use a try/finally block to ensure
    // it is cleared.

    if (cardsToDelete.length > 0) {
      this._overrideReadOnly = true;
      try {
        super.deleteCards(cardsToDelete);
      } finally {
        this._overrideReadOnly = false;
      }
    }

    await this._fetchAndStore(hrefsToFetch);

    log.log("Sync with server completed successfully.");
    Services.obs.notifyObservers(this, "addrbook-directory-synced");
  }

  /**
   * Retrieves the current sync token from the server.
   *
   * @see RFC 6578
   */
  async _getSyncToken() {
    log.log("Fetching new sync token");

    let data = `<propfind xmlns="${PREFIX_BINDINGS.d}" ${NAMESPACE_STRING}>
      <prop>
         <displayname/>
         <cs:getctag/>
         <sync-token/>
      </prop>
    </propfind>`;

    let response = await this._makeRequest("", {
      method: "PROPFIND",
      body: data,
      headers: {
        Depth: 0,
      },
    });

    if (response.status == 207) {
      for (let { properties } of this._readResponse(response.dom)) {
        let token = properties?.querySelector("prop sync-token");
        if (token) {
          this._syncToken = token.textContent;
          return;
        }
      }
    }

    this._syncToken = "";
  }

  /**
   * Gets a list of changes on the server since the last call to getSyncToken
   * or updateAllFromServerV2, and updates the directory to match what is on
   * the server.
   *
   * @see RFC 6578
   */
  async updateAllFromServerV2() {
    let syncToken = this._syncToken;
    if (!syncToken) {
      throw new Components.Exception("No sync token", Cr.NS_ERROR_UNEXPECTED);
    }

    let data = `<sync-collection xmlns="${
      PREFIX_BINDINGS.d
    }" ${NAMESPACE_STRING}>
      <sync-token>${xmlEncode(syncToken)}</sync-token>
      <sync-level>1</sync-level>
      <prop>
        <getetag/>
        <card:address-data/>
      </prop>
    </sync-collection>`;

    let response = await this._makeRequest("", {
      method: "REPORT",
      body: data,
      headers: {
        Depth: 1, // Only Google seems to need this.
      },
      expectedStatuses: [207, 400],
    });

    if (response.status == 400) {
      log.warn(
        `Server responded with: ${response.status} ${response.statusText}`
      );
      await this.fetchAllFromServer();
      return;
    }

    let dom = response.dom;

    // If this directory is set to read-only, the following operations would
    // throw NS_ERROR_FAILURE, but sync operations are allowed on a read-only
    // directory, so set this._overrideReadOnly to avoid the exception.
    //
    // Do not use await while it is set, and use a try/finally block to ensure
    // it is cleared.

    let hrefsToFetch = [];
    try {
      this._overrideReadOnly = true;
      let cardsToDelete = [];
      for (let { href, notFound, properties } of this._readResponse(dom)) {
        let card = this.getCardFromProperty("_href", href, true);
        if (notFound) {
          if (card) {
            cardsToDelete.push(card);
          }
          continue;
        }
        if (!properties) {
          continue;
        }

        let etag = properties.querySelector("getetag")?.textContent;
        if (!etag) {
          continue;
        }
        let vCard = properties.querySelector("address-data")?.textContent;
        if (!vCard) {
          hrefsToFetch.push(href);
          continue;
        }
        vCard = normalizeLineEndings(vCard);

        let abCard = lazy.VCardUtils.vCardToAbCard(vCard);
        abCard.setProperty("_etag", etag);
        abCard.setProperty("_href", href);

        if (card) {
          if (card.getProperty("_etag", "") != etag) {
            super.modifyCard(abCard);
          }
        } else {
          super.dropCard(abCard, false);
        }
      }

      if (cardsToDelete.length > 0) {
        super.deleteCards(cardsToDelete);
      }
    } finally {
      this._overrideReadOnly = false;
    }

    await this._fetchAndStore(hrefsToFetch);

    this._syncToken = dom.querySelector("sync-token").textContent;

    log.log("Sync with server completed successfully.");
    Services.obs.notifyObservers(this, "addrbook-directory-synced");
  }

  static forFile(fileName) {
    let directory = super.forFile(fileName);
    if (directory instanceof CardDAVDirectory) {
      return directory;
    }
    return undefined;
  }
}
CardDAVDirectory.prototype.classID = Components.ID(
  "{1fa9941a-07d5-4a6f-9673-15327fc2b9ab}"
);

/**
 * Ensure that `string` always has Windows line-endings. Some functions,
 * notably DOMParser.parseFromString, strip \r, but we want it because \r\n
 * is a part of the vCard specification.
 */
function normalizeLineEndings(string) {
  if (string.includes("\r\n")) {
    return string;
  }
  return string.replace(/\n/g, "\r\n");
}

/**
 * Encode special characters safely for XML.
 */
function xmlEncode(string) {
  return string
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
