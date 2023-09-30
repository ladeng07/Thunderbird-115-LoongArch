/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from aboutDialog-appUpdater.js */

"use strict";

var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
if (AppConstants.MOZ_UPDATER) {
  Services.scriptloader.loadSubScript(
    "chrome://messenger/content/aboutDialog-appUpdater.js",
    this
  );
}

window.addEventListener("DOMContentLoaded", onLoad);
if (AppConstants.MOZ_UPDATER) {
  // This method is in the aboutDialog-appUpdater.js file.
  window.addEventListener("unload", onUnload);
}

function onLoad(event) {
  if (event.target !== document) {
    return;
  }

  let defaults = Services.prefs.getDefaultBranch(null);
  let distroId = defaults.getCharPref("distribution.id", "");
  if (distroId) {
    let distroAbout = defaults.getStringPref("distribution.about", "");
    // If there is about text, we always show it.
    if (distroAbout) {
      let distroField = document.getElementById("distribution");
      distroField.innerText = distroAbout;
      distroField.style.display = "block";
    }
    // If it's not a mozilla distribution, show the rest,
    // unless about text exists, then we always show.
    if (!distroId.startsWith("mozilla-") || distroAbout) {
      let distroVersion = defaults.getCharPref("distribution.version", "");
      if (distroVersion) {
        distroId += " - " + distroVersion;
      }

      let distroIdField = document.getElementById("distributionId");
      distroIdField.innerText = distroId;
      distroIdField.style.display = "block";
    }
  }

  // Include the build ID and display warning if this is an "a#" (nightly or aurora) build
  let versionId = "aboutDialog-version";
  let versionAttributes = {
    version: AppConstants.MOZ_APP_VERSION_DISPLAY,
    bits: Services.appinfo.is64Bit ? 64 : 32,
  };

  let version = Services.appinfo.version;
  if (/a\d+$/.test(version)) {
    versionId = "aboutDialog-version-nightly";
    let buildID = Services.appinfo.appBuildID;
    let year = buildID.slice(0, 4);
    let month = buildID.slice(4, 6);
    let day = buildID.slice(6, 8);
    versionAttributes.isodate = `${year}-${month}-${day}`;

    document.getElementById("experimental").hidden = false;
    document.getElementById("communityDesc").hidden = true;
  }

  // Use Fluent arguments for append version and the architecture of the build
  let versionField = document.getElementById("version");

  document.l10n.setAttributes(versionField, versionId, versionAttributes);

  if (!AppConstants.NIGHTLY_BUILD) {
    // Show a release notes link if we have a URL.
    let relNotesLink = document.getElementById("releasenotes");
    let relNotesPrefType = Services.prefs.getPrefType("app.releaseNotesURL");
    if (relNotesPrefType != Services.prefs.PREF_INVALID) {
      let relNotesURL = Services.urlFormatter.formatURLPref(
        "app.releaseNotesURL"
      );
      if (relNotesURL != "about:blank") {
        relNotesLink.href = relNotesURL;
        relNotesLink.hidden = false;
      }
    }
  }

  if (AppConstants.MOZ_UPDATER) {
    gAppUpdater = new appUpdater({ buttonAutoFocus: true });

    let channelLabel = document.getElementById("currentChannelText");
    let channelAttrs = document.l10n.getAttributes(channelLabel);
    let channel = UpdateUtils.UpdateChannel;
    document.l10n.setAttributes(channelLabel, channelAttrs.id, { channel });
    if (
      /^release($|\-)/.test(channel) ||
      Services.sysinfo.getProperty("isPackagedApp")
    ) {
      channelLabel.hidden = true;
    }
  }

  // Open external links in browser
  for (const link of document.getElementsByClassName("browser-link")) {
    link.onclick = event => {
      event.preventDefault();
      openLink(event.target.href);
    };
  }
  // Open internal (about:) links open in Thunderbird tab
  for (const link of document.getElementsByClassName("tab-link")) {
    link.onclick = event => {
      event.preventDefault();
      openAboutTab(event.target.href);
    };
  }
}

// This function is used to open about: tabs. The caller should ensure the url
// is only an about: url.
function openAboutTab(url) {
  // Check existing windows
  let mailWindow = Services.wm.getMostRecentWindow("mail:3pane");
  if (mailWindow) {
    mailWindow.focus();
    mailWindow.document
      .getElementById("tabmail")
      .openTab("contentTab", { url });
    return;
  }

  // No existing windows.
  window.openDialog(
    "chrome://messenger/content/messenger.xhtml",
    "_blank",
    "chrome,dialog=no,all",
    null,
    {
      tabType: "contentTab",
      tabParams: { url },
    }
  );
}

function openLink(url) {
  Cc["@mozilla.org/uriloader/external-protocol-service;1"]
    .getService(Ci.nsIExternalProtocolService)
    .loadURI(Services.io.newURI(url));
}
