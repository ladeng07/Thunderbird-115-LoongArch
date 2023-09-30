# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

close-button =
    .aria-label = Закрити
preferences-doc-title2 = Налаштування
category-list =
    .aria-label = Категорії
pane-general-title = Загальні
category-general =
    .tooltiptext = { pane-general-title }
pane-compose-title = Створення
category-compose =
    .tooltiptext = Створення
pane-privacy-title = Приватність і безпека
category-privacy =
    .tooltiptext = Приватність і безпека
pane-chat-title = Чат
category-chat =
    .tooltiptext = Чат
pane-calendar-title = Календар
category-calendar =
    .tooltiptext = Календар
pane-sync-title = Синхронізація
category-sync =
    .tooltiptext = Синхронізація
general-language-and-appearance-header = Мова та зовнішній вигляд
general-incoming-mail-header = Вхідна пошта
general-files-and-attachment-header = Файли та вкладення
general-tags-header = Мітки
general-reading-and-display-header = Читання і відображення
general-updates-header = Оновлення
general-network-and-diskspace-header = Мережа та дисковий простір
general-indexing-label = Індексація
composition-category-header = Написання
composition-attachments-header = Вкладення
composition-spelling-title = Орфографія
compose-html-style-title = HTML-стиль
composition-addressing-header = Адресація
privacy-main-header = Приватність
privacy-passwords-header = Паролі
privacy-junk-header = Спам
collection-header = Збір та використання даних { -brand-short-name }
collection-description = Ми прагнемо надати вам вибір і збирати лише дані, необхідні для роботи й вдосконалення { -brand-short-name }. Ми завжди запитуємо дозвіл перед отриманням особистої інформації.
collection-privacy-notice = Повідомлення про приватність
collection-health-report-telemetry-disabled = Ви заборонили { -vendor-short-name } збирати технічні дані й інформацію про взаємодію. Всі попередні дані буде видалено впродовж 30 днів.
collection-health-report-telemetry-disabled-link = Докладніше
collection-health-report =
    .label = Дозволити { -brand-short-name } надсилати технічні та користувацькі дані в { -vendor-short-name }
    .accesskey = д
collection-health-report-link = Докладніше
# This message is displayed above disabled data sharing options in developer builds
# or builds with no Telemetry support available.
collection-health-report-disabled = Надсилання даних вимкнено для цієї конфігурації збірки
collection-backlogged-crash-reports =
    .label = Дозволити { -brand-short-name } надсилати від вашого імені зібрані звіти про збої
    .accesskey = н
collection-backlogged-crash-reports-link = Докладніше
privacy-security-header = Безпека
privacy-scam-detection-title = Виявлення шахрайства
privacy-anti-virus-title = Антивірус
privacy-certificates-title = Сертифікати
chat-pane-header = Чат
chat-status-title = Стан
chat-notifications-title = Сповіщення
chat-pane-styling-header = Стилі
choose-messenger-language-description = Оберіть мову для показу меню, повідомлень та сповіщень { -brand-short-name }.
manage-messenger-languages-button =
    .label = Вибрати альтернативні мови...
    .accesskey = м
confirm-messenger-language-change-description = Перезапустіть { -brand-short-name } для застосування змін
confirm-messenger-language-change-button = Застосувати й перезапустити
update-setting-write-failure-title = Помилка при збереженні налаштувань оновлення
# Variables:
#   $path (String) - Path to the configuration file
# The newlines between the main text and the line containing the path is
# intentional so the path is easier to identify.
update-setting-write-failure-message =
    У програмі { -brand-short-name } сталася помилка, і цю зміну не було збережено. Зверніть увагу, що для встановлення цього параметра оновлення потрібен дозвіл на запис у файл, наведений нижче. Ви або адміністратор комп’ютера зможете усунути помилку, надавши групі "Користувачі" повний контроль над цим файлом.
    
    Не вдалося записати у файл: { $path }
update-in-progress-title = Оновлення триває
update-in-progress-message = Ви хочете продовжити оновлення { -brand-short-name }?
update-in-progress-ok-button = &Відхилити
# Continue is the cancel button so pressing escape or using a platform standard
# method of closing the UI will not discard the update.
update-in-progress-cancel-button = &Продовжити
account-button = Налаштування облікового запису
open-addons-sidebar-button = Додатки й теми

