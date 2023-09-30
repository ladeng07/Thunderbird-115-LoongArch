# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

close-button =
    .aria-label = Cau
preferences-doc-title2 = Gosodiadau
category-list =
    .aria-label = Categorïau
pane-general-title = Cyffredinol
category-general =
    .tooltiptext = { pane-general-title }
pane-compose-title = Ysgrifennu
category-compose =
    .tooltiptext = Ysgrifennu
pane-privacy-title = Preifatrwydd a Diogelwch
category-privacy =
    .tooltiptext = Preifatrwydd a Diogelwch
pane-chat-title = Sgwrsio
category-chat =
    .tooltiptext = Sgwrsio
pane-calendar-title = Calendr
category-calendar =
    .tooltiptext = Calendr
pane-sync-title = Cydweddu
category-sync =
    .tooltiptext = Cydweddu
general-language-and-appearance-header = Iaith a Gwedd
general-incoming-mail-header = Derbyn E-byst
general-files-and-attachment-header = Ffeiliau ac Atodiadau
general-tags-header = Tagiau
general-reading-and-display-header = Darllen a Dangos
general-updates-header = Diweddariadau
general-network-and-diskspace-header = Rhwydwaith a Lle ar Ddisg
general-indexing-label = Mynegeio
composition-category-header = Ysgrifennu
composition-attachments-header = Atodiadau
composition-spelling-title = Sillafu
compose-html-style-title = Arddull HTML
composition-addressing-header = Cyfeirio
privacy-main-header = Preifatrwydd
privacy-passwords-header = Cyfrineiriau
privacy-junk-header = Sbam
collection-header = Casglu a Defnyddio Data { -brand-short-name }
collection-description = Rydym yn ceisio darparu dewisiadau i chi a chasglu dim ond beth sydd ei angen arnom i ddarparu a gwella { -brand-short-name } ar gyfer pawb. Rydym yn gofyn caniatâd bob tro cyn derbyn manylion personol.
collection-privacy-notice = Hysbysiad Preifatrwydd
collection-health-report-telemetry-disabled = Nid ydych bellach yn caniatáu i { -vendor-short-name } ddal data technegol a rhyngweithiol. Bydd holl ddata'r gorffennol yn cael ei ddileu cyn pen 30 diwrnod.
collection-health-report-telemetry-disabled-link = Dysgu rhagor
collection-health-report =
    .label = Caniatáu i { -brand-short-name } anfon data technegol a rhyngweithio i { -vendor-short-name }
    .accesskey = C
collection-health-report-link = Dysgu rhagor
# This message is displayed above disabled data sharing options in developer builds
# or builds with no Telemetry support available.
collection-health-report-disabled = Mae adrodd ar ddata wedi ei analluogi ar gyfer ffurfweddiad yr adeiledd hwn
collection-backlogged-crash-reports =
    .label = Caniatáu i { -brand-short-name } i anfon adroddiadau chwalu wedi eu cadw ar eich rhan
    .accesskey = f
collection-backlogged-crash-reports-link = Dysgu rhagor
privacy-security-header = Diogelwch
privacy-scam-detection-title = Canfod Twyll
privacy-anti-virus-title = Gwrth Firws
privacy-certificates-title = Tystysgrifau
chat-pane-header = Sgwrsio
chat-status-title = Statws
chat-notifications-title = Hysbysiadau
chat-pane-styling-header = Steilio
choose-messenger-language-description = Dewis yr ieithoedd sy'n cael ei defnyddio i ddangos dewislenni, negeseuon, a hysbysiadau gan { -brand-short-name }
manage-messenger-languages-button =
    .label = Gosod Rhai Eraill...
    .accesskey = G
