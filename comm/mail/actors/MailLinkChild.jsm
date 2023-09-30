/* vim: set ts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = ["MailLinkChild"];

const PROTOCOLS = ["mailto:", "mid:", "news:", "snews:"];

class MailLinkChild extends JSWindowActorChild {
  handleEvent(event) {
    let href = event.target.href;
    let location = this.document.location;
    if (
      !href ||
      // Do nothing if not the main button clicked.
      event.button > 0 ||
      // Do nothing if in the compose window.
      location.href == "about:blank?compose"
    ) {
      return;
    }

    let url = new URL(href);
    let protocol = url.protocol;
    if (
      PROTOCOLS.includes(protocol) ||
      // A link to an attachment, e.g. cid: link.
      (["imap:", "mailbox:"].includes(protocol) &&
        url.searchParams.get("part") &&
        // Prevent opening new tab for internal pdf link.
        (!location.search.includes("part=") ||
          url.origin != location.origin ||
          url.pathname != location.pathname))
    ) {
      this.sendAsyncMessage(protocol, href);
      event.preventDefault();
    }
  }
}
