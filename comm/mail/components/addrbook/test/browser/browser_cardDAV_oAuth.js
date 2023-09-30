/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

// Creates address books in various configurations (current and legacy) and
// performs requests in each of them to prove that OAuth2 authentication is
// working as expected.

var { CardDAVDirectory } = ChromeUtils.import(
  "resource:///modules/CardDAVDirectory.jsm"
);

var LoginInfo = Components.Constructor(
  "@mozilla.org/login-manager/loginInfo;1",
  Ci.nsILoginInfo,
  "init"
);

// Ideal login info. This is what would be saved if you created a new calendar.
const ORIGIN = "oauth://mochi.test";
const SCOPE = "test_scope";
const USERNAME = "bob@test.invalid";
const VALID_TOKEN = "bobs_refresh_token";

const PATH = "comm/mail/components/addrbook/test/browser/data/";
const URL = `http://mochi.test:8888/browser/${PATH}`;

/**
 * Set a string pref for the given directory.
 *
 * @param {string} dirPrefId
 * @param {string} key
 * @param {string} value
 */
function setPref(dirPrefId, key, value) {
  Services.prefs.setStringPref(`ldap_2.servers.${dirPrefId}.${key}`, value);
}

/**
 * Clear any existing saved logins and add the given ones.
 *
 * @param {string[][]} - Zero or more arrays consisting of origin, realm,
 *   username, and password.
 */
function setLogins(...logins) {
  Services.logins.removeAllLogins();
  for (let [origin, realm, username, password] of logins) {
    Services.logins.addLogin(
      new LoginInfo(origin, null, realm, username, password, "", "")
    );
  }
}

/**
 * Create a directory with the given id, perform a request, and check that the
 * correct authorisation header was used. If the user is required to
 * re-authenticate with the provider, check that the new token is stored in the
 * right place.
 *
 * @param {string} dirPrefId - Pref ID of the new directory.
 * @param {string} uid - UID of the new directory.
 * @param {string} [newTokenUsername] - If given, re-authentication must happen
 *   and the new token stored with this user name.
 */
async function subtest(dirPrefId, uid, newTokenUsername) {
  let directory = new CardDAVDirectory();
  directory._dirPrefId = dirPrefId;
  directory._uid = uid;
  directory.__prefBranch = Services.prefs.getBranch(
    `ldap_2.servers.${dirPrefId}.`
  );
  directory.__prefBranch.setStringPref("carddav.url", URL);

  let response = await directory._makeRequest("auth_headers.sjs");
  Assert.equal(response.status, 200);
  let headers = JSON.parse(response.text);

  if (newTokenUsername) {
    Assert.equal(headers.authorization, "Bearer new_access_token");

    let logins = Services.logins
      .findLogins(ORIGIN, null, SCOPE)
      .filter(l => l.username == newTokenUsername);
    Assert.equal(logins.length, 1);
    Assert.equal(logins[0].username, newTokenUsername);
    Assert.equal(logins[0].password, "new_refresh_token");
  } else {
    Assert.equal(headers.authorization, "Bearer bobs_access_token");
  }

  Services.logins.removeAllLogins();
}

// Test making a request when there is no matching token stored.

/** No token stored, no username set. */
add_task(function testAddressBookOAuth_uid_none() {
  let dirPrefId = "uid_none";
  let uid = "testAddressBookOAuth_uid_none";
  return subtest(dirPrefId, uid, uid);
});

// Test making a request when there IS a matching token, but the server rejects
// it. Currently a new token is not requested on failure.

/** Expired token stored with UID. */
add_task(function testAddressBookOAuth_uid_expired() {
  let dirPrefId = "uid_expired";
  let uid = "testAddressBookOAuth_uid_expired";
  setLogins([ORIGIN, SCOPE, uid, "expired_token"]);
  return subtest(dirPrefId, uid, uid);
}).skip(); // Broken.

// Test making a request with a valid token.

/** Valid token stored with UID. This is the old way of storing the token. */
add_task(function testAddressBookOAuth_uid_valid() {
  let dirPrefId = "uid_valid";
  let uid = "testAddressBookOAuth_uid_valid";
  setLogins([ORIGIN, SCOPE, uid, VALID_TOKEN]);
  return subtest(dirPrefId, uid);
});

/** Valid token stored with username, exact scope. */
add_task(function testAddressBookOAuth_username_validSingle() {
  let dirPrefId = "username_validSingle";
  let uid = "testAddressBookOAuth_username_validSingle";
  setPref(dirPrefId, "carddav.username", USERNAME);
  setLogins(
    [ORIGIN, SCOPE, USERNAME, VALID_TOKEN],
    [ORIGIN, "other_scope", USERNAME, "other_refresh_token"]
  );
  return subtest(dirPrefId, uid);
});

/** Valid token stored with username, many scopes. */
add_task(function testAddressBookOAuth_username_validMultiple() {
  let dirPrefId = "username_validMultiple";
  let uid = "testAddressBookOAuth_username_validMultiple";
  setPref(dirPrefId, "carddav.username", USERNAME);
  setLogins([ORIGIN, "scope test_scope other_scope", USERNAME, VALID_TOKEN]);
  return subtest(dirPrefId, uid);
});
