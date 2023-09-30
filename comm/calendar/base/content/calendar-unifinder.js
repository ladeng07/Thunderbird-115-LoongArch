/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals calFilter, calFilter, getViewBox, openEventDialogForViewing,
   modifyEventWithDialog, createEventWithDialog, currentView,
   calendarController, editSelectedEvents, deleteSelectedEvents,
   calendarUpdateDeleteCommand, getEventStatusString, goToggleToolbar */

/* exported gCalendarEventTreeClicked, unifinderDoubleClick, unifinderKeyPress,
 *          focusSearch, ensureUnifinderLoaded, toggleUnifinder
 */

/**
 * U N I F I N D E R
 *
 * This is a hacked in interface to the unifinder. We will need to
 * improve this to make it usable in general.
 *
 * NOTE: Including this file will cause a load handler to be added to the
 * window.
 */

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

// Set this to true when the calendar event tree is clicked to allow for
// multiple selection
var gCalendarEventTreeClicked = false;

// Store the start and enddate, because the providers can't be trusted when
// dealing with all-day events. So we need to filter later. See bug 306157

var gUnifinderNeedsRefresh = true;

/**
 * Checks if the unifinder is hidden
 *
 * @returns Returns true if the unifinder is hidden.
 */
function isUnifinderHidden() {
  let tabmail = document.getElementById("tabmail");
  return (
    tabmail.currentTabInfo?.mode.type != "calendar" ||
    document.getElementById("bottom-events-box").hidden
  );
}

/**
 * Returns the current filter applied to the unifinder.
 *
 * @returns The string name of the applied filter.
 */
function getCurrentUnifinderFilter() {
  return document.getElementById("event-filter-menulist").selectedItem.value;
}

/**
 * Observer for the calendar event data source. This keeps the unifinder
 * display up to date when the calendar event data is changed
 *
 * @see calIObserver
 * @see calICompositeObserver
 */
var unifinderObserver = {
  QueryInterface: ChromeUtils.generateQI(["calICompositeObserver", "nsIObserver", "calIObserver"]),

  // calIObserver:
  onStartBatch() {
    gUnifinderNeedsRefresh = true;
  },

  onEndBatch() {
    if (isUnifinderHidden()) {
      // If the unifinder is hidden, all further item operations might
      // produce invalid entries in the unifinder. From now on, ignore
      // those operations and refresh as soon as the unifinder is shown
      // again.
      gUnifinderNeedsRefresh = true;
      unifinderTreeView.clearItems();
    } else {
      refreshEventTree();
    }
  },

  onLoad() {},

  onAddItem(aItem) {
    if (aItem.isEvent() && !gUnifinderNeedsRefresh) {
      this.addItemToTree(aItem);
    }
  },

  onModifyItem(aNewItem, aOldItem) {
    this.onDeleteItem(aOldItem);
    this.onAddItem(aNewItem);
  },

  onDeleteItem(aDeletedItem) {
    if (aDeletedItem.isEvent() && !gUnifinderNeedsRefresh) {
      this.removeItemFromTree(aDeletedItem);
    }
  },

  onError(aCalendar, aErrNo, aMessage) {},

  onPropertyChanged(aCalendar, aName, aValue, aOldValue) {
    switch (aName) {
      case "disabled":
        refreshEventTree();
        break;
    }
  },

  onPropertyDeleting(aCalendar, aName) {
    this.onPropertyChanged(aCalendar, aName, null, null);
  },

  // calICompositeObserver:
  onCalendarAdded(aAddedCalendar) {
    if (!aAddedCalendar.getProperty("disabled")) {
      if (isUnifinderHidden()) {
        gUnifinderNeedsRefresh = true;
      } else {
        addItemsFromCalendar(aAddedCalendar, addItemsFromSingleCalendarInternal);
      }
    }
  },

  onCalendarRemoved(aDeletedCalendar) {
    if (!aDeletedCalendar.getProperty("disabled")) {
      removeItemsFromCalendar(aDeletedCalendar);
    }
  },

  onDefaultCalendarChanged(aNewDefaultCalendar) {},

  /**
   * Add an unifinder item to the tree. It is safe to call these for any
   * event. The functions will determine whether or not anything actually
   * needs to be done to the tree.
   *
   * @returns aItem        The item to add to the tree.
   */
  addItemToTree(aItem) {
    let items;
    let filter = unifinderTreeView.mFilter;

    if (filter.startDate && filter.endDate) {
      items = aItem.getOccurrencesBetween(filter.startDate, filter.endDate);
    } else {
      items = [aItem];
    }
    unifinderTreeView.addItems(items.filter(filter.isItemInFilters, filter));
  },

  /**
   * Remove an item from the unifinder tree. It is safe to call these for any
   * event. The functions will determine whether or not anything actually
   * needs to be done to the tree.
   *
   * @returns aItem        The item to remove from the tree.
   */
  removeItemFromTree(aItem) {
    let items;
    let filter = unifinderTreeView.mFilter;
    if (filter.startDate && filter.endDate && aItem.parentItem == aItem) {
      items = aItem.getOccurrencesBetween(filter.startDate, filter.endDate);
    } else {
      items = [aItem];
    }
    // XXX: do we really still need this, we are always checking it in the refreshInternal
    unifinderTreeView.removeItems(items.filter(filter.isItemInFilters, filter));
  },

  observe() {
    refreshEventTree();
  },
};

