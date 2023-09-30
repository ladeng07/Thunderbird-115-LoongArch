/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Dialog event listeners.
window.addEventListener("dialogaccept", onAccept);
window.addEventListener("load", init);

var gUndecided = null;
var gUnverified = null;

async function init() {
  let num = window.arguments[0].keys.length;
  let label1 = document.getElementById("importInfo");
  document.l10n.setAttributes(label1, "openpgp-pubkey-import-intro", {
    num,
  });
  let label2 = document.getElementById("acceptInfo");
  document.l10n.setAttributes(label2, "openpgp-pubkey-import-accept", {
    num,
  });

  let l10nElements = [];
  l10nElements.push(label1);
  l10nElements.push(label2);

  // TODO: This should be changed to use data-l10n-id in the .xhtml
  // at a later time. We reuse strings on the 78 branch that don't have
  // the .label definition in the .ftl file.

  let [rUnd, rUnv] = await document.l10n.formatValues([
    { id: "openpgp-key-undecided" },
    { id: "openpgp-key-unverified" },
  ]);

  gUndecided = document.getElementById("acceptUndecided");
  gUndecided.label = rUnd;
  gUnverified = document.getElementById("acceptUnverified");
  gUnverified.label = rUnv;

  let keyList = document.getElementById("importKeyList");

  for (let key of window.arguments[0].keys) {
    let container = document.createXULElement("hbox");
    container.classList.add("key-import-row");

    let titleContainer = document.createXULElement("vbox");
    let headerHBox = document.createXULElement("hbox");

    let idSpan = document.createElement("span");
    let idLabel = document.createXULElement("label");
    idSpan.appendChild(idLabel);
    idSpan.classList.add("openpgp-key-id");
    headerHBox.appendChild(idSpan);

    document.l10n.setAttributes(idLabel, "openpgp-pubkey-import-id", {
      kid: "0x" + key.keyId,
    });

    let fprSpan = document.createElement("span");
    let fprLabel = document.createXULElement("label");
    fprSpan.appendChild(fprLabel);
    fprSpan.classList.add("openpgp-key-fpr");
    headerHBox.appendChild(fprSpan);

    document.l10n.setAttributes(fprLabel, "openpgp-pubkey-import-fpr", {
      fpr: key.fpr,
    });

    titleContainer.appendChild(headerHBox);

    for (let uid of key.userIds) {
      let name = document.createXULElement("label");
      name.classList.add("openpgp-key-name");
      name.value = uid.userId;
      titleContainer.appendChild(name);
    }

    container.appendChild(titleContainer);
    keyList.appendChild(container);
  }

  await document.l10n.translateElements(l10nElements);
  window.sizeToContent();
  window.moveTo(
    (screen.width - window.outerWidth) / 2,
    (screen.height - window.outerHeight) / 2
  );
}

function onAccept(event) {
  window.arguments[0].confirmed = true;
  if (gUndecided.selected) {
    window.arguments[0].acceptance = "undecided";
  } else if (gUnverified.selected) {
    window.arguments[0].acceptance = "unverified";
  } else {
    throw new Error("internal error, no expected radio button was selected");
  }
}
