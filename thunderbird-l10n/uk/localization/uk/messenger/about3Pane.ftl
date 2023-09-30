# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Перемкнути панель швидкого фільтрування
quick-filter-button-label = Швидкий фільтр
thread-pane-header-display-button =
    .title = Параметри показу списку повідомлень
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } повідомлення
        [few] { $count } повідомлення
       *[many] { $count } повідомлень
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } вибрано
        [few] { $count } вибрано
       *[many] { $count } вибрано
    }
thread-pane-header-context-table-view =
    .label = Подання таблицею
thread-pane-header-context-cards-view =
    .label = Подання картками
thread-pane-header-context-hide =
    .label = Сховати заголовок списку повідомлень

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Застосовувати фільтри і після зміни теки
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Меню швидкого фільтра
quick-filter-bar-dropdown-unread =
    .label = Непрочитані
quick-filter-bar-dropdown-starred =
    .label = З зірочкою
quick-filter-bar-dropdown-inaddrbook =
    .label = Контакти
quick-filter-bar-dropdown-tags =
    .label = Мітки
quick-filter-bar-dropdown-attachment =
    .label = Вкладення
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Показувати лише нечитані повідомлення
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Нечитані
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Показувати лише повідомлення з зірочкою
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = З зірочкою
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Показувати повідомлення лише від людей з вашої адресної книги
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Контакт
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Показувати повідомлення лише з мітками
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Мітки
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Показувати повідомлення лише з вкладеннями
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Вкладення
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Не знайдено
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } повідомлення
        [few] { $count } повідомлення
       *[many] { $count } повідомлень
    }
# Keyboard shortcut for the text search box.
# This should match quick-filter-bar-show in messenger.ftl.
quick-filter-bar-textbox-shortcut =
    { PLATFORM() ->
        [macos] ⇧ ⌘ K
       *[other] Ctrl+Shift+K
    }
# This is the empty text for the text search box.
# The goal is to convey to the user that typing in the box will filter
# the messages and that there is a hotkey they can press to get to the
# box faster.
quick-filter-bar-textbox =
    .placeholder = Фільтрувати ці повідомлення <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Режим фільтрування за міткою
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Будь-який з
    .title = Повинен збігатися принаймні один з обраних критеріїв
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Усі з
    .title = Повинні збігатися всі обрані критерії
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Фільтрувати повідомлення за:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Відправником
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Отримувачами
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Темою
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Змістом
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Продовжити цей пошук у всіх теках
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Натисніть ‘Enter’ ще раз щоб продовжити ваш пошук: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Отримати повідомлення
folder-pane-get-all-messages-menuitem =
    .label = Отримати всі нові повідомлення
    .accesskey = О
folder-pane-write-message-button = Нове повідомлення
    .title = Написати нове повідомлення
folder-pane-more-menu-button =
    .title = Параметри панелі тек
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Режими тек
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Показати “Отримати повідомлення”
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Показати “Нове повідомлення”
folder-pane-header-context-hide =
    .label = Сховати заголовок панелі тек
folder-pane-show-total-toggle =
    .label = Показати загальну кількість повідомлень
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Показати розмір теки
folder-pane-header-hide-local-folders =
    .label = Сховати локальні теки
folder-pane-mode-context-button =
    .title = Параметри режиму тек
folder-pane-mode-context-toggle-compact-mode =
    .label = Компактний вигляд
    .accesskey = м
folder-pane-mode-move-up =
    .label = Вгору
folder-pane-mode-move-down =
    .label = Вниз
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] 1 непрочитане повідомлення
        [few] { $count } непрочитані повідомлення
       *[many] { $count } непрочитаних повідомлень
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] Всього 1 повідомлення
        [few] Всього { $count } повідомлення
       *[many] Всього { $count } повідомлень
    }

## Message thread pane

threadpane-column-header-select =
    .title = Увімкніть, щоб вибрати всі повідомлення
threadpane-column-header-select-all =
    .title = Вибрати всі повідомлення
threadpane-column-header-deselect-all =
    .title = Скасувати вибір усіх повідомлень
threadpane-column-label-select =
    .label = Вибрати повідомлення
threadpane-column-header-thread =
    .title = Перемкнути повідомлення за розмовами
threadpane-column-label-thread =
    .label = Розмова
threadpane-column-header-flagged =
    .title = Сортувати за зірочками
threadpane-column-label-flagged =
    .label = З зіркою
