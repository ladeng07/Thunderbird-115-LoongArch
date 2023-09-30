/* -*- Mode: JavaScript; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["LDAPListenerBase"];

/**
 * @implements {nsILDAPMessageListener}
 */
class LDAPListenerBase {
  /**
   * @see nsILDAPMessageListener
   */
  async onLDAPInit() {
    let outPassword = {};
    if (this._directory.authDn && this._directory.saslMechanism != "GSSAPI") {
      // If authDn is set, we're expected to use it to get a password.
      let bundle = Services.strings.createBundle(
        "chrome://mozldap/locale/ldap.properties"
      );

      let authPrompt = Services.ww.getNewAuthPrompter(
        Services.wm.getMostRecentWindow(null)
      );
      await authPrompt.asyncPromptPassword(
        bundle.GetStringFromName("authPromptTitle"),
        bundle.formatStringFromName("authPromptText", [
          this._directory.lDAPURL.host,
        ]),
        this._directory.lDAPURL.spec,
        Ci.nsIAuthPrompt.SAVE_PASSWORD_PERMANENTLY,
        outPassword
      );
    }
    this._operation.init(this._connection, this, null);

    if (this._directory.saslMechanism != "GSSAPI") {
      this._operation.simpleBind(outPassword.value);
      return;
    }

    // Handle GSSAPI now.
    this._operation.saslBind(
      `ldap@${this._directory.lDAPURL.host}`,
      "GSSAPI",
      "sasl-gssapi"
    );
  }

  /**
   * Handler of nsILDAPMessage.RES_BIND message.
   *
   * @param {nsILDAPMessage} msg - The received LDAP message.
   */
  _onLDAPBind(msg) {
    let errCode = msg.errorCode;
    if (
      errCode == Ci.nsILDAPErrors.INAPPROPRIATE_AUTH ||
      errCode == Ci.nsILDAPErrors.INVALID_CREDENTIALS
    ) {
      // Login failed, remove any existing login(s).
      let ldapUrl = this._directory.lDAPURL;
      let logins = Services.logins.findLogins(
        ldapUrl.prePath,
        "",
        ldapUrl.spec
      );
      for (let login of logins) {
        Services.logins.removeLogin(login);
      }
      // Trigger the auth prompt.
      this.onLDAPInit();
      return;
    }
    if (errCode != Ci.nsILDAPErrors.SUCCESS) {
      this._actionOnBindFailure();
      return;
    }
    this._actionOnBindSuccess();
  }

  /**
   * @see nsILDAPMessageListener
   * @abstract
   */
  onLDAPMessage() {
    throw new Components.Exception(
      `${this.constructor.name} does not implement onLDAPMessage.`,
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  /**
   * Callback when BindResponse succeeded.
   *
   * @abstract
   */
  _actionOnBindSuccess() {
    throw new Components.Exception(
      `${this.constructor.name} does not implement _actionOnBindSuccess.`,
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  /**
   * Callback when BindResponse failed.
   *
   * @abstract
   */
  _actionOnBindFailure() {
    throw new Components.Exception(
      `${this.constructor.name} does not implement _actionOnBindFailure.`,
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }
}
