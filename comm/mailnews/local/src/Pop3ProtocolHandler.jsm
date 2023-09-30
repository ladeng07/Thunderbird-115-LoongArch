/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["Pop3ProtocolHandler"];

var { Pop3Channel } = ChromeUtils.import("resource:///modules/Pop3Channel.jsm");

/**
 * @implements {nsIProtocolHandler}
 */
class Pop3ProtocolHandler {
  QueryInterface = ChromeUtils.generateQI(["nsIProtocolHandler"]);

  scheme = "pop3";

  newChannel(uri, loadInfo) {
    let channel = new Pop3Channel(uri, loadInfo);
    let spec = uri.spec;
    if (
      spec.includes("part=") &&
      !spec.includes("type=message/rfc822") &&
      !spec.includes("type=application/x-message-display") &&
      !spec.includes("type=application/pdf")
    ) {
      channel.contentDisposition = Ci.nsIChannel.DISPOSITION_ATTACHMENT;
    } else {
      channel.contentDisposition = Ci.nsIChannel.DISPOSITION_INLINE;
    }
    return channel;
  }

  allowPort(port, scheme) {
    return true;
  }
}

Pop3ProtocolHandler.prototype.classID = Components.ID(
  "{eed38573-d01b-4c13-9f9d-f69963095a4d}"
);
