/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* exported onLoad, onReminderSelected, updateReminder, onNewReminder, onRemoveReminder */

/* global MozElements */

/* import-globals-from ../calendar-ui-utils.js */

var { PluralForm } = ChromeUtils.importESModule("resource://gre/modules/PluralForm.sys.mjs");
var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
var { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");

XPCOMUtils.defineLazyModuleGetters(this, {
  CalAlarm: "resource:///modules/CalAlarm.jsm",
});

var allowedActionsMap = {};
var suppressListUpdate = false;

XPCOMUtils.defineLazyGetter(this, "gReminderNotification", () => {
  return new MozElements.NotificationBox(element => {
    document.getElementById("reminder-notifications").append(element);
  });
});

/**
 * Sets up the reminder dialog.
 */
function onLoad() {
  let calendar = window.arguments[0].calendar;

  // Make sure the origin menulist uses the right labels, depending on if the
  // dialog is showing an event or task.
  function _sn(x) {
    return cal.l10n.getString("calendar-alarms", getItemBundleStringName(x));
  }

  document.getElementById("reminder-before-start-menuitem").label = _sn(
    "reminderCustomOriginBeginBefore"
  );

  document.getElementById("reminder-after-start-menuitem").label = _sn(
    "reminderCustomOriginBeginAfter"
  );

  document.getElementById("reminder-before-end-menuitem").label = _sn(
    "reminderCustomOriginEndBefore"
  );

  document.getElementById("reminder-after-end-menuitem").label = _sn(
    "reminderCustomOriginEndAfter"
  );

  // Set up the action map
  let supportedActions = calendar.getProperty("capabilities.alarms.actionValues") || ["DISPLAY"]; // TODO email support, "EMAIL"
  for (let action of supportedActions) {
    allowedActionsMap[action] = true;
  }

  // Hide all actions that are not supported by this provider
  let firstAvailableItem;
  let actionNodes = document.getElementById("reminder-actions-menupopup").children;
  for (let actionNode of actionNodes) {
    let shouldHide =
      !(actionNode.value in allowedActionsMap) ||
      (actionNode.hasAttribute("provider") && actionNode.getAttribute("provider") != calendar.type);
    actionNode.hidden = shouldHide;
    if (!firstAvailableItem && !shouldHide) {
      firstAvailableItem = actionNode;
    }
  }

  // Correct the selected item on the supported actions list. This will be
  // changed when reminders are loaded, but in case there are none we need to
  // provide a sensible default.
  if (firstAvailableItem) {
    document.getElementById("reminder-actions-menulist").selectedItem = firstAvailableItem;
  }

  loadReminders();
  opener.setCursor("auto");
}

/**
 * Load Reminders from the window's arguments and set up dialog controls to
 * their initial values.
 */
function loadReminders() {
  let args = window.arguments[0];
  let listbox = document.getElementById("reminder-listbox");
  let reminders = args.reminders || args.item.getAlarms();

  // This dialog should not be shown if the calendar doesn't support alarms at
  // all, so the case of maxCount = 0 breaking this logic doesn't apply.
  let maxReminders = args.calendar.getProperty("capabilities.alarms.maxCount");
  let count = Math.min(reminders.length, maxReminders || reminders.length);
  for (let i = 0; i < count; i++) {
    if (reminders[i].action in allowedActionsMap) {
      // Set up the listitem and add it to the listbox, but only if the
      // action is actually supported by the calendar.
      let listitem = setupListItem(null, reminders[i].clone(), args.item);
      if (listitem) {
        listbox.appendChild(listitem);
      }
    }
  }

  // Set up a default absolute date. This will be overridden if the selected
  // alarm is absolute.
  let absDate = document.getElementById("reminder-absolute-date");
  absDate.value = cal.dtz.dateTimeToJsDate(cal.dtz.getDefaultStartDate());

  if (listbox.children.length) {
    // We have reminders, select the first by default. For some reason,
    // setting the selected index in a load handler makes the selection
    // break for the set item, therefore we need a setTimeout.
    setupMaxReminders();
    setTimeout(() => {
      listbox.selectedIndex = 0;
    }, 0);
  } else {
    // Make sure the fields are disabled if we have no alarms
    setupRadioEnabledState(true);
  }
}

/**
 * Sets up the enabled state of the reminder details controls. Used when
 * switching between absolute and relative alarms to disable and enable the
 * needed controls.
 *
 * @param aDisableAll       Disable all relation controls. Used when no alarms
 *                            are added yet.
 */
function setupRadioEnabledState(aDisableAll) {
  let relationItem = document.getElementById("reminder-relation-radiogroup").selectedItem;
  let relativeDisabled, absoluteDisabled;

  if (aDisableAll) {
    relativeDisabled = true;
    absoluteDisabled = true;
  } else if (relationItem) {
    // This is not a mistake, when this function is called from onselect,
    // the value has not been set.
    relativeDisabled = relationItem.value == "absolute";
    absoluteDisabled = relationItem.value == "relative";
  } else {
    relativeDisabled = false;
    absoluteDisabled = false;
  }

  document.getElementById("reminder-length").disabled = relativeDisabled;
  document.getElementById("reminder-unit").disabled = relativeDisabled;
  document.getElementById("reminder-relation-origin").disabled = relativeDisabled;

  document.getElementById("reminder-absolute-date").setAttribute("disabled", !!absoluteDisabled);

  document.getElementById("reminder-relative-radio").disabled = aDisableAll;
  document.getElementById("reminder-absolute-radio").disabled = aDisableAll;
  document.getElementById("reminder-actions-menulist").disabled = aDisableAll;
}

/**
 * Sets up the max reminders notification. Shows or hides the notification
 * depending on if the max reminders limit has been hit or not.
 */
function setupMaxReminders() {
  let args = window.arguments[0];
  let listbox = document.getElementById("reminder-listbox");
  let maxReminders = args.calendar.getProperty("capabilities.alarms.maxCount");

  let hitMaxReminders = maxReminders && listbox.children.length >= maxReminders;

  // If we hit the maximum number of reminders, show the error box and
  // disable the new button.
  document.getElementById("reminder-new-button").disabled = hitMaxReminders;

  let localeErrorString = cal.l10n.getString(
    "calendar-alarms",
    getItemBundleStringName("reminderErrorMaxCountReached"),
    [maxReminders]
  );
  let pluralErrorLabel = PluralForm.get(maxReminders, localeErrorString).replace(
    "#1",
    maxReminders
  );

  if (hitMaxReminders) {
    let notification = gReminderNotification.appendNotification(
      "reminderNotification",
      {
        label: pluralErrorLabel,
        priority: gReminderNotification.PRIORITY_WARNING_MEDIUM,
      },
      null
    );
    notification.closeButton.hidden = true;
  } else {
    gReminderNotification.removeAllNotifications();
  }
}

/**
 * Sets up a reminder listitem for the list of reminders applied to this item.
 *
 * @param aListItem     (optional) A reference listitem to set up. If not
 *                                   passed, a new listitem will be created.
 * @param aReminder     The calIAlarm to display in this listitem
 * @param aItem         The item the alarm is set up on.
 * @returns The  XUL listitem node showing the passed reminder, or
 *   null if no list item should be shown.
 */
function setupListItem(aListItem, aReminder, aItem) {
  let src;
  let l10nId;
  switch (aReminder.action) {
    case "DISPLAY":
      src = "chrome://messenger/skin/icons/new/bell.svg";
      l10nId = "calendar-event-reminder-icon-display";
      break;
    case "EMAIL":
      src = "chrome://messenger/skin/icons/new/mail-sm.svg";
      l10nId = "calendar-event-reminder-icon-email";
      break;
    case "AUDIO":
      src = "chrome://messenger/skin/icons/new/bell-ring.svg";
      l10nId = "calendar-event-reminder-icon-audio";
      break;
    default:
      return null;
  }

  let listitem = aListItem || document.createXULElement("richlistitem");

  // Create a random id to be used for accessibility
  let reminderId = cal.getUUID();
  let ariaLabel = "reminder-action-" + aReminder.action + " " + reminderId;

  listitem.reminder = aReminder;
  listitem.setAttribute("id", reminderId);
  listitem.setAttribute("align", "center");
  listitem.setAttribute("aria-labelledby", ariaLabel);
  listitem.setAttribute("value", aReminder.action);

  let image = listitem.querySelector("img");
  if (!image) {
    image = document.createElement("img");
    image.setAttribute("class", "reminder-icon");
    listitem.appendChild(image);
  }
  image.setAttribute("src", src);
  // Sets alt.
  document.l10n.setAttributes(image, l10nId);
  image.setAttribute("value", aReminder.action);

  let label = listitem.querySelector("label");
  if (!label) {
    label = document.createXULElement("label");
    listitem.appendChild(label);
  }
  label.setAttribute("value", aReminder.toString(aItem));

  return listitem;
}

/**
 * Handler function to be called when a reminder is selected in the listbox.
 * Sets up remaining controls to show the selected alarm.
 */
function onReminderSelected() {
  let length = document.getElementById("reminder-length");
  let unit = document.getElementById("reminder-unit");
  let relationOrigin = document.getElementById("reminder-relation-origin");
  let absDate = document.getElementById("reminder-absolute-date");
  let actionType = document.getElementById("reminder-actions-menulist");
  let relationType = document.getElementById("reminder-relation-radiogroup");

  let listbox = document.getElementById("reminder-listbox");
  let listitem = listbox.selectedItem;

  if (listitem) {
    try {
      suppressListUpdate = true;
      let reminder = listitem.reminder;

      // Action
      actionType.value = reminder.action;

      // Absolute/relative things
      if (reminder.related == Ci.calIAlarm.ALARM_RELATED_ABSOLUTE) {
        relationType.value = "absolute";

        // Date
        absDate.value = cal.dtz.dateTimeToJsDate(
          reminder.alarmDate || cal.dtz.getDefaultStartDate()
        );
      } else {
        relationType.value = "relative";

        // Unit and length
        let alarmlen = Math.abs(reminder.offset.inSeconds / 60);
        if (alarmlen % 1440 == 0) {
          unit.value = "days";
          length.value = alarmlen / 1440;
        } else if (alarmlen % 60 == 0) {
          unit.value = "hours";
          length.value = alarmlen / 60;
        } else {
          unit.value = "minutes";
          length.value = alarmlen;
        }

        // Relation
        let relation = reminder.offset.isNegative ? "before" : "after";

        // Origin
        let origin;
        if (reminder.related == Ci.calIAlarm.ALARM_RELATED_START) {
          origin = "START";
        } else if (reminder.related == Ci.calIAlarm.ALARM_RELATED_END) {
          origin = "END";
        }

        relationOrigin.value = [relation, origin].join("-");
      }
    } finally {
      suppressListUpdate = false;
    }
  } else {
    // no list item is selected, disable elements
    setupRadioEnabledState(true);
  }
}

/**
 * Handler function to be called when an aspect of the alarm has been changed
 * using the dialog controls.
 *
 * @param event         The DOM event caused by the change.
 */
function updateReminder(event) {
  if (
    suppressListUpdate ||
    event.target.localName == "richlistitem" ||
    event.target.parentNode.localName == "richlistitem" ||
    event.target.id == "reminder-remove-button" ||
    !document.commandDispatcher.focusedElement
  ) {
    // Do not set things if the select came from selecting or removing an
    // alarm from the list, or from setting when the dialog initially loaded.
    // XXX Quite fragile hack since radio/radiogroup doesn't have the
    // supressOnSelect stuff.
    return;
  }
  let listbox = document.getElementById("reminder-listbox");
  let relationItem = document.getElementById("reminder-relation-radiogroup").selectedItem;
  let listitem = listbox.selectedItem;
  if (!listitem || !relationItem) {
    return;
  }
  let reminder = listitem.reminder;
  let length = document.getElementById("reminder-length");
  let unit = document.getElementById("reminder-unit");
  let relationOrigin = document.getElementById("reminder-relation-origin");
  let [relation, origin] = relationOrigin.value.split("-");
  let absDate = document.getElementById("reminder-absolute-date");
  let action = document.getElementById("reminder-actions-menulist").selectedItem.value;

  // Action
  reminder.action = action;

  if (relationItem.value == "relative") {
    if (origin == "START") {
      reminder.related = Ci.calIAlarm.ALARM_RELATED_START;
    } else if (origin == "END") {
      reminder.related = Ci.calIAlarm.ALARM_RELATED_END;
    }

    // Set up offset, taking units and before/after into account
    let offset = cal.createDuration();
    offset[unit.value] = length.value;
    offset.normalize();
    offset.isNegative = relation == "before";
    reminder.offset = offset;
  } else if (relationItem.value == "absolute") {
    reminder.related = Ci.calIAlarm.ALARM_RELATED_ABSOLUTE;

    if (absDate.value) {
      reminder.alarmDate = cal.dtz.jsDateToDateTime(absDate.value, window.arguments[0].timezone);
    } else {
      reminder.alarmDate = null;
    }
  }

  if (!setupListItem(listitem, reminder, window.arguments[0].item)) {
    // Unexpected since this would mean switching to an unsupported type.
    listitem.remove();
  }
}

/**
 * Gets the locale stringname that is dependent on the item type. This function
 * appends the item type, i.e |aPrefix + "Event"|.
 *
 * @param aPrefix       The prefix to prepend to the item type
 * @returns The full string name.
 */
function getItemBundleStringName(aPrefix) {
  if (window.arguments[0].item.isEvent()) {
    return aPrefix + "Event";
  }
  return aPrefix + "Task";
}

/**
 * Handler function to be called when the "new" button is pressed, to create a
 * new reminder item.
 */
function onNewReminder() {
  let itemType = window.arguments[0].item.isEvent() ? "event" : "todo";
  let listbox = document.getElementById("reminder-listbox");

  let reminder = new CalAlarm();
  let alarmlen = Services.prefs.getIntPref("calendar.alarms." + itemType + "alarmlen", 15);
  let alarmunit = Services.prefs.getStringPref(
    "calendar.alarms." + itemType + "alarmunit",
    "minutes"
  );

  // Default is a relative DISPLAY alarm, |alarmlen| minutes before the event.
  // If DISPLAY is not supported by the provider, then pick the provider's
  // first alarm type.
  let offset = cal.createDuration();
  if (alarmunit == "days") {
    offset.days = alarmlen;
  } else if (alarmunit == "hours") {
    offset.hours = alarmlen;
  } else {
    offset.minutes = alarmlen;
  }
  offset.normalize();
  offset.isNegative = true;
  reminder.related = Ci.calIAlarm.ALARM_RELATED_START;
  reminder.offset = offset;
  if ("DISPLAY" in allowedActionsMap) {
    reminder.action = "DISPLAY";
  } else {
    let calendar = window.arguments[0].calendar;
    let actions = calendar.getProperty("capabilities.alarms.actionValues") || [];
    reminder.action = actions[0];
  }

  // Set up the listbox
  let listitem = setupListItem(null, reminder, window.arguments[0].item);
  if (!listitem) {
    return;
  }
  listbox.appendChild(listitem);
  listbox.selectItem(listitem);

  // Since we've added an item, its safe to always enable the button
  document.getElementById("reminder-remove-button").removeAttribute("disabled");

  // Set up the enabled state and max reminders
  setupRadioEnabledState();
  setupMaxReminders();
}

/**
 * Handler function to be called when the "remove" button is pressed to remove
 * the selected reminder item and advance the selection.
 */
function onRemoveReminder() {
  let listbox = document.getElementById("reminder-listbox");
  let listitem = listbox.selectedItem;
  let newSelection = listitem
    ? listitem.nextElementSibling || listitem.previousElementSibling
    : null;

  listbox.clearSelection();
  listitem.remove();
  listbox.selectItem(newSelection);

  document.getElementById("reminder-remove-button").disabled = listbox.children.length < 1;
  setupMaxReminders();
}

/**
 * Handler function to be called when the accept button is pressed.
 */
document.addEventListener("dialogaccept", () => {
  let listbox = document.getElementById("reminder-listbox");
  let reminders = Array.from(listbox.children).map(node => node.reminder);
  if (window.arguments[0].onOk) {
    window.arguments[0].onOk(reminders);
  }
});

/**
 * Handler function to be called when the cancel button is pressed.
 */
document.addEventListener("dialogcancel", () => {
  if (window.arguments[0].onCancel) {
    window.arguments[0].onCancel();
  }
});
