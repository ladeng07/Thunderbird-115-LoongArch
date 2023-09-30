# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

close-button =
    .aria-label = Slute
preferences-doc-title2 = Ynstellingen
category-list =
    .aria-label = Kategoryen
pane-general-title = Algemien
category-general =
    .tooltiptext = { pane-general-title }
pane-compose-title = Opstelle
category-compose =
    .tooltiptext = Opstelle
pane-privacy-title = Privacy en Befeiliging
category-privacy =
    .tooltiptext = Privacy en Befeiliging
pane-chat-title = Chat
category-chat =
    .tooltiptext = Chat
pane-calendar-title = Aginda
category-calendar =
    .tooltiptext = Aginda
pane-sync-title = Syngronisearje
category-sync =
    .tooltiptext = Syngronisearje
general-language-and-appearance-header = Taal en Foarmjouwing
general-incoming-mail-header = Ynkommende e-mailberjochten:
general-files-and-attachment-header = Bestannen en Bylagen
general-tags-header = Labels
general-reading-and-display-header = Lêze en werjefte
general-updates-header = Fernijingen
general-network-and-diskspace-header = Netwurk & Skiifromte
general-indexing-label = Yndeksearring
composition-category-header = Komposysje
composition-attachments-header = Bylagen
composition-spelling-title = Stavering
compose-html-style-title = HTML-styl
composition-addressing-header = Addressearring
privacy-main-header = Privacy
privacy-passwords-header = Wachtwurden
privacy-junk-header = Net-winske berjochten
collection-header = Gegevenssamling en gebrûk fan { -brand-short-name }
collection-description = Wy stribje dernei jo kar te bieden en allinnich te sammeljen wat wy nedich hawwe om { -brand-short-name } foar elkenien beskikber te meitsjen en te ferbetterjen. Wy freegje altyd tastimming eardat wy persoanlike gegevens ûntfange.
collection-privacy-notice = Privacyferklearring
collection-health-report-telemetry-disabled = Jo steane { -vendor-short-name } net langer ta technyske en ynteraksjegegevens fêst te lizzen. Alle eardere gegevens wurde binnen 30 dagen fuortsmiten.
collection-health-report-telemetry-disabled-link = Mear ynfo
collection-health-report =
    .label = { -brand-short-name } tastean om technyske en ynteraksjegegevens nei { -vendor-short-name } te ferstjoeren
    .accesskey = r
collection-health-report-link = Mear ynfo
# This message is displayed above disabled data sharing options in developer builds
# or builds with no Telemetry support available.
collection-health-report-disabled = Gegevensrapporten binne foar dizze build-konfiguraasje útskeakele
collection-backlogged-crash-reports =
    .label = { -brand-short-name } tastean om út jo namme jo efterstallige ûngelokrapporten te ferstjoeren
    .accesskey = j
collection-backlogged-crash-reports-link = Mear ynfo
privacy-security-header = Befeiliging
privacy-scam-detection-title = Scamdeteksje
privacy-anti-virus-title = Antifirus
privacy-certificates-title = Sertifikaten
chat-pane-header = Chat
chat-status-title = Steat
chat-notifications-title = Notifikaasjes
chat-pane-styling-header = Foarmjouwing
choose-messenger-language-description = Kies de taal dy’t brûkt wurdt foar de menu's, berjochten en meldingen fan { -brand-short-name }.
manage-messenger-languages-button =
    .label = Alternativen ynstelle…
    .accesskey = A
confirm-messenger-language-change-description = Start { -brand-short-name } opnij om de fernijing ta te passen
confirm-messenger-language-change-button = Tapasse en opnij starte
update-setting-write-failure-title = Flater by bewarjen fernijingsfoarkarren
# Variables:
#   $path (String) - Path to the configuration file
# The newlines between the main text and the line containing the path is
# intentional so the path is easier to identify.
update-setting-write-failure-message =
    { -brand-short-name } hat in flater oantroffen en hat dizze wiziging net bewarre. Merk op dat foar it ynstellen fan dizze fernijingsfoarkar skriuwrjochten foar ûndersteand bestân nedich binne. Jo of jo systeembehearder kin dizze flater oplosse troch de groep ‘Gebruikers’ folsleine tagong ta dit bestân te jaan.
    
    Koe net skriuwe nei bestân: { $path }
