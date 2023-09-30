# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Rědku spěšnego filtra pśešaltowaś
quick-filter-button-label = Spěšny filter
thread-pane-header-display-button =
    .title = Pokazowańske nastajenja za powěsćowu lisćinu
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } powěsć
        [two] { $count } powěsći
        [few] { $count } powěsći
       *[other] { $count } powěsćow
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } wubrana
        [two] { $count } wubranej
        [few] { $count } wubrane
       *[other] { $count } wubranych
    }
thread-pane-header-context-table-view =
    .label = Tabelowy naglěd
thread-pane-header-context-cards-view =
    .label = Kórtowy naglěd
thread-pane-header-context-hide =
    .label = Głowu powěsćoweje lisćiny schowaś

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Pśi pśešaltowanju zarědnikow filtry dalej nałožyś
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Meni spěšnego filtra
quick-filter-bar-dropdown-unread =
    .label = Njecytane
quick-filter-bar-dropdown-starred =
    .label = Z gwězdku
quick-filter-bar-dropdown-inaddrbook =
    .label = Kontakt
quick-filter-bar-dropdown-tags =
    .label = Wobznamjenja
quick-filter-bar-dropdown-attachment =
    .label = Pśidank
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Jano njepśecytane powěsći pokazaś
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Njepśecytane
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Jano powěsći z chórgojckami pokazaś
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Z chórgojcku
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Jano powěsći wót luźi we wašom adresniku pokazaś
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Kontakt
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Jano powěsći z wobznamjenjami pokazaś
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Wobznamjenja
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Jano powěsći z pśidankami pokazaś
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Pśidanki
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Žedne wuslědki
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } powěsć
        [two] { $count } powěsći
        [few] { $count } powěsći
       *[other] { $count } powěsćow
    }
# Keyboard shortcut for the text search box.
# This should match quick-filter-bar-show in messenger.ftl.
quick-filter-bar-textbox-shortcut =
    { PLATFORM() ->
        [macos] ⇧ ⌘ K
       *[other] Strg+Umsch+K
    }
# This is the empty text for the text search box.
# The goal is to convey to the user that typing in the box will filter
# the messages and that there is a hotkey they can press to get to the
# box faster.
quick-filter-bar-textbox =
    .placeholder = Toś te powěsći filtrowaś <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Modus filtrowanja wobznamjenjow
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Někaka z
    .title = Nanejmjenjej jadna z wubranych wobznamjenjowych kriterijow by měła wótpowědowaś
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Wšykne
    .title = Wšykne wubrane wobznamjenjowe kriterije muse wótpowědowaś
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Powěsći filtrowaś pó:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Wótpósłarju
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Dostawarjach
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Temje
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Wopśimjeśu
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Z toś tym pytanim pó wšych zardnikach pókšacowaś
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Tłocćo ‘Enter’ hyšći raz, aby ze swójim pytanim za { $text } pókšacował

## Folder pane

folder-pane-get-messages-button =
    .title = Powěsći wobstaraś
folder-pane-get-all-messages-menuitem =
    .label = Wšykne nowe powěsći wótwołaś
    .accesskey = W
folder-pane-write-message-button = Nowa powěsć
    .title = Nowu powěsć pisaś
folder-pane-more-menu-button =
    .title = Nastajenja wobceŕka zarědnikow
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Zarědnikowe moduse
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = „Powěsći wobstaraś“ pokazaś
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = „Nowa powěsć“ pokazaś
folder-pane-header-context-hide =
    .label = Głowu wobceŕka zarědnika schowaś
folder-pane-show-total-toggle =
    .label = Cełkownu licbu powěsćow pokazaś
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Wjelikosć zarědnika pokazaś
folder-pane-header-hide-local-folders =
    .label = Lokalne zarědniki schowaś
folder-pane-mode-context-button =
    .title = Nastajenja zarědnikowego modusa
folder-pane-mode-context-toggle-compact-mode =
    .label = Kompaktny naglěd
    .accesskey = K
folder-pane-mode-move-up =
    .label = Górjej
folder-pane-mode-move-down =
    .label = Dołoj
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] { $count } njecytana powěsć
        [two] { $count } njecytanej powěsći
        [few] { $count } njecytane powěsći
       *[other] { $count } njecytanych powěsćow
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] { $count } powěsć dogromady
        [two] { $count } powěsći dogromady
        [few] { $count } powěsći dogromady
       *[other] { $count } powěsćow dogromady
    }

## Message thread pane

threadpane-column-header-select =
    .title = Wuběranje wšych powěsćow pśešaltowaś
threadpane-column-header-select-all =
    .title = Wšykne powěsći wubraś
threadpane-column-header-deselect-all =
    .title = Wšykne powěsći wótwóliś
threadpane-column-label-select =
    .label = Powěsći wubraś
threadpane-column-header-thread =
    .title = Powěsćowe nitki pśešaltowaś
threadpane-column-label-thread =
    .label = Nitka
threadpane-column-header-flagged =
    .title = Pó gwězdku sortěrowaś
threadpane-column-label-flagged =
    .label = Z gwězdku
