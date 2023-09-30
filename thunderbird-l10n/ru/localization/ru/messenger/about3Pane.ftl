# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Включить/выключить панель быстрого фильтра
quick-filter-button-label = Быстрый фильтр
thread-pane-header-display-button =
    .title = Настройки отображения списка сообщений
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } сообщение
        [few] { $count } сообщения
       *[many] { $count } сообщений
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } выбрано
        [few] { $count } выбраны
       *[many] { $count } выбрано
    }
thread-pane-header-context-table-view =
    .label = В виде таблицы
thread-pane-header-context-cards-view =
    .label = В виде карт
thread-pane-header-context-hide =
    .label = Скрыть заголовок списка сообщений

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Держать фильтры применёнными при переключении папок
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Меню быстрого фильтра
quick-filter-bar-dropdown-unread =
    .label = Непрочитанные
quick-filter-bar-dropdown-starred =
    .label = Звёздочка
quick-filter-bar-dropdown-inaddrbook =
    .label = Контакт
quick-filter-bar-dropdown-tags =
    .label = Метки
quick-filter-bar-dropdown-attachment =
    .label = Вложения
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Показывать только непрочитанные сообщения
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Непрочитанные
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Показывать только сообщения, отмеченные звёздочкой
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Звёздочка
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Показывать только сообщения от людей в вашей адресной книге
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Контакт
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Показывать только сообщения с метками
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Метки
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Показывать только сообщения со вложениями
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Вложения
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Не найдено
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } сообщение
        [few] { $count } сообщения
       *[many] { $count } сообщений
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
    .placeholder = Фильтровать эти сообщения <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Режим тегов фильтрации
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Любое из
    .title = Должны подходить под хотя бы один из выбранных тегов с критерием
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Все из
    .title = Должны подходить под все выбранные теги с критериями
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Фильтр сообщений по:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Отправителю
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Получателям
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Теме
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Телу
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Продолжить этот поиск по всем папкам
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Нажмите ещё раз ‘Enter’ для продолжения поиска по: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Получить сообщения
folder-pane-get-all-messages-menuitem =
    .label = Все новые сообщения
    .accesskey = с
folder-pane-write-message-button = Создать
    .title = Создать новое сообщение
folder-pane-more-menu-button =
    .title = Настройки панели папок
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Режимы папок
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Показать «Получить сообщения»
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Показать «Cоздать сообщение»
folder-pane-header-context-hide =
    .label = Скрыть заголовок панели папок
folder-pane-show-total-toggle =
    .label = Показать общее количество сообщений
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Показать размер папки
folder-pane-header-hide-local-folders =
    .label = Скрыть локальные папки
folder-pane-mode-context-button =
    .title = Настройки режима папок
folder-pane-mode-context-toggle-compact-mode =
    .label = Компактный вид
    .accesskey = о
folder-pane-mode-move-up =
    .label = Вверх
folder-pane-mode-move-down =
    .label = Вниз
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] { $count } непрочитанное сообщение
        [few] { $count } непрочитанных сообщения
       *[many] { $count } непрочитанных сообщений
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] Всего { $count } сообщение
        [few] Всего { $count } сообщения
       *[many] Всего { $count } сообщений
    }

## Message thread pane

threadpane-column-header-select =
    .title = Выделить/Снять выделение всех сообщений
threadpane-column-header-select-all =
    .title = Выбрать все сообщения
threadpane-column-header-deselect-all =
    .title = Отменить выбор всех сообщений
threadpane-column-label-select =
    .label = Выберите сообщения
threadpane-column-header-thread =
    .title = Переключить просмотр сообщений по обсуждениям
threadpane-column-label-thread =
    .label = Обсуждение
threadpane-column-header-flagged =
    .title = Упорядочивать по наличию звёздочки
threadpane-column-label-flagged =
    .label = Звёздочка
threadpane-flagged-cell-label = Звёздочка
threadpane-column-header-attachments =
    .title = Упорядочивать по наличию вложений
threadpane-column-label-attachments =
    .label = Вложения
threadpane-attachments-cell-label = Вложения
threadpane-column-header-spam =
    .title = Сортировать по статусу спама
