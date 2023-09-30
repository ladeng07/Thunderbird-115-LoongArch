# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Prepnúť panel Rýchly filter
quick-filter-button-label = Rýchly filter
thread-pane-header-display-button =
    .title = Možnosti zobrazenia zoznamu správ
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } správa
        [few] { $count } správy
        [many] { $count } správ
       *[other] { $count } správ
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } označená
        [few] { $count } označené
        [many] { $count } označených
       *[other] { $count } označených
    }
thread-pane-header-context-table-view =
    .label = Zobrazenie tabuľky
thread-pane-header-context-cards-view =
    .label = Zobrazenie kariet
thread-pane-header-context-hide =
    .label = Skryť hlavičku zoznamu správ

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Pri prepínaní priečinkov ponechať filter aktívny
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Ponuka Rýchly filter
quick-filter-bar-dropdown-unread =
    .label = Neprečítané
quick-filter-bar-dropdown-starred =
    .label = Označené hviezdičkou
quick-filter-bar-dropdown-inaddrbook =
    .label = Kontakt
quick-filter-bar-dropdown-tags =
    .label = Štítky
quick-filter-bar-dropdown-attachment =
    .label = Príloha
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Zobraziť len neprečítané správy
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Neprečítané
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Zobraziť len správy označené hviezdičkou
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Označené hviezdičkou
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Zobraziť len správy od ľudí v mojom adresári
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Kontakt
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Zobraziť len správy s priradeným štítkom
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Štítky
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Zobraziť len správy obsahujúce prílohy
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Príloha
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Žiadne výsledky
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } správa
        [few] { $count } správy
       *[other] { $count } správ
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
    .placeholder = Filtrovať tieto správy <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Režim filtrovania podľa štítkov
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Ktorýkoľvek z
    .title = Správa musí mať priradenú aspoň jeden z nasledujúcich štítkov
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Všetky uvedené
    .title = Správa musí mať priradené všetky nasledujúce štítky
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Filtrovať správy podľa:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Odosielateľ
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Príjemcovia
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Predmet
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Telo
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Pokračovať v tomto hľadaní vo všetkých priečinkoch
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Stlačením klávesu ‘Enter’ môžete pokračovať vo vyhľadávaní výrazu: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Prijať správy
folder-pane-get-all-messages-menuitem =
    .label = Prijať všetky nové správy
    .accesskey = P
folder-pane-write-message-button = Nová správa
    .title = Napísať novú správu
folder-pane-more-menu-button =
    .title = Možnosti panela priečinkov
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Režim priečinkov
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Zobraziť tlačidlo “Prijať správy”
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Zobraziť tlačidlo “Nová správa”
folder-pane-header-context-hide =
    .label = Skryť hlavičku panela priečinkov
folder-pane-show-total-toggle =
    .label = Zobraziť celkový počet správ
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Zobraziť veľkosť priečinkov
folder-pane-header-hide-local-folders =
    .label = Skryť lokálne priečinky
folder-pane-mode-context-button =
    .title = Možnosti režimu priečinkov
folder-pane-mode-context-toggle-compact-mode =
    .label = Kompaktné zobrazenie
    .accesskey = K
folder-pane-mode-move-up =
    .label = Posunúť nahor
folder-pane-mode-move-down =
    .label = Posunúť nadol
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] Jedna neprečítaná správa
        [few] { $count } neprečítané správy
        [many] { $count } neprečítaných správ
       *[other] { $count } neprečítaných správ
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] Celkovo jedna správa
        [few] Celkovo { $count } správy
        [many] Celkovo { $count } správ
       *[other] Celkovo { $count } správ
    }

## Message thread pane

threadpane-column-header-select =
    .title = Vyberie všetky správy
threadpane-column-header-select-all =
    .title = Označiť všetky správy
threadpane-column-header-deselect-all =
    .title = Zrušiť označenie všetkých správ
threadpane-column-label-select =
    .label = Označte správy
threadpane-column-header-thread =
    .title = Prepnúť vlákna správ
threadpane-column-label-thread =
    .label = Vlákno
threadpane-column-header-flagged =
    .title = Zoskupiť správy vyznačené hviezdičkou
threadpane-column-label-flagged =
    .label = Hviezdička
threadpane-flagged-cell-label = Označená hviezdičkou
threadpane-column-header-attachments =
    .title = Zoskupiť správy s prílohou
threadpane-column-label-attachments =
    .label = Prílohy
threadpane-attachments-cell-label = Prílohy
threadpane-column-header-spam =
    .title = Usporiadať podľa príznaku nevyžiadanej pošty
threadpane-column-label-spam =
    .label = Nevyžiadaná pošta
