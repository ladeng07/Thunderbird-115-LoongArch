# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

close-button =
    .aria-label = Aizvērt
category-list =
    .aria-label = Kategorijas
pane-general-title = Vispārīgi
category-general =
    .tooltiptext = { pane-general-title }
pane-compose-title = Salikšana
category-compose =
    .tooltiptext = Salikšana
pane-privacy-title = Privātums un drošība
category-privacy =
    .tooltiptext = Privātums un drošība
pane-chat-title = Tērzēšana
category-chat =
    .tooltiptext = Tērzēšana
pane-calendar-title = Kalendārs
category-calendar =
    .tooltiptext = Kalendārs
general-language-and-appearance-header = Valoda un izskats
general-incoming-mail-header = Ienākošās vēstules
general-files-and-attachment-header = Faili un pielikumi
general-tags-header = Birkas
general-reading-and-display-header = Lasīšana un attēlošana
general-updates-header = Atjaunojumi
general-network-and-diskspace-header = Tīkls un diska vieta
general-indexing-label = Indeksēšana
composition-category-header = Salikšana
composition-attachments-header = Pielikumi
composition-spelling-title = Pareizrakstība
compose-html-style-title = HTML stils
composition-addressing-header = Adresēšana
privacy-main-header = Privātums
privacy-passwords-header = Paroles
privacy-junk-header = Draza
collection-header = { -brand-short-name } datu vākšana un izmantošana
collection-description = Mēs cenšamies sniegt jums izvēles iespējas un apkopot tikai to, kas mums ir nepieciešams, lai { -brand-short-name } nodrošinātu un uzlabotu ikvienam. Pirms personīgās informācijas sūtīšanas mēs vienmēr lūdzam atļauju.
collection-privacy-notice = Privātuma atruna
collection-health-report-telemetry-disabled = Jūs vairs neļaujat { -vendor-short-name } uzņemt tehniskos un mijiedarbības datus. Visi iepriekšējie dati tiks dzēsti 30 dienu laikā.
collection-health-report-telemetry-disabled-link = Uzzināt vairāk
collection-health-report =
    .label = Ļaut { -brand-short-name } nosūtīt tehniskos un mijiedarbības datus uz vietni { -vendor-short-name }
    .accesskey = s
collection-health-report-link = Uzzināt vairāk
# This message is displayed above disabled data sharing options in developer builds
# or builds with no Telemetry support available.
collection-health-report-disabled = Šī būvējuma iestatījumos datu pārskati ir atslēgti
collection-backlogged-crash-reports =
    .label = Ļaut { -brand-short-name } jūsu vārdā nosūtīt ierakstītos avārijas ziņojumus
    .accesskey = j
collection-backlogged-crash-reports-link = Uzzināt vairāk
privacy-security-header = Drošība
privacy-scam-detection-title = Krāpšanas noteikšana
privacy-anti-virus-title = Vīrusu aizsardzība
privacy-certificates-title = Sertifikāti
chat-pane-header = Tērzēšana
chat-status-title = Statuss
chat-notifications-title = Paziņojumi
chat-pane-styling-header = Stils
choose-messenger-language-description = Izvēlieties { -brand-short-name } izmantojamās valodas izvēļņu, brīdinājumu un paziņojumu rādīšanai.
manage-messenger-languages-button =
    .label = Iestatīt alternatīvas...
    .accesskey = s
confirm-messenger-language-change-description = Pārstartēt { -brand-short-name }, lai pielietotu izmaiņas
confirm-messenger-language-change-button = Pielietot un pārstartēt
update-setting-write-failure-title = Saglabājot atjaunotos iestatījumus, radās kļūda
# Variables:
#   $path (String) - Path to the configuration file
# The newlines between the main text and the line containing the path is
# intentional so the path is easier to identify.
update-setting-write-failure-message =
    { -brand-short-name } radās kļūda un šīs izmaiņas netika saglabātas. Ņemiet vērā, ka, lai saglabāto atjaunotos iestatījumus, ir nepieciešamas tiesības rakstīt zemāk esošajā failā. Iespējams, jūs vai jūsu sistēmas administrators, varēsit novērst kļūdu, piešķirot Lietotājs grupai pilnu kontroli pār šo failu.
    
    Neizdevās rakstīt failā: { $path }
