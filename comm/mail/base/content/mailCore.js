/* -*- Mode: JS; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Core mail routines used by all of the major mail windows (address book,
 * 3-pane, compose and stand alone message window).
 * Routines to support custom toolbars in mail windows, opening up a new window
 * of a particular type all live here.
 * Before adding to this file, ask yourself, is this a JS routine that is going
 * to be used by all of the main mail windows?
 */

/* import-globals-from ../../extensions/mailviews/content/msgViewPickerOverlay.js */
/* import-globals-from customizeToolbar.js */
/* import-globals-from utilityOverlay.js */

/* globals gChatTab */ // From globals chat-messenger.js
/* globals currentAttachments */ // From msgHdrView.js

var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
var { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

XPCOMUtils.defineLazyGetter(this, "gViewSourceUtils", function () {
  let scope = {};
  Services.scriptloader.loadSubScript(
    "chrome://global/content/viewSourceUtils.js",
    scope
  );
  scope.gViewSourceUtils.viewSource = async function (aArgs) {
    // Check if external view source is enabled. If so, try it. If it fails,
    // fallback to internal view source.
    if (Services.prefs.getBoolPref("view_source.editor.external")) {
      try {
        await this.openInExternalEditor(aArgs);
        return;
      } catch (ex) {}
    }

    window.openDialog(
      "chrome://messenger/content/viewSource.xhtml",
      "_blank",
      "all,dialog=no",
      aArgs
    );
  };
  return scope.gViewSourceUtils;
});

Object.defineProperty(this, "BrowserConsoleManager", {
  get() {
    let { loader } = ChromeUtils.importESModule(
      "resource://devtools/shared/loader/Loader.sys.mjs"
    );
    return loader.require("devtools/client/webconsole/browser-console-manager")
      .BrowserConsoleManager;
  },
  configurable: true,
  enumerable: true,
});

var gCustomizeSheet = false;

function overlayRestoreDefaultSet() {
  let toolbox = null;
  if ("arguments" in window && window.arguments[0]) {
    toolbox = window.arguments[0];
  } else if (window.frameElement && "toolbox" in window.frameElement) {
    toolbox = window.frameElement.toolbox;
  }

  let mode = toolbox.getAttribute("defaultmode");
  let align = toolbox.getAttribute("defaultlabelalign");
  let menulist = document.getElementById("modelist");

  if (mode == "full" && align == "end") {
    toolbox.setAttribute("mode", "textbesideicon");
    toolbox.setAttribute("labelalign", align);
    overlayUpdateToolbarMode("textbesideicon");
  } else if (mode == "full" && align == "") {
    toolbox.setAttribute("mode", "full");
    toolbox.removeAttribute("labelalign");
    overlayUpdateToolbarMode(mode);
  }

  restoreDefaultSet();

  if (mode == "full" && align == "end") {
    menulist.value = "textbesideicon";
  }
}

function overlayUpdateToolbarMode(aModeValue) {
  let toolbox = null;
  if ("arguments" in window && window.arguments[0]) {
    toolbox = window.arguments[0];
  } else if (window.frameElement && "toolbox" in window.frameElement) {
    toolbox = window.frameElement.toolbox;
  }

  // If they chose a mode of textbesideicon or full,
  // then map that to a mode of full, and a labelalign of true or false.
  if (aModeValue == "textbesideicon" || aModeValue == "full") {
    var align = aModeValue == "textbesideicon" ? "end" : "bottom";
    toolbox.setAttribute("labelalign", align);
    Services.xulStore.persist(toolbox, "labelalign");
    aModeValue = "full";
  }
  updateToolbarMode(aModeValue);
}

function overlayOnLoad() {
  let restoreButton = document
    .getElementById("main-box")
    .querySelector("[oncommand*='restore']");
  restoreButton.setAttribute("oncommand", "overlayRestoreDefaultSet();");

  // Add the textBesideIcon menu item if it's not already there.
  let menuitem = document.getElementById("textbesideiconItem");
  if (!menuitem) {
    let menulist = document.getElementById("modelist");
    let label = document
      .getElementById("iconsBesideText.label")
      .getAttribute("value");
    menuitem = menulist.appendItem(label, "textbesideicon");
    menuitem.id = "textbesideiconItem";
  }

  // If they have a mode of full and a labelalign of true,
  // then pretend the mode is textbesideicon when populating the popup.
  let toolbox = null;
  if ("arguments" in window && window.arguments[0]) {
    toolbox = window.arguments[0];
  } else if (window.frameElement && "toolbox" in window.frameElement) {
    toolbox = window.frameElement.toolbox;
  }

  let toolbarWindow = document.getElementById("CustomizeToolbarWindow");
  toolbarWindow.setAttribute("toolboxId", toolbox.id);
  toolbox.setAttribute("doCustomization", "true");

  let mode = toolbox.getAttribute("mode");
  let align = toolbox.getAttribute("labelalign");
  if (mode == "full" && align == "end") {
    toolbox.setAttribute("mode", "textbesideicon");
  }

  onLoad();
  overlayRepositionDialog();

  // Re-set and re-persist the mode, if we changed it above.
  if (mode == "full" && align == "end") {
    toolbox.setAttribute("mode", mode);
    Services.xulStore.persist(toolbox, "mode");
  }
}

function overlayRepositionDialog() {
  // Position the dialog so it is fully visible on the screen
  // (if possible)

  // Seems to be necessary to get the correct dialog height/width
  window.sizeToContent();
  var wH = window.outerHeight;
  var wW = window.outerWidth;
  var sH = window.screen.height;
  var sW = window.screen.width;
  var sX = window.screenX;
  var sY = window.screenY;
  var sAL = window.screen.availLeft;
  var sAT = window.screen.availTop;

  var nX = Math.max(Math.min(sX, sW - wW), sAL);
  var nY = Math.max(Math.min(sY, sH - wH), sAT);
  window.moveTo(nX, nY);
}

function CustomizeMailToolbar(toolboxId, customizePopupId) {
  if (toolboxId === "mail-toolbox" && window.tabmail) {
    // Open the unified toolbar customization panel only for mail.
    document.querySelector("unified-toolbar").showCustomization();
    return;
  }

  // Disable the toolbar context menu items
  var menubar = document.getElementById("mail-menubar");
  for (var i = 0; i < menubar.children.length; ++i) {
    menubar.children[i].setAttribute("disabled", true);
  }

  var customizePopup = document.getElementById(customizePopupId);
  customizePopup.setAttribute("disabled", "true");

  var toolbox = document.getElementById(toolboxId);

  var customizeURL = "chrome://messenger/content/customizeToolbar.xhtml";
  gCustomizeSheet = Services.prefs.getBoolPref(
    "toolbar.customization.usesheet"
  );

  let externalToolbars = [];
  if (toolbox.getAttribute("id") == "mail-toolbox") {
    if (
      AppConstants.platform != "macosx" &&
      document.getElementById("toolbar-menubar")
    ) {
      externalToolbars.push(document.getElementById("toolbar-menubar"));
    }
  }

  if (gCustomizeSheet) {
    var sheetFrame = document.getElementById("customizeToolbarSheetIFrame");
    var panel = document.getElementById("customizeToolbarSheetPopup");
    sheetFrame.hidden = false;
    sheetFrame.toolbox = toolbox;
    sheetFrame.panel = panel;
    if (externalToolbars.length > 0) {
      sheetFrame.externalToolbars = externalToolbars;
    }

    // The document might not have been loaded yet, if this is the first time.
    // If it is already loaded, reload it so that the onload initialization code
    // re-runs.
    if (sheetFrame.getAttribute("src") == customizeURL) {
      sheetFrame.contentWindow.location.reload();
    } else {
      sheetFrame.setAttribute("src", customizeURL);
    }

    // Open the panel, but make it invisible until the iframe has loaded so
    // that the user doesn't see a white flash.
    panel.style.visibility = "hidden";
    toolbox.addEventListener(
      "beforecustomization",
      function () {
        panel.style.removeProperty("visibility");
      },
      { capture: false, once: true }
    );
    panel.openPopup(toolbox, "after_start", 0, 0);
  } else {
    var wintype = document.documentElement.getAttribute("windowtype");
    wintype = wintype.replace(/:/g, "");

    window.openDialog(
      customizeURL,
      "CustomizeToolbar" + wintype,
      "chrome,all,dependent",
      toolbox,
      externalToolbars
    );
  }
}

function MailToolboxCustomizeDone(aEvent, customizePopupId) {
  if (gCustomizeSheet) {
    document.getElementById("customizeToolbarSheetIFrame").hidden = true;
    document.getElementById("customizeToolbarSheetPopup").hidePopup();
  }

  // Update global UI elements that may have been added or removed

  // Re-enable parts of the UI we disabled during the dialog
  var menubar = document.getElementById("mail-menubar");
  for (var i = 0; i < menubar.children.length; ++i) {
    menubar.children[i].setAttribute("disabled", false);
  }

  // make sure the mail views search box is initialized
  if (document.getElementById("mailviews-container")) {
    ViewPickerOnLoad();
  }

  var customizePopup = document.getElementById(customizePopupId);
  customizePopup.removeAttribute("disabled");

  let toolbox = document.querySelector('[doCustomization="true"]');
  if (toolbox) {
    toolbox.removeAttribute("doCustomization");

    // The GetMail button is stuck in a strange state right now, since the
    // customization wrapping preserves its children, but not its initialized
    // state. Fix that here.
    // That is also true for the File -> "Get new messages for" menuitems in both
    // menus (old and new App menu). And also Go -> Folder.
    // TODO bug 904223: try to fix folderWidgets.xml to not do this.
    // See Bug 520457 and Bug 534448 and Bug 709733.
    // Fix Bug 565045: Only treat "Get Message Button" if it is in our toolbox
    for (let popup of [
      toolbox.querySelector("#button-getMsgPopup"),
      document.getElementById("menu_getAllNewMsgPopup"),
      document.getElementById("appmenu_getAllNewMsgPopup"),
      document.getElementById("menu_GoFolderPopup"),
      document.getElementById("appmenu_GoFolderPopup"),
    ]) {
      if (!popup) {
        continue;
      }

      // .teardown() is only available here if the menu has its frame
      // otherwise the folderWidgets.xml::folder-menupopup binding is not
      // attached to the popup. So if it is not available, remove the items
      // explicitly. Only remove elements that were generated by the binding.
      if ("_teardown" in popup) {
        popup._teardown();
      } else {
        for (let i = popup.children.length - 1; i >= 0; i--) {
          let child = popup.children[i];
          if (child.getAttribute("generated") != "true") {
            continue;
          }
          if ("_teardown" in child) {
            child._teardown();
          }
          child.remove();
        }
      }
    }
  }
}

/**
 * Sets up the menu popup that lets the user hide or display toolbars. For
 * example, in the appmenu / Preferences view.  Adds toolbar items to the popup
 * and sets their attributes.
 *
 * @param {Event} event - Event causing the menu popup to appear.
 * @param {string|string[]} toolboxIds - IDs of toolboxes that contain toolbars.
 * @param {Element} insertPoint - Where to insert menu items.
 * @param {string} elementName - What kind of menu item element to use. E.g.
 *   "toolbarbutton" for the appmenu.
 * @param {string} classes - Classes to set on menu items.
 * @param {boolean} keepOpen - If to force the menu to stay open when clicking
 *   on this element.
 */
function onViewToolbarsPopupShowing(
  event,
  toolboxIds,
  insertPoint,
  elementName = "menuitem",
  classes,
  keepOpen = false
) {
  if (!Array.isArray(toolboxIds)) {
    toolboxIds = [toolboxIds];
  }

  let popup = event.target.querySelector(".panel-subview-body") || event.target;
  // Limit the toolbar menu entries to the first level of context menus.
  if (
    popup != event.currentTarget &&
    event.currentTarget.tagName == "menupopup"
  ) {
    return;
  }

  // Remove all collapsible nodes from the menu.
  for (let i = popup.children.length - 1; i >= 0; --i) {
    let deadItem = popup.children[i];

    if (deadItem.hasAttribute("iscollapsible")) {
      deadItem.remove();
    }
  }

  // We insert menuitems before the first child if no insert point is given.
  let firstMenuItem = insertPoint || popup.firstElementChild;

  for (let toolboxId of toolboxIds) {
    let toolbars = [];
    let toolbox = document.getElementById(toolboxId);

    if (toolbox) {
      // We consider child nodes that have a toolbarname attribute.
      toolbars = toolbars.concat(
        Array.from(toolbox.querySelectorAll("[toolbarname]"))
      );
    }

    if (
      toolboxId == "mail-toolbox" &&
      toolbars.every(
        toolbar => toolbar.getAttribute("id") !== "toolbar-menubar"
      )
    ) {
      if (
        AppConstants.platform != "macosx" &&
        document.getElementById("toolbar-menubar")
      ) {
        toolbars.push(document.getElementById("toolbar-menubar"));
      }
    }

    for (let toolbar of toolbars) {
      let toolbarName = toolbar.getAttribute("toolbarname");
      if (!toolbarName) {
        continue;
      }

      let menuItem = document.createXULElement(elementName);
      let hidingAttribute =
        toolbar.getAttribute("type") == "menubar" ? "autohide" : "collapsed";

      menuItem.setAttribute("type", "checkbox");
      // Mark this menuitem with an iscollapsible attribute, so we
      // know we can wipe it out later on.
      menuItem.setAttribute("iscollapsible", true);
      menuItem.setAttribute("toolbarid", toolbar.id);
      menuItem.setAttribute("label", toolbarName);
      menuItem.setAttribute("accesskey", toolbar.getAttribute("accesskey"));
      menuItem.setAttribute(
        "checked",
        toolbar.getAttribute(hidingAttribute) != "true"
      );
      if (classes) {
        menuItem.setAttribute("class", classes);
      }
      if (keepOpen) {
        menuItem.setAttribute("closemenu", "none");
      }
      popup.insertBefore(menuItem, firstMenuItem);

      menuItem.addEventListener("command", () => {
        if (toolbar.getAttribute(hidingAttribute) != "true") {
          toolbar.setAttribute(hidingAttribute, "true");
          menuItem.removeAttribute("checked");
        } else {
          menuItem.setAttribute("checked", true);
          toolbar.removeAttribute(hidingAttribute);
        }
        Services.xulStore.persist(toolbar, hidingAttribute);
      });
    }
  }
}

function toJavaScriptConsole() {
  BrowserConsoleManager.openBrowserConsoleOrFocus();
}

function openAboutDebugging(hash) {
  let url = "about:debugging" + (hash ? "#" + hash : "");
  document.getElementById("tabmail").openTab("contentTab", { url });
}

function toOpenWindowByType(inType, uri) {
  var topWindow = Services.wm.getMostRecentWindow(inType);
  if (topWindow) {
    topWindow.focus();
    return topWindow;
  }
  return window.open(
    uri,
    "_blank",
    "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar"
  );
}

function toMessengerWindow() {
  return toOpenWindowByType(
    "mail:3pane",
    "chrome://messenger/content/messenger.xhtml"
  );
}

function focusOnMail(tabNo, event) {
  // this is invoked by accel-<number>
  var topWindow = Services.wm.getMostRecentWindow("mail:3pane");
  if (topWindow) {
    topWindow.focus();
    const tabmail = document.getElementById("tabmail");
    if (tabmail.globalOverlay) {
      return;
    }
    tabmail.selectTabByIndex(event, tabNo);
  } else {
    window.open(
      "chrome://messenger/content/messenger.xhtml",
      "_blank",
      "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar"
    );
  }
}

/**
 * Open the address book and optionally display/edit a card.
 *
 * @param {?object} openArgs - Arguments to pass to the address book.
 *   See `externalAction` in aboutAddressBook.js for details.
 * @returns {?Window} The address book's window global, if the address book was
 *   opened.
 */
async function toAddressBook(openArgs) {
  let messengerWindow = toMessengerWindow();
  if (messengerWindow.document.readyState != "complete") {
    await new Promise(resolve => {
      Services.obs.addObserver(
        {
          observe(subject) {
            if (subject == messengerWindow) {
              Services.obs.removeObserver(this, "mail-tabs-session-restored");
              resolve();
            }
          },
        },
        "mail-tabs-session-restored"
      );
    });
  }

  if (messengerWindow.tabmail.globalOverlay) {
    return null;
  }

  return new Promise(resolve => {
    messengerWindow.tabmail.openTab("addressBookTab", {
      onLoad(event, browser) {
        if (openArgs) {
          browser.contentWindow.externalAction(openArgs);
        }
        resolve(browser.contentWindow);
      },
    });
    messengerWindow.focus();
  });
}

/**
 * Open the calendar.
 */
async function toCalendar() {
  let messengerWindow = toMessengerWindow();
  if (messengerWindow.document.readyState != "complete") {
    await new Promise(resolve => {
      Services.obs.addObserver(
        {
          observe(subject) {
            if (subject == messengerWindow) {
              Services.obs.removeObserver(this, "mail-tabs-session-restored");
              resolve();
            }
          },
        },
        "mail-tabs-session-restored"
      );
    });
  }

  return new Promise(resolve => {
    messengerWindow.tabmail.openTab("calendar", {
      onLoad(event, browser) {
        resolve(browser.contentWindow);
      },
    });
    messengerWindow.focus();
  });
}

function showChatTab() {
  let tabmail = document.getElementById("tabmail");
  if (gChatTab) {
    tabmail.switchToTab(gChatTab);
  } else {
    tabmail.openTab("chat", {});
  }
}

/**
 * Open about:import or importDialog.xhtml.
 *
 * @param {"start"|"app"|"addressBook"|"calendar"|"export"} [tabId] - The tab
 *  to open in about:import.
 */
function toImport(tabId = "start") {
  if (Services.prefs.getBoolPref("mail.import.in_new_tab")) {
    let tab = toMessengerWindow().openTab("contentTab", {
      url: "about:import",
      onLoad(event, browser) {
        if (tabId) {
          browser.contentWindow.showTab(`tab-${tabId}`, true);
        }
      },
    });
    // Somehow DOMContentLoaded is called even when about:import is already
    // open, which resets the active tab. Use setTimeout here as a workaround.
    setTimeout(
      () => tab.browser.contentWindow.showTab(`tab-${tabId}`, true),
      100
    );
    return;
  }
  window.openDialog(
    "chrome://messenger/content/importDialog.xhtml",
    "importDialog",
    "chrome,modal,titlebar,centerscreen"
  );
}

function toExport() {
  if (Services.prefs.getBoolPref("mail.import.in_new_tab")) {
    toImport("export");
    return;
  }
  window.openDialog(
    "chrome://messenger/content/exportDialog.xhtml",
    "exportDialog",
    "chrome,modal,titlebar,centerscreen"
  );
}

function toSanitize() {
  let sanitizerScope = {};
  Services.scriptloader.loadSubScript(
    "chrome://messenger/content/sanitize.js",
    sanitizerScope
  );
  sanitizerScope.Sanitizer.sanitize(window);
}

/**
 * Opens the Preferences (Options) dialog.
 *
 * @param aPaneID       ID of prefpane to select automatically.
 * @param aScrollPaneTo ID of the element to scroll into view.
 * @param aOtherArgs    other prefpane specific arguments
 */
function openOptionsDialog(aPaneID, aScrollPaneTo, aOtherArgs) {
  openPreferencesTab(aPaneID, aScrollPaneTo, aOtherArgs);
}

function openAddonsMgr(aView) {
  return new Promise(resolve => {
    let emWindow;
    let browserWindow;

    let receivePong = function (aSubject, aTopic, aData) {
      let browserWin = aSubject.browsingContext.topChromeWindow;
      if (!emWindow || browserWin == window /* favor the current window */) {
        emWindow = aSubject;
        browserWindow = browserWin;
      }
    };
    Services.obs.addObserver(receivePong, "EM-pong");
    Services.obs.notifyObservers(null, "EM-ping");
    Services.obs.removeObserver(receivePong, "EM-pong");

    if (emWindow) {
      if (aView) {
        emWindow.loadView(aView);
      }
      let tabmail = browserWindow.document.getElementById("tabmail");
      tabmail.switchToTab(tabmail.getBrowserForDocument(emWindow));
      emWindow.focus();
      resolve(emWindow);
      return;
    }

    // This must be a new load, else the ping/pong would have
    // found the window above.
    let tab = openContentTab("about:addons");
    // Also in `contentTabType.restoreTab` in specialTabs.js.
    tab.browser.droppedLinkHandler = event =>
      tab.browser.contentWindow.gDragDrop.onDrop(event);

    Services.obs.addObserver(function observer(aSubject, aTopic, aData) {
      Services.obs.removeObserver(observer, aTopic);
      if (aView) {
        aSubject.loadView(aView);
      }
      aSubject.focus();
      resolve(aSubject);
    }, "EM-loaded");
  });
}

function openActivityMgr() {
  Cc["@mozilla.org/activity-manager-ui;1"]
    .getService(Ci.nsIActivityManagerUI)
    .show(window);
}

/**
 * Open the folder properties of current folder with the quota tab selected.
 */
function openFolderQuota() {
  document
    .getElementById("tabmail")
    .currentAbout3Pane?.folderPane.editFolder("QuotaTab");
}

function openIMAccountMgr() {
  var win = Services.wm.getMostRecentWindow("Messenger:Accounts");
  if (win) {
    win.focus();
  } else {
    win = Services.ww.openWindow(
      null,
      "chrome://messenger/content/chat/imAccounts.xhtml",
      "Accounts",
      "chrome,resizable,centerscreen",
      null
    );
  }
  return win;
}

function openIMAccountWizard() {
  const kFeatures = "chrome,centerscreen,modal,titlebar";
  const kUrl = "chrome://messenger/content/chat/imAccountWizard.xhtml";
  const kName = "IMAccountWizard";

  if (AppConstants.platform == "macosx") {
    // On Mac, avoid using the hidden window as a parent as that would
    // make it visible.
    let hiddenWindowUrl = Services.prefs.getCharPref(
      "browser.hiddenWindowChromeURL"
    );
    if (window.location.href == hiddenWindowUrl) {
      Services.ww.openWindow(null, kUrl, kName, kFeatures, null);
      return;
    }
  }

  window.openDialog(kUrl, kName, kFeatures);
}

function openSavedFilesWnd() {
  if (window.tabmail?.globalOverlay) {
    return Promise.resolve();
  }
  return openContentTab("about:downloads");
}

function SetBusyCursor(window, enable) {
  // setCursor() is only available for chrome windows.
  // However one of our frames is the start page which
  // is a non-chrome window, so check if this window has a
  // setCursor method
  if ("setCursor" in window) {
    if (enable) {
      window.setCursor("progress");
    } else {
      window.setCursor("auto");
    }
  }

  var numFrames = window.frames.length;
  for (var i = 0; i < numFrames; i++) {
    SetBusyCursor(window.frames[i], enable);
  }
}

function openAboutDialog() {
  for (let win of Services.wm.getEnumerator("Mail:About")) {
    // Only open one about window
    win.focus();
    return;
  }

  let features = "chrome,centerscreen,";
  if (AppConstants.platform == "win") {
    features += "dependent";
  } else if (AppConstants.platform == "macosx") {
    features += "resizable=no,minimizable=no";
  } else {
    features += "dependent,dialog=no";
  }

  window.openDialog(
    "chrome://messenger/content/aboutDialog.xhtml",
    "About",
    features
  );
}

/**
 * Opens the support page based on the app.support.baseURL pref.
 */
function openSupportURL() {
  openFormattedURL("app.support.baseURL");
}

/**
 *  Fetches the url for the passed in pref name, formats it and then loads it in the default
 *  browser.
 *
 *  @param aPrefName - name of the pref that holds the url we want to format and open
 */
function openFormattedURL(aPrefName) {
  var urlToOpen = Services.urlFormatter.formatURLPref(aPrefName);

  var uri = Services.io.newURI(urlToOpen);

  var protocolSvc = Cc[
    "@mozilla.org/uriloader/external-protocol-service;1"
  ].getService(Ci.nsIExternalProtocolService);
  protocolSvc.loadURI(uri);
}

/**
 * Opens the Troubleshooting page in a new tab.
 */
function openAboutSupport() {
  let mailWindow = Services.wm.getMostRecentWindow("mail:3pane");
  if (mailWindow) {
    mailWindow.focus();
    mailWindow.document.getElementById("tabmail").openTab("contentTab", {
      url: "about:support",
    });
    return;
  }

  window.openDialog(
    "chrome://messenger/content/messenger.xhtml",
    "_blank",
    "chrome,dialog=no,all",
    null,
    {
      tabType: "contentTab",
      tabParams: { url: "about:support" },
    }
  );
}

/**
 * Prompt the user to restart the browser in safe mode.
 */
function safeModeRestart() {
  // Is TB in safe mode?
  if (Services.appinfo.inSafeMode) {
    let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
      Ci.nsISupportsPRBool
    );
    Services.obs.notifyObservers(
      cancelQuit,
      "quit-application-requested",
      "restart"
    );

    if (cancelQuit.data) {
      return;
    }

    Services.startup.quit(
      Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit
    );
    return;
  }
  // prompt the user to confirm
  let bundle = Services.strings.createBundle(
    "chrome://messenger/locale/messenger.properties"
  );
  let promptTitle = bundle.GetStringFromName(
    "troubleshootModeRestartPromptTitle"
  );
  let promptMessage = bundle.GetStringFromName(
    "troubleshootModeRestartPromptMessage"
  );
  let restartText = bundle.GetStringFromName("troubleshootModeRestartButton");
  let buttonFlags =
    Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING +
    Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_CANCEL +
    Services.prompt.BUTTON_POS_0_DEFAULT;

  let rv = Services.prompt.confirmEx(
    window,
    promptTitle,
    promptMessage,
    buttonFlags,
    restartText,
    null,
    null,
    null,
    {}
  );
  if (rv == 0) {
    Services.env.set("MOZ_SAFE_MODE_RESTART", "1");
    let { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
    MailUtils.restartApplication();
  }
}

function getMostRecentMailWindow() {
  let win = null;

  win = Services.wm.getMostRecentWindow("mail:3pane", true);

  // If we're lucky, this isn't a popup, and we can just return this.
  if (win && win.document.documentElement.getAttribute("chromehidden")) {
    win = null;
    // This is oldest to newest, so this gets a bit ugly.
    for (let nextWin of Services.wm.getEnumerator("mail:3pane", true)) {
      if (!nextWin.document.documentElement.getAttribute("chromehidden")) {
        win = nextWin;
      }
    }
  }

  return win;
}

/**
 * Create a sanitized display name for an attachment in order to help prevent
 * people from hiding malicious extensions behind a run of spaces, etc. To do
 * this, we strip leading/trailing whitespace and collapse long runs of either
 * whitespace or identical characters. Windows especially will drop trailing
 * dots and whitespace from filename extensions.
 *
 * @param aAttachment the AttachmentInfo object
 * @returns a sanitized display name for the attachment
 */
function SanitizeAttachmentDisplayName(aAttachment) {
  let displayName = aAttachment.name.trim().replace(/\s+/g, " ");
  if (AppConstants.platform == "win") {
    displayName = displayName.replace(/[ \.]+$/, "");
  }
  return displayName.replace(/(.)\1{9,}/g, "$1…$1");
}

/**
 * Appends a dataTransferItem to the associated event for message attachments,
 * either from the message reader or the composer.
 *
 * @param {Event} event - The associated event.
 * @param {nsIMsgAttachment[]} attachments - The attachments to setup
 */
function setupDataTransfer(event, attachments) {
  let index = 0;
  for (let attachment of attachments) {
    if (attachment.contentType == "text/x-moz-deleted") {
      return;
    }

    let name = attachment.name || attachment.displayName;

    if (!attachment.url || !name) {
      continue;
    }

    // Only add type/filename info for non-file URLs that don't already
    // have it.
    let info = [];
    if (/(^file:|&filename=)/.test(attachment.url)) {
      info.push(attachment.url);
    } else {
      info.push(
        attachment.url +
          "&type=" +
          attachment.contentType +
          "&filename=" +
          encodeURIComponent(name)
      );
    }
    info.push(name, attachment.size, attachment.contentType, attachment.uri);
    if (attachment.sendViaCloud) {
      info.push(attachment.cloudFileAccountKey, attachment.cloudPartHeaderData);
    }

    event.dataTransfer.mozSetDataAt("text/x-moz-url", info.join("\n"), index);
    event.dataTransfer.mozSetDataAt(
      "text/x-moz-url-data",
      attachment.url,
      index
    );
    event.dataTransfer.mozSetDataAt("text/x-moz-url-desc", name, index);
    event.dataTransfer.mozSetDataAt(
      "application/x-moz-file-promise-url",
      attachment.url,
      index
    );
    event.dataTransfer.mozSetDataAt(
      "application/x-moz-file-promise",
      new nsFlavorDataProvider(),
      index
    );
    event.dataTransfer.mozSetDataAt(
      "application/x-moz-file-promise-dest-filename",
      name.replace(/(.{74}).*(.{10})$/u, "$1...$2"),
      index
    );
    index++;
  }
}

/**
 * Checks if Thunderbird was launched in safe mode and updates the menu items.
 */
function updateTroubleshootMenuItem() {
  if (Services.appinfo.inSafeMode) {
    let safeMode = document.getElementById("helpTroubleshootMode");
    document.l10n.setAttributes(safeMode, "menu-help-exit-troubleshoot-mode");

    let appSafeMode = document.getElementById("appmenu_troubleshootMode");
    if (appSafeMode) {
      document.l10n.setAttributes(
        appSafeMode,
        "appmenu-help-exit-troubleshoot-mode2"
      );
    }
  }
}

function nsFlavorDataProvider() {}

nsFlavorDataProvider.prototype = {
  QueryInterface: ChromeUtils.generateQI(["nsIFlavorDataProvider"]),

  getFlavorData(aTransferable, aFlavor, aData) {
    // get the url for the attachment
    if (aFlavor == "application/x-moz-file-promise") {
      var urlPrimitive = {};
      aTransferable.getTransferData(
        "application/x-moz-file-promise-url",
        urlPrimitive
      );

      var srcUrlPrimitive = urlPrimitive.value.QueryInterface(
        Ci.nsISupportsString
      );

      // now get the destination file location from kFilePromiseDirectoryMime
      var dirPrimitive = {};
      aTransferable.getTransferData(
        "application/x-moz-file-promise-dir",
        dirPrimitive
      );
      var destDirectory = dirPrimitive.value.QueryInterface(Ci.nsIFile);

      // now save the attachment to the specified location
      // XXX: we need more information than just the attachment url to save it,
      // fortunately, we have an array of all the current attachments so we can
      // cheat and scan through them

      var attachment = null;
      for (let index of currentAttachments.keys()) {
        attachment = currentAttachments[index];
        if (attachment.url == srcUrlPrimitive) {
          break;
        }
      }

      // call our code for saving attachments
      if (attachment) {
        let messenger = Cc["@mozilla.org/messenger;1"].createInstance(
          Ci.nsIMessenger
        );
        let name = attachment.name || attachment.displayName;
        let destFilePath = messenger.saveAttachmentToFolder(
          attachment.contentType,
          attachment.url,
          name.replace(/(.{74}).*(.{10})$/u, "$1...$2"),
          attachment.uri,
          destDirectory
        );
        aData.value = destFilePath.QueryInterface(Ci.nsISupports);
      }
      if (AppConstants.platform == "macosx") {
        // Workaround dnd of multiple attachments creating duplicates. See bug 1494588.
        aTransferable.removeDataFlavor("application/x-moz-file-promise");
      }
    }
  },
};