## OS Authentication dialog

# This message can be seen by trying to add a Primary Password.
primary-password-os-auth-dialog-message-win = Щоб створити головний пароль, введіть свої облікові дані входу для Windows. Це допомагає захистити ваші збережені паролі.
# This message can be seen by trying to add a Primary Password.
# The macOS strings are preceded by the operating system with "Thunderbird is trying to "
# and includes subtitle of "Enter password for the user "xxx" to allow this." These
# notes are only valid for English. Please test in your locale.
primary-password-os-auth-dialog-message-macosx = створити головний пароль
# Don't change this label.
master-password-os-auth-dialog-caption = { -brand-full-name }

## General Tab

focus-search-shortcut =
    .key = f
focus-search-shortcut-alt =
    .key = k
general-legend = Початкова сторінка { -brand-short-name }
start-page-label =
    .label = Показувати початкову сторінку в області перегляду повідомлення під час запуску { -brand-short-name }
    .accesskey = с
location-label =
    .value = Розташування:
    .accesskey = Р
restore-default-label =
    .label = Відновити
    .accesskey = н
default-search-engine = Типовий засіб пошуку
add-web-search-engine =
    .label = Додати…
    .accesskey = о
remove-search-engine =
    .label = Вилучити
    .accesskey = в
add-opensearch-provider-title = Додайте постачальника OpenSearch
add-opensearch-provider-text = Введіть URL-адресу постачальника OpenSearch, який потрібно додати. Або використовуйте пряму URL-адресу файлу опису OpenSearch, або URL-адресу, де його можна автоматично знайти.
adding-opensearch-provider-failed-title = Помилка додавання постачальника OpenSearch
# Variables:
# $url (String) - URL an OpenSearch provider was requested for.
adding-opensearch-provider-failed-text = Не вдалося додати постачальника OpenSearch для { $url }.
minimize-to-tray-label =
    .label = Згортати { -brand-short-name } в область сповіщень
    .accesskey = З
new-message-arrival = Коли надходять нові повідомлення:
mail-play-sound-label =
    .label =
        { PLATFORM() ->
            [macos] Відтворити такий звуковий файл:
           *[other] Відтворити звук
        }
    .accesskey = з
mail-play-button =
    .label = Відтворити
    .accesskey = в
change-dock-icon = Змінити налаштування для піктограми програми
app-icon-options =
    .label = Налаштування піктограми програми…
    .accesskey = л
notification-settings2 = Сигнали й типові звуки можна вимкнути в панелі сповіщень системних налаштувань.
animated-alert-label =
    .label = Показувати сповіщення
    .accesskey = с
customize-alert-label =
    .label = Налаштувати…
    .accesskey = л
biff-use-system-alert =
    .label = Використовувати системне сповіщення
tray-icon-unread-label =
    .label = Показувати піктограму непрочитаних повідомлень в системному лотку
    .accesskey = л
tray-icon-unread-description = Рекомендовано коли використовуються малі кнопки на панелі завдань
mail-system-sound-label =
    .label = Типовий системний звук сповіщення про надходження нових листів
    .accesskey = з
mail-custom-sound-label =
    .label = Використовувати такий звуковий файл
    .accesskey = В
mail-browse-sound-button =
    .label = Огляд…
    .accesskey = О
enable-gloda-search-label =
    .label = Увімкнути глобальний пошук та індексацію
    .accesskey = і
datetime-formatting-legend = Формат дати та часу
language-selector-legend = Мова
allow-hw-accel =
    .label = Використовувати апаратне прискорення, якщо можливо
    .accesskey = и
store-type-label =
    .value = Тип сховища повідомлень для нових облікових записів:
    .accesskey = Т
mbox-store-label =
    .label = Один файл на теку (mbox)
maildir-store-label =
    .label = Один файл на повідомлення (maildir)
scrolling-legend = Прокручування
autoscroll-label =
    .label = Використовувати автоматичне прокручування
    .accesskey = а