confirm-messenger-language-change-description = Ailgychwyn { -brand-short-name } i osod y newidiadau hyn
confirm-messenger-language-change-button = Gosod ac Ailgychwyn
update-setting-write-failure-title = Gwall wrth gadw dewisiadau Diweddaru
# Variables:
#   $path (String) - Path to the configuration file
# The newlines between the main text and the line containing the path is
# intentional so the path is easier to identify.
update-setting-write-failure-message =
    Bu gwall ar { -brand-short-name } ac nid yw wedi cadw'r newid hwn. Noder bod gosod caniatâd ar gyfer y diweddariad hwn yn gofyn am ganiatâd i ysgrifennu at y ffeil isod. Efallai y byddwch chi neu weinyddwr system yn gallu datrys y gwall trwy roi rheolaeth lawn i'r ffeil hon i'r grŵp Defnyddwyr.
    
    Doedd dim modd ysgrifennu i ffeil: { $path }
update-in-progress-title = Diweddariad ar y Gweill
update-in-progress-message = Ydych chi eisiau i { -brand-short-name } barhau gyda'r diweddariad hwn?
update-in-progress-ok-button = &Dileu
# Continue is the cancel button so pressing escape or using a platform standard
# method of closing the UI will not discard the update.
update-in-progress-cancel-button = &Parhau
account-button = Gosodiadau Cyfrif
open-addons-sidebar-button = Ychwanegion a Themâu

## OS Authentication dialog

# This message can be seen by trying to add a Primary Password.
primary-password-os-auth-dialog-message-win = I greu Prif Gyfrinair, nodwch fanylion eich mewngofnodi Windows. Mae hyn yn helpu i ddiogelu eich cyfrifon.
# This message can be seen by trying to add a Primary Password.
# The macOS strings are preceded by the operating system with "Thunderbird is trying to "
# and includes subtitle of "Enter password for the user "xxx" to allow this." These
# notes are only valid for English. Please test in your locale.
primary-password-os-auth-dialog-message-macosx = creu Prif Gyfrinair
# Don't change this label.
master-password-os-auth-dialog-caption = { -brand-full-name }

## General Tab

focus-search-shortcut =
    .key = f
focus-search-shortcut-alt =
    .key = k
general-legend = Tudalen Cychwyn { -brand-short-name }
start-page-label =
    .label = Pan fydd { -brand-short-name } yn cychwyn, dangos y Dudalen Cychwyn yn y maes neges
    .accesskey = P
location-label =
    .value = Lleoliad:
    .accesskey = o
restore-default-label =
    .label = Adfer y Rhagosodiad
    .accesskey = R
default-search-engine = Peiriant Chwilio Rhagosodedig
add-web-search-engine =
    .label = Ychwanegu…
    .accesskey = Y
remove-search-engine =
    .label = Tynnu
    .accesskey = T
add-opensearch-provider-title = Ychwanegu Darparwr OpenSearch
add-opensearch-provider-text = Rhowch URL y darparwr OpenSearch i'w ychwanegu. Naill ai defnyddiwch URL uniongyrchol y ffeil OpenSearch Description, neu URL lle mae modd ei ddarganfod yn awtomatig.
adding-opensearch-provider-failed-title = Methodd Ychwanegu Darparwr OpenSearch
# Variables:
# $url (String) - URL an OpenSearch provider was requested for.
adding-opensearch-provider-failed-text = Nid oedd modd ychwanegu OpenSearch Provider ar gyfer { $url }.
minimize-to-tray-label =
    .label = Pan fydd { -brand-short-name } wedi ei leihau, ei symud i'r dror
    .accesskey = l
new-message-arrival = Pan fydd neges newydd yn cyrraedd:
mail-play-sound-label =
    .label =
        { PLATFORM() ->
            [macos] Chwarae'r ffeil sain ganlynol:
           *[other] Canu nodyn
        }
    .accesskey =
        { PLATFORM() ->
            [macos] C
           *[other] n
        }
mail-play-button =
    .label = Chwarae
    .accesskey = h
change-dock-icon = Newid dewisiadau eicon yr ap
app-icon-options =
    .label = Dewisiadau Eicon Ap…
    .accesskey = E
notification-settings2 = Mae modd analluogi rhybuddion a'r sain rhagosodedig ar baen Hysbysu'r Dewisiadau System.
animated-alert-label =
    .label = Dangos rhybudd
    .accesskey = D
customize-alert-label =
    .label = Cyfaddasu…
    .accesskey = C