update-in-progress-title = Fernijing dwaande
update-in-progress-message = Wolle jo dat { -brand-short-name } trochgiet mei dizze fernijing?
update-in-progress-ok-button = &Ferwerpe
# Continue is the cancel button so pressing escape or using a platform standard
# method of closing the UI will not discard the update.
update-in-progress-cancel-button = &Trochgean
account-button = Accountynstellingen
open-addons-sidebar-button = Add-ons en tema’s

## OS Authentication dialog

# This message can be seen by trying to add a Primary Password.
primary-password-os-auth-dialog-message-win = Fier jo oanmeldgegevens foar Windows yn om in haadwachtwurd yn te stellen. Hjirtroch wurdt de befeiliging fan jo accounts beskerme.
# This message can be seen by trying to add a Primary Password.
# The macOS strings are preceded by the operating system with "Thunderbird is trying to "
# and includes subtitle of "Enter password for the user "xxx" to allow this." These
# notes are only valid for English. Please test in your locale.
primary-password-os-auth-dialog-message-macosx = in haadwachtwurd oanmeitsje
# Don't change this label.
master-password-os-auth-dialog-caption = { -brand-full-name }

## General Tab

focus-search-shortcut =
    .key = f
focus-search-shortcut-alt =
    .key = k
general-legend = { -brand-short-name }-startside
start-page-label =
    .label = Wannear’t { -brand-short-name } start, de startside yn it berjochtdiel toane
    .accesskey = W
location-label =
    .value = Lokaasje:
    .accesskey = L
restore-default-label =
    .label = Standertynstelling tebeksette
    .accesskey = S
default-search-engine = Standertsykmasine
add-web-search-engine =
    .label = Tafoegje…
    .accesskey = T
remove-search-engine =
    .label = Fuortsmite
    .accesskey = u
add-opensearch-provider-title = OpenSearch-provider tafoegje
add-opensearch-provider-text = Fier de URL yn fan de OpenSearch-provider dy’t jo tafoegje wolle. Brûk de direkte URL fan it OpenSearch-beskriuwingsbestân of in URL wêr’t it automatysk fûn wurde kin.
adding-opensearch-provider-failed-title = Tafoegjen fan OpenSearch-provider mislearre
# Variables:
# $url (String) - URL an OpenSearch provider was requested for.
adding-opensearch-provider-failed-text = Kin OpenSearch-provider foar { $url } net tafoegje.
minimize-to-tray-label =
    .label = Nei de systeembalke ferpleatse wannear { -brand-short-name } minimalisearre is
    .accesskey = m
new-message-arrival = As nije berjochten oankomme:
mail-play-sound-label =
    .label =
        { PLATFORM() ->
            [macos] Spylje it folgjende lûdsbestân:
           *[other] In lûd ôfspylje
        }
    .accesskey =
        { PLATFORM() ->
            [macos] d
           *[other] l
        }
mail-play-button =
    .label = Ofspylje
    .accesskey = f
change-dock-icon = Wizigje eigenskippen fan it programmasymboal
app-icon-options =
    .label = Programmasymboalopsjes…
    .accesskey = p
notification-settings2 = Warskôgingen en it standert lûd kinne útskeakele wurde fia it paniel Berjochtjouwing yn Systeemynstellingen.
animated-alert-label =
    .label = In melding toane
    .accesskey = t
customize-alert-label =
    .label = Oanpasse…
    .accesskey = O
biff-use-system-alert =
    .label = De systeemmelding brûke
