# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

xpinstall-prompt = { -brand-short-name } prevented this site from asking you to install software on your computer.

## Variables:
##   $host (String): The hostname of the site the add-on is being installed from.

xpinstall-prompt-header = Allow { $host } to install an add-on?
xpinstall-prompt-message = You are attempting to install an add-on from { $host }. Make sure you trust this site before continuing.

##

xpinstall-prompt-header-unknown = Allow an unknown site to install an add-on?
xpinstall-prompt-message-unknown = You are attempting to install an add-on from an unknown site. Make sure you trust this site before continuing.
xpinstall-prompt-dont-allow =
    .label = Don’t Allow
    .accesskey = D
xpinstall-prompt-never-allow =
    .label = Never Allow
    .accesskey = N
# Accessibility Note:
# Be sure you do not choose an accesskey that is used elsewhere in the active context (e.g. main menu bar, submenu of the warning popup button)
# See https://website-archive.mozilla.org/www.mozilla.org/access/access/keyboard/ for details
xpinstall-prompt-install =
    .label = Continue to Installation
    .accesskey = C

# These messages are shown when a website invokes navigator.requestMIDIAccess.


##

xpinstall-disabled-locked = Software installation has been disabled by your system administrator.
xpinstall-disabled = Software installation is currently disabled. Click Enable and try again.
xpinstall-disabled-button =
    .label = Enable
    .accesskey = n
# This message is shown when the installation of an add-on is blocked by enterprise policy.
# Variables:
#   $addonName (String): the name of the add-on.
#   $addonId (String): the ID of add-on.
addon-install-blocked-by-policy = { $addonName } ({ $addonId }) is blocked by your system administrator.
# This message is shown when the installation of add-ons from a domain is blocked by enterprise policy.
addon-domain-blocked-by-policy = Your system administrator prevented this site from asking you to install software on your computer.
# Variables:
#   $addonName (String): the localized name of the sideloaded add-on.
webext-perms-sideload-menu-item = { $addonName } added to { -brand-short-name }
# Variables:
#   $addonName (String): the localized name of the extension which has been updated.
webext-perms-update-menu-item = { $addonName } requires new permissions

## Add-on removal warning

# Variables:
#   $addonCount (Number): the number of add-ons being downloaded
addon-downloading-and-verifying =
    { $addonCount ->
        [one] Downloading and verifying add-on…
       *[other] Downloading and verifying { $addonCount } add-ons…
    }
addon-download-verifying = Verifying
addon-install-cancel-button =
    .label = Cancel
    .accesskey = C
addon-install-accept-button =
    .label = Add
    .accesskey = A

## Variables:
##   $addonCount (Number): the number of add-ons being installed

addon-confirm-install-message =
    { $addonCount ->
        [one] This site would like to install an add-on in { -brand-short-name }:
       *[other] This site would like to install { $addonCount } add-ons in { -brand-short-name }:
    }
addon-confirm-install-unsigned-message =
    { $addonCount ->
        [one] Caution: This site would like to install an unverified add-on in { -brand-short-name }. Proceed at your own risk.
       *[other] Caution: This site would like to install { $addonCount } unverified add-ons in { -brand-short-name }. Proceed at your own risk.
    }
# Variables:
#   $addonCount (Number): the number of add-ons being installed (at least 2)
addon-confirm-install-some-unsigned-message = Caution: This site would like to install { $addonCount } add-ons in { -brand-short-name }, some of which are unverified. Proceed at your own risk.

## Add-on install errors
## Variables:
##   $addonName (String): the add-on name.

addon-install-error-network-failure = The add-on could not be downloaded because of a connection failure.
addon-install-error-incorrect-hash = The add-on could not be installed because it does not match the add-on { -brand-short-name } expected.
addon-install-error-corrupt-file = The add-on downloaded from this site could not be installed because it appears to be corrupt.
addon-install-error-file-access = { $addonName } could not be installed because { -brand-short-name } cannot modify the needed file.
addon-install-error-not-signed = { -brand-short-name } has prevented this site from installing an unverified add-on.
addon-local-install-error-network-failure = This add-on could not be installed because of a filesystem error.
addon-local-install-error-incorrect-hash = This add-on could not be installed because it does not match the add-on { -brand-short-name } expected.
addon-local-install-error-corrupt-file = This add-on could not be installed because it appears to be corrupt.
addon-local-install-error-file-access = { $addonName } could not be installed because { -brand-short-name } cannot modify the needed file.
addon-local-install-error-not-signed = This add-on could not be installed because it has not been verified.
# Variables:
#   $appVersion (String): the application version.
addon-install-error-incompatible = { $addonName } could not be installed because it is not compatible with { -brand-short-name } { $appVersion }.
addon-install-error-blocklisted = { $addonName } could not be installed because it has a high risk of causing stability or security problems.
