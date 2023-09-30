#filter dumbComments emptyLines substitution

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

// What to do when starting up
//  0 = do not connect / show the account manager
//  1 = connect automatically
//  Other values will be added later, for example to start minimized
pref("messenger.startup.action", 1);

// The intervals in seconds between automatic reconnection attempts.
// The last value will be reused for the rest of the reconnection attempts.
// A value of 0 means that there will be no more reconnection attempts.
pref("messenger.accounts.reconnectTimer", "1,5,30,60,90,300,600,1200,3600");

// Maximum number of messages in debug logs.
// 0 = keep all messages
pref("messenger.accounts.maxDebugMessages", 200);

// List of tags ids whose contacts should be shown in the special
// "Other contacts" group.
pref("messenger.buddies.hiddenTags", "");

//  1 prompts the user about the invite,
//  0 ignores the invitations,
// -1 rejects the invitations.
pref("messenger.conversations.autoAcceptChatInvitations", 1);

// Indicates whether the core should always close conversations closed
// by the UI or if they can be put on hold instead.
pref("messenger.conversations.alwaysClose", false);

// Put conversations with contacts on hold by default (i.e. match the default
// behavior for MUCs) as long as .alwaysClose is not true.
pref("messenger.conversations.holdByDefault", false);

pref("messenger.conversations.selections.magicCopyEnabled", true);
pref("messenger.conversations.selections.ellipsis", "chrome://chat/locale/conversations.properties");
pref("messenger.conversations.selections.systemMessagesTemplate", "chrome://chat/locale/conversations.properties");
pref("messenger.conversations.selections.contentMessagesTemplate", "chrome://chat/locale/conversations.properties");
pref("messenger.conversations.selections.actionMessagesTemplate", "chrome://chat/locale/conversations.properties");

pref("messenger.conversations.textbox.autoResize", true);
pref("messenger.conversations.textbox.defaultMaxLines", 5);

// this preference changes how we filter incoming messages
// 0 = no formattings
// 1 = basic formattings (bold, italic, underlined)
// 2 = permissive mode (colors, font face, font size, ...)
pref("messenger.options.filterMode", 2);

// use "none" to disable
pref("messenger.options.emoticonsTheme", "default");
pref("messenger.options.messagesStyle.theme", "bubbles");
pref("messenger.options.messagesStyle.variant", "default");
pref("messenger.options.messagesStyle.combineConsecutive", true);
// if the time interval in seconds between two messages is longer than
// this value, the messages will not be combined
// default 5 minutes
pref("messenger.options.messagesStyle.combineConsecutiveInterval", 300);

pref("messenger.status.reportIdle", true);
// default 5 minutes
pref("messenger.status.timeBeforeIdle", 300);
pref("messenger.status.awayWhenIdle", true);
pref("messenger.status.defaultIdleAwayMessage", "chrome://chat/locale/status.properties");
pref("messenger.status.userIconFileName", "");
pref("messenger.status.userDisplayName", "");

// Default message used when quitting IRC. This is overridable per account.
pref("chat.irc.defaultQuitMessage", "");
// If this is true, requestRooomInfo will return LIST results when it is
// called automatically by the awesometab. Otherwise, requestRoomInfo will
// only do so when explicitly requested by the user, e.g. via the /list command.
pref("chat.irc.automaticList", true);
// Whether to enable or disable message carbons protocol (XEP-0280).
pref("chat.xmpp.messageCarbons", true);
// Disable Facebook and Google Talk as the XMPP gateways no longer exist.
pref("chat.prpls.prpl-facebook.disable", true);
pref("chat.prpls.prpl-gtalk.disable", true);
// Disable Twitter as the streaming API was shut down.
pref("chat.prpls.prpl-twitter.disable", true);
// Disable Yahoo Messenger as legacy Yahoo was shut down.
pref("chat.prpls.prpl-yahoo.disable", true);
// Whether to disable SRV lookups that use the system DNS library.
pref("chat.dns.srv.disable", false);

// Remove deleted message contents from log files
pref("chat.logging.cleanup", true);
pref("chat.logging.cleanup.pending", "[]");

// loglevel is the minimum severity level that a libpurple message
// must have to be reported in the Error Console.
//
// The possible values are:
//   0  Show all libpurple messages (PURPLE_DEBUG_ALL)
//   1  Very verbose (PURPLE_DEBUG_MISC)
//   2  Verbose (PURPLE_DEBUG_INFO)
//   3  Show warnings (PURPLE_DEBUG_WARNING)
//   4  Show errors (PURPLE_DEBUG_ERROR)
//   5  Show only fatal errors (PURPLE_DEBUG_FATAL)

// Setting the loglevel to a value smaller than 2 will cause messages
// with an INFO or MISC severity to be displayed as warnings so that
// their file URL is clickable
#ifndef DEBUG
// By default, show only warning and errors
pref("purple.debug.loglevel", 3);
#else
// On debug builds, show warning, errors and debug information.
pref("purple.debug.loglevel", 2);
#endif

pref("purple.logging.log_chats", true);
pref("purple.logging.log_ims", true);

// Send typing notification in private conversations.
pref("purple.conversations.im.send_typing", true);

// Send read receipts in conversations.
pref("purple.conversations.im.send_read", true);