threadpane-flagged-cell-label = Z gwězdku
threadpane-column-header-attachments =
    .title = Pó pśidankach sortěrowaś
threadpane-column-label-attachments =
    .label = Pśidanki
threadpane-attachments-cell-label = Pśidanki
threadpane-column-header-spam =
    .title = Pó spamowem statusu sortěrowaś
threadpane-column-label-spam =
    .label = Spam
threadpane-spam-cell-label = Spam
threadpane-column-header-unread-button =
    .title = Pó cytańskem statusu sortěrowaś
threadpane-column-label-unread-button =
    .label = Cytański status
threadpane-read-cell-label = Pśecytany
threadpane-unread-cell-label = Njecytane
threadpane-column-header-sender = Wót
    .title = Pó Wót sortěrowaś
threadpane-column-label-sender =
    .label = Wót
threadpane-column-header-recipient = Dostawaŕ
    .title = Pó dostawarju sortěrowaś
threadpane-column-label-recipient =
    .label = Dostawaŕ
threadpane-column-header-correspondents = Dopisowarje
    .title = Pó wótpósłarjach sortěrowaś
threadpane-column-label-correspondents =
    .label = Dopisowarje
threadpane-column-header-subject = Tema
    .title = Pó temje sortěrowaś
threadpane-column-label-subject =
    .label = Tema
threadpane-column-header-date = Datum
    .title = Pó datumje sortěrowaś
threadpane-column-label-date =
    .label = Datum
threadpane-column-header-received = Dostany
    .title = Pó datumje dostaśa sortěrowaś
threadpane-column-label-received =
    .label = Dostany
threadpane-column-header-status = Status
    .title = Pó statusu sortěrowaś
threadpane-column-label-status =
    .label = Status
threadpane-column-header-size = Wjelikosć
    .title = Pó wjelikosći sortěrowaś
threadpane-column-label-size =
    .label = Wjelikosć
threadpane-column-header-tags = Wobznamjenje
    .title = Pó wobznamjenjach sortěrowaś
threadpane-column-label-tags =
    .label = Wobznamjenje
threadpane-column-header-account = Konto
    .title = Pó konśe sortěrowaś
threadpane-column-label-account =
    .label = Konto
threadpane-column-header-priority = Priorita
    .title = Pó prioriśe sortěrowaś
threadpane-column-label-priority =
    .label = Priorita
threadpane-column-header-unread = Njepśecytany
    .title = Licba njepśecytanych powěsćow w nitce
threadpane-column-label-unread =
    .label = Njepśecytany
threadpane-column-header-total = Dogromady
    .title = Cełkowna licba powěsćow w nitce
threadpane-column-label-total =
    .label = Dogromady
threadpane-column-header-location = Městno
    .title = Pó adresy sortěrowaś
threadpane-column-label-location =
    .label = Městno
threadpane-column-header-id = Pórěd dostaśa
    .title = Pó pórěźe dostawanja sortěrowaś
threadpane-column-label-id =
    .label = Pórěd dostaśa
threadpane-column-header-delete =
    .title = Powěsć lašowaś
threadpane-column-label-delete =
    .label = Lašowaś

## Message state variations

threadpane-message-new =
    .alt = Indikator noweje powěsći
    .title = Nowa powěsć
threadpane-message-replied =
    .alt = Wótegronjeński indikator
    .title = Na powěsć jo se wótegroniło
threadpane-message-redirected =
    .alt = Indikator dalejpósrědnjenja
    .title = Powěsć jo se dalej pósrědniła
threadpane-message-forwarded =
    .alt = Indikator pśepósłanja
    .title = Powěsć jo se pśepósłała
threadpane-message-replied-forwarded =
    .alt = Indikator wótegrona a pśepósłanja
    .title = Na powěsć jo se wótegroniła a powěsć jo se pśepósłała
threadpane-message-replied-redirected =
    .alt = Indikator wótegrona a dalejpósrědnjenja
    .title = Na powěsć jo se wótegroniło a powěsć jo se dalej pósrědniła
threadpane-message-forwarded-redirected =
    .alt = Indikator pśepósłanja a dalejpósrědnjenja
    .title = Powěsć jo se pśepósłała a dalej pósrědniła
threadpane-message-replied-forwarded-redirected =
    .alt = Indikator wótegrona, pśepósłanja a dalejpósrědnjenja
    .title = Na powěsć jo se wótegroniła, powěsć jo se pśepósłała a dalej pósrědniła
apply-columns-to-menu =
    .label = Słupy nałožyś na…
apply-current-view-to-menu =
    .label = Aktualny nagłěd nałožyś na …
apply-current-view-to-folder =
    .label = Zarědnik…
apply-current-view-to-folder-children =
    .label = Zarědnik a jogo źiśi…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Změny nałožyś?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Słupy aktualnego zarědnika na { $name } nałožyś?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Słupy aktualnego zarědnika na { $name } a jogo źiśi nałožyś?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Naglěd aktualnego zarědnika na { $name } nałožyś?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Naglěd aktualnego zarědnika na { $name } a jogo źiśi nałožyś?
