/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/* This test records at which phase of startup the JS modules are first
 * loaded.
 * If you made changes that cause this test to fail, it's likely because you
 * are loading more JS code during startup.
 * Most code has no reason to run off of the app-startup notification
 * (this is very early, before we have selected the user profile, so
 *  preferences aren't accessible yet).
 * If your code isn't strictly required to show the first browser window,
 * it shouldn't be loaded before we are done with first paint.
 * Finally, if your code isn't really needed during startup, it should not be
 * loaded before we have started handling user events.
 */

"use strict";

/* Set this to true only for debugging purpose; it makes the output noisy. */
const kDumpAllStacks = false;

const startupPhases = {
  // For app-startup, we have an allowlist of acceptable JS files.
  // Anything loaded during app-startup must have a compelling reason
  // to run before we have even selected the user profile.
  // Consider loading your code after first paint instead,
  // eg. from MailGlue.jsm' _onFirstWindowLoaded method).
  "before profile selection": {
    allowlist: {
      modules: new Set([
        "resource:///modules/MailGlue.jsm",
        "resource:///modules/StartupRecorder.jsm",
        "resource://gre/modules/ActorManagerParent.sys.mjs",
        "resource://gre/modules/AppConstants.sys.mjs",
        "resource://gre/modules/CustomElementsListener.sys.mjs",
        "resource://gre/modules/MainProcessSingleton.sys.mjs",
        "resource://gre/modules/XPCOMUtils.sys.mjs",
      ]),
    },
  },

  // For the following phases of startup we have only a list of files that
  // are **not** allowed to load in this phase, as too many other scripts
  // load during this time.

  // We are at this phase after creating the first browser window (ie. after final-ui-startup).
  "before opening first browser window": {
    denylist: {
      modules: new Set([
        "chrome://openpgp/content/modules/constants.jsm",
        "resource:///modules/IMServices.sys.mjs",
        "resource:///modules/imXPCOMUtils.sys.mjs",
        "resource:///modules/jsProtoHelper.sys.mjs",
        "resource:///modules/logger.sys.mjs",
        "resource:///modules/MailNotificationManager.jsm",
        "resource:///modules/MailNotificationService.jsm",
        "resource:///modules/MsgIncomingServer.jsm",
      ]),
      services: new Set([
        "@mozilla.org/chat/logger;1",
        "@mozilla.org/mail/notification-manager;1",
        "@mozilla.org/newMailNotificationService;1",
      ]),
    },
  },

  // We reach this phase right after showing the first browser window.
  // This means that anything already loaded at this point has been loaded
  // before first paint and delayed it.
  "before first paint": {
    denylist: {
      modules: new Set([
        "chrome://openpgp/content/BondOpenPGP.jsm",
        "chrome://openpgp/content/modules/core.jsm",
        "resource:///modules/index_im.sys.mjs",
        "resource:///modules/MsgDBCacheManager.jsm",
        "resource:///modules/PeriodicFilterManager.jsm",
        "resource://gre/modules/Blocklist.sys.mjs",
        "resource://gre/modules/NewTabUtils.sys.mjs",
        "resource://gre/modules/Sqlite.sys.mjs",
        // Bug 1660907: These core modules shouldn't really be being loaded
        // until sometime after first paint.
        // "resource://gre/modules/PlacesUtils.sys.mjs",
        // "resource://gre/modules/Preferences.jsm",
        // These can probably be pushed back even further.
      ]),
      services: new Set([
        "@mozilla.org/browser/search-service;1",
        "@mozilla.org/msgDatabase/msgDBService;1",
      ]),
    },
  },

  // We are at this phase once we are ready to handle user events.
  // Anything loaded at this phase or before gets in the way of the user
  // interacting with the first mail window.
  "before handling user events": {
    denylist: {
      modules: new Set([
        "resource:///modules/gloda/Everybody.jsm",
        "resource:///modules/gloda/Gloda.jsm",
        "resource:///modules/gloda/GlodaContent.jsm",
        "resource:///modules/gloda/GlodaDatabind.jsm",
        "resource:///modules/gloda/GlodaDataModel.jsm",
        "resource:///modules/gloda/GlodaDatastore.jsm",
        "resource:///modules/gloda/GlodaExplicitAttr.jsm",
        "resource:///modules/gloda/GlodaFundAttr.jsm",
        "resource:///modules/gloda/GlodaMsgIndexer.jsm",
        "resource:///modules/gloda/GlodaPublic.jsm",
        "resource:///modules/gloda/GlodaQueryClassFactory.jsm",
        "resource:///modules/gloda/GlodaUtils.jsm",
        "resource:///modules/gloda/IndexMsg.jsm",
        "resource:///modules/gloda/MimeMessage.jsm",
        "resource:///modules/gloda/NounFreetag.jsm",
        "resource:///modules/gloda/NounMimetype.jsm",
        "resource:///modules/gloda/NounTag.jsm",
        "resource:///modules/index_im.sys.mjs",
        "resource:///modules/jsmime.jsm",
        "resource:///modules/MimeJSComponents.jsm",
        "resource:///modules/mimeParser.jsm",
        "resource://gre/modules/BookmarkHTMLUtils.sys.mjs",
        "resource://gre/modules/Bookmarks.sys.mjs",
        "resource://gre/modules/ContextualIdentityService.sys.mjs",
        "resource://gre/modules/CrashSubmit.sys.mjs",
        "resource://gre/modules/FxAccounts.sys.mjs",
        "resource://gre/modules/FxAccountsStorage.sys.mjs",
        "resource://gre/modules/PlacesBackups.sys.mjs",
        "resource://gre/modules/PlacesSyncUtils.sys.mjs",
        "resource://gre/modules/PushComponents.jsm",
      ]),
      services: new Set([
        "@mozilla.org/browser/annotation-service;1",
        "@mozilla.org/browser/nav-bookmarks-service;1",
        "@mozilla.org/messenger/filter-plugin;1?name=bayesianfilter",
        "@mozilla.org/messenger/fts3tokenizer;1",
        "@mozilla.org/messenger/headerparser;1",
      ]),
    },
  },

  // Things that are expected to be completely out of the startup path
  // and loaded lazily when used for the first time by the user should
  // be listed here.
  "before becoming idle": {
    denylist: {
      modules: new Set([
        "resource:///modules/AddrBookManager.jsm",
        "resource:///modules/DisplayNameUtils.jsm",
        "resource:///modules/gloda/Facet.jsm",
        "resource:///modules/gloda/GlodaMsgSearcher.jsm",
        "resource:///modules/gloda/SuffixTree.jsm",
        "resource:///modules/GlodaAutoComplete.jsm",
        "resource:///modules/ImapIncomingServer.jsm",
        "resource:///modules/ImapMessageMessageService.jsm",
        "resource:///modules/ImapMessageService.jsm",
        // Skipped due to the way ImapModuleLoader and registerProtocolHandler
        // works, uncomment once ImapModuleLoader is removed and imap-js becomes
        // the only IMAP implemention.
        // "resource:///modules/ImapProtocolHandler.jsm",
        "resource:///modules/ImapService.jsm",
        "resource:///modules/NntpIncomingServer.jsm",
        "resource:///modules/NntpMessageService.jsm",
        "resource:///modules/NntpProtocolHandler.jsm",
        "resource:///modules/NntpProtocolInfo.jsm",
        "resource:///modules/NntpService.jsm",
        "resource:///modules/Pop3IncomingServer.jsm",
        "resource:///modules/Pop3ProtocolHandler.jsm",
        "resource:///modules/Pop3ProtocolInfo.jsm",
        // "resource:///modules/Pop3Service.jsm",
        "resource:///modules/SmtpClient.jsm",
        "resource:///modules/SMTPProtocolHandler.jsm",
        "resource:///modules/SmtpServer.jsm",
        "resource:///modules/SmtpService.jsm",
        "resource:///modules/TemplateUtils.jsm",
        "resource://gre/modules/AsyncPrefs.sys.mjs",
        "resource://gre/modules/LoginManagerContextMenu.jsm",
        "resource://pdf.js/PdfStreamConverter.jsm",
      ]),
      services: new Set(["@mozilla.org/autocomplete/search;1?name=gloda"]),
    },
  },
};

