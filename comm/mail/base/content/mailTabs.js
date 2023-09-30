/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from mail3PaneWindowCommands.js */
/* import-globals-from mailWindowOverlay.js */
/* import-globals-from messenger.js */

/* globals contentProgress, statusFeedback */ // From mailWindow.js

XPCOMUtils.defineLazyModuleGetters(this, {
  FolderUtils: "resource:///modules/FolderUtils.jsm",
  GlodaSyntheticView: "resource:///modules/gloda/GlodaSyntheticView.jsm",
  MailUtils: "resource:///modules/MailUtils.jsm",
  MsgHdrSyntheticView: "resource:///modules/MsgHdrSyntheticView.jsm",
  MsgHdrToMimeMessage: "resource:///modules/gloda/MimeMessage.jsm",
});

/**
 * Tabs for displaying mail folders and messages.
 */
var mailTabType = {
  name: "mailTab",
  perTabPanel: "vbox",
  _cloneTemplate(template, tab, onDOMContentLoaded, onLoad) {
    let tabmail = document.getElementById("tabmail");

    let clone = document.getElementById(template).content.cloneNode(true);
    let browser = clone.querySelector("browser");
    browser.id = `${tab.mode.name}Browser${tab.mode._nextId}`;
    browser.addEventListener(
      "DOMTitleChanged",
      () => {
        tab.title = browser.contentTitle;
        tabmail.setTabTitle(tab);
      },
      true
    );
    let linkRelIconHandler = event => {
      if (event.target.rel != "icon") {
        return;
      }
      // Allow 3pane and message tab to set a tab favicon. Mail content should
      // not be allowed to do that.
      if (event.target.ownerGlobal.frameElement == browser) {
        tabmail.setTabFavIcon(tab, event.target.href);
      }
    };
    browser.addEventListener("DOMLinkAdded", linkRelIconHandler);
    browser.addEventListener("DOMLinkChanged", linkRelIconHandler);
    if (onDOMContentLoaded) {
      browser.addEventListener(
        "DOMContentLoaded",
        event => {
          if (!tab.closed) {
            onDOMContentLoaded(event.target.ownerGlobal);
          }
        },
        { capture: true, once: true }
      );
    }
    browser.addEventListener(
      "load",
      event => {
        if (!tab.closed) {
          onLoad(event.target.ownerGlobal);
        }
      },
      { capture: true, once: true }
    );

    tab.title = "";
    tab.panel.id = `${tab.mode.name}${tab.mode._nextId}`;
    tab.panel.appendChild(clone);
    // `chromeBrowser` refers to the outermost browser in the tab, i.e. the
    // browser displaying about:3pane or about:message.
    tab.chromeBrowser = browser;
    tab.mode._nextId++;
  },

  closeTab(tab) {},
  saveTabState(tab) {},

  modes: {
    mail3PaneTab: {
      _nextId: 1,
      isDefault: true,

      openTab(tab, args = {}) {
        mailTabType._cloneTemplate(
          "mail3PaneTabTemplate",
          tab,
          win => {
            // Send the state to the page so it can restore immediately.
            win.openingState = args;
          },
          win => {
            win.tabOrWindow = tab;
            // Can we be sure messageBrowser.contentWindow is loaded at this point?
            win.messageBrowser.contentWindow.tabOrWindow = tab;
            if (!args.background) {
              // Update telemetry once the tab has loaded and decided if the
              // panes are visible.
              Services.telemetry.keyedScalarSet(
                "tb.ui.configuration.pane_visibility",
                "folderPane",
                win.paneLayout.folderPaneVisible
              );
              Services.telemetry.keyedScalarSet(
                "tb.ui.configuration.pane_visibility",
                "messagePane",
                win.paneLayout.messagePaneVisible
              );
            }

            // The first tab has loaded and ready for the user to interact with
            // it. We can let the rest of the start-up happen now without
            // appearing to slow the program down.
            if (tab.first) {
              Services.obs.notifyObservers(window, "mail-startup-done");
              requestIdleCallback(function () {
                if (!window.closed) {
                  Services.obs.notifyObservers(
                    window,
                    "mail-idle-startup-tasks-finished"
                  );
                }
              });
            }
          }
        );

        // `browser` and `linkedBrowser` refer to the message display browser
        // within this tab. They may be null if the browser isn't visible.
        // Extension APIs refer to these properties.
        Object.defineProperty(tab, "browser", {
          get() {
            if (!tab.chromeBrowser.contentWindow) {
              return null;
            }

            const { messageBrowser, webBrowser } =
              tab.chromeBrowser.contentWindow;
            if (messageBrowser && !messageBrowser.hidden) {
              return messageBrowser.contentDocument.getElementById(
                "messagepane"
              );
            }
            if (webBrowser && !webBrowser.hidden) {
              return webBrowser;
            }

            return null;
          },
        });
        Object.defineProperty(tab, "linkedBrowser", {
          get() {
            return tab.browser;
          },
        });

        // Content properties.
        Object.defineProperty(tab, "message", {
          get() {
            let dbView = tab.chromeBrowser.contentWindow.gDBView;
            if (dbView?.selection?.count) {
              return dbView.hdrForFirstSelectedMessage;
            }
            return null;
          },
        });
        Object.defineProperty(tab, "folder", {
          get() {
            return tab.chromeBrowser.contentWindow.gFolder;
          },
          set(folder) {
            tab.chromeBrowser.contentWindow.displayFolder(folder.URI);
          },
        });

        tab.canClose = !tab.first;
        return tab;
      },
      persistTab(tab) {
        if (!tab.folder) {
          return null;
        }
        return {
          firstTab: tab.first,
          folderPaneVisible:
            tab.chromeBrowser.contentWindow.paneLayout.folderPaneVisible,
          folderURI: tab.folder.URI,
          messagePaneVisible:
            tab.chromeBrowser.contentWindow.paneLayout.messagePaneVisible,
        };
      },
      restoreTab(tabmail, persistedState) {
        if (!persistedState.firstTab) {
          tabmail.openTab("mail3PaneTab", persistedState);
          return;
        }

        // Manually call onTabRestored, since it is usually called by openTab(),
        // which is skipped for the first tab.
        let restoreState = tabmail._restoringTabState;
        if (restoreState) {
          for (let tabMonitor of tabmail.tabMonitors) {
            try {
              if (
                "onTabRestored" in tabMonitor &&
                restoreState &&
                tabMonitor.monitorName in restoreState.ext
              ) {
                tabMonitor.onTabRestored(
                  tabmail.tabInfo[0],
                  restoreState.ext[tabMonitor.monitorName],
                  false
                );
              }
            } catch (ex) {
              console.error(ex);
            }
          }
        }

        let { chromeBrowser, closed } = tabmail.tabInfo[0];
        if (
          chromeBrowser.contentDocument.readyState == "complete" &&
          chromeBrowser.currentURI.spec == "about:3pane"
        ) {
          chromeBrowser.contentWindow.restoreState(persistedState);
          return;
        }

        // Send the state to the page so it can restore immediately. Don't
        // overwrite any existing state properties from `openTab` (especially
        // `first`), unless there is a newer value.
        let sawDOMContentLoaded = false;
        chromeBrowser.addEventListener(
          "DOMContentLoaded",
          event => {
            if (!closed && event.target == chromeBrowser.contentDocument) {
              let about3Pane = event.target.ownerGlobal;
              about3Pane.openingState = {
                ...about3Pane.openingState,
                ...persistedState,
              };
              sawDOMContentLoaded = true;
            }
          },
          { capture: true, once: true }
        );
        // Didn't see DOMContentLoaded? Restore the state on load. The state
        // from `openTab` has been used by now.
        chromeBrowser.addEventListener(
          "load",
          event => {
            if (
              !closed &&
              !sawDOMContentLoaded &&
              event.target == chromeBrowser.contentDocument
            ) {
              chromeBrowser.contentWindow.restoreState(persistedState);
            }
          },
          { capture: true, once: true }
        );
      },
      showTab(tab) {
        if (
          tab.chromeBrowser.currentURI.spec != "about:3pane" ||
          tab.chromeBrowser.contentDocument.readyState != "complete"
        ) {
          return;
        }

        // Update telemetry when switching to a 3-pane tab. The telemetry
        // reflects the state of the last 3-pane tab that was shown, but not
        // if the state changed since it was shown.
        Services.telemetry.keyedScalarSet(
          "tb.ui.configuration.pane_visibility",
          "folderPane",
          tab.chromeBrowser.contentWindow.paneLayout.folderPaneVisible
        );
        Services.telemetry.keyedScalarSet(
          "tb.ui.configuration.pane_visibility",
          "messagePane",
          tab.chromeBrowser.contentWindow.paneLayout.messagePaneVisible
        );
      },
      supportsCommand(command, tab) {
        return tab.chromeBrowser?.contentWindow.commandController?.supportsCommand(
          command
        );
      },
      isCommandEnabled(command, tab) {
        return tab.chromeBrowser?.contentWindow.commandController?.isCommandEnabled(
          command
        );
      },
      doCommand(command, tab, ...args) {
        tab.chromeBrowser?.contentWindow.commandController?.doCommand(
          command,
          ...args
        );
      },
      getBrowser(tab) {
        return tab.browser;
      },
    },
    mailMessageTab: {
      _nextId: 1,
      openTab(tab, { messageURI, viewWrapper } = {}) {
        mailTabType._cloneTemplate(
          "mailMessageTabTemplate",
          tab,
          win => {
            // Make tabmail give the message pane focus when this tab becomes
            // the active tab.
            tab.lastActiveElement = tab.browser;
          },
          win => {
            win.tabOrWindow = tab;
            win.displayMessage(messageURI, viewWrapper);
          }
        );

        // `browser` and `linkedBrowser` refer to the message display browser
        // within this tab. They may be null if the browser isn't visible.
        // Extension APIs refer to these properties.
        Object.defineProperty(tab, "browser", {
          get() {
            return tab.chromeBrowser.contentDocument?.getElementById(
              "messagepane"
            );
          },
        });
        Object.defineProperty(tab, "linkedBrowser", {
          get() {
            return tab.browser;
          },
        });

        // Content properties.
        Object.defineProperty(tab, "message", {
          get() {
            return tab.chromeBrowser.contentWindow.gMessage;
          },
        });
        Object.defineProperty(tab, "folder", {
          get() {
            return tab.chromeBrowser.contentWindow.gViewWrapper
              ?.displayedFolder;
          },
        });

        return tab;
      },
      persistTab(tab) {
        return { messageURI: tab.chromeBrowser.contentWindow.gMessageURI };
      },
      restoreTab(tabmail, persistedState) {
        tabmail.openTab("mailMessageTab", persistedState);
      },
      showTab(tab) {},
      supportsCommand(command, tab) {
        return tab.chromeBrowser?.contentWindow.commandController?.supportsCommand(
          command
        );
      },
      isCommandEnabled(command, tab) {
        return tab.chromeBrowser.contentWindow.commandController?.isCommandEnabled(
          command
        );
      },
      doCommand(command, tab, ...args) {
        tab.chromeBrowser?.contentWindow.commandController?.doCommand(
          command,
          ...args
        );
      },
      getBrowser(tab) {
        return tab.browser;
      },
    },
  },
};
