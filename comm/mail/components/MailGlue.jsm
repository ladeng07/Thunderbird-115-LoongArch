/* -*- Mode: JavaScript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["MailGlue", "MailTelemetryForTests"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const lazy = {};

// lazy module getter

XPCOMUtils.defineLazyGetter(lazy, "gMailBundle", function () {
  return Services.strings.createBundle(
    "chrome://messenger/locale/messenger.properties"
  );
});

if (AppConstants.NIGHTLY_BUILD) {
  XPCOMUtils.defineLazyGetter(
    lazy,
    "WeaveService",
    () => Cc["@mozilla.org/weave/service;1"].getService().wrappedJSObject
  );
}

ChromeUtils.defineESModuleGetters(lazy, {
  ActorManagerParent: "resource://gre/modules/ActorManagerParent.sys.mjs",
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
  ChatCore: "resource:///modules/chatHandler.sys.mjs",

  LightweightThemeConsumer:
    "resource://gre/modules/LightweightThemeConsumer.sys.mjs",

  OsEnvironment: "resource://gre/modules/OsEnvironment.sys.mjs",
  PdfJs: "resource://pdf.js/PdfJs.sys.mjs",

  RemoteSecuritySettings:
    "resource://gre/modules/psm/RemoteSecuritySettings.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  cal: "resource:///modules/calendar/calUtils.jsm",
  ExtensionSupport: "resource:///modules/ExtensionSupport.jsm",
  MailMigrator: "resource:///modules/MailMigrator.jsm",
  MailServices: "resource:///modules/MailServices.jsm",
  MailUsageTelemetry: "resource:///modules/MailUsageTelemetry.jsm",
  OAuth2Providers: "resource:///modules/OAuth2Providers.jsm",
  TBDistCustomizer: "resource:///modules/TBDistCustomizer.jsm",
});

if (AppConstants.MOZ_UPDATER) {
  ChromeUtils.defineESModuleGetters(lazy, {
    UpdateListener: "resource://gre/modules/UpdateListener.sys.mjs",
  });
}

const listeners = {
  observers: {},

  observe(subject, topic, data) {
    for (let module of this.observers[topic]) {
      try {
        lazy[module].observe(subject, topic, data);
      } catch (e) {
        console.error(e);
      }
    }
  },

  init() {
    for (let observer of Object.keys(this.observers)) {
      Services.obs.addObserver(this, observer);
    }
  },
};
if (AppConstants.MOZ_UPDATER) {
  listeners.observers["update-downloading"] = ["UpdateListener"];
  listeners.observers["update-staged"] = ["UpdateListener"];
  listeners.observers["update-downloaded"] = ["UpdateListener"];
  listeners.observers["update-available"] = ["UpdateListener"];
  listeners.observers["update-error"] = ["UpdateListener"];
  listeners.observers["update-swap"] = ["UpdateListener"];
}

const PREF_PDFJS_ISDEFAULT_CACHE_STATE = "pdfjs.enabledCache.state";

let JSWINDOWACTORS = {
  ChatAction: {
    matches: ["chrome://chat/content/conv.html"],
    parent: {
      esModuleURI: "resource:///actors/ChatActionParent.sys.mjs",
    },
    child: {
      esModuleURI: "resource:///actors/ChatActionChild.sys.mjs",
      events: {
        contextmenu: { mozSystemGroup: true },
      },
    },
  },

  ContextMenu: {
    parent: {
      esModuleURI: "resource:///actors/ContextMenuParent.sys.mjs",
    },
    child: {
      esModuleURI: "resource:///actors/ContextMenuChild.sys.mjs",
      events: {
        contextmenu: { mozSystemGroup: true },
      },
    },
    allFrames: true,
  },

  // As in ActorManagerParent.sys.mjs, but with single-site and single-page
  // message manager groups added.
  FindBar: {
    parent: {
      esModuleURI: "resource://gre/actors/FindBarParent.sys.mjs",
    },
    child: {
      esModuleURI: "resource://gre/actors/FindBarChild.sys.mjs",
      events: {
        keypress: { mozSystemGroup: true },
      },
    },

    allFrames: true,
    messageManagerGroups: [
      "browsers",
      "single-site",
      "single-page",
      "test",
      "",
    ],
  },

  LinkClickHandler: {
    parent: {
      moduleURI: "resource:///actors/LinkClickHandlerParent.jsm",
    },
    child: {
      moduleURI: "resource:///actors/LinkClickHandlerChild.jsm",
      events: {
        click: {},
      },
    },
    messageManagerGroups: ["single-site", "webext-browsers"],
    allFrames: true,
  },

  LinkHandler: {
    parent: {
      esModuleURI: "resource:///actors/LinkHandlerParent.sys.mjs",
    },
    child: {
      esModuleURI: "resource:///actors/LinkHandlerChild.sys.mjs",
      events: {
        DOMHeadElementParsed: {},
        DOMLinkAdded: {},
        DOMLinkChanged: {},
        pageshow: {},
        // The `pagehide` event is only used to clean up state which will not be
        // present if the actor hasn't been created.
        pagehide: { createActor: false },
      },
    },

    messageManagerGroups: ["browsers", "single-site", "single-page"],
  },

  // As in ActorManagerParent.sys.mjs, but with single-site and single-page
  // message manager groups added.
  LoginManager: {
    parent: {
      esModuleURI: "resource://gre/modules/LoginManagerParent.sys.mjs",
    },
    child: {
      esModuleURI: "resource://gre/modules/LoginManagerChild.sys.mjs",
      events: {
        DOMDocFetchSuccess: {},
        DOMFormBeforeSubmit: {},
        DOMFormHasPassword: {},
        DOMInputPasswordAdded: {},
      },
    },

    allFrames: true,
    messageManagerGroups: [
      "browsers",
      "single-site",
      "single-page",
      "webext-browsers",
      "",
    ],
  },

  MailLink: {
    parent: {
      moduleURI: "resource:///actors/MailLinkParent.jsm",
    },
    child: {
      moduleURI: "resource:///actors/MailLinkChild.jsm",
      events: {
        click: {},
      },
    },
    allFrames: true,
  },

  Pdfjs: {
    parent: {
      esModuleURI: "resource://pdf.js/PdfjsParent.sys.mjs",
    },
    child: {
      esModuleURI: "resource://pdf.js/PdfjsChild.sys.mjs",
    },
    enablePreference: PREF_PDFJS_ISDEFAULT_CACHE_STATE,
    allFrames: true,
  },

  Prompt: {
    parent: {
      moduleURI: "resource:///actors/PromptParent.jsm",
    },
    includeChrome: true,
    allFrames: true,
  },

  StrictLinkClickHandler: {
    parent: {
      moduleURI: "resource:///actors/LinkClickHandlerParent.jsm",
    },
    child: {
      moduleURI: "resource:///actors/LinkClickHandlerChild.jsm",
      events: {
        click: {},
      },
    },
    messageManagerGroups: ["single-page"],
    allFrames: true,
  },

  VCard: {
    parent: {
      moduleURI: "resource:///actors/VCardParent.jsm",
    },
    child: {
      moduleURI: "resource:///actors/VCardChild.jsm",
      events: {
        click: {},
      },
    },
    allFrames: true,
  },
};

// Seconds of idle time before the late idle tasks will be scheduled.
const LATE_TASKS_IDLE_TIME_SEC = 20;

// Time after we stop tracking startup crashes.
const STARTUP_CRASHES_END_DELAY_MS = 30 * 1000;

/**
 * Glue code that should be executed before any windows are opened. Any
 * window-independent helper methods (a la nsBrowserGlue.js) should go in
 * MailUtils.jsm instead.
 */

