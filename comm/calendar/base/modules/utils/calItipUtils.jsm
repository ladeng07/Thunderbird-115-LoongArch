/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Scheduling and iTIP helper code
 */

// NOTE: This module should not be loaded directly, it is available when
// including calUtils.jsm under the cal.itip namespace.

const EXPORTED_SYMBOLS = ["calitip"];

var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { calendarDeactivator } = ChromeUtils.import(
  "resource:///modules/calendar/calCalendarDeactivator.jsm"
);
var { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");

const lazy = {};
XPCOMUtils.defineLazyModuleGetters(lazy, {
  CalAttendee: "resource:///modules/CalAttendee.jsm",
  CalRelation: "resource:///modules/CalRelation.jsm",
  CalItipDefaultEmailTransport: "resource:///modules/CalItipEmailTransport.jsm",
  CalItipMessageSender: "resource:///modules/CalItipMessageSender.jsm",
  CalItipOutgoingMessage: "resource:///modules/CalItipOutgoingMessage.jsm",
});
ChromeUtils.defineModuleGetter(lazy, "cal", "resource:///modules/calendar/calUtils.jsm");

var calitip = {
  /**
   * Gets the sequence/revision number, either of the passed item or the last received one of an
   * attendee; see <http://tools.ietf.org/html/draft-desruisseaux-caldav-sched-04#section-7.1>.
   *
   * @param {calIAttendee|calIItemBase} aItem - The item or attendee to get the sequence info
   *                                                from.
   * @returns {number} The sequence number
   */
  getSequence(aItem) {
    let seq = null;

    if (calitip.isAttendee(aItem)) {
      seq = aItem.getProperty("RECEIVED-SEQUENCE");
    } else if (aItem) {
      // Unless the below is standardized, we store the last original
      // REQUEST/PUBLISH SEQUENCE in X-MOZ-RECEIVED-SEQUENCE to test against it
      // when updates come in:
      seq = aItem.getProperty("X-MOZ-RECEIVED-SEQUENCE");
      if (seq === null) {
        seq = aItem.getProperty("SEQUENCE");
      }

      // Make sure we don't have a pre Outlook 2007 appointment, but if we do
      // use Microsoft's Sequence number. I <3 MS
      if (seq === null || seq == "0") {
        seq = aItem.getProperty("X-MICROSOFT-CDO-APPT-SEQUENCE");
      }
    }

    if (seq === null) {
      return 0;
    }
    seq = parseInt(seq, 10);
    return isNaN(seq) ? 0 : seq;
  },

  /**
   * Gets the stamp date-time, either of the passed item or the last received one of an attendee;
   * see <http://tools.ietf.org/html/draft-desruisseaux-caldav-sched-04#section-7.2>.
   *
   * @param {calIAttendee|calIItemBase} aItem - The item or attendee to retrieve the stamp from
   * @returns {calIDateTime} The timestamp for the item
   */
  getStamp(aItem) {
    let dtstamp = null;

    if (calitip.isAttendee(aItem)) {
      let stamp = aItem.getProperty("RECEIVED-DTSTAMP");
      if (stamp) {
        dtstamp = lazy.cal.createDateTime(stamp);
      }
    } else if (aItem) {
      // Unless the below is standardized, we store the last original
      // REQUEST/PUBLISH DTSTAMP in X-MOZ-RECEIVED-DTSTAMP to test against it
      // when updates come in:
      let stamp = aItem.getProperty("X-MOZ-RECEIVED-DTSTAMP");
      if (stamp) {
        dtstamp = lazy.cal.createDateTime(stamp);
      } else {
        // xxx todo: are there similar X-MICROSOFT-CDO properties to be considered here?
        dtstamp = aItem.stampTime;
      }
    }

    return dtstamp;
  },

  /**
   * Compares sequences and/or stamps of two items
   *
   * @param {calIItemBase|calIAttendee} aItem1 - The first item to compare
   * @param {calIItemBase|calIAttendee} aItem2 - The second item to compare
   * @returns {number} +1 if item2 is newer, -1 if item1 is newer
   *                                                    or 0 if both are equal
   */
  compare(aItem1, aItem2) {
    let comp = calitip.compareSequence(aItem1, aItem2);
    if (comp == 0) {
      comp = calitip.compareStamp(aItem1, aItem2);
    }
    return comp;
  },

  /**
   * Compares sequences of two items
   *
   * @param {calIItemBase|calIAttendee} aItem1 - The first item to compare
   * @param {calIItemBase|calIAttendee} aItem2 - The second item to compare
   * @returns {number} +1 if item2 is newer, -1 if item1 is newer
   *                                                    or 0 if both are equal
   */
  compareSequence(aItem1, aItem2) {
    let seq1 = calitip.getSequence(aItem1);
    let seq2 = calitip.getSequence(aItem2);
    if (seq1 > seq2) {
      return 1;
    } else if (seq1 < seq2) {
      return -1;
    }
    return 0;
  },

  /**
   * Compares stamp of two items
   *
   * @param {calIItemBase|calIAttendee} aItem1 - The first item to compare
   * @param {calIItemBase|calIAttendee} aItem2 - The second item to compare
   * @returns {number} +1 if item2 is newer, -1 if item1 is newer
   *                                                    or 0 if both are equal
   */
  compareStamp(aItem1, aItem2) {
    let st1 = calitip.getStamp(aItem1);
    let st2 = calitip.getStamp(aItem2);
    if (st1 && st2) {
      return st1.compare(st2);
    } else if (!st1 && st2) {
      return -1;
    } else if (st1 && !st2) {
      return 1;
    }
    return 0;
  },

  /**
   * Creates an organizer calIAttendee object based on the calendar's configured organizer id.
   *
   * @param {calICalendar} aCalendar - The calendar to get the organizer id from
   * @returns {calIAttendee} The organizer attendee
   */
  createOrganizer(aCalendar) {
    let orgId = aCalendar.getProperty("organizerId");
    if (!orgId) {
      return null;
    }
    let organizer = new lazy.CalAttendee();
    organizer.id = orgId;
    organizer.commonName = aCalendar.getProperty("organizerCN");
    organizer.role = "REQ-PARTICIPANT";
    organizer.participationStatus = "ACCEPTED";
    organizer.isOrganizer = true;
    return organizer;
  },

  /**
   * Checks if the given calendar is a scheduling calendar. This means it
   * needs an organizer id and an itip transport. It should also be writable.
   *
   * @param {calICalendar} aCalendar - The calendar to check
   * @returns {boolean} True, if its a scheduling calendar.
   */
  isSchedulingCalendar(aCalendar) {
    return (
      lazy.cal.acl.isCalendarWritable(aCalendar) &&
      aCalendar.getProperty("organizerId") &&
      aCalendar.getProperty("itip.transport")
    );
  },

  /**
   * Scope: iTIP message receiver
   *
   * Given an nsIMsgDBHdr and an imipMethod, set up the given itip item.
   *
   * @param {calIItemBase} itipItem - The item to set up
   * @param {string} imipMethod - The received imip method
   * @param {nsIMsgDBHdr} aMsgHdr - Information about the received email
   */
  initItemFromMsgData(itipItem, imipMethod, aMsgHdr) {
    // set the sender of the itip message
    itipItem.sender = calitip.getMessageSender(aMsgHdr);

    // Get the recipient identity and save it with the itip item.
    itipItem.identity = calitip.getMessageRecipient(aMsgHdr);

    // We are only called upon receipt of an invite, so ensure that isSend
    // is false.
    itipItem.isSend = false;

    // XXX Get these from preferences
    itipItem.autoResponse = Ci.calIItipItem.USER;

    if (imipMethod && imipMethod.length != 0 && imipMethod.toLowerCase() != "nomethod") {
      itipItem.receivedMethod = imipMethod.toUpperCase();
    } else {
      // There is no METHOD in the content-type header (spec violation).
      // Fall back to using the one from the itipItem's ICS.
      imipMethod = itipItem.receivedMethod;
    }
    lazy.cal.LOG("iTIP method: " + imipMethod);

    let isWritableCalendar = function (aCalendar) {
      /* TODO: missing ACL check for existing items (require callback API) */
      return (
        calitip.isSchedulingCalendar(aCalendar) && lazy.cal.acl.userCanAddItemsToCalendar(aCalendar)
      );
    };

    let writableCalendars = lazy.cal.manager.getCalendars().filter(isWritableCalendar);
    if (writableCalendars.length > 0) {
      let compCal = Cc["@mozilla.org/calendar/calendar;1?type=composite"].createInstance(
        Ci.calICompositeCalendar
      );
      writableCalendars.forEach(compCal.addCalendar, compCal);
      itipItem.targetCalendar = compCal;
    }
  },

  /**
   * Scope: iTIP message receiver
   *
   * Gets the suggested text to be shown when an imip item has been processed.
   * This text is ready localized and can be displayed to the user.
   *
   * @param {number} aStatus - The status of the processing (i.e NS_OK, an error code)
   * @param {number} aOperationType - An operation type from calIOperationListener
   * @returns {string} The suggested text.
   */
  getCompleteText(aStatus, aOperationType) {
    let text = "";
    const cIOL = Ci.calIOperationListener;
    if (Components.isSuccessCode(aStatus)) {
      switch (aOperationType) {
        case cIOL.ADD:
          text = lazy.cal.l10n.getLtnString("imipAddedItemToCal2");
          break;
        case cIOL.MODIFY:
          text = lazy.cal.l10n.getLtnString("imipUpdatedItem2");
          break;
        case cIOL.DELETE:
          text = lazy.cal.l10n.getLtnString("imipCanceledItem2");
          break;
      }
    } else {
      text = lazy.cal.l10n.getLtnString("imipBarProcessingFailed", [aStatus.toString(16)]);
    }
    return text;
  },

  /**
   * Scope: iTIP message receiver
   *
   * Gets a text describing the given itip method. The text is of the form
   * "This Message contains a ... ".
   *
   * @param {string} method - The method to describe.
   * @returns {string} The localized text about the method.
   */
  getMethodText(method) {
    switch (method) {
      case "REFRESH":
        return lazy.cal.l10n.getLtnString("imipBarRefreshText");
      case "REQUEST":
        return lazy.cal.l10n.getLtnString("imipBarRequestText");
      case "PUBLISH":
        return lazy.cal.l10n.getLtnString("imipBarPublishText");
      case "CANCEL":
        return lazy.cal.l10n.getLtnString("imipBarCancelText");
      case "REPLY":
        return lazy.cal.l10n.getLtnString("imipBarReplyText");
      case "COUNTER":
        return lazy.cal.l10n.getLtnString("imipBarCounterText");
      case "DECLINECOUNTER":
        return lazy.cal.l10n.getLtnString("imipBarDeclineCounterText");
      default:
        lazy.cal.ERROR("Unknown iTIP method: " + method);
        let appName = lazy.cal.l10n.getAnyString("branding", "brand", "brandShortName");
        return lazy.cal.l10n.getLtnString("imipBarUnsupportedText2", [appName]);
    }
  },

  /**
   * Scope: iTIP message receiver
   *
   * Gets localized toolbar label about the message state and triggers buttons to show.
   * This returns a JS object with the following structure:
   *
   * {
   *    label: "This is a desciptive text about the itip item",
   *    showItems: ["imipXXXButton", ...],
   *    hideItems: ["imipXXXButton_Option", ...]
   * }
   *
   * @see processItipItem   This takes the same parameters as its optionFunc.
   * @param {calIItipItem} itipItem - The itipItem to query.
   * @param {number} rc - The result of retrieving the item
   * @param {Function} actionFunc - The action function.
   * @param {calIItemBase[]} foundItems - An array of items found while searching for the item
   *                                        in subscribed calendars
   * @returns {object} Return information about the options
   */
  getOptionsText(itipItem, rc, actionFunc, foundItems) {
    let imipLabel = null;
    if (itipItem.receivedMethod) {
      imipLabel = calitip.getMethodText(itipItem.receivedMethod);
    }
    let data = { label: imipLabel, showItems: [], hideItems: [] };
    let separateButtons = Services.prefs.getBoolPref(
      "calendar.itip.separateInvitationButtons",
      false
    );

    let disallowedCounter = false;
    if (foundItems && foundItems.length) {
      let disallow = foundItems[0].getProperty("X-MICROSOFT-DISALLOW-COUNTER");
      disallowedCounter = disallow && disallow == "TRUE";
    }
    if (!calendarDeactivator.isCalendarActivated) {
      // Calendar is deactivated (no calendars are enabled).
      data.label = lazy.cal.l10n.getLtnString("imipBarCalendarDeactivated");
      data.showItems.push("imipGoToCalendarButton", "imipMoreButton");
      data.hideItems.push("imipMoreButton_SaveCopy");
    } else if (rc == Ci.calIErrors.CAL_IS_READONLY) {
      // No writable calendars, tell the user about it
      data.label = lazy.cal.l10n.getLtnString("imipBarNotWritable");
      data.showItems.push("imipGoToCalendarButton", "imipMoreButton");
      data.hideItems.push("imipMoreButton_SaveCopy");
    } else if (Components.isSuccessCode(rc) && !actionFunc) {
      // This case, they clicked on an old message that has already been
      // added/updated, we want to tell them that.
      data.label = lazy.cal.l10n.getLtnString("imipBarAlreadyProcessedText");
      if (foundItems && foundItems.length) {
        data.showItems.push("imipDetailsButton");
        if (itipItem.receivedMethod == "COUNTER" && itipItem.sender) {
          if (disallowedCounter) {
            data.label = lazy.cal.l10n.getLtnString("imipBarDisallowedCounterText");
          } else {
            let comparison;
            for (let item of itipItem.getItemList()) {
              let attendees = lazy.cal.itip.getAttendeesBySender(
                item.getAttendees(),
                itipItem.sender
              );
              if (attendees.length == 1) {
                comparison = calitip.compareSequence(item, foundItems[0]);
                if (comparison == 1) {
                  data.label = lazy.cal.l10n.getLtnString("imipBarCounterErrorText");
                  break;
                } else if (comparison == -1) {
                  data.label = lazy.cal.l10n.getLtnString("imipBarCounterPreviousVersionText");
                }
              }
            }
          }
        }
      } else if (itipItem.receivedMethod == "REPLY") {
        // The item has been previously removed from the available calendars or the calendar
        // containing the item is not available
        let delmgr = Cc["@mozilla.org/calendar/deleted-items-manager;1"].getService(
          Ci.calIDeletedItems
        );
        let delTime = null;
        let items = itipItem.getItemList();
        if (items && items.length) {
          delTime = delmgr.getDeletedDate(items[0].id);
        }
        if (delTime) {
          data.label = lazy.cal.l10n.getLtnString("imipBarReplyToRecentlyRemovedItem", [
            lazy.cal.dtz.formatter.formatTime(delTime),
          ]);
        } else {
          data.label = lazy.cal.l10n.getLtnString("imipBarReplyToNotExistingItem");
        }
      } else if (itipItem.receivedMethod == "DECLINECOUNTER") {
        data.label = lazy.cal.l10n.getLtnString("imipBarDeclineCounterText");
      }
    } else if (Components.isSuccessCode(rc)) {
      lazy.cal.LOG("iTIP options on: " + actionFunc.method);
      switch (actionFunc.method) {
        case "PUBLISH:UPDATE":
        case "REQUEST:UPDATE-MINOR":
          data.label = lazy.cal.l10n.getLtnString("imipBarUpdateText");
        // falls through
        case "REPLY":
          data.showItems.push("imipUpdateButton");
          break;
        case "PUBLISH":
          data.showItems.push("imipAddButton");
          break;
        case "REQUEST:UPDATE":
        case "REQUEST:NEEDS-ACTION":
        case "REQUEST": {
          let isRecurringMaster = false;
          for (let item of itipItem.getItemList()) {
            if (item.recurrenceInfo) {
              isRecurringMaster = true;
            }
          }

          if (actionFunc.method == "REQUEST:UPDATE") {
            if (isRecurringMaster) {
              data.label = lazy.cal.l10n.getLtnString("imipBarUpdateSeriesText");
            } else if (itipItem.getItemList().length > 1) {
              data.label = lazy.cal.l10n.getLtnString("imipBarUpdateMultipleText");
            } else {
              data.label = lazy.cal.l10n.getLtnString("imipBarUpdateText");
            }
          } else if (actionFunc.method == "REQUEST:NEEDS-ACTION") {
            if (isRecurringMaster) {
              data.label = lazy.cal.l10n.getLtnString("imipBarProcessedSeriesNeedsAction");
            } else if (itipItem.getItemList().length > 1) {
              data.label = lazy.cal.l10n.getLtnString("imipBarProcessedMultipleNeedsAction");
            } else {
              data.label = lazy.cal.l10n.getLtnString("imipBarProcessedNeedsAction");
            }
          }

          if (itipItem.getItemList().length > 1 || isRecurringMaster) {
            data.showItems.push("imipAcceptRecurrencesButton");
            if (separateButtons) {
              data.showItems.push("imipTentativeRecurrencesButton");
              data.hideItems.push("imipAcceptRecurrencesButton_AcceptLabel");
              data.hideItems.push("imipAcceptRecurrencesButton_TentativeLabel");
              data.hideItems.push("imipAcceptRecurrencesButton_Tentative");
              data.hideItems.push("imipAcceptRecurrencesButton_TentativeDontSend");
            } else {
              data.hideItems.push("imipTentativeRecurrencesButton");
              data.showItems.push("imipAcceptRecurrencesButton_AcceptLabel");
              data.showItems.push("imipAcceptRecurrencesButton_TentativeLabel");
              data.showItems.push("imipAcceptRecurrencesButton_Tentative");
              data.showItems.push("imipAcceptRecurrencesButton_TentativeDontSend");
            }
            data.showItems.push("imipDeclineRecurrencesButton");
          } else {
            data.showItems.push("imipAcceptButton");
            if (separateButtons) {
              data.showItems.push("imipTentativeButton");
              data.hideItems.push("imipAcceptButton_AcceptLabel");
              data.hideItems.push("imipAcceptButton_TentativeLabel");
              data.hideItems.push("imipAcceptButton_Tentative");
              data.hideItems.push("imipAcceptButton_TentativeDontSend");
            } else {
              data.hideItems.push("imipTentativeButton");
              data.showItems.push("imipAcceptButton_AcceptLabel");
              data.showItems.push("imipAcceptButton_TentativeLabel");
              data.showItems.push("imipAcceptButton_Tentative");
              data.showItems.push("imipAcceptButton_TentativeDontSend");
            }
            data.showItems.push("imipDeclineButton");
          }
          data.showItems.push("imipMoreButton");
          // Use data.hideItems.push("idOfMenuItem") to hide specific menuitems
          // from the dropdown menu of a button.  This might be useful to remove
          // a generally available option for a specific invitation, because the
          // respective feature is not available for the calendar, the invitation
          // is in or the feature is prohibited by the organizer
          break;
        }
        case "CANCEL": {
          data.showItems.push("imipDeleteButton");
          break;
        }
        case "REFRESH": {
          data.showItems.push("imipReconfirmButton");
          break;
        }
        case "COUNTER": {
          if (disallowedCounter) {
            data.label = lazy.cal.l10n.getLtnString("imipBarDisallowedCounterText");
          }
          data.showItems.push("imipDeclineCounterButton");
          data.showItems.push("imipRescheduleButton");
          break;
        }
        default:
          let appName = lazy.cal.l10n.getAnyString("branding", "brand", "brandShortName");
          data.label = lazy.cal.l10n.getLtnString("imipBarUnsupportedText2", [appName]);
          break;
      }
    } else {
      let appName = lazy.cal.l10n.getAnyString("branding", "brand", "brandShortName");
      data.label = lazy.cal.l10n.getLtnString("imipBarUnsupportedText2", [appName]);
    }

    return data;
  },

  /**
   * Scope: iTIP message receiver
   * Retrieves the message sender.
   *
   * @param {nsIMsgDBHdr} aMsgHdr - The message header to check.
   * @returns {string} The email address of the intended recipient.
   */
  getMessageSender(aMsgHdr) {
    let author = (aMsgHdr && aMsgHdr.author) || "";
    let compFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(
      Ci.nsIMsgCompFields
    );
    let addresses = compFields.splitRecipients(author, true);
    if (addresses.length != 1) {
      lazy.cal.LOG("No unique email address for lookup in message.\r\n" + lazy.cal.STACK(20));
    }
    return addresses[0] || null;
  },

  /**
   * Scope: iTIP message receiver
   *
   * Retrieves the intended recipient for this message.
   *
   * @param {nsIMsgDBHdr} aMsgHdr - The message to check.
   * @returns {string} The email of the intended recipient.
   */
  getMessageRecipient(aMsgHdr) {
    if (!aMsgHdr) {
      return null;
    }

    let identities;
    if (aMsgHdr.accountKey) {
      // First, check if the message has an account key. If so, we can use the
      // account identities to find the correct recipient
      identities = MailServices.accounts.getAccount(aMsgHdr.accountKey).identities;
    } else if (aMsgHdr.folder) {
      // Without an account key, we have to revert back to using the server
      identities = MailServices.accounts.getIdentitiesForServer(aMsgHdr.folder.server);
    }

    let emailMap = {};
    if (!identities || identities.length == 0) {
      let identity;
      // If we were not able to retrieve identities above, then we have no
      // choice but to revert to the default identity.
      let defaultAccount = MailServices.accounts.defaultAccount;
      if (defaultAccount) {
        identity = defaultAccount.defaultIdentity;
      }
      if (!identity) {
        // If there isn't a default identity (i.e Local Folders is your
        // default identity), then go ahead and use the first available
        // identity.
        let allIdentities = MailServices.accounts.allIdentities;
        if (allIdentities.length > 0) {
          identity = allIdentities[0];
        } else {
          // If there are no identities at all, we cannot get a recipient.
          return null;
        }
      }
      emailMap[identity.email.toLowerCase()] = true;
    } else {
      // Build a map of usable email addresses
      for (let identity of identities) {
        emailMap[identity.email.toLowerCase()] = true;
      }
    }

    // First check the recipient list
    let toList = MailServices.headerParser.makeFromDisplayAddress(aMsgHdr.recipients || "");
    for (let recipient of toList) {
      if (recipient.email.toLowerCase() in emailMap) {
        // Return the first found recipient
        return recipient;
      }
    }

    // Maybe we are in the CC list?
    let ccList = MailServices.headerParser.makeFromDisplayAddress(aMsgHdr.ccList || "");
    for (let recipient of ccList) {
      if (recipient.email.toLowerCase() in emailMap) {
        // Return the first found recipient
        return recipient;
      }
    }

    // Hrmpf. Looks like delegation or maybe Bcc.
    return null;
  },

  /**
   * Scope: iTIP message receiver
   *
   * Prompt for the target calendar, if needed for the given method. This calendar will be set on
   * the passed itip item.
   *
   * @param {string} aMethod - The method to check.
   * @param {calIItipItem} aItipItem - The itip item to set the target calendar on.
   * @param {DOMWindpw} aWindow - The window to open the dialog on.
   * @returns {boolean} True, if a calendar was selected or no selection is needed.
   */
  promptCalendar(aMethod, aItipItem, aWindow) {
    let needsCalendar = false;
    let targetCalendar = null;
    switch (aMethod) {
      // methods that don't require the calendar chooser:
      case "REFRESH":
      case "REQUEST:UPDATE":
      case "REQUEST:UPDATE-MINOR":
      case "PUBLISH:UPDATE":
      case "REPLY":
      case "CANCEL":
      case "COUNTER":
      case "DECLINECOUNTER":
        needsCalendar = false;
        break;
      default:
        needsCalendar = true;
        break;
    }

    if (needsCalendar) {
      let calendars = lazy.cal.manager.getCalendars().filter(calitip.isSchedulingCalendar);

      if (aItipItem.receivedMethod == "REQUEST") {
        // try to further limit down the list to those calendars that
        // are configured to a matching attendee;
        let item = aItipItem.getItemList()[0];
        let matchingCals = calendars.filter(
          calendar => calitip.getInvitedAttendee(item, calendar) != null
        );
        // if there's none, we will show the whole list of calendars:
        if (matchingCals.length > 0) {
          calendars = matchingCals;
        }
      }

      if (calendars.length == 0) {
        let msg = lazy.cal.l10n.getLtnString("imipNoCalendarAvailable");
        aWindow.alert(msg);
      } else if (calendars.length == 1) {
        // There's only one calendar, so it's silly to ask what calendar
        // the user wants to import into.
        targetCalendar = calendars[0];
      } else {
        // Ask what calendar to import into
        let args = {};
        args.calendars = calendars;
        args.onOk = aCal => {
          targetCalendar = aCal;
        };
        args.promptText = lazy.cal.l10n.getCalString("importPrompt");
        aWindow.openDialog(
          "chrome://calendar/content/chooseCalendarDialog.xhtml",
          "_blank",
          "chrome,titlebar,modal,resizable",
          args
        );
      }

      if (targetCalendar) {
        aItipItem.targetCalendar = targetCalendar;
      }
    }

    return !needsCalendar || targetCalendar != null;
  },

  /**
   * Scope: iTIP message receiver
   *
   * Prompt for the invited attendee if we cannot automatically determine one.
   * This will modify the items of the passed calIItipItem to ensure an invited
   * attendee is available.
   *
   * Note: This is intended for the REQUEST/COUNTER methods.
   *
   * @param {Window} window - Used to prompt the user.
   * @param {calIItipItem} itipItem - The itip item to ensure.
   * @param {number} responseMode - One of the calIITipItem response mode
   *                                  constants indicating whether a response
   *                                  will be sent or not.
   *
   * @returns {boolean} True if an invited attendee is available for all
   *                    items, false if otherwise.
   */
  promptInvitedAttendee(window, itipItem, responseMode) {
    let cancelled = false;
    for (let item of itipItem.getItemList()) {
      let att = calitip.getInvitedAttendee(item, itipItem.targetCalendar);
      if (!att) {
        window.openDialog(
          "chrome://calendar/content/calendar-itip-identity-dialog.xhtml",
          "_blank",
          "chrome,modal,resizable=no,centerscreen",
          {
            responseMode,
            identities: MailServices.accounts.allIdentities.slice().sort((a, b) => {
              if (a.email == itipItem.identity && b.email != itipItem.identity) {
                return -1;
              }
              if (b.email == itipItem.identity && a.email != itipItem.identity) {
                return 1;
              }
              return 0;
            }),
            onCancel() {
              cancelled = true;
            },
            onOk(identity) {
              att = new lazy.CalAttendee();
              att.id = `mailto:${identity.email}`;
              att.commonName = identity.fullName;
              att.isOrganizer = false;
              item.addAttendee(att);
            },
          }
        );
      }

      if (cancelled) {
        break;
      }

      if (att) {
        let { stampTime, lastModifiedTime } = item;

        // Set this so we know who accepted the event.
        item.setProperty("X-MOZ-INVITED-ATTENDEE", att.id);

        // Remove the dirty flag from the item.
        item.setProperty("DTSTAMP", stampTime);
        item.setProperty("LAST-MODIFIED", lastModifiedTime);
      }
    }

    return !cancelled;
  },

  /**
   * Clean up after the given iTIP item. This needs to be called once for each time
   * processItipItem is called. May be called with a null itipItem in which case it will do
   * nothing.
   *
   * @param {calIItipItem} itipItem - The iTIP item to clean up for.
   */
  cleanupItipItem(itipItem) {
    if (itipItem) {
      let itemList = itipItem.getItemList();
      if (itemList.length > 0) {
        // Again, we can assume the id is the same over all items per spec
        ItipItemFinderFactory.cleanup(itemList[0].id);
      }
    }
  },

  /**
   * Scope: iTIP message receiver
   *
   * Checks the passed iTIP item and calls the passed function with options offered. Be sure to
   * call cleanupItipItem at least once after calling this function.
   *
   * The action func has a property |method| showing the options:
   *   REFRESH -- send the latest item (sent by attendee(s))
   *   PUBLISH -- initial publish, no reply (sent by organizer)
   *   PUBLISH:UPDATE -- update of a published item (sent by organizer)
   *   REQUEST -- initial invitation (sent by organizer)
   *   REQUEST:UPDATE -- rescheduling invitation, has major change (sent by organizer)
   *   REQUEST:UPDATE-MINOR -- update of invitation, minor change (sent by organizer)
   *   REPLY -- invitation reply (sent by attendee(s))
   *   CANCEL -- invitation cancel (sent by organizer)
   *   COUNTER -- counterproposal (sent by attendee)
   *   DECLINECOUNTER -- denial of a counterproposal (sent by organizer)
   *
   * @param {calIItipItem} itipItem - The iTIP item
   * @param {Function} optionsFunc - The function being called with parameters: itipItem,
   *                                          resultCode, actionFunc
   */
  processItipItem(itipItem, optionsFunc) {
    switch (itipItem.receivedMethod.toUpperCase()) {
      case "REFRESH":
      case "PUBLISH":
      case "REQUEST":
      case "CANCEL":
      case "COUNTER":
      case "DECLINECOUNTER":
      case "REPLY": {
        // Per iTIP spec (new Draft 4), multiple items in an iTIP message MUST have
        // same ID, this simplifies our searching, we can just look for Item[0].id
        let itemList = itipItem.getItemList();
        if (!itipItem.targetCalendar) {
          optionsFunc(itipItem, Ci.calIErrors.CAL_IS_READONLY);
        } else if (itemList.length > 0) {
          ItipItemFinderFactory.findItem(itemList[0].id, itipItem, optionsFunc);
        } else if (optionsFunc) {
          optionsFunc(itipItem, Cr.NS_OK);
        }
        break;
      }
      default: {
        if (optionsFunc) {
          optionsFunc(itipItem, Cr.NS_ERROR_NOT_IMPLEMENTED);
        }
        break;
      }
    }
  },

  /**
   * Scope: iTIP message sender
   *
   * Checks to see if e.g. attendees were added/removed or an item has been deleted and sends out
   * appropriate iTIP messages.
   *
   * @param {number} aOpType - Type of operation - (e.g. ADD, MODIFY or DELETE)
   * @param {calIItemBase} aItem - The updated item
   * @param {calIItemBase} aOriginalItem - The original item
   * @param {?object} aExtResponse - An object to provide additional
   *                                            parameters for sending itip messages as response
   *                                            mode, comments or a subset of recipients. Currently
   *                                            implemented attributes are:
   *                             responseMode Response mode (long) as defined for autoResponse
   *                                            of calIItipItem. The default mode is USER (which
   *                                            will trigger displaying the previously known popup
   *                                            to ask the user whether to send)
   */
  checkAndSend(aOpType, aItem, aOriginalItem, aExtResponse = null) {
    let sender = new lazy.CalItipMessageSender(aOriginalItem, calitip.getInvitedAttendee(aItem));
    if (sender.detectChanges(aOpType, aItem, aExtResponse)) {
      sender.send(calitip.getImipTransport(aItem));
    }
  },

  /**
   * Bumps the SEQUENCE in case of a major change; XXX todo may need more fine-tuning.
   *
   * @param {calIItemBase} newItem - The new item to set the sequence on
   * @param {calIItemBase} oldItem - The old item to get the previous version from.
   * @returns {calIItemBase} The newly changed item
   */
  prepareSequence(newItem, oldItem) {
    if (calitip.isInvitation(newItem)) {
      return newItem; // invitation copies don't bump the SEQUENCE
    }

    if (newItem.recurrenceId && !oldItem.recurrenceId && oldItem.recurrenceInfo) {
      // XXX todo: there's still the bug that modifyItem is called with mixed occurrence/parent,
      //           find original occurrence
      oldItem = oldItem.recurrenceInfo.getOccurrenceFor(newItem.recurrenceId);
      lazy.cal.ASSERT(oldItem, "unexpected!");
      if (!oldItem) {
        return newItem;
      }
    }

    let hashMajorProps = function (aItem) {
      const majorProps = {
        DTSTART: true,
        DTEND: true,
        DURATION: true,
        DUE: true,
        RDATE: true,
        RRULE: true,
        EXDATE: true,
        STATUS: true,
        LOCATION: true,
      };

      let propStrings = [];
      for (let item of lazy.cal.iterate.items([aItem])) {
        for (let prop of lazy.cal.iterate.icalProperty(item.icalComponent)) {
          if (prop.propertyName in majorProps) {
            propStrings.push(item.recurrenceId + "#" + prop.icalString);
          }
        }
      }
      propStrings.sort();
      return propStrings.join("");
    };

    let hash1 = hashMajorProps(newItem);
    let hash2 = hashMajorProps(oldItem);
    if (hash1 != hash2) {
      newItem = newItem.clone();
      // bump SEQUENCE, it never decreases (mind undo scenario here)
      newItem.setProperty(
        "SEQUENCE",
        String(Math.max(calitip.getSequence(oldItem), calitip.getSequence(newItem)) + 1)
      );
    }

    return newItem;
  },

  /**
   * Returns a copy of an itipItem with modified properties and items build from scratch Use
   * itipItem.clone() instead if only a simple copy is required
   *
   * @param  {calIItipItem} aItipItem  ItipItem to derive a new one from
   * @param  {calIItemBase[]} aItems   calIEvent or calITodo items to be contained in the new itipItem
   * @param  {object} aProps           Properties to be different in the new itipItem
   * @returns {calIItipItem} The copied and modified item
   */
  getModifiedItipItem(aItipItem, aItems = [], aProps = {}) {
    let itipItem = Cc["@mozilla.org/calendar/itip-item;1"].createInstance(Ci.calIItipItem);
    let serializedItems = "";
    for (let item of aItems) {
      serializedItems += lazy.cal.item.serialize(item);
    }
    itipItem.init(serializedItems);

    itipItem.autoResponse = "autoResponse" in aProps ? aProps.autoResponse : aItipItem.autoResponse;
    itipItem.identity = "identity" in aProps ? aProps.identity : aItipItem.identity;
    itipItem.isSend = "isSend" in aProps ? aProps.isSend : aItipItem.isSend;
    itipItem.localStatus = "localStatus" in aProps ? aProps.localStatus : aItipItem.localStatus;
    itipItem.receivedMethod =
      "receivedMethod" in aProps ? aProps.receivedMethod : aItipItem.receivedMethod;
    itipItem.responseMethod =
      "responseMethod" in aProps ? aProps.responseMethod : aItipItem.responseMethod;
    itipItem.targetCalendar =
      "targetCalendar" in aProps ? aProps.targetCalendar : aItipItem.targetCalendar;

    return itipItem;
  },

  /**
   * A shortcut to send DECLINECOUNTER messages - for everything else use calitip.checkAndSend
   *
   * @param {calIItipItem} aItem - item to be sent
   * @param {string} aMethod - iTIP method
   * @param {calIAttendee[]} aRecipientsList - array of calIAttendee objects the message should be sent to
   * @param {object} aAutoResponse - JS object whether the transport should ask before sending
   * @returns {boolean} True
   */
  sendDeclineCounterMessage(aItem, aMethod, aRecipientsList, aAutoResponse) {
    if (aMethod == "DECLINECOUNTER") {
      return sendMessage(aItem, aMethod, aRecipientsList, aAutoResponse);
    }
    return false;
  },

  /**
   * Returns a copy of an event that
   * - has a relation set to the original event
   * - has the same organizer but
   * - has any attendee removed
   * Intended to get a copy of a normal event invitation that behaves as if the PUBLISH method was
   * chosen instead.
   *
   * @param {calIItemBase} aItem - Original item
   * @param {?string} aUid - UID to use for the new item
   * @returns {calIItemBase} The copied item for publishing
   */
  getPublishLikeItemCopy(aItem, aUid) {
    // avoid changing aItem
    let item = aItem.clone();
    // reset to a new UUID if applicable
    item.id = aUid || lazy.cal.getUUID();
    // add a relation to the original item
    let relation = new lazy.CalRelation();
    relation.relId = aItem.id;
    relation.relType = "SIBLING";
    item.addRelation(relation);
    // remove attendees
    item.removeAllAttendees();
    if (!aItem.isMutable) {
      item = item.makeImmutable();
    }
    return item;
  },

  /**
   * Tests whether the passed object is a calIAttendee instance. This function
   * takes into consideration that the object may be be unwrapped and thus a
   * CalAttendee instance
   *
   * @param {object} val - The object to test.
   *
   * @returns {boolean}
   */
  isAttendee(val) {
    return val && (val instanceof Ci.calIAttendee || val instanceof lazy.CalAttendee);
  },

  /**
   * Shortcut function to check whether an item is an invitation copy.
   *
   * @param {calIItemBase} aItem - The item to check for an invitation.
   * @returns {boolean} True, if the item is an invitation.
   */
  isInvitation(aItem) {
    let isInvitation = false;
    let calendar = aItem.calendar;
    if (calendar && calendar.supportsScheduling) {
      isInvitation = calendar.getSchedulingSupport().isInvitation(aItem);
    }
    return isInvitation;
  },

  /**
   * Shortcut function to check whether an item is an invitation copy and has a participation
   * status of either NEEDS-ACTION or TENTATIVE.
   *
   * @param {calIAttendee|calIItemBase} aItem - either calIAttendee or calIItemBase
   * @returns {boolean} True, if the attendee partstat is NEEDS-ACTION
   *                                                or TENTATIVE
   */
  isOpenInvitation(aItem) {
    if (!calitip.isAttendee(aItem)) {
      aItem = calitip.getInvitedAttendee(aItem);
    }
    if (aItem) {
      switch (aItem.participationStatus) {
        case "NEEDS-ACTION":
        case "TENTATIVE":
          return true;
      }
    }
    return false;
  },

  /**
   * Resolves delegated-to/delegated-from calusers for a given attendee to also include the
   * respective CNs if available in a given set of attendees
   *
   * @param {calIAttendee} aAttendee - The attendee to resolve the delegation information for
   * @param {calIAttendee[]} aAttendees - An array of calIAttendee objects to look up
   * @returns {object} An object with string attributes for delegators and delegatees
   */
  resolveDelegation(aAttendee, aAttendees) {
    let attendees = aAttendees || [aAttendee];

    // this will be replaced by a direct property getter in calIAttendee
    let delegators = [];
    let delegatees = [];
    let delegatorProp = aAttendee.getProperty("DELEGATED-FROM");
    if (delegatorProp) {
      delegators = typeof delegatorProp == "string" ? [delegatorProp] : delegatorProp;
    }
    let delegateeProp = aAttendee.getProperty("DELEGATED-TO");
    if (delegateeProp) {
      delegatees = typeof delegateeProp == "string" ? [delegateeProp] : delegateeProp;
    }

    for (let att of attendees) {
      let resolveDelegation = function (e, i, a) {
        if (e == att.id) {
          a[i] = att.toString();
        }
      };
      delegators.forEach(resolveDelegation);
      delegatees.forEach(resolveDelegation);
    }
    return {
      delegatees: delegatees.join(", "),
      delegators: delegators.join(", "),
    };
  },

  /**
   * Shortcut function to get the invited attendee of an item.
   *
   * @param {calIItemBase} aItem - Event or task to get the invited attendee for
   * @param {?calICalendar} aCalendar - The calendar to use for checking, defaults to the item
   *                                        calendar
   * @returns {?calIAttendee} The attendee that was invited
   */
  getInvitedAttendee(aItem, aCalendar) {
    let id = aItem.getProperty("X-MOZ-INVITED-ATTENDEE");
    if (id) {
      return aItem.getAttendeeById(id);
    }
    if (!aCalendar) {
      aCalendar = aItem.calendar;
    }
    let invitedAttendee = null;
    if (aCalendar && aCalendar.supportsScheduling) {
      invitedAttendee = aCalendar.getSchedulingSupport().getInvitedAttendee(aItem);
    }
    return invitedAttendee;
  },

  /**
   * Returns all attendees from given set of attendees matching based on the attendee id
   * or a sent-by parameter compared to the specified email address
   *
   * @param {calIAttendee[]} aAttendees - An array of calIAttendee objects
   * @param {string} aEmailAddress - A string containing the email address for lookup
   * @returns {calIAttendee[]} Returns an array of matching attendees
   */
  getAttendeesBySender(aAttendees, aEmailAddress) {
    let attendees = [];
    // we extract the email address to make it work also for a raw header value
    let compFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(
      Ci.nsIMsgCompFields
    );
    let addresses = compFields.splitRecipients(aEmailAddress, true);
    if (addresses.length == 1) {
      let searchFor = lazy.cal.email.prependMailTo(addresses[0]);
      aAttendees.forEach(aAttendee => {
        if ([aAttendee.id, aAttendee.getProperty("SENT-BY")].includes(searchFor)) {
          attendees.push(aAttendee);
        }
      });
    } else {
      lazy.cal.WARN("No unique email address for lookup!");
    }
    return attendees;
  },

  /**
   * Provides the transport to be used for an item based on the invited attendee
   * or calendar.
   *
   * @param {calIItemBase} item
   */
  getImipTransport(item) {
    let id = item.getProperty("X-MOZ-INVITED-ATTENDEE");

    if (id) {
      let email = id.split("mailto:").join("");
      let identity = MailServices.accounts.allIdentities.find(identity => identity.email == email);

      if (identity) {
        let [server] = MailServices.accounts.getServersForIdentity(identity);

        if (server) {
          let account = MailServices.accounts.FindAccountForServer(server);
          return new lazy.CalItipDefaultEmailTransport(account, identity);
        }
      }

      // We did not find the identity or associated account
      return null;
    }

    return item.calendar.getProperty("itip.transport");
  },
};

/** local to this module file
 * Sets the received info either on the passed attendee or item object.
 *
 * @param {calIItemBase|calIAttendee} item - The item to set info on
 * @param {calIItipItem} itipItemItem - The received iTIP item
 */
function setReceivedInfo(item, itipItemItem) {
  let isAttendee = calitip.isAttendee(item);
  item.setProperty(
    isAttendee ? "RECEIVED-SEQUENCE" : "X-MOZ-RECEIVED-SEQUENCE",
    String(calitip.getSequence(itipItemItem))
  );
  let dtstamp = calitip.getStamp(itipItemItem);
  if (dtstamp) {
    item.setProperty(
      isAttendee ? "RECEIVED-DTSTAMP" : "X-MOZ-RECEIVED-DTSTAMP",
      dtstamp.getInTimezone(lazy.cal.dtz.UTC).icalString
    );
  }
}

/** local to this module file
 * Takes over relevant item information from iTIP item and sets received info.
 *
 * @param {calIItemBase} item - The stored calendar item to update
 * @param {calIItipItem} itipItemItem - The received item
 * @returns {calIItemBase} A copy of the item with correct received info
 */
function updateItem(item, itipItemItem) {
  /**
   * Migrates some user data from the old to new item
   *
   * @param {calIItemBase} newItem - The new item to copy to
   * @param {calIItemBase} oldItem - The old item to copy from
   */
  function updateUserData(newItem, oldItem) {
    // preserve user settings:
    newItem.generation = oldItem.generation;
    newItem.clearAlarms();
    for (let alarm of oldItem.getAlarms()) {
      newItem.addAlarm(alarm);
    }
    newItem.alarmLastAck = oldItem.alarmLastAck;
    let cats = oldItem.getCategories();
    newItem.setCategories(cats);
  }

  let newItem = item.clone();
  newItem.icalComponent = itipItemItem.icalComponent;
  setReceivedInfo(newItem, itipItemItem);
  updateUserData(newItem, item);

  let recInfo = itipItemItem.recurrenceInfo;
  if (recInfo) {
    // keep care of installing all overridden items, and mind existing alarms, categories:
    for (let rid of recInfo.getExceptionIds()) {
      let excItem = recInfo.getExceptionFor(rid).clone();
      lazy.cal.ASSERT(excItem, "unexpected!");
      let newExc = newItem.recurrenceInfo.getOccurrenceFor(rid).clone();
      newExc.icalComponent = excItem.icalComponent;
      setReceivedInfo(newExc, itipItemItem);
      let existingExcItem = item.recurrenceInfo && item.recurrenceInfo.getExceptionFor(rid);
      if (existingExcItem) {
        updateUserData(newExc, existingExcItem);
      }
      newItem.recurrenceInfo.modifyException(newExc, true);
    }
  }

  return newItem;
}

/** local to this module file
 * Copies the provider-specified properties from the itip item to the passed
 * item. Special case property "METHOD" uses the itipItem's receivedMethod.
 *
 * @param {calIItipItem} itipItem - The itip item containing the receivedMethod.
 * @param {calIItemBase} itipItemItem - The calendar item inside the itip item.
 * @param {calIItemBase} item - The target item to copy to.
 */
function copyProviderProperties(itipItem, itipItemItem, item) {
  // Copy over itip properties to the item if requested by the provider
  let copyProps = item.calendar.getProperty("itip.copyProperties") || [];
  for (let prop of copyProps) {
    if (prop == "METHOD") {
      // Special case, this copies over the received method
      item.setProperty("METHOD", itipItem.receivedMethod.toUpperCase());
    } else if (itipItemItem.hasProperty(prop)) {
      // Otherwise just copy from the item contained in the itipItem
      item.setProperty(prop, itipItemItem.getProperty(prop));
    }
  }
}

/** local to this module file
 * Sends an iTIP message using the passed item's calendar transport.
 *
 * @param {calIEvent} aItem - item to be sent
 * @param {string} aMethod - iTIP method
 * @param {calIAttendee[]} aRecipientsList - array of calIAttendee objects the message should be sent to
 * @param {object} autoResponse - inout object whether the transport should ask before sending
 * @returns {boolean} True, if the message could be sent
 */
function sendMessage(aItem, aMethod, aRecipientsList, autoResponse) {
  new lazy.CalItipOutgoingMessage(
    aMethod,
    aRecipientsList,
    aItem,
    calitip.getInvitedAttendee(aItem),
    autoResponse
  ).send(calitip.getImipTransport(aItem));
}

/** local to this module file
 * An operation listener that is used on calendar operations which checks and sends further iTIP
 * messages based on the calendar action.
 *
 * @param {object} aOpListener - operation listener to forward
 * @param {calIItemBase} aOldItem - The previous item before modification (if any)
 * @param {?object} aExtResponse - An object to provide additional parameters for sending itip
 *                                      messages as response mode, comments or a subset of
 *                                      recipients.
 */
function ItipOpListener(aOpListener, aOldItem, aExtResponse = null) {
  this.mOpListener = aOpListener;
  this.mOldItem = aOldItem;
  this.mExtResponse = aExtResponse;
}
ItipOpListener.prototype = {
  QueryInterface: ChromeUtils.generateQI(["calIOperationListener"]),

  mOpListener: null,
  mOldItem: null,
  mExtResponse: null,

  onOperationComplete(aCalendar, aStatus, aOperationType, aId, aDetail) {
    lazy.cal.ASSERT(Components.isSuccessCode(aStatus), "error on iTIP processing");
    if (Components.isSuccessCode(aStatus)) {
      calitip.checkAndSend(aOperationType, aDetail, this.mOldItem, this.mExtResponse);
    }
    if (this.mOpListener) {
      this.mOpListener.onOperationComplete(aCalendar, aStatus, aOperationType, aId, aDetail);
    }
  },
  onGetResult(calendar, status, itemType, detail, items) {},
};

/** local to this module file
 * Add a parameter SCHEDULE-AGENT=CLIENT to the item before it is
 * created or updated so that the providers knows scheduling will
 * be handled by the client.
 *
 * @param {calIItemBase} item - item about to be added or updated
 * @param {calICalendar} calendar - calendar into which the item is about to be added or updated
 */
function addScheduleAgentClient(item, calendar) {
  if (calendar.getProperty("capabilities.autoschedule.supported") === true) {
    if (item.organizer) {
      item.organizer.setProperty("SCHEDULE-AGENT", "CLIENT");
    }
  }
}

var ItipItemFinderFactory = {
  /**  Map to save finder instances for given ids */
  _findMap: {},

  /**
   * Create an item finder and track its progress. Be sure to clean up the
   * finder for this id at some point.
   *
   * @param {string} aId - The item id to search for
   * @param {calIIipItem} aItipItem - The iTIP item used for processing
   * @param {Function} aOptionsFunc - The options function used for processing the found item
   */
  async findItem(aId, aItipItem, aOptionsFunc) {
    this.cleanup(aId);
    let finder = new ItipItemFinder(aId, aItipItem, aOptionsFunc);
    this._findMap[aId] = finder;
    return finder.findItem();
  },

  /**
   * Clean up tracking for the given id. This needs to be called once for
   * every time findItem is called.
   *
   * @param {string} aId - The item id to clean up for
   */
  cleanup(aId) {
    if (aId in this._findMap) {
      let finder = this._findMap[aId];
      finder.destroy();
      delete this._findMap[aId];
    }
  },
};

/** local to this module file
 * An operation listener triggered by cal.itip.processItipItem() for lookup of the sent iTIP item's UID.
 *
 * @param {string} aId - The search identifier for the item to find
 * @param {calIItipItem} itipItem - Sent iTIP item
 * @param {Function} optionsFunc - Options func, see cal.itip.processItipItem()
 */
function ItipItemFinder(aId, itipItem, optionsFunc) {
  this.mItipItem = itipItem;
  this.mOptionsFunc = optionsFunc;
  this.mSearchId = aId;
}

ItipItemFinder.prototype = {
  QueryInterface: ChromeUtils.generateQI(["calIObserver"]),

  mSearchId: null,
  mItipItem: null,
  mOptionsFunc: null,
  mFoundItems: null,

  async findItem() {
    this.mFoundItems = [];
    this._unobserveChanges();

    let foundItem = await this.mItipItem.targetCalendar.getItem(this.mSearchId);
    if (foundItem) {
      this.mFoundItems.push(foundItem);
    }
    this.processFoundItems();
  },

  _observeChanges(aCalendar) {
    this._unobserveChanges();
    this.mObservedCalendar = aCalendar;

    if (this.mObservedCalendar) {
      this.mObservedCalendar.addObserver(this);
    }
  },
  _unobserveChanges() {
    if (this.mObservedCalendar) {
      this.mObservedCalendar.removeObserver(this);
      this.mObservedCalendar = null;
    }
  },

  onStartBatch() {},
  onEndBatch() {},
  onError() {},
  onPropertyChanged() {},
  onPropertyDeleting() {},
  onLoad(aCalendar) {
    // Its possible that the item was updated. We need to re-retrieve the
    // items now.
    this.findItem();
  },

  onModifyItem(aNewItem, aOldItem) {
    let refItem = aOldItem || aNewItem;
    if (refItem.id == this.mSearchId) {
      // Check existing found items to see if it already exists
      let found = false;
      for (let [idx, item] of Object.entries(this.mFoundItems)) {
        if (item.id == refItem.id && item.calendar.id == refItem.calendar.id) {
          if (aNewItem) {
            this.mFoundItems.splice(idx, 1, aNewItem);
          } else {
            this.mFoundItems.splice(idx, 1);
          }
          found = true;
          break;
        }
      }

      // If it hasn't been found and there is to add a item, add it to the end
      if (!found && aNewItem) {
        this.mFoundItems.push(aNewItem);
      }
      this.processFoundItems();
    }
  },

  onAddItem(aItem) {
    // onModifyItem is set up to also handle additions
    this.onModifyItem(aItem, null);
  },

  onDeleteItem(aItem) {
    // onModifyItem is set up to also handle deletions
    this.onModifyItem(null, aItem);
  },

  destroy() {
    this._unobserveChanges();
  },

  processFoundItems() {
    let rc = Cr.NS_OK;
    const method = this.mItipItem.receivedMethod.toUpperCase();
    let actionMethod = method;
    let operations = [];

    if (this.mFoundItems.length > 0) {
      // Save the target calendar on the itip item
      this.mItipItem.targetCalendar = this.mFoundItems[0].calendar;
      this._observeChanges(this.mItipItem.targetCalendar);

      lazy.cal.LOG("iTIP on " + method + ": found " + this.mFoundItems.length + " items.");
      switch (method) {
        // XXX todo: there's still a potential flaw, if multiple PUBLISH/REPLY/REQUEST on
        //           occurrences happen at once; those lead to multiple
        //           occurrence modifications. Since those modifications happen
        //           implicitly on the parent (ics/memory/storage calls modifyException),
        //           the generation check will fail. We should really consider to allow
        //           deletion/modification/addition of occurrences directly on the providers,
        //           which would ease client code a lot.
        case "REFRESH":
        case "PUBLISH":
        case "REQUEST":
        case "REPLY":
        case "COUNTER":
        case "DECLINECOUNTER":
          for (let itipItemItem of this.mItipItem.getItemList()) {
            for (let item of this.mFoundItems) {
              let rid = itipItemItem.recurrenceId; //  XXX todo support multiple
              if (rid) {
                // actually applies to individual occurrence(s)
                if (item.recurrenceInfo) {
                  item = item.recurrenceInfo.getOccurrenceFor(rid);
                  if (!item) {
                    continue;
                  }
                } else {
                  // the item has been rescheduled with master:
                  itipItemItem = itipItemItem.parentItem;
                }
              }

              switch (method) {
                case "REFRESH": {
                  // xxx todo test
                  let attendees = itipItemItem.getAttendees();
                  lazy.cal.ASSERT(attendees.length == 1, "invalid number of attendees in REFRESH!");
                  if (attendees.length > 0) {
                    let action = function (opListener, partStat, extResponse) {
                      if (!item.organizer) {
                        let org = calitip.createOrganizer(item.calendar);
                        if (org) {
                          item = item.clone();
                          item.organizer = org;
                        }
                      }
                      sendMessage(
                        item,
                        "REQUEST",
                        attendees,
                        { responseMode: Ci.calIItipItem.AUTO } /* don't ask */
                      );
                    };
                    operations.push(action);
                  }
                  break;
                }
                case "PUBLISH":
                  lazy.cal.ASSERT(
                    itipItemItem.getAttendees().length == 0,
                    "invalid number of attendees in PUBLISH!"
                  );
                  if (
                    item.calendar.getProperty("itip.disableRevisionChecks") ||
                    calitip.compare(itipItemItem, item) > 0
                  ) {
                    let newItem = updateItem(item, itipItemItem);
                    let action = function (opListener, partStat, extResponse) {
                      return newItem.calendar.modifyItem(newItem, item).then(
                        item =>
                          opListener.onOperationComplete(
                            item.calendar,
                            Cr.NS_OK,
                            Ci.calIOperationListener.MODIFY,
                            item.id,
                            item
                          ),
                        e =>
                          opListener.onOperationComplete(
                            null,
                            e.result || Cr.NS_ERROR_FAILURE,
                            Ci.calIOperationListener.MODIFY,
                            null,
                            e
                          )
                      );
                    };
                    actionMethod = method + ":UPDATE";
                    operations.push(action);
                  }
                  break;
                case "REQUEST": {
                  let newItem = updateItem(item, itipItemItem);
                  let att = calitip.getInvitedAttendee(newItem);
                  if (!att) {
                    // fall back to using configured organizer
                    att = calitip.createOrganizer(newItem.calendar);
                    if (att) {
                      att.isOrganizer = false;
                    }
                  }
                  if (att) {
                    let firstFoundItem = this.mFoundItems[0];

                    // Where the server automatically adds events to the calendar
                    // we may end up with a recurring invitation in the "NEEDS-ACTION"
                    // state. Upon receiving an exception for these, processFoundItems()
                    // will query the calendar and determine the actionMethod to
                    // be "REQUEST:NEEDS-ACTION" but process the entire series. To avoid
                    // that, we detect here if the itip item's item was indeed for
                    // the whole series or an exception.
                    if (firstFoundItem.recurrenceInfo && rid) {
                      firstFoundItem = firstFoundItem.recurrenceInfo.getOccurrenceFor(rid);
                    }

                    // again, fall back to using configured organizer if not found
                    let foundAttendee = firstFoundItem.getAttendeeById(att.id) || att;

                    // If the user hasn't responded to the invitation yet and we
                    // are viewing the current representation of the item, show the
                    // accept/decline buttons. This means newer events will show the
                    // "Update" button and older events will show the "already
                    // processed" text.
                    if (
                      foundAttendee.participationStatus == "NEEDS-ACTION" &&
                      (item.calendar.getProperty("itip.disableRevisionChecks") ||
                        calitip.compare(itipItemItem, item) == 0)
                    ) {
                      actionMethod = "REQUEST:NEEDS-ACTION";
                      operations.push((opListener, partStat, extResponse) => {
                        let changedItem = firstFoundItem.clone();
                        changedItem.removeAttendee(foundAttendee);
                        foundAttendee = foundAttendee.clone();
                        if (partStat) {
                          foundAttendee.participationStatus = partStat;
                        }
                        changedItem.addAttendee(foundAttendee);

                        let listener = new ItipOpListener(opListener, firstFoundItem, extResponse);
                        return changedItem.calendar.modifyItem(changedItem, firstFoundItem).then(
                          item =>
                            listener.onOperationComplete(
                              item.calendar,
                              Cr.NS_OK,
                              Ci.calIOperationListener.MODIFY,
                              item.id,
                              item
                            ),
                          e =>
                            listener.onOperationComplete(
                              null,
                              e.result || Cr.NS_ERROR_FAILURE,
                              Ci.calIOperationListener.MODIFY,
                              null,
                              e
                            )
                        );
                      });
                    } else if (
                      item.calendar.getProperty("itip.disableRevisionChecks") ||
                      calitip.compare(itipItemItem, item) > 0
                    ) {
                      addScheduleAgentClient(newItem, item.calendar);

                      let isMinorUpdate = calitip.getSequence(newItem) == calitip.getSequence(item);
                      actionMethod = isMinorUpdate ? method + ":UPDATE-MINOR" : method + ":UPDATE";
                      operations.push((opListener, partStat, extResponse) => {
                        if (!partStat) {
                          // keep PARTSTAT
                          let att_ = calitip.getInvitedAttendee(item);
                          partStat = att_ ? att_.participationStatus : "NEEDS-ACTION";
                        }
                        newItem.removeAttendee(att);
                        att = att.clone();
                        att.participationStatus = partStat;
                        newItem.addAttendee(att);

                        let listener = new ItipOpListener(opListener, item, extResponse);
                        return newItem.calendar.modifyItem(newItem, item).then(
                          item =>
                            listener.onOperationComplete(
                              item.calendar,
                              Cr.NS_OK,
                              Ci.calIOperationListener.MODIFY,
                              item.id,
                              item
                            ),
                          e =>
                            listener.onOperationComplete(
                              null,
                              e.result || Cr.NS_ERROR_FAILURE,
                              Ci.calIOperationListener.MODIFY,
                              null,
                              e
                            )
                        );
                      });
                    }
                  }
                  break;
                }
                case "DECLINECOUNTER":
                  // nothing to do right now, but once countering is implemented,
                  // we probably need some action here to remove the proposal from
                  // the countering attendee's calendar
                  break;
                case "COUNTER":
                case "REPLY": {
                  let attendees = itipItemItem.getAttendees();
                  if (method == "REPLY") {
                    lazy.cal.ASSERT(attendees.length == 1, "invalid number of attendees in REPLY!");
                  } else {
                    attendees = lazy.cal.itip.getAttendeesBySender(
                      attendees,
                      this.mItipItem.sender
                    );
                    lazy.cal.ASSERT(
                      attendees.length == 1,
                      "ambiguous resolution of replying attendee in COUNTER!"
                    );
                  }
                  // we get the attendee from the event stored in the calendar
                  let replyer = item.getAttendeeById(attendees[0].id);
                  if (!replyer && method == "REPLY") {
                    // We accepts REPLYs also from previously uninvited
                    // attendees, so we always have one for REPLY
                    replyer = attendees[0];
                  }
                  let noCheck = item.calendar.getProperty("itip.disableRevisionChecks");
                  let revCheck = false;
                  if (replyer && !noCheck) {
                    revCheck = calitip.compare(itipItemItem, replyer) > 0;
                    if (revCheck && method == "COUNTER") {
                      revCheck = calitip.compareSequence(itipItemItem, item) == 0;
                    }
                  }

                  if (replyer && (noCheck || revCheck)) {
                    let newItem = item.clone();
                    newItem.removeAttendee(replyer);
                    replyer = replyer.clone();
                    setReceivedInfo(replyer, itipItemItem);
                    let newPS = itipItemItem.getAttendeeById(replyer.id).participationStatus;
                    replyer.participationStatus = newPS;
                    newItem.addAttendee(replyer);

                    // Make sure the provider-specified properties are copied over
                    copyProviderProperties(this.mItipItem, itipItemItem, newItem);

                    let action = function (opListener, partStat, extResponse) {
                      // n.b.: this will only be processed in case of reply or
                      // declining the counter request - of sending the
                      // appropriate reply will be taken care within the
                      // opListener (defined in imip-bar.js)
                      // TODO: move that from imip-bar.js to here

                      let listener = newItem.calendar.getProperty("itip.notify-replies")
                        ? new ItipOpListener(opListener, item, extResponse)
                        : opListener;
                      return newItem.calendar.modifyItem(newItem, item).then(
                        item =>
                          listener.onOperationComplete(
                            item.calendar,
                            Cr.NS_OK,
                            Ci.calIOperationListener.MODIFY,
                            item.id,
                            item
                          ),
                        e =>
                          listener.onOperationComplete(
                            null,
                            e.result || Cr.NS_ERROR_FAILURE,
                            Ci.calIOperationListener.MODIFY,
                            null,
                            e
                          )
                      );
                    };
                    operations.push(action);
                  }
                  break;
                }
              }
            }
          }
          break;
        case "CANCEL": {
          let modifiedItems = {};
          for (let itipItemItem of this.mItipItem.getItemList()) {
            for (let item of this.mFoundItems) {
              let rid = itipItemItem.recurrenceId; //  XXX todo support multiple
              if (rid) {
                // actually a CANCEL of occurrence(s)
                if (item.recurrenceInfo) {
                  // collect all occurrence deletions into a single parent modification:
                  let newItem = modifiedItems[item.id];
                  if (!newItem) {
                    newItem = item.clone();
                    modifiedItems[item.id] = newItem;

                    // Make sure the provider-specified properties are copied over
                    copyProviderProperties(this.mItipItem, itipItemItem, newItem);

                    operations.push((opListener, partStat, extResponse) =>
                      newItem.calendar.modifyItem(newItem, item).then(
                        item =>
                          opListener.onOperationComplete(
                            item.calendar,
                            Cr.NS_OK,
                            Ci.calIOperationListener.MODIFY,
                            item.id,
                            item
                          ),
                        e =>
                          opListener.onOperationComplete(
                            null,
                            e.result || Cr.NS_ERROR_FAILURE,
                            Ci.calIOperationListener.MODIFY,
                            null,
                            e
                          )
                      )
                    );
                  }
                  newItem.recurrenceInfo.removeOccurrenceAt(rid);
                } else if (item.recurrenceId && item.recurrenceId.compare(rid) == 0) {
                  // parentless occurrence to be deleted (future)
                  operations.push((opListener, partStat, extResponse) =>
                    item.calendar.deleteItem(item).then(
                      () =>
                        opListener.onOperationComplete(
                          item.calendar,
                          Cr.NS_OK,
                          Ci.calIOperationListener.DELETE,
                          item.id,
                          item
                        ),
                      e =>
                        opListener.onOperationComplete(
                          item.calendar,
                          e.result,
                          Ci.calIOperationListener.DELETE,
                          item.id,
                          e
                        )
                    )
                  );
                }
              } else {
                operations.push((opListener, partStat, extResponse) =>
                  item.calendar.deleteItem(item).then(
                    () =>
                      opListener.onOperationComplete(
                        item.calendar,
                        Cr.NS_OK,
                        Ci.calIOperationListener.DELETE,
                        item.id,
                        item
                      ),
                    e =>
                      opListener.onOperationComplete(
                        item.calendar,
                        e.result,
                        Ci.calIOperationListener.DELETE,
                        item.id,
                        e
                      )
                  )
                );
              }
            }
          }
          break;
        }
        default:
          rc = Cr.NS_ERROR_NOT_IMPLEMENTED;
          break;
      }
    } else {
      // not found:
      lazy.cal.LOG("iTIP on " + method + ": no existing items.");
      // If the item was not found, observe the target calendar anyway.
      // It will likely be the composite calendar, so we should update
      // if an item was added or removed
      this._observeChanges(this.mItipItem.targetCalendar);

      for (let itipItemItem of this.mItipItem.getItemList()) {
        switch (method) {
          case "REQUEST":
          case "PUBLISH": {
            let action = (opListener, partStat, extResponse) => {
              let newItem = itipItemItem.clone();
              setReceivedInfo(newItem, itipItemItem);
              newItem.parentItem.calendar = this.mItipItem.targetCalendar;
              addScheduleAgentClient(newItem, this.mItipItem.targetCalendar);

              if (partStat) {
                if (partStat != "DECLINED") {
                  lazy.cal.alarms.setDefaultValues(newItem);
                }

                let att = calitip.getInvitedAttendee(newItem);
                if (!att) {
                  lazy.cal.WARN(
                    `Encountered item without invited attendee! id=${newItem.id}, method=${method} Exiting...`
                  );
                  return null;
                }
                att.participationStatus = partStat;
              } else {
                lazy.cal.ASSERT(
                  itipItemItem.getAttendees().length == 0,
                  "invalid number of attendees in PUBLISH!"
                );
                lazy.cal.alarms.setDefaultValues(newItem);
              }

              let listener =
                method == "REQUEST"
                  ? new ItipOpListener(opListener, null, extResponse)
                  : opListener;
              return newItem.calendar.addItem(newItem).then(
                item =>
                  listener.onOperationComplete(
                    newItem.calendar,
                    Cr.NS_OK,
                    Ci.calIOperationListener.ADD,
                    item.id,
                    item
                  ),
                e =>
                  listener.onOperationComplete(
                    newItem.calendar,
                    e.result,
                    Ci.calIOperationListener.ADD,
                    newItem.id,
                    e
                  )
              );
            };
            operations.push(action);
            break;
          }
          case "CANCEL": // has already been processed
          case "REPLY": // item has been previously removed from the calendar
          case "COUNTER": // the item has been previously removed form the calendar
            break;
          default:
            rc = Cr.NS_ERROR_NOT_IMPLEMENTED;
            break;
        }
      }
    }

    lazy.cal.LOG("iTIP operations: " + operations.length);
    let actionFunc = null;
    if (operations.length > 0) {
      actionFunc = function (opListener, partStat = null, extResponse = null) {
        for (let operation of operations) {
          try {
            operation(opListener, partStat, extResponse);
          } catch (exc) {
            lazy.cal.ERROR(exc);
          }
        }
      };
      actionFunc.method = actionMethod;
    }

    this.mOptionsFunc(this.mItipItem, rc, actionFunc, this.mFoundItems);
  },
};