add_task(async function () {
  if (
    !AppConstants.NIGHTLY_BUILD &&
    !AppConstants.MOZ_DEV_EDITION &&
    !AppConstants.DEBUG
  ) {
    ok(
      !("@mozilla.org/test/startuprecorder;1" in Cc),
      "the startup recorder component shouldn't exist in this non-nightly/non-devedition/" +
        "non-debug build."
    );
    return;
  }

  let startupRecorder =
    Cc["@mozilla.org/test/startuprecorder;1"].getService().wrappedJSObject;
  await startupRecorder.done;

  let data = Cu.cloneInto(startupRecorder.data.code, {});
  function getStack(scriptType, name) {
    if (scriptType == "modules") {
      return Cu.getModuleImportStack(name);
    }
    return "";
  }

  // This block only adds debug output to help find the next bugs to file,
  // it doesn't contribute to the actual test.
  SimpleTest.requestCompleteLog();
  let previous;
  for (let phase in data) {
    for (let scriptType in data[phase]) {
      for (let f of data[phase][scriptType].sort()) {
        // phases are ordered, so if a script wasn't loaded yet at the immediate
        // previous phase, it wasn't loaded during any of the previous phases
        // either, and is new in the current phase.
        if (!previous || !data[previous][scriptType].includes(f)) {
          info(`${scriptType} loaded ${phase}: ${f}`);
          if (kDumpAllStacks) {
            info(getStack(scriptType, f));
          }
        }
      }
    }
    previous = phase;
  }

  for (let phase in startupPhases) {
    let loadedList = data[phase];
    let allowlist = startupPhases[phase].allowlist || null;
    if (allowlist) {
      for (let scriptType in allowlist) {
        loadedList[scriptType] = loadedList[scriptType].filter(c => {
          if (!allowlist[scriptType].has(c)) {
            return true;
          }
          allowlist[scriptType].delete(c);
          return false;
        });
        is(
          loadedList[scriptType].length,
          0,
          `should have no unexpected ${scriptType} loaded ${phase}`
        );
        for (let script of loadedList[scriptType]) {
          let message = `unexpected ${scriptType}: ${script}`;
          record(false, message, undefined, getStack(scriptType, script));
        }
        is(
          allowlist[scriptType].size,
          0,
          `all ${scriptType} allowlist entries should have been used`
        );
        for (let script of allowlist[scriptType]) {
          ok(false, `unused ${scriptType} allowlist entry: ${script}`);
        }
      }
    }
    let denylist = startupPhases[phase].denylist || null;
    if (denylist) {
      for (let scriptType in denylist) {
        for (let file of denylist[scriptType]) {
          let loaded = loadedList[scriptType].includes(file);
          let message = `${file} is not allowed ${phase}`;
          if (!loaded) {
            ok(true, message);
          } else {
            record(false, message, undefined, getStack(scriptType, file));
          }
        }
      }
    }
  }
});
