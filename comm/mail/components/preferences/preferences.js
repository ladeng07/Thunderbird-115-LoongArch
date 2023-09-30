/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from ../../../../toolkit/content/preferencesBindings.js */
/* import-globals-from general.js */
/* import-globals-from compose.js */
/* import-globals-from downloads.js */
/* import-globals-from privacy.js */
/* import-globals-from chat.js */
/* import-globals-from sync.js */
/* import-globals-from findInPage.js */
/* globals gCalendarPane */

var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { ExtensionSupport } = ChromeUtils.import(
  "resource:///modules/ExtensionSupport.jsm"
);
var { calendarDeactivator } = ChromeUtils.import(
  "resource:///modules/calendar/calCalendarDeactivator.jsm"
);
var { UIDensity } = ChromeUtils.import("resource:///modules/UIDensity.jsm");
var { UIFontSize } = ChromeUtils.import("resource:///modules/UIFontSize.jsm");

var paneDeck = document.getElementById("paneDeck");
var defaultPane = "paneGeneral";

ChromeUtils.defineESModuleGetters(this, {
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
});

XPCOMUtils.defineLazyGetter(this, "gSubDialog", function () {
  const { SubDialogManager } = ChromeUtils.importESModule(
    "resource://gre/modules/SubDialog.sys.mjs"
  );
  return new SubDialogManager({
    dialogStack: document.getElementById("dialogStack"),
    dialogTemplate: document.getElementById("dialogTemplate"),
    dialogOptions: {
      styleSheets: [
        "chrome://messenger/skin/preferences/dialog.css",
        "chrome://messenger/skin/preferences/preferences.css",
      ],
      resizeCallback: ({ title, frame }) => {
        UIFontSize.registerWindow(frame.contentWindow);

        // Search within main document and highlight matched keyword.
        gSearchResultsPane.searchWithinNode(title, gSearchResultsPane.query);

        // Search within sub-dialog document and highlight matched keyword.
        gSearchResultsPane.searchWithinNode(
          frame.contentDocument.firstElementChild,
          gSearchResultsPane.query
        );

        // Creating tooltips for all the instances found
        for (let node of gSearchResultsPane.listSearchTooltips) {
          if (!node.tooltipNode) {
            gSearchResultsPane.createSearchTooltip(
              node,
              gSearchResultsPane.query
            );
          }
        }

        // Resize the dialog to fit the content with edited font size.
        requestAnimationFrame(() => {
          let dialogs = frame.ownerGlobal.gSubDialog._dialogs;
          let dialog = dialogs.find(
            d => d._frame.contentDocument == frame.contentDocument
          );
          if (dialog) {
            UIFontSize.resizeSubDialog(dialog);
          }
        });
      },
    },
  });
});

document.addEventListener("DOMContentLoaded", init, { once: true });

var gCategoryInits = new Map();
var gLastCategory = { category: undefined, subcategory: undefined };

function init_category_if_required(category) {
  let categoryInfo = gCategoryInits.get(category);
  if (!categoryInfo) {
    throw new Error(
      "Unknown in-content prefs category! Can't init " + category
    );
  }
  if (categoryInfo.inited) {
    return null;
  }
  return categoryInfo.init();
}

function register_module(categoryName, categoryObject) {
  gCategoryInits.set(categoryName, {
    inited: false,
    async init() {
      let template = document.getElementById(categoryName);
      if (template) {
        // Replace the template element with the nodes inside of it.
        let frag = template.content;
        await document.l10n.translateFragment(frag);

        // Actually insert them into the DOM.
        document.l10n.pauseObserving();
        template.replaceWith(frag);
        document.l10n.resumeObserving();

        // Asks Preferences to update the attribute value of the entire
        // document again (this can be simplified if we could separate the
        // preferences of each pane.)
        Preferences.queueUpdateOfAllElements();
      }
      categoryObject.init();
      this.inited = true;
    },
  });
}