function MailGlue() {
  XPCOMUtils.defineLazyServiceGetter(
    this,
    "_userIdleService",
    "@mozilla.org/widget/useridleservice;1",
    "nsIUserIdleService"
  );
  this._init();
}

// This should match the constant of the same name in devtools
// (devtools/client/framework/browser-toolbox/Launcher.sys.mjs). Otherwise the logic
// in command-line-startup will fail. We have a test to ensure it matches, at
// mail/base/test/unit/test_devtools_url.js.
MailGlue.BROWSER_TOOLBOX_WINDOW_URL =
  "chrome://devtools/content/framework/browser-toolbox/window.html";

// A Promise that is resolved by an idle task after most start-up operations.
MailGlue.afterStartUp = new Promise(resolve => {
  MailGlue.resolveAfterStartUp = resolve;
});

MailGlue.prototype = {
  _isNewProfile: undefined,

  // init (called at app startup)
  _init() {
    // Start-up notifications, in order.
    // app-startup happens first, registered in components.conf.
    Services.obs.addObserver(this, "command-line-startup");
    Services.obs.addObserver(this, "final-ui-startup");
    Services.obs.addObserver(this, "quit-application-granted");
    Services.obs.addObserver(this, "mail-startup-done");

    // Shut-down notifications.
    Services.obs.addObserver(this, "xpcom-shutdown");

    // General notifications.
    Services.obs.addObserver(this, "intl:app-locales-changed");
    Services.obs.addObserver(this, "handle-xul-text-link");
    Services.obs.addObserver(this, "chrome-document-global-created");
    Services.obs.addObserver(this, "document-element-inserted");
    Services.obs.addObserver(this, "handlersvc-store-initialized");

    // Call the lazy getter to ensure ActorManagerParent is initialized.
    lazy.ActorManagerParent;

    // FindBar and LoginManager actors are included in JSWINDOWACTORS as they
    // also apply to the single-site and single-page message manager groups.
    // First we must unregister them to avoid errors.
    ChromeUtils.unregisterWindowActor("FindBar");
    ChromeUtils.unregisterWindowActor("LoginManager");

    lazy.ActorManagerParent.addJSWindowActors(JSWINDOWACTORS);
  },

  // cleanup (called at shutdown)
  _dispose() {
    Services.obs.removeObserver(this, "command-line-startup");
    Services.obs.removeObserver(this, "final-ui-startup");
    Services.obs.removeObserver(this, "quit-application-granted");
    // mail-startup-done is removed by its handler.

    Services.obs.removeObserver(this, "xpcom-shutdown");

    Services.obs.removeObserver(this, "intl:app-locales-changed");
    Services.obs.removeObserver(this, "handle-xul-text-link");
    Services.obs.removeObserver(this, "chrome-document-global-created");
    Services.obs.removeObserver(this, "document-element-inserted");
    Services.obs.removeObserver(this, "handlersvc-store-initialized");

    lazy.ExtensionSupport.unregisterWindowListener(
      "Thunderbird-internal-BrowserConsole"
    );

    lazy.MailUsageTelemetry.uninit();

    if (this._lateTasksIdleObserver) {
      this._userIdleService.removeIdleObserver(
        this._lateTasksIdleObserver,
        LATE_TASKS_IDLE_TIME_SEC
      );
      delete this._lateTasksIdleObserver;
    }
  },

  // nsIObserver implementation
  observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "app-startup":
        // Record the previously started version. This is used to check for
        // extensions that were disabled by an application update. We need to
        // read this pref before the Add-Ons Manager changes it.
        this.previousVersion = Services.prefs.getCharPref(
          "extensions.lastAppVersion",
          "0"
        );
        break;
      case "command-line-startup":
        // Check if this process is the developer toolbox process, and if it
        // is, stop MailGlue from doing anything more. Also sets a flag that
        // can be checked to see if this is the toolbox process.
        let isToolboxProcess = false;
        let commandLine = aSubject.QueryInterface(Ci.nsICommandLine);
        let flagIndex = commandLine.findFlag("chrome", true) + 1;
        if (
          flagIndex > 0 &&
          flagIndex < commandLine.length &&
          commandLine.getArgument(flagIndex) ===
            MailGlue.BROWSER_TOOLBOX_WINDOW_URL
        ) {
          isToolboxProcess = true;
        }

        MailGlue.__defineGetter__("isToolboxProcess", () => isToolboxProcess);

        if (isToolboxProcess) {
          // Clean up all of the listeners.
          this._dispose();
        }
        break;
      case "final-ui-startup":
        // Initialise the permission manager. If this happens before telling
        // the folder service that strings are available, it's a *much* less
        // expensive operation than if it happens afterwards, because if
        // strings are available, some types of mail URL go looking for things
        // in message databases, causing massive amounts of I/O.
        Services.perms.all;

        Cc["@mozilla.org/msgFolder/msgFolderService;1"]
          .getService(Ci.nsIMsgFolderService)
          .initializeFolderStrings();
        Cc["@mozilla.org/msgDBView/msgDBViewService;1"]
          .getService(Ci.nsIMsgDBViewService)
          .initializeDBViewStrings();
        this._beforeUIStartup();
        break;
      case "quit-application-granted":
        Services.startup.trackStartupCrashEnd();
        if (AppConstants.MOZ_UPDATER) {
          lazy.UpdateListener.reset();
        }
        break;
      case "mail-startup-done":
        this._onFirstWindowLoaded();
        Services.obs.removeObserver(this, "mail-startup-done");
        break;
      case "xpcom-shutdown":
        this._dispose();
        break;
      case "intl:app-locales-changed":
        Cc["@mozilla.org/msgFolder/msgFolderService;1"]
          .getService(Ci.nsIMsgFolderService)
          .initializeFolderStrings();
        Cc["@mozilla.org/msgDBView/msgDBViewService;1"]
          .getService(Ci.nsIMsgDBViewService)
          .initializeDBViewStrings();
        let windows = Services.wm.getEnumerator("mail:3pane");
        while (windows.hasMoreElements()) {
          let win = windows.getNext();
          win.document.getElementById("threadTree")?.invalidate();
        }
        // Refresh the folder tree.
        let fls = Cc["@mozilla.org/mail/folder-lookup;1"].getService(
          Ci.nsIFolderLookupService
        );
        fls.setPrettyNameFromOriginalAllFolders();
        break;
      case "handle-xul-text-link":
        this._handleLink(aSubject, aData);
        break;
      case "chrome-document-global-created":
        // Set up lwt, but only if the "lightweightthemes" attr is set on the root
        // (i.e. in messenger.xhtml).
        aSubject.addEventListener(
          "DOMContentLoaded",
          () => {
            if (
              aSubject.document.documentElement.hasAttribute(
                "lightweightthemes"
              )
            ) {
              new lazy.LightweightThemeConsumer(aSubject.document);
            }
          },
          { once: true }
        );
        break;
      case "document-element-inserted":
        let doc = aSubject;
        if (
          doc.nodePrincipal.isSystemPrincipal &&
          (doc.contentType == "application/xhtml+xml" ||
            doc.contentType == "text/html") &&
          // People shouldn't be using our built-in custom elements in
          // system-principal about:blank anyway, and trying to support that
          // causes responsiveness regressions.  So let's not support it.
          doc.URL != "about:blank"
        ) {
          Services.scriptloader.loadSubScript(
            "chrome://messenger/content/customElements.js",
            doc.ownerGlobal
          );
        }
        break;
      case "handlersvc-store-initialized": {
        // Initialize PdfJs when running in-process and remote. This only
        // happens once since PdfJs registers global hooks. If the PdfJs
        // extension is installed the init method below will be overridden
        // leaving initialization to the extension.
        // parent only: configure default prefs, set up pref observers, register
        // pdf content handler, and initializes parent side message manager
        // shim for privileged api access.
        lazy.PdfJs.init(this._isNewProfile);
        break;
      }
    }
  },

  // Runs on startup, before the first command line handler is invoked
  // (i.e. before the first window is opened).
  _beforeUIStartup() {
    lazy.TBDistCustomizer.applyPrefDefaults();

    const UI_VERSION_PREF = "mail.ui-rdf.version";
    this._isNewProfile = !Services.prefs.prefHasUserValue(UI_VERSION_PREF);

    // handle any migration work that has to happen at profile startup
    lazy.MailMigrator.migrateAtProfileStartup();

    if (!Services.prefs.prefHasUserValue(PREF_PDFJS_ISDEFAULT_CACHE_STATE)) {
      lazy.PdfJs.checkIsDefault(this._isNewProfile);
    }

    // Inject scripts into some devtools windows.
    function _setupBrowserConsole(domWindow) {
      // Browser Console is an XHTML document.
      domWindow.document.title =
        lazy.gMailBundle.GetStringFromName("errorConsoleTitle");
      Services.scriptloader.loadSubScript(
        "chrome://global/content/viewSourceUtils.js",
        domWindow
      );
    }

    lazy.ExtensionSupport.registerWindowListener(
      "Thunderbird-internal-BrowserConsole",
      {
        chromeURLs: ["chrome://devtools/content/webconsole/index.html"],
        onLoadWindow: _setupBrowserConsole,
      }
    );

    // check if we're in safe mode
    if (Services.appinfo.inSafeMode) {
      Services.ww.openWindow(
        null,
        "chrome://messenger/content/troubleshootMode.xhtml",
        "_blank",
        "chrome,centerscreen,modal,resizable=no",
        null
      );
    }

    lazy.AddonManager.maybeInstallBuiltinAddon(
      "thunderbird-compact-light@mozilla.org",
      "1.2",
      "resource://builtin-themes/light/"
    );
    lazy.AddonManager.maybeInstallBuiltinAddon(
      "thunderbird-compact-dark@mozilla.org",
      "1.2",
      "resource://builtin-themes/dark/"
    );

    if (AppConstants.MOZ_UPDATER) {
      listeners.init();
    }
  },

  _checkForOldBuildUpdates() {
    // check for update if our build is old
    if (
      AppConstants.MOZ_UPDATER &&
      Services.prefs.getBoolPref("app.update.checkInstallTime")
    ) {
      let buildID = Services.appinfo.appBuildID;
      let today = new Date().getTime();
      /* eslint-disable no-multi-spaces */
      let buildDate = new Date(
        buildID.slice(0, 4), // year
        buildID.slice(4, 6) - 1, // months are zero-based.
        buildID.slice(6, 8), // day
        buildID.slice(8, 10), // hour
        buildID.slice(10, 12), // min
        buildID.slice(12, 14)
      ) // ms
        .getTime();
      /* eslint-enable no-multi-spaces */

      const millisecondsIn24Hours = 86400000;
      let acceptableAge =
        Services.prefs.getIntPref("app.update.checkInstallTime.days") *
        millisecondsIn24Hours;

      if (buildDate + acceptableAge < today) {
        Cc["@mozilla.org/updates/update-service;1"]
          .getService(Ci.nsIApplicationUpdateService)
          .checkForBackgroundUpdates();
      }
    }
  },

  _onFirstWindowLoaded() {
    // Start these services.
    Cc["@mozilla.org/chat/logger;1"].getService(Ci.imILogger);

    this._checkForOldBuildUpdates();

    // On Windows 7 and above, initialize the jump list module.
    const WINTASKBAR_CONTRACTID = "@mozilla.org/windows-taskbar;1";
    if (
      WINTASKBAR_CONTRACTID in Cc &&
      Cc[WINTASKBAR_CONTRACTID].getService(Ci.nsIWinTaskbar).available
    ) {
      const { WinTaskbarJumpList } = ChromeUtils.import(
        "resource:///modules/WindowsJumpLists.jsm"
      );
      WinTaskbarJumpList.startup();
    }

    const { ExtensionsUI } = ChromeUtils.import(
      "resource:///modules/ExtensionsUI.jsm"
    );
    ExtensionsUI.init();

    // If the application has been updated, check all installed extensions for
    // updates.
    let currentVersion = Services.appinfo.version;
    if (this.previousVersion != "0" && this.previousVersion != currentVersion) {
      let { AddonManager } = ChromeUtils.importESModule(
        "resource://gre/modules/AddonManager.sys.mjs"
      );
      let { XPIDatabase } = ChromeUtils.import(
        "resource://gre/modules/addons/XPIDatabase.jsm"
      );
      let addons = XPIDatabase.getAddons();
      for (let addon of addons) {
        if (addon.permissions() & AddonManager.PERM_CAN_UPGRADE) {
          AddonManager.getAddonByID(addon.id).then(addon => {
            if (!AddonManager.shouldAutoUpdate(addon)) {
              return;
            }
            addon.findUpdates(
              {
                onUpdateFinished() {},
                onUpdateAvailable(addon, install) {
                  install.install();
                },
              },
              AddonManager.UPDATE_WHEN_NEW_APP_INSTALLED
            );
          });
        }
      }
    }

    if (AppConstants.ASAN_REPORTER) {
      var { AsanReporter } = ChromeUtils.importESModule(
        "resource://gre/modules/AsanReporter.sys.mjs"
      );
      AsanReporter.init();
    }

    // Check if Sync is configured
    if (
      AppConstants.NIGHTLY_BUILD &&
      Services.prefs.prefHasUserValue("services.sync.username")
    ) {
      lazy.WeaveService.init();
    }

    this._scheduleStartupIdleTasks();
    this._lateTasksIdleObserver = (idleService, topic, data) => {
      if (topic == "idle") {
        idleService.removeIdleObserver(
          this._lateTasksIdleObserver,
          LATE_TASKS_IDLE_TIME_SEC
        );
        delete this._lateTasksIdleObserver;
        this._scheduleBestEffortUserIdleTasks();
      }
    };
    this._userIdleService.addIdleObserver(
      this._lateTasksIdleObserver,
      LATE_TASKS_IDLE_TIME_SEC
    );

    lazy.MailUsageTelemetry.init();
  },

  /**
   * Use this function as an entry point to schedule tasks that
   * need to run only once after startup, and can be scheduled
   * by using an idle callback.
   *
   * The functions scheduled here will fire from idle callbacks
   * once every window has finished being restored by session
   * restore, and it's guaranteed that they will run before
   * the equivalent per-window idle tasks
   * (from _schedulePerWindowIdleTasks in browser.js).
   *
   * If you have something that can wait even further than the
   * per-window initialization, and is okay with not being run in some
   * sessions, please schedule them using
   * _scheduleBestEffortUserIdleTasks.
   * Don't be fooled by thinking that the use of the timeout parameter
   * will delay your function: it will just ensure that it potentially
   * happens _earlier_ than expected (when the timeout limit has been reached),
   * but it will not make it happen later (and out of order) compared
   * to the other ones scheduled together.
   */
  _scheduleStartupIdleTasks() {
    const idleTasks = [
      {
        task() {
          // This module needs to be loaded so it registers to receive
          // FormAutoComplete:GetSelectedIndex messages and respond
          // appropriately, otherwise we get error messages like the one
          // reported in bug 1635422.
          ChromeUtils.importESModule(
            "resource://gre/actors/AutoCompleteParent.sys.mjs"
          );
        },
      },
      {
        task() {
          // Make sure Gloda's up and running.
          ChromeUtils.import("resource:///modules/gloda/GlodaPublic.jsm");
        },
      },
      {
        task() {
          MailGlue.resolveAfterStartUp();
        },
      },
      {
        task() {
          let { setTimeout } = ChromeUtils.importESModule(
            "resource://gre/modules/Timer.sys.mjs"
          );
          setTimeout(function () {
            Services.tm.idleDispatchToMainThread(
              Services.startup.trackStartupCrashEnd
            );
          }, STARTUP_CRASHES_END_DELAY_MS);
        },
      },
      {
        condition: AppConstants.NIGHTLY_BUILD,
        task: async () => {
          // Register our sync engines.
          await lazy.WeaveService.whenLoaded();
          let Weave = lazy.WeaveService.Weave;

          for (let [moduleName, engineName] of [
            ["accounts", "AccountsEngine"],
            ["addressBooks", "AddressBooksEngine"],
            ["calendars", "CalendarsEngine"],
            ["identities", "IdentitiesEngine"],
          ]) {
            let ns = ChromeUtils.importESModule(
              `resource://services-sync/engines/${moduleName}.sys.mjs`
            );
            await Weave.Service.engineManager.register(ns[engineName]);
            Weave.Service.engineManager
              .get(moduleName.toLowerCase())
              .startTracking();
          }

          if (lazy.WeaveService.enabled) {
            // Schedule a sync (if enabled).
            Weave.Service.scheduler.autoConnect();
          }
        },
      },
      {
        condition: Services.prefs.getBoolPref("mail.chat.enabled"),
        task() {
          lazy.ChatCore.idleStart();
          ChromeUtils.importESModule("resource:///modules/index_im.sys.mjs");
        },
      },
      {
        condition: AppConstants.MOZ_UPDATER,
        task: () => {
          lazy.UpdateListener.maybeShowUnsupportedNotification();
        },
      },
      {
        task() {
          // Use idleDispatch a second time to run this after the per-window
          // idle tasks.
          ChromeUtils.idleDispatch(() => {
            Services.obs.notifyObservers(
              null,
              "mail-startup-idle-tasks-finished"
            );
          });
        },
      },
      // Do NOT add anything after idle tasks finished.
    ];

    for (let task of idleTasks) {
      if ("condition" in task && !task.condition) {
        continue;
      }

      ChromeUtils.idleDispatch(
        () => {
          if (!Services.startup.shuttingDown) {
            let startTime = Cu.now();
            try {
              task.task();
            } catch (ex) {
              console.error(ex);
            } finally {
              ChromeUtils.addProfilerMarker("startupIdleTask", startTime);
            }
          }
        },
        task.timeout ? { timeout: task.timeout } : undefined
      );
    }
  },

  /**
   * Use this function as an entry point to schedule tasks that we hope
   * to run once per session, at any arbitrary point in time, and which we
   * are okay with sometimes not running at all.
   *
   * This function will be called from an idle observer. Check the value of
   * LATE_TASKS_IDLE_TIME_SEC to see the current value for this idle
   * observer.
   *
   * Note: this function may never be called if the user is never idle for the
   * requisite time (LATE_TASKS_IDLE_TIME_SEC). Be certain before adding
   * something here that it's okay that it never be run.
   */
  _scheduleBestEffortUserIdleTasks() {
    const idleTasks = [
      // Certificates revocation list, etc.
      () => lazy.RemoteSecuritySettings.init(),
      // If we haven't already, ensure the address book manager is ready.
      // This must happen at some point so that CardDAV address books sync.
      () => lazy.MailServices.ab.directories,
      // Telemetry.
      async () => {
        lazy.OsEnvironment.reportAllowedAppSources();
        reportAccountTypes();
        reportAddressBookTypes();
        reportAccountSizes();
        await reportCalendars();
        reportPreferences();
        reportUIConfiguration();
      },
    ];

    for (let task of idleTasks) {
      ChromeUtils.idleDispatch(async () => {
        if (!Services.startup.shuttingDown) {
          let startTime = Cu.now();
          try {
            await task();
          } catch (ex) {
            console.error(ex);
          } finally {
            ChromeUtils.addProfilerMarker("startupLateIdleTask", startTime);
          }
        }
      });
    }
  },

  _handleLink(aSubject, aData) {
    let linkHandled = aSubject.QueryInterface(Ci.nsISupportsPRBool);
    if (!linkHandled.data) {
      let win = Services.wm.getMostRecentWindow("mail:3pane");
      aData = JSON.parse(aData);
      let tabParams = { url: aData.href, linkHandler: null };
      if (win) {
        let tabmail = win.document.getElementById("tabmail");
        if (tabmail) {
          tabmail.openTab("contentTab", tabParams);
          win.focus();
          linkHandled.data = true;
          return;
        }
      }

      // If we didn't have an open 3 pane window, try and open one.
      Services.ww.openWindow(
        null,
        "chrome://messenger/content/messenger.xhtml",
        "_blank",
        "chrome,dialog=no,all",
        {
          type: "contentTab",
          tabParams,
        }
      );
      linkHandled.data = true;
    }
  },

  // for XPCOM
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
};