tray-icon-unread-label =
    .label = In systeemfekpiktogram foar net lêzen berjochten toane
    .accesskey = t
tray-icon-unread-description = Oanrekemmandearre by gebrûk fan lytse taakbalkeknoppen
mail-system-sound-label =
    .label = Standert systeemlûd foar nije e-mail
    .accesskey = y
mail-custom-sound-label =
    .label = It folgjende lûdsbestân brûke
    .accesskey = l
mail-browse-sound-button =
    .label = Blêdzje…
    .accesskey = B
enable-gloda-search-label =
    .label = Globaal sykje en yndeksearder ynskeakelje
    .accesskey = y
datetime-formatting-legend = Datum- en tiidnotaasje
language-selector-legend = Taal
allow-hw-accel =
    .label = Hardwarefersnelling brûke wannear beskikber
    .accesskey = f
store-type-label =
    .value = Type berjochtenopslach foar nije accounts:
    .accesskey = b
mbox-store-label =
    .label = Ien bestân per map (mbox)
maildir-store-label =
    .label = Ien bestân per berjocht (maildir)
scrolling-legend = Skowe
autoscroll-label =
    .label = Automatysk skowe brûke
    .accesskey = m
smooth-scrolling-label =
    .label = Floeiend skowe brûke
    .accesskey = e
browsing-gtk-use-non-overlay-scrollbars =
    .label = Skowbalken altyd toane
    .accesskey = k
window-layout-legend = Finsteropmaak
draw-in-titlebar-label =
    .label = Titelbalke systeemfinster ferstopje
    .accesskey = f
auto-hide-tabbar-label =
    .label = Ljepblêdenbalke automatysk ferstopje
    .accesskey = u
auto-hide-tabbar-description = De ljepblêdenbalke ferstopje as mar ien ljepblêd iepene is
system-integration-legend = Systeemyntegraasje
always-check-default =
    .label = By it opstarten altyd neigean oft { -brand-short-name } de standert e-mailclient is
    .accesskey = c
check-default-button =
    .label = No kontrolearje…
    .accesskey = N
# Note: This is the search engine name for all the different platforms.
# Platforms that don't support it should be left blank.
search-engine-name =
    { PLATFORM() ->
        [macos] Spotlight
        [windows] Windows Zoeken
       *[other] { "" }
    }
search-integration-label =
    .label = Lit { search-engine-name } troch berjochten sykje
    .accesskey = S
config-editor-button =
    .label = Konfiguraasjebewurker…
    .accesskey = f
return-receipts-description = Bepale hoe’t { -brand-short-name } omgiet mei lêsbefêstigingen
return-receipts-button =
    .label = Lêsbefêstigingen…
    .accesskey = L
update-app-legend = { -brand-short-name }-fernijingen
# Variables:
#   $version (String): version of Thunderbird, e.g. 68.0.1
update-app-version = Ferzje { $version }
allow-description = { -brand-short-name } tastean om
automatic-updates-label =
    .label = Fernijingen automatysk ynstallearje (oanrekommandearre: ferbettere feilichheid)
    .accesskey = a
check-updates-label =
    .label = Kontrolearje op fernijngen, mar lit my kieze oft ik se ynstallearje wol
    .accesskey = K
update-history-button =
    .label = Fernijingsskiednis toane
    .accesskey = s
use-service =
    .label = In eftergrûntsjinst brûke om fernijingen te ynstallearjen
    .accesskey = a
cross-user-udpate-warning = Dizze ynstelling is fan tapassing op alle Windows-accounts en { -brand-short-name }-profilen dy’t dizze ynstallaasje fan { -brand-short-name } brûke.
networking-legend = Ferbining
proxy-config-description = Konfigurearje hoe’t { -brand-short-name } ferbining makket mei it ynternet
network-settings-button =
    .label = Ynstellingen…
    .accesskey = Y