function init() {
  register_module("paneGeneral", gGeneralPane);
  register_module("paneCompose", gComposePane);
  register_module("panePrivacy", gPrivacyPane);
  register_module("paneCalendar", gCalendarPane);
  if (AppConstants.NIGHTLY_BUILD) {
    register_module("paneSync", gSyncPane);
  }
  register_module("paneSearchResults", gSearchResultsPane);
  if (Services.prefs.getBoolPref("mail.chat.enabled")) {
    register_module("paneChat", gChatPane);
  } else {
    // Remove the pane from the DOM so it doesn't get incorrectly included in
    // the search results.
    document.getElementById("paneChat").remove();
  }

  // If no calendar is currently enabled remove it from the DOM so it doesn't
  // get incorrectly included in the search results.
  if (!calendarDeactivator.isCalendarActivated) {
    document.getElementById("paneCalendar").remove();
    document.getElementById("category-calendar").remove();
  }
  gSearchResultsPane.init();

  let categories = document.getElementById("categories");
  categories.addEventListener("select", event => gotoPref(event.target.value));

  document.documentElement.addEventListener("keydown", event => {
    if (event.key == "Tab") {
      categories.setAttribute("keyboard-navigation", "true");
    } else if ((event.ctrlKey || event.metaKey) && event.key == "f") {
      document.getElementById("searchInput").focus();
      event.preventDefault();
    }
  });

  categories.addEventListener("mousedown", function () {
    this.removeAttribute("keyboard-navigation");
  });

  window.addEventListener("hashchange", onHashChange);
  let lastSelected = Services.xulStore.getValue(
    "about:preferences",
    "paneDeck",
    "lastSelected"
  );
  gotoPref(lastSelected);

  UIDensity.registerWindow(window);
  UIFontSize.registerWindow(window);
}

function onHashChange() {
  gotoPref();
}

async function gotoPref(aCategory) {
  let categories = document.getElementById("categories");
  const kDefaultCategoryInternalName = "paneGeneral";
  const kDefaultCategory = "general";
  let hash = document.location.hash;

  let category = aCategory || hash.substr(1) || kDefaultCategoryInternalName;
  let breakIndex = category.indexOf("-");
  // Subcategories allow for selecting smaller sections of the preferences
  // until proper search support is enabled (bug 1353954).
  let subcategory = breakIndex != -1 && category.substring(breakIndex + 1);
  if (subcategory) {
    category = category.substring(0, breakIndex);
  }
  category = friendlyPrefCategoryNameToInternalName(category);
  if (category != "paneSearchResults") {
    gSearchResultsPane.query = null;
    gSearchResultsPane.searchInput.value = "";
    gSearchResultsPane.getFindSelection(window).removeAllRanges();
    gSearchResultsPane.removeAllSearchTooltips();
    gSearchResultsPane.removeAllSearchMenuitemIndicators();
  } else if (!gSearchResultsPane.searchInput.value) {
    // Something tried to send us to the search results pane without
    // a query string. Default to the General pane instead.
    category = kDefaultCategoryInternalName;
    document.location.hash = kDefaultCategory;
    gSearchResultsPane.query = null;
  }

  // Updating the hash (below) or changing the selected category
  // will re-enter gotoPref.
  if (gLastCategory.category == category && !subcategory) {
    return;
  }

  let item;
  if (category != "paneSearchResults") {
    // Hide second level headers in normal view
    for (let element of document.querySelectorAll(".search-header")) {
      element.hidden = true;
    }

    item = categories.querySelector(".category[value=" + category + "]");
    if (!item) {
      category = kDefaultCategoryInternalName;
      item = categories.querySelector(".category[value=" + category + "]");
    }
  }

  if (
    gLastCategory.category ||
    category != kDefaultCategoryInternalName ||
    subcategory
  ) {
    let friendlyName = internalPrefCategoryNameToFriendlyName(category);
    document.location.hash = friendlyName;
  }
  // Need to set the gLastCategory before setting categories.selectedItem since
  // the categories 'select' event will re-enter the gotoPref codepath.
  gLastCategory.category = category;
  gLastCategory.subcategory = subcategory;
  if (item) {
    categories.selectedItem = item;
  } else {
    categories.clearSelection();
  }
  window.history.replaceState(category, document.title);

  try {
    await init_category_if_required(category);
  } catch (ex) {
    console.error(
      new Error(
        "Error initializing preference category " + category + ": " + ex
      )
    );
    throw ex;
  }

  // Bail out of this goToPref if the category
  // or subcategory changed during async operation.
  if (
    gLastCategory.category !== category ||
    gLastCategory.subcategory !== subcategory
  ) {
    return;
  }

  search(category, "data-category");

  let mainContent = document.querySelector(".main-content");
  mainContent.scrollTop = 0;

  spotlight(subcategory, category);

  document.dispatchEvent(new CustomEvent("paneSelected", { bubbles: true }));
  document.getElementById("preferencesContainer").scrollTo(0, 0);
  document.getElementById("paneDeck").setAttribute("lastSelected", category);
  Services.xulStore.setValue(
    "about:preferences",
    "paneDeck",
    "lastSelected",
    category
  );
}

function friendlyPrefCategoryNameToInternalName(aName) {
  if (aName.startsWith("pane")) {
    return aName;
  }
  return "pane" + aName.substring(0, 1).toUpperCase() + aName.substr(1);
}

// This function is duplicated inside of utilityOverlay.js's openPreferences.
function internalPrefCategoryNameToFriendlyName(aName) {
  return (aName || "").replace(/^pane./, function (toReplace) {
    return toReplace[4].toLowerCase();
  });
}