threadpane-flagged-cell-label = З зіркою
threadpane-column-header-attachments =
    .title = Сортувати за вкладеннями
threadpane-column-label-attachments =
    .label = Вкладення
threadpane-attachments-cell-label = Вкладення
threadpane-column-header-spam =
    .title = Сортувати за станом спаму
threadpane-column-label-spam =
    .label = Спам
threadpane-spam-cell-label = Спам
threadpane-column-header-unread-button =
    .title = Сортувати за станом прочитання
threadpane-column-label-unread-button =
    .label = Стан прочитання
threadpane-read-cell-label = Прочитано
threadpane-unread-cell-label = Непрочитані
threadpane-column-header-sender = Від
    .title = Сортувати за відправником
threadpane-column-label-sender =
    .label = Від
threadpane-column-header-recipient = Одержувачі
    .title = Сортувати за отримувачем
threadpane-column-label-recipient =
    .label = Одержувачі
threadpane-column-header-correspondents = Кореспонденти
    .title = Сортувати за кореспондентами
threadpane-column-label-correspondents =
    .label = Кореспонденти
threadpane-column-header-subject = Тема
    .title = Сортувати за темою
threadpane-column-label-subject =
    .label = Тема
threadpane-column-header-date = Дата
    .title = Сортувати за датою
threadpane-column-label-date =
    .label = Дата
threadpane-column-header-received = Отримано
    .title = Сортувати за датою отримання
threadpane-column-label-received =
    .label = Отримано
threadpane-column-header-status = Стан
    .title = Сортувати за статусом
threadpane-column-label-status =
    .label = Стан
threadpane-column-header-size = Розмір
    .title = Сортувати за розміром
threadpane-column-label-size =
    .label = Розмір
threadpane-column-header-tags = Мітки
    .title = Сортувати за мітками
threadpane-column-label-tags =
    .label = Мітки
threadpane-column-header-account = Обліковий запис
    .title = Сортувати за обліковим записом
threadpane-column-label-account =
    .label = Обліковий запис
threadpane-column-header-priority = Важливість
    .title = Сортувати за пріоритетом
threadpane-column-label-priority =
    .label = Важливість
threadpane-column-header-unread = Не прочитано
    .title = Кількість непрочитаних повідомлень в розмові
threadpane-column-label-unread =
    .label = Не прочитано
threadpane-column-header-total = Всього
    .title = Загальна кількість повідомлень в розмові
threadpane-column-label-total =
    .label = Всього
threadpane-column-header-location = Розташування
    .title = Сортувати за розташуванням
threadpane-column-label-location =
    .label = Розташування
threadpane-column-header-id = Порядок отримання
    .title = Сортувати в порядку отримання
threadpane-column-label-id =
    .label = Порядок отримання
threadpane-column-header-delete =
    .title = Видалити повідомлення
threadpane-column-label-delete =
    .label = Видалити

## Message state variations

threadpane-message-new =
    .alt = Покажчик нового повідомлення
    .title = Нове повідомлення
threadpane-message-replied =
    .alt = Покажчик відповіді
    .title = Відповідь надіслано
threadpane-message-redirected =
    .alt = Покажчик перенаправлень
    .title = Повідомлення перенаправлено
threadpane-message-forwarded =
    .alt = Покажчик пересилань
    .title = Повідомлення переслано
threadpane-message-replied-forwarded =
    .alt = Покажчик відповіді й пересилань
    .title = Відповідь надіслано й переслано
threadpane-message-replied-redirected =
    .alt = Покажчик відповіді й перенаправлень
    .title = Відповідь надіслано й перенаправлено
threadpane-message-forwarded-redirected =
    .alt = Покажчик пересилань і перенаправлень
    .title = Повідомлення переслано й перенаправлено
threadpane-message-replied-forwarded-redirected =
    .alt = Покажчик відповіді, пересилань і перенаправлень
    .title = Відповідь надіслано, переслано і перенаправлено
apply-columns-to-menu =
    .label = Застосувати стовпчики до…
apply-current-view-to-menu =
    .label = Застосувати поточний вигляд до…
apply-current-view-to-folder =
    .label = Теки…
apply-current-view-to-folder-children =
    .label = Теки та вкладених тек…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Застосувати зміни?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Застосувати стовчики поточної теки до { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Застосувати стовчики поточної теки до { $name } та її під-тек?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Застосувати вигляд поточної теки до { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Застосувати вигляд поточної теки до { $name } і вкладених в неї тек?
