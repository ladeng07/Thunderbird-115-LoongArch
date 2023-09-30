# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message Header Encryption Button

message-header-show-security-info-key = E
#   $type (String) - the shortcut key defined in the message-header-show-security-info-key
message-security-button =
    .title =
        { PLATFORM() ->
            [macos] Erakutsi segurtasun mezua (⌃ ⌘ { message-header-show-security-info-key })
           *[other] Erakutsi segurtasun mezua (Ctrl+Alt+{ message-header-show-security-info-key })
        }
openpgp-view-signer-key =
    .label = Ikusi gako sinatzailea
openpgp-view-your-encryption-key =
    .label = ikusi zure gako deskribapena
openpgp-openpgp = OpenPGP
openpgp-no-sig = Sinadura digitalik ez
openpgp-no-sig-info = Mezu honek ez du bidaltzailearen sinadura digitalik. Horrek esan nahi balitekeela mezua beste norbaitek bidali izana, email helbide honen jabea delako itxurak eginez. Era berean, baliteke ere norbaitek mezua eraldatu izana sarean zebilen bitartean.
openpgp-uncertain-sig = Zalantzazko sinadura digitala
# Variables:
# $date (String) - Date with time the signature was made in a short format.
openpgp-uncertain-sig-with-date = Zalantzazko sinadura digitala - { $date } datan sinatua
openpgp-invalid-sig = Sinadura digital baliogabea
# Variables:
# $date (String) - Date with time the signature was made in a short format.
openpgp-invalid-sig-with-date = Sinadura digital baliogabea - { $date } datan sinatua
openpgp-good-sig = Sinadura digital ona
# Variables:
# $date (String) - Date with time the signature was made in a short format.
openpgp-good-sig-with-date = Sinadura digital ona - { $date } datan sinatua
openpgp-sig-uncertain-no-key = Mezu honek badauka sinadura digitala, baina zalantzazkoa da zuzena ote dan. Sinadura egiaztatzeko, igortzailearen gako publikoaren kopia bat lortu behar duzu.
openpgp-sig-uncertain-uid-mismatch = Mezu honek sinadura digitala dauka, baina bat ez etortze bat detektatu da. Mezua bidali duen posta elektroniko helbidea ez dator bat gako publikoaren sinatzaileaz.
openpgp-sig-uncertain-not-accepted = Mezu honek sinadura digitala dauka, baina zuk oraindik ez duzu erabaki sinatzailearen gakoa onartzen duzun.
openpgp-sig-invalid-rejected = Mezuak sinadura digitala dauka, baina zuk aurrez erabaki zenuen gakoaren sinatzailea baztertzea.
openpgp-sig-invalid-technical-problem = Mezu honek sinadura digitala dauka, baina akats tekniko bat detektatu da. Edo mezua hondatu da edo beste norbaitek mezua mezua aldatu du.
openpgp-sig-valid-unverified = Mezu honek badauka sinadura digital zuzen bat zuk aurrez onartutako gako batena. Edonola, oraindik egiaztatzeke daukazu benetan gakoa bidaltzailearena den.
openpgp-sig-valid-verified = Mezu honek badauka sinadura digital zuzena egiaztatutako gako batena.
openpgp-sig-valid-own-key = Mezu honek badauka sinadura digital zuzena zure gako pertsonal batena.
# Variables:
# $key (String) - The ID of the OpenPGP key used to create the signature.
openpgp-sig-key-id = Sinatzailearen gako ID: { $key }
# Variables:
# $key (String) - The primary ID of the OpenPGP key used to create the signature.
# $subkey (String) - A subkey of the primary key was used to create the signature, and this is the ID of that subkey.
openpgp-sig-key-id-with-subkey-id = Sinatzailearen gako ID: { $key } (Azpi-gako ID: { $subkey })
# Variables:
# $key (String) - The ID of the user's OpenPGP key used to decrypt the message.
openpgp-enc-key-id = Zure deskribapen gako ID: { $key }
# Variables:
# $key (String) - The primary ID of the user's OpenPGP key used to decrypt the message.
# $subkey (String) - A subkey of the primary key was used to decrypt the message, and this is the ID of that subkey.
openpgp-enc-key-with-subkey-id = Zure deskribapenaren gako ID: { $key } (Azpi-gako ID: { $subkey })
openpgp-enc-none = Mezua EZ dago zifratuta
openpgp-enc-none-label = Mezu hau ez da zifratu bidali aurretik. Zifratu gabeko informazioa Interneten zehar bidaltzerakoan beste edonork ikus lezake.
openpgp-enc-invalid-label = Ezin da mezua deszifratu
openpgp-enc-invalid = Mezu hau zifratu egin da zuri bidali aurretik, baina ezin da deszifratu.
openpgp-enc-clueless = Zifratutako mezu honekin arazo ezezagunak daude.
openpgp-enc-valid-label = Mezua zifratuta dago
openpgp-enc-valid = Mezu hau zuri bidali aurretik zifratu zen. Zifratzeak, mezua zuzendu zaion hartzaileak bakarrik irakurtzea bermatzen du.
openpgp-unknown-key-id = Gako ezezaguna
openpgp-other-enc-additional-key-ids = Honez gain, mezua zifratuko da ondorengo gakoen jabeentzat:
openpgp-other-enc-all-key-ids = Mezua zifratuko da ondorengo gakoen jabeentzat:
openpgp-message-header-encrypted-ok-icon =
    .alt = Deszifratze zuzena
openpgp-message-header-encrypted-notok-icon =
    .alt = Huts egin du deszifratzean
openpgp-message-header-signed-ok-icon =
    .alt = Sinadura ona
# Mismatch icon is used for notok state as well
openpgp-message-header-signed-mismatch-icon =
    .alt = Sinadura txarra
openpgp-message-header-signed-unknown-icon =
    .alt = Sinadura egoera ezezaguna
openpgp-message-header-signed-verified-icon =
    .alt = Egiaztatutako sinadura
openpgp-message-header-signed-unverified-icon =
    .alt = Egiaztatu gabeko sinadura
