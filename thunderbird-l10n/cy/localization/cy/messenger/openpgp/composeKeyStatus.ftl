# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

openpgp-compose-key-status-intro-need-keys = I anfon neges wedi'i hamgryptio o ben-i-ben, rhaid i chi gael a derbyn allwedd gyhoeddus ar gyfer pob derbynnydd.
openpgp-compose-key-status-keys-heading = Argaeledd allweddi OpenPGP:
openpgp-compose-key-status-title =
    .title = Diogelwch Negeseuon OpenPGP
openpgp-compose-key-status-recipient =
    .label = Derbynnydd
openpgp-compose-key-status-status =
    .label = Statws
openpgp-compose-key-status-open-details = Rheoli allweddi ar gyfer derbynnydd dewisol...
openpgp-recip-good = iawn
openpgp-recip-missing = dim allwedd ar gael
openpgp-recip-none-accepted = dim allwedd wedi'i derbyn
openpgp-compose-general-info-alias = Mae { -brand-short-name } fel arfer yn disgwyl bod allwedd gyhoeddus y derbynnydd yn cynnwys ID defnyddiwr gyda chyfeiriad e-bost sy'n cyfateb. Mae modd diystyru hyn trwy ddefnyddio rheolau alias derbynnydd OpenPGP.
openpgp-compose-general-info-alias-learn-more = Dysgu rhagor
# Variables:
# $count (Number) - Number of alias keys for a recipient.
openpgp-compose-alias-status-direct =
    { $count ->
        [zero] heb ei fapio i allweddi alias
        [one] wedi'i fapio i { $count } allwedd alias
        [two] wedi'i fapio i { $count } allwedd alias
        [few] wedi'i fapio i { $count } allwedd alias
        [many] wedi'i fapio i { $count }allwedd alias
       *[other] wedi'i fapio i { $count } allwedd alias
    }
openpgp-compose-alias-status-error = allwedd alias nad oes modd ei ddefnyddio/ddim ar gael
