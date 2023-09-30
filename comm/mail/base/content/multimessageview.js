/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  DisplayNameUtils: "resource:///modules/DisplayNameUtils.jsm",
  Gloda: "resource:///modules/gloda/Gloda.jsm",
  makeFriendlyDateAgo: "resource:///modules/TemplateUtils.jsm",
  MessageArchiver: "resource:///modules/MessageArchiver.jsm",
  mimeMsgToContentSnippetAndMeta: "resource:///modules/gloda/GlodaContent.jsm",
  MsgHdrToMimeMessage: "resource:///modules/gloda/MimeMessage.jsm",
  PluralStringFormatter: "resource:///modules/TemplateUtils.jsm",
  TagUtils: "resource:///modules/TagUtils.jsm",
});

var gMessenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);

// Set up our string formatter for localizing strings.
XPCOMUtils.defineLazyGetter(this, "formatString", function () {
  let formatter = new PluralStringFormatter(
    "chrome://messenger/locale/multimessageview.properties"
  );
  return function (...args) {
    return formatter.get(...args);
  };
});

/**
 * A LimitIterator is a utility class that allows limiting the maximum number
 * of items to iterate over.
 *
 * @param aArray     The array to iterate over (can be anything with a .length
 *                   property and a subscript operator.
 * @param aMaxLength The maximum number of items to iterate over.
 */
function LimitIterator(aArray, aMaxLength) {
  this._array = aArray;
  this._maxLength = aMaxLength;
}

LimitIterator.prototype = {
  /**
   * Returns true if the iterator won't actually iterate over everything in the
   * array.
   */
  get limited() {
    return this._array.length > this._maxLength;
  },

  /**
   * Returns the number of elements that will actually be iterated over.
   */
  get length() {
    return Math.min(this._array.length, this._maxLength);
  },

  /**
   * Returns the real number of elements in the array.
   */
  get trueLength() {
    return this._array.length;
  },
};

var JS_HAS_SYMBOLS = typeof Symbol === "function";
var ITERATOR_SYMBOL = JS_HAS_SYMBOLS ? Symbol.iterator : "@@iterator";

/**
 * Iterate over the array until we hit the end or the maximum length,
 * whichever comes first.
 */
LimitIterator.prototype[ITERATOR_SYMBOL] = function* () {
  let length = this.length;
  for (let i = 0; i < length; i++) {
    yield this._array[i];
  }
};

/**
 * The MultiMessageSummary class is responsible for populating the message pane
 * with a reasonable summary of a set of messages.
 */
function MultiMessageSummary() {
  this._summarizers = {};
}

