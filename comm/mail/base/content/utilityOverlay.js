/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals goUpdateCommand */ // From globalOverlay.js

var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
var { PlacesUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PlacesUtils.sys.mjs"
);

var gShowBiDi = false;

function getBrowserURL() {
  return AppConstants.BROWSER_CHROME_URL;
}

// update menu items that rely on focus
function goUpdateGlobalEditMenuItems() {
  goUpdateCommand("cmd_undo");
  goUpdateCommand("cmd_redo");
  goUpdateCommand("cmd_cut");
  goUpdateCommand("cmd_copy");
  goUpdateCommand("cmd_paste");
  goUpdateCommand("cmd_selectAll");
  goUpdateCommand("cmd_delete");
  if (gShowBiDi) {
    goUpdateCommand("cmd_switchTextDirection");
  }
}

// update menu items that rely on the current selection
function goUpdateSelectEditMenuItems() {
  goUpdateCommand("cmd_cut");
  goUpdateCommand("cmd_copy");
  goUpdateCommand("cmd_delete");
  goUpdateCommand("cmd_selectAll");
}

// update menu items that relate to undo/redo
function goUpdateUndoEditMenuItems() {
  goUpdateCommand("cmd_undo");
  goUpdateCommand("cmd_redo");
}

// update menu items that depend on clipboard contents
function goUpdatePasteMenuItems() {
  goUpdateCommand("cmd_paste");
}

function goCopyImage() {
  // Always copy the image data. It doesn't make sense to insert an image
  // as a http(s) reference since the recipient might block it.
  let param = Cu.createCommandParams();
  param.setLongValue("imageCopy", Ci.nsIContentViewerEdit.COPY_IMAGE_DATA);
  document.commandDispatcher
    .getControllerForCommand("cmd_copyImage")
    .QueryInterface(Ci.nsICommandController)
    .doCommandWithParams("cmd_copyImage", param);
}

// update Find As You Type menu items, they rely on focus
function goUpdateFindTypeMenuItems() {
  goUpdateCommand("cmd_findTypeText");
  goUpdateCommand("cmd_findTypeLinks");
}

/**
 * Gather all descendent text under given node.
 *
 * @param {Node} root - The root node to gather text from.
 * @returns {string} The text data under the node.
 */
function gatherTextUnder(root) {
  var text = "";
  var node = root.firstChild;
  var depth = 1;
  while (node && depth > 0) {
    // See if this node is text.
    if (node.nodeType == Node.TEXT_NODE) {
      // Add this text to our collection.
      text += " " + node.data;
    } else if (HTMLImageElement.isInstance(node)) {
      // If it has an alt= attribute, add that.
      var altText = node.getAttribute("alt");
      if (altText && altText != "") {
        text += " " + altText;
      }
    }
    // Find next node to test.
    if (node.firstChild) {
      // If it has children, go to first child.
      node = node.firstChild;
      depth++;
    } else if (node.nextSibling) {
      // No children, try next sibling.
      node = node.nextSibling;
    } else {
      // Last resort is a sibling of an ancestor.
      while (node && depth > 0) {
        node = node.parentNode;
        depth--;
        if (node.nextSibling) {
          node = node.nextSibling;
          break;
        }
      }
    }
  }
  // Strip leading and trailing whitespace.
  text = text.trim();
  // Compress remaining whitespace.
  text = text.replace(/\s+/g, " ");
  return text;
}

function GenerateValidFilename(filename, extension) {
  if (filename) {
    // we have a title; let's see if it's usable
    // clean up the filename to make it usable and
    // then trim whitespace from beginning and end
    filename = validateFileName(filename).trim();
    if (filename.length > 0) {
      return filename + extension;
    }
  }
  return null;
}