/**
 * Called when calendar component is loaded to prepare the unifinder. This function is
 * used to add observers, event listeners, etc.
 */
function prepareCalendarUnifinder() {
  let unifinderTree = document.getElementById("unifinder-search-results-tree");
  // Check that this is not the hidden window, which has no UI elements
  if (!unifinderTree) {
    return;
  }

  // Add pref observer
  Services.prefs.addObserver("calendar.date.format", unifinderObserver);
  Services.obs.addObserver(unifinderObserver, "defaultTimezoneChanged");

  // set up our calendar event observer
  let ccalendar = cal.view.getCompositeCalendar(window);
  ccalendar.addObserver(unifinderObserver);

  // Set up the filter
  unifinderTreeView.mFilter = new calFilter();

  // Set up the unifinder views.
  unifinderTreeView.treeElement = unifinderTree;
  unifinderTree.view = unifinderTreeView;

  // Listen for changes in the selected day, so we can update if need be
  let viewBox = getViewBox();
  viewBox.addEventListener("dayselect", unifinderDaySelect);
  viewBox.addEventListener("itemselect", unifinderItemSelect, true);

  // Set up sortDirection and sortActive, in case it persisted
  let sorted = unifinderTree.getAttribute("sort-active");
  let sortDirection = unifinderTree.getAttribute("sort-direction");
  if (!sortDirection || sortDirection == "undefined") {
    sortDirection = "ascending";
  }
  let treecols = unifinderTree.getElementsByTagName("treecol");
  for (let col of treecols) {
    let content = col.getAttribute("itemproperty");
    if (sorted && sorted.length > 0) {
      if (sorted == content) {
        unifinderTreeView.sortDirection = sortDirection;
        unifinderTreeView.selectedColumn = col;
      }
    }
  }

  unifinderTreeView.ready = true;

  // Display something upon first load. onLoad doesn't work properly for
  // observers
  if (!isUnifinderHidden()) {
    refreshEventTree();
  }
}

/**
 * Called when the window is unloaded to clean up any observers and listeners
 * added.
 */
function finishCalendarUnifinder() {
  let ccalendar = cal.view.getCompositeCalendar(window);
  ccalendar.removeObserver(unifinderObserver);

  // Remove pref observer
  Services.prefs.removeObserver("calendar.date.format", unifinderObserver);
  Services.obs.removeObserver(unifinderObserver, "defaultTimezoneChanged");

  let viewBox = getViewBox();
  if (viewBox) {
    viewBox.removeEventListener("dayselect", unifinderDaySelect);
    viewBox.removeEventListener("itemselect", unifinderItemSelect, true);
  }

  // Persist the sort
  let unifinderTree = document.getElementById("unifinder-search-results-tree");
  let sorted = unifinderTreeView.selectedColumn;
  if (sorted) {
    unifinderTree.setAttribute("sort-active", sorted.getAttribute("itemproperty"));
    unifinderTree.setAttribute("sort-direction", unifinderTreeView.sortDirection);
  } else {
    unifinderTree.removeAttribute("sort-active");
    unifinderTree.removeAttribute("sort-direction");
  }
}

