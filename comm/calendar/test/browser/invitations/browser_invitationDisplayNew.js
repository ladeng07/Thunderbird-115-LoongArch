/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for the invitation panel display with new events.
 */
"use strict";

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
var { CalItipDefaultEmailTransport } = ChromeUtils.import(
  "resource:///modules/CalItipEmailTransport.jsm"
);
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

var { CalendarTestUtils } = ChromeUtils.import(
  "resource://testing-common/calendar/CalendarTestUtils.jsm"
);

let identity;
let calendar;
let transport;

/**
 * Initialize account, identity and calendar.
 */
add_setup(async function () {
  let account = MailServices.accounts.createAccount();
  account.incomingServer = MailServices.accounts.createIncomingServer(
    "receiver",
    "example.com",
    "imap"
  );
  identity = MailServices.accounts.createIdentity();
  identity.email = "receiver@example.com";
  account.addIdentity(identity);

  await CalendarTestUtils.setCalendarView(window, "month");
  window.goToDate(cal.createDateTime("20220316T191602Z"));

  calendar = CalendarTestUtils.createCalendar("Test");
  transport = new EmailTransport(account, identity);

  let getImipTransport = cal.itip.getImipTransport;
  cal.itip.getImipTransport = () => transport;

  let deleteMgr = Cc["@mozilla.org/calendar/deleted-items-manager;1"].getService(
    Ci.calIDeletedItems
  ).wrappedJSObject;
  let markDeleted = deleteMgr.markDeleted;
  deleteMgr.markDeleted = () => {};

  Services.prefs.setBoolPref("calendar.itip.newInvitationDisplay", true);
  registerCleanupFunction(() => {
    MailServices.accounts.removeAccount(account, true);
    cal.itip.getImipTransport = getImipTransport;
    deleteMgr.markDeleted = markDeleted;
    CalendarTestUtils.removeCalendar(calendar);
    Services.prefs.setBoolPref("calendar.itip.newInvitationDisplay", false);
  });
});

/**
 * Tests the invitation panel shows the correct data when loaded with a new
 * invitation.
 */
add_task(async function testShowPanelData() {
  transport.reset();
  let win = await openImipMessage(new FileUtils.File(getTestFilePath("data/single-event.eml")));
  let panel = win.document
    .getElementById("messageBrowser")
    .contentDocument.querySelector("calendar-invitation-panel");

  if (panel.ownerDocument.hasPendingL10nMutations) {
    await BrowserTestUtils.waitForEvent(panel.ownerDocument, "L10nMutationsFinished");
  }

  let notification = panel.shadowRoot.querySelector("notification-message");
  compareShownPanelValues(notification.shadowRoot, {
    ".notification-message": "You have been invited to this event.",
    ".notification-button-container > button": "More",
  });

  compareShownPanelValues(panel.shadowRoot, {
    "#title": "Single Event",
    "#location": "Somewhere",
    "#partStatTotal": "3 participants",
    '[data-l10n-id="calendar-invitation-panel-partstat-accepted"]': "1 yes",
    '[data-l10n-id="calendar-invitation-panel-partstat-needs-action"]': "2 pending",
    "#attendees li:nth-of-type(1)": "Sender <sender@example.com>",
    "#attendees li:nth-of-type(2)": "Receiver <receiver@example.com>",
    "#attendees li:nth-of-type(3)": "Other <other@example.com>",
    "#description": "An event invitation.",
  });

  Assert.ok(!panel.shadowRoot.querySelector("#actionButtons").hidden, "action buttons shown");
  for (let indicator of [
    ...panel.shadowRoot.querySelectorAll("calendar-invitation-change-indicator"),
  ]) {
    Assert.ok(indicator.hidden, `${indicator.id} is hidden`);
  }
  await BrowserTestUtils.closeWindow(win);
});

/**
 * Tests accepting an invitation and sending a response.
 */