threadpane-spam-cell-label = Nevyžiadaná pošta
threadpane-column-header-unread-button =
    .title = Usporiadať podľa stavu prečítania
threadpane-column-label-unread-button =
    .label = Stav prečítania
threadpane-read-cell-label = Prečítaná
threadpane-unread-cell-label = Neprečítaná
threadpane-column-header-sender = Od
    .title = Usporiadať podľa stĺpca Od
threadpane-column-label-sender =
    .label = Od
threadpane-column-header-recipient = Adresát
    .title = Usporiadať podľa adresáta
threadpane-column-label-recipient =
    .label = Adresát
threadpane-column-header-correspondents = Korešpondenti
    .title = Usporiadať podľa korešpondentov
threadpane-column-label-correspondents =
    .label = Korešpondenti
threadpane-column-header-subject = Predmet
    .title = Usporiadať podľa predmetu
threadpane-column-label-subject =
    .label = Predmet
threadpane-column-header-date = Dátum
    .title = Usporiadať podľa dátumu
threadpane-column-label-date =
    .label = Dátum
threadpane-column-header-received = Prijaté
    .title = Usporiadať podľa dátumu prijatia
threadpane-column-label-received =
    .label = Prijaté
threadpane-column-header-status = Stav
    .title = Usporiadať podľa stavu
threadpane-column-label-status =
    .label = Stav
threadpane-column-header-size = Veľkosť
    .title = Usporiadať podľa veľkosti
threadpane-column-label-size =
    .label = Veľkosť
threadpane-column-header-tags = Štítky
    .title = Usporiadať podľa štítkov
threadpane-column-label-tags =
    .label = Štítky
threadpane-column-header-account = Účet
    .title = Usporiadať podľa účtov
threadpane-column-label-account =
    .label = Účet
threadpane-column-header-priority = Priorita
    .title = Usporiadať podľa priority
threadpane-column-label-priority =
    .label = Priorita
threadpane-column-header-unread = Neprečítané
    .title = Počet nečítaných správ vo vlákne
threadpane-column-label-unread =
    .label = Neprečítané
threadpane-column-header-total = Celkovo
    .title = Celkový počet správ vo vlákne
threadpane-column-label-total =
    .label = Celkovo
threadpane-column-header-location = Umiestnenie
    .title = Usporiadať podľa umiestnenia
threadpane-column-label-location =
    .label = Umiestnenie
threadpane-column-header-id = Poradie prijatia
    .title = Usporiadať podľa poradia, v akom boli správy prijaté
threadpane-column-label-id =
    .label = Poradie prijatia
threadpane-column-header-delete =
    .title = Odstrániť správu
threadpane-column-label-delete =
    .label = Odstrániť

## Message state variations

threadpane-message-new =
    .alt = Indikátor novej správy
    .title = Nová správa
threadpane-message-replied =
    .alt = Indikátor odpovede
    .title = Na správu bolo odpovedané
threadpane-message-redirected =
    .alt = Indikátor presmerovania
    .title = Správa bola presmerovaná
threadpane-message-forwarded =
    .alt = Indikátor preposlania
    .title = Správa bola odoslaná ďalej
threadpane-message-replied-forwarded =
    .alt = Indikátor odpovede a preposlania
    .title = Na správu bolo odpovedané a takisto bola odoslaná ďalej
threadpane-message-replied-redirected =
    .alt = Indikátor odpovede a presmerovania
    .title = Na správu bolo odpovedané a takisto bola presmerovaná
threadpane-message-forwarded-redirected =
    .alt = Indikátor preposlania a presmerovania
    .title = Správa bola odoslaná ďalej a presmerovaná
threadpane-message-replied-forwarded-redirected =
    .alt = Indikátor odpovede, preposlania a presmerovania
    .title = Na správu bolo odpovedané, bola odoslaná ďalej a presmerovaná
apply-columns-to-menu =
    .label = Použiť stĺpce pre…
apply-current-view-to-menu =
    .label = Použiť aktuálne zobrazenie na…
apply-current-view-to-folder =
    .label = Priečinok…
apply-current-view-to-folder-children =
    .label = Priečinok a jeho podpriečinky…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Použiť zmeny?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Použiť nastavenia stĺpcov aktuálneho priečinka aj na priečinok { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Použiť nastavenia stĺpcov aktuálneho priečinka aj na priečinok { $name } a jeho podpriečinky?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Použiť nastavenie zobrazenia aktuálneho priečinka aj na priečinok { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Použiť nastavenie zobrazenia aktuálneho priečinka aj na priečinok { $name } a jeho podpriečinky?
