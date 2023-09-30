/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

var EnigmailWindows = ChromeUtils.import(
  "chrome://openpgp/content/modules/windows.jsm"
).EnigmailWindows;
var EnigmailKeyRing = ChromeUtils.import(
  "chrome://openpgp/content/modules/keyRing.jsm"
).EnigmailKeyRing;
var EnigmailDialog = ChromeUtils.import(
  "chrome://openpgp/content/modules/dialog.jsm"
).EnigmailDialog;
var EnigmailData = ChromeUtils.import(
  "chrome://openpgp/content/modules/data.jsm"
).EnigmailData;

async function onLoad() {
  let dlg = document.getElementById("enigmailKeyImportInfo");

  let keys = [];

  if (window.screen.width > 500) {
    dlg.setAttribute("maxwidth", window.screen.width - 150);
  }

  if (window.screen.height > 300) {
    dlg.setAttribute("maxheight", window.screen.height - 100);
  }

  var keyList = window.arguments[0].keyList;

  let onClickFunc = function (event) {
    let keyId = event.target.getAttribute("keyid");
    EnigmailWindows.openKeyDetails(window, keyId, false);
  };

  for (let keyId of keyList) {
    if (keyId.search(/^0x/) === 0) {
      keyId = keyId.substr(2).toUpperCase();
    }
    let keyObj = EnigmailKeyRing.getKeyById(keyId);
    if (keyObj && keyObj.fpr) {
      let keyGroupBox = buildKeyGroupBox(keyObj);
      keyGroupBox
        .getElementsByClassName("enigmailKeyImportDetails")[0]
        .addEventListener("click", onClickFunc, true);
      keys.push(keyGroupBox);
    }
  }

  dlg.getButton("accept").focus();

  if (keys.length) {
    let keysInfoBox = document.getElementById("keyInfo"),
      keyBox = document.createXULElement("vbox");

    keyBox.classList.add("grid-three-column");
    for (let key of keys) {
      keyBox.appendChild(key);
    }

    keysInfoBox.appendChild(keyBox);
  } else {
    EnigmailDialog.alert(
      window,
      await document.l10n.formatValue("import-info-no-keys")
    );
    setTimeout(window.close, 0);
    return;
  }

  setTimeout(resizeDlg);
  setTimeout(() => window.sizeToContent());
}

function buildKeyGroupBox(keyObj) {
  let groupBox = document.createXULElement("vbox");
  let userid = document.createXULElement("label");

  groupBox.classList.add("enigmailGroupbox", "enigmailGroupboxMargin");
  userid.setAttribute("value", keyObj.userId);
  userid.setAttribute("class", "enigmailKeyImportUserId");

  let infoBox = document.createElement("div");
  let infoLabelH1 = document.createXULElement("label");
  let infoLabelH2 = document.createXULElement("label");
  let infoLabelB1 = document.createXULElement("label");
  let infoLabelB2 = document.createXULElement("label");
  let infoLabelB3 = document.createXULElement("label");

  document.l10n.setAttributes(infoLabelH1, "import-info-bits");
  document.l10n.setAttributes(infoLabelH2, "import-info-created");
  infoLabelB1.setAttribute("value", keyObj.keySize);
  infoLabelB2.setAttribute("value", keyObj.created);

  infoLabelH1.classList.add("enigmailKeyImportHeader");
  infoLabelH2.classList.add("enigmailKeyImportHeader");

  infoBox.classList.add("grid-two-column-fr");
  infoBox.appendChild(infoLabelH1);
  infoBox.appendChild(infoLabelH2);
  infoBox.appendChild(infoLabelB1);
  infoBox.appendChild(infoLabelB2);

  let fprBox = document.createXULElement("div");
  let fprLabel = document.createXULElement("label");
  document.l10n.setAttributes(fprLabel, "import-info-fpr");
  fprLabel.setAttribute("class", "enigmailKeyImportHeader");
  let gridTemplateColumns = "";
  for (let i = 0; i < keyObj.fpr.length; i += 4) {
    var label = document.createXULElement("label");
    label.setAttribute("value", keyObj.fpr.substr(i, 4));
    if (i < keyObj.fpr.length / 2) {
      gridTemplateColumns += "auto ";
    }
    fprBox.appendChild(label);
  }

  fprBox.style.display = "inline-grid";
  fprBox.style.gridTemplateColumns = gridTemplateColumns;

  groupBox.appendChild(userid);
  groupBox.appendChild(infoBox);
  groupBox.appendChild(fprLabel);
  groupBox.appendChild(fprBox);

  document.l10n.setAttributes(infoLabelB3, "import-info-details");
  infoLabelB3.setAttribute("keyid", keyObj.keyId);
  infoLabelB3.setAttribute("class", "enigmailKeyImportDetails");
  groupBox.appendChild(infoLabelB3);

  return groupBox;
}

function resizeDlg() {
  var txt = document.getElementById("keyInfo");
  var box = document.getElementById("outerbox");

  var deltaWidth = window.outerWidth - box.clientWidth;
  var newWidth = txt.scrollWidth + deltaWidth + 20;

  if (newWidth > window.screen.width - 50) {
    newWidth = window.screen.width - 50;
  }

  txt.style["white-space"] = "pre-wrap";
  window.resizeTo(newWidth, window.outerHeight);

  var textHeight = txt.scrollHeight;
  var boxHeight = box.clientHeight;
  var deltaHeight = window.outerHeight - boxHeight;

  var newHeight = textHeight + deltaHeight + 25;

  if (newHeight > window.screen.height - 100) {
    newHeight = window.screen.height - 100;
  }

  window.resizeTo(newWidth, newHeight);
}

function dlgClose(buttonNumber) {
  window.arguments[1].value = buttonNumber;
  window.close();
}

document.addEventListener("dialogaccept", function (event) {
  dlgClose(0);
});
