# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Прикажи брзо филтрирање
quick-filter-button-label = Брзо филтрирање
thread-pane-header-display-button =
    .title = Опције приказа списка порука
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } порука
        [few] { $count } поруке
       *[other] { $count } порука
    }
thread-pane-header-context-table-view =
    .label = Приказ табеле
thread-pane-header-context-cards-view =
    .label = Приказ картица
thread-pane-header-context-hide =
    .label = Сакриј заглавље списка порука

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Задржи примену филтера приликом мењања између фасцикли
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Прикажи само непрочитане поруке
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Непрочитано
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Прикажи само поруке са звездицом
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Са звездицом
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Прикажи само поруке од особа из вашег именика
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Контакт
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Прикажи само поруке са ознакама на себи
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Ознаке
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Прикажи само поруке са прилозима
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Прилог
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Нема резултата
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } порука
        [few] { $count } порука
       *[other] { $count } порука
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
    .placeholder = Филтрирај ове поруке <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Режим филтрирања ознака
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Било шта од
    .title = Барем један од услова изабраних ознака треба да се испуни
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Све од
    .title = Сви од услова изабраних ознака треба да се испуне
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Филтрирај поруке по:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Пошиљаоцу
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Примаоцима
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Теми
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Телу
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Настави претраживање по свим фасциклама
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Притисните још једном „Ентер“ да бисте наставили вашу претрагу за: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Добави поруке
folder-pane-get-all-messages-menuitem =
    .label = Добави све нове поруке
    .accesskey = Д
folder-pane-write-message-button = Нова порука
    .title = Саставите нову поруку
folder-pane-more-menu-button =
    .title = Опције панела фасцикле
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Режими фасцикле
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Прикажи „Добави поруке”
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Прикажи „Нова порука”
folder-pane-header-context-hide =
    .label = Сакриј заглавље површи фасцикли
folder-pane-show-total-toggle =
    .label = Прикажи укупан збир порука
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Прикажи величину фасцикле
folder-pane-header-hide-local-folders =
    .label = Сакриј локалне фасцикле
folder-pane-mode-context-toggle-compact-mode =
    .label = Компактни преглед
    .accesskey = К

## Message thread pane

threadpane-column-header-select =
    .title = Изаберите/поништите све поруке
threadpane-column-header-select-all =
    .title = Изабери све поруке
threadpane-column-header-deselect-all =
    .title = Поништи избор свих порука
threadpane-column-label-select =
    .label = Одаберите поруке
threadpane-column-header-thread =
    .title = Промени стање приказа нити порука
threadpane-column-label-thread =
    .label = Нит
threadpane-column-header-flagged =
    .title = Поређај по звездици
threadpane-column-label-flagged =
    .label = Са звездицом
threadpane-flagged-cell-label = Са звездицом
threadpane-column-header-attachments =
    .title = Поређај по прилозима
threadpane-column-label-attachments =
    .label = Прилози
threadpane-attachments-cell-label = Прилози
threadpane-column-header-spam =
    .title = Поређај по непожељности
threadpane-column-label-spam =
    .label = Непожељно
threadpane-spam-cell-label = Непожељно
threadpane-column-header-unread-button =
    .title = Поређај по стању прочитаности
threadpane-column-header-sender = Шаље
    .title = Поређај по пошиљаоцу
threadpane-column-label-sender =
    .label = Шаље
threadpane-column-header-recipient = Прималац
    .title = Поређај по примаоцу
threadpane-column-label-recipient =
    .label = Прималац
threadpane-column-header-correspondents = Дописници
    .title = Поређај по дописницима
threadpane-column-label-correspondents =
    .label = Дописници
threadpane-column-header-subject = Наслов
    .title = Поређај по наслову
threadpane-column-label-subject =
    .label = Наслов
threadpane-column-header-date = Датум
    .title = Поређај по датуму
threadpane-column-label-date =
    .label = Датум
threadpane-column-header-received = Примљено
    .title = Поређај по датуму пријема
threadpane-column-label-received =
    .label = Примљено
threadpane-column-header-status = Стање
    .title = Поређај на основу стања
threadpane-column-label-status =
    .label = Стање
threadpane-column-header-size = Величина
    .title = Поређај по величини
threadpane-column-label-size =
    .label = Величина
threadpane-column-header-tags = Ознаке
    .title = Поређај по ознакама
threadpane-column-label-tags =
    .label = Ознаке
threadpane-column-header-account = Налог
    .title = Поређај по налогу
threadpane-column-label-account =
    .label = Налог
threadpane-column-header-priority = Првенство
    .title = Поређај по првенству
threadpane-column-label-priority =
    .label = Првенство
threadpane-column-header-unread = Непрочитано
    .title = Број непрочитаних порука у овој нити
threadpane-column-label-unread =
    .label = Непрочитано
threadpane-column-header-total = Укупно
    .title = Укупан број порука у овој нити
threadpane-column-label-total =
    .label = Укупно
threadpane-column-header-location = Локација
    .title = Поређај по месту
threadpane-column-label-location =
    .label = Локација
threadpane-column-header-id = Редослед пријема
    .title = Поређај по редоследу пријема
threadpane-column-label-id =
    .label = Редослед пријема
threadpane-column-header-delete =
    .title = Обриши поруку
threadpane-column-label-delete =
    .label = Обриши

## Message state variations

threadpane-message-new =
    .alt = Показивач нове поруке
    .title = Нова порука
apply-columns-to-menu =
    .label = Примени колоне на…
apply-current-view-to-menu =
    .label = Примени тренутни приказ на…
apply-current-view-to-folder =
    .label = Фасциклу…
apply-current-view-to-folder-children =
    .label = Фасциклу и њен садржај…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Применити измене?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Применити колоне тренутне фасцикле на { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Применити колоне тренутне фасцикле на { $name } и њену децу?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Применити приказ тренутне фасцикле на { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Применити тренутни приказ фасцикле на { $name } и потомке?