smooth-scrolling-label =
    .label = Використовувати плавне прокручування
    .accesskey = п
browsing-gtk-use-non-overlay-scrollbars =
    .label = Завжди показувати смуги прокручування
    .accesskey = м
window-layout-legend = Макет вікна
draw-in-titlebar-label =
    .label = Приховати панель заголовка вікна системи
    .accesskey = х
auto-hide-tabbar-label =
    .label = Автоматичне приховування панелі вкладок
    .accesskey = т
auto-hide-tabbar-description = Приховати панель вкладок, коли відкрита лише одна вкладка
system-integration-legend = Системна інтеграція
always-check-default =
    .label = Завжди перевіряти під час запуску чи { -brand-short-name } типовий поштовий клієнт
    .accesskey = ш
check-default-button =
    .label = Перевірити зараз…
    .accesskey = з
# Note: This is the search engine name for all the different platforms.
# Platforms that don't support it should be left blank.
search-engine-name =
    { PLATFORM() ->
        [macos] Spotlight
        [windows] Пошук Windows
       *[other] { "" }
    }
search-integration-label =
    .label = Дозволити { search-engine-name } шукати повідомлення
    .accesskey = S
config-editor-button =
    .label = Редактор налаштувань
    .accesskey = Р
return-receipts-description = Вкажіть, як { -brand-short-name } має обробляти сповіщення про отримання
return-receipts-button =
    .label = Сповіщення про отримання…
    .accesskey = я
update-app-legend = Оновлення { -brand-short-name }
# Variables:
#   $version (String): version of Thunderbird, e.g. 68.0.1
update-app-version = Версія { $version }
allow-description = Дозволити { -brand-short-name }
automatic-updates-label =
    .label = Автоматично встановлювати оновлення (рекомендовано: поліпшує безпеку)
    .accesskey = А
check-updates-label =
    .label = Перевіряти наявність оновлень, але питати мене чи хочу я їх встановити
    .accesskey = П
update-history-button =
    .label = Показати історію оновлень
    .accesskey = в
use-service =
    .label = Використовувати фонову службу для встановлення оновлень
    .accesskey = ф
cross-user-udpate-warning = Цей параметр застосується для всіх облікових записів Windows та профілів { -brand-short-name }, що використовують це встановлення { -brand-short-name }.
networking-legend = З’єднання
proxy-config-description = Налаштуйте параметри з’єднання { -brand-short-name } з інтернетом
network-settings-button =
    .label = Налаштування…
    .accesskey = Н
offline-legend = Автономний режим
offline-settings = Налаштуйте параметри автономного режиму
offline-settings-button =
    .label = Автономний режим…
    .accesskey = А
diskspace-legend = Дисковий простір
offline-compact-folder =
    .label = Стискати всі теки, якщо це звільнить більш ніж
    .accesskey = в
offline-compact-folder-automatically =
    .label = Питати щоразу перед стисненням
    .accesskey = п
compact-folder-size =
    .value = МБ всього

## Note: The entities use-cache-before and use-cache-after appear on a single
## line in preferences as follows:
## use-cache-before [ textbox for cache size in MB ] use-cache-after

use-cache-before =
    .value = Використовувати до
    .accesskey = и
use-cache-after = МБ обсяг для кешу

##

smart-cache-label =
    .label = Відключити автоматичне керування кешем
    .accesskey = ю
clear-cache-button =
    .label = Очистити зараз
    .accesskey = О
clear-cache-shutdown-label =
    .label = Очистити кеш під час завершення роботи
    .accesskey = ч
fonts-legend = Шрифти й кольори
default-font-label =
    .value = Типовий шрифт:
    .accesskey = Т
default-size-label =
    .value = Розмір:
    .accesskey = Р
font-options-button =
    .label = Додатково…
    .accesskey = к
color-options-button =
    .label = Кольори…
    .accesskey = К
display-width-legend = Звичайні текстові повідомлення
# Note : convert-emoticons-label 'Emoticons' are also known as 'Smileys', e.g. :-)
convert-emoticons-label =
    .label = Показувати смайлики як графіку
    .accesskey = й
