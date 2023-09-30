/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals MozXULElement, MozElements */ // From calendar-invitations-dialog.xhtml.

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

// Wrap in a block to prevent leaking to window scope.
{
  class MozCalendarInvitationsRichlistitem extends MozElements.MozRichlistitem {
    constructor() {
      super();

      this.mCalendarItem = null;
      this.mInitialParticipationStatus = null;
      this.mParticipationStatus = null;
      this.calInvitationsProps = Services.strings.createBundle(
        "chrome://calendar/locale/calendar-invitations-dialog.properties"
      );
    }

    getString(propName) {
      return this.calInvitationsProps.GetStringFromName(propName);
    }

    connectedCallback() {
      if (this.delayConnectedCallback() || this.hasChildNodes()) {
        return;
      }

      this.setAttribute("is", "calendar-invitations-richlistitem");
      this.classList.add("calendar-invitations-richlistitem");

      this.appendChild(
        MozXULElement.parseXULToFragment(
          `
          <hbox align="start" flex="1">
            <!-- Note: The wrapper div is only here because the XUL box does not
               - properly crop img elements with CSS object-fit and
               - object-position. Should be removed when converting the parent
               - element to HTML. -->
            <html:div>
              <html:img class="calendar-invitations-richlistitem-icon"
                        src="chrome://calendar/skin/shared/calendar-invitations-dialog-list-images.png" />
            </html:div>
            <vbox flex="1">
              <label class="calendar-invitations-richlistitem-title" crop="end"/>
              <label class="calendar-invitations-richlistitem-date" crop="end"/>
              <label class="calendar-invitations-richlistitem-recurrence" crop="end"/>
              <label class="calendar-invitations-richlistitem-location" crop="end"/>
              <label class="calendar-invitations-richlistitem-organizer" crop="end"/>
              <label class="calendar-invitations-richlistitem-attendee" crop="end"/>
              <label class="calendar-invitations-richlistitem-spacer" value="" hidden="true"/>
            </vbox>
            <vbox>
              <button group="${this.getAttribute("itemId")}"
                      type="radio"
                      class="calendar-invitations-richlistitem-accept-button
                      calendar-invitations-richlistitem-button"
                      label="&calendar.invitations.list.accept.button.label;"
                      oncommand="accept();"/>
              <button group="${this.getAttribute("itemId")}"
                      type="radio"
                      class="calendar-invitations-richlistitem-decline-button
                      calendar-invitations-richlistitem-button"
                      label="&calendar.invitations.list.decline.button.label;"
                      oncommand="decline();"/>
            </vbox>
          </hbox>
          `,
          ["chrome://calendar/locale/calendar-invitations-dialog.dtd"]
        )
      );
    }

    set calendarItem(val) {
      this.setCalendarItem(val);
    }

    get calendarItem() {
      return this.mCalendarItem;
    }

    set initialParticipationStatus(val) {
      this.mInitialParticipationStatus = val;
    }

    get initialParticipationStatus() {
      return this.mInitialParticipationStatus;
    }

    set participationStatus(val) {
      this.mParticipationStatus = val;
      let icon = this.querySelector(".calendar-invitations-richlistitem-icon");
      // Status attribute changes the image region in CSS.
      icon.setAttribute("status", val);
      document.l10n.setAttributes(
        icon,
        `calendar-invitation-current-participation-status-icon-${val.toLowerCase()}`
      );
    }

    get participationStatus() {
      return this.mParticipationStatus;
    }

    setCalendarItem(item) {
      this.mCalendarItem = item;
      this.mInitialParticipationStatus = this.getCalendarItemParticipationStatus(item);
      this.participationStatus = this.mInitialParticipationStatus;

      let titleLabel = this.querySelector(".calendar-invitations-richlistitem-title");
      titleLabel.setAttribute("value", item.title);

      let dateLabel = this.querySelector(".calendar-invitations-richlistitem-date");
      let dateString = cal.dtz.formatter.formatItemInterval(item);
      if (item.startDate.isDate) {
        dateString += ", " + this.getString("allday-event");
      }
      dateLabel.setAttribute("value", dateString);

      let recurrenceLabel = this.querySelector(".calendar-invitations-richlistitem-recurrence");
      if (item.recurrenceInfo) {
        recurrenceLabel.setAttribute("value", this.getString("recurrent-event"));
      } else {
        recurrenceLabel.setAttribute("hidden", "true");
        let spacer = this.querySelector(".calendar-invitations-richlistitem-spacer");
        spacer.removeAttribute("hidden");
      }

      let locationLabel = this.querySelector(".calendar-invitations-richlistitem-location");
      let locationProperty = item.getProperty("LOCATION") || this.getString("none");
      let locationString = this.calInvitationsProps.formatStringFromName("location", [
        locationProperty,
      ]);

      locationLabel.setAttribute("value", locationString);

      let organizerLabel = this.querySelector(".calendar-invitations-richlistitem-organizer");
      let org = item.organizer;
      let organizerProperty = "";
      if (org) {
        if (org.commonName && org.commonName.length > 0) {
          organizerProperty = org.commonName;
        } else if (org.id) {
          organizerProperty = org.id.replace(/^mailto:/i, "");
        }
      }
      let organizerString = this.calInvitationsProps.formatStringFromName("organizer", [
        organizerProperty,
      ]);
      organizerLabel.setAttribute("value", organizerString);

      let attendeeLabel = this.querySelector(".calendar-invitations-richlistitem-attendee");
      let att = cal.itip.getInvitedAttendee(item);
      let attendeeProperty = "";
      if (att) {
        if (att.commonName && att.commonName.length > 0) {
          attendeeProperty = att.commonName;
        } else if (att.id) {
          attendeeProperty = att.id.replace(/^mailto:/i, "");
        }
      }
      let attendeeString = this.calInvitationsProps.formatStringFromName("attendee", [
        attendeeProperty,
      ]);
      attendeeLabel.setAttribute("value", attendeeString);
      Array.from(this.querySelectorAll("button")).map(button =>
        button.setAttribute("group", item.hashId)
      );
    }

    getCalendarItemParticipationStatus(item) {
      let att = cal.itip.getInvitedAttendee(item);
      return att ? att.participationStatus : null;
    }

    setCalendarItemParticipationStatus(item, status) {
      if (item.calendar?.supportsScheduling) {
        let att = item.calendar.getSchedulingSupport().getInvitedAttendee(item);
        if (att) {
          let att_ = att.clone();
          att_.participationStatus = status;

          // Update attendee
          item.removeAttendee(att);
          item.addAttendee(att_);
          return true;
        }
      }
      return false;
    }

    accept() {
      this.participationStatus = "ACCEPTED";
    }

    decline() {
      this.participationStatus = "DECLINED";
    }
  }
  customElements.define("calendar-invitations-richlistitem", MozCalendarInvitationsRichlistitem, {
    extends: "richlistitem",
  });
}

