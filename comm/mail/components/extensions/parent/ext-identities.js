/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

ChromeUtils.defineModuleGetter(
  this,
  "MailServices",
  "resource:///modules/MailServices.jsm"
);
ChromeUtils.defineESModuleGetters(this, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
});

function findIdentityAndAccount(identityId) {
  for (let account of MailServices.accounts.accounts) {
    for (let identity of account.identities) {
      if (identity.key == identityId) {
        return { account, identity };
      }
    }
  }
  return null;
}

function checkForProtectedProperties(details) {
  const protectedProperties = ["id", "accountId"];
  for (let [key, value] of Object.entries(details)) {
    // Check only properties explicitly provided.
    if (value != null && protectedProperties.includes(key)) {
      throw new ExtensionError(
        `Setting the ${key} property of a MailIdentity is not supported.`
      );
    }
  }
}

function updateIdentity(identity, details) {
  for (let [key, value] of Object.entries(details)) {
    // Update only properties explicitly provided.
    if (value == null) {
      continue;
    }
    // Map from WebExtension property names to nsIMsgIdentity property names.
    switch (key) {
      case "signatureIsPlainText":
        identity.htmlSigFormat = !value;
        break;
      case "name":
        identity.fullName = value;
        break;
      case "signature":
        identity.htmlSigText = value;
        break;
      default:
        identity[key] = value;
    }
  }
}

/**
 * @implements {nsIObserver}
 */
var identitiesTracker = new (class extends EventEmitter {
  constructor() {
    super();
    this.listenerCount = 0;

    this.identities = new Map();
    this.deferredNotifications = new ExtensionUtils.DefaultMap(
      key =>
        new DeferredTask(
          () => this.emitPendingNotification(key),
          NOTIFICATION_COLLAPSE_TIME
        )
    );

    // Keep track of identities and their values, to suppress superfluous
    // update notifications. The deferredTask timer is used to collapse multiple
    // update notifications.
    for (let account of MailServices.accounts.accounts) {
      for (let identity of account.identities) {
        this.identities.set(
          identity.key,
          convertMailIdentity(account, identity)
        );
      }
    }
  }

  incrementListeners() {
    this.listenerCount++;
    if (this.listenerCount == 1) {
      for (let topic of this._notifications) {
        Services.obs.addObserver(this, topic);
      }
      Services.prefs.addObserver("mail.identity.", this);
    }
  }
  decrementListeners() {
    this.listenerCount--;
    if (this.listenerCount == 0) {
      for (let topic of this._notifications) {
        Services.obs.removeObserver(this, topic);
      }
      Services.prefs.removeObserver("mail.identity.", this);
    }
  }

  emitPendingNotification(key) {
    let ia = findIdentityAndAccount(key);
    if (!ia) {
      return;
    }

    let oldValues = this.identities.get(key);
    let newValues = convertMailIdentity(ia.account, ia.identity);
    let changedValues = {};
    for (let propertyName of Object.keys(newValues)) {
      if (
        !oldValues.hasOwnProperty(propertyName) ||
        oldValues[propertyName] != newValues[propertyName]
      ) {
        changedValues[propertyName] = newValues[propertyName];
      }
    }
    if (Object.keys(changedValues).length > 0) {
      changedValues.accountId = ia.account.key;
      changedValues.id = ia.identity.key;
      let notification =
        Object.keys(oldValues).length == 0
          ? "account-identity-added"
          : "account-identity-updated";
      this.identities.set(key, newValues);
      this.emit(notification, key, changedValues);
    }
  }

  // nsIObserver
  _notifications = ["account-identity-added", "account-identity-removed"];

  async observe(subject, topic, data) {
    switch (topic) {
      case "account-identity-added":
        {
          let key = data;
          this.identities.set(key, {});
          this.deferredNotifications.get(key).arm();
        }
        break;

      case "nsPref:changed":
        {
          let key = data.split(".").slice(2, 3).pop();

          // Ignore update notifications for created identities, before they are
          // added to an account (looks like they are cloned from a default
          // identity). Also ignore notifications for deleted identities.
          if (
            key &&
            this.identities.has(key) &&
            this.identities.get(key) != null
          ) {
            this.deferredNotifications.get(key).disarm();
            this.deferredNotifications.get(key).arm();
          }
        }
        break;

      case "account-identity-removed":
        {
          let key = data;
          if (
            key &&
            this.identities.has(key) &&
            this.identities.get(key) != null
          ) {
            // Mark identities as deleted instead of removing them.
            this.identities.set(key, null);
            // Force any pending notification to be emitted.
            await this.deferredNotifications.get(key).finalize();

            this.emit("account-identity-removed", key);
          }
        }
        break;
    }
  }
})();

