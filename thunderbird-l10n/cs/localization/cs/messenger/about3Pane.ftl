# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Přepnout panel Rychlý filtr
quick-filter-button-label = Rychlý filtr
thread-pane-header-display-button =
    .title = Možnosti zobrazení seznamu zpráv
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] zpráva
        [few] zprávy
        [many] zpráv
       *[other] zpráv
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] Vybrána { $count }
        [few] Vybrány { $count }
        [many] Vybráno { $count }
       *[other] Vybráno { $count }
    }
thread-pane-header-context-table-view =
    .label = Zobrazení tabulky
thread-pane-header-context-cards-view =
    .label = Zobrazení karet
thread-pane-header-context-hide =
    .label = Skrýt hlavičku seznamu zpráv

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Při změně složky ponechat zvolený filtr
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Nabídka rychlého filtru
quick-filter-bar-dropdown-unread =
    .label = Nepřečteno
quick-filter-bar-dropdown-starred =
    .label = S hvězdičkou
quick-filter-bar-dropdown-inaddrbook =
    .label = Kontakt
quick-filter-bar-dropdown-tags =
    .label = Štítky
quick-filter-bar-dropdown-attachment =
    .label = Příloha
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Zobrazí pouze nepřečtené zprávy
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Nepřečtené
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Zobrazí pouze zprávy s hvězdičkou
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = S hvězdičkou
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Zobrazí pouze zprávy od lidí v kontaktech
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Kontakt
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Zobrazí pouze zprávy s přiřazeným štítkem
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Štítky
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Zobrazí pouze zprávy s přílohami
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Příloha
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Žádné výsledky
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } zpráva
        [few] { $count } zprávy
       *[other] { $count } zpráv
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
    .placeholder = Filtrovat tyto zprávy <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Režim filtrace dle štítku
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Libovolný z
    .title = Pro splnění kritéria musí být obsažen alespoň jeden ze zvolených štítků
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Všechny z
    .title = Pro splnění kritéria musí být obsaženy všechny ze zvolených štítků
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Filtrovat zprávy dle:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Odesílatel
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Příjemce
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Předmět
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Tělo
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Pokračovat s tímto hledáním napříč všemi složkami
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Opětovným stisknutím ‘Enter’ pokračujte v hledání: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Přijmout zprávy
folder-pane-get-all-messages-menuitem =
    .label = Přijmout všechny nové zprávy
    .accesskey = P
folder-pane-write-message-button = Nová zpráva
    .title = Vytvořit novou zprávu
folder-pane-more-menu-button =
    .title = Nastavení podokna složek
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Režimy složek
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Zobrazovat tlačítko „Stáhnout zprávy“
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Zobrazovat tlačítko „Nová zpráva“
folder-pane-header-context-hide =
    .label = Skrýt záhlaví podokna složek
folder-pane-show-total-toggle =
    .label = Zobrazit celkový počet zpráv
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Zobrazit velikost složky
folder-pane-header-hide-local-folders =
    .label = Skrýt Místní složky
folder-pane-mode-context-button =
    .title = Možnosti režimu zobrazení složek
folder-pane-mode-context-toggle-compact-mode =
    .label = Kompaktní zobrazení
    .accesskey = K
folder-pane-mode-move-up =
    .label = Posunout nahoru
folder-pane-mode-move-down =
    .label = Posunout dolů
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] 1 nepřečtená zpráva
        [few] { $count } nepřečtené zprávy
        [many] { $count } nepřečtených zpráv
       *[other] { $count } nepřečtených zpráv
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] Celkem 1 zpráva
        [few] Celkem { $count } zprávy
        [many] Celkem { $count } zpráv
       *[other] Celkem { $count } zpráv
    }

## Message thread pane

threadpane-column-header-select =
    .title = Přepne výběr všech zpráv
threadpane-column-header-select-all =
    .title = Označit všechny zprávy
threadpane-column-header-deselect-all =
    .title = Zrušit označení všech zpráv
threadpane-column-label-select =
    .label = Vybrat zprávy
threadpane-column-header-thread =
    .title = Přepnout vlákna zpráv
threadpane-column-label-thread =
    .label = Vlákno
threadpane-column-header-flagged =
    .title = Seřadíte podle hvězdičky
threadpane-column-label-flagged =
    .label = Hvězdička
threadpane-flagged-cell-label = S hvězdičkou
threadpane-column-header-attachments =
    .title = Seřadíte podle příloh
threadpane-column-label-attachments =
    .label = Přílohy
