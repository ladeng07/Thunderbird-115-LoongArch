"use strict";

const { AboutWelcomeParent } = ChromeUtils.import(
  "resource:///actors/AboutWelcomeParent.jsm"
);

const { AboutWelcomeTelemetry } = ChromeUtils.import(
  "resource://activity-stream/aboutwelcome/lib/AboutWelcomeTelemetry.jsm"
);
const { AWScreenUtils } = ChromeUtils.import(
  "resource://activity-stream/lib/AWScreenUtils.jsm"
);
const { InternalTestingProfileMigrator } = ChromeUtils.importESModule(
  "resource:///modules/InternalTestingProfileMigrator.sys.mjs"
);

async function clickVisibleButton(browser, selector) {
  // eslint-disable-next-line no-shadow
  await ContentTask.spawn(browser, { selector }, async ({ selector }) => {
    function getVisibleElement() {
      for (const el of content.document.querySelectorAll(selector)) {
        if (el.offsetParent !== null) {
          return el;
        }
      }
      return null;
    }
    await ContentTaskUtils.waitForCondition(
      getVisibleElement,
      selector,
      200, // interval
      100 // maxTries
    );
    getVisibleElement().click();
  });
}

add_setup(async function () {
  SpecialPowers.pushPrefEnv({
    set: [
      ["ui.prefersReducedMotion", 1],
      ["browser.aboutwelcome.transitions", false],
    ],
  });
});

function initSandbox({ pin = true, isDefault = false } = {}) {
  const sandbox = sinon.createSandbox();
  sandbox.stub(AboutWelcomeParent, "doesAppNeedPin").returns(pin);
  sandbox.stub(AboutWelcomeParent, "isDefaultBrowser").returns(isDefault);

  return sandbox;
}

/**
 * Test MR message telemetry
 */
add_task(async function test_aboutwelcome_mr_template_telemetry() {
  const sandbox = initSandbox();

  let { browser, cleanup } = await openMRAboutWelcome();
  let aboutWelcomeActor = await getAboutWelcomeParent(browser);
  // Stub AboutWelcomeParent's Content Message Handler
  const messageStub = sandbox.spy(aboutWelcomeActor, "onContentMessage");
  await clickVisibleButton(browser, ".action-buttons button.secondary");

  const { callCount } = messageStub;
  ok(callCount >= 1, `${callCount} Stub was called`);
  let clickCall;
  for (let i = 0; i < callCount; i++) {
    const call = messageStub.getCall(i);
    info(`Call #${i}: ${call.args[0]} ${JSON.stringify(call.args[1])}`);
    if (call.calledWithMatch("", { event: "CLICK_BUTTON" })) {
      clickCall = call;
    }
  }

  Assert.ok(
    clickCall.args[1].message_id.startsWith("MR_WELCOME_DEFAULT"),
    "Telemetry includes MR message id"
  );

  await cleanup();
  sandbox.restore();
});

/**
 * Telemetry Impression with Pin as First Screen
 */