this.identities = class extends ExtensionAPIPersistent {
  PERSISTENT_EVENTS = {
    // For primed persistent events (deactivated background), the context is only
    // available after fire.wakeup() has fulfilled (ensuring the convert() function
    // has been called).

    onCreated({ context, fire }) {
      async function listener(event, key, identity) {
        if (fire.wakeup) {
          await fire.wakeup();
        }
        fire.sync(key, identity);
      }
      identitiesTracker.on("account-identity-added", listener);
      return {
        unregister: () => {
          identitiesTracker.off("account-identity-added", listener);
        },
        convert(newFire, extContext) {
          fire = newFire;
          context = extContext;
        },
      };
    },
    onUpdated({ context, fire }) {
      async function listener(event, key, changedValues) {
        if (fire.wakeup) {
          await fire.wakeup();
        }
        fire.sync(key, changedValues);
      }
      identitiesTracker.on("account-identity-updated", listener);
      return {
        unregister: () => {
          identitiesTracker.off("account-identity-updated", listener);
        },
        convert(newFire, extContext) {
          fire = newFire;
          context = extContext;
        },
      };
    },
    onDeleted({ context, fire }) {
      async function listener(event, key) {
        if (fire.wakeup) {
          await fire.wakeup();
        }
        fire.sync(key);
      }
      identitiesTracker.on("account-identity-removed", listener);
      return {
        unregister: () => {
          identitiesTracker.off("account-identity-removed", listener);
        },
        convert(newFire, extContext) {
          fire = newFire;
          context = extContext;
        },
      };
    },
  };

  constructor(...args) {
    super(...args);
    identitiesTracker.incrementListeners();
  }

  onShutdown() {
    identitiesTracker.decrementListeners();
  }

  getAPI(context) {
    return {
      identities: {
        async list(accountId) {
          let accounts = accountId
            ? [MailServices.accounts.getAccount(accountId)]
            : MailServices.accounts.accounts;

          let identities = [];
          for (let account of accounts) {
            for (let identity of account.identities) {
              identities.push(convertMailIdentity(account, identity));
            }
          }
          return identities;
        },
        async get(identityId) {
          let ia = findIdentityAndAccount(identityId);
          return ia ? convertMailIdentity(ia.account, ia.identity) : null;
        },
        async delete(identityId) {
          let ia = findIdentityAndAccount(identityId);
          if (!ia) {
            throw new ExtensionError(`Identity not found: ${identityId}`);
          }
          if (
            ia.account?.defaultIdentity &&
            ia.account.defaultIdentity.key == ia.identity.key
          ) {
            throw new ExtensionError(
              `Identity ${identityId} is the default identity of account ${ia.account.key} and cannot be deleted`
            );
          }
          ia.account.removeIdentity(ia.identity);
        },
        async create(accountId, details) {
          let account = MailServices.accounts.getAccount(accountId);
          if (!account) {
            throw new ExtensionError(`Account not found: ${accountId}`);
          }
          // Abort and throw, if details include protected properties.
          checkForProtectedProperties(details);

          let identity = MailServices.accounts.createIdentity();
          updateIdentity(identity, details);
          account.addIdentity(identity);
          return convertMailIdentity(account, identity);
        },
        async update(identityId, details) {
          let ia = findIdentityAndAccount(identityId);
          if (!ia) {
            throw new ExtensionError(`Identity not found: ${identityId}`);
          }
          // Abort and throw, if details include protected properties.
          checkForProtectedProperties(details);

          updateIdentity(ia.identity, details);
          return convertMailIdentity(ia.account, ia.identity);
        },
        async getDefault(accountId) {
          let account = MailServices.accounts.getAccount(accountId);
          return convertMailIdentity(account, account?.defaultIdentity);
        },
        async setDefault(accountId, identityId) {
          let account = MailServices.accounts.getAccount(accountId);
          if (!account) {
            throw new ExtensionError(`Account not found: ${accountId}`);
          }
          for (let identity of account.identities) {
            if (identity.key == identityId) {
              account.defaultIdentity = identity;
              return;
            }
          }
          throw new ExtensionError(
            `Identity ${identityId} not found for ${accountId}`
          );
        },
        onCreated: new EventManager({
          context,
          module: "identities",
          event: "onCreated",
          extensionApi: this,
        }).api(),
        onUpdated: new EventManager({
          context,
          module: "identities",
          event: "onUpdated",
          extensionApi: this,
        }).api(),
        onDeleted: new EventManager({
          context,
          module: "identities",
          event: "onDeleted",
          extensionApi: this,
        }).api(),
      },
    };
  }
};
