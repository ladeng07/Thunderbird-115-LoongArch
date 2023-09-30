# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message Header Encryption Button

message-header-show-security-info-key = t
#   $type (String) - the shortcut key defined in the message-header-show-security-info-key
message-security-button =
    .title =
        { PLATFORM() ->
            [macos] Berjochtbefeiliging toane (⌘ ⌥ { message-header-show-security-info-key })
           *[other] Berjochtbefeiliging toane (Ctrl+Alt+{ message-header-show-security-info-key })
        }
openpgp-view-signer-key =
    .label = Kaai ûndertekener besjen
openpgp-view-your-encryption-key =
    .label = Jo ûntsiferingskaai besjen
openpgp-openpgp = OpenPGP
openpgp-no-sig = Gjin digitale hantekening
openpgp-no-sig-info = Dit berjocht befettet gjin digitale ûndertekening fan de ôfstjoerder. De ôfwêzichheid fan in digitale ûndertekening betsjut dat dit berjocht ferstjoerd wêze kin troch immen dy’t dit e-mailadres yn werklikheid net hat. It kin ek wêze dat it berjocht skeind is by it ferstjoeren oer it netwurk.
openpgp-uncertain-sig = Unwisse digitale hantekening
openpgp-uncertain-sig-with-date = Unwisse digitale hantekening – Undertekene op { $date }
openpgp-invalid-sig = Unjildige digitale hantekening
openpgp-invalid-sig-with-date = Unjildige digitale hantekening – Undertekene op { $date }
openpgp-good-sig = Goede digitale hantekening
openpgp-good-sig-with-date = Goede digitale hantekening – Undertekene op { $date }
openpgp-sig-uncertain-no-key = Dit berjocht befettet in digitale hantekening, mar it is ûnwis oft dizze korrekt is. Om de hantekening te ferifiearjen, moatte jo in kopy fan de iepenbiere kaai fan de ôfstjoerder krije.
openpgp-sig-uncertain-uid-mismatch = Dit berjocht befettet in digitale hantekening, mar der is in ferkearde kombinaasje detektearre. It berjocht is ferstjoerd fan in e-mailadres ôf dat net oerienkomt mei de iepenbiere kaai fan de ûndertekener.
openpgp-sig-uncertain-not-accepted = Dit berjocht befettet in digitale hantekening, mar jo hawwe noch net besluten oft de kaai fan de ûndertekener akseptabel foar jo is.
openpgp-sig-invalid-rejected = Dit berjocht befettet in digitale hantekening, mar jo hawwe earder besluten de kaai fan de ûndertekener te wegerjen.
openpgp-sig-invalid-technical-problem = Dit berjocht befettet in digitale hantekening, mar der is in technyske flater detektearre. It berjocht is skansearre of it berjocht is troch in oar wizige.
openpgp-sig-valid-unverified = Dit berjocht befettet in jildige digitale hantekening fan in kaai dy’t jo al akseptearre hawwe. Jo hawwe allinnich noch net ferifiearre dat de kaai echt fan de ôfstjoerder is.
openpgp-sig-valid-verified = Dit berjocht befettet in jildige digitale hantekening fan in ferifiearre kaai.
openpgp-sig-valid-own-key = Dit berjocht befettet in jildige digitale hantekening fan jo persoanlike kaai.
openpgp-sig-key-id = Kaai-ID ûndertekener: { $key }
openpgp-sig-key-id-with-subkey-id = Kaai-ID ûndertekener: { $key } (subkaai-ID: { $subkey })
openpgp-enc-key-id = Jo ûntsiferingskaai-ID: { $key }
openpgp-enc-key-with-subkey-id = Jo ûntsiferingskaai-ID: { $key } (subkaai-ID: { $subkey })
openpgp-enc-none = Berjocht is net fersifere
openpgp-enc-none-label = Dit berjocht is net fersifere foardat it ferstjoerd waard. Net-fersifere ynformaasje dy’t oer it ynternet ferstjoerd is,  kin troch oaren by it ferstjoeren besjoen wurde.
openpgp-enc-invalid-label = Berjocht kin net ûntsifere wurde
openpgp-enc-invalid = Dit berjocht is fersifere foardat it nei jo tastjoerd waard, mar kin net ûntsifere wurde.
openpgp-enc-clueless = Der binne ûnbekende swierrichheden mei dit fersifere berjocht.
openpgp-enc-valid-label = Berjocht is fersifere
openpgp-enc-valid = Dit berjocht is fersifere eardat it nei jo ferstjoerd waard. Fersiferling soarget derfoar dat it berjocht allinnich lêzen wurde kin troch de ûntfangers wêrfoar it bedoeld is.
openpgp-unknown-key-id = Unbekende kaai
openpgp-other-enc-additional-key-ids = Dêrneist is it berjocht fersifere nei de eigeners fan de folgjende kaaien:
openpgp-other-enc-all-key-ids = It berjocht is fersifere nei de eigeners fan de folgjende kaaien:
openpgp-message-header-encrypted-ok-icon =
    .alt = Untsifering suksesfol
openpgp-message-header-encrypted-notok-icon =
    .alt = Untsifering mislearre
openpgp-message-header-signed-ok-icon =
    .alt = Goede ûndertekening
# Mismatch icon is used for notok state as well
openpgp-message-header-signed-mismatch-icon =
    .alt = Minne ûndertekening
openpgp-message-header-signed-unknown-icon =
    .alt = Unbekende ûndertekeningssteat
openpgp-message-header-signed-verified-icon =
    .alt = Ferifiearre ûndertekening
openpgp-message-header-signed-unverified-icon =
    .alt = Net ferifiearre ûndertekening
