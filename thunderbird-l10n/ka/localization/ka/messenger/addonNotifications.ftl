# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

xpinstall-prompt = { -brand-short-name } უკრძალავს საიტს თქვენს კომპიუტერში პროგრამის დაყენების მოთხოვნას.

## Variables:
##   $host (String): The hostname of the site the add-on is being installed from.

xpinstall-prompt-header = ნებას რთავთ საიტს { $host } დამატების ჩადგმის?
xpinstall-prompt-message = თქვენ ცდილობთ დამატების ჩადგმას საიტიდან { $host }. დარწმუნდით, რომ სანდო საიტია, სანამ განაგრძობთ.

##

xpinstall-prompt-header-unknown = მიეცეს უცნობ საიტს, დამატების ჩადგმის ნება?
xpinstall-prompt-message-unknown = თქვენ ცდილობთ დამატების ჩადგმას უცნობი საიტიდან %S. დარწმუნდით, რომ სანდო საიტია, სანამ განაგრძობთ.
xpinstall-prompt-dont-allow =
    .label = აკრძალვა
    .accesskey = ა
xpinstall-prompt-never-allow =
    .label = არასდროს დაიშვას
    .accesskey = ა
# Accessibility Note:
# Be sure you do not choose an accesskey that is used elsewhere in the active context (e.g. main menu bar, submenu of the warning popup button)
# See https://website-archive.mozilla.org/www.mozilla.org/access/access/keyboard/ for details
xpinstall-prompt-install =
    .label = გაგრძელდეს ჩადგმა
    .accesskey = ძ

# These messages are shown when a website invokes navigator.requestMIDIAccess.

site-permission-install-first-prompt-midi-header = საიტი ითხოვს წვდომას თქვენს MIDI-მოწყობილობებთან (მუსიკალური საკრავის ციფრული მაკავშირებელი). მოწყობილობასთან წვდომის მიღება შესაძლებელია დამატების ჩადგმით.
site-permission-install-first-prompt-midi-message = წვდომის მიღებისას უსაფრთხოების საწინდარი არ არსებობს. განაგრძეთ მხოლოდ იმ შემთხვევაში, თუ ენდობით ამ საიტს.

##

xpinstall-disabled-locked = პროგრამების ჩადგმა ამჟამად გამორთულია თქვენი სისტემის ზედამხედველის მიერ.
xpinstall-disabled = პროგრამების ჩადგმა შეჩერებულია. დააწკაპეთ ჩართვაზე და ხელახლა სცადეთ.
xpinstall-disabled-button =
    .label = ჩართვა
    .accesskey = რ
# This message is shown when the installation of an add-on is blocked by enterprise policy.
# Variables:
#   $addonName (String): the name of the add-on.
#   $addonId (String): the ID of add-on.
addon-install-blocked-by-policy = { $addonName } ({ $addonId }) შეზღუდულია თქვენი სისტემის ზედამხედველის მიერ.
# This message is shown when the installation of add-ons from a domain is blocked by enterprise policy.
addon-domain-blocked-by-policy = თქვენი სისტემის ზედამხედველი უკრძალავს ამ საიტს თქვენს კომპიუტერში პროგრამის დაყენების მოთხოვნას.
addon-install-full-screen-blocked = დამატების ჩადგმა დაუშვებელია სრული ეკრანის რეჟიმში ყოფნის ან შესვლის დროს.
# Variables:
#   $addonName (String): the localized name of the sideloaded add-on.
webext-perms-sideload-menu-item = { $addonName } დაემატა { -brand-short-name }-ს
# Variables:
#   $addonName (String): the localized name of the extension which has been updated.
webext-perms-update-menu-item = { $addonName } ითხოვს ახალ უფლებებს

## Add-on removal warning

# Variables:
#  $name (String): The name of the add-on that will be removed.
addon-removal-title = მოცილდეს { $name }?
# Variables:
#   $name (String): the name of the extension which is about to be removed.
addon-removal-message = { $name } გაფართოებას ამოშლის { -brand-shorter-name }, გნებავთ?
addon-removal-button = მოცილება
addon-removal-abuse-report-checkbox = საჩივარს ამ გაფართოების შესახებ გაეცნოს { -vendor-short-name }
# Variables:
#   $addonCount (Number): the number of add-ons being downloaded
addon-downloading-and-verifying =
    { $addonCount ->
        [one] დამატების ჩამოტვირთვა და შემოწმება…
       *[other] { $addonCount } დამატების ჩამოტვირთვა და შემოწმება…
    }
