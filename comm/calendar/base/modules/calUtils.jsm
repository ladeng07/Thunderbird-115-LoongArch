/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");
var { ConsoleAPI } = ChromeUtils.importESModule("resource://gre/modules/Console.sys.mjs");

const lazy = {};
XPCOMUtils.defineLazyModuleGetters(lazy, {
  CalDateTime: "resource:///modules/CalDateTime.jsm",
  CalDuration: "resource:///modules/CalDuration.jsm",
  CalRecurrenceDate: "resource:///modules/CalRecurrenceDate.jsm",
  CalRecurrenceRule: "resource:///modules/CalRecurrenceRule.jsm",
});

// The calendar console instance
var gCalendarConsole = new ConsoleAPI({
  prefix: "Calendar",
  consoleID: "calendar",
  maxLogLevel: Services.prefs.getBoolPref("calendar.debug.log", false) ? "all" : "warn",
});

const EXPORTED_SYMBOLS = ["cal"];
var cal = {
  // These functions exist to reduce boilerplate code for creating instances
  // as well as getting services and other (cached) objects.
  createDateTime(value) {
    let instance = new lazy.CalDateTime();
    if (value) {
      instance.icalString = value;
    }
    return instance;
  },
  createDuration(value) {
    let instance = new lazy.CalDuration();
    if (value) {
      instance.icalString = value;
    }
    return instance;
  },
  createRecurrenceDate(value) {
    let instance = new lazy.CalRecurrenceDate();
    if (value) {
      instance.icalString = value;
    }
    return instance;
  },
  createRecurrenceRule(value) {
    let instance = new lazy.CalRecurrenceRule();
    if (value) {
      instance.icalString = value;
    }
    return instance;
  },

  /**
   * The calendar console instance
   */
  console: gCalendarConsole,

  /**
   * Logs a calendar message to the console. Needs calendar.debug.log enabled to show messages.
   * Shortcut to cal.console.log()
   */
  LOG: gCalendarConsole.log,
  LOGverbose: gCalendarConsole.debug,

  /**
   * Logs a calendar warning to the console. Shortcut to cal.console.warn()
   */
  WARN: gCalendarConsole.warn,

  /**
   * Logs a calendar error to the console. Shortcut to cal.console.error()
   */
  ERROR: gCalendarConsole.error,

  /**
   * Uses the prompt service to display an error message. Use this sparingly,
   * as it interrupts the user.
   *
   * @param aMsg The message to be shown
   * @param aWindow The window to show the message in, or null for any window.
   */
  showError(aMsg, aWindow = null) {
    Services.prompt.alert(aWindow, cal.l10n.getCalString("genericErrorTitle"), aMsg);
  },

  /**
   * Returns a string describing the current js-stack with filename and line
   * numbers.
   *
   * @param aDepth (optional) The number of frames to include. Defaults to 5.
   * @param aSkip  (optional) Number of frames to skip
   */
  STACK(aDepth = 10, aSkip = 0) {
    let stack = "";
    let frame = Components.stack.caller;
    for (let i = 1; i <= aDepth + aSkip && frame; i++) {
      if (i > aSkip) {
        stack += `${i}: [${frame.filename}:${frame.lineNumber}] ${frame.name}\n`;
      }
      frame = frame.caller;
    }
    return stack;
  },

  /**
   * Logs a message and the current js-stack, if aCondition fails
   *
   * @param aCondition  the condition to test for
   * @param aMessage    the message to report in the case the assert fails
   * @param aCritical   if true, throw an error to stop current code execution
   *                    if false, code flow will continue
   *                    may be a result code
   */
  ASSERT(aCondition, aMessage, aCritical = false) {
    if (aCondition) {
      return;
    }

    let string = `Assert failed: ${aMessage}\n ${cal.STACK(0, 1)}`;
    if (aCritical) {
      let rescode = aCritical === true ? Cr.NS_ERROR_UNEXPECTED : aCritical;
      throw new Components.Exception(string, rescode);
    } else {
      console.error(string);
    }
  },

  /**
   * Generates the QueryInterface function. This is a replacement for XPCOMUtils.generateQI, which
   * is being replaced. Unfortunately Calendar's code depends on some of its classes providing
   * nsIClassInfo, which causes xpconnect/xpcom to make all methods available, e.g. for an event
   * both calIItemBase and calIEvent.
   *
   * @param {Array<string | nsIIDRef>} aInterfaces      The interfaces to generate QI for.
   * @returns {Function} The QueryInterface function
   */
  generateQI(aInterfaces) {
    if (aInterfaces.length == 1) {
      cal.WARN(
        "When generating QI for one interface, please use ChromeUtils.generateQI",
        cal.STACK(10)
      );
      return ChromeUtils.generateQI(aInterfaces);
    }
    /* Note that Ci[Ci.x] == Ci.x for all x */
    let names = [];
    if (aInterfaces) {
      for (let i = 0; i < aInterfaces.length; i++) {
        let iface = aInterfaces[i];
        let name = (iface && iface.name) || String(iface);
        if (name in Ci) {
          names.push(name);
        }
      }
    }
    return makeQI(names);
  },

  /**
   * Generate a ClassInfo implementation for a component. The returned object
   * must be assigned to the 'classInfo' property of a JS object. The first and
   * only argument should be an object that contains a number of optional
   * properties: "interfaces", "contractID", "classDescription", "classID" and
   * "flags". The values of the properties will be returned as the values of the
   * various properties of the nsIClassInfo implementation.
   */
  generateCI(classInfo) {
    if ("QueryInterface" in classInfo) {
      throw Error("In generateCI, don't use a component for generating classInfo");
    }
    /* Note that Ci[Ci.x] == Ci.x for all x */
    let _interfaces = [];
    for (let i = 0; i < classInfo.interfaces.length; i++) {
      let iface = classInfo.interfaces[i];
      if (Ci[iface]) {
        _interfaces.push(Ci[iface]);
      }
    }
    return {
      get interfaces() {
        return [Ci.nsIClassInfo, Ci.nsISupports].concat(_interfaces);
      },
      getScriptableHelper() {
        return null;
      },
      contractID: classInfo.contractID,
      classDescription: classInfo.classDescription,
      classID: classInfo.classID,
      flags: classInfo.flags,
      QueryInterface: ChromeUtils.generateQI(["nsIClassInfo"]),
    };
  },

  /**
   * Create an adapter for the given interface. If passed, methods will be
   * added to the template object, otherwise a new object will be returned.
   *
   * @param iface     The interface to adapt, either using
   *                    Components.interfaces or the name as a string.
   * @param template  (optional) A template object to extend
   * @returns If passed the adapted template object, otherwise a
   *                    clean adapter.
   *
   * Currently supported interfaces are:
   *  - calIObserver
   *  - calICalendarManagerObserver
   *  - calIOperationListener
   *  - calICompositeObserver
   */
  createAdapter(iface, template) {
    let methods;
    let adapter = template || {};
    switch (iface.name || iface) {
      case "calIObserver":
        methods = [
          "onStartBatch",
          "onEndBatch",
          "onLoad",
          "onAddItem",
          "onModifyItem",
          "onDeleteItem",
          "onError",
          "onPropertyChanged",
          "onPropertyDeleting",
        ];
        break;
      case "calICalendarManagerObserver":
        methods = ["onCalendarRegistered", "onCalendarUnregistering", "onCalendarDeleting"];
        break;
      case "calIOperationListener":
        methods = ["onGetResult", "onOperationComplete"];
        break;
      case "calICompositeObserver":
        methods = ["onCalendarAdded", "onCalendarRemoved", "onDefaultCalendarChanged"];
        break;
      default:
        methods = [];
        break;
    }

    for (let method of methods) {
      if (!(method in template)) {
        adapter[method] = function () {};
      }
    }
    adapter.QueryInterface = ChromeUtils.generateQI([iface]);

    return adapter;
  },

  /**
   * Make a UUID, without enclosing brackets, e.g. 0d3950fd-22e5-4508-91ba-0489bdac513f
   *
   * @returns {string} The generated UUID
   */
  getUUID() {
    // generate uuids without braces to avoid problems with
    // CalDAV servers that don't support filenames with {}
    return Services.uuid.generateUUID().toString().replace(/[{}]/g, "");
  },

  /**
   * Adds an observer listening for the topic.
   *
   * @param func function to execute on topic
   * @param topic topic to listen for
   * @param oneTime whether to listen only once
   */
  addObserver(func, topic, oneTime) {
    let observer = {
      // nsIObserver:
      observe(subject, topic_, data) {
        if (topic == topic_) {
          if (oneTime) {
            Services.obs.removeObserver(this, topic);
          }
          func(subject, topic, data);
        }
      },
    };
    Services.obs.addObserver(observer, topic);
  },

  /**
   * Wraps an instance, making sure the xpcom wrapped object is used.
   *
   * @param aObj the object under consideration
   * @param aInterface the interface to be wrapped
   *
   * Use this function to QueryInterface the object to a particular interface.
   * You may only expect the return value to be wrapped, not the original passed object.
   * For example:
   * // BAD USAGE:
   * if (cal.wrapInstance(foo, Ci.nsIBar)) {
   *   foo.barMethod();
   * }
   * // GOOD USAGE:
   * foo = cal.wrapInstance(foo, Ci.nsIBar);
   * if (foo) {
   *   foo.barMethod();
   * }
   *
   */
  wrapInstance(aObj, aInterface) {
    if (!aObj) {
      return null;
    }

    try {
      return aObj.QueryInterface(aInterface);
    } catch (e) {
      return null;
    }
  },

  /**
   * Tries to get rid of wrappers, if this is not possible then return the
   * passed object.
   *
   * @param aObj  The object under consideration
   * @returns The possibly unwrapped object.
   */
  unwrapInstance(aObj) {
    return aObj && aObj.wrappedJSObject ? aObj.wrappedJSObject : aObj;
  },

  /**
   * Adds an xpcom shutdown observer.
   *
   * @param func function to execute
   */
  addShutdownObserver(func) {
    cal.addObserver(func, "xpcom-shutdown", true /* one time */);
  },

  /**
   * Due to wrapped js objects, some objects may have cyclic references.
   * You can register properties of objects to be cleaned up on xpcom-shutdown.
   *
   * @param obj    object
   * @param prop   property to be deleted on shutdown
   *               (if null, |object| will be deleted)
   */
  registerForShutdownCleanup: shutdownCleanup,
};