display-text-label = При показі цитат у звичайних текстових повідомленнях:
style-label =
    .value = Стиль:
    .accesskey = С
regular-style-item =
    .label = Звичайний
bold-style-item =
    .label = Напівжирний
italic-style-item =
    .label = Курсив
bold-italic-style-item =
    .label = Напівжирний курсив
size-label =
    .value = Розмір:
    .accesskey = Р
regular-size-item =
    .label = Звичайний
bigger-size-item =
    .label = Більший
smaller-size-item =
    .label = Менший
quoted-text-color =
    .label = Колір:
    .accesskey = К
search-handler-table =
    .placeholder = Фільтрувати типи вмісту та дії
type-column-header = Тип вмісту
action-column-header = Дія
save-to-label =
    .label = Зберігати файли до
    .accesskey = З
choose-folder-label =
    .label =
        { PLATFORM() ->
            [macos] Обрати…
           *[other] Огляд…
        }
    .accesskey =
        { PLATFORM() ->
            [macos] О
           *[other] г
        }
always-ask-label =
    .label = Завжди запитувати де зберегти файли
    .accesskey = п
display-tags-text = Мітки використовуються для впорядкування та встановлення пріоритету повідомлень.
new-tag-button =
    .label = Нова…
    .accesskey = Н
edit-tag-button =
    .label = Змінити…
    .accesskey = З
delete-tag-button =
    .label = Вилучити
    .accesskey = В
auto-mark-as-read =
    .label = Автоматично позначати повідомлення як прочитані
    .accesskey = А
mark-read-no-delay =
    .label = Негайно після відкриття
    .accesskey = г
view-attachments-inline =
    .label = Показувати вкладення вбудовано
    .accesskey = к

## Note: This will concatenate to "After displaying for [___] seconds",
## using (mark-read-delay) and a number (seconds-label).

mark-read-delay =
    .label = Після відкриття через
    .accesskey = я
seconds-label = секунд

##

open-msg-label =
    .value = Відкривати повідомлення в:
open-msg-tab =
    .label = Новій вкладці
    .accesskey = в
open-msg-window =
    .label = новому вікні
    .accesskey = н
open-msg-ex-window =
    .label = вже існуючому вікні
    .accesskey = у
close-move-delete =
    .label = Закривати вікно повідомлення після видалення/переміщення
    .accesskey = З
display-name-label =
    .value = Ім’я для показу:
condensed-addresses-label =
    .label = Показуване ім'я для людей з адресної книги
    .accesskey = м

## Compose Tab

forward-label =
    .value = Пересилати повідомлення:
    .accesskey = П
inline-label =
    .label = Всередині листа
as-attachment-label =
    .label = Як вкладення
extension-label =
    .label = додати розширення до імені файлу
    .accesskey = ф

## Note: This will concatenate to "Auto Save every [___] minutes",
## using (auto-save-label) and a number (auto-save-end).

auto-save-label =
    .label = Автоматично зберігати лист кожні
    .accesskey = А
auto-save-end = хвилин

##

warn-on-send-accel-key =
    .label = Запитувати підтвердження під час використання комбінації клавіш для надсилання повідомлення
    .accesskey = З
add-link-previews =
    .label = Додати попередній перегляд посилань під час вставлення URL-адрес
    .accesskey = п
spellcheck-label =
    .label = Перевіряти правопис перед надсиланням
    .accesskey = і
spellcheck-inline-label =
    .label = Перевіряти правопис під час введення
    .accesskey = е
language-popup-label =
    .value = Мова:
    .accesskey = М
download-dictionaries-link = Завантажити додаткові словники
font-label =
    .value = Шрифт:
    .accesskey = Ш
font-size-label =
    .value = Розмір:
    .accesskey = з
default-colors-label =
    .label = Використовувати типові кольори читача
    .accesskey = п
font-color-label =
    .value = Колір тексту:
    .accesskey = т
bg-color-label =
    .value = Колір тла:
    .accesskey = т
restore-html-label =
    .label = Відновити типові значення
    .accesskey = В
default-format-label =
    .label = Використовувати типово формат абзацу замість основного тексту
    .accesskey = б
