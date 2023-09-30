/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

import { MailTabButton } from "chrome://messenger/content/unifiedtoolbar/mail-tab-button.mjs";

/* import-globals-from ../../../../../calendar/base/content/calendar-extract.js */

/**
 * Unified toolbar button to add the selected message to a calendar as event or
 * task.
 * Attributes:
 * - type: "event" or "task", specifying the target type to create.
 */
class AddToCalendarButton extends MailTabButton {
  onCommandContextChange() {
    const tabmail = document.getElementById("tabmail");
    const about3Pane = tabmail.currentAbout3Pane;
    this.disabled =
      !tabmail.currentAboutMessage ||
      (about3Pane && !about3Pane.gDBView) ||
      (about3Pane?.gDBView?.numSelected ?? -1) === 0;
  }

  handleClick = event => {
    const type = this.getAttribute("type");
    calendarExtract.extractFromEmail(type !== "task");
    event.preventDefault();
    event.stopPropagation();
  };
}
customElements.define("add-to-calendar-button", AddToCalendarButton, {
  extends: "button",
});