update-in-progress-title = Notiek atjaunošana
update-in-progress-message = Vai vēlaties, lai { -brand-short-name } turpina lietot šo atjaunojumu?
update-in-progress-ok-button = &Izmest
# Continue is the cancel button so pressing escape or using a platform standard
# method of closing the UI will not discard the update.
update-in-progress-cancel-button = &Turpināt
account-button = Konta iestatījumi

## OS Authentication dialog

# This message can be seen by trying to add a Primary Password.
primary-password-os-auth-dialog-message-win = Lai izveidotu galveno paroli, ievadiet Windows pieteikšanās akreditācijas datus. Tas palīdz aizsargāt jūsu kontu drošību.
# This message can be seen by trying to add a Primary Password.
# The macOS strings are preceded by the operating system with "Thunderbird is trying to "
# and includes subtitle of "Enter password for the user "xxx" to allow this." These
# notes are only valid for English. Please test in your locale.
primary-password-os-auth-dialog-message-macosx = izveidot primāro paroli
# Don't change this label.
master-password-os-auth-dialog-caption = { -brand-full-name }

## General Tab

focus-search-shortcut =
    .key = f
focus-search-shortcut-alt =
    .key = k
general-legend = { -brand-short-name } Sākumlapa
start-page-label =
    .label = Palaižot { -brand-short-name }, vēstuļu apgabalā rādīt šo Sākumlapu
    .accesskey = P
location-label =
    .value = Vieta:
    .accesskey = v
restore-default-label =
    .label = Atjaunot noklusētos
    .accesskey = A
default-search-engine = Noklusētais meklētājs
remove-search-engine =
    .label = Noņemt
    .accesskey = N
minimize-to-tray-label =
    .label = Minimizējot { -brand-short-name }, pārvietot to uz paplāti
    .accesskey = M
new-message-arrival = Kad pienāk jaunas vēstules:
mail-play-sound-label =
    .label =
        { PLATFORM() ->
            [macos] Atskaņot sekojošu skaņas failu:
           *[other] Atskaņot skaņu
        }
    .accesskey = s
mail-play-button =
    .label = Atskaņot
    .accesskey = A
change-dock-icon = Mainīt lietotnes ikonas iestatījumus
app-icon-options =
    .label = Lietotnes ikonas iespējas…
    .accesskey = L
animated-alert-label =
    .label = Rādīt brīdinājumu
    .accesskey = R
customize-alert-label =
    .label = Pielāgot…
    .accesskey = P
mail-system-sound-label =
    .label = Jauna pasta noklusētā sistēmas skaņa
    .accesskey = s
mail-custom-sound-label =
    .label = Izmantot sekojošu skaņas failu
    .accesskey = I
mail-browse-sound-button =
    .label = Pārlūkot...
    .accesskey = P
enable-gloda-search-label =
    .label = Ieslēgt globālo meklēšanu un indeksētāju
    .accesskey = m
datetime-formatting-legend = Datuma un laika formatēšana
language-selector-legend = Valoda
allow-hw-accel =
    .label = Ja pieejams, izmantot aparatūrisku paātrinājumu
    .accesskey = J
store-type-label =
    .value = Jaunu kontu vēstuļu krātuves veids:
    .accesskey = k
mbox-store-label =
    .label = Fails vienai mapei (mbox)
maildir-store-label =
    .label = Fails vienai vēstulei (maildir)
scrolling-legend = Ritināšana
autoscroll-label =
    .label = Lietot autoritināšanu
    .accesskey = r
smooth-scrolling-label =
    .label = Lietot plūdeno ritināšanu
    .accesskey = p