biff-use-system-alert =
    .label = Defnyddio hysbysiadau'r system
tray-icon-unread-label =
    .label = Dangos eicon hambwrdd ar gyfer negeseuon heb eu darllen
    .accesskey = h
tray-icon-unread-description = Argymhellir wrth ddefnyddio botymau bar tasgau bach
mail-system-sound-label =
    .label = Sain rhagosodedig y system ar gyfer e-bost newydd
    .accesskey = S
mail-custom-sound-label =
    .label = Defnyddio'r ffeil sain ganlynol
    .accesskey = D
mail-browse-sound-button =
    .label = Pori…
    .accesskey = P
enable-gloda-search-label =
    .label = Galluogi Chwilio a Mynegeio Eang
    .accesskey = G
datetime-formatting-legend = Fformatio Dyddiad ac Amser
language-selector-legend = Iaith
allow-hw-accel =
    .label = Defnyddio cyflymu caledwedd pan fydd ar gael
    .accesskey = y
store-type-label =
    .value = Math o Storio Negeseuon ar gyfer cyfrifon newydd:
    .accesskey = M
mbox-store-label =
    .label = Ffeil i'r ffolder (mbox)
maildir-store-label =
    .label = Ffeil y neges (maildir)
scrolling-legend = Sgrolio
autoscroll-label =
    .label = Defnyddio awto sgrolio
    .accesskey = a
smooth-scrolling-label =
    .label = Defnyddio sgrolio llyfn
    .accesskey = l
browsing-gtk-use-non-overlay-scrollbars =
    .label = Dango bariau sgrolio bob tro
    .accesskey = D
window-layout-legend = Cynllun Ffenestr
draw-in-titlebar-label =
    .label = Cuddio bar teitl ffenestr y system
    .accesskey = C
auto-hide-tabbar-label =
    .label = Awtoguddio bar y tab
    .accesskey = A
auto-hide-tabbar-description = Cuddio'r bar tab pan mai dim ond un tab sydd ar agor
system-integration-legend = Integreiddio System
always-check-default =
    .label = Gwirio bob tro os { -brand-short-name } yw'r rhaglen e-bost rhagosodedig wrth gychwyn
    .accesskey = G
check-default-button =
    .label = Gwiriwch Nawr…
    .accesskey = N
# Note: This is the search engine name for all the different platforms.
# Platforms that don't support it should be left blank.
search-engine-name =
    { PLATFORM() ->
        [macos] Sbotolau
        [windows] Chwilio Ffenestri
       *[other] { "" }
    }
search-integration-label =
    .label = Caniatáu i { search-engine-name } chwilio drwy'r negeseuon
    .accesskey = C
config-editor-button =
    .label = Golygydd Ffurfweddu…
    .accesskey = F
return-receipts-description = Pennu sut mae { -brand-short-name } yn trin derbynebau
return-receipts-button =
    .label = Derbynebau Dychwelyd…
    .accesskey = D
update-app-legend = Diweddariadau { -brand-short-name }
# Variables:
#   $version (String): version of Thunderbird, e.g. 68.0.1
update-app-version = Fersiwn { $version }
allow-description = Gadael i { -brand-short-name } wneud
automatic-updates-label =
    .label = Gosod diweddariadau'n awtomatig (argymell: gwella diogelwch)
    .accesskey = a
check-updates-label =
    .label = Gwirio am ddiweddariadau, ond gadael i mi ddewis i'w gosod a'i peidio
    .accesskey = d
update-history-button =
    .label = Dangos Hanes Diweddaru
    .accesskey = D
use-service =
    .label = Defnyddio gwasanaethau cefndirol i osod diweddariadau
    .accesskey = e
cross-user-udpate-warning = Bydd y gosodiad hwn yn berthnasol i holl gyfrifon Windows a phroffiliau { -brand-short-name } sy'n ddefnyddio'r gosodiad hwn { -brand-short-name }.
networking-legend = Cysylltiad
proxy-config-description = Ffurfweddu sut mae { -brand-short-name } yn cysylltu â'r Rhyngrwyd
network-settings-button =
    .label = Gosodiadau…
    .accesskey = G
