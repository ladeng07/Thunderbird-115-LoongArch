/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["CalStorageCalendar"];

const { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
const { CalReadableStreamFactory } = ChromeUtils.import(
  "resource:///modules/CalReadableStreamFactory.jsm"
);
const { CalStorageDatabase } = ChromeUtils.import(
  "resource:///modules/calendar/CalStorageDatabase.jsm"
);
const { CalStorageModelFactory } = ChromeUtils.import(
  "resource:///modules/calendar/CalStorageModelFactory.jsm"
);
const { CalStorageStatements } = ChromeUtils.import(
  "resource:///modules/calendar/CalStorageStatements.jsm"
);
const { upgradeDB } = ChromeUtils.import("resource:///modules/calendar/calStorageUpgrade.jsm");

const kCalICalendar = Ci.calICalendar;
const cICL = Ci.calIChangeLog;

function CalStorageCalendar() {
  this.initProviderBase();
}
var calStorageCalendarClassID = Components.ID("{b3eaa1c4-5dfe-4c0a-b62a-b3a514218461}");
var calStorageCalendarInterfaces = [
  "calICalendar",
  "calICalendarProvider",
  "calIOfflineStorage",
  "calISchedulingSupport",
  "calISyncWriteCalendar",
];
CalStorageCalendar.prototype = {
  __proto__: cal.provider.BaseClass.prototype,
  classID: calStorageCalendarClassID,
  QueryInterface: cal.generateQI(calStorageCalendarInterfaces),
  classInfo: cal.generateCI({
    classID: calStorageCalendarClassID,
    contractID: "@mozilla.org/calendar/calendar;1?type=storage",
    classDescription: "Calendar Storage Provider",
    interfaces: calStorageCalendarInterfaces,
  }),

  //
  // private members
  //
  mStorageDb: null,
  mItemModel: null,
  mOfflineModel: null,
  mMetaModel: null,

  //
  // calICalendarProvider interface
  //

  get displayName() {
    return cal.l10n.getCalString("storageName");
  },

  get shortName() {
    return "SQLite";
  },

  async deleteCalendar(aCalendar, listener) {
    await this.mItemModel.deleteCalendar();
    try {
      if (listener) {
        listener.onDeleteCalendar(aCalendar, Cr.NS_OK, null);
      }
    } catch (ex) {
      this.mStorageDb.logError("error calling listener.onDeleteCalendar", ex);
    }
  },

  detectCalendars() {
    throw Components.Exception(
      "calStorageCalendar does not implement detectCalendars",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  },

  mRelaxedMode: undefined,
  get relaxedMode() {
    if (this.mRelaxedMode === undefined) {
      this.mRelaxedMode = this.getProperty("relaxedMode");
    }
    return this.mRelaxedMode;
  },

  //
  // calICalendar interface
  //

  getProperty(aName) {
    switch (aName) {
      case "cache.supported":
        return false;
      case "requiresNetwork":
        return false;
      case "capabilities.priority.supported":
        return true;
      case "capabilities.removeModes":
        return ["delete"];
    }
    return this.__proto__.__proto__.getProperty.apply(this, arguments);
  },

  get supportsScheduling() {
    return true;
  },

  getSchedulingSupport() {
    return this;
  },

  // readonly attribute AUTF8String type;
  get type() {
    return "storage";
  },

  // attribute AUTF8String id;
  get id() {
    return this.__proto__.__proto__.__lookupGetter__("id").call(this);
  },
  set id(val) {
    this.__proto__.__proto__.__lookupSetter__("id").call(this, val);

    if (!this.mStorageDb && this.uri && this.id) {
      // Prepare the database as soon as we have an id and an uri.
      this.prepareInitDB();
    }
  },

  // attribute nsIURI uri;
  get uri() {
    return this.__proto__.__proto__.__lookupGetter__("uri").call(this);
  },
  set uri(aUri) {
    // We can only load once
    if (this.uri) {
      throw Components.Exception("", Cr.NS_ERROR_FAILURE);
    }

    this.__proto__.__proto__.__lookupSetter__("uri").call(this, aUri);

    if (!this.mStorageDb && this.uri && this.id) {
      // Prepare the database as soon as we have an id and an uri.
      this.prepareInitDB();
    }
  },

  // attribute mozIStorageAsyncConnection db;
  get db() {
    return this.mStorageDb.db;
  },

  /**
   * Initialize the Database. This should generally only be called from the
   * uri or id setter and requires those two attributes to be set. It may also
   * be called again when the schema version of the database is newer than
   * the version expected by this version of Thunderbird.
   */
  prepareInitDB() {
    this.mStorageDb = CalStorageDatabase.connect(this.uri, this.id);
    upgradeDB(this);
  },

  afterUpgradeDB() {
    this.initDB();
    Services.obs.addObserver(this, "profile-change-teardown");
  },

  observe(aSubject, aTopic, aData) {
    if (aTopic == "profile-change-teardown") {
      Services.obs.removeObserver(this, "profile-change-teardown");
      // Finalize the storage statements, but don't close the database.
      // CalStorageDatabase.jsm will take care of that while blocking profile-before-change.
      this.mStatements?.finalize();
    }
  },

  refresh() {
    // no-op
  },

  // Promise<calIItemBase> addItem(in calIItemBase aItem);
  async addItem(aItem) {
    let newItem = aItem.clone();
    return this.adoptItem(newItem);
  },

  // Promise<calIItemBase> adoptItem(in calIItemBase aItem);
  async adoptItem(aItem) {
    let onError = async (message, exception) => {
      this.notifyOperationComplete(
        null,
        exception,
        Ci.calIOperationListener.ADD,
        aItem.id,
        message
      );
      return Promise.reject(new Components.Exception(message, exception));
    };

    if (this.readOnly) {
      return onError("Calendar is readonly", Ci.calIErrors.CAL_IS_READONLY);
    }

    if (aItem.id == null) {
      // is this an error?  Or should we generate an IID?
      aItem.id = cal.getUUID();
    } else {
      let olditem = await this.mItemModel.getItemById(aItem.id);
      if (olditem) {
        if (this.relaxedMode) {
          // we possibly want to interact with the user before deleting
          await this.mItemModel.deleteItemById(aItem.id, true);
        } else {
          return onError("ID already exists for addItem", Ci.calIErrors.DUPLICATE_ID);
        }
      }
    }

    let parentItem = aItem.parentItem;
    if (parentItem != aItem) {
      parentItem = parentItem.clone();
      parentItem.recurrenceInfo.modifyException(aItem, true);
    }
    parentItem.calendar = this.superCalendar;
    parentItem.makeImmutable();

    await this.mItemModel.addItem(parentItem);

    // notify observers
    this.observers.notify("onAddItem", [aItem]);
    return aItem;
  },

  // Promise<calIItemBase> modifyItem(in calIItemBase aNewItem, in calIItemBase aOldItem)
  async modifyItem(aNewItem, aOldItem) {
    // HACK Just modifying the item would clear the offline flag, we need to
    // retrieve the flag and pass it to the real modify function.
    let offlineFlag = await this.getItemOfflineFlag(aOldItem);
    let oldOfflineFlag = offlineFlag;

    let reportError = (errStr, errId = Cr.NS_ERROR_FAILURE) => {
      this.notifyOperationComplete(
        null,
        errId,
        Ci.calIOperationListener.MODIFY,
        aNewItem.id,
        errStr
      );
      return Promise.reject(new Components.Exception(errStr, errId));
    };

    if (this.readOnly) {
      return reportError("Calendar is readonly", Ci.calIErrors.CAL_IS_READONLY);
    }
    if (!aNewItem) {
      return reportError("A modified version of the item is required", Cr.NS_ERROR_INVALID_ARG);
    }
    if (aNewItem.id == null) {
      // this is definitely an error
      return reportError("ID for modifyItem item is null");
    }

    let modifiedItem = aNewItem.parentItem.clone();
    if (this.getProperty("capabilities.propagate-sequence")) {
      // Ensure the exception, its parent and the other exceptions have the
      // same sequence number, to make sure we can send our changes to the
      // server if the event has been updated via the blue bar
      let newSequence = aNewItem.getProperty("SEQUENCE");
      this._propagateSequence(modifiedItem, newSequence);
    }

    // Ensure that we're looking at the base item if we were given an
    // occurrence.  Later we can optimize this.
    if (aNewItem.parentItem != aNewItem) {
      modifiedItem.recurrenceInfo.modifyException(aNewItem, false);
    }

    // If no old item was passed, then we should overwrite in any case.
    // Pick up the old item from the database and use this as an old item
    // later on.
    if (!aOldItem) {
      aOldItem = await this.mItemModel.getItemById(aNewItem.id);
    }

    if (this.relaxedMode) {
      // We've already filled in the old item above, if this doesn't exist
      // then just take the current item as its old version
      if (!aOldItem) {
        aOldItem = aNewItem;
      }
      aOldItem = aOldItem.parentItem;
    } else {
      let storedOldItem = null;
      if (aOldItem) {
        storedOldItem = await this.mItemModel.getItemById(aOldItem.id);
      }
      if (!aOldItem || !storedOldItem) {
        // no old item found?  should be using addItem, then.
        return reportError("ID does not already exist for modifyItem");
      }
      aOldItem = aOldItem.parentItem;

      if (aOldItem.generation != storedOldItem.generation) {
        return reportError("generation too old for for modifyItem");
      }

      // xxx todo: this only modified master item's generation properties
      //           I start asking myself why we need a separate X-MOZ-GENERATION.
      //           Just for the sake of checking inconsistencies of modifyItem calls?
      if (aOldItem.generation == modifiedItem.generation) {
        // has been cloned and modified
        // Only take care of incrementing the generation if relaxed mode is
        // off. Users of relaxed mode need to take care of this themselves.
        modifiedItem.generation += 1;
      }
    }

    modifiedItem.makeImmutable();
    await this.mItemModel.updateItem(modifiedItem, aOldItem);
    await this.mOfflineModel.setOfflineJournalFlag(aNewItem, oldOfflineFlag);

    this.notifyOperationComplete(
      null,
      Cr.NS_OK,
      Ci.calIOperationListener.MODIFY,
      modifiedItem.id,
      modifiedItem
    );

    // notify observers
    this.observers.notify("onModifyItem", [modifiedItem, aOldItem]);
    return modifiedItem;
  },

  // Promise<void> deleteItem(in calIItemBase item)
  async deleteItem(item) {
    let onError = async (message, exception) => {
      this.notifyOperationComplete(
        null,
        exception,
        Ci.calIOperationListener.DELETE,
        item.id,
        message
      );
      return Promise.reject(new Components.Exception(message, exception));
    };

    if (this.readOnly) {
      return onError("Calendar is readonly", Ci.calIErrors.CAL_IS_READONLY);
    }

    if (item.parentItem != item) {
      item.parentItem.recurrenceInfo.removeExceptionFor(item.recurrenceId);
      // xxx todo: would we want to support this case? Removing an occurrence currently results
      //           in a modifyItem(parent)
      return null;
    }

    if (item.id == null) {
      return onError("ID is null for deleteItem", Cr.NS_ERROR_FAILURE);
    }

    await this.mItemModel.deleteItemById(item.id);

    this.notifyOperationComplete(null, Cr.NS_OK, Ci.calIOperationListener.DELETE, item.id, item);

    // notify observers
    this.observers.notify("onDeleteItem", [item]);
    return null;
  },

  // Promise<calIItemBase|null> getItem(in string id);
  async getItem(aId) {
    return this.mItemModel.getItemById(aId);
  },

  // ReadableStream<calIItemBase> getItems(in unsigned long itemFilter,
  //                                       in unsigned long count,
  //                                       in calIDateTime rangeStart,
  //                                       in calIDateTime rangeEnd);
  getItems(itemFilter, count, rangeStart, rangeEnd) {
    let query = {
      rangeStart,
      rangeEnd,
      filters: {
        wantUnrespondedInvitations:
          (itemFilter & kCalICalendar.ITEM_FILTER_REQUEST_NEEDS_ACTION) != 0 &&
          this.superCalendar.supportsScheduling,
        wantEvents: (itemFilter & kCalICalendar.ITEM_FILTER_TYPE_EVENT) != 0,
        wantTodos: (itemFilter & kCalICalendar.ITEM_FILTER_TYPE_TODO) != 0,
        asOccurrences: (itemFilter & kCalICalendar.ITEM_FILTER_CLASS_OCCURRENCES) != 0,
        wantOfflineDeletedItems: (itemFilter & kCalICalendar.ITEM_FILTER_OFFLINE_DELETED) != 0,
        wantOfflineCreatedItems: (itemFilter & kCalICalendar.ITEM_FILTER_OFFLINE_CREATED) != 0,
        wantOfflineModifiedItems: (itemFilter & kCalICalendar.ITEM_FILTER_OFFLINE_MODIFIED) != 0,
        itemCompletedFilter: (itemFilter & kCalICalendar.ITEM_FILTER_COMPLETED_YES) != 0,
        itemNotCompletedFilter: (itemFilter & kCalICalendar.ITEM_FILTER_COMPLETED_NO) != 0,
      },
      count,
    };

    if ((!query.filters.wantEvents && !query.filters.wantTodos) || this.getProperty("disabled")) {
      // nothing to do
      return CalReadableStreamFactory.createEmptyReadableStream();
    }

    return this.mItemModel.getItems(query);
  },

  async getItemOfflineFlag(aItem) {
    // It is possible that aItem can be null, flag provided should be null in this case
    return aItem ? this.mOfflineModel.getItemOfflineFlag(aItem) : null;
  },

  //
  // calIOfflineStorage interface
  //
  async addOfflineItem(aItem) {
    let newOfflineJournalFlag = cICL.OFFLINE_FLAG_CREATED_RECORD;
    await this.mOfflineModel.setOfflineJournalFlag(aItem, newOfflineJournalFlag);
  },

  async modifyOfflineItem(aItem) {
    let oldOfflineJournalFlag = await this.getItemOfflineFlag(aItem);
    let newOfflineJournalFlag = cICL.OFFLINE_FLAG_MODIFIED_RECORD;
    if (
      oldOfflineJournalFlag == cICL.OFFLINE_FLAG_CREATED_RECORD ||
      oldOfflineJournalFlag == cICL.OFFLINE_FLAG_DELETED_RECORD
    ) {
      // Do nothing since a flag of "created" or "deleted" exists
    } else {
      await this.mOfflineModel.setOfflineJournalFlag(aItem, newOfflineJournalFlag);
    }
    this.notifyOperationComplete(null, Cr.NS_OK, Ci.calIOperationListener.MODIFY, aItem.id, aItem);
  },

  async deleteOfflineItem(aItem) {
    let oldOfflineJournalFlag = await this.getItemOfflineFlag(aItem);
    if (oldOfflineJournalFlag) {
      // Delete item if flag is set
      if (oldOfflineJournalFlag == cICL.OFFLINE_FLAG_CREATED_RECORD) {
        await this.mItemModel.deleteItemById(aItem.id);
      } else if (oldOfflineJournalFlag == cICL.OFFLINE_FLAG_MODIFIED_RECORD) {
        await this.mOfflineModel.setOfflineJournalFlag(aItem, cICL.OFFLINE_FLAG_DELETED_RECORD);
      }
    } else {
      await this.mOfflineModel.setOfflineJournalFlag(aItem, cICL.OFFLINE_FLAG_DELETED_RECORD);
    }

    // notify observers
    this.observers.notify("onDeleteItem", [aItem]);
  },

  async resetItemOfflineFlag(aItem) {
    await this.mOfflineModel.setOfflineJournalFlag(aItem, null);
  },

  //
  // database handling
  //

  // database initialization
  // assumes this.mStorageDb is valid

  initDB() {
    cal.ASSERT(this.mStorageDb, "Database has not been opened!", true);

    try {
      this.mStorageDb.executeSimpleSQL("PRAGMA journal_mode=WAL");
      this.mStorageDb.executeSimpleSQL("PRAGMA cache_size=-10240"); // 10 MiB
      this.mStatements = new CalStorageStatements(this.mStorageDb);
      this.mItemModel = CalStorageModelFactory.createInstance(
        "cached-item",
        this.mStorageDb,
        this.mStatements,
        this
      );
      this.mOfflineModel = CalStorageModelFactory.createInstance(
        "offline",
        this.mStorageDb,
        this.mStatements,
        this
      );
      this.mMetaModel = CalStorageModelFactory.createInstance(
        "metadata",
        this.mStorageDb,
        this.mStatements,
        this
      );
    } catch (e) {
      this.mStorageDb.logError("Error initializing statements.", e);
    }
  },

  async shutdownDB() {
    try {
      this.mStatements.finalize();
      if (this.mStorageDb) {
        await this.mStorageDb.close();
        this.mStorageDb = null;
      }
    } catch (e) {
      cal.ERROR("Error closing storage database: " + e);
    }
  },

  //
  // calISyncWriteCalendar interface
  //

  setMetaData(id, value) {
    this.mMetaModel.deleteMetaDataById(id);
    this.mMetaModel.addMetaData(id, value);
  },

  deleteMetaData(id) {
    this.mMetaModel.deleteMetaDataById(id);
  },

  getMetaData(id) {
    return this.mMetaModel.getMetaData(id);
  },

  getAllMetaDataIds() {
    return this.mMetaModel.getAllMetaData("item_id");
  },

  getAllMetaDataValues() {
    return this.mMetaModel.getAllMetaData("value");
  },

  /**
   * propagate the given sequence in exceptions. It may be needed by some calendar implementations
   */
  _propagateSequence(aItem, newSequence) {
    if (newSequence) {
      aItem.setProperty("SEQUENCE", newSequence);
    } else {
      aItem.deleteProperty("SEQUENCE");
    }
    let rec = aItem.recurrenceInfo;
    if (rec) {
      let exceptions = rec.getExceptionIds();
      if (exceptions.length > 0) {
        for (let exid of exceptions) {
          let ex = rec.getExceptionFor(exid);
          if (newSequence) {
            ex.setProperty("SEQUENCE", newSequence);
          } else {
            ex.deleteProperty("SEQUENCE");
          }
        }
      }
    }
  },
};
