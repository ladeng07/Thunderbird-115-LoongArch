/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["LDAPURLParser"];

/**
 * @implements {nsILDAPURLParser}
 */
class LDAPURLParser {
  QueryInterface = ChromeUtils.generateQI(["nsILDAPURLParser"]);

  parse(spec) {
    // The url is in the form of scheme://hostport/dn?attributes?scope?filter,
    // see RFC2255.
    let matches =
      /^(ldaps?):\/\/\[?([^\s\]/]+)\]?:?(\d*)\/([^\s?]*)\??(.*)$/.exec(spec);
    if (!matches) {
      throw Components.Exception(
        `Invalid LDAP URL: ${spec}`,
        Cr.NS_ERROR_ILLEGAL_VALUE
      );
    }
    let [, scheme, host, port, dn, query] = matches;
    let [attributes, scopeString, filter] = query.split("?");
    let scope =
      {
        one: Ci.nsILDAPURL.SCOPE_ONELEVEL,
        sub: Ci.nsILDAPURL.SCOPE_SUBTREE,
      }[scopeString] || Ci.nsILDAPURL.SCOPE_BASE;
    return {
      QueryInterface: ChromeUtils.generateQI(["nsILDAPURLParserResult"]),
      host,
      port,
      dn: decodeURIComponent(dn),
      attributes,
      scope,
      filter: filter ? decodeURIComponent(filter) : "(objectclass=*)",
      options: scheme == "ldaps" ? Ci.nsILDAPURL.OPT_SECURE : 0,
    };
  }
}
