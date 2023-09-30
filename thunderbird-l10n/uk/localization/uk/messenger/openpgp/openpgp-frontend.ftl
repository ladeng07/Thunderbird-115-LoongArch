# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

openpgp-manage-keys-openpgp-cmd =
    .label = Менеджер ключів OpenPGP
    .accesskey = O
openpgp-ctx-decrypt-open =
    .label = Розшифрувати та відкрити
    .accesskey = Р
openpgp-ctx-decrypt-save =
    .label = Розшифрувати та зберегти як…
    .accesskey = ф
openpgp-ctx-import-key =
    .label = Імпортувати ключ OpenPGP
    .accesskey = п
openpgp-ctx-verify-att =
    .label = Підтвердити підпис
    .accesskey = і
openpgp-has-sender-key = У цьому повідомленні стверджується, що воно містить відкритий ключ відправника OpenPGP.
# Variables:
# $email (String) - Email address with the problematic public key.
openpgp-be-careful-new-key = Попередження: новий відкритий ключ OpenPGP у цьому повідомленні відрізняється від відкритих ключів, які ви раніше прийняли для { $email }.
openpgp-import-sender-key =
    .label = Імпортувати…
openpgp-search-keys-openpgp =
    .label = Дослідити ключ OpenPGP
openpgp-missing-signature-key = Це повідомлення підписано ключем, якого у вас ще немає.
openpgp-search-signature-key =
    .label = Дослідити…
# Don't translate the terms "OpenPGP" and "MS-Exchange"
openpgp-broken-exchange-opened = Це повідомлення OpenPGP, яке, очевидно, було пошкоджено MS-Exchange, і його неможливо відновити, оскільки його було відкрито з локального файлу. Копіюйте повідомлення до теки пошти, щоб спробувати виконати автоматичне відновлення.
openpgp-broken-exchange-info = Схоже, що це повідомлення з OpenPGP пошкоджено службою MS-Exchange. Якщо вміст повідомлення показується неправильно, ви можете спробувати автоматичне відновлення.
openpgp-broken-exchange-repair =
    .label = Зневадити повідомлення
openpgp-broken-exchange-wait = Зачекайте, будь ласка…
openpgp-has-nested-encrypted-parts = Це повідомлення містить додаткові зашифровані частини.
openpgp-show-encrypted-parts = Розшифрувати й показати
openpgp-cannot-decrypt-because-mdc =
    Це повідомлення захищено застарілим і вразливим механізмом.
    Його могли змінити під час доставлення для викрадення його вмісту.
    Щоб запобігти цьому ризику, вміст не показано.
openpgp-cannot-decrypt-because-missing-key = Таємний ключ, необхідний для розшифрування цього повідомлення, недоступний.
openpgp-partially-signed =
    Лише деякі частини цього повідомлення підписано за допомогою OpenPGP.
    Якщо натиснути кнопку підтвердження, незахищені частини буде приховано і показано стан цифрового підпису.
openpgp-partially-encrypted =
    Лише деякі частини цього повідомлення підписано за допомогою OpenPGP.
    Доступні для читання частини повідомлення, які вже показано, незахищені.
    Якщо натиснути кнопку розшифрування, буде показано вміст захищених частин.
openpgp-reminder-partial-display = Нагадування: Повідомлення, показане далі, є лише частиною всього повідомлення.
openpgp-partial-verify-button = Підтвердити
openpgp-partial-decrypt-button = Розшифрувати
openpgp-unexpected-key-for-you = Попередження: це повідомлення містить невідомий ключ OpenPGP, який посилається на одну з ваших власних адрес електронної пошти. Якщо це не один із ваших власних ключів, це може бути спробою обдурити інших кореспондентів.
