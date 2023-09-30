/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { MigrationWizardConstants } = ChromeUtils.importESModule(
  "chrome://browser/content/migration/migration-wizard-constants.mjs"
);
const { InternalTestingProfileMigrator } = ChromeUtils.importESModule(
  "resource:///modules/InternalTestingProfileMigrator.sys.mjs"
);

const DIALOG_URL =
  "chrome://browser/content/migration/migration-dialog-window.html";

/**
 * We'll have this be our magic number of quantities of various imports.
 * We will use Sinon to prepare MigrationUtils to presume that this was
 * how many of each quantity-supported resource type was imported.
 */
const EXPECTED_QUANTITY = 123;

/**
 * These are the resource types that currently display their import success
 * message with a quantity.
 */
const RESOURCE_TYPES_WITH_QUANTITIES = [
  MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.BOOKMARKS,
  MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.HISTORY,
  MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.PASSWORDS,
  MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.FORMDATA,
  MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.PAYMENT_METHODS,
];

/**
 * The withMigrationWizardDialog callback, called after the
 * dialog has loaded and the wizard is ready.
 *
 * @callback withMigrationWizardDialogCallback
 * @param {DOMWindow} window
 *   The content window of the migration wizard subdialog frame.
 * @returns {Promise<undefined>}
 */

/**
 * Opens the migration wizard HTML5 dialog in about:preferences in the
 * current window's selected tab, runs an async taskFn, and then
 * cleans up by loading about:blank in the tab before resolving.
 *
 * @param {withMigrationWizardDialogCallback} taskFn
 *   An async test function to be called while the migration wizard
 *   dialog is open.
 * @returns {Promise<undefined>}
 */
async function withMigrationWizardDialog(taskFn) {
  let migrationDialogPromise = waitForMigrationWizardDialogTab();
  await MigrationUtils.showMigrationWizard(window, {});
  let prefsBrowser = await migrationDialogPromise;

  try {
    await taskFn(prefsBrowser.contentWindow);
  } finally {
    if (gBrowser.tabs.length > 1) {
      BrowserTestUtils.removeTab(gBrowser.getTabForBrowser(prefsBrowser));
    } else {
      BrowserTestUtils.loadURIString(prefsBrowser, "about:blank");
      await BrowserTestUtils.browserLoaded(prefsBrowser);
    }
  }
}

/**
 * Returns a Promise that resolves when an about:preferences tab opens
 * in the current window which loads the migration wizard dialog.
 * The Promise will wait until the migration wizard reports that it
 * is ready with the "MigrationWizard:Ready" event.
 *
 * @returns {Promise<browser>}
 *   Resolves with the about:preferences browser element.
 */
async function waitForMigrationWizardDialogTab() {
  let wizardReady = BrowserTestUtils.waitForEvent(
    window,
    "MigrationWizard:Ready"
  );

  let tab;
  if (gBrowser.selectedTab.isEmpty) {
    tab = gBrowser.selectedTab;
    await BrowserTestUtils.browserLoaded(tab.linkedBrowser, false, url => {
      return url.startsWith("about:preferences");
    });
  } else {
    tab = await BrowserTestUtils.waitForNewTab(gBrowser, url => {
      return url.startsWith("about:preferences");
    });
  }

  await wizardReady;
  info("Done waiting - migration subdialog loaded and ready.");

  return tab.linkedBrowser;
}

/**
 * A helper function that prepares the InternalTestingProfileMigrator
 * with some set of fake available resources, and resolves a Promise
 * when the InternalTestingProfileMigrator is used for a migration.
 *
 * @param {number[]} availableResourceTypes
 *   An array of resource types from MigrationUtils.resourcesTypes.
 *   A single MigrationResource will be created per type, with a
 *   no-op migrate function.
 * @param {number[]} expectedResourceTypes
 *   An array of resource types from MigrationUtils.resourceTypes.
 *   These are the resource types that are expected to be passed
 *   to the InternalTestingProfileMigrator.migrate function.
 * @param {object|string} expectedProfile
 *   The profile object or string that is expected to be passed
 *   to the InternalTestingProfileMigrator.migrate function.
 * @returns {Promise<undefined>}
 */
async function waitForTestMigration(
  availableResourceTypes,
  expectedResourceTypes,
  expectedProfile
) {
  let sandbox = sinon.createSandbox();

  // Fake out the getResources method of the migrator so that we return
  // a single fake MigratorResource per availableResourceType.
  sandbox
    .stub(InternalTestingProfileMigrator.prototype, "getResources")
    .callsFake(aProfile => {
      Assert.deepEqual(
        aProfile,
        expectedProfile,
        "Should have gotten the expected profile."
      );
      return Promise.resolve(
        availableResourceTypes.map(resourceType => {
          return {
            type: resourceType,
            migrate: () => {},
          };
        })
      );
    });

  sandbox.stub(MigrationUtils, "_importQuantities").value({
    bookmarks: EXPECTED_QUANTITY,
    history: EXPECTED_QUANTITY,
    logins: EXPECTED_QUANTITY,
    cards: EXPECTED_QUANTITY,
  });

  // Fake out the migrate method of the migrator and assert that the
  // next time it's called, its arguments match our expectations.
  return new Promise(resolve => {
    sandbox
      .stub(InternalTestingProfileMigrator.prototype, "migrate")
      .callsFake((aResourceTypes, aStartup, aProfile, aProgressCallback) => {
        Assert.ok(
          !aStartup,
          "Migrator should not have been called as a startup migration."
        );

        let bitMask = 0;
        for (let resourceType of expectedResourceTypes) {
          bitMask |= resourceType;
        }

        Assert.deepEqual(
          aResourceTypes,
          bitMask,
          "Got the expected resource types"
        );
        Assert.deepEqual(
          aProfile,
          expectedProfile,
          "Got the expected profile object"
        );

        for (let resourceType of expectedResourceTypes) {
          aProgressCallback(resourceType);
        }
        Services.obs.notifyObservers(null, "Migration:Ended");
        resolve();
      });
  }).finally(async () => {
    sandbox.restore();

    // MigratorBase caches resources fetched by the getResources method
    // as a performance optimization. In order to allow different tests
    // to have different available resources, we call into a special
    // method of InternalTestingProfileMigrator that clears that
    // cache.
    let migrator = await MigrationUtils.getMigrator(
      InternalTestingProfileMigrator.key
    );
    migrator.flushResourceCache();
  });
}

