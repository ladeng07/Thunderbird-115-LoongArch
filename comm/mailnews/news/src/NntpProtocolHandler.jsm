/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["NewsProtocolHandler", "SnewsProtocolHandler"];

var { NntpChannel } = ChromeUtils.import("resource:///modules/NntpChannel.jsm");

/**
 * @implements {nsIProtocolHandler}
 */
class NewsProtocolHandler {
  QueryInterface = ChromeUtils.generateQI(["nsIProtocolHandler"]);

  scheme = "news";

  newChannel(uri, loadInfo) {
    let channel = new NntpChannel(uri, loadInfo);
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
NewsProtocolHandler.prototype.classID = Components.ID(
  "{24220ecd-cb05-4676-8a47-fa1da7b86e6e}"
);

class SnewsProtocolHandler extends NewsProtocolHandler {
  scheme = "snews";
}
SnewsProtocolHandler.prototype.classID = Components.ID(
  "{1895016d-5302-46a9-b3f5-9c47694d9eca}"
);