offline-legend = Sûnder ferbining
offline-settings = Sûnder ferbining-ynstellingen konfigurearje
offline-settings-button =
    .label = Sûnder ferbining…
    .accesskey = S
diskspace-legend = Skiifromte
offline-compact-folder =
    .label = Mappen komprimearje as it mear besparret as
    .accesskey = M
offline-compact-folder-automatically =
    .label = Altyd freegje foar komprimearjen
    .accesskey = o
compact-folder-size =
    .value = MB yn totaal

## Note: The entities use-cache-before and use-cache-after appear on a single
## line in preferences as follows:
## use-cache-before [ textbox for cache size in MB ] use-cache-after

use-cache-before =
    .value = Oant
    .accesskey = O
use-cache-after = MB skiifromte brûke foar de buffer

##

smart-cache-label =
    .label = Automatysk bufferbehear net brûke
    .accesskey = r
clear-cache-button =
    .label = No wiskje
    .accesskey = N
clear-cache-shutdown-label =
    .label = Buffer wiskje by ôfsluten
    .accesskey = w
fonts-legend = Lettertypen & kleuren
default-font-label =
    .value = Standertlettertype:
    .accesskey = S
default-size-label =
    .value = Grutte:
    .accesskey = G
font-options-button =
    .label = Avansearre…
    .accesskey = s
color-options-button =
    .label = Kleuren…
    .accesskey = K
display-width-legend = Platte-tekstberjochten
# Note : convert-emoticons-label 'Emoticons' are also known as 'Smileys', e.g. :-)
convert-emoticons-label =
    .label = Glimkes werjaan as ôfbylding
    .accesskey = m
display-text-label = Sitearre tekst yn platte-tekstberjochten werjaan as:
style-label =
    .value = Styl:
    .accesskey = S
regular-style-item =
    .label = Normaal
bold-style-item =
    .label = Fet
italic-style-item =
    .label = Skreef
bold-italic-style-item =
    .label = Fet en skreef
size-label =
    .value = Grutte:
    .accesskey = G
regular-size-item =
    .label = Normaal
bigger-size-item =
    .label = Grutter
smaller-size-item =
    .label = Lytser
quoted-text-color =
    .label = Kleur:
    .accesskey = K
search-handler-table =
    .placeholder = Ynhâldtypen en aksjes filterje
type-column-header = Ynhâldstype
action-column-header = Aksje
save-to-label =
    .label = Bewarje bestannen yn
    .accesskey = w
choose-folder-label =
    .label =
        { PLATFORM() ->
            [macos] Kieze…
           *[other] Blêdzje…
        }
    .accesskey =
        { PLATFORM() ->
            [macos] K
           *[other] B
        }
always-ask-label =
    .label = My altyd freegje wêr’t bestannen bewarre wurde moatte
    .accesskey = M
display-tags-text = Labels kinne brûkt wurde foar it kategorisearjen fan jo berjochten.
new-tag-button =
    .label = Nij…
    .accesskey = N
edit-tag-button =
    .label = Bewurkje…
    .accesskey = B
delete-tag-button =
    .label = Fuortsmite
    .accesskey = s
auto-mark-as-read =
    .label = Berjochten automatysk as lêzen markearje
    .accesskey = A
mark-read-no-delay =
    .label = Direkt op it skerm
    .accesskey = O
view-attachments-inline =
    .label = Bylagen ynline toane
    .accesskey = t

## Note: This will concatenate to "After displaying for [___] seconds",
## using (mark-read-delay) and a number (seconds-label).

mark-read-delay =
    .label = Nei it toanen foar
    .accesskey = N
seconds-label = sekonden

##

open-msg-label =
    .value = Nije berjochten iepenje yn:
open-msg-tab =
    .label = in nij ljepblêd
    .accesskey = l
open-msg-window =
    .label = In nij berjochtefinster
    .accesskey = i
