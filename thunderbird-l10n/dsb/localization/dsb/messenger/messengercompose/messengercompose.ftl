# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Send Format

compose-send-format-menu =
    .label = Słański format
    .accesskey = S
compose-send-auto-menu-item =
    .label = Awtomatiski
    .accesskey = A
compose-send-both-menu-item =
    .label = HTML a lutny tekst
    .accesskey = H
compose-send-html-menu-item =
    .label = Jano HTML
    .accesskey = J
compose-send-plain-menu-item =
    .label = Jano lutny tekst
    .accesskey = l

## Addressing widget

#   $type (String) - the type of the addressing row
remove-address-row-button =
    .title = Pólo typa { $type } wótwónoźeś
#   $type (String) - the type of the addressing row
#   $count (Number) - the number of address pills currently present in the addressing row
address-input-type-aria-label =
    { $count ->
        [0] { $type }
        [one] { $type } z jadneju adresu, wužywajśo lěwu šypkowy tastu, aby fokus stajił.
        [two] { $type } z { $count } adresoma, wužywajśo lěwu šypkowej tastu, aby fokus stajił.
        [few] { $type } z { $count } adresami, wužywajśo lěwu šypkowu tastu, aby fokus stajił.
       *[other] { $type } z { $count } adresami, wužywajśo lěwu šypkowu tastu, aby fokus stajił.
    }
#   $email (String) - the email address
#   $count (Number) - the number of address pills currently present in the addressing row
pill-aria-label =
    { $count ->
        [one] { $email }: Tłocćo Enter, aby wobźěłował, Entf, aby wótwónoźeł.
        [two] { $email }, 1 z { $count }: Tłocćo Enter, aby wobźěłował, Entf, aby wótwónoźeł.
        [few] { $email }, 1 z { $count }: Tłocćo Enter, aby wobźěłował, Entf, aby wótwónoźeł.
       *[other] { $email }, 1 z { $count }: Tłocćo Enter, aby wobźěłował, Entf, aby wótwónoźeł.
    }
#   $email (String) - the email address
pill-tooltip-invalid-address = { $email } njejo płaśiwa e-mailowa adresa
#   $email (String) - the email address
pill-tooltip-not-in-address-book = { $email } njejo we wašom adresniku
pill-action-edit =
    .label = Adresu wobźěłaś
    .accesskey = A
#   $type (String) - the type of the addressing row, e.g. Cc, Bcc, etc.
pill-action-select-all-sibling-pills =
    .label = Wšykne adrese w { $type } wubraś
    .accesskey = a
pill-action-select-all-pills =
    .label = Wšykne adrese wubraś
    .accesskey = b
pill-action-move-to =
    .label = Do Komu pśesunuś
    .accesskey = K
pill-action-move-cc =
    .label = Do kopije pśesunuś
    .accesskey = p
pill-action-move-bcc =
    .label = Do schowaneje kopije pśesunuś
    .accesskey = s
pill-action-expand-list =
    .label = Lisćinu pokazaś
    .accesskey = i

## Attachment widget

ctrl-cmd-shift-pretty-prefix =
    { PLATFORM() ->
        [macos] ⇧ ⌘{ " " }
       *[other] Strg+Umsch+
    }
trigger-attachment-picker-key = A
toggle-attachment-pane-key = M
menuitem-toggle-attachment-pane =
    .label = Pśidankowe wokno
    .accesskey = P
    .acceltext = { ctrl-cmd-shift-pretty-prefix }{ toggle-attachment-pane-key }
toolbar-button-add-attachment =
    .label = Pśipowjesyś
    .tooltiptext = Pśidank pśidaś ({ ctrl-cmd-shift-pretty-prefix }{ trigger-attachment-picker-key })
add-attachment-notification-reminder2 =
    .label = Pśidank pśidaś…
    .accesskey = P
    .tooltiptext = { toolbar-button-add-attachment.tooltiptext }
menuitem-attach-files =
    .label = Dataje…
    .accesskey = D
    .acceltext = { ctrl-cmd-shift-pretty-prefix }{ trigger-attachment-picker-key }
context-menuitem-attach-files =
    .label = Dataje pśipowjesyś…
    .accesskey = D
    .acceltext = { ctrl-cmd-shift-pretty-prefix }{ trigger-attachment-picker-key }
# Note: Do not translate the term 'vCard'.
context-menuitem-attach-vcard =
    .label = Mója wizitna kórtka vCard
    .accesskey = v
