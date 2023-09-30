/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

add_task(async () => {
  let account = createAccount();
  addIdentity(account);
  let rootFolder = account.incomingServer.rootFolder;
  rootFolder.createSubfolder("windowsEvents", null);
  let testFolder = rootFolder.findSubFolder("windowsEvents");
  createMessages(testFolder, 5);

  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "background.js": async () => {
        // Executes a command, but first loads a second extension with terminated
        // background and waits for it to be restarted due to the executed command.
        async function capturePrimedEvent(eventName, callback) {
          let eventPageExtensionReadyPromise = window.waitForMessage();
          browser.test.sendMessage("capturePrimedEvent", eventName);
          await eventPageExtensionReadyPromise;
          let eventPageExtensionFinishedPromise = window.waitForMessage();
          callback();
          return eventPageExtensionFinishedPromise;
        }

        let listener = {
          tabEvents: [],
          windowEvents: [],
          currentPromise: null,

          pushEvent(...args) {
            browser.test.log(JSON.stringify(args));
            let queue = args[0].startsWith("windows.")
              ? this.windowEvents
              : this.tabEvents;
            queue.push(args);
            if (queue.currentPromise) {
              let p = queue.currentPromise;
              queue.currentPromise = null;
              p.resolve();
            }
          },
          windowsOnCreated(...args) {
            this.pushEvent("windows.onCreated", ...args);
          },
          windowsOnRemoved(...args) {
            this.pushEvent("windows.onRemoved", ...args);
          },
          tabsOnCreated(...args) {
            this.pushEvent("tabs.onCreated", ...args);
          },
          tabsOnRemoved(...args) {
            this.pushEvent("tabs.onRemoved", ...args);
          },
          async checkEvent(expectedEvent, ...expectedArgs) {
            let queue = expectedEvent.startsWith("windows.")
              ? this.windowEvents
              : this.tabEvents;
            if (queue.length == 0) {
              await new Promise(
                resolve => (queue.currentPromise = { resolve })
              );
            }
            let [actualEvent, ...actualArgs] = queue.shift();
            browser.test.assertEq(expectedEvent, actualEvent);
            browser.test.assertEq(expectedArgs.length, actualArgs.length);

            for (let i = 0; i < expectedArgs.length; i++) {
              browser.test.assertEq(
                typeof expectedArgs[i],
                typeof actualArgs[i]
              );
              if (typeof expectedArgs[i] == "object") {
                for (let key of Object.keys(expectedArgs[i])) {
                  browser.test.assertEq(
                    expectedArgs[i][key],
                    actualArgs[i][key]
                  );
                }
              } else {
                browser.test.assertEq(expectedArgs[i], actualArgs[i]);
              }
            }

            return actualArgs;
          },
        };
        browser.tabs.onCreated.addListener(
          listener.tabsOnCreated.bind(listener)
        );
        browser.tabs.onRemoved.addListener(
          listener.tabsOnRemoved.bind(listener)
        );
        browser.windows.onCreated.addListener(
          listener.windowsOnCreated.bind(listener)
        );
        browser.windows.onRemoved.addListener(
          listener.windowsOnRemoved.bind(listener)
        );

        browser.test.log(
          "Collect the ID of the initial window (there must be only one) and tab."
        );

        let initialWindows = await browser.windows.getAll({ populate: true });
        browser.test.assertEq(1, initialWindows.length);
        let [{ id: initialWindow, tabs: initialTabs }] = initialWindows;
        browser.test.assertEq(1, initialTabs.length);
        browser.test.assertEq(0, initialTabs[0].index);
        browser.test.assertTrue(initialTabs[0].mailTab);
        let [{ id: initialTab }] = initialTabs;

        browser.test.log("Open a new main window (messenger.xhtml).");

        let primedMainWindowInfo = await window.sendMessage("openMainWindow");
        let [{ id: mainWindow }] = await listener.checkEvent(
          "windows.onCreated",
          { type: "normal" }
        );
        let [{ id: mainTab }] = await listener.checkEvent("tabs.onCreated", {
          index: 0,
          windowId: mainWindow,
          active: true,
          mailTab: true,
        });
        window.assertDeepEqual(
          [
            {
              id: mainWindow,
              type: "normal",
            },
          ],
          primedMainWindowInfo
        );

        browser.test.log("Open a compose window (messengercompose.xhtml).");

        let primedComposeWindowInfo = await capturePrimedEvent(
          "onCreated",
          () => browser.compose.beginNew()
        );
        let [{ id: composeWindow }] = await listener.checkEvent(
          "windows.onCreated",
          {
            type: "messageCompose",
          }
        );
        let [{ id: composeTab }] = await listener.checkEvent("tabs.onCreated", {
          index: 0,
          windowId: composeWindow,
          active: true,
          mailTab: false,
        });
        window.assertDeepEqual(
          [
            {
              id: composeWindow,
              type: "messageCompose",
            },
          ],
          primedComposeWindowInfo
        );

        browser.test.log("Open a message in a window (messageWindow.xhtml).");

        let primedDisplayWindowInfo = await window.sendMessage(
          "openDisplayWindow"
        );
        let [{ id: displayWindow }] = await listener.checkEvent(
          "windows.onCreated",
          {
            type: "messageDisplay",
          }
        );
        let [{ id: displayTab }] = await listener.checkEvent("tabs.onCreated", {
          index: 0,
          windowId: displayWindow,
          active: true,
          mailTab: false,
        });
        window.assertDeepEqual(
          [
            {
              id: displayWindow,
              type: "messageDisplay",
            },
          ],
          primedDisplayWindowInfo
        );

        browser.test.log("Open a page in a popup window.");

        let primedPopupWindowInfo = await capturePrimedEvent("onCreated", () =>
          browser.windows.create({
            url: "test.html",
            type: "popup",
            width: 800,
            height: 500,
          })
        );
        let [{ id: popupWindow }] = await listener.checkEvent(
          "windows.onCreated",
          {
            type: "popup",
            width: 800,
            height: 500,
          }
        );
        let [{ id: popupTab }] = await listener.checkEvent("tabs.onCreated", {
          index: 0,
          windowId: popupWindow,
          active: true,
          mailTab: false,
        });
        window.assertDeepEqual(
          [
            {
              id: popupWindow,
              type: "popup",
              width: 800,
              height: 500,
            },
          ],
          primedPopupWindowInfo
        );

        browser.test.log("Pause to let windows load properly.");
        // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
        await new Promise(resolve => setTimeout(resolve, 2500));

        browser.test.log("Change focused window.");

        let focusInfoPromise = new Promise(resolve => {
          let listener = windowId => {
            browser.windows.onFocusChanged.removeListener(listener);
            resolve(windowId);
          };
          browser.windows.onFocusChanged.addListener(listener);
        });
        let [primedFocusInfo] = await capturePrimedEvent("onFocusChanged", () =>
          browser.windows.update(composeWindow, { focused: true })
        );
        let focusInfo = await focusInfoPromise;
        let platformInfo = await browser.runtime.getPlatformInfo();

        let expectedWindow = ["mac", "win"].includes(platformInfo.os)
          ? composeWindow
          : browser.windows.WINDOW_ID_NONE;
        window.assertDeepEqual(expectedWindow, primedFocusInfo);
        window.assertDeepEqual(expectedWindow, focusInfo);

        browser.test.log("Close the new main window.");

        let primedMainWindowRemoveInfo = await capturePrimedEvent(
          "onRemoved",
          () => browser.windows.remove(mainWindow)
        );
        await listener.checkEvent("windows.onRemoved", mainWindow);
        await listener.checkEvent("tabs.onRemoved", mainTab, {
          windowId: mainWindow,
          isWindowClosing: true,
        });
        window.assertDeepEqual([mainWindow], primedMainWindowRemoveInfo);

        browser.test.log("Close the compose window.");

        let primedComposWindowRemoveInfo = await capturePrimedEvent(
          "onRemoved",
          () => browser.windows.remove(composeWindow)
        );
        await listener.checkEvent("windows.onRemoved", composeWindow);
        await listener.checkEvent("tabs.onRemoved", composeTab, {
          windowId: composeWindow,
          isWindowClosing: true,
        });
        window.assertDeepEqual([composeWindow], primedComposWindowRemoveInfo);

        browser.test.log("Close the message window.");

        let primedDisplayWindowRemoveInfo = await capturePrimedEvent(
          "onRemoved",
          () => browser.windows.remove(displayWindow)
        );
        await listener.checkEvent("windows.onRemoved", displayWindow);
        await listener.checkEvent("tabs.onRemoved", displayTab, {
          windowId: displayWindow,
          isWindowClosing: true,
        });
        window.assertDeepEqual([displayWindow], primedDisplayWindowRemoveInfo);

        browser.test.log("Close the popup window.");

        let primedPopupWindowRemoveInfo = await capturePrimedEvent(
          "onRemoved",
          () => browser.windows.remove(popupWindow)
        );
        await listener.checkEvent("windows.onRemoved", popupWindow);
        await listener.checkEvent("tabs.onRemoved", popupTab, {
          windowId: popupWindow,
          isWindowClosing: true,
        });
        window.assertDeepEqual([popupWindow], primedPopupWindowRemoveInfo);

        let finalWindows = await browser.windows.getAll({ populate: true });
        browser.test.assertEq(1, finalWindows.length);
        browser.test.assertEq(initialWindow, finalWindows[0].id);
        browser.test.assertEq(1, finalWindows[0].tabs.length);
        browser.test.assertEq(initialTab, finalWindows[0].tabs[0].id);

        browser.test.assertEq(0, listener.tabEvents.length);
        browser.test.assertEq(0, listener.windowEvents.length);
        browser.test.notifyPass("finished");
      },
      "utils.js": await getUtilsJS(),
    },
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["addressBooks"],
    },
  });

  // Function to start an event page extension (MV3), which can be called whenever
  // the main test is about to trigger an event. The extension terminates its
  // background and listens for that single event, verifying it is waking up correctly.
  async function event_page_extension(eventName, actionCallback) {
    let ext = ExtensionTestUtils.loadExtension({
      files: {
        "background.js": async () => {
          // Whenever the extension starts or wakes up, hasFired is set to false. In
          // case of a wake-up, the first fired event is the one that woke up the background.
          let hasFired = false;
          let eventName = browser.runtime.getManifest().description;

          if (
            ["onCreated", "onFocusChanged", "onRemoved"].includes(eventName)
          ) {
            browser.windows[eventName].addListener(async (...args) => {
              // Only send the first event after background wake-up, this should
              // be the only one expected.
              if (!hasFired) {
                hasFired = true;
                browser.test.sendMessage(`${eventName} received`, args);
              }
            });
          }

          browser.test.sendMessage("background started");
        },
      },
      manifest: {
        manifest_version: 3,
        description: eventName,
        background: { scripts: ["background.js"] },
        browser_specific_settings: {
          gecko: { id: `windows.eventpage.${eventName}@mochi.test` },
        },
      },
    });
    await ext.startup();
    await ext.awaitMessage("background started");
    // The listener should be persistent, but not primed.
    assertPersistentListeners(ext, "windows", eventName, { primed: false });

    await ext.terminateBackground({ disableResetIdleForTest: true });
    // Verify the primed persistent listener.
    assertPersistentListeners(ext, "windows", eventName, { primed: true });

    await actionCallback();
    let rv = await ext.awaitMessage(`${eventName} received`);
    await ext.awaitMessage("background started");
    // The listener should be persistent, but not primed.
    assertPersistentListeners(ext, "windows", eventName, { primed: false });

    await ext.unload();
    return rv;
  }

  extension.onMessage("openMainWindow", async () => {
    let primedEventData = await event_page_extension("onCreated", () => {
      return window.MsgOpenNewWindowForFolder(testFolder.URI);
    });
    extension.sendMessage(...primedEventData);
  });

  extension.onMessage("openDisplayWindow", async () => {
    let primedEventData = await event_page_extension("onCreated", () => {
      return openMessageInWindow([...testFolder.messages][0]);
    });
    extension.sendMessage(...primedEventData);
  });

  extension.onMessage("capturePrimedEvent", async eventName => {
    let primedEventData = await event_page_extension(eventName, () => {
      // Resume execution of the main test, after the event page extension has
      // primed its event listeners.
      extension.sendMessage();
    });
    extension.sendMessage(...primedEventData);
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});