offline-legend = All-lein
offline-settings = Ffurfweddi gosodiadau all-lein
offline-settings-button =
    .label = All-lein…
    .accesskey = l
diskspace-legend = Lle ar Ddisg
offline-compact-folder =
    .label = Cywasgu pob ffolder pan fydd yn cadw dros gyfanswm o
    .accesskey = y
offline-compact-folder-automatically =
    .label = Gofyn bob tro cyn cywasgu
    .accesskey = G
compact-folder-size =
    .value = MB

## Note: The entities use-cache-before and use-cache-after appear on a single
## line in preferences as follows:
## use-cache-before [ textbox for cache size in MB ] use-cache-after

use-cache-before =
    .value = Defnyddio hyd at
    .accesskey = D
use-cache-after = MB o le disg ar gyfer y storfa

##

smart-cache-label =
    .label = Anwybyddu rheolaeth storfa awtomatig
    .accesskey = A
clear-cache-button =
    .label = Clirio Nawr
    .accesskey = N
clear-cache-shutdown-label =
    .label = Clirio'r storfa wrth gau
    .accesskey = g
fonts-legend = Ffontiau a Lliwiau
default-font-label =
    .value = Ffont rhagosodedig:
    .accesskey = r
default-size-label =
    .value = Maint:
    .accesskey = M
font-options-button =
    .label = Uwch…
    .accesskey = U
color-options-button =
    .label = Lliwiau…
    .accesskey = L
display-width-legend = Negeseuon Testun Plaen
# Note : convert-emoticons-label 'Emoticons' are also known as 'Smileys', e.g. :-)
convert-emoticons-label =
    .label = Dangos gwenogluniau fel graffigau
    .accesskey = g
display-text-label = Wrth ddangos negeseuon testun plaen dyfynedig:
style-label =
    .value = Arddull:
    .accesskey = A
regular-style-item =
    .label = Arferol
bold-style-item =
    .label = Trwm
italic-style-item =
    .label = Italig
bold-italic-style-item =
    .label = Italig Trwm
size-label =
    .value = Maint:
    .accesskey = M
regular-size-item =
    .label = Arferol
bigger-size-item =
    .label = Mwy
smaller-size-item =
    .label = Llai
quoted-text-color =
    .label = Lliw:
    .accesskey = L
search-handler-table =
    .placeholder = Hidlo mathau a gweithredoedd cynnwys
type-column-header = Math o Gynnwys
action-column-header = Gweithred
save-to-label =
    .label = Cadw ffeiliau yn
    .accesskey = C
choose-folder-label =
    .label =
        { PLATFORM() ->
            [macos] Dewis…
           *[other] Pori…
        }
    .accesskey =
        { PLATFORM() ->
            [macos] D
           *[other] P
        }
always-ask-label =
    .label = Gofyn i mi lle i gadw pob ffeil
    .accesskey = G
display-tags-text = Mae modd defnyddio tagiau i gategoreiddio a blaenoriaethu eich negeseuon.
new-tag-button =
    .label = Newydd…
    .accesskey = N
edit-tag-button =
    .label = Golygu…
    .accesskey = G
delete-tag-button =
    .label = Dileu
    .accesskey = D
auto-mark-as-read =
    .label = Marcio'n awtomatig negeseuon wedi'u darllen
    .accesskey = a
mark-read-no-delay =
    .label = Dangos yn syth
    .accesskey = s
view-attachments-inline =
    .label = Gweld atodiadau mewn llinell
    .accesskey = G

## Note: This will concatenate to "After displaying for [___] seconds",
## using (mark-read-delay) and a number (seconds-label).

mark-read-delay =
    .label = Ar ôl dangos am
    .accesskey = d
seconds-label = eiliad

##

open-msg-label =
    .value = Agor neges mewn:
open-msg-tab =
    .label = Tab newydd
    .accesskey = T
open-msg-window =
    .label = Ffenestr neges newydd
    .accesskey = n
