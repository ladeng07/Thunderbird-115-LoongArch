# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Víxla flýtisíuslá af/á
quick-filter-button-label = Flýtisía
thread-pane-header-display-button =
    .title = Valkostir birtingar skilaboðalista
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } póstur
       *[other] { $count } póstar
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } valið
       *[other] { $count } valin
    }
thread-pane-header-context-table-view =
    .label = Töflusýn
thread-pane-header-context-cards-view =
    .label = Spjaldasýn
thread-pane-header-context-hide =
    .label = Fela fyrirsögn skilaboðalista

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Viðhalda virkum síum þegar skipt er á milli mappa
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Flýtisíuvalmynd
quick-filter-bar-dropdown-unread =
    .label = Ólesið
quick-filter-bar-dropdown-starred =
    .label = Stjörnumerkt
quick-filter-bar-dropdown-inaddrbook =
    .label = Tengiliður
quick-filter-bar-dropdown-tags =
    .label = Merki
quick-filter-bar-dropdown-attachment =
    .label = Viðhengi
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Sýna aðeins ólesinn póst
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Ólesið
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Sýna aðeins stjörnumerkt skilaboð
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Stjörnumerkt
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Sýna aðeins póst frá tengiliðum í nafnaskrá
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Tengiliðir
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Birta aðeins skilaboð með merkjum á þeim
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Merki
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Sýna aðeins póst sem inniheldur viðhengi
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Viðhengi
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Engar niðurstöður
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } póstur
       *[other] { $count } póstar
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
    .placeholder = Sía póst <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Merkjasíunarhamur
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Hver sem er af
    .title = Að minnsta kosti eitt af völdum merkjaskilyrðum ætti að passa
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Allt árið
    .title = Öll völdu merkisskilyrðin verða að passa
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Sía skilaboð eftir:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Sendandi
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Viðtakendur
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Viðfangsefni
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Meginmál
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Halda áfram leit yfir allar möppur
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Ýttu aftur á ‘Enter’ til að leita áfram að: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Ná í póst
folder-pane-get-all-messages-menuitem =
    .label = Ná í nýjan póst
    .accesskey = N
folder-pane-write-message-button = Nýr póstur
    .title = Semja ný skilaboð
folder-pane-more-menu-button =
    .title = Valkostir möppuspjalds
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Möppuhamir
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Sýna „Ná í skilaboð“
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Sýna „Ný skilaboð“
folder-pane-header-context-hide =
    .label = Fela fyrirsögn möppuspjalds
folder-pane-show-total-toggle =
    .label = Birta heildarfjölda skilaboða
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Sýna stærð möppu
folder-pane-header-hide-local-folders =
    .label = Fela staðbundnar möppur
folder-pane-mode-context-button =
    .title = Valkostir möppuhams
folder-pane-mode-context-toggle-compact-mode =
    .label = Þjöppuð sýn
    .accesskey = Þ
folder-pane-mode-move-up =
    .label = Færa upp
folder-pane-mode-move-down =
    .label = Færa niður
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] { $count } ólesin skilaboð
       *[other] { $count } ólesin skilaboð
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] { $count } skilaboð samtals
       *[other] { $count } skilaboð samtals
    }

## Message thread pane

threadpane-column-header-select =
    .title = Víxla valstöðu allra skilaboða
threadpane-column-header-select-all =
    .title = Velja öll skilaboð
threadpane-column-header-deselect-all =
    .title = Afvelja öll skilaboð
threadpane-column-label-select =
    .label = Veldu skilaboð
threadpane-column-header-thread =
    .title = Víxla skilaboðaþráðim af/á
threadpane-column-label-thread =
    .label = Umræða
threadpane-column-header-flagged =
    .title = Raða eftir stjörnumerkingu
threadpane-column-label-flagged =
    .label = Stjörnumerkt
threadpane-flagged-cell-label = Stjörnumerkt
threadpane-column-header-attachments =
    .title = Raða eftir viðhengjum
threadpane-column-label-attachments =
    .label = Viðhengi
threadpane-attachments-cell-label = Viðhengi
threadpane-column-header-spam =
    .title = Raða eftir ruslpóststöðu
threadpane-column-label-spam =
    .label = Ruslpóstur