MultiMessageSummary.prototype = {
  /**
   * The maximum number of messages to examine in any way.
   */
  kMaxMessages: 10000,

  /**
   * Register a summarizer for a particular type of message summary.
   *
   * @param aSummarizer The summarizer object.
   */
  registerSummarizer(aSummarizer) {
    this._summarizers[aSummarizer.name] = aSummarizer;
    aSummarizer.onregistered(this);
  },

  /**
   * Store a mapping from a message header to the summary node in the DOM. We
   * use this to update things when Gloda tells us to.
   *
   * @param aMsgHdr The nsIMsgDBHdr.
   * @param aNode   The related DOM node.
   */
  mapMsgToNode(aMsgHdr, aNode) {
    let key = aMsgHdr.messageKey + aMsgHdr.folder.URI;
    this._msgNodes[key] = aNode;
  },

  /**
   * Clear all the content from the summary.
   */
  clear() {
    this._selectCallback = null;
    this._listener = null;
    this._glodaQuery = null;
    this._msgNodes = {};

    // Clear the messages list.
    let messageList = document.getElementById("message_list");
    while (messageList.hasChildNodes()) {
      messageList.lastChild.remove();
    }

    // Clear the notice.
    document.getElementById("notice").textContent = "";
  },

  /**
   * Fill in the summary pane describing the selected messages.
   *
   * @param aType       The type of summary to perform (e.g. 'multimessage').
   * @param aMessages   The messages to summarize.
   * @param aDBView     The current DB view.
   * @param aSelectCallback  Called with an array of nsIMsgHdrs when one of
   *                    a summarized message is clicked on.
   * @param [aListener] A listener to be notified when the summary starts and
   *                    finishes.
   */
  summarize(aType, aMessages, aDBView, aSelectCallback, aListener) {
    this.clear();

    this._selectCallback = aSelectCallback;
    this._listener = aListener;
    if (this._listener) {
      this._listener.onLoadStarted();
    }

    // Enable/disable the archive button as appropriate.
    let archiveBtn = document.getElementById("hdrArchiveButton");
    archiveBtn.hidden = !MessageArchiver.canArchive(aMessages);

    // Set archive and delete button listeners.
    let topChromeWindow = window.browsingContext.topChromeWindow;
    archiveBtn.onclick = event => {
      if (event.button == 0) {
        topChromeWindow.goDoCommand("cmd_archive");
      }
    };
    document.getElementById("hdrTrashButton").onclick = event => {
      if (event.button == 0) {
        topChromeWindow.goDoCommand("cmd_delete");
      }
    };

    headerToolbarNavigation.init();

    let summarizer = this._summarizers[aType];
    if (!summarizer) {
      throw new Error('Unknown summarizer "' + aType + '"');
    }

    let messages = new LimitIterator(aMessages, this.kMaxMessages);
    let summarizedMessages = summarizer.summarize(messages, aDBView);

    // Stash somewhere so it doesn't get GC'ed.
    this._glodaQuery = Gloda.getMessageCollectionForHeaders(
      summarizedMessages,
      this
    );
    this._computeSize(messages);
  },

  /**
   * Set the heading for the summary.
   *
   * @param title    The title for the heading.
   * @param subtitle A smaller subtitle for the heading.
   */
  setHeading(title, subtitle) {
    let titleNode = document.getElementById("summary_title");
    let subtitleNode = document.getElementById("summary_subtitle");
    titleNode.textContent = title || "";
    subtitleNode.textContent = subtitle || "";
  },

  /**
   * Create a summary item for a message or thread.
   *
   * @param aMsgOrThread An nsIMsgDBHdr or an array thereof
   * @param [aOptions]   An optional object to customize the output:
   *                      showSubject: true if the subject of the message
   *                        should be shown; defaults to false
   *                      snippetLength: the length in bytes of the message
   *                        snippet; defaults to undefined (let Gloda decide)
   * @returns A DOM node for the summary item.
   */
  makeSummaryItem(aMsgOrThread, aOptions) {
    let message, thread, numUnread, isStarred, tags;
    if (aMsgOrThread instanceof Ci.nsIMsgDBHdr) {
      thread = null;
      message = aMsgOrThread;

      numUnread = message.isRead ? 0 : 1;
      isStarred = message.isFlagged;

      tags = this._getTagsForMsg(message);
    } else {
      thread = aMsgOrThread;
      message = thread[0];

      numUnread = thread.reduce(function (x, hdr) {
        return x + (hdr.isRead ? 0 : 1);
      }, 0);
      isStarred = thread.some(function (hdr) {
        return hdr.isFlagged;
      });

      tags = new Set();
      for (let message of thread) {
        for (let tag of this._getTagsForMsg(message)) {
          tags.add(tag);
        }
      }
    }

    let row = document.createElement("li");
    row.dataset.messageId = message.messageId;
    row.classList.toggle("thread", thread && thread.length > 1);
    row.classList.toggle("unread", numUnread > 0);
    row.classList.toggle("starred", isStarred);

    row.appendChild(document.createElement("div")).classList.add("star");

    let summary = document.createElement("div");
    summary.classList.add("item_summary");
    summary
      .appendChild(document.createElement("div"))
      .classList.add("item_header");
    summary.appendChild(document.createElement("div")).classList.add("snippet");
    row.appendChild(summary);

    let itemHeaderNode = row.querySelector(".item_header");

    let authorNode = document.createElement("span");
    authorNode.classList.add("author");
    authorNode.textContent = DisplayNameUtils.formatDisplayNameList(
      message.mime2DecodedAuthor,
      "from"
    );

    if (aOptions && aOptions.showSubject) {
      authorNode.classList.add("right");
      itemHeaderNode.appendChild(authorNode);

      let subjectNode = document.createElement("span");
      subjectNode.classList.add("subject", "primary_header", "link");
      subjectNode.textContent =
        message.mime2DecodedSubject || formatString("noSubject");
      subjectNode.addEventListener("click", () => this._selectCallback(thread));
      itemHeaderNode.appendChild(subjectNode);

      if (thread && thread.length > 1) {
        let numUnreadStr = "";
        if (numUnread) {
          numUnreadStr = formatString(
            "numUnread",
            [numUnread.toLocaleString()],
            numUnread
          );
        }
        let countStr =
          "(" +
          formatString(
            "numMessages",
            [thread.length.toLocaleString()],
            thread.length
          ) +
          numUnreadStr +
          ")";

        let countNode = document.createElement("span");
        countNode.classList.add("count");
        countNode.textContent = countStr;
        itemHeaderNode.appendChild(countNode);
      }
    } else {
      let dateNode = document.createElement("span");
      dateNode.classList.add("date", "right");
      dateNode.textContent = makeFriendlyDateAgo(new Date(message.date / 1000));
      itemHeaderNode.appendChild(dateNode);

      authorNode.classList.add("primary_header", "link");
      authorNode.addEventListener("click", () => {
        this._selectCallback([message]);
      });
      itemHeaderNode.appendChild(authorNode);
    }

    let tagNode = document.createElement("span");
    tagNode.classList.add("tags");
    this._addTagNodes(tags, tagNode);
    itemHeaderNode.appendChild(tagNode);

    let snippetNode = row.querySelector(".snippet");
    try {
      const kSnippetLength = aOptions && aOptions.snippetLength;
      MsgHdrToMimeMessage(
        message,
        null,
        function (aMsgHdr, aMimeMsg) {
          if (aMimeMsg == null) {
            // Shouldn't happen, but sometimes does?
            return;
          }
          let [text, meta] = mimeMsgToContentSnippetAndMeta(
            aMimeMsg,
            aMsgHdr.folder,
            kSnippetLength
          );
          snippetNode.textContent = text;
          if (meta.author) {
            authorNode.textContent = meta.author;
          }
        },
        false,
        { saneBodySize: true }
      );
    } catch (e) {
      if (e.result == Cr.NS_ERROR_FAILURE) {
        // Offline messages generate exceptions, which is unfortunate.  When
        // that's fixed, this code should adapt. XXX
        snippetNode.textContent = "...";
      } else {
        throw e;
      }
    }
    return row;
  },

  /**
   * Show an informative notice about the summarized messages (e.g. if we only
   * summarized some of them).
   *
   * @param aNoticeText The text to show in the notice.
   */
  showNotice(aNoticeText) {
    let notice = document.getElementById("notice");
    notice.textContent = aNoticeText;
  },

  /**
   * Given a msgHdr, return a list of tag objects. This function just does the
   * messy work of understanding how tags are stored in nsIMsgDBHdrs.  It would
   * be a good candidate for a utility library.
   *
   * @param aMsgHdr The msgHdr whose tags we want.
   * @returns An array of nsIMsgTag objects.
   */
  _getTagsForMsg(aMsgHdr) {
    let keywords = new Set(aMsgHdr.getStringProperty("keywords").split(" "));
    let allTags = MailServices.tags.getAllTags();

    return allTags.filter(function (tag) {
      return keywords.has(tag.key);
    });
  },

  /**
   * Add a list of tags to a DOM node.
   *
   * @param aTags An array (or any iterable) of nsIMsgTag objects.
   * @param aTagsNode The DOM node to contain the list of tags.
   */
  _addTagNodes(aTags, aTagsNode) {
    // Make sure the tags are sorted in their natural order.
    let sortedTags = [...aTags];
    sortedTags.sort(function (a, b) {
      return a.key.localeCompare(b.key) || a.ordinal.localeCompare(b.ordinal);
    });

    for (let tag of sortedTags) {
      let tagNode = document.createElement("span");

      tagNode.className = "tag";
      let color = MailServices.tags.getColorForKey(tag.key);
      if (color) {
        let textColor = !TagUtils.isColorContrastEnough(color)
          ? "white"
          : "black";
        tagNode.setAttribute(
          "style",
          "color: " + textColor + "; background-color: " + color + ";"
        );
      }
      tagNode.dataset.tag = tag.tag;
      tagNode.textContent = tag.tag;
      aTagsNode.appendChild(tagNode);
    }
  },

  /**
   * Compute the size of the messages in the selection and display it in the
   * element of id "size".
   *
   * @param aMessages A LimitIterator of the messages to calculate the size of.
   */
  _computeSize(aMessages) {
    let numBytes = 0;
    for (let msgHdr of aMessages) {
      numBytes += msgHdr.messageSize;
      // XXX do something about news?
    }

    let format = aMessages.limited
      ? "messagesTotalSizeMoreThan"
      : "messagesTotalSize";
    document.getElementById("size").textContent = formatString(format, [
      gMessenger.formatFileSize(numBytes),
    ]);
  },

  // These are listeners for the gloda collections.
  onItemsAdded(aItems) {},
  onItemsModified(aItems) {
    this._processItems(aItems);
  },
  onItemsRemoved(aItems) {},

  /**
   * Given a set of items from a gloda collection, process them and update
   * the display accordingly.
   *
   * @param aItems Contents of a gloda collection.
   */
  _processItems(aItems) {
    let knownMessageNodes = new Map();

    for (let glodaMsg of aItems) {
      // Unread and starred will get set if any of the messages in a collapsed
      // thread qualify.  The trick here is that we may get multiple items
      // corresponding to the same thread (and hence DOM node), so we need to
      // detect when we get the first item for a particular DOM node, stash the
      // preexisting status of that DOM node, an only do transitions if the
      // items warrant it.
      let key = glodaMsg.messageKey + glodaMsg.folder.uri;
      let headerNode = this._msgNodes[key];
      if (!headerNode) {
        continue;
      }
      if (!knownMessageNodes.has(headerNode)) {
        knownMessageNodes.set(headerNode, {
          read: true,
          starred: false,
          tags: new Set(),
        });
      }

      let flags = knownMessageNodes.get(headerNode);

      // Count as read if *all* the messages are read.
      flags.read &= glodaMsg.read;
      // Count as starred if *any* of the messages are starred.
      flags.starred |= glodaMsg.starred;
      // Count as tagged with a tag if *any* of the messages have that tag.
      for (let tag of this._getTagsForMsg(glodaMsg.folderMessage)) {
        flags.tags.add(tag);
      }
    }

    for (let [headerNode, flags] of knownMessageNodes) {
      headerNode.classList.toggle("unread", !flags.read);
      headerNode.classList.toggle("starred", flags.starred);

      // Clear out all the tags and start fresh, just to make sure we don't get
      // out of sync.
      let tagsNode = headerNode.querySelector(".tags");
      while (tagsNode.hasChildNodes()) {
        tagsNode.lastChild.remove();
      }
      this._addTagNodes(flags.tags, tagsNode);
    }
  },

  onQueryCompleted(aCollection) {
    // If we need something that's just available from GlodaMessages, this is
    // where we'll get it initially.
    if (this._listener) {
      this._listener.onLoadCompleted();
    }
  },
};