open-msg-ex-window =
    .label = Ffenestr neges gyfredol
    .accesskey = g
close-move-delete =
    .label = Cau ffenestr/tab neges wrth symud neu ddileu
    .accesskey = C
display-name-label =
    .value = Enw dangos:
condensed-addresses-label =
    .label = Dangos dim ond enw dangos unigolion yn fy llyfr cyfeiriadau
    .accesskey = D

## Compose Tab

forward-label =
    .value = Anfon negeseuon ymlaen:
    .accesskey = y
inline-label =
    .label = Mewnlin
as-attachment-label =
    .label = Fel Atodiad
extension-label =
    .label = ychwanegu estyniad i enw ffeil
    .accesskey = e

## Note: This will concatenate to "Auto Save every [___] minutes",
## using (auto-save-label) and a number (auto-save-end).

auto-save-label =
    .label = Awto Gadw pob
    .accesskey = G
auto-save-end = munud

##

warn-on-send-accel-key =
    .label = Cadarnhau wrth ddefnyddio llwybr byr bysellfwrdd i anfon neges
    .accesskey = b
add-link-previews =
    .label = Ychwanegu rhagolygon dolenni wrth ludo URLau
    .accesskey = Y
spellcheck-label =
    .label = Gwirio sillafu cyn anfon
    .accesskey = s
spellcheck-inline-label =
    .label = Galluogi gwirio sillafu wrth deipio
    .accesskey = E
language-popup-label =
    .value = Iaith:
    .accesskey = I
download-dictionaries-link = Llwytho i Lawr Rhagor o Eiriaduron
font-label =
    .value = Ffont:
    .accesskey = F
font-size-label =
    .value = Maint:
    .accesskey = M
default-colors-label =
    .label = Defnyddio lliwiau rhagosodedig y darllenydd
    .accesskey = d
font-color-label =
    .value = Lliw Testun:
    .accesskey = L
bg-color-label =
    .value = Lliw Cefndir:
    .accesskey = C
restore-html-label =
    .label = Adfer y Rhagosodiadau
    .accesskey = R
default-format-label =
    .label = Defnyddio'r Fformat Paragraff yn lle Testun Corff drwy ragosodiad
    .accesskey = P
compose-send-format-title = Fformat Anfon
compose-send-automatic-option =
    .label = Awtomatig
compose-send-automatic-description = Os nad oes steilio'n cael ei ddefnyddio yn y neges, anfonwch Destun Plaen. Fel arall, anfonwch HTML gyda Thestun Plaen wrth gefn.
compose-send-both-option =
    .label = HTML a Thestun Plaen
compose-send-both-description = Bydd rhaglen e-bost y derbynnydd yn pennu pa fersiwn i'w dangos.
compose-send-html-option =
    .label = Dim ond HTML
compose-send-html-description = Efallai na fydd rhai derbynwyr yn gallu darllen y neges heb fod Testun Plaen wrth gefn.
compose-send-plain-option =
    .label = Dim ond Testun Plaen
compose-send-plain-description = Bydd rhywfaint o steilio'n cael ei drosi i ddewis plaen arall, tra bydd nodweddion cyfansoddi eraill yn cael eu hanalluogi.
autocomplete-description = Wrth gyfeirio negeseuon, chwilio am gofnodion cyfatebol yn:
ab-label =
    .label = Llyfrau Cyfeiriadau Lleol
    .accesskey = L
directories-label =
    .label = Gweinydd Cyfeiriadur:
    .accesskey = G
directories-none-label =
    .none = Dim
edit-directories-label =
    .label = Golygu Cyfeiriaduron…
    .accesskey = C
email-picker-label =
    .label = Ychwanegu cyfeiriadau e-bost anfon yn awtomatig i'r:
    .accesskey = Y
default-directory-label =
    .value = Cyfeiriadur cychwyn rhagosodedig yn ffenestr y llyfr cyfeiriadau:
    .accesskey = c
default-last-label =
    .none = Cyfeiriadur defnyddiwyd ddiwethaf
attachment-label =
    .label = Gwirio am atodiadau coll
    .accesskey = w