add_task(async function test_aboutwelcome_pin_screen_impression() {
  await pushPrefs(["browser.shell.checkDefaultBrowser", true]);

  const sandbox = initSandbox();
  sandbox
    .stub(AWScreenUtils, "evaluateScreenTargeting")
    .resolves(true)
    .withArgs(
      "os.windowsBuildNumber >= 15063 && !isDefaultBrowser && !doesAppNeedPin"
    )
    .resolves(false)
    .withArgs("isDeviceMigration")
    .resolves(false);

  let impressionSpy = sandbox.spy(
    AboutWelcomeTelemetry.prototype,
    "sendTelemetry"
  );

  let { browser, cleanup } = await openMRAboutWelcome();
  // Wait for screen elements to render before checking impression pings
  await test_screen_content(
    browser,
    "Onboarding screen elements rendered",
    // Expected selectors:
    [
      `main.screen[pos="split"]`,
      "div.secondary-cta.top",
      "button[value='secondary_button_top']",
    ]
  );

  const { callCount } = impressionSpy;
  ok(callCount >= 1, `${callCount} impressionSpy was called`);
  let impressionCall;
  for (let i = 0; i < callCount; i++) {
    const call = impressionSpy.getCall(i);
    info(`Call #${i}:  ${JSON.stringify(call.args[0])}`);
    if (
      call.calledWithMatch({ event: "IMPRESSION" }) &&
      !call.calledWithMatch({ message_id: "MR_WELCOME_DEFAULT" })
    ) {
      info(`Screen Impression Call #${i}:  ${JSON.stringify(call.args[0])}`);
      impressionCall = call;
    }
  }

  Assert.ok(
    impressionCall.args[0].message_id.startsWith(
      "MR_WELCOME_DEFAULT_0_AW_PIN_FIREFOX_P"
    ),
    "Impression telemetry includes correct message id"
  );
  await cleanup();
  sandbox.restore();
  await popPrefs();
});

/**
 * Test MR template content - Browser is not Pinned and not set as default
 */
add_task(async function test_aboutwelcome_mr_template_content() {
  await pushPrefs(["browser.shell.checkDefaultBrowser", true]);

  const sandbox = initSandbox();

  sandbox
    .stub(AWScreenUtils, "evaluateScreenTargeting")
    .resolves(true)
    .withArgs(
      "os.windowsBuildNumber >= 15063 && !isDefaultBrowser && !doesAppNeedPin"
    )
    .resolves(false)
    .withArgs("isDeviceMigration")
    .resolves(false);

  let { cleanup, browser } = await openMRAboutWelcome();

  await test_screen_content(
    browser,
    "MR template includes screens with split position and a sign in link on the first screen",
    // Expected selectors:
    [
      `main.screen[pos="split"]`,
      "div.secondary-cta.top",
      "button[value='secondary_button_top']",
    ]
  );

  await test_screen_content(
    browser,
    "renders pin screen",
    //Expected selectors:
    ["main.AW_PIN_FIREFOX"],
    //Unexpected selectors:
    ["main.AW_GRATITUDE"]
  );

  await clickVisibleButton(browser, ".action-buttons button.secondary");

  //should render set default
  await test_screen_content(
    browser,
    "renders set default screen",
    //Expected selectors:
    ["main.AW_SET_DEFAULT"],
    //Unexpected selectors:
    ["main.AW_CHOOSE_THEME"]
  );

  await cleanup();
  sandbox.restore();
  await popPrefs();
});

/**
 * Test MR template content - Browser has been set as Default, not pinned
 */
add_task(async function test_aboutwelcome_mr_template_content_pin() {
  await pushPrefs(["browser.shell.checkDefaultBrowser", true]);

  const sandbox = initSandbox({ isDefault: true });

  sandbox
    .stub(AWScreenUtils, "evaluateScreenTargeting")
    .resolves(true)
    .withArgs(
      "os.windowsBuildNumber >= 15063 && !isDefaultBrowser && !doesAppNeedPin"
    )
    .resolves(false)
    .withArgs("isDeviceMigration")
    .resolves(false);

  let { browser, cleanup } = await openMRAboutWelcome();

  await test_screen_content(
    browser,
    "renders pin screen",
    //Expected selectors:
    ["main.AW_PIN_FIREFOX"],
    //Unexpected selectors:
    ["main.AW_SET_DEFAULT"]
  );

  await clickVisibleButton(browser, ".action-buttons button.secondary");

  await test_screen_content(
    browser,
    "renders next screen",
    //Expected selectors:
    ["main"],
    //Unexpected selectors:
    ["main.AW_SET_DEFAULT"]
  );

  await cleanup();
  sandbox.restore();
  await popPrefs();
});

/**
 * Test MR template content - Browser is Pinned, not default
 */