system-integration-legend = Sistēmas integrācija
always-check-default =
    .label = Startēšanas laikā vienmēr pārbaudīt vai { -brand-short-name } ir  noklusētais pasta klients
    .accesskey = S
check-default-button =
    .label = Pārbaudīt tagad…
    .accesskey = P
# Note: This is the search engine name for all the different platforms.
# Platforms that don't support it should be left blank.
search-engine-name =
    { PLATFORM() ->
        [macos] Spotlight
        [windows] Windows Search
       *[other] { "" }
    }
search-integration-label =
    .label = Ļaut { search-engine-name } meklēt vēstules
    .accesskey = m
config-editor-button =
    .label = Iestatījumu redaktors…
    .accesskey = I
return-receipts-description = Noteikt, kā { -brand-short-name } apstrādā saņemšanas apstiprinājumus
return-receipts-button =
    .label = Saņemšanas apliecinājums…
    .accesskey = S
update-app-legend = { -brand-short-name } atjaunojumi
# Variables:
#   $version (String): version of Thunderbird, e.g. 68.0.1
update-app-version = Versija { $version }
allow-description = Ļaut { -brand-short-name }
automatic-updates-label =
    .label = Automātiski uzstādīt atjaunojumus (ieteicams: uzlabota drošība)
    .accesskey = A
check-updates-label =
    .label = Pārbaudīt atjaunojumus, bet ļaut izvēlēties, vai tos uzstādīt
    .accesskey = r
update-history-button =
    .label = Parādīt atjaunojumu vēsturi
    .accesskey = v
use-service =
    .label = Atjaunojumu uzstādīšanai izmantot fona pakalpojumu
    .accesskey = f
cross-user-udpate-warning = Izmantojot šo { -brand-short-name } uzstādījumu, šis iestatījums tiks piemērots visiem Windows kontiem un { -brand-short-name } profiliem.
networking-legend = Savienojums
proxy-config-description = Iestatiet, kā { -brand-short-name } izveido savienojumu ar internetu
network-settings-button =
    .label = Iestatījumi...
    .accesskey = I
offline-legend = Nesaistē
offline-settings = Mainīt nesaistes iestatījumus
offline-settings-button =
    .label = Bezsaistē...
    .accesskey = B
diskspace-legend = Diska vieta
offline-compact-folder =
    .label = Kad saglabātas, sablīvēt visas mapes
    .accesskey = s
compact-folder-size =
    .value = Kopā MB

## Note: The entities use-cache-before and use-cache-after appear on a single
## line in preferences as follows:
## use-cache-before [ textbox for cache size in MB ] use-cache-after

use-cache-before =
    .value = Izmantot līdz
    .accesskey = l
use-cache-after = MB vietas kešatmiņai

##

smart-cache-label =
    .label = Ignorēt automātisko kešatmiņas pārvaldību
    .accesskey = I
clear-cache-button =
    .label = Notīrīt tagad
    .accesskey = N
fonts-legend = Fonti un krāsas
default-font-label =
    .value = Noklusētais fonts:
    .accesskey = N
default-size-label =
    .value = Izmērs:
    .accesskey = I
font-options-button =
    .label = Izvērsti…
    .accesskey = z
color-options-button =
    .label = Krāsas...
    .accesskey = K
display-width-legend = Vienkārša teksta vēstules
# Note : convert-emoticons-label 'Emoticons' are also known as 'Smileys', e.g. :-)
convert-emoticons-label =
    .label = Rādīt emodžus kā grafiku
    .accesskey = e
display-text-label = Rādot citētas vienkārša teksta vēstules:
style-label =
    .value = Stils:
    .accesskey = t
regular-style-item =
    .label = Parasts
bold-style-item =
    .label = Trekns
italic-style-item =
    .label = Slīps
bold-italic-style-item =
    .label = Trekns slīps
size-label =
    .value = Izmērs:
    .accesskey = z
regular-size-item =
    .label = Parasts