function search(aQuery, aAttribute) {
  let paneDeck = document.getElementById("paneDeck");
  let elements = paneDeck.children;
  for (let element of elements) {
    // If the "data-hidden-from-search" is "true", the
    // element will not get considered during search.
    if (
      element.getAttribute("data-hidden-from-search") != "true" ||
      element.getAttribute("data-subpanel") == "true"
    ) {
      let attributeValue = element.getAttribute(aAttribute);
      if (attributeValue == aQuery) {
        element.hidden = false;
      } else {
        element.hidden = true;
      }
    } else if (
      element.getAttribute("data-hidden-from-search") == "true" &&
      !element.hidden
    ) {
      element.hidden = true;
    }
    element.classList.remove("visually-hidden");
  }

  let keysets = paneDeck.getElementsByTagName("keyset");
  for (let element of keysets) {
    let attributeValue = element.getAttribute(aAttribute);
    if (attributeValue == aQuery) {
      element.removeAttribute("disabled");
    } else {
      element.setAttribute("disabled", true);
    }
  }
}

async function spotlight(subcategory, category) {
  let highlightedElements = document.querySelectorAll(".spotlight");
  if (highlightedElements.length) {
    for (let element of highlightedElements) {
      element.classList.remove("spotlight");
    }
  }
  if (subcategory) {
    scrollAndHighlight(subcategory, category);
  }
}

async function scrollAndHighlight(subcategory, category) {
  let element = document.querySelector(`[data-subcategory="${subcategory}"]`);
  if (!element) {
    return;
  }
  let header = getClosestDisplayedHeader(element);

  scrollContentTo(header);
  element.classList.add("spotlight");
}

/**
 * If there is no visible second level header it will return first level header,
 * otherwise return second level header.
 *
 * @returns {Element} The closest displayed header.
 */
function getClosestDisplayedHeader(element) {
  let header = element.closest("groupbox");
  let searchHeader = header.querySelector(".search-header");
  if (
    searchHeader &&
    searchHeader.hidden &&
    header.previousElementSibling.classList.contains("subcategory")
  ) {
    header = header.previousElementSibling;
  }
  return header;
}

function scrollContentTo(element) {
  const STICKY_CONTAINER_HEIGHT =
    document.querySelector(".sticky-container").clientHeight;
  let mainContent = document.querySelector(".main-content");
  let top = element.getBoundingClientRect().top - STICKY_CONTAINER_HEIGHT;
  mainContent.scroll({
    top,
    behavior: "smooth",
  });
}

/**
 * Selects the specified preferences pane
 *
 * @param paneID              ID of prefpane to select
 * @param scrollPaneTo        ID of the element to scroll into view
 * @param otherArgs.subdialog ID of button to activate, opening a subdialog
 */
function selectPrefPane(paneID, scrollPaneTo, otherArgs) {
  if (paneID) {
    if (gLastCategory.category != paneID) {
      gotoPref(paneID);
    }
    if (scrollPaneTo) {
      showTab(scrollPaneTo, otherArgs ? otherArgs.subdialog : undefined);
    }
  }
}

/**
 * Select the specified tab
 *
 * @param scrollPaneTo ID of the element to scroll into view
 * @param subdialogID  ID of button to activate, opening a subdialog
 */
function showTab(scrollPaneTo, subdialogID) {
  setTimeout(function () {
    let scrollTarget = document.getElementById(scrollPaneTo);
    if (scrollTarget.closest("groupbox")) {
      scrollTarget = scrollTarget.closest("groupbox");
    }
    scrollTarget.scrollIntoView();
    if (subdialogID) {
      document.getElementById(subdialogID).click();
    }
  });
}

/**
 * Filter the lastFallbackLocale from availableLocales if it doesn't have all
 * of the needed strings.
 *
 * When the lastFallbackLocale isn't the defaultLocale, then by default only
 * fluent strings are included. To fully use that locale you need the langpack
 * to be installed, so if it isn't installed remove it from availableLocales.
 */
async function getAvailableLocales() {
  let { availableLocales, defaultLocale, lastFallbackLocale } = Services.locale;
  // If defaultLocale isn't lastFallbackLocale, then we still need the langpack
  // for lastFallbackLocale for it to be useful.
  if (defaultLocale != lastFallbackLocale) {
    let lastFallbackId = `langpack-${lastFallbackLocale}@thunderbird.mozilla.org`;
    let lastFallbackInstalled = await AddonManager.getAddonByID(lastFallbackId);
    if (!lastFallbackInstalled) {
      return availableLocales.filter(locale => locale != lastFallbackLocale);
    }
  }
  return availableLocales;
}