context-menuitem-attach-openpgp-key =
    .label = Mój zjawny kluc OpenPGP
    .accesskey = l
#   $count (Number) - the number of attachments in the attachment bucket
attachment-bucket-count-value =
    { $count ->
        [1] { $count } pśidank
        [one] { $count } pśidank
        [two] { $count } pśidanka
        [few] { $count } pśidanki
       *[other] { $count } pśidankow
    }
attachment-area-show =
    .title = Pśidankowe wokno pokazaś ({ ctrl-cmd-shift-pretty-prefix }{ toggle-attachment-pane-key })
attachment-area-hide =
    .title = Pśidankowe wokno schowaś ({ ctrl-cmd-shift-pretty-prefix }{ toggle-attachment-pane-key })

## Variables:
## $count (Number) - Number of files being dropped onto the composer.

drop-file-label-attachment =
    { $count ->
        [one] Ako pśidank pśidaś
        [two] Ako pśidanka pśidaś
        [few] Ako pśidanki pśidaś
       *[other] Ako pśidanki pśidaś
    }
drop-file-label-inline =
    { $count ->
        [one] Inline pśipowjesyś
        [two] Inline pśipowjesyś
        [few] Inline pśipowjesyś
       *[other] Inline pśipowjesyś
    }

## Reorder Attachment Panel

move-attachment-first-panel-button =
    .label = Na zachopjeńk pśesunuś
move-attachment-left-panel-button =
    .label = Nalěwo pśesunuś
move-attachment-right-panel-button =
    .label = Napšawo pśesunuś
move-attachment-last-panel-button =
    .label = Na kóńc pśesunuś
button-return-receipt =
    .label = Kwitowanka
    .tooltiptext = Kwintowanku za toś tu powěsć pominaś

## Encryption

encryption-menu =
    .label = Wěstota
    .accesskey = s
encryption-toggle =
    .label = Koděrowaś
    .tooltiptext = Kóděrowanje kóńc do kóńca za toś tu powěsć wužywaś
encryption-options-openpgp =
    .label = OpenPGP
    .tooltiptext = Nastajenja za koděrowanje OpenPGP pokazaś abo změniś
encryption-options-smime =
    .label = S/MIME
    .tooltiptext = Nastajenja za koděrowanje S/MIME pokazaś abo změniś
signing-toggle =
    .label = Signěrowaś
    .tooltiptext = Digitalny pódpis za toś tu powěsć wužywaś
menu-openpgp =
    .label = OpenPGP
    .accesskey = O
menu-smime =
    .label = S/MIME
    .accesskey = S
menu-encrypt =
    .label = Koděrowaś
    .accesskey = K
menu-encrypt-subject =
    .label = Temu koděrowaś
    .accesskey = T
menu-sign =
    .label = Digitalnje signěrowaś
    .accesskey = i
menu-manage-keys =
    .label = Klucowy asistent
    .accesskey = K
menu-view-certificates =
    .label = Certifikaty dostawrjow pokazaś
    .accesskey = C
menu-open-key-manager =
    .label = Zastojnik klucow
    .accesskey = Z
openpgp-key-issue-notification-one = Koděrowanje kóńc do kóńca se rozwězanje klucowych problemow za { $addr } pomina
openpgp-key-issue-notification-many = Koděrowanje kóńc do kóńca se rozwězanje klucowych problemow za někotare dostawarje pomina ({ $count }).
smime-cert-issue-notification-one = Koděrowanje kóńc do kóńca se rozwězanje certifikatowych problemow za { $addr } pomina.
smime-cert-issue-notification-many = Koděrowanje kóńc do kóńca se rozwězanje certifikatowych problemow za někotare dostawarje pomina ({ $count }).
# Variables:
# $addr (String) - Email address (which related to the currently selected
#                  from address) which isn't set up to end-to-end encryption.
openpgp-key-issue-notification-from = Njejsćo pśigótowany, aby powěsći kóńc do kóńca wót { $addr } pósłał.
# Variables:
# $addr (String) - Email address with key issues.
openpgp-key-issue-notification-single = Koděrowanje kóńc do kóńca se rozwězanje klucowych problemow za { $addr } pomina.
# Variables:
# $count (Number) - Number of recipients with key issues.
openpgp-key-issue-notification-multi =
    { $count ->
        [one] Koděrowanje kóńc do kóńca se rozwězanje klucowych problemow za { $count } dostawarja pomina.
        [two] Koděrowanje kóńc do kóńca se rozwězanje klucowych problemow za { $count } dostawarja pomina.
        [few] Koděrowanje kóńc do kóńca se rozwězanje klucowych problemow za { $count } dostawarje pomina.
       *[other] Koděrowanje kóńc do kóńca se rozwězanje klucowych problemow za { $count } dostawarjow pomina.
    }
