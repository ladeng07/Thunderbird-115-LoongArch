# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Encryption status


## Resolve section

openpgp-key-assistant-key-fingerprint = Fingeravtrykk
# Variables:
# $count (Number) - Number of key sources.
openpgp-key-assistant-key-source =
    { $count ->
        [one] Kjelder
       *[other] Kjelder
    }

## Discovery section


## Dialog buttons

openpgp-key-assistant-view-key-button = Vis nøkkel…
openpgp-key-assistant-recipients-show-button = Vis
openpgp-key-assistant-recipients-hide-button = Gøym
openpgp-key-assistant-cancel-button = Avbryt
openpgp-key-assistant-back-button = Tilbake
openpgp-key-assistant-accept-button = Godta
openpgp-key-assistant-close-button = Lat att
openpgp-key-assistant-disable-button = Deaktiver kryptering
openpgp-key-assistant-confirm-button = Send krypteret
# Variables:
# $date (String) - The key creation date.
openpgp-key-assistant-key-created = oppretta den { $date }