/**
 * Report account types to telemetry. For im accounts, use `im_protocol` as
 * scalar key name.
 */
function reportAccountTypes() {
  // Init all count with 0, so that when an account was set up before but
  // removed now, we reset it in telemetry report.
  let report = {
    pop3: 0,
    imap: 0,
    nntp: 0,
    exchange: 0,
    rss: 0,
    im_gtalk: 0,
    im_irc: 0,
    im_jabber: 0,
    im_matrix: 0,
    im_odnoklassniki: 0,
  };

  const providerReport = {
    google: 0,
    microsoft: 0,
    yahoo_aol: 0,
    other: 0,
  };

  for (let account of lazy.MailServices.accounts.accounts) {
    const incomingServer = account.incomingServer;

    let type = incomingServer.type;
    if (type == "none") {
      // Reporting one Local Folders account is not that useful. Skip it.
      continue;
    }

    if (type === "im") {
      let protocol =
        incomingServer.wrappedJSObject.imAccount.protocol.normalizedName;
      type = `im_${protocol}`;
    }

    // It's still possible to report other types not explicitly specified due to
    // account types that used to exist, but no longer -- e.g. im_yahoo.
    if (!report[type]) {
      report[type] = 0;
    }

    report[type]++;

    // Collect a rough understanding of the frequency of various OAuth
    // providers.
    if (incomingServer.authMethod == Ci.nsMsgAuthMethod.OAuth2) {
      const hostnameDetails = lazy.OAuth2Providers.getHostnameDetails(
        incomingServer.hostName
      );

      if (!hostnameDetails || hostnameDetails.length == 0) {
        // Not a valid OAuth2 configuration; skip it
        continue;
      }

      const host = hostnameDetails[0];

      switch (host) {
        case "accounts.google.com":
          providerReport.google++;
          break;
        case "login.microsoftonline.com":
          providerReport.microsoft++;
          break;
        case "login.yahoo.com":
        case "login.aol.com":
          providerReport.yahoo_aol++;
          break;
        default:
          providerReport.other++;
      }
    }
  }

  for (let [type, count] of Object.entries(report)) {
    Services.telemetry.keyedScalarSet("tb.account.count", type, count);
  }

  for (const [provider, count] of Object.entries(providerReport)) {
    Services.telemetry.keyedScalarSet(
      "tb.account.oauth2_provider_count",
      provider,
      count
    );
  }
}