# Variables:
# $addr (String) - mail address with certificate issues.
smime-cert-issue-notification-single = Koděrowanje kóńc do kóńca se rozwězanje certifikatowych problemow za { $addr } pomina.
# Variables:
# $count (Number) - Number of recipients with certificate issues.
smime-cert-issue-notification-multi =
    { $count ->
        [one] Koděrowanje kóńc do kóńca se rozwězanje certifikatowych problemow za { $count } dostawarja pomina.
        [two] Koděrowanje kóńc do kóńca se rozwězanje certifikatowych problemow za { $count } dostawarja pomina.
        [few] Koděrowanje kóńc do kóńca se rozwězanje certifikatowych problemow za { $count } dostawarje pomina.
       *[other] Koděrowanje kóńc do kóńca se rozwězanje certifikatowych problemow za { $count } dostawarjow pomina.
    }
key-notification-disable-encryption =
    .label = Njekoděrowaś
    .accesskey = N
    .tooltiptext = Koděrowanje kóńc do kóńca znjemóžniś
key-notification-resolve =
    .label = Rozeznawaś…
    .accesskey = R
    .tooltiptext = Klucowy asistent OpenPGP wócyniś
can-encrypt-smime-notification = Koděrowanje kóńc do kóńca S/MIME jo móžne.
can-encrypt-openpgp-notification = Koděrowanje kóńc do kóńca OpenPGP jo móžne.
can-e2e-encrypt-button =
    .label = Koděrowaś
    .accesskey = K

## Addressing Area

to-address-row-label =
    .value = Komu
#   $key (String) - the shortcut key for this field
show-to-row-main-menuitem =
    .label = Pólo Komu
    .accesskey = K
    .acceltext = { ctrl-cmd-shift-pretty-prefix }{ $key }
# No acceltext should be shown.
# The label should match the show-to-row-button text.
show-to-row-extra-menuitem =
    .label = Komu
    .accesskey = K
#   $key (String) - the shortcut key for this field
show-to-row-button = Komu
    .title = Pólo Komu pokazaś ({ ctrl-cmd-shift-pretty-prefix }{ $key })
cc-address-row-label =
    .value = Kopija
#   $key (String) - the shortcut key for this field
show-cc-row-main-menuitem =
    .label = Pólo Kopija
    .accesskey = P
    .acceltext = { ctrl-cmd-shift-pretty-prefix }{ $key }
# No acceltext should be shown.
# The label should match the show-cc-row-button text.
show-cc-row-extra-menuitem =
    .label = Kopija
    .accesskey = K
#   $key (String) - the shortcut key for this field
show-cc-row-button = Kopija
    .title = Pólo Kopija pokazaś ({ ctrl-cmd-shift-pretty-prefix }{ $key })
bcc-address-row-label =
    .value = Schowana kopija
#   $key (String) - the shortcut key for this field
show-bcc-row-main-menuitem =
    .label = Pólo Schowana kopija
    .accesskey = S
    .acceltext = { ctrl-cmd-shift-pretty-prefix }{ $key }
# No acceltext should be shown.
# The label should match the show-bcc-row-button text.
show-bcc-row-extra-menuitem =
    .label = Schowana kopija
    .accesskey = S
#   $key (String) - the shortcut key for this field
show-bcc-row-button = Schowana kopija
    .title = Pólo Schowana kopija pokazaś ({ ctrl-cmd-shift-pretty-prefix }{ $key })
extra-address-rows-menu-button =
    .title = Druge adresowe póla, kótarež se maju pokazaś
#   $count (Number) - the count of addresses in the "To" and "Cc" fields.
many-public-recipients-notice =
    { $count ->
        [one] Waša powěsć ma zjawnego dostawarja. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje pśeraźuju.
        [two] { $count } dostawarja w póloma Komu a Kopija buźotej adresu drugich wiźeś. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje wótekšywaju.
        [few] { $count } dostawarje w póloma Komu a Kopija budu adresu drugich wiźeś. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje wótekšywaju.
       *[other] { $count } dostawarjow w póloma Komu a Kopija buźo adresu drugich wiźeś. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje wótekšywaju.
    }
