/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

add_task(async () => {
  let tabmail = document.getElementById("tabmail");

  let account = createAccount();
  let rootFolder = account.incomingServer.rootFolder;
  rootFolder.createSubfolder("tabsEvents", null);
  let testFolder = rootFolder.findSubFolder("tabsEvents");
  createMessages(testFolder, 5);
  let messages = [...testFolder.messages];

  let extension = ExtensionTestUtils.loadExtension({
    files: {
      "page1.html": "<html><body>Page 1</body></html>",
      "page2.html": "<html><body>Page 2</body></html>",
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
          events: [],
          currentPromise: null,

          pushEvent(...args) {
            browser.test.log(JSON.stringify(args));
            this.events.push(args);
            if (this.currentPromise) {
              let p = this.currentPromise;
              this.currentPromise = null;
              p.resolve(args);
            }
          },
          onCreated(...args) {
            this.pushEvent("onCreated", ...args);
          },
          onUpdated(...args) {
            this.pushEvent("onUpdated", ...args);
          },
          onActivated(...args) {
            this.pushEvent("onActivated", ...args);
          },
          onRemoved(...args) {
            this.pushEvent("onRemoved", ...args);
          },
          async nextEvent() {
            if (this.events.length == 0) {
              return new Promise(
                resolve => (this.currentPromise = { resolve })
              );
            }
            return Promise.resolve(this.events[0]);
          },
          async checkEvent(expectedEvent, ...expectedArgs) {
            await this.nextEvent();
            let [actualEvent, ...actualArgs] = this.events.shift();
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
          async pageLoad(tab, active = true) {
            while (true) {
              // Read the first event without consuming it.
              let [actualEvent, actualTabId, actualInfo, actualTab] =
                await this.nextEvent();
              browser.test.assertEq("onUpdated", actualEvent);
              browser.test.assertEq(tab, actualTabId);

              if (
                actualInfo.status == "loading" ||
                actualTab.url == "about:blank"
              ) {
                // We're not interested in these events. Take them off the list.
                browser.test.log("Skipping this event.");
                this.events.shift();
              } else {
                break;
              }
            }
            await this.checkEvent(
              "onUpdated",
              tab,
              { status: "complete" },
              {
                id: tab,
                windowId: initialWindow,
                active,
                mailTab: false,
              }
            );
          },
        };

        browser.tabs.onCreated.addListener(listener.onCreated.bind(listener));
        browser.tabs.onUpdated.addListener(listener.onUpdated.bind(listener), {
          properties: ["status"],
        });
        browser.tabs.onActivated.addListener(
          listener.onActivated.bind(listener)
        );
        browser.tabs.onRemoved.addListener(listener.onRemoved.bind(listener));

        browser.test.log(
          "Collect the ID of the initial tab (there must be only one) and window."
        );

        let initialTabs = await browser.tabs.query({});
        browser.test.assertEq(1, initialTabs.length);
        browser.test.assertEq(0, initialTabs[0].index);
        browser.test.assertTrue(initialTabs[0].mailTab);
        browser.test.assertEq("mail", initialTabs[0].type);
        let [{ id: initialTab, windowId: initialWindow }] = initialTabs;

        browser.test.log("Add a first content tab and wait for it to load.");

        window.assertDeepEqual(
          [
            {
              index: 1,
              windowId: initialWindow,
              active: true,
              mailTab: false,
              type: "content",
            },
          ],
          await capturePrimedEvent("onCreated", () =>
            browser.tabs.create({
              url: browser.runtime.getURL("page1.html"),
            })
          )
        );
        let [{ id: contentTab1 }] = await listener.checkEvent("onCreated", {
          index: 1,
          windowId: initialWindow,
          active: true,
          mailTab: false,
          type: "content",
        });
        browser.test.assertTrue(contentTab1 != initialTab);
        await listener.pageLoad(contentTab1);
        browser.test.assertEq(
          "content",
          (await browser.tabs.get(contentTab1)).type
        );

        browser.test.log("Add a second content tab and wait for it to load.");

        // The external extension is looking for the onUpdated event, it either be
        // a loading or completed event. Compare with whatever the local extension
        // is getting.
        let locContentTabUpdateInfoPromise = new Promise(resolve => {
          let listener = (...args) => {
            browser.tabs.onUpdated.removeListener(listener);
            resolve(args);
          };
          browser.tabs.onUpdated.addListener(listener, {
            properties: ["status"],
          });
        });
        let primedContentTabUpdateInfo = await capturePrimedEvent(
          "onUpdated",
          () =>
            browser.tabs.create({
              url: browser.runtime.getURL("page2.html"),
            })
        );
        let [{ id: contentTab2 }] = await listener.checkEvent("onCreated", {
          index: 2,
          windowId: initialWindow,
          active: true,
          mailTab: false,
          type: "content",
        });
        let locContentTabUpdateInfo = await locContentTabUpdateInfoPromise;
        window.assertDeepEqual(
          locContentTabUpdateInfo,
          primedContentTabUpdateInfo,
          "primed onUpdated event and non-primed onUpdeated event should receive the same values",
          { strict: true }
        );

        browser.test.assertTrue(
          ![initialTab, contentTab1].includes(contentTab2)
        );
        await listener.pageLoad(contentTab2);
        browser.test.assertEq(
          "content",
          (await browser.tabs.get(contentTab2)).type
        );

        browser.test.log("Add the calendar tab.");

        window.assertDeepEqual(
          [
            {
              index: 3,
              windowId: initialWindow,
              active: true,
              mailTab: false,
              type: "calendar",
            },
          ],
          await capturePrimedEvent("onCreated", () =>
            browser.test.sendMessage("openCalendarTab")
          )
        );
        let [{ id: calendarTab }] = await listener.checkEvent("onCreated", {
          index: 3,
          windowId: initialWindow,
          active: true,
          mailTab: false,
          type: "calendar",
        });
        browser.test.assertTrue(
          ![initialTab, contentTab1, contentTab2].includes(calendarTab)
        );

        browser.test.log("Add the task tab.");

        window.assertDeepEqual(
          [
            {
              index: 4,
              windowId: initialWindow,
              active: true,
              mailTab: false,
              type: "tasks",
            },
          ],
          await capturePrimedEvent("onCreated", () =>
            browser.test.sendMessage("openTaskTab")
          )
        );
        let [{ id: taskTab }] = await listener.checkEvent("onCreated", {
          index: 4,
          windowId: initialWindow,
          active: true,
          mailTab: false,
          type: "tasks",
        });
        browser.test.assertTrue(
          ![initialTab, contentTab1, contentTab2, calendarTab].includes(taskTab)
        );

        browser.test.log("Open a folder in a tab.");

        window.assertDeepEqual(
          [
            {
              index: 5,
              windowId: initialWindow,
              active: true,
              mailTab: true,
              type: "mail",
            },
          ],
          await capturePrimedEvent("onCreated", () =>
            browser.test.sendMessage("openFolderTab")
          )
        );
        let [{ id: folderTab }] = await listener.checkEvent("onCreated", {
          index: 5,
          windowId: initialWindow,
          active: true,
          mailTab: true,
          type: "mail",
        });
        browser.test.assertTrue(
          ![
            initialTab,
            contentTab1,
            contentTab2,
            calendarTab,
            taskTab,
          ].includes(folderTab)
        );

        browser.test.log("Open a first message in a tab.");

        window.assertDeepEqual(
          [
            {
              index: 6,
              windowId: initialWindow,
              active: true,
              mailTab: false,
              type: "messageDisplay",
            },
          ],
          await capturePrimedEvent("onCreated", () =>
            browser.test.sendMessage("openMessageTab", false)
          )
        );

        let [{ id: messageTab1 }] = await listener.checkEvent("onCreated", {
          index: 6,
          windowId: initialWindow,
          active: true,
          mailTab: false,
          type: "messageDisplay",
        });
        browser.test.assertTrue(
          ![
            initialTab,
            contentTab1,
            contentTab2,
            calendarTab,
            taskTab,
            folderTab,
          ].includes(messageTab1)
        );
        await listener.pageLoad(messageTab1);

        browser.test.log(
          "Open a second message in a tab. In the background, just because."
        );

        window.assertDeepEqual(
          [
            {
              index: 7,
              windowId: initialWindow,
              active: false,
              mailTab: false,
              type: "messageDisplay",
            },
          ],
          await capturePrimedEvent("onCreated", () =>
            browser.test.sendMessage("openMessageTab", true)
          )
        );
        let [{ id: messageTab2 }] = await listener.checkEvent("onCreated", {
          index: 7,
          windowId: initialWindow,
          active: false,
          mailTab: false,
          type: "messageDisplay",
        });
        browser.test.assertTrue(
          ![
            initialTab,
            contentTab1,
            contentTab2,
            calendarTab,
            taskTab,
            folderTab,
            messageTab1,
          ].includes(messageTab2)
        );
        await listener.pageLoad(messageTab2, false);

        browser.test.log(
          "Activate each of the tabs in a somewhat random order to test the onActivated event."
        );

        let previousTabId = messageTab1;
        for (let tab of [
          initialTab,
          calendarTab,
          messageTab1,
          taskTab,
          contentTab1,
          messageTab2,
          folderTab,
          contentTab2,
        ]) {
          window.assertDeepEqual(
            [{ tabId: tab, windowId: initialWindow }],
            await capturePrimedEvent("onActivated", () =>
              browser.tabs.update(tab, { active: true })
            )
          );
          await listener.checkEvent("onActivated", {
            tabId: tab,
            previousTabId,
            windowId: initialWindow,
          });
          previousTabId = tab;
        }

        browser.test.log(
          "Remove the first content tab. This was not active so no new tab should be activated."
        );

        window.assertDeepEqual(
          [contentTab1, { windowId: initialWindow, isWindowClosing: false }],
          await capturePrimedEvent("onRemoved", () =>
            browser.tabs.remove(contentTab1)
          )
        );
        await listener.checkEvent("onRemoved", contentTab1, {
          windowId: initialWindow,
          isWindowClosing: false,
        });

        browser.test.log(
          "Remove the second content tab. This was active, and the calendar tab is after it, so that should be activated."
        );

        window.assertDeepEqual(
          [contentTab2, { windowId: initialWindow, isWindowClosing: false }],
          await capturePrimedEvent("onRemoved", () =>
            browser.tabs.remove(contentTab2)
          )
        );
        await listener.checkEvent("onRemoved", contentTab2, {
          windowId: initialWindow,
          isWindowClosing: false,
        });
        await listener.checkEvent("onActivated", {
          tabId: calendarTab,
          windowId: initialWindow,
        });

        browser.test.log("Remove the remaining tabs.");

        for (let tab of [
          taskTab,
          messageTab1,
          messageTab2,
          folderTab,
          calendarTab,
        ]) {
          window.assertDeepEqual(
            [tab, { windowId: initialWindow, isWindowClosing: false }],
            await capturePrimedEvent("onRemoved", () =>
              browser.tabs.remove(tab)
            )
          );
          await listener.checkEvent("onRemoved", tab, {
            windowId: initialWindow,
            isWindowClosing: false,
          });
        }

        // Since the last tab was activated because all other tabs have been
        // removed, previousTabId should be undefined.
        await listener.checkEvent("onActivated", {
          tabId: initialTab,
          windowId: initialWindow,
          previousTabId: undefined,
        });

        browser.test.assertEq(0, listener.events.length);
        browser.test.notifyPass("finished");
      },
      "utils.js": await getUtilsJS(),
    },
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["tabs"],
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

          if (["onCreated", "onActivated", "onRemoved"].includes(eventName)) {
            browser.tabs[eventName].addListener(async (...args) => {
              // Only send the first event after background wake-up, this should
              // be the only one expected.
              if (!hasFired) {
                hasFired = true;
                browser.test.sendMessage(`${eventName} received`, args);
              }
            });
          }

          if (eventName == "onUpdated") {
            browser.tabs.onUpdated.addListener(
              (...args) => {
                // Only send the first event after background wake-up, this should
                // be the only one expected.
                if (!hasFired) {
                  hasFired = true;
                  browser.test.sendMessage("onUpdated received", args);
                }
              },
              {
                properties: ["status"],
              }
            );
          }

          browser.test.sendMessage("background started");
        },
      },
      manifest: {
        manifest_version: 3,
        description: eventName,
        background: { scripts: ["background.js"] },
        permissions: ["tabs"],
        browser_specific_settings: {
          gecko: { id: `tabs.eventpage.${eventName}@mochi.test` },
        },
      },
    });
    await ext.startup();
    await ext.awaitMessage("background started");
    // The listener should be persistent, but not primed.
    assertPersistentListeners(ext, "tabs", eventName, { primed: false });

    await ext.terminateBackground({ disableResetIdleForTest: true });
    // Verify the primed persistent listener.
    assertPersistentListeners(ext, "tabs", eventName, { primed: true });

    await actionCallback();
    let rv = await ext.awaitMessage(`${eventName} received`);
    await ext.awaitMessage("background started");
    // The listener should be persistent, but not primed.
    assertPersistentListeners(ext, "tabs", eventName, { primed: false });

    await ext.unload();
    return rv;
  }

  extension.onMessage("openCalendarTab", () => {
    let calendarTabButton = document.getElementById("calendarButton");
    EventUtils.synthesizeMouseAtCenter(calendarTabButton, {
      clickCount: 1,
    });
  });

  extension.onMessage("openTaskTab", () => {
    let taskTabButton = document.getElementById("tasksButton");
    EventUtils.synthesizeMouseAtCenter(taskTabButton, { clickCount: 1 });
  });

  extension.onMessage("openFolderTab", () => {
    tabmail.openTab("mail3PaneTab", {
      folderURI: rootFolder.URI,
      background: false,
    });
  });

  extension.onMessage("openMessageTab", background => {
    let msgHdr = messages.shift();
    tabmail.openTab("mailMessageTab", {
      messageURI: testFolder.getUriForMsg(msgHdr),
      background,
    });
  });

  extension.onMessage("capturePrimedEvent", async eventName => {
    let primedEventData = await event_page_extension(eventName, () => {
      // Resume execution in the main test, after the event page extension is
      // ready to capture the event with deactivated background.
      extension.sendMessage();
    });
    extension.sendMessage(...primedEventData);
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});