/**
 * Update the logging preferences for the calendar console based on the state of verbose logging and
 * normal calendar logging.
 */
function updateLogPreferences() {
  if (cal.verboseLogEnabled) {
    gCalendarConsole.maxLogLevel = "all";
  } else if (cal.debugLogEnabled) {
    gCalendarConsole.maxLogLevel = "log";
  } else {
    gCalendarConsole.maxLogLevel = "warn";
  }
}

// Preferences
XPCOMUtils.defineLazyPreferenceGetter(
  cal,
  "debugLogEnabled",
  "calendar.debug.log",
  false,
  updateLogPreferences
);
XPCOMUtils.defineLazyPreferenceGetter(
  cal,
  "verboseLogEnabled",
  "calendar.debug.log.verbose",
  false,
  updateLogPreferences
);
XPCOMUtils.defineLazyPreferenceGetter(
  cal,
  "threadingEnabled",
  "calendar.threading.disabled",
  false
);

// Services
XPCOMUtils.defineLazyServiceGetter(
  cal,
  "manager",
  "@mozilla.org/calendar/manager;1",
  "calICalendarManager"
);
XPCOMUtils.defineLazyServiceGetter(
  cal,
  "icsService",
  "@mozilla.org/calendar/ics-service;1",
  "calIICSService"
);
XPCOMUtils.defineLazyServiceGetter(
  cal,
  "timezoneService",
  "@mozilla.org/calendar/timezone-service;1",
  "calITimezoneService"
);
XPCOMUtils.defineLazyServiceGetter(
  cal,
  "freeBusyService",
  "@mozilla.org/calendar/freebusy-service;1",
  "calIFreeBusyService"
);
XPCOMUtils.defineLazyServiceGetter(
  cal,
  "weekInfoService",
  "@mozilla.org/calendar/weekinfo-service;1",
  "calIWeekInfoService"
);
XPCOMUtils.defineLazyServiceGetter(
  cal,
  "dragService",
  "@mozilla.org/widget/dragservice;1",
  "nsIDragService"
);

