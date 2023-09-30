/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

function* vCardHtmlIdGen() {
  let internalId = 0;
  while (true) {
    yield `vcard-id-${internalId++}`;
  }
}

export let vCardIdGen = vCardHtmlIdGen();