/**
 * Report size on disk and messages count of each type of folder to telemetry.
 */
function reportAccountSizes() {
  let keys = [
    "Inbox",
    "Drafts",
    "Trash",
    "SentMail",
    "Templates",
    "Junk",
    "Archive",
    "Queue",
  ];
  for (let key of keys) {
    Services.telemetry.keyedScalarSet("tb.account.total_messages", key, 0);
  }
  Services.telemetry.keyedScalarSet("tb.account.total_messages", "Other", 0);
  Services.telemetry.keyedScalarSet("tb.account.total_messages", "Total", 0);

  for (let server of lazy.MailServices.accounts.allServers) {
    if (
      server instanceof Ci.nsIPop3IncomingServer &&
      server.deferredToAccount
    ) {
      // Skip deferred accounts
      continue;
    }

    for (let folder of server.rootFolder.descendants) {
      let key =
        keys.find(x => folder.getFlag(Ci.nsMsgFolderFlags[x])) || "Other";
      let totalMessages = folder.getTotalMessages(false);
      if (totalMessages > 0) {
        Services.telemetry.keyedScalarAdd(
          "tb.account.total_messages",
          key,
          totalMessages
        );
        Services.telemetry.keyedScalarAdd(
          "tb.account.total_messages",
          "Total",
          totalMessages
        );
      }
      let sizeOnDisk = folder.sizeOnDisk;
      if (sizeOnDisk > 0) {
        Services.telemetry.keyedScalarAdd(
          "tb.account.size_on_disk",
          key,
          sizeOnDisk
        );
        Services.telemetry.keyedScalarAdd(
          "tb.account.size_on_disk",
          "Total",
          sizeOnDisk
        );
      }
    }
  }
}