add_task(async function test_aboutwelcome_mr_template_only_default() {
  await pushPrefs(["browser.shell.checkDefaultBrowser", true]);

  const sandbox = initSandbox({ pin: false });
  sandbox
    .stub(AWScreenUtils, "evaluateScreenTargeting")
    .resolves(true)
    .withArgs(
      "os.windowsBuildNumber >= 15063 && !isDefaultBrowser && !doesAppNeedPin"
    )
    .resolves(false)
    .withArgs("isDeviceMigration")
    .resolves(false);

  let { browser, cleanup } = await openMRAboutWelcome();
  //should render set default
  await test_screen_content(
    browser,
    "renders set default screen",
    //Expected selectors:
    ["main.AW_ONLY_DEFAULT"],
    //Unexpected selectors:
    ["main.AW_PIN_FIREFOX"]
  );

  await cleanup();
  sandbox.restore();
  await popPrefs();
});
/**
 * Test MR template content - Browser is Pinned and set as default
 */
add_task(async function test_aboutwelcome_mr_template_get_started() {
  await pushPrefs(["browser.shell.checkDefaultBrowser", true]);

  const sandbox = initSandbox({ pin: false, isDefault: true });

  sandbox
    .stub(AWScreenUtils, "evaluateScreenTargeting")
    .resolves(true)
    .withArgs(
      "os.windowsBuildNumber >= 15063 && !isDefaultBrowser && !doesAppNeedPin"
    )
    .resolves(false)
    .withArgs("isDeviceMigration")
    .resolves(false);

  let { browser, cleanup } = await openMRAboutWelcome();

  //should render set default
  await test_screen_content(
    browser,
    "doesn't render pin and set default screens",
    //Expected selectors:
    ["main.AW_GET_STARTED"],
    //Unexpected selectors:
    ["main.AW_PIN_FIREFOX", "main.AW_ONLY_DEFAULT"]
  );

  await cleanup();
  sandbox.restore();
  await popPrefs();
});

add_task(async function test_aboutwelcome_gratitude() {
  const TEST_CONTENT = [
    {
      id: "AW_GRATITUDE",
      content: {
        position: "split",
        split_narrow_bkg_position: "-228px",
        background:
          "url('chrome://activity-stream/content/data/content/assets/mr-gratitude.svg') var(--mr-secondary-position) no-repeat, var(--mr-screen-background-color)",
        progress_bar: true,
        logo: {},
        title: {
          string_id: "mr2022-onboarding-gratitude-title",
        },
        subtitle: {
          string_id: "mr2022-onboarding-gratitude-subtitle",
        },
        primary_button: {
          label: {
            string_id: "mr2022-onboarding-gratitude-primary-button-label",
          },
          action: {
            navigate: true,
          },
        },
      },
    },
  ];
  await setAboutWelcomeMultiStage(JSON.stringify(TEST_CONTENT)); // NB: calls SpecialPowers.pushPrefEnv
  let { cleanup, browser } = await openMRAboutWelcome();

  // execution
  await test_screen_content(
    browser,
    "doesn't render secondary button on gratitude screen",
    //Expected selectors
    ["main.AW_GRATITUDE", "button[value='primary_button']"],

    //Unexpected selectors:
    ["button[value='secondary_button']"]
  );
  await clickVisibleButton(browser, ".action-buttons button.primary");

  // make sure the button navigates to newtab
  await test_screen_content(
    browser,
    "home",
    //Expected selectors
    ["body.activity-stream"],

    //Unexpected selectors:
    ["main.AW_GRATITUDE"]
  );

  // cleanup
  await SpecialPowers.popPrefEnv(); // for setAboutWelcomeMultiStage
  await cleanup();
});