public-recipients-notice-single = Waša powěsć ma zjawnego dostawarja. Móžośo  se togo wobinuś, až se dostawaŕ pśeraźijo, gaž město togo schowanu kopiju wužywaśo.
# Variables:
# $count (Number) - the count of addresses in the "To" and "Cc" fields.
public-recipients-notice-multi =
    { $count ->
        [one] { $count } dostawaŕ buźo w póloma Komu a Kopija adresu drugich wiźeś. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje pśeraźuju.
        [two] { $count } dostawarja buźo w póloma Komu a Kopija adresu drugich wiźeś. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje pśeraźuju.
        [few] { $count } dostawarje buźo w póloma Komu a Kopija adresu drugich wiźeś. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje pśeraźuju.
       *[other] { $count } dostawarjow buźo w póloma Komu a Kopija adresu drugich wiźeś. Wužywajśo město togo pólo Schowana kopija, aby tomu zajźował, až se dostawarje pśeraźuju.
    }
many-public-recipients-bcc =
    .label = Schowanu kopiju město togo wužywaś
    .accesskey = S
many-public-recipients-ignore =
    .label = Dostawarje zjawne źaržaś
    .accesskey = D
many-public-recipients-prompt-title = Pśewjele zjawnych dostawarjow
#   $count (Number) - the count of addresses in the public recipients fields.
many-public-recipients-prompt-msg =
    { $count ->
        [one] Waša powěsć ma zjawnego dostawarja. To móžo priwatnosć wobgrozyś. Pśesuńśo dostawarja wót póla Komu/Kopija do póla Schowana kopija.
        [two] Waša powěsć ma { $count } zjawneju dostawarjowu, kótarejž móžotej mjazsobnje swóje adrese wiźeś. To móžo priwatnosć wobgrozyś. Pśesuńśo togodla dostawarje wót póla Komu/Kopija do póla Schowana kopija.
        [few] Waša powěsć ma { $count } zjawnych dostawarjow, kótarež mógu mjazsobnje swóje adrese wiźeś. To móžo priwatnosć wobgrozyś. Pśesuńśo togodla dostawarje wót póla Komu/Kopija do póla Schowana kopija.
       *[other] Waša powěsć ma { $count } zjawnych dostawarjow, kótarež mógu mjazsobnje swóje adrese wiźeś. To móžo priwatnosć wobgrozyś. Pśesuńśo togodla dostawarje wót póla Komu/Kopija do póla Schowana kopija.
    }
many-public-recipients-prompt-cancel = Słanje pśetergnuś
many-public-recipients-prompt-send = Weto słaś

## Notifications

# Variables:
# $identity (string) - The name of the used identity, most likely an email address.
compose-missing-identity-warning = Jadnorazowa identita, kótaraž adresy wótpósłarja wótpowědujo, njejo se namakała. Powěsć se z pomocu pólom Wót a nastajenja z identity { $identity } pósćelo.
encrypted-bcc-warning = Pśi słanju skoděrowaneje powěsći, dostawarje schowaneje kopije njejsu połnje schowane. Wše dostawarje mógu jich identificěrowaś.
encrypted-bcc-ignore-button = Som zrozměł
auto-disable-e2ee-warning = Koděrowanje kóńc do kóńca jo se awtomatiski znjemóžniło za toś tu powěsć.

## Editing


# Tools

compose-tool-button-remove-text-styling =
    .tooltiptext = Tekstowy stil wótwónoźeś

## Filelink

# A text used in a tooltip of Filelink attachments, whose account has been
# removed or is unknown.
cloud-file-unknown-account-tooltip = Jo se nagrało do njeznatego konta Filelink.

# Placeholder file

# Title for the html placeholder file.
# $filename - name of the file
cloud-file-placeholder-title = { $filename } - pśidank Filelink
# A text describing that the file was attached as a Filelink and can be downloaded
# from the link shown below.
# $filename - name of the file
cloud-file-placeholder-intro = Dataja { $filename } jo se pśipowjesyła ako Filelink. Dajo se z pomocu slědujuego wótkaza ześěgnuś.

# Template