threadpane-attachments-cell-label = Přílohy
threadpane-column-header-spam =
    .title = Seřadit podle stavu nevyžádané pošty
threadpane-column-label-spam =
    .label = Nevyžádaná pošta
threadpane-spam-cell-label = Nevyžádaná pošta
threadpane-column-header-unread-button =
    .title = Seřadit podle stavu přečtení
threadpane-column-label-unread-button =
    .label = Stav přečtení
threadpane-read-cell-label = Přečteno
threadpane-unread-cell-label = Nepřečteno
threadpane-column-header-sender = Od
    .title = Seřadíte podle odesílatele
threadpane-column-label-sender =
    .label = Od
threadpane-column-header-recipient = Příjemce
    .title = Seřadíte podle příjemce
threadpane-column-label-recipient =
    .label = Příjemce
threadpane-column-header-correspondents = Korespondenti
    .title = Seřadíte podle korespondentů
threadpane-column-label-correspondents =
    .label = Korespondenti
threadpane-column-header-subject = Předmět
    .title = Seřadíte podle předmětu
threadpane-column-label-subject =
    .label = Předmět
threadpane-column-header-date = Datum
    .title = Seřadíte podle data
threadpane-column-label-date =
    .label = Datum
threadpane-column-header-received = Doručeno
    .title = Seřadíte podle data doručení
threadpane-column-label-received =
    .label = Doručeno
threadpane-column-header-status = Stav
    .title = Seřadíte podle stavu
threadpane-column-label-status =
    .label = Stav
threadpane-column-header-size = Velikost
    .title = Seřadíte podle velikosti
threadpane-column-label-size =
    .label = Velikost
threadpane-column-header-tags = Štítek
    .title = Seřadíte podle štítků
threadpane-column-label-tags =
    .label = Štítek
threadpane-column-header-account = Účet
    .title = Seřadíte podle účtu
threadpane-column-label-account =
    .label = Účet
threadpane-column-header-priority = Priorita
    .title = Seřadíte podle priority
threadpane-column-label-priority =
    .label = Priorita
threadpane-column-header-unread = Nepřečteno
    .title = Seřadíte dle počtu nepřečtených zpráv ve vlákně
threadpane-column-label-unread =
    .label = Nepřečteno
threadpane-column-header-total = Celkem
    .title = Seřadíte dle celkového počtu zpráv ve vlákně
threadpane-column-label-total =
    .label = Celkem
threadpane-column-header-location = Umístění
    .title = Seřadíte podle umístění
threadpane-column-label-location =
    .label = Umístění
threadpane-column-header-id = Pořadí přijetí
    .title = Seřadíte podle pořadí přijetí
threadpane-column-label-id =
    .label = Pořadí přijetí
threadpane-column-header-delete =
    .title = Smazání zprávy
threadpane-column-label-delete =
    .label = Smazat

## Message state variations

threadpane-message-new =
    .alt = Indikátor nové zprávy
    .title = Nová zpráva
threadpane-message-replied =
    .alt = Indikátor odpovědi
    .title = Na zprávu bylo odpovězeno
threadpane-message-redirected =
    .alt = Indikátor přesměrování
    .title = Zpráva přesměrována
threadpane-message-forwarded =
    .alt = Indikátor přeposlání
    .title = Zpráva přeposlána
threadpane-message-replied-forwarded =
    .alt = Indikátor odpovědi a přeposlání
    .title = Na zprávu bylo odpovězeno a byla přeposlána
threadpane-message-replied-redirected =
    .alt = Indikátor odpovědi a přesměrování
    .title = Na zprávu bylo odpovězeno a byla přesměrována
threadpane-message-forwarded-redirected =
    .alt = Indikátor přeposlání a přesměrování
    .title = Zpráva přeposlána a přesměrována
threadpane-message-replied-forwarded-redirected =
    .alt = Indikátor odpovědi, přeposlání a přesměrování
    .title = Na zprávu bylo odpovězeno a byla přeposlána a přesměrována
apply-columns-to-menu =
    .label = Změnit sloupce v…
apply-current-view-to-menu =
    .label = Použít současné zobrazení pro…
apply-current-view-to-folder =
    .label = Složka…
apply-current-view-to-folder-children =
    .label = Složka a její podsložky…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Použít změny?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Použít sloupce z aktuální složky na složku { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Použít sloupce z aktuální složky na složku { $name } a její podsložky?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Použít zobrazení aktuální složky pro složku { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Použít zobrazení aktuální složky pro složku { $name } a její podsložky?
