# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

xpinstall-prompt = { -brand-short-name } kom í veg fyrir að vefsvæðið gæti spurt hvort það gæti sett upp hugbúnað á tölvunni.

## Variables:
##   $host (String): The hostname of the site the add-on is being installed from.

xpinstall-prompt-header = Leyfa { $host } að setja inn viðbót?
xpinstall-prompt-message = Þú ert að reyna að setja upp viðbót frá { $host }. Gakktu úr skugga um að þú treystir þessu vefsvæði áður en þú heldur áfram.

##

xpinstall-prompt-header-unknown = Leyfa óþekktu vefsvæði að setja inn viðbót?
xpinstall-prompt-message-unknown = Þú ert að reyna að setja upp viðbót frá óþekktu vefsvæði. Gakktu úr skugga um að þú treystir þessu vefsvæði áður en þú heldur áfram.
xpinstall-prompt-dont-allow =
    .label = Ekki leyfa
    .accesskey = E
xpinstall-prompt-never-allow =
    .label = Aldrei leyfa
    .accesskey = A
# Long text in this context make the dropdown menu extend awkwardly to the left,
# avoid a localization that's significantly longer than the English version.
xpinstall-prompt-never-allow-and-report =
    .label = Tilkynna grunsamlegt vefsvæði
    .accesskey = r
# Accessibility Note:
# Be sure you do not choose an accesskey that is used elsewhere in the active context (e.g. main menu bar, submenu of the warning popup button)
# See https://website-archive.mozilla.org/www.mozilla.org/access/access/keyboard/ for details
xpinstall-prompt-install =
    .label = Halda áfram í uppsetningu
    .accesskey = C

# These messages are shown when a website invokes navigator.requestMIDIAccess.

site-permission-install-first-prompt-midi-header = Þetta vefsvæði biður um aðgang að MIDI-tækjunum þínum (Musical Instrument Digital Interface). Hægt er að virkja aðgang að tæki með því að setja inn viðbót.
site-permission-install-first-prompt-midi-message = Ekki er tryggt að þessi aðgangur sé öruggur. Haltu aðeins áfram ef þú treystir þessu vefsvæði.

##

xpinstall-disabled-locked = Kerfistjóri hefur gert hugbúnaðar uppsetningu óvirka.
xpinstall-disabled = Hugbúnaðar uppsetning er óvirk. Smelltu á Virkja og reyndu aftur.
xpinstall-disabled-button =
    .label = Virkja
    .accesskey = V
# This message is shown when the installation of an add-on is blocked by enterprise policy.
# Variables:
#   $addonName (String): the name of the add-on.
#   $addonId (String): the ID of add-on.
addon-install-blocked-by-policy = { $addonName } ({ $addonId }) hefur verið útilokað af kerfisstjóra þínum.
# This message is shown when the installation of add-ons from a domain is blocked by enterprise policy.
addon-domain-blocked-by-policy = Kerfisstjórinn þinn kom í veg fyrir að vefsvæðið gæti spurt hvort það gæti sett upp hugbúnað á tölvunni.
addon-install-full-screen-blocked = Uppsetning viðbóta er ekki leyfð í eða áður en farið er í heilskjásham.
# Variables:
#   $addonName (String): the localized name of the sideloaded add-on.
webext-perms-sideload-menu-item = { $addonName } bætt við í { -brand-short-name }
# Variables:
#   $addonName (String): the localized name of the extension which has been updated.
webext-perms-update-menu-item = { $addonName } krefst nýrra heimilda

## Add-on removal warning

# Variables:
#  $name (String): The name of the add-on that will be removed.
addon-removal-title = Fjarlægja { $name }?
# Variables:
#   $name (String): the name of the extension which is about to be removed.
addon-removal-message = Fjarlægja { $name } úr { -brand-shorter-name }?
addon-removal-button = Fjarlægja
addon-removal-abuse-report-checkbox = Tilkynna þessa viðbót til { -vendor-short-name }
# Variables:
#   $addonCount (Number): the number of add-ons being downloaded
addon-downloading-and-verifying =
    { $addonCount ->
        [one] Sæki og sannreyni viðbót…
       *[other] Sæki og sannreyni { $addonCount } viðbætur…
    }
addon-download-verifying = Staðfesti
addon-install-cancel-button =
    .label = Hætta við
    .accesskey = H
addon-install-accept-button =
    .label = Bæta við
    .accesskey = a

## Variables:
##   $addonCount (Number): the number of add-ons being installed

addon-confirm-install-message =
    { $addonCount ->
        [one] Þetta vefsvæði vill setja inn viðbót í { -brand-short-name }:
       *[other] Þetta vefsvæði vill setja inn { $addonCount } viðbætur í { -brand-short-name }:
    }
addon-confirm-install-unsigned-message =
    { $addonCount ->
        [one] Aðvörun: Þetta vefsvæði vill setja inn óvottaða viðbót í { -brand-short-name }. Haltu áfram ef þú ert alveg viss.
       *[other] Aðvörun: Þetta vefsvæði vill setja inn { $addonCount } óvottaðar viðbætur í { -brand-short-name }. Haltu áfram ef þú ert alveg viss.
    }
# Variables:
#   $addonCount (Number): the number of add-ons being installed (at least 2)
addon-confirm-install-some-unsigned-message = Aðvörun: Þetta vefsvæði vill setja inn { $addonCount } viðbót í { -brand-short-name }, sumar viðbæturnar eru óstaðfestar. Haltu áfram ef þú ert alveg viss.

## Add-on install errors
## Variables:
##   $addonName (String): the add-on name.

addon-install-error-network-failure = Ekki tókst að sækja viðbót þar sem tenging brást.
addon-install-error-incorrect-hash = Ekki tókst að setja inn viðbótina þar sem hún samsvarar ekki viðbótinni { -brand-short-name } eins og búist var við.
addon-install-error-corrupt-file = Ekki tókst að setja inn viðbót frá þessu vefsvæði þar sem viðbótin virðist vera skemmd.
addon-install-error-file-access = Ekki tókst að setja inn { $addonName } þar sem { -brand-short-name } getur ekki breytt nauðsynlegri skrá.
addon-install-error-not-signed = { -brand-short-name } kom í veg fyrir að þetta vefsvæði gæti sett inn óstaðfesta viðbót.
addon-install-error-invalid-domain = Ekki er hægt að setja viðbótina { $addonName } upp af þessari staðsetningu.
addon-local-install-error-network-failure = Ekki tókst að setja inn viðbótina þar sem upp kom villa í skráarkerfi.
addon-local-install-error-incorrect-hash = Ekki tókst að setja inn viðbótina þar sem hún samsvarar ekki viðbótinni { -brand-short-name } eins og búist var við.
addon-local-install-error-corrupt-file = Ekki tókst að setja inn viðbótina þar sem hún virðist vera gölluð.
addon-local-install-error-file-access = Ekki tókst að setja inn { $addonName } þar sem { -brand-short-name } getur ekki breytt nauðsynlegri skrá.
addon-local-install-error-not-signed = Ekki tókst að setja inn viðbótina þar sem hún er óstaðfest.
# Variables:
#   $appVersion (String): the application version.
addon-install-error-incompatible = Ekki tókst að setja inn { $addonName } þar sem hún er ekki samhæfð við { -brand-short-name } { $appVersion }.
addon-install-error-blocklisted = Ekki tókst að setja inn { $addonName } þar sem viðbótin er þekkt fyrir að valda hrun- eða öryggisvillum.