add_task(async function testAcceptWithResponse() {
  transport.reset();
  let win = await openImipMessage(new FileUtils.File(getTestFilePath("data/single-event.eml")));
  let panel = win.document
    .getElementById("messageBrowser")
    .contentDocument.querySelector("calendar-invitation-panel");

  await clickPanelAction(panel, "acceptButton");
  let event = (await CalendarTestUtils.monthView.waitForItemAt(window, 3, 4, 1)).item;
  await doImipBarActionTest(
    {
      calendar,
      transport,
      identity,
      partStat: "ACCEPTED",
    },
    event
  );
  await calendar.deleteItem(event);
  await BrowserTestUtils.closeWindow(win);
});

/**
 * Tests tentatively accepting an invitation and sending a response.
 */
add_task(async function testTentativeWithResponse() {
  transport.reset();
  let win = await openImipMessage(new FileUtils.File(getTestFilePath("data/single-event.eml")));
  let panel = win.document
    .getElementById("messageBrowser")
    .contentDocument.querySelector("calendar-invitation-panel");

  await clickPanelAction(panel, "tentativeButton");
  let event = (await CalendarTestUtils.monthView.waitForItemAt(window, 3, 4, 1)).item;
  await doImipBarActionTest(
    {
      calendar,
      transport,
      identity,
      partStat: "TENTATIVE",
    },
    event
  );

  await calendar.deleteItem(event);
  await BrowserTestUtils.closeWindow(win);
});

/**
 * Tests declining an invitation and sending a response.
 */
add_task(async function testDeclineWithResponse() {
  transport.reset();
  let win = await openImipMessage(new FileUtils.File(getTestFilePath("data/single-event.eml")));
  let panel = win.document
    .getElementById("messageBrowser")
    .contentDocument.querySelector("calendar-invitation-panel");

  await clickPanelAction(panel, "declineButton");
  let event = (await CalendarTestUtils.monthView.waitForItemAt(window, 3, 4, 1)).item;
  await doImipBarActionTest(
    {
      calendar,
      transport,
      identity,
      partStat: "DECLINED",
    },
    event
  );
  await calendar.deleteItem(event);
  await BrowserTestUtils.closeWindow(win);
});

/**
 * Tests accepting an invitation without sending a response.
 */
add_task(async function testAcceptWithoutResponse() {
  transport.reset();
  let win = await openImipMessage(new FileUtils.File(getTestFilePath("data/single-event.eml")));
  let panel = win.document
    .getElementById("messageBrowser")
    .contentDocument.querySelector("calendar-invitation-panel");

  await clickPanelAction(panel, "acceptButton", false);
  let event = (await CalendarTestUtils.monthView.waitForItemAt(window, 3, 4, 1)).item;
  await doImipBarActionTest(
    {
      calendar,
      transport,
      identity,
      partStat: "ACCEPTED",
      noSend: true,
    },
    event
  );
  await calendar.deleteItem(event);
  await BrowserTestUtils.closeWindow(win);
});

/**
 * Tests tentatively accepting an invitation without sending a response.
 */
add_task(async function testTentativeWithoutResponse() {
  transport.reset();
  let win = await openImipMessage(new FileUtils.File(getTestFilePath("data/single-event.eml")));
  let panel = win.document
    .getElementById("messageBrowser")
    .contentDocument.querySelector("calendar-invitation-panel");

  await clickPanelAction(panel, "tentativeButton", false);
  let event = (await CalendarTestUtils.monthView.waitForItemAt(window, 3, 4, 1)).item;
  await doImipBarActionTest(
    {
      calendar,
      transport,
      identity,
      partStat: "TENTATIVE",
      noSend: true,
    },
    event
  );
  await calendar.deleteItem(event);
  await BrowserTestUtils.closeWindow(win);
});

/**
 * Tests declining an invitation without sending a response.
 */
add_task(async function testDeclineWithoutResponse() {
  transport.reset();
  let win = await openImipMessage(new FileUtils.File(getTestFilePath("data/single-event.eml")));
  let panel = win.document
    .getElementById("messageBrowser")
    .contentDocument.querySelector("calendar-invitation-panel");

  await clickPanelAction(panel, "declineButton", false);
  let event = (await CalendarTestUtils.monthView.waitForItemAt(window, 3, 4, 1)).item;
  await doImipBarActionTest(
    {
      calendar,
      transport,
      identity,
      partStat: "DECLINED",
      noSend: true,
    },
    event
  );
  await calendar.deleteItem(event);
  await BrowserTestUtils.closeWindow(win);
});
