/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { IMServices } = ChromeUtils.importESModule(
  "resource:///modules/IMServices.sys.mjs"
);
var { OTR } = ChromeUtils.importESModule("resource:///modules/OTR.sys.mjs");

var l10n = new Localization(["messenger/otr/finger-sync.ftl"], true);

window.addEventListener("DOMContentLoaded", event => {
  otrFinger.onload();
});

var gFingers;
var fingerTreeView = {
  selection: null,
  rowCount: 0,

  setTree(tree) {},
  getImageSrc(row, column) {},
  getProgressMode(row, column) {},
  getCellValue(row, column) {},

  getCellText(row, column) {
    let finger = gFingers[row];
    switch (column.id) {
      case "verified": {
        let id = finger.trust ? "finger-yes" : "finger-no";
        return l10n.formatValueSync(id);
      }
      default:
        return finger[column.id] || "";
    }
  },

  isSeparator(index) {
    return false;
  },

  isSorted() {
    return false;
  },

  isContainer(index) {
    return false;
  },

  cycleHeader(column) {},

  getRowProperties(row) {
    return "";
  },

  getColumnProperties(column) {
    return "";
  },

  getCellProperties(row, column) {
    return "";
  },
};

var fingerTree;
var otrFinger = {
  onload() {
    fingerTree = document.getElementById("fingerTree");
    gFingers = OTR.knownFingerprints(window.arguments[0].account);
    fingerTreeView.rowCount = gFingers.length;
    fingerTree.view = fingerTreeView;
    document.getElementById("remove-all").disabled = !gFingers.length;
  },

  getSelections(tree) {
    let selections = [];
    let selection = tree.view.selection;
    if (selection) {
      let count = selection.getRangeCount();
      let min = {};
      let max = {};
      for (let i = 0; i < count; i++) {
        selection.getRangeAt(i, min, max);
        for (let k = min.value; k <= max.value; k++) {
          if (k != -1) {
            selections.push(k);
          }
        }
      }
    }
    return selections;
  },

  select() {
    let selections = this.getSelections(fingerTree);
    document.getElementById("remove").disabled = !selections.length;
  },

  remove() {
    fingerTreeView.selection.selectEventsSuppressed = true;
    // mark fingers for removal
    for (let sel of this.getSelections(fingerTree)) {
      gFingers[sel].purge = true;
    }
    this.commonRemove();
  },

  removeAll() {
    let confirmAllTitle = l10n.formatValueSync("finger-remove-all-title");
    let confirmAllText = l10n.formatValueSync("finger-remove-all-message");

    let buttonPressed = Services.prompt.confirmEx(
      window,
      confirmAllTitle,
      confirmAllText,
      Services.prompt.BUTTON_POS_1_DEFAULT +
        Services.prompt.STD_OK_CANCEL_BUTTONS +
        Services.prompt.BUTTON_DELAY_ENABLE,
      0,
      0,
      0,
      null,
      {}
    );
    if (buttonPressed != 0) {
      return;
    }

    for (let j = 0; j < gFingers.length; j++) {
      gFingers[j].purge = true;
    }
    this.commonRemove();
  },

  commonRemove() {
    // OTR.forgetFingerprints will null out removed fingers.
    let removalComplete = OTR.forgetFingerprints(gFingers);
    for (let j = 0; j < gFingers.length; j++) {
      if (gFingers[j] === null) {
        let k = j;
        while (k < gFingers.length && gFingers[k] === null) {
          k++;
        }
        gFingers.splice(j, k - j);
        fingerTreeView.rowCount -= k - j;
        fingerTree.rowCountChanged(j, j - k); // negative
      }
    }
    fingerTreeView.selection.selectEventsSuppressed = false;

    if (!removalComplete) {
      let infoTitle = l10n.formatValueSync("finger-subset-title");
      let infoText = l10n.formatValueSync("finger-subset-message");
      Services.prompt.alert(window, infoTitle, infoText);
    }

    document.getElementById("remove-all").disabled = !gFingers.length;
  },
};
