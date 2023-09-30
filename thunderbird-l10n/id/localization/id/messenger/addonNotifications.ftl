# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

xpinstall-prompt = { -brand-short-name } mencegah situs ini meminta Anda menginstal perangkat lunak di komputer Anda.

## Variables:
##   $host (String): The hostname of the site the add-on is being installed from.

xpinstall-prompt-header = Izinkan { $host } memasang pengaya?
xpinstall-prompt-message = Anda mencoba memasang pengaya dari { $host }. Pastikan Anda mempercayai situs ini sebelum melanjutkan.

##

xpinstall-prompt-header-unknown = Izinkan situs yang tidak dikenal memasang pengaya?
xpinstall-prompt-message-unknown = Anda akan memasang pengaya dari situs yang tidak dikenal. Pastikan Anda mempercayai situs ini sebelum melanjutkan.
xpinstall-prompt-dont-allow =
    .label = Jangan Izinkan
    .accesskey = D
xpinstall-prompt-never-allow =
    .label = Jangan Pernah Izinkan
    .accesskey = N
# Accessibility Note:
# Be sure you do not choose an accesskey that is used elsewhere in the active context (e.g. main menu bar, submenu of the warning popup button)
# See https://website-archive.mozilla.org/www.mozilla.org/access/access/keyboard/ for details
xpinstall-prompt-install =
    .label = Lanjut ke Pemasangan
    .accesskey = C

# These messages are shown when a website invokes navigator.requestMIDIAccess.


##

xpinstall-disabled-locked = Pilihan pemasangan perangkat lunak telah dimatikan administrator sistem Anda.
xpinstall-disabled = Pemasangan perangkat lunak sedang dimatikan. Klik Aktifkan dan coba lagi.
xpinstall-disabled-button =
    .label = Aktifkan
    .accesskey = n
# This message is shown when the installation of an add-on is blocked by enterprise policy.
# Variables:
#   $addonName (String): the name of the add-on.
#   $addonId (String): the ID of add-on.
addon-install-blocked-by-policy = { $addonName } ({ $addonId }) diblokir oleh administrator sistem Anda.
# Variables:
#   $addonName (String): the localized name of the sideloaded add-on.
webext-perms-sideload-menu-item = { $addonName } ditambahkan ke { -brand-short-name }
# Variables:
#   $addonName (String): the localized name of the extension which has been updated.
webext-perms-update-menu-item = { $addonName } memerlukan izin baru

## Add-on removal warning

# Variables:
#   $addonCount (Number): the number of add-ons being downloaded
addon-downloading-and-verifying = Mengunduh dan memverifikasi { $addonCount } pengaya…
addon-download-verifying = Memverifikasi
addon-install-cancel-button =
    .label = Batal
    .accesskey = C
addon-install-accept-button =
    .label = Tambah
    .accesskey = A

## Variables:
##   $addonCount (Number): the number of add-ons being installed

addon-confirm-install-message = Situs ini ingin menginstal { $addonCount } pengaya di { -brand-short-name }:
addon-confirm-install-unsigned-message = Perhatian: Situs ini ingin memasang pengaya yang tidak diverifikasi pada { -brand-short-name }. Jika melanjutkan, risiko ditanggung sendiri.
# Variables:
#   $addonCount (Number): the number of add-ons being installed (at least 2)
addon-confirm-install-some-unsigned-message = Perhatian: Situs ini ingin menginstal { $addonCount } pengaya pada { -brand-short-name }, beberapa diantaranya tidak diverifikasi. Jika melanjutkan, risiko ditanggung sendiri.

## Add-on install errors
## Variables:
##   $addonName (String): the add-on name.

addon-install-error-network-failure = Pengaya tidak dapat diunduh karena kegagalan sambungan.
addon-install-error-incorrect-hash = Pengaya tidak dapat dipasang karena tidak cocok dengan pengaya yang diharapkan { -brand-short-name }.
addon-install-error-corrupt-file = Pengaya yang diunduh dari situs ini tidak dapat dipasang karena rusak.
addon-install-error-file-access = { $addonName } tidak dapat dipasang karena { -brand-short-name } tidak dapat mengubah berkas yang dibutuhkan.
addon-install-error-not-signed = { -brand-short-name } telah mencegah situs ini untuk untuk memasang pengaya yang belum diverifikasi.
addon-local-install-error-network-failure = Pengaya ini tidak dapat dipasang karena ada kesalahan pada sistem berkas.
addon-local-install-error-incorrect-hash = Pengaya ini tidak dapat dipasang karena tidak cocok dengan pengaya yang diharapkan { -brand-short-name }.
addon-local-install-error-corrupt-file = Pengaya ini tidak dapat dipasang karena tampaknya berkasnya rusak.
addon-local-install-error-file-access = { $addonName } tidak dapat dipasang karena { -brand-short-name } tidak dapat mengubah berkas yang dibutuhkan.
addon-local-install-error-not-signed = Pengaya ini tidak dapat dipasang karena belum diverifikasi.
# Variables:
#   $appVersion (String): the application version.
addon-install-error-incompatible = { $addonName } tidak dapat dipasang karena tidak kompatibel dengan { -brand-short-name } { $appVersion }.
addon-install-error-blocklisted = { $addonName } tidak dapat dipasang karena berisiko tinggi menyebabkan masalah stabilitas atau keamanan.