/**
 * Event listener for the view deck's dayselect event.
 */
function unifinderDaySelect() {
  let filter = getCurrentUnifinderFilter();
  if (filter == "current" || filter == "currentview") {
    refreshEventTree();
  }
}

/**
 * Event listener for the view deck's itemselect event.
 */
function unifinderItemSelect(aEvent) {
  unifinderTreeView.setSelectedItems(aEvent.detail);
}

/**
 * Helper function to display event datetimes in the unifinder.
 *
 * @param aDatetime     A calIDateTime object to format.
 * @returns The passed date's formatted in the default timezone.
 */
function formatUnifinderEventDateTime(aDatetime) {
  return cal.dtz.formatter.formatDateTime(aDatetime.getInTimezone(cal.dtz.defaultTimezone));
}

/**
 * Handler function for double clicking the unifinder.
 *
 * @param event         The DOM doubleclick event.
 */
function unifinderDoubleClick(event) {
  // We only care about button 0 (left click) events
  if (event.button != 0) {
    return;
  }

  // find event by id
  let calendarEvent = unifinderTreeView.getItemFromEvent(event);

  if (calendarEvent) {
    if (Services.prefs.getBoolPref("calendar.events.defaultActionEdit", true)) {
      modifyEventWithDialog(calendarEvent, true);
      return;
    }
    openEventDialogForViewing(calendarEvent);
  } else {
    createEventWithDialog();
  }
}

/**
 * Handler function for selection in the unifinder.
 *
 * @param event         The DOM selection event.
 */
function unifinderSelect(event) {
  let tree = unifinderTreeView.treeElement;
  if (!tree.view.selection || tree.view.selection.getRangeCount() == 0) {
    return;
  }

  let selectedItems = [];
  gCalendarEventTreeClicked = true;

  // Get the selected events from the tree
  let start = {};
  let end = {};
  let numRanges = tree.view.selection.getRangeCount();

  for (let range = 0; range < numRanges; range++) {
    tree.view.selection.getRangeAt(range, start, end);

    for (let i = start.value; i <= end.value; i++) {
      try {
        selectedItems.push(unifinderTreeView.getItemAt(i));
      } catch (e) {
        cal.WARN("Error getting Event from row: " + e + "\n");
      }
    }
  }

  if (selectedItems.length == 1) {
    // Go to the day of the selected item in the current view.
    currentView().goToDay(selectedItems[0].startDate);
  }

  // Set up the selected items in the view. Pass in true, so we don't end
  // up in a circular loop
  currentView().setSelectedItems(selectedItems, true);
  currentView().centerSelectedItems();
  calendarController.onSelectionChanged({ detail: selectedItems });
  document.getElementById("unifinder-search-results-tree").focus();
}

/**
 * Handler function for keypress in the unifinder.
 *
 * @param aEvent        The DOM Key event.
 */
function unifinderKeyPress(aEvent) {
  switch (aEvent.key) {
    case "Enter":
      // Enter, edit the event
      editSelectedEvents();
      aEvent.stopPropagation();
      aEvent.preventDefault();
      break;
    case "Backspace":
    case "Delete":
      deleteSelectedEvents();
      aEvent.stopPropagation();
      aEvent.preventDefault();
      break;
  }
}

/**
 * Tree controller for unifinder search results
 */