/**
 * Takes a MigrationWizard element and chooses the
 * InternalTestingProfileMigrator as the browser to migrate from. Then, it
 * checks the checkboxes associated with the selectedResourceTypes and
 * unchecks the rest before clicking the "Import" button.
 *
 * @param {Element} wizard
 *   The MigrationWizard element.
 * @param {string[]} selectedResourceTypes
 *   An array of resource type strings from
 *   MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.
 * @param {string} [migratorKey=InternalTestingProfileMigrator.key]
 *   The key for the migrator to use. Defaults to the
 *   InternalTestingProfileMigrator.
 */
async function selectResourceTypesAndStartMigration(
  wizard,
  selectedResourceTypes,
  migratorKey = InternalTestingProfileMigrator.key
) {
  let shadow = wizard.openOrClosedShadowRoot;

  // First, select the InternalTestingProfileMigrator browser.
  let selector = shadow.querySelector("#browser-profile-selector");
  selector.click();

  await new Promise(resolve => {
    wizard
      .querySelector("panel-list")
      .addEventListener("shown", resolve, { once: true });
  });

  let panelItem = wizard.querySelector(`panel-item[key="${migratorKey}"]`);
  panelItem.click();

  // And then check the right checkboxes for the resource types.
  let resourceTypeList = shadow.querySelector("#resource-type-list");
  for (let resourceType in MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES) {
    let node = resourceTypeList.querySelector(
      `label[data-resource-type="${resourceType}"]`
    );
    node.control.checked = selectedResourceTypes.includes(resourceType);
  }

  let importButton = shadow.querySelector("#import");
  importButton.click();
}

/**
 * Assert that the resource types passed in expectedResourceTypes are
 * showing a success state after a migration, and if they are part of
 * the RESOURCE_TYPES_WITH_QUANTITIES group, that they're showing the
 * EXPECTED_QUANTITY magic number in their success message. Otherwise,
 * we (currently) check that they show the empty string.
 *
 * @param {Element} wizard
 *   The MigrationWizard element.
 * @param {string[]} expectedResourceTypes
 *   An array of resource type strings from
 *   MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.
 */
function assertQuantitiesShown(wizard, expectedResourceTypes) {
  let shadow = wizard.openOrClosedShadowRoot;

  // Make sure that we're showing the progress page first.
  let deck = shadow.querySelector("#wizard-deck");
  Assert.equal(
    deck.selectedViewName,
    `page-${MigrationWizardConstants.PAGES.PROGRESS}`
  );

  // Go through each displayed resource and make sure that only the
  // ones that are expected are shown, and are showing the right
  // success message.

  let progressGroups = shadow.querySelectorAll(".resource-progress-group");
  for (let progressGroup of progressGroups) {
    if (expectedResourceTypes.includes(progressGroup.dataset.resourceType)) {
      let progressIcon = progressGroup.querySelector(".progress-icon");
      let successText =
        progressGroup.querySelector(".success-text").textContent;

      Assert.ok(
        progressIcon.classList.contains("completed"),
        "Should be showing completed state."
      );

      if (
        RESOURCE_TYPES_WITH_QUANTITIES.includes(
          progressGroup.dataset.resourceType
        )
      ) {
        if (
          progressGroup.dataset.resourceType ==
          MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.HISTORY
        ) {
          // HISTORY is a special case that doesn't show the number of imported
          // history entries, but instead shows the maximum number of days of history
          // that might have been imported.
          Assert.notEqual(
            successText.indexOf(MigrationUtils.HISTORY_MAX_AGE_IN_DAYS),
            -1,
            `Found expected maximum number of days of history: ${successText}`
          );
        } else if (
          progressGroup.dataset.resourceType ==
          MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.FORMDATA
        ) {
          // FORMDATA is another special case, because we simply show "Form history" as
          // the success string, rather than a particular quantity.
          Assert.equal(
            successText,
            "Form history",
            `Found expected form data string: ${successText}`
          );
        } else {
          Assert.notEqual(
            successText.indexOf(EXPECTED_QUANTITY),
            -1,
            `Found expected quantity in success string: ${successText}`
          );
        }
      } else {
        // If you've found yourself here, and this is failing, it's probably because you've
        // updated MigrationWizardParent.#getStringForImportQuantity to return a string for
        // a resource type that's not in RESOURCE_TYPES_WITH_QUANTITIES, and you'll need
        // to modify this function to check for that string.
        Assert.equal(
          successText,
          "",
          "Expected the empty string if the resource type " +
            "isn't in RESOURCE_TYPES_WITH_QUANTITIES"
        );
      }
    } else {
      Assert.ok(
        BrowserTestUtils.is_hidden(progressGroup),
        `Resource progress group for ${progressGroup.dataset.resourceType}` +
          ` should be hidden.`
      );
    }
  }
}
