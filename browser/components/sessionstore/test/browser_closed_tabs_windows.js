const ORIG_STATE = ss.getBrowserState();

const multiWindowState = {
  windows: [
    {
      tabs: [
        {
          entries: [
            { url: "https://example.com#0", triggeringPrincipal_base64 },
          ],
        },
      ],
      _closedTabs: [
        {
          state: {
            entries: [
              {
                url: "https://example.com#closed0",
                triggeringPrincipal_base64,
              },
            ],
          },
        },
        {
          state: {
            entries: [
              {
                url: "https://example.com#closed1",
                triggeringPrincipal_base64,
              },
            ],
          },
        },
      ],
      selected: 1,
    },
    {
      tabs: [
        {
          entries: [
            { url: "https://example.org#1", triggeringPrincipal_base64 },
          ],
        },
        {
          entries: [
            { url: "https://example.org#2", triggeringPrincipal_base64 },
          ],
        },
      ],
      _closedTabs: [
        {
          state: {
            entries: [
              {
                url: "https://example.org#closed0",
                triggeringPrincipal_base64,
              },
            ],
          },
        },
      ],
      selected: 1,
    },
  ],
};

async function setupWithBrowserState(browserState) {
  let numTabs = browserState.windows.reduce((count, winData) => {
    return count + winData.tabs.length;
  }, 0);
  let loadCount = 0;
  let windowOpenedCount = 1; // pre-count the first window
  let promiseRestoringTabs = new Promise(resolve => {
    gProgressListener.setCallback(function (
      aBrowser,
      aNeedRestore,
      aRestoring,
      aRestored
    ) {
      if (++loadCount == numTabs) {
        // We don't actually care about load order in this test, just that they all
        // do load.
        is(loadCount, numTabs, "all tabs were restored");
        is(aNeedRestore, 0, "there are no tabs left needing restore");

        gProgressListener.unsetCallback();
        resolve();
      }
    });
  });

  // We also want to catch the 2nd window, so we need to observe domwindowopened
  Services.ww.registerNotification(function observer(aSubject, aTopic, aData) {
    if (aTopic == "domwindowopened") {
      let win = aSubject;
      win.addEventListener(
        "load",
        function () {
          if (++windowOpenedCount == browserState.windows.length) {
            Services.ww.unregisterNotification(observer);
            win.gBrowser.addTabsProgressListener(gProgressListener);
          }
        },
        { once: true }
      );
    }
  });

  const stateRestored = TestUtils.topicObserved(
    "sessionstore-browser-state-restored"
  );
  await ss.setBrowserState(JSON.stringify(browserState));
  await stateRestored;
  await promiseRestoringTabs;
}
add_setup(async function testSetup() {
  await setupWithBrowserState(multiWindowState);
});

add_task(async function test_ClosedTabMethods() {
  let sessionStoreUpdated;
  const browserWindows = BrowserWindowTracker.orderedWindows;
  Assert.equal(
    browserWindows.length,
    multiWindowState.windows.length,
    `We expect ${multiWindowState.windows} open browser windows`
  );

  for (let idx = 0; idx < browserWindows.length; idx++) {
    const win = browserWindows[idx];
    const winData = multiWindowState.windows[idx];
    info(`window ${idx}: ${win.gBrowser.selectedBrowser.currentURI.spec}`);
    Assert.equal(
      winData._closedTabs.length,
      SessionStore.getClosedTabDataForWindow(win).length,
      `getClosedTabDataForWindow() for window ${idx} returned the expected number of objects`
    );
  }

  let closedCount;
  closedCount = SessionStore.getClosedTabCountForWindow(browserWindows[0]);
  Assert.equal(2, closedCount, "2 closed tab for this window");

  closedCount = SessionStore.getClosedTabCountForWindow(browserWindows[1]);
  Assert.equal(1, closedCount, "1 closed tab for this window");

  sessionStoreUpdated = TestUtils.topicObserved(
    "sessionstore-closed-objects-changed"
  );
  SessionStore.undoCloseTab(browserWindows[0], 0);
  await sessionStoreUpdated;

  Assert.equal(
    1,
    SessionStore.getClosedTabCountForWindow(browserWindows[0]),
    "Now theres one closed tab"
  );
  Assert.equal(
    1,
    SessionStore.getClosedTabCountForWindow(browserWindows[1]),
    "Theres still one closed tab in the 2nd window"
  );

  sessionStoreUpdated = TestUtils.topicObserved(
    "sessionstore-closed-objects-changed"
  );
  SessionStore.forgetClosedTab(browserWindows[0], 0);
  await sessionStoreUpdated;

  Assert.equal(
    0,
    SessionStore.getClosedTabCountForWindow(browserWindows[0]),
    "No closed tabs after forgetting the last one"
  );
  Assert.equal(
    1,
    SessionStore.getClosedTabCountForWindow(browserWindows[1]),
    "Theres still one closed tab in the 2nd window"
  );

  await promiseAllButPrimaryWindowClosed();

  Assert.equal(
    0,
    SessionStore.getClosedTabCountForWindow(browserWindows[0]),
    "Closed tab count is unchanged after closing the other browser window"
  );

  // Cleanup.
  await promiseBrowserState(ORIG_STATE);
});
