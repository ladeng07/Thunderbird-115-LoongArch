/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["AddrBookFileImporter"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);
const { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  MailStringUtils: "resource:///modules/MailStringUtils.jsm",
  exportAttributes: "resource:///modules/AddrBookUtils.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "d3", () => {
  let d3Scope = Cu.Sandbox(null);
  Services.scriptloader.loadSubScript(
    "chrome://global/content/third_party/d3/d3.js",
    d3Scope
  );
  return Cu.waiveXrays(d3Scope.d3);
});

/**
 * A module to import address book files.
 */
class AddrBookFileImporter {
  /**
   * @param {string} type - Source file type, currently supporting "csv",
   *   "ldif", "vcard" and "mab".
   */
  constructor(type) {
    this._type = type;
  }

  /**
   * Callback for progress updates.
   *
   * @param {number} current - Current imported items count.
   * @param {number} total - Total items count.
   */
  onProgress = () => {};

  _logger = console.createInstance({
    prefix: "mail.import",
    maxLogLevel: "Warn",
    maxLogLevelPref: "mail.import.loglevel",
  });

  /**
   * Actually start importing records into a directory.
   *
   * @param {nsIFile} sourceFile - The source file to import from.
   * @param {nsIAbDirectory} targetDirectory - The directory to import into.
   */
  async startImport(sourceFile, targetDirectory) {
    this._logger.debug(
      `Importing ${this._type} file from ${sourceFile.path} into ${targetDirectory.dirName}`
    );
    this._sourceFile = sourceFile;
    this._targetDirectory = targetDirectory;

    switch (this._type) {
      case "csv":
        await this._importCsvFile();
        break;
      case "ldif":
        await this._importLdifFile();
        break;
      case "vcard":
        await this._importVCardFile();
        break;
      case "sqlite":
        await this._importSqliteFile();
        break;
      case "mab":
        await this._importMabFile();
        break;
      default:
        throw Components.Exception(
          `Importing ${this._type} file is not supported`,
          Cr.NS_ERROR_NOT_IMPLEMENTED
        );
    }
  }

  /**
   * Parse a CSV/TSV file to an array of rows, each row is an array of columns.
   * The first row is expected to contain field names. If we recognize all the
   * field names, return an empty array, which means everything is parsed fine.
   * Otherwise, return all the rows.
   *
   * @param {nsIFile} sourceFile - The source file to import from.
   * @returns {string[][]}
   */
  async parseCsvFile(sourceFile) {
    let content = await lazy.MailStringUtils.readEncoded(sourceFile.path);

    let csvRows = lazy.d3.csv.parseRows(content);
    let tsvRows = lazy.d3.tsv.parseRows(content);
    let dsvRows = lazy.d3.dsv(";").parseRows(content);
    if (!csvRows.length && !tsvRows.length && !dsvRows.length) {
      this._csvRows = [];
      return [];
    }
    // If we have more CSV columns, then it's a CSV file, otherwise a TSV file.
    this._csvRows = csvRows[0]?.length > tsvRows[0]?.length ? csvRows : tsvRows;
    // See if it's semicolon separated.
    if (this._csvRows[0]?.length < dsvRows[0]?.length) {
      this._csvRows = dsvRows;
    }

    let bundle = Services.strings.createBundle(
      "chrome://messenger/locale/importMsgs.properties"
    );
    let supportedFieldNames = [];
    this._supportedCsvProperties = [];
    // Collect field names in an exported CSV file, and their corresponding
    // nsIAbCard property names.
    for (let [property, stringId] of lazy.exportAttributes) {
      if (stringId) {
        this._supportedCsvProperties.push(property);
        supportedFieldNames.push(
          bundle.GetStringFromID(stringId).toLowerCase()
        );
      }
    }
    this._csvSkipFirstRow = true;
    this._csvProperties = [];
    // Get the nsIAbCard properties corresponding to the user supplied file.
    for (let field of this._csvRows[0]) {
      if (
        !field &&
        this._csvRows[0].length > 1 &&
        field == this._csvRows[0].at(-1)
      ) {
        // This is the last field and empty, caused by a trailing comma, which
        // is OK.
        return [];
      }
      let index = supportedFieldNames.indexOf(field.toLowerCase());
      if (index == -1) {
        return this._csvRows;
      }
      this._csvProperties.push(this._supportedCsvProperties[index]);
    }
    return [];
  }

  /**
   * Set the address book properties to use when importing.
   *
   * @param {number[]} fieldIndexes - An array of indexes representing the
   *   mapping between the source fields and nsIAbCard fields. For example, [2,
   *   4] means the first field maps to the 2nd property, the second field maps
   *   to the 4th property.
   */
  setCsvFields(fieldIndexes) {
    Services.prefs.setCharPref(
      "mail.import.csv.fields",
      fieldIndexes.join(",")
    );
    this._csvProperties = fieldIndexes.map(
      i => this._supportedCsvProperties[i]
    );
    this._csvSkipFirstRow = Services.prefs.getBoolPref(
      "mail.import.csv.skipfirstrow",
      true
    );
  }

