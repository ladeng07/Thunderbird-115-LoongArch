/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["CalItipMessageSender"];

const { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
const { CalItipOutgoingMessage } = ChromeUtils.import(
  "resource:///modules/CalItipOutgoingMessage.jsm"
);

/**
 * CalItipMessageSender is responsible for sending out the appropriate iTIP
 * messages when changes have been made to an invitation event.
 */
class CalItipMessageSender {
  /**
   * A list of CalItipOutgoingMessages to send out.
   */
  pendingMessages = [];

  /**
   * @param {?calIItemBase} originalItem - The original invitation item before
   *  it is modified.
   *
   * @param {?calIAttendee} invitedAttendee - For incoming invitations, this is
   *  the attendee that was invited (corresponding to an installed identity).
   */
  constructor(originalItem, invitedAttendee) {
    this.originalItem = originalItem;
    this.invitedAttendee = invitedAttendee;
  }

  /**
   * Provides the count of CalItipOutgoingMessages ready to be sent.
   */
  get pendingMessageCount() {
    return this.pendingMessages.length;
  }

  /**
   * Detects whether the passed invitation item has been modified from the
   * original (attendees added/removed, item deleted etc.) thus requiring iTIP
   * messages to be sent.
   *
   * This method should be called before send().
   *
   * @param {number} opType - Type of operation - (e.g. ADD, MODIFY or DELETE)
   * @param {calIItemBase} item - The updated item.
   * @param {?object} extResponse - An object to provide additional
   *  parameters for sending itip messages as response mode, comments or a
   *  subset of recipients.
   * @param {number} extResponse.responseMode - Response mode as defined for
   *  autoResponse of calIItipItem.
   *
   *  The default mode is USER (which will trigger displaying the previously
   *  known popup to ask the user whether to send)
   *
   * @returns {number} - The number of messages to be sent.
   */
  detectChanges(opType, item, extResponse = null) {
    let { originalItem, invitedAttendee } = this;

    // balance out parts of the modification vs delete confusion, deletion of occurrences
    // are notified as parent modifications and modifications of occurrences are notified
    // as mixed new-occurrence, old-parent (IIRC).
    if (originalItem && item.recurrenceInfo) {
      if (originalItem.recurrenceId && !item.recurrenceId) {
        // sanity check: assure item doesn't refer to the master
        item = item.recurrenceInfo.getOccurrenceFor(originalItem.recurrenceId);
        if (!item) {
          return this.pendingMessageCount;
        }
        // Use the calIAttendee instance from the occurrence in case there is a
        // difference in participationStatus between it and the parent.
        if (invitedAttendee) {
          invitedAttendee = item.getAttendeeById(invitedAttendee.id);
        }
      }

      if (originalItem.recurrenceInfo && item.recurrenceInfo) {
        // check whether the two differ only in EXDATEs
        let clonedItem = item.clone();
        let exdates = [];
        for (let ritem of clonedItem.recurrenceInfo.getRecurrenceItems()) {
          let wrappedRItem = cal.wrapInstance(ritem, Ci.calIRecurrenceDate);
          if (
            ritem.isNegative &&
            wrappedRItem &&
            !originalItem.recurrenceInfo.getRecurrenceItems().some(recitem => {
              let wrappedR = cal.wrapInstance(recitem, Ci.calIRecurrenceDate);
              return (
                recitem.isNegative && wrappedR && wrappedR.date.compare(wrappedRItem.date) == 0
              );
            })
          ) {
            exdates.push(wrappedRItem);
          }
        }
        if (exdates.length > 0) {
          // check whether really only EXDATEs have been added:
          let recInfo = clonedItem.recurrenceInfo;
          exdates.forEach(recInfo.deleteRecurrenceItem, recInfo);
          if (cal.item.compareContent(clonedItem, originalItem)) {
            // transition into "delete occurrence(s)"
            // xxx todo: support multiple
            item = originalItem.recurrenceInfo.getOccurrenceFor(exdates[0].date);
            originalItem = null;
            opType = Ci.calIOperationListener.DELETE;
          }
        }
      }
    }

    // for backward compatibility, we assume USER mode if not set otherwise
    let autoResponse = { mode: Ci.calIItipItem.USER };
    if (extResponse && extResponse.hasOwnProperty("responseMode")) {
      switch (extResponse.responseMode) {
        case Ci.calIItipItem.AUTO:
        case Ci.calIItipItem.NONE:
        case Ci.calIItipItem.USER:
          autoResponse.mode = extResponse.responseMode;
          break;
        default:
          cal.ERROR(
            "cal.itip.checkAndSend(): Invalid value " +
              extResponse.responseMode +
              " provided for responseMode attribute in argument extResponse." +
              " Falling back to USER mode.\r\n" +
              cal.STACK(20)
          );
      }
    } else if ((originalItem && originalItem.getAttendees().length) || item.getAttendees().length) {
      // let's log something useful to notify addon developers or find any
      // missing pieces in the conversions if the current or original item
      // has attendees - the latter is to prevent logging if creating events
      // by click and slide in day or week views
      cal.LOG(
        "cal.itip.checkAndSend: no response mode provided, " +
          "falling back to USER mode.\r\n" +
          cal.STACK(20)
      );
    }
    if (autoResponse.mode == Ci.calIItipItem.NONE) {
      // we stop here and don't send anything if the user opted out before
      return this.pendingMessageCount;
    }

    if (invitedAttendee) {
      // actually is an invitation copy, fix attendee list to send REPLY
      /* We check if the attendee id matches one of of the
       * userAddresses. If they aren't equal, it means that
       * someone is accepting invitations on behalf of an other user. */
      if (item.calendar.aclEntry) {
        let userAddresses = item.calendar.aclEntry.getUserAddresses();
        if (
          userAddresses.length > 0 &&
          !cal.email.attendeeMatchesAddresses(invitedAttendee, userAddresses)
        ) {
          invitedAttendee = invitedAttendee.clone();
          invitedAttendee.setProperty("SENT-BY", "mailto:" + userAddresses[0]);
        }
      }
      if (item.organizer) {
        let origInvitedAttendee = originalItem && originalItem.getAttendeeById(invitedAttendee.id);

        if (opType == Ci.calIOperationListener.DELETE) {
          // in case the attendee has just deleted the item, we want to send out a DECLINED REPLY:
          origInvitedAttendee = invitedAttendee;
          invitedAttendee = invitedAttendee.clone();
          invitedAttendee.participationStatus = "DECLINED";
        }

        // We want to send a REPLY send if:
        // - there has been a PARTSTAT change
        // - in case of an organizer SEQUENCE bump we'd go and reconfirm our PARTSTAT
        if (
          !origInvitedAttendee ||
          origInvitedAttendee.participationStatus != invitedAttendee.participationStatus ||
          (originalItem && cal.itip.getSequence(item) != cal.itip.getSequence(originalItem))
        ) {
          item = item.clone();
          item.removeAllAttendees();
          item.addAttendee(invitedAttendee);
          // we remove X-MS-OLK-SENDER to avoid confusing Outlook 2007+ (w/o Exchange)
          // about the notification sender (see bug 603933)
          item.deleteProperty("X-MS-OLK-SENDER");

          // Do not send the X-MOZ-INVITED-ATTENDEE property.
          item.deleteProperty("X-MOZ-INVITED-ATTENDEE");

          // if the event was delegated to the replying attendee, we may also notify also
          // the delegator due to chapter 3.2.2.3. of RfC 5546
          let replyTo = [];
          let delegatorIds = invitedAttendee.getProperty("DELEGATED-FROM");
          if (
            delegatorIds &&
            Services.prefs.getBoolPref("calendar.itip.notifyDelegatorOnReply", false)
          ) {
            let getDelegator = function (aDelegatorId) {
              let delegator = originalItem.getAttendeeById(aDelegatorId);
              if (delegator) {
                replyTo.push(delegator);
              }
            };
            // Our backends currently do not support multi-value params. libical just
            // swallows any value but the first, while ical.js fails to parse the item
            // at all. Single values are handled properly by both backends though.
            // Once bug 1206502 lands, ical.js will handle multi-value params, but
            // we end up in different return types of getProperty. A native exposure of
            // DELEGATED-FROM and DELEGATED-TO in calIAttendee may change this.
            if (Array.isArray(delegatorIds)) {
              for (let delegatorId of delegatorIds) {
                getDelegator(delegatorId);
              }
            } else if (typeof delegatorIds == "string") {
              getDelegator(delegatorIds);
            }
          }
          replyTo.push(item.organizer);
          this.pendingMessages.push(
            new CalItipOutgoingMessage("REPLY", replyTo, item, invitedAttendee, autoResponse)
          );
        }
      }
      return this.pendingMessageCount;
    }

    if (item.getProperty("X-MOZ-SEND-INVITATIONS") != "TRUE") {
      // Only send invitations/cancellations
      // if the user checked the checkbox
      this.pendingMessages = [];
      return this.pendingMessageCount;
    }

    // special handling for invitation with event status cancelled
    if (item.getAttendees().length > 0 && item.getProperty("STATUS") == "CANCELLED") {
      if (cal.itip.getSequence(item) > 0) {
        // make sure we send a cancellation and not an request
        opType = Ci.calIOperationListener.DELETE;
      } else {
        // don't send an invitation, if the event was newly created and has status cancelled
        this.pendingMessages = [];
        return this.pendingMessageCount;
      }
    }

    if (opType == Ci.calIOperationListener.DELETE) {
      this.pendingMessages.push(
        new CalItipOutgoingMessage("CANCEL", item.getAttendees(), item, null, autoResponse)
      );
      return this.pendingMessageCount;
    } // else ADD, MODIFY:

    let originalAtt = originalItem ? originalItem.getAttendees() : [];
    let itemAtt = item.getAttendees();
    let canceledAttendees = [];
    let addedAttendees = [];

    if (itemAtt.length > 0 || originalAtt.length > 0) {
      let attMap = {};
      for (let att of originalAtt) {
        attMap[att.id.toLowerCase()] = att;
      }

      for (let att of itemAtt) {
        if (att.id.toLowerCase() in attMap) {
          // Attendee was in original item.
          delete attMap[att.id.toLowerCase()];
        } else {
          // Attendee only in new item
          addedAttendees.push(att);
        }
      }

      for (let id in attMap) {
        let cancAtt = attMap[id];
        canceledAttendees.push(cancAtt);
      }
    }

    // Check to see if some part of the item was updated, if so, re-send REQUEST
    if (!originalItem || cal.itip.compare(item, originalItem) > 0) {
      // REQUEST
      // check whether it's a simple UPDATE (no SEQUENCE change) or real (RE)REQUEST,
      // in case of time or location/description change.
      let isMinorUpdate =
        originalItem && cal.itip.getSequence(item) == cal.itip.getSequence(originalItem);

      if (
        !isMinorUpdate ||
        !cal.item.compareContent(stripUserData(item), stripUserData(originalItem))
      ) {
        let requestItem = item.clone();
        if (!requestItem.organizer) {
          requestItem.organizer = cal.itip.createOrganizer(requestItem.calendar);
        }

        // Fix up our attendees for invitations using some good defaults
        let recipients = [];
        let reqItemAtt = requestItem.getAttendees();
        if (!isMinorUpdate) {
          requestItem.removeAllAttendees();
        }
        for (let attendee of reqItemAtt) {
          if (!isMinorUpdate) {
            attendee = attendee.clone();
            if (!attendee.role) {
              attendee.role = "REQ-PARTICIPANT";
            }
            attendee.participationStatus = "NEEDS-ACTION";
            attendee.rsvp = "TRUE";
            requestItem.addAttendee(attendee);
          }
          recipients.push(attendee);
        }

        // if send out should be limited to newly added attendees and no major
        // props (attendee is not such) have changed, only the respective attendee
        // is added to the recipient list while the attendee information in the
        // ical is left to enable the new attendee to see who else is attending
        // the event (if not prevented otherwise)
        if (
          isMinorUpdate &&
          addedAttendees.length > 0 &&
          Services.prefs.getBoolPref("calendar.itip.updateInvitationForNewAttendeesOnly", false)
        ) {
          recipients = addedAttendees;
        }

        if (recipients.length > 0) {
          this.pendingMessages.push(
            new CalItipOutgoingMessage("REQUEST", recipients, requestItem, null, autoResponse)
          );
        }
      }
    }

    // Cancel the event for all canceled attendees
    if (canceledAttendees.length > 0) {
      let cancelItem = originalItem.clone();
      cancelItem.removeAllAttendees();
      for (let att of canceledAttendees) {
        cancelItem.addAttendee(att);
      }
      this.pendingMessages.push(
        new CalItipOutgoingMessage("CANCEL", canceledAttendees, cancelItem, null, autoResponse)
      );
    }
    return this.pendingMessageCount;
  }

  /**
   * Sends the iTIP message using the item's calendar transport. This method
   * should be called after detectChanges().
   *
   * @param {calIItipTransport} [transport] - An optional transport to use
   *  instead of the one provided by the item's calendar.
   *
   * @returns {boolean} - True, if the message could be sent.
   */
  send(transport) {
    return this.pendingMessages.every(msg => msg.send(transport));
  }
}

/**
 * Strips user specific data, e.g. categories and alarm settings and returns the stripped item.
 *
 * @param {calIItemBase} item_ - The item to strip data from
 * @returns {calIItemBase} - The stripped item
 */
function stripUserData(item_) {
  let item = item_.clone();
  let stamp = item.stampTime;
  let lastModified = item.lastModifiedTime;
  item.clearAlarms();
  item.alarmLastAck = null;
  item.setCategories([]);
  item.deleteProperty("RECEIVED-SEQUENCE");
  item.deleteProperty("RECEIVED-DTSTAMP");
  for (let [name] of item.properties) {
    let pname = name;
    if (pname.substr(0, "X-MOZ-".length) == "X-MOZ-") {
      item.deleteProperty(name);
    }
  }
  item.getAttendees().forEach(att => {
    att.deleteProperty("RECEIVED-SEQUENCE");
    att.deleteProperty("RECEIVED-DTSTAMP");
  });

  // according to RfC 6638, the following items must not be exposed in client side
  // scheduling messages, so let's remove it if present
  let removeSchedulingParams = aCalUser => {
    aCalUser.deleteProperty("SCHEDULE-AGENT");
    aCalUser.deleteProperty("SCHEDULE-FORCE-SEND");
    aCalUser.deleteProperty("SCHEDULE-STATUS");
  };
  item.getAttendees().forEach(removeSchedulingParams);
  if (item.organizer) {
    removeSchedulingParams(item.organizer);
  }

  item.setProperty("DTSTAMP", stamp);
  item.setProperty("LAST-MODIFIED", lastModified); // need to be last to undirty the item
  return item;
}