open-msg-ex-window =
    .label = In besteand berjochtefinster
    .accesskey = a
close-move-delete =
    .label = Slút berjochtskerm/ljepblêd nei ferpleatsen of fuortsmiten
    .accesskey = S
display-name-label =
    .value = Werjeftenamme:
condensed-addresses-label =
    .label = Fan minsken yn myn adresboek allinnich werjeftenamme toane
    .accesskey = m

## Compose Tab

forward-label =
    .value = Berjochten trochstjoere:
    .accesskey = t
inline-label =
    .label = Yn it berjocht
as-attachment-label =
    .label = As bylage
extension-label =
    .label = Ekstinsje oan bestânsnamme tafoegje
    .accesskey = t

## Note: This will concatenate to "Auto Save every [___] minutes",
## using (auto-save-label) and a number (auto-save-end).

auto-save-label =
    .label = Elke
    .accesskey = E
auto-save-end = minuten automatysk bewarje

##

warn-on-send-accel-key =
    .label = Befêstiging freegje by gebrûk fan fluchtoets om berjochten te ferstjoeren
    .accesskey = B
add-link-previews =
    .label = Keppelingsfoarbylden tafoegje by plakken fan URL’s
    .accesskey = i
spellcheck-label =
    .label = Stavering kontrolearje foar it ferstjoeren
    .accesskey = k
spellcheck-inline-label =
    .label = Stavering kontrolearje wylst it typen
    .accesskey = n
language-popup-label =
    .value = Taal:
    .accesskey = T
download-dictionaries-link = Mear wurdboeken downloade
font-label =
    .value = Lettertype:
    .accesskey = L
font-size-label =
    .value = Grutte:
    .accesskey = t
default-colors-label =
    .label = Brûk de standert kleuren fan lêzers
    .accesskey = d
font-color-label =
    .value = Tekstkleur:
    .accesskey = k
bg-color-label =
    .value = Eftergrûnkleur:
    .accesskey = E
restore-html-label =
    .label = Standertwearden tebeksette
    .accesskey = S
default-format-label =
    .label = Standert alinea-opmaak brûke yn stee fan kerntekst
    .accesskey = o
compose-send-format-title = Ferstjoeropmaak
compose-send-automatic-option =
    .label = Automatysk
compose-send-automatic-description = As der gjin opmaak yn it berjocht brûkt wurdt, platte tekst ferstjoere. Oars HTML ferstjoere mei in tebekfal nei platte tekst.
compose-send-both-option =
    .label = Sawol HTML as platte tekst
compose-send-both-description = De e-mailtapassing fan de ûntfanger bepaalt hokker ferzje toand wurdt.
compose-send-html-option =
    .label = Allinnich HTML
compose-send-html-description = Guon ûntfangers kinne it berjocht mooglik net lêze sûnder tebekfal nei platte tekst.
compose-send-plain-option =
    .label = Allinnich platte tekst
compose-send-plain-description = Guon styleleminten wurde omset nei platte tekst as alternatyf, wylst oare opstelfunksjes útskeakele wurde.
autocomplete-description = By it adressearjen fan berjochten nei oerienkomsten sykje yn:
ab-label =
    .label = Lokale adresboeken
    .accesskey = r
directories-label =
    .label = Directoryserver:
    .accesskey = y
directories-none-label =
    .none = Gjin
edit-directories-label =
    .label = Directory's bewurkje…
    .accesskey = w
email-picker-label =
    .label = E-mailadressen fan útgeande berjochten automatysk tafoegje oan myn:
    .accesskey = t
default-directory-label =
    .value = Standert opstartmap yn it adresboekfinster:
    .accesskey = S
default-last-label =
    .none = Lêst brûkte map
attachment-label =
    .label = Kontrolearje op fergetten bylagen
    .accesskey = f
attachment-options-label =
    .label = Kaaiwurden…
    .accesskey = K