/**
 * Report addressbook count and contact count to telemetry, keyed by addressbook
 * type. Type is one of ["jsaddrbook", "jscarddav", "moz-abldapdirectory"], see
 * AddrBookManager.jsm for more details.
 *
 * NOTE: We didn't use `dir.dirType` because it's just an integer, instead we
 * use the scheme of `dir.URI` as the type.
 */
function reportAddressBookTypes() {
  let report = {};
  for (let dir of lazy.MailServices.ab.directories) {
    let type = dir.URI.split(":")[0];

    if (!report[type]) {
      report[type] = { count: 0, contactCount: 0 };
    }
    report[type].count++;

    try {
      report[type].contactCount += dir.childCardCount;
    } catch (ex) {
      // Directories may throw NS_ERROR_NOT_IMPLEMENTED.
    }
  }

  for (let [type, { count, contactCount }] of Object.entries(report)) {
    Services.telemetry.keyedScalarSet(
      "tb.addressbook.addressbook_count",
      type,
      count
    );
    Services.telemetry.keyedScalarSet(
      "tb.addressbook.contact_count",
      type,
      contactCount
    );
  }
}

/**
 * A telemetry probe to report calendar count and read only calendar count.
 */
async function reportCalendars() {
  let telemetryReport = {};
  let home = lazy.cal.l10n.getCalString("homeCalendarName");

  for (let calendar of lazy.cal.manager.getCalendars()) {
    if (calendar.name == home && calendar.type == "storage") {
      // Ignore the "Home" calendar if it is disabled or unused as it's
      // automatically added.
      if (calendar.getProperty("disabled")) {
        continue;
      }
      let items = await calendar.getItemsAsArray(
        Ci.calICalendar.ITEM_FILTER_ALL_ITEMS,
        1,
        null,
        null
      );
      if (!items.length) {
        continue;
      }
    }
    if (!telemetryReport[calendar.type]) {
      telemetryReport[calendar.type] = { count: 0, readOnlyCount: 0 };
    }
    telemetryReport[calendar.type].count++;
    if (calendar.readOnly) {
      telemetryReport[calendar.type].readOnlyCount++;
    }
  }

  for (let [type, { count, readOnlyCount }] of Object.entries(
    telemetryReport
  )) {
    Services.telemetry.keyedScalarSet(
      "tb.calendar.calendar_count",
      type.toLowerCase(),
      count
    );
    Services.telemetry.keyedScalarSet(
      "tb.calendar.read_only_calendar_count",
      type.toLowerCase(),
      readOnlyCount
    );
  }
}

