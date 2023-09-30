/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

import { vCardIdGen } from "./id-gen.mjs";

const lazy = {};
ChromeUtils.defineModuleGetter(
  lazy,
  "VCardPropertyEntry",
  "resource:///modules/VCardUtils.jsm"
);

/**
 * @implements {VCardPropertyEntryView}
 * @see RFC6350 TEL
 *
 * @TODO missing type-param-tel support.
 * "text, voice, video, textphone"
 */
export class VCardTelComponent extends HTMLElement {
  /** @type {VCardPropertyEntry} */
  vCardPropertyEntry;

  /** @type {HTMLInputElement} */
  inputElement;

  static newVCardPropertyEntry() {
    return new lazy.VCardPropertyEntry("tel", {}, "text", "");
  }

  connectedCallback() {
    if (this.hasConnected) {
      return;
    }
    this.hasConnected = true;

    let template = document.getElementById("template-vcard-edit-tel");
    let clonedTemplate = template.content.cloneNode(true);
    this.appendChild(clonedTemplate);

    this.inputElement = this.querySelector('input[type="text"]');
    let urlId = vCardIdGen.next().value;
    this.inputElement.id = urlId;
    let urlLabel = this.querySelector('label[for="text"]');
    urlLabel.htmlFor = urlId;
    document.l10n.setAttributes(urlLabel, "vcard-tel-label");
    this.inputElement.type = "tel";

    // Create the tel type selection.
    this.vCardType = this.querySelector("vcard-type");
    this.vCardType.createTypeSelection(this.vCardPropertyEntry, {
      createLabel: true,
      propertyType: "tel",
    });

    this.querySelector(".remove-property-button").addEventListener(
      "click",
      () => {
        this.dispatchEvent(
          new CustomEvent("vcard-remove-property", { bubbles: true })
        );
        this.remove();
      }
    );

    this.fromVCardPropertyEntryToUI();
  }

  fromVCardPropertyEntryToUI() {
    this.inputElement.value = this.vCardPropertyEntry.value;
  }

  fromUIToVCardPropertyEntry() {
    this.vCardPropertyEntry.value = this.inputElement.value;
  }

  valueIsEmpty() {
    return this.vCardPropertyEntry.value === "";
  }
}

customElements.define("vcard-tel", VCardTelComponent);