enable-cloud-share =
    .label = Biedt dielen oan by bestannen grutter as
cloud-share-size =
    .value = MB
add-cloud-account =
    .label = Tafoegje…
    .accesskey = T
    .defaultlabel = Tafoegje…
remove-cloud-account =
    .label = Fuortsmite
    .accesskey = F
find-cloud-providers =
    .value = Sykje mear providers…
cloud-account-description = In nije Filelink bewartsjinst tafoegje

## Privacy Tab

mail-content = E-mailynhâld
remote-content-label =
    .label = Ynbedde ynhâld tastean yn berjochten
    .accesskey = Y
exceptions-button =
    .label = Utsûnderingen…
    .accesskey = U
remote-content-info =
    .value = Mear ynfo oer de privacysaken of ynbedde ynhâld
web-content = Webynhâld
history-label =
    .label = Unthâld websites en keppelings dy’t ik besocht haw
    .accesskey = w
cookies-label =
    .label = Akseptearje cookies fan websites
    .accesskey = A
third-party-label =
    .value = Akseptearje tredde-party cookies:
    .accesskey = c
third-party-always =
    .label = Altyd
third-party-never =
    .label = Nea
third-party-visited =
    .label = Fan besochte
keep-label =
    .value = Bewarje oant:
    .accesskey = B
keep-expire =
    .label = se ferrinne
keep-close =
    .label = Ik { -brand-short-name } ôfslut
keep-ask =
    .label = freegje my elke kear wer
cookies-button =
    .label = Cookies toane…
    .accesskey = T
do-not-track-label =
    .label = Websites in ‘Net folgje’-sinjaal stjoere om litte te witten dat jo net folge wurde wol
    .accesskey = n
learn-button =
    .label = Mear ynfo
dnt-learn-more-button =
    .value = Mear ynfo
passwords-description = { -brand-short-name } kin wachtwurdynformaasje foar al jo accounts ûnthâlde, sadat jo net hieltyd jo oanmeldgegevens hoege yn te fieren.
passwords-button =
    .label = Bewarre wachtwurden…
    .accesskey = B
primary-password-description = In haadwachtwurd befeiliget al jo wachtwurden, mar jo moatte it elke sesje ien kear ynfiere.
primary-password-label =
    .label = In haadwachtwurd brûke
    .accesskey = h
primary-password-button =
    .label = Haadwachtwurd wizigje…
    .accesskey = w
forms-primary-pw-fips-title = Jo binne no yn FIPS-modus. FIPS fereasket dat it haadwachtwurd net leech is.
forms-master-pw-fips-desc = Wachtwurdwiziging mislearre
junk-description = Stel jo standertynstellingen foar net-winske-berjochtedeteksje yn. Accountspesifike ynstellingen kinne konfigurearre wurde yn Accountynstellingen.
junk-label =
    .label = Wannear ik berjochten markearje as net-winske:
    .accesskey = W
junk-move-label =
    .label = se ferpleatse nei de map "Net-winske" fan de account
    .accesskey = u
junk-delete-label =
    .label = se fuortsmite
    .accesskey = t
junk-read-label =
    .label = Berjochten dy’t detektearre binne as net-winske, markearje as lêzen
    .accesskey = k
junk-log-label =
    .label = Selslearende net-winskeberjochtenlochboek aktivearje
    .accesskey = a
junk-log-button =
    .label = Lochboek toane
    .accesskey = L
reset-junk-button =
    .label = Trainingsgegevens opnij inisjalisearje
    .accesskey = r
phishing-description = { -brand-short-name } kin berjochten analysearje op fertochte e-mailscams troch te sjen nei faakfoarkommende techniken dy’t brûkt wurde om jo te mislieden.
phishing-label =
    .label = My fertelle oft it lêzen berjocht in fertochte e-mailscam is
    .accesskey = e