var unifinderTreeView = {
  QueryInterface: ChromeUtils.generateQI(["nsITreeView"]),

  // Provide a default tree that holds all the functions used here to avoid
  // cludgy if (this.tree) { this.tree.rowCountChanged(...); } constructs.
  tree: {
    rowCountChanged() {},
    beginUpdateBatch() {},
    endUpdateBatch() {},
    invalidate() {},
  },

  ready: false,
  treeElement: null,
  doingSelection: false,
  mFilter: null,
  mSelectedColumn: null,
  sortDirection: null,

  /**
   * Returns the currently selected column in the unifinder (used for sorting).
   */
  get selectedColumn() {
    return this.mSelectedColumn;
  },

  /**
   * Sets the currently selected column in the unifinder (used for sorting).
   */
  set selectedColumn(aCol) {
    let tree = document.getElementById("unifinder-search-results-tree");
    let treecols = tree.getElementsByTagName("treecol");
    for (let col of treecols) {
      if (col.getAttribute("sortActive")) {
        col.removeAttribute("sortActive");
        col.removeAttribute("sortDirection");
      }
      if (aCol.getAttribute("itemproperty") == col.getAttribute("itemproperty")) {
        col.setAttribute("sortActive", "true");
        col.setAttribute("sortDirection", this.sortDirection);
      }
    }
    this.mSelectedColumn = aCol;
  },

  /**
   * Event functions
   */

  eventArray: [],
  eventIndexMap: {},

  /**
   * Add an item to the unifinder tree.
   *
   * @param aItemArray        An array of items to add.
   */
  addItems(aItemArray) {
    this.tree.beginUpdateBatch();

    let bulkSort = aItemArray.length > this.eventArray.length;
    if (bulkSort || !this.selectedColumn) {
      // If there's more items being added than already exist,
      // just append them and sort the whole list afterwards.
      // If there's no selected column, don't sort at all.
      let index = this.eventArray.length;
      this.eventArray = this.eventArray.concat(aItemArray);
      if (bulkSort && this.selectedColumn) {
        this.sortItems();
      } else {
        this.tree.rowCountChanged(index, aItemArray.length);
      }
    } else {
      // Otherwise, for each item to be added, work out its
      // new position in the list and splice it in there.
      // This saves a lot of function calls and calculation.
      let modifier = this.sortDirection == "descending" ? -1 : 1;
      let sortKey = unifinderTreeView.selectedColumn.getAttribute("itemproperty");
      let comparer = cal.unifinder.sortEntryComparer(sortKey);

      let values = this.eventArray.map(item => cal.unifinder.getItemSortKey(item, sortKey));
      for (let item of aItemArray) {
        let itemValue = cal.unifinder.getItemSortKey(item, sortKey);
        let index = values.findIndex(value => comparer(value, itemValue, modifier) >= 0);
        if (index < 0) {
          this.eventArray.push(item);
          this.tree.rowCountChanged(values.length, 1);
          values.push(itemValue);
        } else {
          this.eventArray.splice(index, 0, item);
          this.tree.rowCountChanged(index, 1);
          values.splice(index, 0, itemValue);
        }
      }
    }

    this.tree.endUpdateBatch();
    this.calculateIndexMap(true);
  },

  /**
   * Remove items from the unifinder tree.
   *
   * @param aItemArray        An array of items to remove.
   */
  removeItems(aItemArray) {
    let indexesToRemove = [];
    // Removing items is a bit tricky. Our getItemRow function takes the
    // index from a cached map, so removing an item from the array will
    // remove the wrong indexes. We don't want to just invalidate the map,
    // since this will cause O(n^2) behavior. Instead, we keep a sorted
    // array of the indexes to remove:
    for (let item of aItemArray) {
      let row = this.getItemRow(item);
      if (row > -1) {
        if (!indexesToRemove.length || row <= indexesToRemove[0]) {
          indexesToRemove.unshift(row);
        } else {
          indexesToRemove.push(row);
        }
      }
    }

    // Then we go through the indexes to remove, and remove then from the
    // array. We subtract one delta for each removed index to make sure the
    // correct element is removed from the array and the correct
    // notification is sent.
    this.tree.beginUpdateBatch();
    for (let delta = 0; delta < indexesToRemove.length; delta++) {
      let index = indexesToRemove[delta];
      this.eventArray.splice(index - delta, 1);
      this.tree.rowCountChanged(index - delta, -1);
    }
    this.tree.endUpdateBatch();

    // Finally, we recalculate the index map once. This way we end up with
    // (given that Array.prototype.unshift doesn't loop but just prepends or
    // maps memory smartly) O(3n) behavior. Lets hope its worth it.
    this.calculateIndexMap(true);
  },

  /**
   * Clear all items from the unifinder.
   */
  clearItems() {
    let oldCount = this.eventArray.length;
    this.eventArray = [];
    if (this.tree) {
      this.tree.rowCountChanged(0, -oldCount);
    }
    this.calculateIndexMap();
  },

  /**
   * Sets the items that should be in the unifinder. This removes all items
   * that were previously in the unifinder.
   */
  setItems(aItemArray) {
    let oldCount = this.eventArray.length;
    this.eventArray = aItemArray.slice(0);
    this.tree.rowCountChanged(oldCount - 1, this.eventArray.length - oldCount);
    this.sortItems();
  },

  /**
   * Recalculate the index map that improves performance when accessing
   * unifinder items. This is usually done automatically when adding/removing
   * items.
   *
   * @param aDontInvalidate       (optional) Don't invalidate the tree, i.e if
   *                                you correctly issued rowCountChanged
   *                                notices.
   */
  calculateIndexMap(aDontInvalidate) {
    this.eventIndexMap = {};
    for (let i = 0; i < this.eventArray.length; i++) {
      this.eventIndexMap[this.eventArray[i].hashId] = i;
    }

    if (this.tree && !aDontInvalidate) {
      this.tree.invalidate();
    }
  },

  /**
   * Sort the items in the unifinder by the currently selected column.
   */
  sortItems() {
    if (this.selectedColumn) {
      let modifier = this.sortDirection == "descending" ? -1 : 1;
      let sortKey = unifinderTreeView.selectedColumn.getAttribute("itemproperty");

      cal.unifinder.sortItems(this.eventArray, sortKey, modifier);
    }
    this.calculateIndexMap();
  },

  /**
   * Get the index of the row associated with the passed item.
   *
   * @param item      The item to search for.
   * @returns The row index of the passed item.
   */
  getItemRow(item) {
    if (this.eventIndexMap[item.hashId] === undefined) {
      return -1;
    }
    return this.eventIndexMap[item.hashId];
  },

  /**
   * Get the item at the given row index.
   *
   * @param item      The row index to get the item for.
   * @returns The item at the given row.
   */
  getItemAt(aRow) {
    return this.eventArray[aRow];
  },

  /**
   * Get the calendar item from the given DOM event
   *
   * @param event     The DOM mouse event to get the item for.
   * @returns The item under the mouse position.
   */
  getItemFromEvent(event) {
    let row = this.tree.getRowAt(event.clientX, event.clientY);

    if (row > -1) {
      return this.getItemAt(row);
    }
    return null;
  },

  /**
   * Change the selection in the unifinder.
   *
   * @param aItemArray        An array of items to select.
   */
  setSelectedItems(aItemArray) {
    if (
      this.doingSelection ||
      !this.tree ||
      !this.tree.view ||
      !("getSelectedItems" in currentView())
    ) {
      return;
    }

    this.doingSelection = true;

    // If no items were passed, get the selected items from the view.
    aItemArray = aItemArray || currentView().getSelectedItems();

    calendarUpdateDeleteCommand(aItemArray);

    /**
     * The following is a brutal hack, caused by
     * http://lxr.mozilla.org/mozilla1.0/source/layout/xul/base/src/tree/src/nsTreeSelection.cpp#555
     * and described in bug 168211
     * http://bugzilla.mozilla.org/show_bug.cgi?id=168211
     * Do NOT remove anything in the next 3 lines, or the selection in the tree will not work.
     */
    this.treeElement.onselect = null;
    this.treeElement.removeEventListener("select", unifinderSelect, true);
    this.tree.view.selection.selectEventsSuppressed = true;
    this.tree.view.selection.clearSelection();

    if (aItemArray && aItemArray.length == 1) {
      // If only one item is selected, scroll to it
      let rowToScrollTo = this.getItemRow(aItemArray[0]);
      if (rowToScrollTo > -1) {
        this.tree.ensureRowIsVisible(rowToScrollTo);
        this.tree.view.selection.select(rowToScrollTo);
      }
    } else if (aItemArray && aItemArray.length > 1) {
      // If there is more than one item, just select them all.
      for (let item of aItemArray) {
        let row = this.getItemRow(item);
        this.tree.view.selection.rangedSelect(row, row, true);
      }
    }

    // This needs to be in a setTimeout
    setTimeout(() => unifinderTreeView.resetAllowSelection(), 1);
  },

  /**
   * Due to a selection issue described in bug 168211 this method is needed to
   * re-add the selection listeners selection listeners.
   */
  resetAllowSelection() {
    if (!this.tree) {
      return;
    }
    /**
     * Do not change anything in the following lines, they are needed as
     * described in the selection observer above
     */
    this.doingSelection = false;

    this.tree.view.selection.selectEventsSuppressed = false;
    this.treeElement.addEventListener("select", unifinderSelect, true);
  },

  /**
   * Tree View Implementation
   *
   * @see nsITreeView
   */
  get rowCount() {
    return this.eventArray.length;
  },

  // TODO this code is currently identical to the task tree. We should create
  // an itemTreeView that these tree views can inherit, that contains this
  // code, and possibly other code related to sorting and storing items. See
  // bug 432582 for more details.
  getCellProperties(aRow, aCol) {
    let rowProps = this.getRowProperties(aRow);
    let colProps = this.getColumnProperties(aCol);
    return rowProps + (rowProps && colProps ? " " : "") + colProps;
  },
  getRowProperties(aRow) {
    let properties = [];
    let item = this.eventArray[aRow];
    if (item.priority > 0 && item.priority < 5) {
      properties.push("highpriority");
    } else if (item.priority > 5 && item.priority < 10) {
      properties.push("lowpriority");
    }

    // Add calendar name atom
    properties.push("calendar-" + cal.view.formatStringForCSSRule(item.calendar.name));

    // Add item status atom
    if (item.status) {
      properties.push("status-" + item.status.toLowerCase());
    }

    // Alarm status atom
    if (item.getAlarms().length) {
      properties.push("alarm");
    }

    // Task categories
    properties = properties.concat(item.getCategories().map(cal.view.formatStringForCSSRule));

    return properties.join(" ");
  },
  getColumnProperties(aCol) {
    return "";
  },

  isContainer() {
    return false;
  },

  isContainerOpen(aRow) {
    return false;
  },

  isContainerEmpty(aRow) {
    return false;
  },

  isSeparator(aRow) {
    return false;
  },

  isSorted(aRow) {
    return false;
  },

  canDrop(aRow, aOrientation) {
    return false;
  },

  drop(aRow, aOrientation) {},

  getParentIndex(aRow) {
    return -1;
  },

  hasNextSibling(aRow, aAfterIndex) {},

  getLevel(aRow) {
    return 0;
  },

  getImageSrc(aRow, aOrientation) {},

  getCellValue(aRow, aCol) {
    return null;
  },

  getCellText(row, column) {
    let calendarEvent = this.eventArray[row];

    switch (column.element.getAttribute("itemproperty")) {
      case "title": {
        return calendarEvent.title ? calendarEvent.title.replace(/\n/g, " ") : "";
      }
      case "startDate": {
        return formatUnifinderEventDateTime(calendarEvent.startDate);
      }
      case "endDate": {
        let eventEndDate = calendarEvent.endDate.clone();
        // XXX reimplement
        // let eventEndDate = getCurrentNextOrPreviousRecurrence(calendarEvent);
        if (calendarEvent.startDate.isDate) {
          // display enddate is ical enddate - 1
          eventEndDate.day = eventEndDate.day - 1;
        }
        return formatUnifinderEventDateTime(eventEndDate);
      }
      case "categories": {
        return calendarEvent.getCategories().join(", ");
      }
      case "location": {
        return calendarEvent.getProperty("LOCATION");
      }
      case "status": {
        return getEventStatusString(calendarEvent);
      }
      case "calendar": {
        return calendarEvent.calendar.name;
      }
      default: {
        return false;
      }
    }
  },

  setTree(tree) {
    this.tree = tree;
  },

  toggleOpenState(aRow) {},

  cycleHeader(col) {
    if (!this.selectedColumn) {
      this.sortDirection = "ascending";
    } else if (!this.sortDirection || this.sortDirection == "descending") {
      this.sortDirection = "ascending";
    } else {
      this.sortDirection = "descending";
    }
    this.selectedColumn = col.element;
    this.sortItems();
  },

  isEditable(aRow, aCol) {
    return false;
  },

  setCellValue(aRow, aCol, aValue) {},
  setCellText(aRow, aCol, aValue) {},

  outParameter: {}, // used to obtain dates during sort
};