attachment-options-label =
    .label = Allweddeiriau…
    .accesskey = w
enable-cloud-share =
    .label = Cynnig rhannu ffeiliau sy'n fwy na
cloud-share-size =
    .value = MB
add-cloud-account =
    .label = Ychwanegu…
    .accesskey = Y
    .defaultlabel = Ychwanegu…
remove-cloud-account =
    .label = Tynnu
    .accesskey = T
find-cloud-providers =
    .value = Canfod rhagor o ddarparwyr…
cloud-account-description = Ychwanegu gwasanaeth storio Filelink newydd

## Privacy Tab

mail-content = Cynnwys E-bost
remote-content-label =
    .label = Caniatáu cynnwys pell o fewn negeseuon
    .accesskey = C
exceptions-button =
    .label = Eithriadau…
    .accesskey = E
remote-content-info =
    .value = Dysgu rhagor am faterion preifatrwydd cynnwys pell
web-content = Cynnwys Gwe
history-label =
    .label = Cofio gwefannau a dolenni rwyf wedi ymweld â nhw
    .accesskey = o
cookies-label =
    .label = Derbyn cwcis gan wefannau
    .accesskey = D
third-party-label =
    .value = Derbyn cwcis trydydd parti:
    .accesskey = D
third-party-always =
    .label = Bob tro
third-party-never =
    .label = Byth
third-party-visited =
    .label = O'r ymwelwyd
keep-label =
    .value = Cadw tan:
    .accesskey = C
keep-expire =
    .label = daw i ben
keep-close =
    .label = Cau { -brand-short-name }
keep-ask =
    .label = gofyn i mi bob tro
cookies-button =
    .label = Dangos Cwcis…
    .accesskey = D
do-not-track-label =
    .label = Anfon neges “Dim Tracio” at wefannau nad ydych am gael eich tracio
    .accesskey = D
learn-button =
    .label = Dysgu rhagor
dnt-learn-more-button =
    .value = Dysgu rhagor
passwords-description = Mae { -brand-short-name } yn gallu cofio cyfrineiriau eich holl cyfrifon.
passwords-button =
    .label = Cyfrineiriau sydd wedi'u cadw…
    .accesskey = C
primary-password-description = Mae Prif Gyfrinair yn diogelu eich holl gyfrineiriau, ond rhaid i chi ei osod unwaith y sesiwn.
primary-password-label =
    .label = Defnyddio Prif Gyfrinair
    .accesskey = D
primary-password-button =
    .label = Newid y Prif Gyfrinair…
    .accesskey = N
forms-primary-pw-fips-title = Rydych ym modd FIPS. Mae FIPS angen Prif Gyfrinair nad yw'n wag.
forms-master-pw-fips-desc = Methodd Newid eich Cyfrinair
junk-description = Yma gallwch osod eich gosodiadau sbam rhagosodedig. Mae modd ffurfweddu gosodiadau penodol ar gyfer sbam yn Gosodiadau Cyfrif.
junk-label =
    .label = Pan fyddai'n marcio negeseuon fel sbam:
    .accesskey = P
junk-move-label =
    .label = Eu symud i ffolder "Sbam" y cyfrif
    .accesskey = b
junk-delete-label =
    .label = Eu dileu
    .accesskey = d
junk-read-label =
    .label = Marcio negeseuon Sbam fel rhai wedi'u darllen
    .accesskey = a
junk-log-label =
    .label = Galluogi cofnodi hidlo sbam addasol
    .accesskey = G
junk-log-button =
    .label = Dangos y cofnod
    .accesskey = c
reset-junk-button =
    .label = Ailosod Data Hyfforddi
    .accesskey = A
phishing-description = Mae { -brand-short-name } yn gallu dadansoddi negeseuon am dwyll e-bost drwy edrych am dechnegau cyffredin i'ch twyllo.
phishing-label =
    .label = Dweud wrthyf os yw'r neges ryw'n ei darllen o bosib yn e-bost twyllodrus
    .accesskey = D