antivirus-description = { -brand-short-name } kin it foar antifirusprogramma maklik meitsje om ynkommende e-mailberjochten op firussen te kontrolearjen foardat se lokaal bewarre wurde.
antivirus-label =
    .label = Antifirusprogramma’s tastean om yndividuele ynkommende berjochten yn karantêne te pleatsen
    .accesskey = u
certificate-description = As in server freget om myn persoanlike sertifikaat:
certificate-auto =
    .label = Selektearje automatysk ien
    .accesskey = m
certificate-ask =
    .label = My altyd freegje
    .accesskey = a
ocsp-label =
    .label = OCSP-responderservers freegje om de aktuele faliditeit fan sertifikaten te befêstigjen
    .accesskey = F
certificate-button =
    .label = Sertifikaten beheare…
    .accesskey = b
security-devices-button =
    .label = Befeiligingsapparaten…
    .accesskey = a
email-e2ee-header = E-mail end-to-end-fersifering
account-settings = Accountynstellingen
email-e2ee-enable-info = E-mailaccounts en identiteiten foar end-to-end-fersifering yn accountynstellingen ynstelle.
email-e2ee-automatism = Automatysk gebrûk fan fersifering
email-e2ee-automatism-pre =
    { -brand-short-name } kin helpe troch fersifering automatysk yn of út te skeakeljen wylst it opstellen fan in e-mailberjocht.
    Automatysk ynskeakelje/útskeakelje is basearre op de beskikberheid fan jildige en akseptearre kaaien of sertifikaten fan ûntfangers.
email-e2ee-auto-on =
    .label = Skeakelje fersifering wannear mooglik automatysk yn
email-e2ee-auto-off =
    .label = Fersifering automatysk útskeakelje wannear ûntfangers wizigje en fersifering net mear mooglik is
email-e2ee-auto-off-notify =
    .label = Toan in melding wannear fersifering automatysk útskeakele wurdt
email-e2ee-automatism-post =
    Automatyske beslissingen kinne opheven wurde troch fersifering hânmjittich yn of út te skeakeljen by it opstellen fan in berjocht.
    Opmerking: fersifering is altyd automatysk ynskeakele by it beäntwurdzjen fan in fersifere berjocht.

## Chat Tab

startup-label =
    .value = As { -brand-short-name } start:
    .accesskey = s
offline-label =
    .label = De accountbehearder iepenje
auto-connect-label =
    .label = Myn accounts automatysk ferbine

## Note: idle-label is displayed first, then there's a field where the user
## can enter a number, and itemTime is displayed at the end of the line.
## The translations of the idle-label and idle-time-label parts don't have
## to mean the exact same thing as in English; please try instead to
## translate the whole sentence.

idle-label =
    .label = Myn kontakten nei
    .accesskey = k
idle-time-label = minuten ynaktiviteit litte witte dat ik net aktyf bin

##

away-message-label =
    .label = en myn steat op Ofwêzich ynstelle mei dit steatberjocht:
    .accesskey = O
send-typing-label =
    .label = Typenotifikaasjes ferstjoere yn konversaasjes
    .accesskey = T
notification-label = As berjochten foar jo oankomme:
show-notification-label =
    .label = In melding toane:
    .accesskey = m
notification-all =
    .label = mei namme fan ôfstjoerder en berjochtfoarbyld
notification-name =
    .label = allinnich mei namme fan ôfstjoerder
notification-empty =
    .label = sûnder ynfo
notification-type-label =
    .label =
        { PLATFORM() ->
            [macos] It programmasymboal beweegje
           *[other] It taakbalke-item knipperje litte
        }
    .accesskey =
        { PLATFORM() ->
            [macos] o
           *[other] I
        }
chat-play-sound-label =
    .label = Spylje in lûd
    .accesskey = d
chat-play-button =
    .label = Spylje
    .accesskey = S
chat-system-sound-label =
    .label = Standert systeemlûd foar nije e-mail
    .accesskey = n
