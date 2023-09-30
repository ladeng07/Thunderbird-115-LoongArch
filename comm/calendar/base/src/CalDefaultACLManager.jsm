/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["CalDefaultACLManager"];

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

function CalDefaultACLManager() {
  this.mCalendarEntries = {};
}

CalDefaultACLManager.prototype = {
  QueryInterface: ChromeUtils.generateQI(["calICalendarACLManager"]),
  classID: Components.ID("{7463258c-6ef3-40a2-89a9-bb349596e927}"),

  mCalendarEntries: null,

  /* calICalendarACLManager */
  _getCalendarEntryCached(aCalendar) {
    let calUri = aCalendar.uri.spec;
    if (!(calUri in this.mCalendarEntries)) {
      this.mCalendarEntries[calUri] = new calDefaultCalendarACLEntry(this, aCalendar);
    }

    return this.mCalendarEntries[calUri];
  },
  getCalendarEntry(aCalendar, aListener) {
    let entry = this._getCalendarEntryCached(aCalendar);
    aListener.onOperationComplete(aCalendar, Cr.NS_OK, Ci.calIOperationListener.GET, null, entry);
  },
  getItemEntry(aItem) {
    let calEntry = this._getCalendarEntryCached(aItem.calendar);
    return new calDefaultItemACLEntry(calEntry);
  },
};

function calDefaultCalendarACLEntry(aMgr, aCalendar) {
  this.mACLManager = aMgr;
  this.mCalendar = aCalendar;
}

calDefaultCalendarACLEntry.prototype = {
  QueryInterface: ChromeUtils.generateQI(["calICalendarACLEntry"]),

  mACLManager: null,

  /* calICalendarACLCalendarEntry */
  get aclManager() {
    return this.mACLManager;
  },

  hasAccessControl: false,
  userIsOwner: true,
  userCanAddItems: true,
  userCanDeleteItems: true,

  _getIdentities() {
    let identities = [];
    cal.email.iterateIdentities(id => identities.push(id));
    return identities;
  },

  getUserAddresses() {
    let identities = this.getUserIdentities();
    let addresses = identities.map(id => id.email);
    return addresses;
  },

  getUserIdentities() {
    let identity = cal.provider.getEmailIdentityOfCalendar(this.mCalendar);
    if (identity) {
      return [identity];
    }
    return this._getIdentities();
  },
  getOwnerIdentities() {
    return this._getIdentities();
  },

  refresh() {},
};

function calDefaultItemACLEntry(aCalendarEntry) {
  this.calendarEntry = aCalendarEntry;
}

calDefaultItemACLEntry.prototype = {
  QueryInterface: ChromeUtils.generateQI(["calIItemACLEntry"]),

  /* calIItemACLEntry */
  calendarEntry: null,
  userCanModify: true,
  userCanRespond: true,
  userCanViewAll: true,
  userCanViewDateAndTime: true,
};