antivirus-description = Mae { -brand-short-name } yn gallu ei gwneud yn hawdd i feddalwedd gwrth firws ddadansoddi negeseuon e-byst sy'n cael eu derbyn am firysau cyn eu storio'n lleol.
antivirus-label =
    .label = Caniatáu i'r rhaglen neilltuo negeseuon sy'n cael eu derbyn
    .accesskey = a
certificate-description = Pan fydd gweinydd yn gofyn am fy nhystysgrif bersonol:
certificate-auto =
    .label = Dewis un yn awtomatig
    .accesskey = D
certificate-ask =
    .label = Gofyn i mi bob tro
    .accesskey = G
ocsp-label =
    .label = Ymholi gweinyddion ymatebydd OCSP i gadarnhau dilysrwydd cyfredol y tystysgrifau
    .accesskey = Y
certificate-button =
    .label = Rheoli Tystysgrifau…
    .accesskey = R
security-devices-button =
    .label = Dyfeisiau Diogelwch…
    .accesskey = D
email-e2ee-header = Amgryptio E-bost Pen-i-Ben
account-settings = Gosodiadau Cyfrif
email-e2ee-enable-info = Gosodwch gyfrifon e-bost a manylion adnabod Amgryptio o Ben-i-Ben yn Gosodiadau Cyfrif.
email-e2ee-automatism = Defnydd Awtomatig o Amgryptio
email-e2ee-automatism-pre = Gall { -brand-short-name } gynorthwyo drwy alluogi neu analluogi amgryptio yn awtomatig wrth ysgrifennu e-byst. Mae awto alluogi/analluogi yn seiliedig ar argaeledd allweddi neu dystysgrifau gohebwyr dilys a derbyniol.
email-e2ee-auto-on =
    .label = Galluogi amgryptio yn awtomatig pan fo modd
email-e2ee-auto-off =
    .label = Analluogi amgryptio yn awtomatig pan fydd derbynwyr yn newid ac nid yw amgryptio bellach yn bosibl
email-e2ee-auto-off-notify =
    .label = Dangos hysbysiad pryd bynnag mae amgryptio wedi'i analluogi'n awtomatig
email-e2ee-automatism-post = Gall penderfyniadau awtomatig gael eu diystyru trwy alluogi neu analluogi amgryptio wrth ysgrifennu neges. Nodyn: mae amgryptio bob tro'n cael ei alluogi'n awtomatig wrth ateb neges wedi'i hamgryptio.

## Chat Tab

startup-label =
    .value = Pan fydd { -brand-short-name } yn cychwyn:
    .accesskey = P
offline-label =
    .label = Cadw fy Nghyfrifon Sgwrsio all-lein
auto-connect-label =
    .label = Cysylltu â fy nghyfrifon sgwrsio yn awtomatig

## Note: idle-label is displayed first, then there's a field where the user
## can enter a number, and itemTime is displayed at the end of the line.
## The translations of the idle-label and idle-time-label parts don't have
## to mean the exact same thing as in English; please try instead to
## translate the whole sentence.

idle-label =
    .label = Hysbysu fy nghysylltiadau fy mod yn Segur ar ôl
    .accesskey = S
idle-time-label = munud o seibiant

##

away-message-label =
    .label = a dynodi fy statws i I Ffwrdd gyda'r neges statws yma:
    .accesskey = F
send-typing-label =
    .label = Anfon hysbysiadau teipio mewn trafodaethau
    .accesskey = h
notification-label = Pan fydd negeseuon wedi eu cyfeirio atoch chi yn cyrraedd:
show-notification-label =
    .label = Dangos rhybudd:
    .accesskey = r
notification-all =
    .label = gydag enw'r anfonwr a rhagolwg o'r neges
notification-name =
    .label = gydag enw'r anfonwr yn unig
notification-empty =
    .label = heb unrhyw wybodaeth
notification-type-label =
    .label =
        { PLATFORM() ->
            [macos] Animeiddio eitem docio
           *[other] Fflachio'r eitem bar tasgau
        }
    .accesskey =
        { PLATFORM() ->
            [macos] o
           *[other] F
        }
