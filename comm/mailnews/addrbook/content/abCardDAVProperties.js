/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var gDirectory = window.arguments[0].selectedDirectory;
var gStringBundle,
  gNameInput,
  gURLInput,
  gRefreshActiveInput,
  gRefreshMenulist,
  gReadOnlyInput,
  gAcceptButton;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    gStringBundle = Services.strings.createBundle(
      "chrome://messenger/locale/addressbook/addressBook.properties"
    );
    document.title = gStringBundle.formatStringFromName(
      "addressBookTitleEdit",
      [gDirectory.dirName]
    );

    gNameInput = document.getElementById("carddav-name");
    gNameInput.value = gDirectory.dirName;
    gNameInput.addEventListener("input", () => {
      gAcceptButton.disabled = gNameInput.value.trim() == "";
    });

    gURLInput = document.getElementById("carddav-url");
    gURLInput.value = gDirectory.getStringValue("carddav.url", "");

    gRefreshActiveInput = document.getElementById("carddav-refreshActive");
    gRefreshActiveInput.addEventListener(
      "command",
      () => (gRefreshMenulist.disabled = !gRefreshActiveInput.checked)
    );

    gRefreshMenulist = document.getElementById("carddav-refreshInterval");
    initRefreshInterval();

    gReadOnlyInput = document.getElementById("carddav-readOnly");
    gReadOnlyInput.checked = gDirectory.readOnly;

    gAcceptButton = document.querySelector("dialog").getButton("accept");
  },
  { once: true }
);

window.addEventListener("dialogaccept", event => {
  let newDirName = gNameInput.value.trim();
  let newSyncInterval = gRefreshActiveInput.checked
    ? gRefreshMenulist.value
    : 0;

  if (newDirName != gDirectory.dirName) {
    // Do not allow an already existing name.
    if (MailServices.ab.directoryNameExists(newDirName)) {
      let alertTitle = gStringBundle.GetStringFromName("duplicateNameTitle");
      let alertText = gStringBundle.formatStringFromName("duplicateNameText", [
        newDirName,
      ]);
      Services.prompt.alert(window, alertTitle, alertText);
      event.preventDefault();
      return;
    }

    gDirectory.dirName = newDirName;
  }

  if (newSyncInterval != gDirectory.getIntValue("carddav.syncinterval", -1)) {
    gDirectory.setIntValue("carddav.syncinterval", newSyncInterval);
  }

  if (gReadOnlyInput.checked != gDirectory.readOnly) {
    gDirectory.setBoolValue("readOnly", gReadOnlyInput.checked);
  }
});

function initRefreshInterval() {
  function createMenuItem(minutes) {
    let menuitem = document.createXULElement("menuitem");
    menuitem.setAttribute("value", minutes);
    menuitem.setAttribute("data-l10n-attrs", "label");
    if (minutes < 60) {
      document.l10n.setAttributes(
        menuitem,
        "carddav-refreshinterval-minutes-value",
        {
          minutes,
        }
      );
    } else {
      document.l10n.setAttributes(
        menuitem,
        "carddav-refreshinterval-hours-value",
        {
          hours: minutes / 60,
        }
      );
    }

    gRefreshMenulist.menupopup.appendChild(menuitem);
    if (refreshInterval == minutes) {
      gRefreshMenulist.value = minutes;
      foundValue = true;
    }

    return menuitem;
  }

  let refreshInterval = gDirectory.getIntValue("carddav.syncinterval", 30);
  if (refreshInterval === null) {
    refreshInterval = 30;
  }

  let foundValue = false;

  for (let min of [1, 5, 15, 30, 60, 120, 240, 360, 720, 1440]) {
    createMenuItem(min);
  }

  if (refreshInterval == 0) {
    gRefreshMenulist.value = 30; // The default.
    gRefreshMenulist.disabled = true;
    foundValue = true;
  } else {
    gRefreshActiveInput.checked = true;
  }

  if (!foundValue) {
    // Special menuitem in case the user changed the value in the config editor.
    createMenuItem(refreshInterval);
  }
}