bigger-size-item =
    .label = Lielāks
smaller-size-item =
    .label = Mazāks
quoted-text-color =
    .label = Krāsa:
    .accesskey = K
save-to-label =
    .label = Saglabāt failus
    .accesskey = S
choose-folder-label =
    .label =
        { PLATFORM() ->
            [macos] Izvēlieties…
           *[other] Izvēlieties…
        }
    .accesskey =
        { PLATFORM() ->
            [macos] I
           *[other] I
        }
always-ask-label =
    .label = Vienmēr jautāt, kur glabāt failus
    .accesskey = V
display-tags-text = Birkas var izmantot, lai kārtotu vēstules un piešķirtu tām prioritātes.
new-tag-button =
    .label = Jauns…
    .accesskey = J
edit-tag-button =
    .label = Rediģēt...
    .accesskey = e
delete-tag-button =
    .label = Dzēst
    .accesskey = D
auto-mark-as-read =
    .label = Automātiski atzīmēt vēstules kā lasītas
    .accesskey = A
mark-read-no-delay =
    .label = Uzreiz parādot
    .accesskey = U

## Note: This will concatenate to "After displaying for [___] seconds",
## using (mark-read-delay) and a number (seconds-label).

mark-read-delay =
    .label = Pēc parādīšanas
    .accesskey = P
seconds-label = sekundes

##

open-msg-label =
    .value = Atvērt vēstules:
open-msg-tab =
    .label = Jaunā cilnē
    .accesskey = c
open-msg-window =
    .label = Jaunā logā
    .accesskey = l
open-msg-ex-window =
    .label = Esošā logā
    .accesskey = E
close-move-delete =
    .label = Aizveriet vēstules logu/cilni, to pārvietojot vai dzēšot
    .accesskey = A
display-name-label =
    .value = Rādāmvārds:
condensed-addresses-label =
    .label = Adrešu grāmatā rādīt tikai tikai personas rādāmvārdu
    .accesskey = r

## Compose Tab

forward-label =
    .value = Pārsūtīt vēstules:
    .accesskey = P
inline-label =
    .label = Iekļauti
as-attachment-label =
    .label = Kā pielikumu
extension-label =
    .label = Faila nosaukumam pievienot paplašinājumu
    .accesskey = p

## Note: This will concatenate to "Auto Save every [___] minutes",
## using (auto-save-label) and a number (auto-save-end).

auto-save-label =
    .label = Automātiski saglabāt katru
    .accesskey = A
auto-save-end = minūti

##

warn-on-send-accel-key =
    .label = Apstiprināt, ja vēstules sūtīšanai izmanto īsinājumtaustiņu
    .accesskey = A
spellcheck-label =
    .label = Pirms sūtīšanas pārbaudīt pareizrakstību
    .accesskey = P
spellcheck-inline-label =
    .label = Pareizrakstības pārbaude, rakstot
    .accesskey = r
language-popup-label =
    .value = Valoda:
    .accesskey = V
download-dictionaries-link = Lejuplādēt citas vārdnīcas
font-label =
    .value = Fonts:
    .accesskey = F
font-size-label =
    .value = Izmērs:
    .accesskey = I
default-colors-label =
    .label = Lietot lasītāja noklusētās krāsas
    .accesskey = n
font-color-label =
    .value = Teksta krāsa:
    .accesskey = T
bg-color-label =
    .value = Fona krāsa:
    .accesskey = F
restore-html-label =
    .label = Atjaunot sākotnējos
    .accesskey = A
default-format-label =
    .label = Noklusēti pamatteksta vietā izmantot rindkopas formātu
    .accesskey = p
autocomplete-description = Adresējot vēstules, meklēt atbilstošus ierakstus:
ab-label =
    .label = Vietējās adrešu grāmatās
    .accesskey = V
directories-label =
    .label = Kataloga serverī:
    .accesskey = K
directories-none-label =
    .none = Nekur
edit-directories-label =
    .label = Rediģēt mapes…
    .accesskey = R
