/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var { MailE10SUtils } = ChromeUtils.import(
  "resource:///modules/MailE10SUtils.jsm"
);

/* Magic global things the <browser> and its entourage of logic expect. */
var PopupNotifications = {
  show(browser, id, message) {
    console.warn(
      "Not showing popup notification",
      id,
      "with the message",
      message
    );
  },
};

var gBrowser = {
  get selectedBrowser() {
    return document.getElementById("requestFrame");
  },
  _getAndMaybeCreateDateTimePickerPanel() {
    return this.selectedBrowser.dateTimePicker;
  },
  get webNavigation() {
    return this.selectedBrowser.webNavigation;
  },
};

function getBrowser() {
  return gBrowser.selectedBrowser;
}

/* Logic to actually run the login process and window contents */
var reporterListener = {
  _isBusy: false,

  QueryInterface: ChromeUtils.generateQI([
    "nsIWebProgressListener",
    "nsISupportsWeakReference",
  ]),

  onStateChange(
    /* in nsIWebProgress*/ aWebProgress,
    /* in nsIRequest*/ aRequest,
    /* in unsigned long*/ aStateFlags,
    /* in nsresult*/ aStatus
  ) {},

  onProgressChange(
    /* in nsIWebProgress*/ aWebProgress,
    /* in nsIRequest*/ aRequest,
    /* in long*/ aCurSelfProgress,
    /* in long */ aMaxSelfProgress,
    /* in long */ aCurTotalProgress,
    /* in long */ aMaxTotalProgress
  ) {},

  onLocationChange(
    /* in nsIWebProgress*/ aWebProgress,
    /* in nsIRequest*/ aRequest,
    /* in nsIURI*/ aLocation
  ) {
    document.getElementById("headerMessage").value = aLocation.spec;
  },

  onStatusChange(
    /* in nsIWebProgress*/ aWebProgress,
    /* in nsIRequest*/ aRequest,
    /* in nsresult*/ aStatus,
    /* in wstring*/ aMessage
  ) {},

  onSecurityChange(
    /* in nsIWebProgress*/ aWebProgress,
    /* in nsIRequest*/ aRequest,
    /* in unsigned long*/ aState
  ) {
    const wpl_security_bits =
      Ci.nsIWebProgressListener.STATE_IS_SECURE |
      Ci.nsIWebProgressListener.STATE_IS_BROKEN |
      Ci.nsIWebProgressListener.STATE_IS_INSECURE;

    let icon = document.getElementById("security-icon");
    switch (aState & wpl_security_bits) {
      case Ci.nsIWebProgressListener.STATE_IS_SECURE:
        icon.setAttribute(
          "src",
          "chrome://messenger/skin/icons/connection-secure.svg"
        );
        // Set alt.
        document.l10n.setAttributes(icon, "content-tab-security-high-icon");
        icon.classList.add("secure-connection-icon");
        break;
      case Ci.nsIWebProgressListener.STATE_IS_BROKEN:
        icon.setAttribute(
          "src",
          "chrome://messenger/skin/icons/connection-insecure.svg"
        );
        document.l10n.setAttributes(icon, "content-tab-security-broken-icon");
        icon.classList.remove("secure-connection-icon");
        break;
      default:
        icon.removeAttribute("src");
        icon.removeAttribute("data-l10n-id");
        icon.removeAttribute("alt");
        icon.classList.remove("secure-connection-icon");
        break;
    }
  },

  onContentBlockingEvent(
    /* in nsIWebProgress*/ aWebProgress,
    /* in nsIRequest*/ aRequest,
    /* in unsigned long*/ aEvent
  ) {},
};

function cancelRequest() {
  reportUserClosed();
  window.close();
}

function reportUserClosed() {
  let request = window.arguments[0].wrappedJSObject;
  request.cancelled();
}

function loadRequestedUrl() {
  let request = window.arguments[0].wrappedJSObject;

  var browser = document.getElementById("requestFrame");
  browser.addProgressListener(reporterListener, Ci.nsIWebProgress.NOTIFY_ALL);
  var url = request.url;
  if (url == "") {
    document.getElementById("headerMessage").value = request.promptText;
  } else {
    MailE10SUtils.loadURI(browser, url);
    document.getElementById("headerMessage").value = url;
  }
  request.loaded(window, browser.webProgress);
}