// Sub-modules for calUtils
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "acl",
  "resource:///modules/calendar/utils/calACLUtils.jsm",
  "calacl"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "alarms",
  "resource:///modules/calendar/utils/calAlarmUtils.jsm",
  "calalarms"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "auth",
  "resource:///modules/calendar/utils/calAuthUtils.jsm",
  "calauth"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "category",
  "resource:///modules/calendar/utils/calCategoryUtils.jsm",
  "calcategory"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "data",
  "resource:///modules/calendar/utils/calDataUtils.jsm",
  "caldata"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "dtz",
  "resource:///modules/calendar/utils/calDateTimeUtils.jsm",
  "caldtz"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "email",
  "resource:///modules/calendar/utils/calEmailUtils.jsm",
  "calemail"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "invitation",
  "resource:///modules/calendar/utils/calInvitationUtils.jsm",
  "calinvitation"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "item",
  "resource:///modules/calendar/utils/calItemUtils.jsm",
  "calitem"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "iterate",
  "resource:///modules/calendar/utils/calIteratorUtils.jsm",
  "caliterate"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "itip",
  "resource:///modules/calendar/utils/calItipUtils.jsm",
  "calitip"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "l10n",
  "resource:///modules/calendar/utils/calL10NUtils.jsm",
  "call10n"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "print",
  "resource:///modules/calendar/utils/calPrintUtils.jsm",
  "calprint"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "provider",
  "resource:///modules/calendar/utils/calProviderUtils.jsm",
  "calprovider"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "unifinder",
  "resource:///modules/calendar/utils/calUnifinderUtils.jsm",
  "calunifinder"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "view",
  "resource:///modules/calendar/utils/calViewUtils.jsm",
  "calview"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "window",
  "resource:///modules/calendar/utils/calWindowUtils.jsm",
  "calwindow"
);
XPCOMUtils.defineLazyModuleGetter(
  cal,
  "xml",
  "resource:///modules/calendar/utils/calXMLUtils.jsm",
  "calxml"
);

