/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Used to add smileys to the content of a textnode. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyGetter(lazy, "gTextDecoder", () => {
  return new TextDecoder();
});

ChromeUtils.defineModuleGetter(
  lazy,
  "NetUtil",
  "resource://gre/modules/NetUtil.jsm"
);

var kEmoticonsThemePref = "messenger.options.emoticonsTheme";
var kThemeFile = "theme.json";

Object.defineProperty(lazy, "gTheme", {
  configurable: true,
  enumerable: true,

  get() {
    delete this.gTheme;
    gPrefObserver.init();
    return (this.gTheme = getTheme());
  },
});

var gPrefObserver = {
  init() {
    Services.prefs.addObserver(kEmoticonsThemePref, gPrefObserver);
  },

  observe(aObject, aTopic, aMsg) {
    if (aTopic != "nsPref:changed" || aMsg != kEmoticonsThemePref) {
      throw new Error("bad notification");
    }

    lazy.gTheme = getTheme();
  },
};

function getTheme(aName) {
  let name = aName || Services.prefs.getCharPref(kEmoticonsThemePref);

  let theme = {
    name,
    iconsHash: null,
    json: null,
    regExp: null,
  };

  if (name == "none") {
    return theme;
  }

  if (name == "default") {
    theme.baseUri = "chrome://instantbird-emoticons/skin/";
  } else {
    theme.baseUri = "chrome://" + theme.name + "/skin/";
  }
  try {
    let channel = Services.io.newChannel(
      theme.baseUri + kThemeFile,
      null,
      null,
      null,
      Services.scriptSecurityManager.getSystemPrincipal(),
      null,
      Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
      Ci.nsIContentPolicy.TYPE_IMAGE
    );
    let stream = channel.open();
    let bytes = lazy.NetUtil.readInputStream(stream, stream.available());
    theme.json = JSON.parse(lazy.gTextDecoder.decode(bytes));
    stream.close();
    theme.iconsHash = {};
    for (let smiley of theme.json.smileys) {
      for (let textCode of smiley.textCodes) {
        theme.iconsHash[textCode] = smiley;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return theme;
}

function getRegexp() {
  if (lazy.gTheme.regExp) {
    lazy.gTheme.regExp.lastIndex = 0;
    return lazy.gTheme.regExp;
  }

  // return null if smileys are disabled
  if (!lazy.gTheme.iconsHash) {
    return null;
  }

  if ("" in lazy.gTheme.iconsHash) {
    console.error(
      "Emoticon " +
        lazy.gTheme.iconsHash[""].filename +
        " matches the empty string!"
    );
    delete lazy.gTheme.iconsHash[""];
  }

  let emoticonList = [];
  for (let emoticon in lazy.gTheme.iconsHash) {
    emoticonList.push(emoticon);
  }

  let exp = /[[\]{}()*+?.\\^$|]/g;
  emoticonList = emoticonList
    .sort()
    .reverse()
    .map(x => x.replace(exp, "\\$&"));

  if (!emoticonList.length) {
    // the theme contains no valid emoticon, make sure we will return
    // early next time
    lazy.gTheme.iconsHash = null;
    return null;
  }

  lazy.gTheme.regExp = new RegExp(emoticonList.join("|"), "g");
  return lazy.gTheme.regExp;
}

export function smileTextNode(aNode) {
  /*
   * Skip text nodes that contain the href in the child text node.
   * We must check both the testNode.textContent and the aNode.data since they
   * cover different cases:
   *   textContent: The URL is split over multiple nodes for some reason
   *   data: The URL is not the only content in the link, skip only the one node
   * Check the class name to skip any autolinked nodes from mozTXTToHTMLConv.
   */
  let testNode = aNode;
  while ((testNode = testNode.parentNode)) {
    if (
      testNode.nodeName.toLowerCase() == "a" &&
      (testNode.getAttribute("href") == testNode.textContent.trim() ||
        testNode.getAttribute("href") == aNode.data.trim() ||
        testNode.className.includes("moz-txt-link-"))
    ) {
      return 0;
    }
  }

  let result = 0;
  let exp = getRegexp();
  if (!exp) {
    return result;
  }

  let match;
  while ((match = exp.exec(aNode.data))) {
    let smileNode = aNode.splitText(match.index);
    aNode = smileNode.splitText(exp.lastIndex - match.index);
    // at this point, smileNode is a text node with only the text
    // of the smiley and aNode is a text node with the text after
    // the smiley. The text in aNode hasn't been processed yet.
    let smile = smileNode.data;
    let elt = aNode.ownerDocument.createElement("span");
    elt.appendChild(
      aNode.ownerDocument.createTextNode(lazy.gTheme.iconsHash[smile].glyph)
    );
    // Add the title attribute (to show the original text in a tooltip) in case
    // the replacement was done incorrectly.
    elt.setAttribute("title", smile);
    smileNode.parentNode.replaceChild(elt, smileNode);
    result += 2;
    exp.lastIndex = 0;
  }
  return result;
}
