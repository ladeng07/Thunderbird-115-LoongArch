/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["OutlookProfileImporter"];

var { BaseProfileImporter } = ChromeUtils.import(
  "resource:///modules/BaseProfileImporter.jsm"
);
var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

/**
 * A module to import things from an outlook profile dir into the current
 * profile.
 */
class OutlookProfileImporter extends BaseProfileImporter {
  USE_FILE_PICKER = false;

  SUPPORTED_ITEMS = {
    accounts: true,
    addressBooks: true,
    calendars: false,
    mailMessages: true,
  };

  async getSourceProfiles() {
    this._importModule = Cc[
      "@mozilla.org/import/import-outlook;1"
    ].createInstance(Ci.nsIImportModule);
    this._importMailGeneric = this._importModule
      .GetImportInterface("mail")
      .QueryInterface(Ci.nsIImportGeneric);
    let importMail = this._importMailGeneric
      .GetData("mailInterface")
      .QueryInterface(Ci.nsIImportMail);
    let outLocation = {};
    let outFound = {};
    let outUserVerify = {};
    importMail.GetDefaultLocation(outLocation, outFound, outUserVerify);
    if (outLocation.value) {
      return [{ dir: outLocation.value }];
    }
    return [];
  }

  async startImport(sourceProfileDir, items) {
    this._logger.debug(
      `Start importing from ${sourceProfileDir.path}, items=${JSON.stringify(
        items
      )}`
    );
    this._itemsTotalCount = Object.values(items).filter(Boolean).length;
    this._itemsImportedCount = 0;

    if (items.accounts) {
      let importSettings = this._importModule
        .GetImportInterface("settings")
        .QueryInterface(Ci.nsIImportSettings);
      let outLocalAccount = {};
      importSettings.Import(outLocalAccount);
      await this._updateProgress();
      this._onImportAccounts();
    }

    let successStr = Cc["@mozilla.org/supports-string;1"].createInstance(
      Ci.nsISupportsString
    );
    let errorStr = Cc["@mozilla.org/supports-string;1"].createInstance(
      Ci.nsISupportsString
    );

    if (items.mailMessages) {
      // @see nsIImportGeneric.
      let wantsProgress = this._importMailGeneric.WantsProgress();
      this._importMailGeneric.BeginImport(successStr, errorStr);
      if (wantsProgress) {
        while (this._importMailGeneric.GetProgress() < 100) {
          this._logger.debug(
            "Import mail messages progress:",
            this._importMailGeneric.GetProgress()
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          this._importMailGeneric.ContinueImport();
        }
      }
      if (successStr.data) {
        this._logger.debug(
          "Finished importing mail messages:",
          successStr.data
        );
      }
      if (errorStr.data) {
        this._logger.error("Failed to import mail messages:", errorStr.data);
        throw new Error(errorStr.data);
      }
      await this._updateProgress();
    }

    if (items.addressBooks) {
      successStr.data = "";
      errorStr.data = "";

      let importABGeneric = this._importModule
        .GetImportInterface("addressbook")
        .QueryInterface(Ci.nsIImportGeneric);
      // Set import destination to the personal address book.
      let addressDestination = Cc[
        "@mozilla.org/supports-string;1"
      ].createInstance(Ci.nsISupportsString);
      addressDestination.data = "jsaddrbook://abooks.sqlite";
      importABGeneric.SetData("addressDestination", addressDestination);

      // @see nsIImportGeneric.
      let wantsProgress = importABGeneric.WantsProgress();
      importABGeneric.BeginImport(successStr, errorStr);
      if (wantsProgress) {
        while (importABGeneric.GetProgress() < 100) {
          this._logger.debug(
            "Import address books progress:",
            importABGeneric.GetProgress()
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          importABGeneric.ContinueImport();
        }
      }
      if (successStr.data) {
        this._logger.debug(
          "Finished importing address books:",
          successStr.data
        );
      }
      if (errorStr.data) {
        this._logger.error("Failed to import address books:", errorStr.data);
        throw new Error(errorStr.data);
      }
      await this._updateProgress();
    }

    return items.accounts;
  }
}