addon-download-verifying = მოწმდება
addon-install-cancel-button =
    .label = გაუქმება
    .accesskey = გ
addon-install-accept-button =
    .label = დამატება
    .accesskey = დ

## Variables:
##   $addonCount (Number): the number of add-ons being installed

addon-confirm-install-message =
    { $addonCount ->
        [one] ამ საიტს { -brand-short-name }-ში დამატების ჩადგმა სურს:
       *[other] ამ საიტს { -brand-short-name }-ში { $addonCount } დამატების ჩადგმა სურს:
    }
addon-confirm-install-unsigned-message =
    { $addonCount ->
        [one] ფრთხილად: საიტს სურს დაუმოწმებელი დამატებით აღჭურვოს { -brand-short-name }. განაგრძეთ საკუთარი პასუხისმგებლობით ზიანზე.
       *[other] ფრთხილად: საიტს სურს { $addonCount } დაუმოწმებელი დამატებით აღჭურვოს { -brand-short-name }. განაგრძეთ საკუთარი პასუხისმგებლობით ზიანზე.
    }
# Variables:
#   $addonCount (Number): the number of add-ons being installed (at least 2)
addon-confirm-install-some-unsigned-message = ფრთხილად: ამ საიტს სურს { -brand-short-name } აღჭურვოს { $addonCount } დამატებით, რომელთა ნაწილიც გადაუმოწმებელია. განაგრძეთ საკუთარი პასუხისმგებლობით ზიანზე.

## Add-on install errors
## Variables:
##   $addonName (String): the add-on name.

addon-install-error-network-failure = დამატება კავშირის ჩაშლის გამო ვერ ჩამოტვირთვა.
addon-install-error-incorrect-hash = დამატების ჩადგმა ვერ მოხერხდა, რადგან განსხვავდება იმ დამატებისგან, რომელსაც { -brand-short-name } მოელოდა.
addon-install-error-corrupt-file = ამ საიტიდან ჩამოტვირთული დამატების ჩადგმა შეუძლებელია, რადგან იგი დაზიანებულია.
addon-install-error-file-access = { $addonName } ვერ ჩაიდგმება, რადგან { -brand-short-name } ვერ ახერხებს საჭირო ფაილის ცვლილებას.
addon-install-error-not-signed = { -brand-short-name } უზღუდავს ამ საიტს დაუმოწმებელი დამატებების ჩადგმას.
addon-install-error-invalid-domain = დამატება { $addonName } ვერ ჩაიდგმება ამ მისამართიდან.
addon-local-install-error-network-failure = დამატების ჩადგმა ვერ მოხერხდა საფაილო სისტემის შეცდომის გამო.
addon-local-install-error-incorrect-hash = დამატების ჩადგმა ვერ მოხერხდა, რადგან განსხვავდება იმ დამატებისგან, რომელსაც { -brand-short-name } მოელოდა.
addon-local-install-error-corrupt-file = დამატების ჩადგმა ვერ მოხერხდა, როგორც ჩანს, დაზიანებულია.
addon-local-install-error-file-access = { $addonName } ვერ ჩაიდგმება, რადგან { -brand-short-name } ვერ ახერხებს საჭირო ფაილის ცვლილებას.
addon-local-install-error-not-signed = ამ დამატების დაყენება ვერ მოხერხდა, რადგან დაუმოწმებელია.
# Variables:
#   $appVersion (String): the application version.
addon-install-error-incompatible = { $addonName } ვერ ჩაიდგმება, რადგან არათავსებადია { -brand-short-name } { $appVersion } ვერსიასთან.
addon-install-error-blocklisted = { $addonName } ვერ ჩაიდგმება, რადგან დიდი ალბათობით საფრთხეს შეუქმნის მდგრადობას და უსაფრთხოებას.
