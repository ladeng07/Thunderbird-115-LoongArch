/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Search input with customizable search button and placeholder.
 * Attributes:
 * - label: Search field label for accessibility tree.
 * - disabled: When present, disable the search field and button.
 * Slots in template (#searchBarTemplate):
 * - placeholder: Content displayed as placeholder. When not provided, the value
 *   of the label attribute is shown as placeholder.
 * - button: Content displayed on the search button.
 *
 * @emits search: Event when a search should be executed. detail holds the
 *  search term.
 * @emits autocomplte: Auto complete update. detail holds the current search
 *  term.
 */
export class SearchBar extends HTMLElement {
  static get observedAttributes() {
    return ["label", "disabled"];
  }

  /**
   * Reference to the input field in the form.
   *
   * @type {?HTMLInputElement}
   */
  #input = null;

  /**
   * Reference to the search button in the form.
   *
   * @type {?HTMLButtonElement}
   */
  #button = null;

  #onSubmit = event => {
    event.preventDefault();
    if (!this.#input.value) {
      return;
    }

    const searchEvent = new CustomEvent("search", {
      detail: this.#input.value,
      cancelable: true,
    });
    if (this.dispatchEvent(searchEvent)) {
      this.reset();
    }
  };

  #onInput = () => {
    const autocompleteEvent = new CustomEvent("autocomplete", {
      detail: this.#input.value,
    });
    this.dispatchEvent(autocompleteEvent);
  };

  connectedCallback() {
    if (this.shadowRoot) {
      return;
    }

    const shadowRoot = this.attachShadow({ mode: "open" });

    const template = document
      .getElementById("searchBarTemplate")
      .content.cloneNode(true);
    this.#input = template.querySelector("input");
    this.#button = template.querySelector("button");

    template.querySelector("form").addEventListener("submit", this.#onSubmit, {
      passive: false,
    });

    this.#input.setAttribute("aria-label", this.getAttribute("label"));
    template.querySelector("slot[name=placeholder]").textContent =
      this.getAttribute("label");
    this.#input.addEventListener("input", this.#onInput);

    const styles = document.createElement("link");
    styles.setAttribute("rel", "stylesheet");
    styles.setAttribute(
      "href",
      "chrome://messenger/skin/shared/search-bar.css"
    );
    shadowRoot.append(styles, template);
  }

  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (!this.#input) {
      return;
    }
    switch (attributeName) {
      case "label":
        this.#input.setAttribute("aria-label", newValue);
        this.shadowRoot.querySelector("slot[name=placeholder]").textContent =
          newValue;
        break;
      case "disabled": {
        const isDisabled = this.hasAttribute("disabled");
        this.#input.disabled = isDisabled;
        this.#button.disabled = isDisabled;
      }
    }
  }

  focus() {
    this.#input.focus();
  }

  /**
   * Reset the search bar to its empty state.
   */
  reset() {
    this.#input.value = "";
  }
}
customElements.define("search-bar", SearchBar);