/**
 * Refresh the unifinder tree by getting items from the composite calendar and
 * applying the current filter.
 */
function refreshEventTree() {
  if (!unifinderTreeView.ready) {
    return;
  }

  let field = document.getElementById("unifinder-search-field");
  if (field) {
    unifinderTreeView.mFilter.filterText = field.value;
  }

  addItemsFromCalendar(
    cal.view.getCompositeCalendar(window),
    addItemsFromCompositeCalendarInternal
  );

  gUnifinderNeedsRefresh = false;
}

/**
 * EXTENSION_POINTS
 * Filters the passed event array according to the currently applied filter.
 * Afterwards, applies the items to the unifinder view.
 *
 * If you are implementing a new filter, you can overwrite this function and
 * filter the items accordingly and afterwards call this function with the
 * result.
 *
 * @param eventArray        The array of items to be set in the unifinder.
 */
function addItemsFromCompositeCalendarInternal(eventArray) {
  let newItems = eventArray.filter(
    unifinderTreeView.mFilter.isItemInFilters,
    unifinderTreeView.mFilter
  );
  unifinderTreeView.setItems(newItems);

  // Select selected events in the tree. Not passing the argument gets the
  // items from the view.
  unifinderTreeView.setSelectedItems();
}

function addItemsFromSingleCalendarInternal(eventArray) {
  let newItems = eventArray.filter(
    unifinderTreeView.mFilter.isItemInFilters,
    unifinderTreeView.mFilter
  );
  unifinderTreeView.setItems(unifinderTreeView.eventArray.concat(newItems));

  // Select selected events in the tree. Not passing the argument gets the
  // items from the view.
  unifinderTreeView.setSelectedItems();
}

