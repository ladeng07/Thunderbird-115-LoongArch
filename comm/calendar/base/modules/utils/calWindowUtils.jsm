/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Calendar window helpers, e.g. to open our dialogs
 */

// NOTE: This module should not be loaded directly, it is available when
// including calUtils.jsm under the cal.window namespace.

const EXPORTED_SYMBOLS = ["calwindow"];

const { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");

const lazy = {};
XPCOMUtils.defineLazyGetter(
  lazy,
  "l10nDeletePrompt",
  () => new Localization(["calendar/calendar-delete-prompt.ftl"], true)
);

var calwindow = {
  /**
   * Opens the Create Calendar wizard
   *
   * @param aWindow    the window to open the dialog on, or null for the main calendar window
   * @param aCallback  a function to be performed after calendar creation
   */
  openCalendarWizard(aWindow, aCallback) {
    let window = aWindow || calwindow.getCalendarWindow();
    window.openDialog(
      "chrome://calendar/content/calendar-creation.xhtml",
      "caEditServer",
      "chrome,titlebar,resizable,centerscreen",
      aCallback
    );
  },

  /**
   * @typedef {object} OpenCalendarPropertiesArgs
   * @property {calICalendar} calendar - The calendar whose properties should be displayed.
   * @property {boolean} [canDisable=true] - Whether the user can disable the calendar.
   */

  /**
   * Opens the calendar properties window for aCalendar.
   *
   * @param {ChromeWindow | null} aWindow   The window to open the dialog on,
   *                                          or null for the main calendar window.
   * @param {OpenCalendarPropertiesArgs} args - Passed directly to the window.
   */
  openCalendarProperties(aWindow, args) {
    let window = aWindow || calwindow.getCalendarWindow();
    window.openDialog(
      "chrome://calendar/content/calendar-properties-dialog.xhtml",
      "CalendarPropertiesDialog",
      "chrome,titlebar,resizable,centerscreen",
      { canDisable: true, ...args }
    );
  },

  /**
   * Returns the most recent calendar window in an application independent way
   */
  getCalendarWindow() {
    return (
      Services.wm.getMostRecentWindow("calendarMainWindow") ||
      Services.wm.getMostRecentWindow("mail:3pane")
    );
  },

  /**
   * Brings up a dialog prompting the user about the deletion of the passed
   * item(s).
   *
   * @param {calIItemBase|calItemBase[]} items - One or more items that will be deleted.
   * @param {boolean} byPassPref - If true the pref for this prompt will be ignored.
   *
   * @returns {boolean} True if the user confirms deletion, false if otherwise.
   */
  promptDeleteItems(items, byPassPref) {
    items = Array.isArray(items) ? items : [items];
    let pref = Services.prefs.getBoolPref("calendar.item.promptDelete", true);

    // Recurring events will be handled by the recurring event prompt.
    if ((!pref && !byPassPref) || items.some(item => item.parentItem != item)) {
      return true;
    }

    let deletingEvents;
    let deletingTodos;
    for (let item of items) {
      if (!deletingEvents) {
        deletingEvents = item.isEvent();
      }
      if (!deletingTodos) {
        deletingTodos = item.isTodo();
      }
    }

    let title;
    let message;
    let disableMessage;
    if (deletingEvents && !deletingTodos) {
      [title, message, disableMessage] = lazy.l10nDeletePrompt.formatValuesSync([
        { id: "calendar-delete-event-prompt-title", args: { count: items.length } },
        { id: "calendar-delete-event-prompt-message", args: { count: items.length } },
        "calendar-delete-prompt-disable-message",
      ]);
    } else if (!deletingEvents && deletingTodos) {
      [title, message, disableMessage] = lazy.l10nDeletePrompt.formatValuesSync([
        { id: "calendar-delete-task-prompt-title", args: { count: items.length } },
        { id: "calendar-delete-task-prompt-message", args: { count: items.length } },
        "calendar-delete-prompt-disable-message",
      ]);
    } else {
      [title, message, disableMessage] = lazy.l10nDeletePrompt.formatValuesSync([
        { id: "calendar-delete-items-prompt-title", args: { count: items.length } },
        { id: "calendar-delete-items-prompt-message", args: { count: items.length } },
        "calendar-delete-prompt-disable-message",
      ]);
    }

    if (byPassPref) {
      return Services.prompt.confirm(null, title, message);
    }

    let checkResult = { value: false };
    let result = Services.prompt.confirmEx(
      null,
      title,
      message,
      Services.prompt.STD_YES_NO_BUTTONS + Services.prompt.BUTTON_DELAY_ENABLE,
      null,
      null,
      null,
      disableMessage,
      checkResult
    );

    if (checkResult.value) {
      Services.prefs.setBoolPref("calendar.item.promptDelete", false);
    }
    return result != 1;
  },
};
