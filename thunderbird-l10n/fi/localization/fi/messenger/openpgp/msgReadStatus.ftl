# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message Header Encryption Button

message-header-show-security-info-key = S
#   $type (String) - the shortcut key defined in the message-header-show-security-info-key
message-security-button =
    .title =
        { PLATFORM() ->
            [macos] Näytä viestin tietosuoja (⌘ ⌥ { message-header-show-security-info-key })
           *[other] Näytä viestin tietosuoja (Ctrl+Alt+{ message-header-show-security-info-key })
        }
openpgp-view-signer-key =
    .label = Tarkastele allekirjoittajan avainta
openpgp-view-your-encryption-key =
    .label = Tarkastele salauksen purkuun käyttämääsi avainta
openpgp-openpgp = OpenPGP
openpgp-no-sig = Ei digitaalista allekirjoitusta
openpgp-no-sig-info = Tämä viesti ei sisällä lähettäjän digitaalista allekirjoitusta. Digitaalisen allekirjoituksen puuttumien tarkoittaa, että viestin on voinut lähettää joku tämän sähköpostiosoitteen omistajaksi tekeytyvä. On myös mahdollista, että viestiä on muokattu sitä verkossa siirrettäessä.
openpgp-uncertain-sig = Epävarma digitaalinen allekirjoitus
openpgp-uncertain-sig-with-date = Epävarma digitaalinen allekirjoitus – allekirjoitettu { $date }
openpgp-invalid-sig = Virheellinen digitaalinen allekirjoitus
openpgp-invalid-sig-with-date = Virheellinen digitaalinen allekirjoitus - allekirjoitettu { $date }
openpgp-good-sig = Hyvä digitaalinen allekirjoitus
openpgp-good-sig-with-date = Hyvä digitaalinen allekirjoitus – allekirjoitettu { $date }
openpgp-sig-uncertain-no-key = Tämä viesti sisältää digitaalisen allekirjoituksen, mutta sen kelvollisuus on epävarma. Allekirjoituksen vahvistamiseksi sinun tulee hankkia kopio lähettäjän julkisesta avaimesta.
openpgp-sig-uncertain-uid-mismatch = Tämä viesti sisältää digitaalisen allekirjoituksen, mutta yhteensopimattomuus havaittiin. Viesti lähetettiin sähköpostiosoitteesta, joka ei vastaa lähettäjän julkista avainta.
openpgp-sig-uncertain-not-accepted = Tämä viesti sisältää digitaalisen allekirjoituksen, mutta et ole vielä päättänyt, onko allekirjoittajan avain hyväksyttävä näkökulmastasi.
openpgp-sig-invalid-rejected = Tämä viesti sisältää digitaalisen allekirjoituksen, mutta olet aiemmin päättänyt hylätä allekirjoittajan avaimen.
openpgp-sig-invalid-technical-problem = Tämä viesti sisältää digitaalisen allekirjoituksen, mutta tekninen virhe havaittiin. Joko viesti on rikkoutunut tai sitä on muokattu jonkun muun kuin allekirjoittajan toimesta.
openpgp-sig-valid-unverified = Tämä viesti sisältää kelvollisen digitaalisen allekirjoituksen, joka on tehty jo aiemmin hyväksymälläsi avaimella. Et ole kuitenkaan vahvistanut, että lähettäjä todellisuudessa omistaa avaimen.
openpgp-sig-valid-verified = Tämä viesti sisältää kelvollisen digitaalisen allekirjoituksen vahvistetusta avaimesta.
openpgp-sig-valid-own-key = Tämä viesti sisältää kelvollisen digitaalisen allekirjoituksen henkilökohtaisesta avaimestasi.
openpgp-sig-key-id = Allekirjoittajan avaimen tunniste: { $key }
openpgp-sig-key-id-with-subkey-id = Allekirjoittajan avaimen tunniste: { $key } (Aliavaimen tunniste: { $subkey })
openpgp-enc-key-id = Salauksen purkamiseen käyttämäsi avaimen tunniste: { $key }
openpgp-enc-key-with-subkey-id = Salauksen purkamiseen käyttämäsi avaimen tunniste: { $key } (Aliavaimen tunniste: { $subkey })
openpgp-enc-none = Viestiä ei ole salattu
openpgp-enc-none-label = Tätä viestiä ei salattu ennen sen lähettämistä. Internetissä salaamatta lähetty viesti voi olla muiden nähtävissä siirron aikana.
openpgp-enc-invalid-label = Viestin salausta ei voida purkaa
openpgp-enc-invalid = Tämä viesti salattiin ennen kuin se lähetettiin sinulle, mutta salausta ei voida purkaa.
openpgp-enc-clueless = Tähän salattuun viestiin liittyy tuntemattomia ongelmia.
openpgp-enc-valid-label = Viesti on salattu
openpgp-enc-valid = Tämä viesti salattiin, ennen kuin se lähetettiin sinulle. Salaus varmistaa, että vain ne vastaanottajat voivat lukea viestin, jolle se on tarkoitettu.
openpgp-unknown-key-id = Tuntematon avain
openpgp-other-enc-additional-key-ids = Lisäksi viesti salattiin seuraavien avainten omistajille:
openpgp-other-enc-all-key-ids = Viesti salattiin seuraavien avainten omistajille:
openpgp-message-header-encrypted-ok-icon =
    .alt = Salauksen purku onnistui
openpgp-message-header-encrypted-notok-icon =
    .alt = Salauksen purku epäonnistui
openpgp-message-header-signed-ok-icon =
    .alt = Hyvä allekirjoitus
# Mismatch icon is used for notok state as well
openpgp-message-header-signed-mismatch-icon =
    .alt = Huono allekirjoitus
openpgp-message-header-signed-unknown-icon =
    .alt = Tuntematon allekirjoituksen tila
openpgp-message-header-signed-verified-icon =
    .alt = Vahvistettu allekirjoitus
openpgp-message-header-signed-unverified-icon =
    .alt = Vahvistamaton allekirjoitus
