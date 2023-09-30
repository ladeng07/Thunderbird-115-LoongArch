# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Gyorskereső sáv be/ki
quick-filter-button-label = Gyorsszűrő
thread-pane-header-display-button =
    .title = Üzenetlista megjelenítési lehetőségei
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } üzenet
       *[other] { $count } üzenet
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } kiválasztva
       *[other] { $count } kiválasztva
    }
thread-pane-header-context-table-view =
    .label = Táblázat nézet
thread-pane-header-context-cards-view =
    .label = Kártyanézet
thread-pane-header-context-hide =
    .label = Üzenetlista fejléc elrejtése

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = A szűrőket érvényben tartja mappaváltáskor is
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Gyorsszűrő menü
quick-filter-bar-dropdown-unread =
    .label = Olvasatlan
quick-filter-bar-dropdown-starred =
    .label = Csillagozott
quick-filter-bar-dropdown-inaddrbook =
    .label = Névjegy
quick-filter-bar-dropdown-tags =
    .label = Címkék
quick-filter-bar-dropdown-attachment =
    .label = Melléklet
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Csak az olvasatlan üzenetek megjelenítése
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Olvasatlan
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Csak a csillagozott üzenetek megjelenítése
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Csillagozott
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Csak a címjegyzékben szereplő személyektől érkezett üzenetek megjelenítése
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Névjegy
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Csak a címkézett üzenetek megjelenítése
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Címkék
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Csak a melléklettel rendelkező üzenetek megjelenítése
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Melléklet
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Nincs eredmény
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } üzenet
       *[other] { $count } üzenet
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
    .placeholder = Ezen üzenetek szűrése… <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Címkeszűrési mód
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Bármely
    .title = Legalább az egyik kijelölt címkefeltételnek illeszkednie kell
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Mind
    .title = Minden kijelölt címkefeltételnek illeszkednie kell
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Üzenetek szűrése:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Feladó
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Címzettek
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Tárgy
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Levéltörzs
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Keresés folytatása az összes mappában
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Nyomja meg az Enter billentyűt a(z) { $text } kereséséhez

## Folder pane

folder-pane-get-messages-button =
    .title = Üzenetek letöltése
folder-pane-get-all-messages-menuitem =
    .label = Összes új üzenet letöltése
    .accesskey = s
folder-pane-write-message-button = Új üzenet
    .title = Új üzenet írása
folder-pane-more-menu-button =
    .title = Mappa ablaktábla beállításai
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Mappamódok
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = „Üzenetek letöltése” megjelenítése
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = „Új üzenet” megjelenítése
folder-pane-header-context-hide =
    .label = Mappa ablaktábla fejlécének elrejtése
folder-pane-show-total-toggle =
    .label = Teljes üzenetszám megjelenítése
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Mappaméret megjelenítése
folder-pane-header-hide-local-folders =
    .label = Helyi mappák elrejtése
folder-pane-mode-context-button =
    .title = Mappamód beállításai
folder-pane-mode-context-toggle-compact-mode =
    .label = Tömör nézet
    .accesskey = T
folder-pane-mode-move-up =
    .label = Mozgatás felfelé
folder-pane-mode-move-down =
    .label = Mozgatás lefelé
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] 1 olvasatlan üzenet
       *[other] { $count } olvasatlan üzenet
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] Összesen 1 üzenet
       *[other] Összesen { $count } üzenet
    }

## Message thread pane

threadpane-column-header-select =
    .title = Összes üzenet kiválasztása be/ki
threadpane-column-header-select-all =
    .title = Összes üzenet kiválasztása
threadpane-column-header-deselect-all =
    .title = Összes üzenet kiválasztásának megszüntetése
threadpane-column-label-select =
    .label = Üzenetek kiválasztása
threadpane-column-header-thread =
    .title = Üzenetszálak be/ki
threadpane-column-label-thread =
    .label = Témacsoport
threadpane-column-header-flagged =
    .title = Rendezés csillag szerint
threadpane-column-label-flagged =
    .label = Csillagozott
threadpane-flagged-cell-label = Csillagozott
threadpane-column-header-attachments =
    .title = Rendezés mellékletek szerint
threadpane-column-label-attachments =
    .label = Mellékletek
threadpane-attachments-cell-label = Mellékletek
threadpane-column-header-spam =
    .title = Rendezés levélszemét állapot szerint