// will be used to clean up global objects on shutdown
// some objects have cyclic references due to wrappers
function shutdownCleanup(obj, prop) {
  if (!shutdownCleanup.mEntries) {
    shutdownCleanup.mEntries = [];
    cal.addShutdownObserver(() => {
      for (let entry of shutdownCleanup.mEntries) {
        if (entry.mProp) {
          delete entry.mObj[entry.mProp];
        } else {
          delete entry.mObj;
        }
      }
      delete shutdownCleanup.mEntries;
    });
  }
  shutdownCleanup.mEntries.push({ mObj: obj, mProp: prop });
}

/**
 * This is the makeQI function from XPCOMUtils.sys.mjs, it is separate to avoid leaks
 *
 * @param {Array<string | nsIIDRef>} aInterfaces      The interfaces to make QI for.
 * @returns {Function} The QueryInterface function.
 */
function makeQI(aInterfaces) {
  return function (iid) {
    if (iid.equals(Ci.nsISupports)) {
      return this;
    }
    if (iid.equals(Ci.nsIClassInfo) && "classInfo" in this) {
      return this.classInfo;
    }
    for (let i = 0; i < aInterfaces.length; i++) {
      if (Ci[aInterfaces[i]].equals(iid)) {
        return this;
      }
    }

    throw Components.Exception("", Cr.NS_ERROR_NO_INTERFACE);
  };
}