# A line of text describing how many uploaded files have been appended to this
# message. Emphasis should be on sharing as opposed to attaching. This item is
# used as a header to a list, hence the colon.
# Variables:
# $count (Number) - Number of files.
cloud-file-count-header =
    { $count ->
        [one] Som zwězał { $count } dataju z toś teju mejlku:
        [two] Som zwězał { $count } dataji z toś teju mejlku:
        [few] Som zwězał { $count } dataje z toś teju mejlku:
       *[other] Som zwězał { $count } datajow z toś teju mejlku:
    }
# A text used in a footer, instructing the reader where to find additional
# information about the used service provider.
# $link (string) - html a-tag for a link pointing to the web page of the provider
cloud-file-service-provider-footer-single = Dalšne informacije wó { $link }.
# A text used in a footer, instructing the reader where to find additional
# information about the used service providers. Links for the used providers are
# split into a comma separated list of the first n-1 providers and a single entry
# at the end.
# $firstLinks (string) - comma separated list of html a-tags pointing to web pages
#                        of the first n-1 used providers
# $lastLink (string) - html a-tag pointing the web page of the n-th used provider
cloud-file-service-provider-footer-multiple = Dalšne informacije wó { $firstLinks } a { $lastLink }.
# Tooltip for an icon, indicating that the link is protected by a password.
cloud-file-tooltip-password-protected-link = Pśez gronidło šćitany wótkaz
# Used in a list of stats about a specific file
# Service - the used service provider to host the file (Filelink Service: BOX.com)
# Size - the size of the file (Size: 4.2 MB)
# Link - the link to the file (Link: https://some.provider.com)
# Expiry Date - stating the date the link will expire (Expiry Date: 12.12.2022)
# Download Limit - stating the maximum allowed downloads, before the link becomes invalid
#                  (Download Limit: 6)
cloud-file-template-service-name = Słužba Filelink:
cloud-file-template-size = Wjelikosć:
cloud-file-template-link = Wótkaz:
cloud-file-template-password-protected-link = Pśez gronidło šćitany wótkaz:
cloud-file-template-expiry-date = Datum płaśiwosći:
cloud-file-template-download-limit = Ześěgnjeński limit:

# Messages

cloud-file-connection-error-title = Zwiskowa zmólka
# Variables:
# $provider (string) - name of the online storage service that reported the error
cloud-file-connection-error = { -brand-short-name } jo offline. Njejo mógał z { $provider } zwězaś.
# Variables:
# $provider (string) - name of the online storage service that reported the error
# $filename (string) - name of the file that was uploaded and caused the error
cloud-file-upload-error-with-custom-message-title = Nagrawanje { $filename }  na { $provider } njejo so raźiło
cloud-file-rename-error-title = Pśemjenowańska zmólka
# Variables:
# $provider (string) - name of the online storage service that reported the error
# $filename (string) - name of the file that was renamed and caused the error
cloud-file-rename-error = Pśi pśemjenowanju { $filename } na { $provider } jo zmólka nastała.
# Variables:
# $provider (string) - name of the online storage service that reported the error
# $filename (string) - name of the file that was renamed and caused the error
cloud-file-rename-error-with-custom-message-title = Pśemjenowanje { $filename }  na { $provider } njejo se raźiło
# Variables:
# $provider (string) - name of the online storage service that reported the error
cloud-file-rename-not-supported = { $provider } pśemjenowanje južo nagratych datajow njepódpěra.
cloud-file-attachment-error-title = Pśidankowa zmólka Filelink
# Variables:
# $filename (string) - name of the file that was renamed and caused the error
cloud-file-attachment-error = Pśidank { $filename } Filelink njedajo se aktualizěrowaś, dokulaž jogo lokalna dataja jo se pśesunuła abo wulašowała.
cloud-file-account-error-title = Kontowa zmólka Filelink
# Variables:
# $filename (string) - name of the file that was renamed and caused the error
cloud-file-account-error = Pśidank { $filename } Filelink njedajo se aktualizěrowaś, dokulaž jogo lokalna dataja jo se wulašowała.

## Link Preview

link-preview-title = Wótkazowy pśeglěd
link-preview-description = { -brand-short-name } móžo zasajźony pśeglěd pśidaś, gaž se wótkaze zasajźaju.
link-preview-autoadd = Wótkazowe pśeglědy awtomatiski pśidaś, jolic móžno
link-preview-replace-now = Wótkazowy pśeglěd za toś ten wótkaz pśidaś?
link-preview-yes-replace = Jo

## Dictionary selection popup

spell-add-dictionaries =
    .label = Słowniki pśidaś…
    .accesskey = S
