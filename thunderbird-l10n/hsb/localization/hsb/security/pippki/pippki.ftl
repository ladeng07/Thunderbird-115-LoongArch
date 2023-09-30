# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

password-quality-meter = Kwalitne měritko hesła

## Change Password dialog

change-device-password-window =
    .title = Hesło změnić

# Variables:
# $tokenName (String) - Security device of the change password dialog
change-password-token = Wěstotny grat: { $tokenName }
change-password-old = Aktualne hesło:
change-password-new = Nowe hesło:
change-password-reenter = Nowe hesło (hišće raz):

pippki-failed-pw-change = Njeje móžno, hesło změnić.
pippki-incorrect-pw = Njejsće prawe hesło zapodał. Prošu spytajće hišće raz.
pippki-pw-change-ok = Hesło je so wuspěšnje změniło.

pippki-pw-empty-warning = Waše składowane hesła a priwatne kluče so nješkitaja.
pippki-pw-erased-ok = Sće swoje hesło zhašał.  { pippki-pw-empty-warning }
pippki-pw-not-wanted = Warnowanje! Sće so rozsudźił, zo njeby so hesło wužiwało. { pippki-pw-empty-warning }

pippki-pw-change2empty-in-fips-mode = Sće tuchwilu we FIPS-modusu. FIPS sej hesło žada.

## Reset Primary Password dialog

reset-primary-password-window2 =
    .title = Hłowne hesło wróćo stajić
    .style = min-width: 40em
reset-password-button-label =
    .label = Wróćo stajić
reset-primary-password-text = Jeli swoje hłowne hesło wróćo stajiće, zabudu se wšě waše składowane webowe a e-mejlowe hesła, wosobinski certifikata a priwatne kluče. Chceće woprawdźe swoje hłowne hesło wróćo stajić?

pippki-reset-password-confirmation-title = Hłowne hesło wróćo stajić
pippki-reset-password-confirmation-message = Waše hłowne hesło je so wróćo stajiło.

## Downloading cert dialog

download-cert-window2 =
    .title = Sćehnjenje certifikata
    .style = min-width: 46em
download-cert-message = Bušće poprošeny nowej certifikatowej awtoriće (CA) dowěrić.
download-cert-trust-ssl =
    .label = Tutej certifikatowej awtoriće dowěrić, zo bychu so websydła identifikowali.
download-cert-trust-email =
    .label = Tutej certifikatowej awtoriće dowěrić, zo bychu so e-mejlowi wužiwarjo identifikowali.
download-cert-message-desc = Prjedy hač tutej certifikatowej awtoriće za někajki zaměr dowěriće, wy měł jeje certifikat a jeje prawidła a procedury (jeli k dispoziciji stejace) přepruwować.
download-cert-view-cert =
    .label = Napohlad
download-cert-view-text = Certifikat certifikatoweje awtority přepruwować

## Client Authorization Ask dialog

client-auth-window =
    .title = Požadanje na identifikaciju wužiwarja
client-auth-site-description = Tute sydło je požadało, zo wy sam so přezc ertifikat identifukujeće:
client-auth-choose-cert = Wubjerće certifikat za identifikaciju:
client-auth-cert-details = Podrobnosće wubraneho certifikata:

## Set password (p12) dialog

set-password-window =
    .title = Hesło za zawěsćenje certifikata wubrać
set-password-message = Hesło za zawěsćenje certifikata, kotrež sće tu nastajił, škita zawěsćensku dataju, kotruž wutworjeće. Dyrbiće tute hesło nastajić, prjedy hač ze zawěsćenjom pokročujeće.
set-password-backup-pw =
    .value = Hesło zawěsćenja certifikata:
set-password-repeat-backup-pw =
    .value = Hesło zawěsćenja certifikata (hišće raz):
set-password-reminder = Wažny: Jeli swoje hesło za zawěsćenje certifikata zabudźeće, njemóžeće tute zawěsćenje pozdźišo wobnowić. Prošu wobchowajće jo na wěstym městnje.

## Protected Auth dialog

## Protected authentication alert

# Variables:
# $tokenName (String) - The name of the token to authenticate to (for example, "OS Client Cert Token (Modern)")
protected-auth-alert = Prošu awtentifikujće so pola tokena “{ $tokenName }”. Kak dyrbiće to činić, wotwisuje wot tokena (na přikład přez wužiwanje čitaka porstowych wotćišćow abo přez zapodawanje koda z tastaturu).