function validateFileName(aFileName) {
  var re = /[\/]+/g;
  if (navigator.appVersion.includes("Windows")) {
    re = /[\\\/\|]+/g;
    aFileName = aFileName.replace(/[\"]+/g, "'");
    aFileName = aFileName.replace(/[\*\:\?]+/g, " ");
    aFileName = aFileName.replace(/[\<]+/g, "(");
    aFileName = aFileName.replace(/[\>]+/g, ")");
  } else if (navigator.appVersion.includes("Macintosh")) {
    re = /[\:\/]+/g;
  }

  if (
    Services.prefs.getBoolPref("mail.save_msg_filename_underscores_for_space")
  ) {
    aFileName = aFileName.replace(/ /g, "_");
  }

  return aFileName.replace(re, "_");
}

function goToggleToolbar(id, elementID) {
  var toolbar = document.getElementById(id);
  var element = document.getElementById(elementID);
  if (toolbar) {
    const isHidden = toolbar.getAttribute("hidden") === "true";
    toolbar.setAttribute("hidden", !isHidden);
    Services.xulStore.persist(toolbar, "hidden");
    if (element) {
      element.setAttribute("checked", isHidden);
      Services.xulStore.persist(element, "checked");
    }
  }
}

/**
 * Toggle a splitter to show or hide some piece of UI (e.g. the message preview
 * pane).
 *
 * @param splitterId the splliter that should be toggled
 */
function togglePaneSplitter(splitterId) {
  var splitter = document.getElementById(splitterId);
  var state = splitter.getAttribute("state");
  if (state == "collapsed") {
    splitter.setAttribute("state", "open");
  } else {
    splitter.setAttribute("state", "collapsed");
  }
}

// openUILink handles clicks on UI elements that cause URLs to load.
// We currently only react to left click in Thunderbird.
function openUILink(url, event) {
  if (!event.button) {
    PlacesUtils.history
      .insert({
        url,
        visits: [
          {
            date: new Date(),
          },
        ],
      })
      .catch(console.error);
    Cc["@mozilla.org/uriloader/external-protocol-service;1"]
      .getService(Ci.nsIExternalProtocolService)
      .loadURI(Services.io.newURI(url));
  }
}

function openLinkText(event, what) {
  switch (what) {
    case "getInvolvedURL":
      openUILink("https://www.thunderbird.net/get-involved/", event);
      break;
    case "keyboardShortcutsURL":
      openUILink("https://support.mozilla.org/kb/keyboard-shortcuts/", event);
      break;
    case "donateURL":
      openUILink(
        "https://give.thunderbird.net/?utm_source=thunderbird-client&utm_medium=referral&utm_content=help-menu",
        event
      );
      break;
    case "tourURL":
      openUILink("https://www.thunderbird.net/features/", event);
      break;
    case "feedbackURL":
      openUILink("https://connect.mozilla.org/", event);
      break;
  }
}

/**
 * Open a web search in the default browser for a given query.
 *
 * @param query the string to search for
 * @param engine (optional) the search engine to use
 */
function openWebSearch(query, engine) {
  return Services.search.init().then(async () => {
    if (!engine) {
      engine = await Services.search.getDefault();
      openLinkExternally(engine.getSubmission(query).uri.spec);

      Services.telemetry.keyedScalarAdd(
        "tb.websearch.usage",
        engine.name.toLowerCase(),
        1
      );
    }
  });
}

/**
 * Open the specified tab type (possibly in a new window)
 *
 * @param tabType the tab type to open (e.g. "contentTab")
 * @param tabParams the parameters to pass to the tab
 * @param where 'tab' to open in a new tab (default) or 'window' to open in a
 *        new window
 */
function openTab(tabType, tabParams, where) {
  if (where != "window") {
    let tabmail = document.getElementById("tabmail");
    if (!tabmail) {
      // Try opening new tabs in an existing 3pane window
      let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
      if (mail3PaneWindow) {
        tabmail = mail3PaneWindow.document.getElementById("tabmail");
        mail3PaneWindow.focus();
      }
    }

    if (tabmail) {
      return tabmail.openTab(tabType, tabParams);
    }
  }

  // Either we explicitly wanted to open in a new window, or we fell through to
  // here because there's no 3pane.
  return window.openDialog(
    "chrome://messenger/content/messenger.xhtml",
    "_blank",
    "chrome,dialog=no,all",
    null,
    {
      tabType,
      tabParams,
    }
  );
}

/**
 * Open the specified URL as a content tab (or window)
 *
 * @param {string} url - The location to open.
 * @param {string} [where="tab"] - 'tab' to open in a new tab or 'window' to
 *     open in a new window
 * @param {string} [linkHandler] - See specialTabs.contentTabType.openTab.
 */
function openContentTab(url, where, linkHandler) {
  return openTab("contentTab", { url, linkHandler }, where);
}

/**
 * Open the preferences page for the specified query in a new tab.
 *
 * @param paneID       ID of prefpane to select automatically.
 * @param scrollPaneTo ID of the element to scroll into view.
 * @param otherArgs    other prefpane specific arguments.
 */
function openPreferencesTab(paneID, scrollPaneTo, otherArgs) {
  openTab("preferencesTab", {
    paneID,
    scrollPaneTo,
    otherArgs,
    onLoad(aEvent, aBrowser) {
      aBrowser.contentWindow.selectPrefPane(paneID, scrollPaneTo, otherArgs);
    },
  });
}

/**
 * Open the dictionary list in a new content tab, if possible in an available
 * mail:3pane window, otherwise by opening a new mail:3pane.
 *
 * @param where the context to open the dictionary list in (e.g. 'tab',
 *        'window'). See openContentTab for more details.
 */
function openDictionaryList(where) {
  let dictUrl = Services.urlFormatter.formatURLPref(
    "spellchecker.dictionaries.download.url"
  );

  openContentTab(dictUrl, where);
}

/**
 * Open the privacy policy in a new content tab, if possible in an available
 * mail:3pane window, otherwise by opening a new mail:3pane.
 *
 * @param where the context to open the privacy policy in (e.g. 'tab',
 *        'window'). See openContentTab for more details.
 */
function openPrivacyPolicy(where) {
  const kTelemetryInfoUrl = "toolkit.telemetry.infoURL";
  let url = Services.prefs.getCharPref(kTelemetryInfoUrl);
  openContentTab(url, where);
}

/**
 * Used by the developer tools (in the toolbox process) and a few toolkit pages
 * for opening URLs.
 *
 * Thunderbird code should avoid using this function.
 *
 * This is similar, but not identical, to the same function in Firefox.
 *
 * @param {string} url - The URL to load.
 * @param {string} [where] - Ignored, only here for compatibility.
 * @param {object} [openParams] - Optional parameters for changing behaviour.
 */
function openTrustedLinkIn(url, where, params = {}) {
  if (!params.triggeringPrincipal) {
    params.triggeringPrincipal =
      Services.scriptSecurityManager.getSystemPrincipal();
  }

  openLinkIn(url, where, params);
}

/**
 * Used by the developer tools (in the toolbox process) for opening URLs.
 * MDN URLs get send to a browser, all others are displayed in a new window.
 *
 * Thunderbird code should avoid using this function.
 *
 * This is similar, but not identical, to the same function in Firefox.
 *
 * @param {string} url - The URL to load.
 * @param {string} [where] - Ignored, only here for compatibility.
 * @param {object} [openParams] - Optional parameters for changing behaviour.
 */
function openWebLinkIn(url, where, params = {}) {
  if (url.startsWith("https://developer.mozilla.org/")) {
    openLinkExternally(url);
    return;
  }

  if (!params.triggeringPrincipal) {
    params.triggeringPrincipal =
      Services.scriptSecurityManager.createNullPrincipal({});
  }
  if (params.triggeringPrincipal.isSystemPrincipal) {
    throw new Error(
      "System principal should never be passed into openWebLinkIn()"
    );
  }

  openLinkIn(url, where, params);
}

// Thunderbird itself is not using this function. It is however called for the
// "contribute" button for add-ons in the add-on manager. We ignore all additional
// parameters including "where" and always open the link externally. We don't
// want to open donation pages in a tab due to their complexity, and we don't
// want to handle them inside Thunderbird.
function openUILinkIn(
  url,
  where,
  aAllowThirdPartyFixup,
  aPostData,
  aReferrerInfo
) {
  openLinkExternally(url);
}

/**
 * Loads a URL in Thunderbird. If this is a mail:3pane window, the URL opens
 * in a content tab, otherwise a new window is opened.
 *
 * This is similar, but not identical, to the same function in Firefox.
 *
 * @param {string} url - The URL to load.
 * @param {string} [where] - Ignored, only here for compatibility.
 * @param {object} [openParams] - Optional parameters for changing behaviour.
 */
function openLinkIn(url, where, openParams) {
  if (!url) {
    return;
  }

  if ("switchToTabHavingURI" in window) {
    window.switchToTabHavingURI(url, true);
    return;
  }

  // If we get here, this isn't a mail:3pane window, which means it's probably
  // the developer tools window and therefore a completely separate program
  // from the rest of Thunderbird. Be careful what you do here.

  let args = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  let uri = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  uri.data = url;
  args.appendElement(uri);

  let win = Services.ww.openWindow(
    window,
    AppConstants.BROWSER_CHROME_URL,
    null,
    "chrome,dialog=no,all",
    args
  );

  if (openParams.resolveOnContentBrowserCreated) {
    win.addEventListener("load", () =>
      openParams.resolveOnContentBrowserCreated(win.gBrowser.selectedBrowser)
    );
  }
}

/**
 * Forces a url to open in an external application according to the protocol
 * service settings.
 *
 * @param url  A url string or an nsIURI containing the url to open.
 */
function openLinkExternally(url) {
  let uri = url;
  if (!(uri instanceof Ci.nsIURI)) {
    uri = Services.io.newURI(url);
  }

  // This can fail if there is a problem with the places database.
  PlacesUtils.history
    .insert({
      url, // accepts both string and nsIURI
      visits: [
        {
          date: new Date(),
        },
      ],
    })
    .catch(console.error);

  Cc["@mozilla.org/uriloader/external-protocol-service;1"]
    .getService(Ci.nsIExternalProtocolService)
    .loadURI(uri);
}

/**
 * Moved from toolkit/content/globalOverlay.js.
 * For details see bug 1422720 and bug 1422721.
 */
function goSetMenuValue(aCommand, aLabelAttribute) {
  var commandNode = top.document.getElementById(aCommand);
  if (commandNode) {
    var label = commandNode.getAttribute(aLabelAttribute);
    if (label) {
      commandNode.setAttribute("label", label);
    }
  }
}

function goSetAccessKey(aCommand, aAccessKeyAttribute) {
  var commandNode = top.document.getElementById(aCommand);
  if (commandNode) {
    var value = commandNode.getAttribute(aAccessKeyAttribute);
    if (value) {
      commandNode.setAttribute("accesskey", value);
    }
  }
}

function buildHelpMenu() {
  let helpTroubleshootModeItem = document.getElementById(
    "helpTroubleshootMode"
  );
  if (helpTroubleshootModeItem) {
    helpTroubleshootModeItem.disabled =
      !Services.policies.isAllowed("safeMode");
  }
  let appmenu_troubleshootModeItem = document.getElementById(
    "appmenu_troubleshootMode"
  );
  if (appmenu_troubleshootModeItem) {
    appmenu_troubleshootModeItem.disabled =
      !Services.policies.isAllowed("safeMode");
  }
}
