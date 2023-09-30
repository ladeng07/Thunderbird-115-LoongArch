/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["CalAlarmService"];

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
var { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");

const lazy = {};
ChromeUtils.defineModuleGetter(lazy, "CalDateTime", "resource:///modules/CalDateTime.jsm");

var kHoursBetweenUpdates = 6;

function nowUTC() {
  return cal.dtz.jsDateToDateTime(new Date()).getInTimezone(cal.dtz.UTC);
}

function newTimerWithCallback(aCallback, aDelay, aRepeating) {
  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

  timer.initWithCallback(
    aCallback,
    aDelay,
    aRepeating ? timer.TYPE_REPEATING_PRECISE : timer.TYPE_ONE_SHOT
  );
  return timer;
}

/**
 * Keeps track of seemingly immutable items with alarms that we can't dismiss.
 * Some servers quietly discard our modifications to repeating events which will
 * cause dismissed alarms to re-appear if we do not keep track.
 *
 * We track the items by their "hashId" property storing it in the calendar
 * property "alarms.ignored".
 */
const IgnoredAlarmsStore = {
  /**
   * @type {number}
   */
  maxItemsPerCalendar: 1500,

  _getCache(item) {
    return item.calendar.getProperty("alarms.ignored")?.split(",") || [];
  },

  /**
   * Adds an item to the store. No alarms will be created for this item again.
   *
   * @param {calIItemBase} item
   */
  add(item) {
    let cache = this._getCache(item);
    let id = item.parentItem.hashId;
    if (!cache.includes(id)) {
      if (cache.length >= this.maxItemsPerCalendar) {
        cache[0] = id;
      } else {
        cache.push(id);
      }
    }
    item.calendar.setProperty("alarms.ignored", cache.join(","));
  },

  /**
   * Returns true if the item's hashId is in the store.
   *
   * @param {calIItemBase} item
   * @returns {boolean}
   */
  has(item) {
    return this._getCache(item).includes(item.parentItem.hashId);
  },
};

function CalAlarmService() {
  this.wrappedJSObject = this;

  this.mLoadedCalendars = {};
  this.mTimerMap = {};
  this.mNotificationTimerMap = {};
  this.mObservers = new cal.data.ListenerSet(Ci.calIAlarmServiceObserver);

  XPCOMUtils.defineLazyPreferenceGetter(
    this,
    "gNotificationsTimes",
    "calendar.notifications.times",
    "",
    () => this.initAlarms(cal.manager.getCalendars())
  );

  this.calendarObserver = {
    QueryInterface: ChromeUtils.generateQI(["calIObserver"]),
    alarmService: this,

    calendarsInBatch: new Set(),

    // calIObserver:
    onStartBatch(calendar) {
      this.calendarsInBatch.add(calendar);
    },
    onEndBatch(calendar) {
      this.calendarsInBatch.delete(calendar);
    },
    onLoad(calendar) {
      // ignore any onLoad events until initial getItems() call of startup has finished:
      if (calendar && this.alarmService.mLoadedCalendars[calendar.id]) {
        // a refreshed calendar signals that it has been reloaded
        // (and cannot notify detailed changes), thus reget all alarms of it:
        this.alarmService.initAlarms([calendar]);
      }
    },

    onAddItem(aItem) {
      // If we're in a batch, ignore this notification. We're going to reload anyway.
      if (!this.calendarsInBatch.has(aItem.calendar)) {
        this.alarmService.addAlarmsForOccurrences(aItem);
      }
    },
    onModifyItem(aNewItem, aOldItem) {
      // If we're in a batch, ignore this notification. We're going to reload anyway.
      if (this.calendarsInBatch.has(aNewItem.calendar)) {
        return;
      }

      if (!aNewItem.recurrenceId) {
        // deleting an occurrence currently calls modifyItem(newParent, *oldOccurrence*)
        aOldItem = aOldItem.parentItem;
      }

      this.onDeleteItem(aOldItem);
      this.onAddItem(aNewItem);
    },
    onDeleteItem(aDeletedItem) {
      this.alarmService.removeAlarmsForOccurrences(aDeletedItem);
    },
    onError(aCalendar, aErrNo, aMessage) {},
    onPropertyChanged(aCalendar, aName, aValue, aOldValue) {
      switch (aName) {
        case "suppressAlarms":
        case "disabled":
        case "notifications.times":
          this.alarmService.initAlarms([aCalendar]);
          break;
      }
    },
    onPropertyDeleting(aCalendar, aName) {
      this.onPropertyChanged(aCalendar, aName);
    },
  };

  this.calendarManagerObserver = {
    QueryInterface: ChromeUtils.generateQI(["calICalendarManagerObserver"]),
    alarmService: this,

    onCalendarRegistered(aCalendar) {
      this.alarmService.observeCalendar(aCalendar);
      // initial refresh of alarms for new calendar:
      this.alarmService.initAlarms([aCalendar]);
    },
    onCalendarUnregistering(aCalendar) {
      // XXX todo: we need to think about calendar unregistration;
      // there may still be dangling items (-> alarm dialog),
      // dismissing those alarms may write data...
      this.alarmService.unobserveCalendar(aCalendar);
      delete this.alarmService.mLoadedCalendars[aCalendar.id];
    },
    onCalendarDeleting(aCalendar) {
      this.alarmService.unobserveCalendar(aCalendar);
      delete this.alarmService.mLoadedCalendars[aCalendar.id];
    },
  };
}

var calAlarmServiceClassID = Components.ID("{7a9200dd-6a64-4fff-a798-c5802186e2cc}");
var calAlarmServiceInterfaces = [Ci.calIAlarmService, Ci.nsIObserver];
CalAlarmService.prototype = {
  mRangeStart: null,
  mRangeEnd: null,
  mUpdateTimer: null,
  mStarted: false,
  mTimerMap: null,
  mObservers: null,
  mTimezone: null,

  classID: calAlarmServiceClassID,
  QueryInterface: cal.generateQI(["calIAlarmService", "nsIObserver"]),
  classInfo: cal.generateCI({
    classID: calAlarmServiceClassID,
    contractID: "@mozilla.org/calendar/alarm-service;1",
    classDescription: "Calendar Alarm Service",
    interfaces: calAlarmServiceInterfaces,
    flags: Ci.nsIClassInfo.SINGLETON,
  }),

  _logger: console.createInstance({
    prefix: "calendar.alarms",
    maxLogLevel: "Warn",
    maxLogLevelPref: "calendar.alarms.loglevel",
  }),

  /**
   * nsIObserver
   */
  observe(aSubject, aTopic, aData) {
    // This will also be called on app-startup, but nothing is done yet, to
    // prevent unwanted dialogs etc. See bug 325476 and 413296
    if (aTopic == "profile-after-change" || aTopic == "wake_notification") {
      this.shutdown();
      this.startup();
    }
    if (aTopic == "xpcom-shutdown") {
      this.shutdown();
    }
  },

  /**
   * calIAlarmService APIs
   */
  get timezone() {
    // TODO Do we really need this? Do we ever set the timezone to something
    // different than the default timezone?
    return this.mTimezone || cal.dtz.defaultTimezone;
  },

  set timezone(aTimezone) {
    this.mTimezone = aTimezone;
  },

  async snoozeAlarm(aItem, aAlarm, aDuration) {
    // Right now we only support snoozing all alarms for the given item for
    // aDuration.

    // Make sure we're working with the parent, otherwise we'll accidentally
    // create an exception
    let newEvent = aItem.parentItem.clone();
    let alarmTime = nowUTC();

    // Set the last acknowledged time to now.
    newEvent.alarmLastAck = alarmTime;

    alarmTime = alarmTime.clone();
    alarmTime.addDuration(aDuration);

    let propName = "X-MOZ-SNOOZE-TIME";
    if (aItem.parentItem != aItem) {
      // This is the *really* hard case where we've snoozed a single
      // instance of a recurring event.  We need to not only know that
      // there was a snooze, but also which occurrence was snoozed.  Part
      // of me just wants to create a local db of snoozes here...
      propName = "X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime;
    }
    newEvent.setProperty(propName, alarmTime.icalString);

    // calling modifyItem will cause us to get the right callback
    // and update the alarm properly
    let modifiedItem = await newEvent.calendar.modifyItem(newEvent, aItem.parentItem);

    if (modifiedItem.getProperty(propName) == alarmTime.icalString) {
      return;
    }

    // The server did not persist our changes for some reason.
    // Include the item in the ignored list so we skip displaying alarms for
    // this item in the future.
    IgnoredAlarmsStore.add(aItem);
  },

  async dismissAlarm(aItem, aAlarm) {
    if (cal.acl.isCalendarWritable(aItem.calendar) && cal.acl.userCanModifyItem(aItem)) {
      let now = nowUTC();
      // We want the parent item, otherwise we're going to accidentally
      // create an exception.  We've relnoted (for 0.1) the slightly odd
      // behavior this can cause if you move an event after dismissing an
      // alarm
      let oldParent = aItem.parentItem;
      let newParent = oldParent.clone();
      newParent.alarmLastAck = now;
      // Make sure to clear out any snoozes that were here.
      if (aItem.recurrenceId) {
        newParent.deleteProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime);
      } else {
        newParent.deleteProperty("X-MOZ-SNOOZE-TIME");
      }

      let modifiedItem = await newParent.calendar.modifyItem(newParent, oldParent);
      if (modifiedItem.alarmLastAck && now.compare(modifiedItem.alarmLastAck) == 0) {
        return;
      }

      // The server did not persist our changes for some reason.
      // Include the item in the ignored list so we skip displaying alarms for
      // this item in the future.
      IgnoredAlarmsStore.add(aItem);
    }
    // if the calendar of the item is r/o, we simple remove the alarm
    // from the list without modifying the item, so this works like
    // effectively dismissing from a user's pov, since the alarm neither
    // popups again in the current user session nor will be added after
    // next restart, since it is missed then already
    this.removeAlarmsForItem(aItem);
  },

  addObserver(aObserver) {
    this.mObservers.add(aObserver);
  },

  removeObserver(aObserver) {
    this.mObservers.delete(aObserver);
  },

  startup() {
    if (this.mStarted) {
      return;
    }

    Services.obs.addObserver(this, "profile-after-change");
    Services.obs.addObserver(this, "xpcom-shutdown");
    Services.obs.addObserver(this, "wake_notification");

    // Make sure the alarm monitor is alive so it's observing the notification.
    Cc["@mozilla.org/calendar/alarm-monitor;1"].getService(Ci.calIAlarmServiceObserver);
    // Tell people that we're alive so they can start monitoring alarms.
    Services.obs.notifyObservers(null, "alarm-service-startup");

    cal.manager.addObserver(this.calendarManagerObserver);

    for (let calendar of cal.manager.getCalendars()) {
      this.observeCalendar(calendar);
    }

    /* set up a timer to update alarms every N hours */
    let timerCallback = {
      alarmService: this,
      notify() {
        let now = nowUTC();
        let start;
        if (this.alarmService.mRangeEnd) {
          // This is a subsequent search, so we got all the past alarms before
          start = this.alarmService.mRangeEnd.clone();
        } else {
          // This is our first search for alarms.  We're going to look for
          // alarms +/- 1 month from now.  If someone sets an alarm more than
          // a month ahead of an event, or doesn't start Thunderbird
          // for a month, they'll miss some, but that's a slim chance
          start = now.clone();
          start.month -= Ci.calIAlarmService.MAX_SNOOZE_MONTHS;
          this.alarmService.mRangeStart = start.clone();
        }
        let until = now.clone();
        until.month += Ci.calIAlarmService.MAX_SNOOZE_MONTHS;

        // We don't set timers for every future alarm, only those within 6 hours
        let end = now.clone();
        end.hour += kHoursBetweenUpdates;
        this.alarmService.mRangeEnd = end.getInTimezone(cal.dtz.UTC);

        this.alarmService.findAlarms(cal.manager.getCalendars(), start, until);
      },
    };
    timerCallback.notify();

    this.mUpdateTimer = newTimerWithCallback(timerCallback, kHoursBetweenUpdates * 3600000, true);

    this.mStarted = true;
  },

  shutdown() {
    if (!this.mStarted) {
      return;
    }

    // Tell people that we're no longer running.
    Services.obs.notifyObservers(null, "alarm-service-shutdown");

    if (this.mUpdateTimer) {
      this.mUpdateTimer.cancel();
      this.mUpdateTimer = null;
    }

    cal.manager.removeObserver(this.calendarManagerObserver);

    // Stop observing all calendars. This will also clear the timers.
    for (let calendar of cal.manager.getCalendars()) {
      this.unobserveCalendar(calendar);
    }

    this.mRangeEnd = null;

    Services.obs.removeObserver(this, "profile-after-change");
    Services.obs.removeObserver(this, "xpcom-shutdown");
    Services.obs.removeObserver(this, "wake_notification");

    this.mStarted = false;
  },

  observeCalendar(calendar) {
    calendar.addObserver(this.calendarObserver);
  },

  unobserveCalendar(calendar) {
    calendar.removeObserver(this.calendarObserver);
    this.disposeCalendarTimers([calendar]);
    this.mObservers.notify("onRemoveAlarmsByCalendar", [calendar]);
  },

  addAlarmsForItem(aItem) {
    if ((aItem.isTodo() && aItem.isCompleted) || IgnoredAlarmsStore.has(aItem)) {
      // If this is a task and it is completed or the id is in the ignored list,
      // don't add the alarm.
      return;
    }

    let showMissed = Services.prefs.getBoolPref("calendar.alarms.showmissed", true);

    let alarms = aItem.getAlarms();
    for (let alarm of alarms) {
      let alarmDate = cal.alarms.calculateAlarmDate(aItem, alarm);

      if (!alarmDate || alarm.action != "DISPLAY") {
        // Only take care of DISPLAY alarms with an alarm date.
        continue;
      }

      // Handle all day events.  This is kinda weird, because they don't have
      // a well defined startTime.  We just consider the start/end to be
      // midnight in the user's timezone.
      if (alarmDate.isDate) {
        alarmDate = alarmDate.getInTimezone(this.timezone);
        alarmDate.isDate = false;
      }
      alarmDate = alarmDate.getInTimezone(cal.dtz.UTC);

      // Check for snooze
      let snoozeDate;
      if (aItem.parentItem == aItem) {
        snoozeDate = aItem.getProperty("X-MOZ-SNOOZE-TIME");
      } else {
        snoozeDate = aItem.parentItem.getProperty(
          "X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime
        );
      }

      if (
        snoozeDate &&
        !(snoozeDate instanceof lazy.CalDateTime) &&
        !(snoozeDate instanceof Ci.calIDateTime)
      ) {
        snoozeDate = cal.createDateTime(snoozeDate);
      }

      // an alarm can only be snoozed to a later time, if earlier it's from another alarm.
      if (snoozeDate && snoozeDate.compare(alarmDate) > 0) {
        // If the alarm was snoozed, the snooze time is more important.
        alarmDate = snoozeDate;
      }

      let now = nowUTC();
      if (alarmDate.timezone.isFloating) {
        now = cal.dtz.now();
        now.timezone = cal.dtz.floating;
      }

      if (alarmDate.compare(now) >= 0) {
        // We assume that future alarms haven't been acknowledged
        // Delay is in msec, so don't forget to multiply
        let timeout = alarmDate.subtractDate(now).inSeconds * 1000;

        // No sense in keeping an extra timeout for an alarm that's past
        // our range.
        let timeUntilRefresh = this.mRangeEnd.subtractDate(now).inSeconds * 1000;
        if (timeUntilRefresh < timeout) {
          continue;
        }

        this.addTimer(aItem, alarm, timeout);
      } else if (
        showMissed &&
        cal.acl.isCalendarWritable(aItem.calendar) &&
        cal.acl.userCanModifyItem(aItem)
      ) {
        // This alarm is in the past and the calendar is writable, so we
        // could snooze or dismiss alarms. See if it has been previously
        // ack'd.
        let lastAck = aItem.parentItem.alarmLastAck;
        if (lastAck && lastAck.compare(alarmDate) >= 0) {
          // The alarm was previously dismissed or snoozed, no further
          // action required.
          continue;
        } else {
          // The alarm was not snoozed or dismissed, fire it now.
          this.alarmFired(aItem, alarm);
        }
      }
    }

    this.addNotificationForItem(aItem);
  },

  removeAlarmsForItem(aItem) {
    // make sure already fired alarms are purged out of the alarm window:
    this.mObservers.notify("onRemoveAlarmsByItem", [aItem]);
    // Purge alarms specifically for this item (i.e exception)
    for (let alarm of aItem.getAlarms()) {
      this.removeTimer(aItem, alarm);
    }

    this.removeNotificationForItem(aItem);
  },

  /**
   * Get the timeouts before notifications are fired for an item.
   *
   * @param {calIItemBase} item - A calendar item instance.
   * @returns {number[]} Timeouts of notifications in milliseconds in ascending order.
   */
  calculateNotificationTimeouts(item) {
    let now = nowUTC();
    let until = now.clone();
    until.month += 1;
    // We only care about items no more than a month ahead.
    if (!cal.item.checkIfInRange(item, now, until)) {
      return [];
    }
    let startDate = item[cal.dtz.startDateProp(item)];
    let endDate = item[cal.dtz.endDateProp(item)];
    let timeouts = [];
    // The calendar level notifications setting overrides the global setting.
    let prefValue = (
      item.calendar.getProperty("notifications.times") || this.gNotificationsTimes
    ).split(",");
    for (let entry of prefValue) {
      entry = entry.trim();
      if (!entry) {
        continue;
      }
      let [tag, value] = entry.split(":");
      if (!value) {
        value = tag;
        tag = "";
      }
      let duration;
      try {
        duration = cal.createDuration(value);
      } catch (e) {
        this._logger.error(`Failed to parse ${entry}`, e);
        continue;
      }
      let fireDate;
      if (tag == "END" && endDate) {
        fireDate = endDate.clone();
      } else if (startDate) {
        fireDate = startDate.clone();
      } else {
        continue;
      }
      fireDate.addDuration(duration);
      let timeout = fireDate.subtractDate(now).inSeconds * 1000;
      if (timeout > 0) {
        timeouts.push(timeout);
      }
    }
    return timeouts.sort((x, y) => x - y);
  },

  /**
   * Set up notification timers for an item.
   *
   * @param {calIItemBase} item - A calendar item instance.
   */
  addNotificationForItem(item) {
    let alarmTimerCallback = {
      notify: () => {
        this.mObservers.notify("onNotification", [item]);
        this.removeFiredNotificationTimer(item);
      },
    };
    let timeouts = this.calculateNotificationTimeouts(item);
    let timers = timeouts.map(timeout => newTimerWithCallback(alarmTimerCallback, timeout, false));

    if (timers.length > 0) {
      this._logger.debug(
        `addNotificationForItem hashId=${item.hashId}: adding ${timers.length} timers, timeouts=${timeouts}`
      );
      this.mNotificationTimerMap[item.calendar.id] =
        this.mNotificationTimerMap[item.calendar.id] || {};
      this.mNotificationTimerMap[item.calendar.id][item.hashId] = timers;
    }
  },

  /**
   * Remove notification timers for an item.
   *
   * @param {calIItemBase} item - A calendar item instance.
   */
  removeNotificationForItem(item) {
    if (
      !this.mNotificationTimerMap[item.calendar.id] ||
      !this.mNotificationTimerMap[item.calendar.id][item.hashId]
    ) {
      return;
    }

    for (let timer of this.mNotificationTimerMap[item.calendar.id][item.hashId]) {
      timer.cancel();
    }

    delete this.mNotificationTimerMap[item.calendar.id][item.hashId];

    // If the calendar map is empty, remove it from the timer map
    if (Object.keys(this.mNotificationTimerMap[item.calendar.id]).length == 0) {
      delete this.mNotificationTimerMap[item.calendar.id];
    }
  },

  /**
   * Remove the first notification timers for an item to release some memory.
   *
   * @param {calIItemBase} item - A calendar item instance.
   */
  removeFiredNotificationTimer(item) {
    // The first timer is fired first.
    let removed = this.mNotificationTimerMap[item.calendar.id][item.hashId].shift();

    let remainingTimersCount = this.mNotificationTimerMap[item.calendar.id][item.hashId].length;
    this._logger.debug(
      `removeFiredNotificationTimer hashId=${item.hashId}: removed=${removed.delay}, remaining ${remainingTimersCount} timers`
    );
    if (remainingTimersCount == 0) {
      delete this.mNotificationTimerMap[item.calendar.id][item.hashId];
    }

    // If the calendar map is empty, remove it from the timer map
    if (Object.keys(this.mNotificationTimerMap[item.calendar.id]).length == 0) {
      delete this.mNotificationTimerMap[item.calendar.id];
    }
  },

  getOccurrencesInRange(aItem) {
    // We search 1 month in each direction for alarms.  Therefore,
    // we need occurrences between initial start date and 1 month from now
    let until = nowUTC();
    until.month += 1;

    if (aItem && aItem.recurrenceInfo) {
      return aItem.recurrenceInfo.getOccurrences(this.mRangeStart, until, 0);
    }
    return cal.item.checkIfInRange(aItem, this.mRangeStart, until) ? [aItem] : [];
  },

  addAlarmsForOccurrences(aParentItem) {
    let occs = this.getOccurrencesInRange(aParentItem);

    // Add an alarm for each occurrence
    occs.forEach(this.addAlarmsForItem, this);
  },

  removeAlarmsForOccurrences(aParentItem) {
    let occs = this.getOccurrencesInRange(aParentItem);

    // Remove alarm for each occurrence
    occs.forEach(this.removeAlarmsForItem, this);
  },

  addTimer(aItem, aAlarm, aTimeout) {
    this.mTimerMap[aItem.calendar.id] = this.mTimerMap[aItem.calendar.id] || {};
    this.mTimerMap[aItem.calendar.id][aItem.hashId] =
      this.mTimerMap[aItem.calendar.id][aItem.hashId] || {};

    let self = this;
    let alarmTimerCallback = {
      notify() {
        self.alarmFired(aItem, aAlarm);
      },
    };

    let timer = newTimerWithCallback(alarmTimerCallback, aTimeout, false);
    this.mTimerMap[aItem.calendar.id][aItem.hashId][aAlarm.icalString] = timer;
  },

  removeTimer(aItem, aAlarm) {
    /* Is the calendar in the timer map */
    if (
      aItem.calendar.id in this.mTimerMap &&
      /* ...and is the item in the calendar map */
      aItem.hashId in this.mTimerMap[aItem.calendar.id] &&
      /* ...and is the alarm in the item map ? */
      aAlarm.icalString in this.mTimerMap[aItem.calendar.id][aItem.hashId]
    ) {
      // First cancel the existing timer
      let timer = this.mTimerMap[aItem.calendar.id][aItem.hashId][aAlarm.icalString];
      timer.cancel();

      // Remove the alarm from the item map
      delete this.mTimerMap[aItem.calendar.id][aItem.hashId][aAlarm.icalString];

      // If the item map is empty, remove it from the calendar map
      if (this.mTimerMap[aItem.calendar.id][aItem.hashId].toSource() == "({})") {
        delete this.mTimerMap[aItem.calendar.id][aItem.hashId];
      }

      // If the calendar map is empty, remove it from the timer map
      if (this.mTimerMap[aItem.calendar.id].toSource() == "({})") {
        delete this.mTimerMap[aItem.calendar.id];
      }
    }
  },

  disposeCalendarTimers(aCalendars) {
    for (let calendar of aCalendars) {
      if (calendar.id in this.mTimerMap) {
        for (let hashId in this.mTimerMap[calendar.id]) {
          let itemTimerMap = this.mTimerMap[calendar.id][hashId];
          for (let icalString in itemTimerMap) {
            let timer = itemTimerMap[icalString];
            timer.cancel();
          }
        }
        delete this.mTimerMap[calendar.id];
      }
      if (calendar.id in this.mNotificationTimerMap) {
        for (let timers of Object.values(this.mNotificationTimerMap[calendar.id])) {
          for (let timer of timers) {
            timer.cancel();
          }
        }
        delete this.mNotificationTimerMap[calendar.id];
      }
    }
  },

  async findAlarms(aCalendars, aStart, aUntil) {
    const calICalendar = Ci.calICalendar;
    let filter =
      calICalendar.ITEM_FILTER_COMPLETED_ALL |
      calICalendar.ITEM_FILTER_CLASS_OCCURRENCES |
      calICalendar.ITEM_FILTER_TYPE_ALL;

    await Promise.all(
      aCalendars.map(async calendar => {
        if (calendar.getProperty("suppressAlarms") && calendar.getProperty("disabled")) {
          this.mLoadedCalendars[calendar.id] = true;
          this.mObservers.notify("onAlarmsLoaded", [calendar]);
          return;
        }

        // Assuming that suppressAlarms does not change anymore until next refresh.
        this.mLoadedCalendars[calendar.id] = false;

        for await (let items of cal.iterate.streamValues(
          calendar.getItems(filter, 0, aStart, aUntil)
        )) {
          await new Promise((resolve, reject) => {
            cal.iterate.forEach(
              items,
              item => {
                try {
                  this.removeAlarmsForItem(item);
                  this.addAlarmsForItem(item);
                } catch (e) {
                  console.error("Promise was rejected: " + e);
                  this.mLoadedCalendars[calendar.id] = true;
                  this.mObservers.notify("onAlarmsLoaded", [calendar]);
                  reject(e);
                }
              },
              () => {
                resolve();
              }
            );
          });
        }

        // The calendar has been loaded, so until now, onLoad events can be ignored.
        this.mLoadedCalendars[calendar.id] = true;

        // Notify observers that the alarms for the calendar have been loaded.
        this.mObservers.notify("onAlarmsLoaded", [calendar]);
      })
    );
  },

  initAlarms(aCalendars) {
    // Purge out all alarm timers belonging to the refreshed/loaded calendars
    this.disposeCalendarTimers(aCalendars);

    // Purge out all alarms from dialog belonging to the refreshed/loaded calendars
    for (let calendar of aCalendars) {
      this.mLoadedCalendars[calendar.id] = false;
      this.mObservers.notify("onRemoveAlarmsByCalendar", [calendar]);
    }

    // Total refresh similar to startup.  We're going to look for
    // alarms +/- 1 month from now.  If someone sets an alarm more than
    // a month ahead of an event, or doesn't start Thunderbird
    // for a month, they'll miss some, but that's a slim chance
    let start = nowUTC();
    let until = start.clone();
    start.month -= Ci.calIAlarmService.MAX_SNOOZE_MONTHS;
    until.month += Ci.calIAlarmService.MAX_SNOOZE_MONTHS;
    this.findAlarms(aCalendars, start, until);
  },

  alarmFired(aItem, aAlarm) {
    if (
      !aItem.calendar.getProperty("suppressAlarms") &&
      !aItem.calendar.getProperty("disabled") &&
      aItem.getProperty("STATUS") != "CANCELLED"
    ) {
      this.mObservers.notify("onAlarm", [aItem, aAlarm]);
    }
  },

  get isLoading() {
    for (let calId in this.mLoadedCalendars) {
      // we need to exclude calendars which failed to load explicitly to
      // prevent the alaram dialog to stay opened after dismissing all
      // alarms if there is a network calendar that failed to load
      let currentStatus = cal.manager.getCalendarById(calId).getProperty("currentStatus");
      if (!this.mLoadedCalendars[calId] && Components.isSuccessCode(currentStatus)) {
        return true;
      }
    }
    return false;
  },
};
