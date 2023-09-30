/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

add_task(async function test_pointerevent() {
  async function contentScript() {
    document.addEventListener("pointerdown", async e => {
      browser.test.assertTrue(true, "Should receive pointerdown");
      e.preventDefault();
    });

    document.addEventListener("mousedown", e => {
      browser.test.assertTrue(true, "Should receive mousedown");
    });

    document.addEventListener("mouseup", e => {
      browser.test.assertTrue(true, "Should receive mouseup");
    });

    document.addEventListener("pointerup", e => {
      browser.test.assertTrue(true, "Should receive pointerup");
      browser.test.sendMessage("done");
    });
    browser.test.sendMessage("pageReady");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background() {
      browser.test.sendMessage("ready", browser.runtime.getURL("page.html"));
    },
    files: {
      "page.html": `<html><head><script src="page.js"></script></head></html>`,
      "page.js": contentScript,
    },
  });
  await extension.startup();
  await new Promise(resolve => {
    SpecialPowers.pushPrefEnv(
      { set: [["dom.w3c_pointer_events.enabled", true]] },
      resolve
    );
  });
  let url = await extension.awaitMessage("ready");
  let tab = openContentTab(url, undefined, null);

  await extension.awaitMessage("pageReady");
  await new Promise(resolve => requestAnimationFrame(resolve));
  tab.linkedBrowser.focus();
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "html",
    { type: "mousedown", button: 0 },
    tab.linkedBrowser
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "html",
    { type: "mouseup", button: 0 },
    tab.linkedBrowser
  );
  await extension.awaitMessage("done");

  await extension.unload();

  let tabmail = document.getElementById("tabmail");
  tabmail.closeTab(tab);
});