/**
 * A summarizer to use for a single thread.
 */
function ThreadSummarizer() {}

ThreadSummarizer.prototype = {
  /**
   * The maximum number of messages to summarize.
   */
  kMaxSummarizedMessages: 100,

  /**
   * The length of message snippets to fetch from Gloda.
   */
  kSnippetLength: 300,

  /**
   * Returns a canonical name for this summarizer.
   */
  get name() {
    return "thread";
  },

  /**
   * A function to be called once the summarizer has been registered with the
   * main summary object.
   *
   * @param aContext The MultiMessageSummary object holding this summarizer.
   */
  onregistered(aContext) {
    this.context = aContext;
  },

  /**
   * Summarize a list of messages.
   *
   * @param aMessages A LimitIterator of the messages to summarize.
   * @returns An array of the messages actually summarized.
   */
  summarize(aMessages, aDBView) {
    let messageList = document.getElementById("message_list");

    // Remove all ignored messages from summarization.
    let summarizedMessages = [];
    for (let message of aMessages) {
      if (!message.isKilled) {
        summarizedMessages.push(message);
      }
    }
    let ignoredCount = aMessages.trueLength - summarizedMessages.length;

    // Summarize the selected messages.
    let subject = null;
    let maxCountExceeded = false;
    for (let [i, msgHdr] of summarizedMessages.entries()) {
      if (i == this.kMaxSummarizedMessages) {
        summarizedMessages.length = i;
        maxCountExceeded = true;
        break;
      }

      if (subject == null) {
        subject = msgHdr.mime2DecodedSubject;
      }

      let msgNode = this.context.makeSummaryItem(msgHdr, {
        snippetLength: this.kSnippetLength,
      });
      messageList.appendChild(msgNode);

      this.context.mapMsgToNode(msgHdr, msgNode);
    }

    // Set the heading based on the subject and number of messages.
    let countInfo = formatString(
      "numMessages",
      [aMessages.length.toLocaleString()],
      aMessages.length
    );
    if (ignoredCount != 0) {
      let format = aMessages.limited ? "atLeastNumIgnored" : "numIgnored";
      countInfo += formatString(
        format,
        [ignoredCount.toLocaleString()],
        ignoredCount
      );
    }

    this.context.setHeading(subject || formatString("noSubject"), countInfo);

    if (maxCountExceeded) {
      this.context.showNotice(
        formatString("maxCountExceeded", [
          aMessages.trueLength.toLocaleString(),
          this.kMaxSummarizedMessages.toLocaleString(),
        ])
      );
    }
    return summarizedMessages;
  },
};

