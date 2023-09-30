/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["MDNService"];

function MDNService() {}

MDNService.prototype = {
  name: "mdn",
  chromePackageName: "messenger",
  showPanel(server) {
    // don't show the panel for news, rss, im or local accounts
    return (
      server.type != "nntp" &&
      server.type != "rss" &&
      server.type != "im" &&
      server.type != "none"
    );
  },

  QueryInterface: ChromeUtils.generateQI(["nsIMsgAccountManagerExtension"]),
};