threadpane-column-label-spam =
    .label = Levélszemét
threadpane-spam-cell-label = Levélszemét
threadpane-column-header-unread-button =
    .title = Rendezés olvasási állapot szerint
threadpane-column-label-unread-button =
    .label = Olvasási állapot
threadpane-read-cell-label = Olvasott
threadpane-unread-cell-label = Olvasatlan
threadpane-column-header-sender = Feladó
    .title = Rendezés feladó szerint
threadpane-column-label-sender =
    .label = Feladó
threadpane-column-header-recipient = Címzett
    .title = Rendezés címzett szerint
threadpane-column-label-recipient =
    .label = Címzett
threadpane-column-header-correspondents = Szerkesztők
    .title = Rendezés szerkesztők szerint
threadpane-column-label-correspondents =
    .label = Szerkesztők
threadpane-column-header-subject = Tárgy
    .title = Rendezés tárgy szerint
threadpane-column-label-subject =
    .label = Tárgy
threadpane-column-header-date = Dátum
    .title = Rendezés dátum szerint
threadpane-column-label-date =
    .label = Dátum
threadpane-column-header-received = Beérkezés
    .title = Rendezés beérkezés szerint
threadpane-column-label-received =
    .label = Beérkezés
threadpane-column-header-status = Állapot
    .title = Rendezés állapot szerint
threadpane-column-label-status =
    .label = Állapot
threadpane-column-header-size = Méret
    .title = Rendezés méret szerint
threadpane-column-label-size =
    .label = Méret
threadpane-column-header-tags = Címke
    .title = Rendezés címkék szerint
threadpane-column-label-tags =
    .label = Címke
threadpane-column-header-account = Postafiók
    .title = Rendezés postafiók szerint
threadpane-column-label-account =
    .label = Postafiók
threadpane-column-header-priority = Sürgősség
    .title = Rendezés sürgősség szerint
threadpane-column-label-priority =
    .label = Sürgősség
threadpane-column-header-unread = Olvasatlan
    .title = A témacsoport olvasatlan üzeneteinek száma
threadpane-column-label-unread =
    .label = Olvasatlan
threadpane-column-header-total = Összesen
    .title = A témacsoport üzeneteinek száma
threadpane-column-label-total =
    .label = Összesen
threadpane-column-header-location = Hely
    .title = Rendezés hely szerint
threadpane-column-label-location =
    .label = Hely
threadpane-column-header-id = Érkezési sorrend
    .title = Rendezés beérkezés szerint
threadpane-column-label-id =
    .label = Érkezési sorrend
threadpane-column-header-delete =
    .title = Üzenet törlése
threadpane-column-label-delete =
    .label = Törlés

## Message state variations

threadpane-message-new =
    .alt = Új üzenet jelzője
    .title = Új üzenet
threadpane-message-replied =
    .alt = Megválaszolási jelző
    .title = Üzenet megválaszolva
threadpane-message-redirected =
    .alt = Átirányítási jelző
    .title = { "" }
threadpane-message-forwarded =
    .alt = Továbbítási jelző
    .title = Üzenet továbbítva
threadpane-message-replied-forwarded =
    .alt = Megválaszolási és továbbítási jelző
    .title = Üzenet megválaszolva és továbbítva
threadpane-message-replied-redirected =
    .alt = Megválaszolási és átirányítási jelző
    .title = Üzenet megválaszolva és átirányítva
threadpane-message-forwarded-redirected =
    .alt = Továbbítási és átirányítási jelző
    .title = Üzenet továbbítva és átirányítva
threadpane-message-replied-forwarded-redirected =
    .alt = Megválaszolási, továbbítási és átirányítási jelző
    .title = Üzenet megválaszolva, továbbítva és átirányítva
apply-columns-to-menu =
    .label = Oszlopok alkalmazása…
apply-current-view-to-menu =
    .label = Jelenlegi nézet alkalmazása…
apply-current-view-to-folder =
    .label = Mappa…
apply-current-view-to-folder-children =
    .label = Mappa és gyermekei…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Alkalmazza a módosításokat?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Alkalmazza az aktuális mappa oszlopait erre: { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Alkalmazza az aktuális mappa oszlopait erre és gyermekeire: { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Alkalmazza a jelenlegi mappa nézetét a(z) { $name } mappára?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Alkalmazza az aktuális mappa nézetét a(z) { $name } mappára és a gyermekeire?