email-picker-label =
    .label = Automātiski pievienot izejošās epasta adreses:
    .accesskey = A
default-directory-label =
    .value = Noklusētā sākotnējā mape adrešu grāmatas logā:
    .accesskey = N
default-last-label =
    .none = Pēdējoreiz lietotā mape
attachment-label =
    .label = Pārbaudīt, vai trūkst pielikumu
    .accesskey = P
attachment-options-label =
    .label = Atslēgvārdi…
    .accesskey = A
enable-cloud-share =
    .label = Piedāvāt kopīgot failus, kuru lielums pārsniedz
cloud-share-size =
    .value = MB
add-cloud-account =
    .label = Pievienot…
    .accesskey = P
    .defaultlabel = Pievienot…
remove-cloud-account =
    .label = Noņemt
    .accesskey = N
find-cloud-providers =
    .value = Meklēt citus sniedzējus…
cloud-account-description = Pievienot jaunu Filelink krātuves pakalpojumu

## Privacy Tab

mail-content = Pasta saturs
remote-content-label =
    .label = Ļaut attālo saturu vēstulēs
    .accesskey = a
exceptions-button =
    .label = Izņēmumi…
    .accesskey = I
remote-content-info =
    .value = Uzzināt vairāk par attālā satura privātuma lietām
web-content = Tīmekļa saturs
history-label =
    .label = Atcerēties apmeklētās vietnes un saites
    .accesskey = A
cookies-label =
    .label = Pieņemt sīkfailus no vietnēm
    .accesskey = P
third-party-label =
    .value = Pieņemt trešo pušu sīkfailus:
    .accesskey = t
third-party-always =
    .label = Vienmēr
third-party-never =
    .label = Nekad
third-party-visited =
    .label = No apmeklētajām
keep-label =
    .value = Glabāt līdz:
    .accesskey = G
keep-expire =
    .label = beidzas derīgums
keep-close =
    .label = Aizver { -brand-short-name }
keep-ask =
    .label = vienmēr jautāt
cookies-button =
    .label = Rādīt sīkfailus…
    .accesskey = R
do-not-track-label =
    .label = Sūtot signālu “Nesekot” norādīt vietnēm, ka nevēlaties, lai jūs izseko
    .accesskey = N
learn-button =
    .label = Uzzināt vairāk
dnt-learn-more-button =
    .value = Uzzināt vairāk
passwords-description = { -brand-short-name } var atcerēties paroles visiem jūsu kontiem.
passwords-button =
    .label = Saglabātās paroles…
    .accesskey = S
primary-password-description = Galvenā parole aizsargā visas jūsu paroles, bet sesijas laikā tā jāievada tikai vienreiz.
primary-password-label =
    .label = Lietot galveno paroli
    .accesskey = L
primary-password-button =
    .label = Mainīt galveno paroli…
    .accesskey = M
forms-primary-pw-fips-title = Šobrīd jūs esat FIPS režīmā. FIPS pieprasa netukšu galveno paroli.
forms-master-pw-fips-desc = Paroles maiņa neizdevās
junk-description = Iestatiet noklusētos drazas pasta iestatījumus. Noteikta konta drazas pasta iestatījumus var mainīt Konta iestatījumos.
junk-label =
    .label = Atzīmējot vēstuli kā drazu:
    .accesskey = A
junk-move-label =
    .label = Pārvietot tās uz konta "Draza" mapi
    .accesskey = P
junk-delete-label =
    .label = Dzēst tās
    .accesskey = D
junk-read-label =
    .label = Vēstules, kas atzīmētas kā draza, padarīt lasītas
    .accesskey = a
junk-log-label =
    .label = Ieslēgt adaptīvā drazas filtra žurnalēšanu
    .accesskey = I
junk-log-button =
    .label = Rādīt žurnālu
    .accesskey = R
reset-junk-button =
    .label = Atstatīt apmācības datus
    .accesskey = A