function reportPreferences() {
  let booleanPrefs = [
    // General
    "browser.cache.disk.smart_size.enabled",
    "privacy.clearOnShutdown.cache",
    "general.autoScroll",
    "general.smoothScroll",
    "intl.regional_prefs.use_os_locales",
    "layers.acceleration.disabled",
    "mail.biff.play_sound",
    "mail.close_message_window.on_delete",
    "mail.display_glyph",
    "mail.prompt_purge_threshhold",
    "mail.purge.ask",
    "mail.showCondensedAddresses",
    "mailnews.database.global.indexer.enabled",
    "mailnews.mark_message_read.auto",
    "mailnews.mark_message_read.delay",
    "mailnews.reuse_message_window",
    "mailnews.start_page.enabled",
    "searchintegration.enable",

    // Fonts
    "mail.fixed_width_messages",

    // Colors
    "browser.display.use_system_colors",
    "browser.underline_anchors",

    // Read receipts
    "mail.mdn.report.enabled",
    "mail.receipt.request_return_receipt_on",

    // Connection
    "network.proxy.share_proxy_settings",
    "network.proxy.socks_remote_dns",
    "pref.advanced.proxies.disable_button.reload",
    "signon.autologin.proxy",

    // Offline
    "offline.autoDetect",

    // Compose
    "ldap_2.autoComplete.useDirectory",
    "mail.collect_email_address_outgoing",
    "mail.compose.attachment_reminder",
    "mail.compose.autosave",
    "mail.compose.big_attachments.notify",
    "mail.compose.default_to_paragraph",
    "mail.e2ee.auto_enable",
    "mail.e2ee.auto_disable",
    "mail.e2ee.notify_on_auto_disable",
    "mail.enable_autocomplete",
    "mail.forward_add_extension",
    "mail.SpellCheckBeforeSend",
    "mail.spellcheck.inline",
    "mail.warn_on_send_accel_key",
    "msgcompose.default_colors",
    "pref.ldap.disable_button.edit_directories",

    // Send options
    "mailnews.sendformat.auto_downgrade",

    // Privacy
    "browser.safebrowsing.enabled",
    "mail.phishing.detection.enabled",
    "mail.spam.logging.enabled",
    "mail.spam.manualMark",
    "mail.spam.markAsReadOnSpam",
    "mailnews.downloadToTempFile",
    "mailnews.message_display.disable_remote_image",
    "network.cookie.blockFutureCookies",
    "places.history.enabled",
    "pref.privacy.disable_button.cookie_exceptions",
    "pref.privacy.disable_button.view_cookies",
    "pref.privacy.disable_button.view_passwords",
    "privacy.donottrackheader.enabled",
    "security.disable_button.openCertManager",
    "security.disable_button.openDeviceManager",

    // Chat
    "messenger.options.getAttentionOnNewMessages",
    "messenger.status.reportIdle",
    "messenger.status.awayWhenIdle",
    "mail.chat.enabled",
    "mail.chat.play_sound",
    "mail.chat.show_desktop_notifications",
    "purple.conversations.im.send_typing",
    "purple.logging.log_chats",
    "purple.logging.log_ims",
    "purple.logging.log_system",

    // Calendar views
    "calendar.view.showLocation",
    "calendar.view-minimonth.showWeekNumber",
    "calendar.week.d0sundaysoff",
    "calendar.week.d1mondaysoff",
    "calendar.week.d2tuesdaysoff",
    "calendar.week.d3wednesdaysoff",
    "calendar.week.d4thursdaysoff",
    "calendar.week.d5fridaysoff",
    "calendar.week.d6saturdaysoff",

    // Calendar general
    "calendar.item.editInTab",
    "calendar.item.promptDelete",
    "calendar.timezone.useSystemTimezone",

    // Alarms
    "calendar.alarms.playsound",
    "calendar.alarms.show",
    "calendar.alarms.showmissed",

    // Unlisted
    "mail.operate_on_msgs_in_collapsed_threads",
  ];

  let integerPrefs = [
    // Mail UI
    "mail.pane_config.dynamic",
    "mail.ui.display.dateformat.default",
    "mail.ui.display.dateformat.thisweek",
    "mail.ui.display.dateformat.today",
  ];

  // Platform-specific preferences
  if (AppConstants.platform === "win") {
    booleanPrefs.push("mail.biff.show_tray_icon", "mail.minimizeToTray");
  }

  if (AppConstants.platform !== "macosx") {
    booleanPrefs.push(
      "mail.biff.show_alert",
      "mail.biff.use_system_alert",

      // Notifications
      "mail.biff.alert.show_preview",
      "mail.biff.alert.show_sender",
      "mail.biff.alert.show_subject"
    );
  }

  // Compile-time flag-dependent preferences
  if (AppConstants.HAVE_SHELL_SERVICE) {
    booleanPrefs.push("mail.shell.checkDefaultClient");
  }

  if (AppConstants.MOZ_WIDGET_GTK) {
    booleanPrefs.push("widget.gtk.overlay-scrollbars.enabled");
  }

  if (AppConstants.MOZ_MAINTENANCE_SERVICE) {
    booleanPrefs.push("app.update.service.enabled");
  }

  if (AppConstants.MOZ_DATA_REPORTING) {
    booleanPrefs.push("datareporting.healthreport.uploadEnabled");
  }

  if (AppConstants.MOZ_CRASHREPORTER) {
    booleanPrefs.push("browser.crashReports.unsubmittedCheck.autoSubmit2");
  }

  // Fetch and report preference values
  for (let prefName of booleanPrefs) {
    let prefValue = Services.prefs.getBoolPref(prefName, false);

    Services.telemetry.keyedScalarSet(
      "tb.preferences.boolean",
      prefName,
      prefValue
    );
  }

  for (let prefName of integerPrefs) {
    let prefValue = Services.prefs.getIntPref(prefName, 0);

    Services.telemetry.keyedScalarSet(
      "tb.preferences.integer",
      prefName,
      prefValue
    );
  }
}

