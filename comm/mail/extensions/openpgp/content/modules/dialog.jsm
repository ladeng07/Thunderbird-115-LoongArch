/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

const EXPORTED_SYMBOLS = ["EnigmailDialog"];

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  EnigmailConstants: "chrome://openpgp/content/modules/constants.jsm",
  EnigmailWindows: "chrome://openpgp/content/modules/windows.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "l10n", () => {
  return new Localization(["messenger/openpgp/openpgp.ftl"], true);
});

var EnigmailDialog = {
  /***
   * Confirmation dialog with OK / Cancel buttons (both customizable)
   *
   * @win:         nsIWindow - parent window to display modal dialog; can be null
   * @mesg:        String    - message text
   * @okLabel:     String    - OPTIONAL label for OK button
   * @cancelLabel: String    - OPTIONAL label for cancel button
   *
   * @return:      Boolean   - true: OK pressed / false: Cancel or ESC pressed
   */
  confirmDlg(win, mesg, okLabel, cancelLabel) {
    let buttonPressed = EnigmailDialog.msgBox(
      win,
      {
        msgtext: mesg,
        button1: okLabel ? okLabel : lazy.l10n.formatValueSync("dlg-button-ok"),
        cancelButton: cancelLabel
          ? cancelLabel
          : lazy.l10n.formatValueSync("dlg-button-cancel"),
        iconType: lazy.EnigmailConstants.ICONTYPE_QUESTION,
        dialogTitle: lazy.l10n.formatValueSync("enig-confirm"),
      },
      null
    );

    return buttonPressed === 0;
  },

  /**
   * Displays an alert dialog.
   *
   * @win:         nsIWindow - parent window to display modal dialog; can be null
   * @mesg:        String    - message text
   *
   * no return value
   */
  alert(win, mesg) {
    EnigmailDialog.msgBox(
      win,
      {
        msgtext: mesg,
        button1: lazy.l10n.formatValueSync("dlg-button-close"),
        iconType: lazy.EnigmailConstants.ICONTYPE_ALERT,
        dialogTitle: lazy.l10n.formatValueSync("enig-alert"),
      },
      null
    );
  },

  /**
   * Displays an information dialog.
   *
   * @win:         nsIWindow - parent window to display modal dialog; can be null
   * @mesg:        String    - message text
   *
   * no return value
   */
  info(win, mesg) {
    EnigmailDialog.msgBox(
      win,
      {
        msgtext: mesg,
        button1: lazy.l10n.formatValueSync("dlg-button-close"),
        iconType: lazy.EnigmailConstants.ICONTYPE_INFO,
        dialogTitle: lazy.l10n.formatValueSync("enig-info"),
      },
      null
    );
  },

  /**
   * Displays a message box with 1-3 optional buttons.
   *
   * @win:           nsIWindow - parent window to display modal dialog; can be null
   * @argsObj:       Object:
   *   - msgtext:       String    - message text
   *   - dialogTitle:   String    - title of the dialog
   *   - checkboxLabel: String    - if not null, display checkbox with text; the
   *                                checkbox state is returned in checkedObj.value
   *   - iconType:      Number    - Icon type: 1=Message / 2=Question / 3=Alert / 4=Error
   *
   *   - buttonX:       String    - Button label (button 1-3) [button1 = "accept" button]
   *                                use "&" to indicate access key
   *   - cancelButton   String    - Label for cancel button
   *     use "buttonType:label" or ":buttonType" to indicate special button types
   *        (buttonType is one of cancel, help, extra1, extra2)
   *     if no button is provided, OK will be displayed
   *
   * @checkedObj:    Object    - holding the checkbox value
   *
   * @return: 0-2: button Number pressed
   *          -1: cancel button, ESC or close window button pressed
   *
   */
  msgBox(win, argsObj, checkedObj) {
    var result = {
      value: -1,
      checked: false,
    };

    if (!win) {
      win = lazy.EnigmailWindows.getBestParentWin();
    }

    win.openDialog(
      "chrome://openpgp/content/ui/enigmailMsgBox.xhtml",
      "",
      "chrome,dialog,modal,centerscreen,resizable",
      argsObj,
      result
    );

    if (argsObj.checkboxLabel) {
      checkedObj.value = result.checked;
    }
    return result.value;
  },

  /**
   * Display an alert message with an OK button and a checkbox to hide
   * the message in the future.
   * In case the checkbox was pressed in the past, the dialog is skipped
   *
   * @win:      nsIWindow - the parent window to hold the modal dialog
   * @mesg:     String    - the localized message to display
   * @prefText: String    - the name of the Enigmail preference to read/store the
   *                        the future display status
   */
  alertPref(win, mesg, prefText) {
    let prefValue = Services.prefs.getBoolPref("temp.openpgp." + prefText);
    if (prefValue) {
      let checkBoxObj = {
        value: false,
      };

      let buttonPressed = EnigmailDialog.msgBox(
        win,
        {
          msgtext: mesg,
          dialogTitle: lazy.l10n.formatValueSync("enig-info"),
          iconType: lazy.EnigmailConstants.ICONTYPE_INFO,
          checkboxLabel: lazy.l10n.formatValueSync("dlg-no-prompt"),
        },
        checkBoxObj
      );

      if (checkBoxObj.value && buttonPressed === 0) {
        Services.prefs.setBoolPref(prefText, false);
      }
    }
  },

  /**
   * Display an alert dialog together with the message "this dialog will be
   * displayed |counter| more times".
   * If |counter| is 0, the dialog is not displayed.
   *
   * @win:           nsIWindow - the parent window to hold the modal dialog
   * @countPrefName: String    - the name of the Enigmail preference to read/store the
   *                             the |counter| value
   * @mesg:          String    - the localized message to display
   *
   */
  alertCount(win, countPrefName, mesg) {
    let alertCount = Services.prefs.getIntPref("temp.openpgp." + countPrefName);
    if (alertCount <= 0) {
      return;
    }

    alertCount--;
    Services.prefs.setIntPref(countPrefName, alertCount);

    if (alertCount > 0) {
      mesg +=
        "\n" +
        lazy.l10n.formatValueSync("repeat-prefix", { count: alertCount }) +
        " ";
      mesg +=
        alertCount == 1
          ? lazy.l10n.formatValueSync("repeat-suffix-singular")
          : lazy.l10n.formatValueSync("repeat-suffix-plural");
    } else {
      mesg += "\n" + lazy.l10n.formatValueSync("no-repeat");
    }

    EnigmailDialog.alert(win, mesg);
  },

  /**
   * Display a confirmation dialog with OK / Cancel buttons (both customizable) and
   * a checkbox to remember the selected choice.
   *
   *
   * @param {nsIWindow} win - Parent window to display modal dialog; can be null
   * @param {mesg} - Mssage text
   * @param {pref} - Full name of preference to read/store the future display status.
   *
   * @param {string} [okLabel] - Label for Ok button.
   * @param {string} [cancelLabel] - Label for Cancel button.
   *
   * @returns {integer} 1: Ok pressed / 0: Cancel pressed / -1: ESC pressed
   *
   * If the dialog is not displayed:
   *  - if @prefText is type Boolean: return 1
   *  - if @prefText is type Number:  return the last choice of the user
   */
  confirmBoolPref(win, mesg, pref, okLabel, cancelLabel) {
    var prefValue = Services.prefs.getBoolPref(pref);
    // boolean: "do not show this dialog anymore" (and return default)
    switch (prefValue) {
      case true: {
        // display
        let checkBoxObj = {
          value: false,
        };
        let buttonPressed = EnigmailDialog.msgBox(
          win,
          {
            msgtext: mesg,
            button1: okLabel
              ? okLabel
              : lazy.l10n.formatValueSync("dlg-button-ok"),
            cancelButton: cancelLabel
              ? cancelLabel
              : lazy.l10n.formatValueSync("dlg-button-cancel"),
            checkboxLabel: lazy.l10n.formatValueSync("dlg-no-prompt"),
            iconType: lazy.EnigmailConstants.ICONTYPE_QUESTION,
            dialogTitle: lazy.l10n.formatValueSync("enig-confirm"),
          },
          checkBoxObj
        );

        if (checkBoxObj.value) {
          Services.prefs.setBoolPref(pref, false);
        }
        return buttonPressed === 0 ? 1 : 0;
      }
      case false: // don't display
        return 1;
      default:
        return -1;
    }
  },

  confirmIntPref(win, mesg, pref, okLabel, cancelLabel) {
    let prefValue = Services.prefs.getIntPref(pref);
    // number: remember user's choice
    switch (prefValue) {
      case 0: {
        // not set
        let checkBoxObj = {
          value: false,
        };
        let buttonPressed = EnigmailDialog.msgBox(
          win,
          {
            msgtext: mesg,
            button1: okLabel
              ? okLabel
              : lazy.l10n.formatValueSync("dlg-button-ok"),
            cancelButton: cancelLabel
              ? cancelLabel
              : lazy.l10n.formatValueSync("dlg-button-cancel"),
            checkboxLabel: lazy.l10n.formatValueSync("dlg-keep-setting"),
            iconType: lazy.EnigmailConstants.ICONTYPE_QUESTION,
            dialogTitle: lazy.l10n.formatValueSync("enig-confirm"),
          },
          checkBoxObj
        );

        if (checkBoxObj.value) {
          Services.prefs.setIntPref(pref, buttonPressed === 0 ? 1 : 0);
        }
        return buttonPressed === 0 ? 1 : 0;
      }
      case 1: // yes
        return 1;
      case 2: // no
        return 0;
    }
    return -1;
  },

  /**
   *  Display a "open file" or "save file" dialog
   *
   *  win:              nsIWindow - parent window
   *  title:            String    - window title
   *  displayDir:       String    - optional: directory to be displayed
   *  save:             Boolean   - true = Save file / false = Open file
   *  multiple:         Boolean   - true = Select multiple files / false = Select single file
   *  defaultExtension: String    - optional: extension for the type of files to work with, e.g. "asc"
   *  defaultName:      String    - optional: filename, incl. extension, that should be suggested to
   *                                the user as default, e.g. "keys.asc"
   *  filterPairs:      Array     - optional: [title, extension], e.g. ["Pictures", "*.jpg; *.png"]
   *
   *  return value:     nsIFile object, or array of nsIFile objects,
   *                    representing the file(s) to load or save
   */
  filePicker(
    win,
    title,
    displayDir,
    save,
    multiple,
    defaultExtension,
    defaultName,
    filterPairs
  ) {
    let filePicker = Cc["@mozilla.org/filepicker;1"].createInstance();
    filePicker = filePicker.QueryInterface(Ci.nsIFilePicker);

    let open = multiple
      ? Ci.nsIFilePicker.modeOpenMultiple
      : Ci.nsIFilePicker.modeOpen;
    let mode = save ? Ci.nsIFilePicker.modeSave : open;

    filePicker.init(win, title, mode);
    if (displayDir) {
      var localFile = Cc["@mozilla.org/file/local;1"].createInstance(
        Ci.nsIFile
      );

      try {
        localFile.initWithPath(displayDir);
        filePicker.displayDirectory = localFile;
      } catch (ex) {}
    }

    if (defaultExtension) {
      filePicker.defaultExtension = defaultExtension;
    }

    if (defaultName) {
      filePicker.defaultString = defaultName;
    }

    let nfilters = 0;
    if (filterPairs && filterPairs.length) {
      nfilters = filterPairs.length / 2;
    }

    for (let index = 0; index < nfilters; index++) {
      filePicker.appendFilter(
        filterPairs[2 * index],
        filterPairs[2 * index + 1]
      );
    }

    filePicker.appendFilters(Ci.nsIFilePicker.filterAll);

    let inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(
      Ci.nsIJSInspector
    );
    let files = [];
    filePicker.open(res => {
      if (
        res != Ci.nsIFilePicker.returnOK &&
        res != Ci.nsIFilePicker.returnReplace
      ) {
        inspector.exitNestedEventLoop();
        return;
      }

      // Loop through multiple selected files only if the dialog was triggered
      // to open files and the `multiple` boolean variable is true.
      if (!save && multiple) {
        for (let file of filePicker.files) {
          // XXX: for some reason QI is needed on Mac.
          files.push(file.QueryInterface(Ci.nsIFile));
        }
      } else {
        files.push(filePicker.file);
      }

      inspector.exitNestedEventLoop();
    });

    inspector.enterNestedEventLoop(0); // wait for async process to terminate

    return multiple ? files : files[0];
  },

  /**
   * Displays a dialog with success/failure information after importing
   * keys.
   *
   * @param win:           nsIWindow - parent window to display modal dialog; can be null
   * @param keyList:       Array of String - imported keyIDs
   *
   * @return: 0-2: button Number pressed
   *          -1: ESC or close window button pressed
   *
   */
  keyImportDlg(win, keyList) {
    var result = {
      value: -1,
      checked: false,
    };

    if (!win) {
      win = lazy.EnigmailWindows.getBestParentWin();
    }

    win.openDialog(
      "chrome://openpgp/content/ui/enigmailKeyImportInfo.xhtml",
      "",
      "chrome,dialog,modal,centerscreen,resizable",
      {
        keyList,
      },
      result
    );

    return result.value;
  },
  /**
   * return a pre-initialized prompt service
   */
  getPromptSvc() {
    return Services.prompt;
  },

  /**
   * Asks user to confirm the import of the given public keys.
   * User is allowed to automatically accept new/undecided keys.
   *
   * @param {nsIDOMWindow} parentWindow - Parent window.
   * @param {object[]} keyPreview - Key details. See EnigmailKey.getKeyListFromKeyBlock().
   * @param {EnigmailKeyObj[]} - Array of key objects.
   * @param {object} outputParams - Out parameters.
   * @param {string} outputParams.acceptance contains the decision. If confirmed.
   * @returns {boolean} true if user confirms import
   *
   */
  confirmPubkeyImport(parentWindow, keyPreview, outputParams) {
    let args = {
      keys: keyPreview,
      confirmed: false,
      acceptance: "",
    };

    parentWindow.browsingContext.topChromeWindow.openDialog(
      "chrome://openpgp/content/ui/confirmPubkeyImport.xhtml",
      "",
      "dialog,modal,centerscreen,resizable",
      args
    );

    if (args.confirmed && outputParams) {
      outputParams.acceptance = args.acceptance;
    }
    return args.confirmed;
  },
};