phishing-description = { -brand-short-name } var novērtēt vēstules par iespējamu krāpniecību, meklējot izplatītus maldināšanas paņēmienus.
phishing-label =
    .label = Teikt, ka vēstule izskatās krāpnieciska
    .accesskey = T
antivirus-description = { -brand-short-name } var atvieglot pretvīrusu programmu darbību, novērtējot, vai vēstules satur vīrusus, pirms tās saglabāt lokāli.
antivirus-label =
    .label = Ļaut pretvīrusu programmām ievietot karantīnā atsevišķas ienākošās vēstules
    .accesskey = p
certificate-description = Kad serveris pieprasa jūsu personīgo sertifikātu:
certificate-auto =
    .label = Izvēlēties automātiski
    .accesskey = I
certificate-ask =
    .label = Vienmēr jautāt
    .accesskey = V
ocsp-label =
    .label = Vaicāt OCSP atbildes serveriem, lai pārbaudītu esošo sertifikātu derīgumu
    .accesskey = a
certificate-button =
    .label = Pārvaldīt sertifikātus…
    .accesskey = P
security-devices-button =
    .label = Drošības ierīces…
    .accesskey = D

## Chat Tab

startup-label =
    .value = Palaižoties { -brand-short-name }:
    .accesskey = P
offline-label =
    .label = Saglabāt tērzēšanas kontus nesaistē
auto-connect-label =
    .label = Automātiski savienot tērzēšanas kontus

## Note: idle-label is displayed first, then there's a field where the user
## can enter a number, and itemTime is displayed at the end of the line.
## The translations of the idle-label and idle-time-label parts don't have
## to mean the exact same thing as in English; please try instead to
## translate the whole sentence.

idle-label =
    .label = Ļaujiet kontaktiem zināt, ka esat dīkstāvē
    .accesskey = d
idle-time-label = bezdarbības minūtēm

##

away-message-label =
    .label = un iestatīt statusu Prom ar šo statusa ziņojumu:
    .accesskey = u
send-typing-label =
    .label = Sarunās sūtīt rakstīšanas paziņojumu
    .accesskey = S
notification-label = Kad pienāk jums adresētas ziņas:
show-notification-label =
    .label = Rādīt paziņojumu:
    .accesskey = R
notification-all =
    .label = ar sūtītāja vārdu un ziņas priekšskatu
notification-name =
    .label = tikai ar sūtītāja vārdu
notification-empty =
    .label = bez informācijas
notification-type-label =
    .label =
        { PLATFORM() ->
            [macos] Animēt palodzes ikonu
           *[other] Animēt palodzes ikonu
        }
    .accesskey =
        { PLATFORM() ->
            [macos] A
           *[other] A
        }
chat-play-sound-label =
    .label = Atskaņot skaņu
    .accesskey = s
chat-play-button =
    .label = Atskaņot
    .accesskey = s
chat-system-sound-label =
    .label = Sistēmas noklusētā jaunas ziņas skaņa
    .accesskey = S
chat-custom-sound-label =
    .label = Izmantot sekojošu skaņas failu
    .accesskey = I
chat-browse-sound-button =
    .label = Pārlūkot...
    .accesskey = P
theme-label =
    .value = Tēma:
    .accesskey = T
style-bubbles =
    .label = Burbuļi
style-dark =
    .label = Tumša
style-paper =
    .label = Papīra lapas
style-simple =
    .label = Vienkārša
preview-label = Priekšskats:
no-preview-label = Priekšskats nav pieejams
no-preview-description = Šī tēma nav derīga vai pašlaik nav pieejama (atspējots papildinājums, drošais režīms, utt.).
chat-variant-label =
    .value = Variants:
    .accesskey = V

## Settings UI Search Results

search-results-header = Meklēšanas rezultāti
search-results-help-link = Vajadzīga palīdzība? Apmeklējiet <a data-l10n-name="url">{ -brand-short-name } atbalstu</a>!

## Sync Tab