compose-send-format-title = Формат надсилання
compose-send-automatic-option =
    .label = Автоматично
compose-send-automatic-description = Якщо у повідомленні не використовується стиль, надіслати звичайний текст. В іншому випадку надіслати HTML із резервним варіантом у вигляді звичайного тексту.
compose-send-both-option =
    .label = І HTML, і звичайний текст
compose-send-both-description = Застосунок електронної пошти одержувача визначить, яку версію показати.
compose-send-html-option =
    .label = Лише HTML
compose-send-html-description = Деякі одержувачі можуть не мати змоги прочитати повідомлення без використання резервного варіанту у вигляді звичайного тексту.
compose-send-plain-option =
    .label = Лише звичайний текст
compose-send-plain-description = Деякі стилі будуть перетворені у звичайну альтернативу, тоді як інші функції структури будуть вимкнені.
autocomplete-description = При введенні адреси шукати відповідні адреси у:
ab-label =
    .label = Локальних адресних книгах
    .accesskey = Л
directories-label =
    .label = Сервері каталогів:
    .accesskey = С
directories-none-label =
    .none = Ніякому
edit-directories-label =
    .label = Змінити каталоги…
    .accesskey = З
email-picker-label =
    .label = Автоматично додавати адреси з вихідних листів в:
    .accesskey = А
default-directory-label =
    .value = Типовий початковий каталог у вікні адресної книги:
    .accesskey = к
default-last-label =
    .none = Останній використаний каталог
attachment-label =
    .label = Перевіряти відсутні вкладення
    .accesskey = в
attachment-options-label =
    .label = Ключові слова…
    .accesskey = К
enable-cloud-share =
    .label = Пропонувати хмарне сховище для файлів, розміром понад
cloud-share-size =
    .value = Мб
add-cloud-account =
    .label = Додати…
    .accesskey = о
    .defaultlabel = Додати…
remove-cloud-account =
    .label = Вилучити
    .accesskey = В
find-cloud-providers =
    .value = Знайти більше провайдерів…
cloud-account-description = Додати нову службу зберігання Filelink

## Privacy Tab

mail-content = Вміст пошти
remote-content-label =
    .label = Дозволити віддалений вміст в повідомленнях
    .accesskey = в
exceptions-button =
    .label = Винятки…
    .accesskey = В
remote-content-info =
    .value = Докладніше про питання приватності й віддалений вміст
web-content = Вебвміст
history-label =
    .label = Пам'ятати відвідані мною вебсайти й посилання
    .accesskey = П
cookies-label =
    .label = Приймати куки від сайтів
    .accesskey = к
third-party-label =
    .value = Приймати куки від сторонніх сайтів:
    .accesskey = с
third-party-always =
    .label = Завжди
third-party-never =
    .label = Ніколи
third-party-visited =
    .label = Від відвіданих
keep-label =
    .value = Зберігати доки:
    .accesskey = З
keep-expire =
    .label = не закінчиться термін їх дії
keep-close =
    .label = я не закрию { -brand-short-name }
keep-ask =
    .label = питати кожного разу
cookies-button =
    .label = Показати куки…
    .accesskey = о
do-not-track-label =
    .label = Надішліть вебсайтам сигнал “Не стежити”, якщо ви не хочете, щоб вас відстежували
    .accesskey = с
learn-button =
    .label = Докладніше
dnt-learn-more-button =
    .value = Докладніше
passwords-description = { -brand-short-name } може запам’ятовувати реєстраційну інформацію для всіх ваших облікових записів так, що вам не доведеться вводити її знову.
passwords-button =
    .label = Збережені паролі…
    .accesskey = б
primary-password-description = Головний пароль захищає всі ваші паролі, але вам доведеться вводити його один раз на кожен сеанс.
primary-password-label =
    .label = Використовувати головний пароль
    .accesskey = г
primary-password-button =
    .label = Змінити головний пароль…
    .accesskey = і