threadpane-spam-cell-label = Ruslpóstur
threadpane-column-header-unread-button =
    .title = Raða eftir lestrarstöðu
threadpane-column-label-unread-button =
    .label = Lestrarstaða
threadpane-read-cell-label = Lesið
threadpane-unread-cell-label = Ólesið
threadpane-column-header-sender = Frá
    .title = Raða eftir frá
threadpane-column-label-sender =
    .label = Frá
threadpane-column-header-recipient = Viðtakandi
    .title = Raða eftir móttakanda
threadpane-column-label-recipient =
    .label = Viðtakandi
threadpane-column-header-correspondents = Þátttakendur
    .title = Raða eftir þátttakendum
threadpane-column-label-correspondents =
    .label = Þátttakendur
threadpane-column-header-subject = Efni
    .title = Flokka eftir efnislínu
threadpane-column-label-subject =
    .label = Efni
threadpane-column-header-date = Dagsetning
    .title = Raða eftir Dags
threadpane-column-label-date =
    .label = Dagsetning
threadpane-column-header-received = Móttekið
    .title = Raða eftir móttekinni dagsetningu
threadpane-column-label-received =
    .label = Móttekið
threadpane-column-header-status = Staða
    .title = Raða eftir stöðu
threadpane-column-label-status =
    .label = Staða
threadpane-column-header-size = Stærð
    .title = Raða eftir Stærð
threadpane-column-label-size =
    .label = Stærð
threadpane-column-header-tags = Merki
    .title = Raða eftir merkjum
threadpane-column-label-tags =
    .label = Merki
threadpane-column-header-account = Reikningur
    .title = Raða eftir reikningi
threadpane-column-label-account =
    .label = Reikningur
threadpane-column-header-priority = Forgangur
    .title = Raða eftir forgangi
threadpane-column-label-priority =
    .label = Forgangur
threadpane-column-header-unread = Ólesið
    .title = Fjöldi ólesinna pósta í umræðu
threadpane-column-label-unread =
    .label = Ólesið
threadpane-column-header-total = Allt
    .title = Heildarfjöldi pósta í umræðu
threadpane-column-label-total =
    .label = Allt
threadpane-column-header-location = Staðsetning
    .title = Raða eftir staðsetningu
threadpane-column-label-location =
    .label = Staðsetning
threadpane-column-header-id = Í móttekinni röð
    .title = Raða eftir móttekinni röð
threadpane-column-label-id =
    .label = Í móttekinni röð
threadpane-column-header-delete =
    .title = Eyða skilaboðum
threadpane-column-label-delete =
    .label = Eyða

## Message state variations

threadpane-message-new =
    .alt = Nýr skilaboðavísir
    .title = Ný skilaboð
threadpane-message-replied =
    .alt = Vísir vegna svaraðra skilaboða
    .title = Skilaboðum svarað
threadpane-message-redirected =
    .alt = Vísir vegna endurbeindra skilaboða
    .title = Skilaboðum endurbeint
threadpane-message-forwarded =
    .alt = Vísir vegna áframsendra skilaboða
    .title = Skilaboð áframsend
threadpane-message-replied-forwarded =
    .alt = Vísir fyrir svarað og framsent
    .title = Skilaboðum svarað og framsend
threadpane-message-replied-redirected =
    .alt = Vísir fyrir svarað og endurbeint
    .title = Skilaboðum svarað og endurbeint
threadpane-message-forwarded-redirected =
    .alt = Vísir fyrir áframsent og endurbeint
    .title = Skilaboð áframsend og endurbeint
threadpane-message-replied-forwarded-redirected =
    .alt = Vísir fyrir svarað, áframsent og endurbeint
    .title = Skilaboðum svarað, áframsend og endurbeint
apply-columns-to-menu =
    .label = Beita dálkum á…
apply-current-view-to-menu =
    .label = Beita núverandi sýn á...
apply-current-view-to-folder =
    .label = Möppu…
apply-current-view-to-folder-children =
    .label = Möppu og undirmöppur…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Virkja breytingar?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Beita dálkum núverandi möppu á { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Beita dálkum núverandi möppu á { $name } og undirmöppur?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Viltu nota sýn núverandi möppu í { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Viltu nota sýn núverandi möppu í { $name } og afleiður hennar?
