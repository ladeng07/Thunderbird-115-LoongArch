/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

let account = createAccount("pop3");
createAccount("local");
MailServices.accounts.defaultAccount = account;

let defaultIdentity = addIdentity(account);
defaultIdentity.composeHtml = true;
let nonDefaultIdentity = addIdentity(account);
nonDefaultIdentity.composeHtml = false;

let rootFolder = account.incomingServer.rootFolder;
rootFolder.createSubfolder("test", null);
let folder = rootFolder.getChildNamed("test");
createMessages(folder, 4);

add_task(async function testIdentity() {
  let files = {
    "background.js": async () => {
      let accounts = await browser.accounts.list();
      browser.test.assertEq(2, accounts.length, "number of accounts");
      let popAccount = accounts.find(a => a.type == "pop3");
      browser.test.assertEq(
        2,
        popAccount.identities.length,
        "number of identities"
      );
      let [defaultIdentity, nonDefaultIdentity] = popAccount.identities;
      let folder = popAccount.folders.find(f => f.name == "test");
      let { messages } = await browser.messages.list(folder);
      browser.test.assertEq(4, messages.length, "number of messages");

      browser.test.log(defaultIdentity.id);
      browser.test.log(nonDefaultIdentity.id);

      let funcs = [
        { name: "beginNew", args: [] },
        { name: "beginReply", args: [messages[0].id] },
        { name: "beginForward", args: [messages[1].id, "forwardAsAttachment"] },
        // Uses a different code path.
        { name: "beginForward", args: [messages[2].id, "forwardInline"] },
        { name: "beginNew", args: [messages[3].id] },
      ];
      let tests = [
        { args: [], isDefault: true },
        {
          args: [{ identityId: defaultIdentity.id }],
          isDefault: true,
        },
        {
          args: [{ identityId: nonDefaultIdentity.id }],
          isDefault: false,
        },
      ];
      for (let func of funcs) {
        browser.test.log(func.name);
        for (let test of tests) {
          browser.test.log(JSON.stringify(test.args));
          let tab = await browser.compose[func.name](
            ...func.args.concat(test.args)
          );
          browser.test.assertEq("object", typeof tab);
          browser.test.assertEq("number", typeof tab.id);
          await window.sendMessage("checkIdentity", test.isDefault);
        }
      }

      browser.test.notifyPass("finished");
    },
    "utils.js": await getUtilsJS(),
  };
  let extension = ExtensionTestUtils.loadExtension({
    files,
    manifest: {
      background: { scripts: ["utils.js", "background.js"] },
      permissions: ["accountsRead", "messagesRead"],
    },
  });

  extension.onMessage("checkIdentity", async isDefault => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 1);
    await new Promise(resolve => composeWindows[0].setTimeout(resolve));

    is(
      composeWindows[0].getCurrentIdentityKey(),
      isDefault ? defaultIdentity.key : nonDefaultIdentity.key
    );
    composeWindows[0].close();
    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});