chat-custom-sound-label =
    .label = Brûk it folgjende lûdsbestân
    .accesskey = l
chat-browse-sound-button =
    .label = Blêdzje…
    .accesskey = B
theme-label =
    .value = Tema:
    .accesskey = T
style-mail =
    .label = { -brand-short-name }
style-bubbles =
    .label = Bubbels
style-dark =
    .label = Donker
style-paper =
    .label = Papier
style-simple =
    .label = Simpel
preview-label = Foarbyld:
no-preview-label = Gjin foarbyld beskikber
no-preview-description = Dit tema is net falide of is op dit stuit net beskikber (útskeakele add-on, feilige modus, …).
chat-variant-label =
    .value = Fariant:
    .accesskey = F
# This is used to determine the width of the search field in about:preferences,
# in order to make the entire placeholder string visible
#
# Please keep the placeholder string short to avoid truncation.
#
# Notice: The value of the `.style` attribute is a CSS string, and the `width`
# is the name of the CSS property. It is intended only to adjust the element's width.
# Do not translate.
search-preferences-input2 =
    .style = width: 15.4em
    .placeholder = Sykje yn ynstellingen

## Settings UI Search Results

search-results-header = Sykresultaten
# `<span data-l10n-name="query"></span>` will be replaced by the search term.
search-results-empty-message2 =
    { PLATFORM() ->
        [windows] Sorry! Der binne gjin resultaten yn Opsjes foar ‘<span data-l10n-name="query"></span>’.
       *[other] Sorry! Der binne gjin resultaten yn Ynstellingen foar ‘<span data-l10n-name="query"></span>’.
    }
search-results-help-link = Help nedich? Besykje <a data-l10n-name="url">{ -brand-short-name }-stipe</a>

## Sync Tab

sync-signedout-caption = Nim jo web mei jo mei
sync-signedout-description = Syngronisearje jo accounts, adresboeken, aginda’s, add-ons en ynstellingen op al jo apparaten.
# Note: "Sync" represents the Firefox Sync product so it shouldn't be translated.
sync-signedout-account-signin-btn = Oanmelde om te syngronisearjen…
sync-pane-header = Syngronisaasje
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-pane-email-not-verified = ‘{ $userEmail }’ is net ferifiearre.
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-signedin-login-failure = Meld jo oan om opnij te ferbinen mei ‘{ $userEmail }’
sync-pane-resend-verification = Ferifikaasje opnij ferstjoere
sync-pane-sign-in = Oanmelde
sync-pane-remove-account = Account fuortsmite
sync-pane-edit-photo =
    .title = Profylôfbylding wizigje
sync-pane-manage-account = Account beheare
sync-pane-sign-out = Ofmelde…
sync-pane-device-name-title = Apparaatnamme
sync-pane-change-device-name = Apparaatnamme wizigje
sync-pane-cancel = Annulearje
sync-pane-save = Bewarje
sync-pane-show-synced-header-on = Syngronisearjen OAN
sync-pane-show-synced-header-off = Syngronisearjen ÚT
sync-pane-sync-now = No syngronisearje
sync-panel-sync-now-syncing = Syngronisearje…
show-synced-list-heading = Jo syngronisearje op dit stuit dizze ûnderdielen:
show-synced-learn-more = Mear ynfo…
show-synced-item-account = E-mailaccounts
show-synced-item-address = Adresboeken
show-synced-item-calendar = Aginda's
show-synced-item-identity = Identiteiten
show-synced-item-passwords = Wachtwurden
show-synced-change = Wizigje…
synced-acount-item-server-config = Serverconfiguraasje
synced-acount-item-filters = Filters
synced-acount-item-keys = OpenPGP - S/MIME
sync-disconnected-text = Syngronisearje jo e-mailaccounts, adresboeken, aginda’s en identiteiten op al jo apparaten.
sync-disconnected-turn-on-sync = Syngronisaasje ynskeakelje…