forms-primary-pw-fips-title = Зараз ви в режимі FIPS. Для цього режиму необхідно встановити головний пароль.
forms-master-pw-fips-desc = Не вдалося змінити пароль
junk-description = Налаштуйте загальні параметри спам-фільтрів. Специфічні для облікових записів параметри можуть бути змінені в налаштуваннях облікового запису.
junk-label =
    .label = Коли я позначаю повідомлення як спам:
    .accesskey = я
junk-move-label =
    .label = Перемістити в теку «Спам»
    .accesskey = т
junk-delete-label =
    .label = Видалити
    .accesskey = л
junk-read-label =
    .label = Позначити такі повідомлення прочитаними
    .accesskey = ч
junk-log-label =
    .label = Увімкнути журнал роботи адаптивного анти-спам фільтра
    .accesskey = ж
junk-log-button =
    .label = Показати журнал
    .accesskey = к
reset-junk-button =
    .label = Скинути дані тренувань
    .accesskey = С
phishing-description = { -brand-short-name } може аналізувати повідомлення на предмет шахрайства, виявляючи усталені методи обману.
phishing-label =
    .label = Повідомляти мене, якщо я читаю повідомлення схоже на шахрайське
    .accesskey = П
antivirus-description = { -brand-short-name } може полегшити роботу антивірусу при перевірці вхідних листів на наявність вірусів перед тим, як зберегти їх в поштові теки.
antivirus-label =
    .label = Дозволити антивірусу поміщати в карантин окремі вхідні повідомлення
    .accesskey = Д
certificate-description = Коли сервер запитує мій персональний сертифікат:
certificate-auto =
    .label = Вибрати автоматично
    .accesskey = а
certificate-ask =
    .label = Питати щоразу
    .accesskey = П
ocsp-label =
    .label = Запитувати у серверів OCSP підтвердження поточного стану сертифікатів
    .accesskey = З
certificate-button =
    .label = Керування сертифікатами…
    .accesskey = К
security-devices-button =
    .label = Пристрої безпеки…
    .accesskey = з
email-e2ee-header = Наскрізне шифрування електронної пошти
account-settings = Налаштування облікового запису
email-e2ee-enable-info = Налаштуйте облікові записи електронної пошти та ідентичності для наскрізного шифрування в налаштуваннях облікового запису.
email-e2ee-automatism = Автоматичне шифрування
email-e2ee-automatism-pre =
    { -brand-short-name } може допомогти, автоматично вмикаючи або вимикаючи шифрування під час створення електронного листа.
    Автоматичне ввімкнення/вимкнення залежить від наявності дійсних і погоджених ключів або сертифікатів кореспондентів.
email-e2ee-auto-on =
    .label = Автоматично вмикати шифрування, коли це можливо
email-e2ee-auto-off =
    .label = Автоматично вимикати шифрування, коли одержувачі змінюються і шифрування стає неможливим
email-e2ee-auto-off-notify =
    .label = Показувати сповіщення щоразу, коли автоматично вимикається шифрування
email-e2ee-automatism-post =
    Автоматичні рішення можна перевизначити, увімкнувши або вимкнувши шифрування вручну під час написання повідомлення.
    Примітка: шифрування завжди вмикається автоматично під час відповіді на зашифроване повідомлення.

## Chat Tab

startup-label =
    .value = Коли { -brand-short-name } запускається:
    .accesskey = з
offline-label =
    .label = Тримати мої чатові облікові записи в офлайні
auto-connect-label =
    .label = Під'єднати мої облікові записи автоматично

## Note: idle-label is displayed first, then there's a field where the user
## can enter a number, and itemTime is displayed at the end of the line.
## The translations of the idle-label and idle-time-label parts don't have
## to mean the exact same thing as in English; please try instead to
## translate the whole sentence.

idle-label =
    .label = Дозволити моїм контактам знати, що я бездіяльний після
    .accesskey = я
idle-time-label = хвилин неактивності

##

away-message-label =
    .label = та встановлювати мені статус Відійшов із повідомленням статусу:
    .accesskey = В
send-typing-label =
    .label = Надсилати сповіщення про введення в розмовах
    .accesskey = н
notification-label = Коли прибувають направлені вам повідомлення:
show-notification-label =
    .label = Показувати сповіщення:
    .accesskey = о