/**
 * A summarizer to use when multiple threads are selected.
 */
function MultipleSelectionSummarizer() {}

MultipleSelectionSummarizer.prototype = {
  /**
   * The maximum number of threads to summarize.
   */
  kMaxSummarizedThreads: 100,

  /**
   * The length of message snippets to fetch from Gloda.
   */
  kSnippetLength: 300,

  /**
   * Returns a canonical name for this summarizer.
   */
  get name() {
    return "multipleselection";
  },

  /**
   * A function to be called once the summarizer has been registered with the
   * main summary object.
   *
   * @param aContext The MultiMessageSummary object holding this summarizer.
   */
  onregistered(aContext) {
    this.context = aContext;
  },

  /**
   * Summarize a list of messages.
   *
   * @param aMessages The messages to summarize.
   */
  summarize(aMessages, aDBView) {
    let messageList = document.getElementById("message_list");

    let threads = this._buildThreads(aMessages, aDBView);
    let threadsCount = threads.length;

    // Set the heading based on the number of messages & threads.
    let format = aMessages.limited
      ? "atLeastNumConversations"
      : "numConversations";
    this.context.setHeading(
      formatString(format, [threads.length.toLocaleString()], threads.length)
    );

    // Summarize the selected messages by thread.
    let maxCountExceeded = false;
    for (let [i, msgs] of threads.entries()) {
      if (i == this.kMaxSummarizedThreads) {
        threads.length = i;
        maxCountExceeded = true;
        break;
      }

      let msgNode = this.context.makeSummaryItem(msgs, {
        showSubject: true,
        snippetLength: this.kSnippetLength,
      });
      messageList.appendChild(msgNode);

      for (let msgHdr of msgs) {
        this.context.mapMsgToNode(msgHdr, msgNode);
      }
    }

    if (maxCountExceeded) {
      this.context.showNotice(
        formatString("maxThreadCountExceeded", [
          threadsCount.toLocaleString(),
          this.kMaxSummarizedThreads.toLocaleString(),
        ])
      );

      // Return only the messages for the threads we're actually showing. We
      // need to collapse our array-of-arrays into a flat array.
      return threads.reduce(function (accum, curr) {
        accum.push(...curr);
        return accum;
      }, []);
    }

    // Return everything, since we're showing all the threads. Don't forget to
    // turn it into an array, though!
    return [...aMessages];
  },

  /**
   * Group all the messages to be summarized into threads.
   *
   * @param aMessages The messages to group.
   * @returns An array of arrays of messages, grouped by thread.
   */
  _buildThreads(aMessages, aDBView) {
    // First, we group the messages in threads and count the threads.
    let threads = [];
    let threadMap = {};
    for (let msgHdr of aMessages) {
      let viewThreadId = aDBView.getThreadContainingMsgHdr(msgHdr).threadKey;
      if (!(viewThreadId in threadMap)) {
        threadMap[viewThreadId] = threads.length;
        threads.push([msgHdr]);
      } else {
        threads[threadMap[viewThreadId]].push(msgHdr);
      }
    }
    return threads;
  },
};