add_task(async function test_aboutwelcome_embedded_migration() {
  // Let's make sure at least one migrator is available and enabled - the
  // InternalTestingProfileMigrator.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.migrate.internal-testing.enabled", true]],
  });

  const sandbox = sinon.createSandbox();
  sandbox
    .stub(InternalTestingProfileMigrator.prototype, "getResources")
    .callsFake(() =>
      Promise.resolve([
        {
          type: MigrationUtils.resourceTypes.BOOKMARKS,
          migrate: () => {},
        },
      ])
    );
  sandbox.stub(MigrationUtils, "_importQuantities").value({
    bookmarks: 123,
    history: 123,
    logins: 123,
  });
  const migrated = new Promise(resolve => {
    sandbox
      .stub(InternalTestingProfileMigrator.prototype, "migrate")
      .callsFake((aResourceTypes, aStartup, aProfile, aProgressCallback) => {
        aProgressCallback(MigrationUtils.resourceTypes.BOOKMARKS);
        Services.obs.notifyObservers(null, "Migration:Ended");
        resolve();
      });
  });

  let telemetrySpy = sandbox.spy(
    AboutWelcomeTelemetry.prototype,
    "sendTelemetry"
  );

  const TEST_CONTENT = [
    {
      id: "AW_IMPORT_SETTINGS_EMBEDDED",
      content: {
        tiles: { type: "migration-wizard" },
        position: "split",
        split_narrow_bkg_position: "-42px",
        image_alt_text: {
          string_id: "mr2022-onboarding-import-image-alt",
        },
        background:
          "url('chrome://activity-stream/content/data/content/assets/mr-import.svg') var(--mr-secondary-position) no-repeat var(--mr-screen-background-color)",
        progress_bar: true,
        migrate_start: {
          action: {},
        },
        migrate_close: {
          action: { navigate: true },
        },
        secondary_button: {
          label: {
            string_id: "mr2022-onboarding-secondary-skip-button-label",
          },
          action: {
            navigate: true,
          },
          has_arrow_icon: true,
        },
      },
    },
    {
      id: "AW_STEP2",
      content: {
        position: "split",
        split_narrow_bkg_position: "-228px",
        background:
          "url('chrome://activity-stream/content/data/content/assets/mr-gratitude.svg') var(--mr-secondary-position) no-repeat, var(--mr-screen-background-color)",
        progress_bar: true,
        logo: {},
        title: {
          string_id: "mr2022-onboarding-gratitude-title",
        },
        subtitle: {
          string_id: "mr2022-onboarding-gratitude-subtitle",
        },
        primary_button: {
          label: {
            string_id: "mr2022-onboarding-gratitude-primary-button-label",
          },
          action: {
            navigate: true,
          },
        },
      },
    },
  ];

  await setAboutWelcomeMultiStage(JSON.stringify(TEST_CONTENT)); // NB: calls SpecialPowers.pushPrefEnv
  let { cleanup, browser } = await openMRAboutWelcome();

  // execution
  await test_screen_content(
    browser,
    "Renders a <migration-wizard> custom element",
    // We expect <migration-wizard> to automatically request the set of migrators
    // upon binding to the DOM, and to not be in dialog mode.
    [
      "main.AW_IMPORT_SETTINGS_EMBEDDED",
      "migration-wizard[auto-request-state]:not([dialog-mode])",
    ]
  );

  // Do a basic test to make sure that the <migration-wizard> is on the right
  // page and the <panel-list> can open.
  await SpecialPowers.spawn(
    browser,
    [`panel-item[key="${InternalTestingProfileMigrator.key}"]`],
    async menuitemSelector => {
      const { MigrationWizardConstants } = ChromeUtils.importESModule(
        "chrome://browser/content/migration/migration-wizard-constants.mjs"
      );

      let wizard = content.document.querySelector("migration-wizard");
      await new Promise(resolve => content.requestAnimationFrame(resolve));
      let shadow = wizard.openOrClosedShadowRoot;
      let deck = shadow.querySelector("#wizard-deck");

      // It's unlikely but possible that the deck might not yet be showing the
      // selection page yet, in which case we wait for that page to appear.
      if (deck.selectedViewName !== MigrationWizardConstants.PAGES.SELECTION) {
        await ContentTaskUtils.waitForMutationCondition(
          deck,
          { attributeFilter: ["selected-view"] },
          () => {
            return (
              deck.getAttribute("selected-view") ===
              `page-${MigrationWizardConstants.PAGES.SELECTION}`
            );
          }
        );
      }

      Assert.ok(true, "Selection page is being shown in the migration wizard.");

      // Now let's make sure that the <panel-list> can appear.
      let panelList = wizard.querySelector("panel-list");
      Assert.ok(panelList, "Found the <panel-list>.");

      // The "shown" event from the panel-list is coming from a lower level
      // of privilege than where we're executing this SpecialPowers.spawn
      // task. In order to properly listen for it, we have to ask
      // ContentTaskUtils.waitForEvent to listen for untrusted events.
      let shown = ContentTaskUtils.waitForEvent(
        panelList,
        "shown",
        false /* capture */,
        null /* checkFn */,
        true /* wantsUntrusted */
      );
      let selector = shadow.querySelector("#browser-profile-selector");

      // The migration wizard programmatically focuses the selector after
      // the selection page is shown using an rAF. If we click the button
      // before that occurs, then the focus can shift after the panel opens
      // which will cause it to immediately close again. So we wait for the
      // selection button to gain focus before continuing.
      if (!selector.matches(":focus")) {
        await ContentTaskUtils.waitForEvent(selector, "focus");
      }

      selector.click();
      await shown;

      let panelRect = panelList.getBoundingClientRect();
      let selectorRect = selector.getBoundingClientRect();

      // Recalculate the <panel-list> rect top value relative to the top-left
      // of the selectorRect. We expect the <panel-list> to be tightly anchored
      // to the bottom of the <button>, so we expect this new value to be close to 0,
      // to account for subpixel rounding
      let panelTopLeftRelativeToAnchorTopLeft =
        panelRect.top - selectorRect.top - selectorRect.height;

      function isfuzzy(actual, expected, epsilon, msg) {
        if (actual >= expected - epsilon && actual <= expected + epsilon) {
          ok(true, msg);
        } else {
          is(actual, expected, msg);
        }
      }

      isfuzzy(
        panelTopLeftRelativeToAnchorTopLeft,
        0,
        1,
        "Panel should be tightly anchored to the bottom of the button shadow node."
      );

      let panelItem = wizard.querySelector(menuitemSelector);
      panelItem.click();

      let importButton = shadow.querySelector("#import");
      importButton.click();
    }
  );

  await migrated;
  Assert.ok(
    telemetrySpy.calledWithMatch({
      event: "CLICK_BUTTON",
      event_context: { source: "primary_button", page: "about:welcome" },
      message_id: sinon.match.string,
    }),
    "Should have sent telemetry for clicking the 'Import' button."
  );

  await SpecialPowers.spawn(browser, [], async () => {
    let wizard = content.document.querySelector("migration-wizard");
    let shadow = wizard.openOrClosedShadowRoot;
    let continueButton = shadow.querySelector(
      "div[name='page-progress'] .continue-button"
    );
    continueButton.click();
    await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("main.AW_STEP2"),
      "Waiting for step 2 to render"
    );
  });

  Assert.ok(
    telemetrySpy.calledWithMatch({
      event: "CLICK_BUTTON",
      event_context: { source: "migrate_close", page: "about:welcome" },
      message_id: sinon.match.string,
    }),
    "Should have sent telemetry for clicking the 'Continue' button."
  );

  // cleanup
  await SpecialPowers.popPrefEnv(); // for the InternalTestingProfileMigrator.
  await SpecialPowers.popPrefEnv(); // for setAboutWelcomeMultiStage
  await cleanup();
  sandbox.restore();
  let migrator = await MigrationUtils.getMigrator(
    InternalTestingProfileMigrator.key
  );
  migrator.flushResourceCache();
});