  /**
   * Import the .csv/.tsv source file into the target directory.
   */
  async _importCsvFile() {
    let totalLines = this._csvRows.length - 1;
    let currentLine = 0;

    let startRow = this._csvSkipFirstRow ? 1 : 0;
    for (let row of this._csvRows.slice(startRow)) {
      currentLine++;
      let card = Cc["@mozilla.org/addressbook/cardproperty;1"].createInstance(
        Ci.nsIAbCard
      );
      for (let i = 0; i < row.length; i++) {
        let property = this._csvProperties[i];
        if (!property) {
          continue;
        }
        // Set the field value to the property.
        card.setProperty(property, row[i]);
      }
      this._targetDirectory.addCard(card);
      if (currentLine % 10 == 0) {
        this.onProgress(currentLine, totalLines);
        // Give UI a chance to update the progress bar.
        await new Promise(resolve => lazy.setTimeout(resolve));
      }
    }
    this.onProgress(totalLines, totalLines);
  }

  /**
   * Import the .ldif source file into the target directory.
   */
  async _importLdifFile() {
    this.onProgress(2, 10);
    let ldifService = Cc["@mozilla.org/addressbook/abldifservice;1"].getService(
      Ci.nsIAbLDIFService
    );
    let progress = {};
    ldifService.importLDIFFile(
      this._targetDirectory,
      this._sourceFile,
      false,
      progress
    );
    this.onProgress(10, 10);
  }

  /**
   * Import the .vcf source file into the target directory.
   */
  async _importVCardFile() {
    let vcardService = Cc[
      "@mozilla.org/addressbook/msgvcardservice;1"
    ].getService(Ci.nsIMsgVCardService);

    let content = await IOUtils.readUTF8(this._sourceFile.path);
    // According to rfc6350, \r\n should be used as line break.
    let sep = content.includes("\r\n") ? "\r\n" : "\n";
    let lines = content.trim().split(sep);

    let totalLines = lines.length;
    let currentLine = 0;
    let record = [];

    for (let line of lines) {
      currentLine++;
      if (!line) {
        continue;
      }

      if (line.toLowerCase().trimEnd() == "begin:vcard") {
        if (record.length) {
          throw Components.Exception(
            "Expecting END:VCARD but got BEGIN:VCARD",
            Cr.NS_ERROR_ILLEGAL_VALUE
          );
        }
        record.push(line);
        continue;
      } else if (!record.length) {
        throw Components.Exception(
          `Expecting BEGIN:VCARD but got ${line}`,
          Cr.NS_ERROR_ILLEGAL_VALUE
        );
      }

      record.push(line);

      if (line.toLowerCase().trimEnd() == "end:vcard") {
        this._targetDirectory.addCard(
          vcardService.vCardToAbCard(record.join("\n") + "\n")
        );
        record = [];
        this.onProgress(currentLine, totalLines);
        // Give UI a chance to update the progress bar.
        await new Promise(resolve => lazy.setTimeout(resolve));
      }
    }
    this.onProgress(totalLines, totalLines);
  }

  /**
   * Import the .sqlite source file into the target directory.
   */
  async _importSqliteFile() {
    this.onProgress(2, 10);
    // Create a temporary address book.
    let dirId = MailServices.ab.newAddressBook(
      "tmp",
      "",
      Ci.nsIAbManager.JS_DIRECTORY_TYPE
    );
    let tmpDirectory = MailServices.ab.getDirectoryFromId(dirId);

    try {
      // Close the connection to release the file handler.
      await tmpDirectory.cleanUp();
      // Overwrite the sqlite database file.
      this._sourceFile.copyTo(
        Services.dirsvc.get("ProfD", Ci.nsIFile),
        tmpDirectory.fileName
      );
      // Write-Ahead Logging file contains changes not written to .sqlite file
      // yet.
      let sourceWalFile = this._sourceFile.parent.clone();
      sourceWalFile.append(this._sourceFile.leafName + "-wal");
      if (sourceWalFile.exists()) {
        sourceWalFile.copyTo(
          Services.dirsvc.get("ProfD", Ci.nsIFile),
          tmpDirectory.fileName + "-wal"
        );
      }
      // Open a new connection to use the new database file.
      let uri = tmpDirectory.URI;
      tmpDirectory = Cc[
        "@mozilla.org/addressbook/directory;1?type=jsaddrbook"
      ].createInstance(Ci.nsIAbDirectory);
      tmpDirectory.init(uri);

      for (let card of tmpDirectory.childCards) {
        this._targetDirectory.addCard(card);
      }
      this.onProgress(8, 10);

      for (let sourceList of tmpDirectory.childNodes) {
        let targetList = this._targetDirectory.getMailListFromName(
          sourceList.dirName
        );
        if (!targetList) {
          targetList = this._targetDirectory.addMailList(sourceList);
        }
        for (let card of sourceList.childCards) {
          targetList.addCard(card);
        }
      }
      this.onProgress(10, 10);
    } finally {
      MailServices.ab.deleteAddressBook(tmpDirectory.URI);
    }
  }

  /**
   * Import the .mab source file into the target directory.
   */
  async _importMabFile() {
    this.onProgress(2, 10);
    let importMab = Cc[
      "@mozilla.org/import/import-ab-file;1?type=mab"
    ].createInstance(Ci.nsIImportABFile);
    importMab.readFileToDirectory(this._sourceFile, this._targetDirectory);
    this.onProgress(10, 10);
  }
}