var gMessageSummary = new MultiMessageSummary();

gMessageSummary.registerSummarizer(new ThreadSummarizer());
gMessageSummary.registerSummarizer(new MultipleSelectionSummarizer());

/**
 * Roving tab navigation for the header buttons.
 */
const headerToolbarNavigation = {
  /**
   * If the roving tab has already been loaded.
   *
   * @type {boolean}
   */
  isLoaded: false,
  /**
   * Get all currently visible buttons of the message header toolbar.
   *
   * @returns {Array} An array of buttons.
   */
  get headerButtons() {
    return this.headerToolbar.querySelectorAll(
      `toolbarbutton:not([hidden="true"])`
    );
  },

  init() {
    // Bail out if we already initialized this.
    if (this.isLoaded) {
      return;
    }
    this.headerToolbar = document.getElementById("header-view-toolbar");
    this.headerToolbar.addEventListener("keypress", event => {
      this.triggerMessageHeaderRovingTab(event);
    });
    this.updateRovingTab();
    this.isLoaded = true;
  },

  /**
   * Update the `tabindex` attribute of the currently visible buttons.
   */
  updateRovingTab() {
    for (const button of this.headerButtons) {
      button.tabIndex = -1;
    }
    // Allow focus on the first available button.
    // We use `setAttribute` to guarantee compatibility with XUL toolbarbuttons.
    this.headerButtons[0].setAttribute("tabindex", "0");
  },

  /**
   * Handles the keypress event on the message header toolbar.
   *
   * @param {Event} event - The keypress DOMEvent.
   */
  triggerMessageHeaderRovingTab(event) {
    // Expected keyboard actions are Left, Right, Home, End, Space, and Enter.
    if (!["ArrowRight", "ArrowLeft", " ", "Enter"].includes(event.key)) {
      return;
    }

    const headerButtons = [...this.headerButtons];
    const focusableButton = headerButtons.find(b => b.tabIndex != -1);
    let elementIndex = headerButtons.indexOf(focusableButton);

    // TODO: Remove once the buttons are updated to not be XUL
    // NOTE: Normally a button click handler would cover Enter and Space key
    // events. However, we need to prevent the default behavior and explicitly
    // trigger the button click because the XUL toolbarbuttons do not work when
    // the Enter key is pressed. They do work when the Space key is pressed.
    // However, if the toolbarbutton is a dropdown menu, the Space key
    // does not open the menu.
    if (
      event.key == "Enter" ||
      (event.key == " " && event.target.hasAttribute("type"))
    ) {
      event.preventDefault();
      event.target.click();
      return;
    }

    // Find the adjacent focusable element based on the pressed key.
    const isRTL = document.dir == "rtl";
    if (
      (isRTL && event.key == "ArrowLeft") ||
      (!isRTL && event.key == "ArrowRight")
    ) {
      elementIndex++;
      if (elementIndex > headerButtons.length - 1) {
        elementIndex = 0;
      }
    } else if (
      (!isRTL && event.key == "ArrowLeft") ||
      (isRTL && event.key == "ArrowRight")
    ) {
      elementIndex--;
      if (elementIndex == -1) {
        elementIndex = headerButtons.length - 1;
      }
    }

    // Move the focus to a new toolbar button and update the tabindex attribute.
    const newFocusableButton = headerButtons[elementIndex];
    if (newFocusableButton) {
      focusableButton.tabIndex = -1;
      newFocusableButton.setAttribute("tabindex", "0");
      newFocusableButton.focus();
    }
  },
};