window.addEventListener("DOMContentLoaded", onLoad);
window.addEventListener("unload", onUnload);

/**
 * Sets up the invitations dialog from the window arguments, retrieves the
 * invitations from the invitations manager.
 */
async function onLoad() {
  let title = document.title;
  let updatingBox = document.getElementById("updating-box");
  updatingBox.removeAttribute("hidden");
  opener.setCursor("auto");

  let { invitationsManager } = window.arguments[0];
  let items = await cal.iterate.mapStream(invitationsManager.getInvitations(), chunk => {
    document.title = title + " (" + chunk.length + ")";
    let updatingBox = document.getElementById("updating-box");
    updatingBox.setAttribute("hidden", "true");
    let richListBox = document.getElementById("invitations-listbox");
    for (let item of chunk) {
      let newNode = document.createXULElement("richlistitem", {
        is: "calendar-invitations-richlistitem",
      });
      richListBox.appendChild(newNode);
      newNode.calendarItem = item;
    }
  });

  invitationsManager.toggleInvitationsPanel(items);
  updatingBox.setAttribute("hidden", "true");

  let richListBox = document.getElementById("invitations-listbox");
  if (richListBox.getRowCount() > 0) {
    richListBox.selectedIndex = 0;
  } else {
    let noInvitationsBox = document.getElementById("noinvitations-box");
    noInvitationsBox.removeAttribute("hidden");
  }
}

/**
 * Cleans up the invitations dialog, cancels pending requests.
 */
async function onUnload() {
  let args = window.arguments[0];
  return args.invitationsManager.cancelPendingRequests();
}

/**
 * Handler function to be called when the accept button is pressed.
 */
document.addEventListener("dialogaccept", async () => {
  let args = window.arguments[0];
  fillJobQueue(args.queue);
  await args.invitationsManager.processJobQueue(args.queue);
  args.finishedCallBack();
});

/**
 * Handler function to be called when the cancel button is pressed.
 */
document.addEventListener("dialogcancel", () => {
  let args = window.arguments[0];
  args.finishedCallBack();
});

/**
 * Fills the job queue from the invitations-listbox's items. The job queue
 * contains objects for all items that have a modified participation status.
 *
 * @param queue     The queue to fill.
 */
function fillJobQueue(queue) {
  let richListBox = document.getElementById("invitations-listbox");
  let rowCount = richListBox.getRowCount();
  for (let i = 0; i < rowCount; i++) {
    let richListItem = richListBox.getItemAtIndex(i);
    let newStatus = richListItem.participationStatus;
    let oldStatus = richListItem.initialParticipationStatus;
    if (newStatus != oldStatus) {
      let actionString = "modify";
      let oldCalendarItem = richListItem.calendarItem;
      let newCalendarItem = oldCalendarItem.clone();

      // set default alarm on unresponded items that have not been declined:
      if (
        !newCalendarItem.getAlarms().length &&
        oldStatus == "NEEDS-ACTION" &&
        newStatus != "DECLINED"
      ) {
        cal.alarms.setDefaultValues(newCalendarItem);
      }

      richListItem.setCalendarItemParticipationStatus(newCalendarItem, newStatus);
      let job = {
        action: actionString,
        oldItem: oldCalendarItem,
        newItem: newCalendarItem,
      };
      queue.push(job);
    }
  }
}