notification-all =
    .label = з ім'ям відправника і переглядом повідомлення
notification-name =
    .label = лише з ім'ям відправника
notification-empty =
    .label = без жодної інформації
notification-type-label =
    .label =
        { PLATFORM() ->
            [macos] Анімація піктограми в док
           *[other] Миготіння на панелі завдань
        }
    .accesskey =
        { PLATFORM() ->
            [macos] я
           *[other] г
        }
chat-play-sound-label =
    .label = Відтворювати звук
    .accesskey = з
chat-play-button =
    .label = Відтворити
    .accesskey = и
chat-system-sound-label =
    .label = Типовий системний звук для нової пошти
    .accesskey = Т
chat-custom-sound-label =
    .label = Використовувати такий звуковий файл
    .accesskey = а
chat-browse-sound-button =
    .label = Огляд…
    .accesskey = л
theme-label =
    .value = Тема:
    .accesskey = Т
style-mail =
    .label = { -brand-short-name }
style-bubbles =
    .label = Бульбашки
style-dark =
    .label = Темна
style-paper =
    .label = Аркуші паперу
style-simple =
    .label = Проста
preview-label = Попередній перегляд:
no-preview-label = Попередній перегляд недоступний
no-preview-description = Ця тема недоступна (вимкнений додаток, безпечний режим, …).
chat-variant-label =
    .value = Варіант:
    .accesskey = В
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
    .placeholder = Знайти в налаштуваннях

## Settings UI Search Results

search-results-header = Результати пошуку
# `<span data-l10n-name="query"></span>` will be replaced by the search term.
search-results-empty-message2 =
    { PLATFORM() ->
        [windows] Перепрошуємо! В налаштуваннях немає результатів для “<span data-l10n-name="query"></span>”.
       *[other] Перепрошуємо! В налаштуваннях немає результатів для “<span data-l10n-name="query"></span>”.
    }
search-results-help-link = Потрібна допомога? Відвідайте <a data-l10n-name="url">Підтримку { -brand-short-name }</a>

## Sync Tab

sync-signedout-caption = Візьміть свій інтернет з собою
sync-signedout-description = Синхронізуйте свої облікові записи, адресні книги, календарі, додатки та налаштування на всіх пристроях.
# Note: "Sync" represents the Firefox Sync product so it shouldn't be translated.
sync-signedout-account-signin-btn = Увійти до синхронізації…
sync-pane-header = Синхронізація
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-pane-email-not-verified = “{ $userEmail }” не підтверджено.
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-signedin-login-failure = Увійдіть, щоб повторно під'єднати “{ $userEmail }”
sync-pane-resend-verification = Повторно надіслати підтвердження
sync-pane-sign-in = Увійти
sync-pane-remove-account = Видалити обліковий запис
sync-pane-edit-photo =
    .title = Змінити зображення профілю
sync-pane-manage-account = Керувати обліковим записом
sync-pane-sign-out = Вийти…
sync-pane-device-name-title = Назва пристрою
sync-pane-change-device-name = Змінити назву пристрою
sync-pane-cancel = Скасувати
sync-pane-save = Зберегти
sync-pane-show-synced-header-on = Синхронізацію ввімкнено
sync-pane-show-synced-header-off = Синхронізацію вимкнено
sync-pane-sync-now = Синхронізувати зараз
sync-panel-sync-now-syncing = Синхронізація…
show-synced-list-heading = Зараз ви синхронізуєте такі елементи:
show-synced-learn-more = Докладніше…
show-synced-item-account = Облікові записи електронної пошти
show-synced-item-address = Адресні книги
show-synced-item-calendar = Календарі
show-synced-item-identity = Особисті дані
show-synced-item-passwords = Паролі
show-synced-change = Змінити…
synced-acount-item-server-config = Конфігурація сервера
synced-acount-item-filters = Фільтри
synced-acount-item-keys = OpenPGP - S/MIME
sync-disconnected-text = Синхронізуйте свої облікові записи електронної пошти, адресні книги, календарі та особисті дані на всіх пристроях.
sync-disconnected-turn-on-sync = Увімкнути синхронізацію…