chat-play-sound-label =
    .label = Canu nodyn
    .accesskey = C
chat-play-button =
    .label = Chwarae
    .accesskey = h
chat-system-sound-label =
    .label = Sain rhagosodedig y system ar gyfer e-bost newydd
    .accesskey = S
chat-custom-sound-label =
    .label = Defnyddio'r ffeil sain ganlynol
    .accesskey = D
chat-browse-sound-button =
    .label = Pori…
    .accesskey = P
theme-label =
    .value = Thema:
    .accesskey = T
style-mail =
    .label = { -brand-short-name }
style-bubbles =
    .label = Swigod
style-dark =
    .label = Tywyll
style-paper =
    .label = Dalennau Papur
style-simple =
    .label = Syml
preview-label = Rhagolwg:
no-preview-label = Dim rhagolwg ar gael
no-preview-description = Nid yw'r thema yma'n ddilys nac ar gael ar hyn o bryd (ychwanegyn wedi ei analluogi, modd diogel, …).
chat-variant-label =
    .value = Amrywiad:
    .accesskey = A
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
    .placeholder = Canfod yn y Gosodiadau

## Settings UI Search Results

search-results-header = Canlyniadau Chwilio
# `<span data-l10n-name="query"></span>` will be replaced by the search term.
search-results-empty-message2 =
    { PLATFORM() ->
        [windows] Ymddiheuriadau! Nid oes canlyniadau yn y Dewisiadau ar gyfer “<span data-l10n-name="query"></span>”.
       *[other] Ymddiheuriadau! Nid oes canlyniadau yn y Dewisiadau ar gyfer “<span data-l10n-name="query"></span>”.
    }
search-results-help-link = Angen cymorth? Ewch i <a data-l10n-name="url">Cefnogaeth { -brand-short-name }</a>

## Sync Tab

sync-signedout-caption = Cymrwch eich Gwe gyda Chi
sync-signedout-description = Cydweddwch eich cyfrifon, llyfrau cyfeiriadau, calendrau, ychwanegion a gosodiadau ar draws eich holl ddyfeisiau.
# Note: "Sync" represents the Firefox Sync product so it shouldn't be translated.
sync-signedout-account-signin-btn = Mewngofnodi i Sync…
sync-pane-header = Cydweddu
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-pane-email-not-verified = Nid yw " { $userEmail } " wedi'i wirio.
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-signedin-login-failure = Mewngofnodwch i ailgysylltu “{ $userEmail }”
sync-pane-resend-verification = Ail Anfon Dilysiad
sync-pane-sign-in = Mewngofnodi
sync-pane-remove-account = Tynnu cyfrif
sync-pane-edit-photo =
    .title = Newid llun proffil
sync-pane-manage-account = Rheoli cyfrif
sync-pane-sign-out = Allgofnodi…
sync-pane-device-name-title = Enw Dyfais
sync-pane-change-device-name = Newid enw dyfais
sync-pane-cancel = Diddymu
sync-pane-save = Cadw
sync-pane-show-synced-header-on = Cydweddu YMLAEN
sync-pane-show-synced-header-off = Cydweddu I FFWRDD
sync-pane-sync-now = Cydweddu Nawr
sync-panel-sync-now-syncing = Cydweddu…
show-synced-list-heading = Rydych wrthi'n cydweddu'r eitemau hyn:
show-synced-learn-more = Dysgu rhagor…
show-synced-item-account = Cyfrifon E-bost
show-synced-item-address = Llyfrau Cyfeiriadau
show-synced-item-calendar = Calendrau
show-synced-item-identity = Hunaniaethau
show-synced-item-passwords = Cyfrineiriau
show-synced-change = Newid…
synced-acount-item-server-config = Ffufweddiad gweinydd
synced-acount-item-filters = Hidlau
synced-acount-item-keys = OpenPGP - S/MIME
sync-disconnected-text = Cydweddwch eich cyfrifon e-bost, llyfrau cyfeiriadau, calendrau a hunaniaethau ar draws eich holl ddyfeisiau.
sync-disconnected-turn-on-sync = Cychwyn Cydweddu…
