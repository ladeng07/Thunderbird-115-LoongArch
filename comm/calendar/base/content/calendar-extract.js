/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals getMessagePaneBrowser, gFolderDisplay, addMenuItem, getSelectedCalendar
   createEventWithDialog*/

var { Extractor } = ChromeUtils.import("resource:///modules/calendar/calExtract.jsm");
var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");

XPCOMUtils.defineLazyModuleGetters(this, {
  CalEvent: "resource:///modules/CalEvent.jsm",
  CalTodo: "resource:///modules/CalTodo.jsm",
});

XPCOMUtils.defineLazyGetter(this, "extractService", () => {
  const { CalExtractParserService } = ChromeUtils.import(
    "resource:///modules/calendar/extract/CalExtractParserService.jsm"
  );
  return new CalExtractParserService();
});

var calendarExtract = {
  onShowLocaleMenu(target) {
    let localeList = document.getElementById(target.id);
    let langs = [];
    let chrome = Cc["@mozilla.org/chrome/chrome-registry;1"]
      .getService(Ci.nsIXULChromeRegistry)
      .QueryInterface(Ci.nsIToolkitChromeRegistry);
    let langRegex = /^(([^-]+)-*(.*))$/;

    for (let locale of chrome.getLocalesForPackage("calendar")) {
      let localeParts = langRegex.exec(locale);
      let langName = localeParts[2];

      try {
        langName = cal.l10n.getAnyString("global", "languageNames", langName);
      } catch (ex) {
        // If no language name is found that is ok, keep the technical term
      }

      let label = cal.l10n.getCalString("extractUsing", [langName]);
      if (localeParts[3] != "") {
        label = cal.l10n.getCalString("extractUsingRegion", [langName, localeParts[3]]);
      }

      langs.push([label, localeParts[1]]);
    }

    // sort
    let pref = "calendar.patterns.last.used.languages";
    let lastUsedLangs = Services.prefs.getStringPref(pref, "");

    langs.sort((a, b) => {
      let idx_a = lastUsedLangs.indexOf(a[1]);
      let idx_b = lastUsedLangs.indexOf(b[1]);

      if (idx_a == -1 && idx_b == -1) {
        return a[0].localeCompare(b[0]);
      } else if (idx_a != -1 && idx_b != -1) {
        return idx_a - idx_b;
      } else if (idx_a == -1) {
        return 1;
      }
      return -1;
    });
    while (localeList.lastChild) {
      localeList.lastChild.remove();
    }

    for (let lang of langs) {
      addMenuItem(localeList, lang[0], lang[1], null);
    }
  },

  extractWithLocale(event, isEvent) {
    event.stopPropagation();
    let locale = event.target.value;
    this.extractFromEmail(isEvent, true, locale);
  },

  async extractFromEmail(isEvent, fixedLang, fixedLocale) {
    // Get the message from the 3pane, or from the standalone message window.
    let aboutMessage =
      document.getElementById("tabmail")?.currentAboutMessage ||
      document.getElementById("messageBrowser").contentWindow;
    let message = aboutMessage.gMessage;
    let folder = message.folder;
    let title = message.mime2DecodedSubject;

    let content = "";
    await new Promise((resolve, reject) => {
      let listener = {
        QueryInterface: ChromeUtils.generateQI(["nsIStreamListener"]),
        onDataAvailable(request, inputStream, offset, count) {
          let text = folder.getMsgTextFromStream(
            inputStream,
            message.charset,
            count, // bytesToRead
            32768, // maxOutputLen
            false, // compressQuotes
            true, // stripHTMLTags
            {} // out contentType
          );
          // If we ever got text, we're good. Ignore further chunks.
          content ||= text;
        },
        onStartRequest(request) {},
        onStopRequest(request, statusCode) {
          if (!Components.isSuccessCode(statusCode)) {
            reject(new Error(statusCode));
          }
          resolve();
        },
      };
      let uri = message.folder.getUriForMsg(message);
      MailServices.messageServiceFromURI(uri).streamMessage(uri, listener, null, null, false, "");
    });

    cal.LOG("[calExtract] Original email content: \n" + title + "\r\n" + content);
    let date = new Date(message.date / 1000);
    let time = new Date().getTime();

    let item;
    item = isEvent ? new CalEvent() : new CalTodo();
    item.title = message.mime2DecodedSubject;
    item.calendar = getSelectedCalendar();
    item.setProperty("DESCRIPTION", content);
    item.setProperty("URL", `mid:${message.messageId}`);
    cal.dtz.setDefaultStartEndHour(item);
    cal.alarms.setDefaultValues(item);
    let sel = aboutMessage.getMessagePaneBrowser().contentWindow.getSelection();
    // Thunderbird Conversations might be installed
    if (sel === null) {
      try {
        sel = document
          .getElementById("multimessage")
          .contentDocument.querySelector(".iframe-container iframe")
          .contentDocument.getSelection();
      } catch (ex) {
        // If Thunderbird Conversations is not installed that is fine,
        // we will just have a null selection.
      }
    }

    let guessed;
    let endGuess;
    let extractor;
    let collected = [];
    let useService = Services.prefs.getBoolPref("calendar.extract.service.enabled");
    if (useService) {
      let result = extractService.extract(content, { now: date });
      if (!result) {
        useService = false;
      } else {
        guessed = result.startTime;
        endGuess = result.endTime;
      }
    }

    if (!useService) {
      let locale = Services.locale.requestedLocale;
      let dayStart = Services.prefs.getIntPref("calendar.view.daystarthour", 6);
      if (fixedLang) {
        extractor = new Extractor(fixedLocale, dayStart);
      } else {
        extractor = new Extractor(locale, dayStart, false);
      }
      collected = extractor.extract(title, content, date, sel);
    }

    // if we only have email date then use default start and end
    if (!useService && collected.length <= 1) {
      cal.LOG("[calExtract] Date and time information was not found in email/selection.");
      createEventWithDialog(null, null, null, null, item);
    } else {
      if (!useService) {
        guessed = extractor.guessStart(!isEvent);
        endGuess = extractor.guessEnd(guessed, !isEvent);
      }
      let allDay = (guessed.hour == null || guessed.minute == null) && isEvent;

      if (isEvent) {
        if (guessed.year != null) {
          item.startDate.year = guessed.year;
        }
        if (guessed.month != null) {
          item.startDate.month = guessed.month - 1;
        }
        if (guessed.day != null) {
          item.startDate.day = guessed.day;
        }
        if (guessed.hour != null) {
          item.startDate.hour = guessed.hour;
        }
        if (guessed.minute != null) {
          item.startDate.minute = guessed.minute;
        }

        item.endDate = item.startDate.clone();
        item.endDate.minute += Services.prefs.getIntPref("calendar.event.defaultlength", 60);

        if (endGuess.year != null) {
          item.endDate.year = endGuess.year;
        }
        if (endGuess.month != null) {
          item.endDate.month = endGuess.month - 1;
        }
        if (endGuess.day != null) {
          item.endDate.day = endGuess.day;
          if (allDay) {
            item.endDate.day++;
          }
        }
        if (endGuess.hour != null) {
          item.endDate.hour = endGuess.hour;
        }
        if (endGuess.minute != null) {
          item.endDate.minute = endGuess.minute;
        }
      } else {
        let dtz = cal.dtz.defaultTimezone;
        let dueDate = new Date();
        // set default
        dueDate.setHours(0);
        dueDate.setMinutes(0);
        dueDate.setSeconds(0);

        if (endGuess.year != null) {
          dueDate.setYear(endGuess.year);
        }
        if (endGuess.month != null) {
          dueDate.setMonth(endGuess.month - 1);
        }
        if (endGuess.day != null) {
          dueDate.setDate(endGuess.day);
        }
        if (endGuess.hour != null) {
          dueDate.setHours(endGuess.hour);
        }
        if (endGuess.minute != null) {
          dueDate.setMinutes(endGuess.minute);
        }

        cal.item.setItemProperty(item, "entryDate", cal.dtz.jsDateToDateTime(date, dtz));
        if (endGuess.year != null) {
          cal.item.setItemProperty(item, "dueDate", cal.dtz.jsDateToDateTime(dueDate, dtz));
        }
      }

      // if time not guessed set allday for events
      if (allDay) {
        createEventWithDialog(null, null, null, null, item, true);
      } else {
        createEventWithDialog(null, null, null, null, item);
      }
    }

    let timeSpent = new Date().getTime() - time;
    cal.LOG(
      "[calExtract] Total time spent for conversion (including loading of dictionaries): " +
        timeSpent +
        "ms"
    );
  },

  addListeners() {
    if (window.top.document.location == "chrome://messenger/content/messenger.xhtml") {
      // covers initial load and folder change
      let folderTree = document.getElementById("folderTree");
      folderTree.addEventListener("select", this.setState);

      // covers selection change in a folder
      let msgTree = window.top.GetThreadTree();
      msgTree.addEventListener("select", this.setState);

      window.addEventListener("unload", () => {
        folderTree.removeEventListener("select", this.setState);
        msgTree.removeEventListener("select", this.setState);
      });
    }
  },

  setState() {
    let eventButton = document.getElementById("extractEventButton");
    let taskButton = document.getElementById("extractTaskButton");
    let contextMenu = document.getElementById("mailContext-calendar-convert-menu");
    let contextMenuEvent = document.getElementById("mailContext-calendar-convert-event-menuitem");
    let contextMenuTask = document.getElementById("mailContext-calendar-convert-task-menuitem");
    let eventDisabled = gFolderDisplay.selectedCount == 0;
    let taskDisabled = gFolderDisplay.selectedCount == 0;
    let contextEventDisabled = false;
    let contextTaskDisabled = false;
    let newEvent = document.getElementById("calendar_new_event_command");
    let newTask = document.getElementById("calendar_new_todo_command");

    if (newEvent.getAttribute("disabled") == "true") {
      eventDisabled = true;
      contextEventDisabled = true;
    }

    if (newTask.getAttribute("disabled") == "true") {
      taskDisabled = true;
      contextTaskDisabled = true;
    }

    if (eventButton) {
      eventButton.disabled = eventDisabled;
    }
    if (taskButton) {
      taskButton.disabled = taskDisabled;
    }

    contextMenuEvent.disabled = contextEventDisabled;
    contextMenuTask.disabled = contextTaskDisabled;

    contextMenu.disabled = contextEventDisabled && contextTaskDisabled;
  },
};

// TODO: Fix and reinstate this.
// window.addEventListener("load", calendarExtract.addListeners.bind(calendarExtract));