threadpane-column-label-spam =
    .label = Спам
threadpane-spam-cell-label = Спам
threadpane-column-header-unread-button =
    .title = Сортировать по статусу чтения
threadpane-column-label-unread-button =
    .label = Статус прочтения
threadpane-read-cell-label = Прочитано
threadpane-unread-cell-label = Непрочитано
threadpane-column-header-sender = От
    .title = Упорядочивать по автору
threadpane-column-label-sender =
    .label = От
threadpane-column-header-recipient = Адресат
    .title = Упорядочивать по получателю
threadpane-column-label-recipient =
    .label = Адресат
threadpane-column-header-correspondents = Отправители
    .title = Упорядочивать по отправителям
threadpane-column-label-correspondents =
    .label = Отправители
threadpane-column-header-subject = Тема
    .title = Упорядочивать по теме
threadpane-column-label-subject =
    .label = Тема
threadpane-column-header-date = Дата
    .title = Упорядочивать по дате отправки
threadpane-column-label-date =
    .label = Дата
threadpane-column-header-received = Получено
    .title = Упорядочивать по дате получения
threadpane-column-label-received =
    .label = Получено
threadpane-column-header-status = Состояние
    .title = Упорядочивать по состоянию
threadpane-column-label-status =
    .label = Состояние
threadpane-column-header-size = Размер
    .title = Упорядочивать по размеру
threadpane-column-label-size =
    .label = Размер
threadpane-column-header-tags = Метка
    .title = Упорядочивать по меткам
threadpane-column-label-tags =
    .label = Метка
threadpane-column-header-account = Учётная запись
    .title = Упорядочивать по учётной записи
threadpane-column-label-account =
    .label = Учётная запись
threadpane-column-header-priority = Важность
    .title = Упорядочивать по важности
threadpane-column-label-priority =
    .label = Важность
threadpane-column-header-unread = Не прочитано
    .title = Число непрочитанных сообщений в обсуждении
threadpane-column-label-unread =
    .label = Не прочитано
threadpane-column-header-total = Всего
    .title = Общее число сообщений в обсуждении
threadpane-column-label-total =
    .label = Всего
threadpane-column-header-location = Расположение
    .title = Упорядочивать по расположению
threadpane-column-label-location =
    .label = Расположение
threadpane-column-header-id = Порядок получения
    .title = Упорядочивать по порядку получения
threadpane-column-label-id =
    .label = Порядок получения
threadpane-column-header-delete =
    .title = Удалить сообщение
threadpane-column-label-delete =
    .label = Удалить

## Message state variations

threadpane-message-new =
    .alt = Индикатор нового сообщения
    .title = Новое сообщение
threadpane-message-replied =
    .alt = Индикатор ответа
    .title = На сообщение отправлен ответ
threadpane-message-redirected =
    .alt = Индикатор перенаправления
    .title = Сообщение было перенаправлено
threadpane-message-forwarded =
    .alt = Индикатор пересылки
    .title = Сообщение было переслано
threadpane-message-replied-forwarded =
    .alt = Индикатор ответа и пересылки
    .title = На сообщение был отправлен ответ и оно было переслано
threadpane-message-replied-redirected =
    .alt = Индикатор ответа и перенаправления
    .title = На сообщение был отправлен ответ и оно было перенаправлено
threadpane-message-forwarded-redirected =
    .alt = Индикатор пересылки и перенаправления
    .title = Сообщение было переслано и перенаправлено
threadpane-message-replied-forwarded-redirected =
    .alt = Индикатор ответа, пересылки и перенаправления
    .title = На сообщение был отправлен ответ и оно было переслано и перенаправлено
apply-columns-to-menu =
    .label = Применить набор колонок к…
apply-current-view-to-menu =
    .label = Применить текущий вид к…
apply-current-view-to-folder =
    .label = Папке…
apply-current-view-to-folder-children =
    .label = Папке и вложенным папкам…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Применить изменения?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Применить набор колонок текущей папки к { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Применить набор колонок текущей папки к { $name } и её вложенным папкам?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Применить вид текущей папки к { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Применить вид текущей папки к { $name } и вложенным в неё папкам?