function reportUIConfiguration() {
  let docURL = "chrome://messenger/content/messenger.xhtml";

  let folderTreeMode = Services.xulStore.getValue(docURL, "folderTree", "mode");
  if (folderTreeMode) {
    let folderTreeCompact = Services.xulStore.getValue(
      docURL,
      "folderTree",
      "compact"
    );
    if (folderTreeCompact === "true") {
      folderTreeMode += " (compact)";
    }
    Services.telemetry.scalarSet(
      "tb.ui.configuration.folder_tree_modes",
      folderTreeMode
    );
  }

  let headerLayout = Services.xulStore.getValue(
    docURL,
    "messageHeader",
    "layout"
  );
  if (headerLayout) {
    headerLayout = JSON.parse(headerLayout);
    for (let [key, value] of Object.entries(headerLayout)) {
      if (key == "buttonStyle") {
        value = { default: 0, "only-icons": 1, "only-text": 2 }[value];
      }
      Services.telemetry.keyedScalarSet(
        "tb.ui.configuration.message_header",
        key,
        value
      );
    }
  }
}

/**
 * Export these functions so we can test them. This object shouldn't be
 * accessed outside of a test (hence the name).
 */
var MailTelemetryForTests = {
  reportAccountTypes,
  reportAccountSizes,
  reportAddressBookTypes,
  reportCalendars,
  reportPreferences,
  reportUIConfiguration,
};