async function addItemsFromCalendar(aCalendar, aAddItemsInternalFunc) {
  if (isUnifinderHidden()) {
    // If the unifinder is hidden, don't refresh the events to reduce needed
    // getItems calls.
    return;
  }

  let filter = 0;

  filter |= aCalendar.ITEM_FILTER_TYPE_EVENT;

  // Not all xul might be there yet...
  if (!document.getElementById("unifinder-search-field")) {
    return;
  }
  unifinderTreeView.mFilter.applyFilter(getCurrentUnifinderFilter());

  if (unifinderTreeView.mFilter.startDate && unifinderTreeView.mFilter.endDate) {
    filter |= aCalendar.ITEM_FILTER_CLASS_OCCURRENCES;
  }

  let items = await aCalendar.getItemsAsArray(
    filter,
    0,
    unifinderTreeView.mFilter.startDate,
    unifinderTreeView.mFilter.endDate
  );

  let refreshTreeInternalFunc = function () {
    aAddItemsInternalFunc(items);
  };
  setTimeout(refreshTreeInternalFunc, 0);
}

function removeItemsFromCalendar(aCalendar) {
  let filter = unifinderTreeView.mFilter;
  let items = unifinderTreeView.eventArray.filter(item => item.calendar.id == aCalendar.id);

  unifinderTreeView.removeItems(items.filter(filter.isItemInFilters, filter));
}

/**
 * Focuses the unifinder search field
 */
function focusSearch() {
  document.getElementById("unifinder-search-field").focus();
}

/**
 * The unifinder is hidden if the calendar tab is not selected. When the tab
 * is selected, this function is called so that unifinder setup completes.
 */
function ensureUnifinderLoaded() {
  if (!isUnifinderHidden() && gUnifinderNeedsRefresh) {
    refreshEventTree();
  }
}

/**
 * Toggles the hidden state of the unifinder.
 */
function toggleUnifinder() {
  // Toggle the elements
  goToggleToolbar("bottom-events-box", "calendar_show_unifinder_command");
  goToggleToolbar("calendar-view-splitter");
  window.dispatchEvent(new CustomEvent("viewresize"));

  unifinderTreeView.treeElement.view = unifinderTreeView;

  // When the unifinder is hidden, refreshEventTree is not called. Make sure
  // the event tree is refreshed now.
  if (!isUnifinderHidden() && gUnifinderNeedsRefresh) {
    refreshEventTree();
  }

  // Make sure the selection is correct
  if (unifinderTreeView.doingSelection) {
    unifinderTreeView.resetAllowSelection();
  }
  unifinderTreeView.setSelectedItems();
}
