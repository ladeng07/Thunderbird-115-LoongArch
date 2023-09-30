# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = De snelfilterbalk in-/uitschakelen
quick-filter-button-label = Snelfilter
thread-pane-header-display-button =
    .title = Weergaveopties voor berichtenlijst
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } bericht
       *[other] { $count } berichten
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } geselecteerd
       *[other] { $count } geselecteerd
    }
thread-pane-header-context-table-view =
    .label = Tabelweergave
thread-pane-header-context-cards-view =
    .label = Kaartenweergave
thread-pane-header-context-hide =
    .label = Koptekst berichtenlijst verbergen

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Filters in stand houden bij het wisselen van mappen
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Snelfiltermenu
quick-filter-bar-dropdown-unread =
    .label = Ongelezen
quick-filter-bar-dropdown-starred =
    .label = Met ster
quick-filter-bar-dropdown-inaddrbook =
    .label = Contact
quick-filter-bar-dropdown-tags =
    .label = Labels
quick-filter-bar-dropdown-attachment =
    .label = Bijlage
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Alleen ongelezen berichten tonen
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Ongelezen
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Alleen berichten met ster tonen
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Met ster
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Alleen berichten van personen in uw adresboek tonen
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Contact
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Alleen berichten met labels tonen
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Labels
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Alleen berichten met bijlagen tonen
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Bijlage
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Geen resultaten
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } bericht
       *[other] { $count } berichten
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
    .placeholder = Deze berichten filteren <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Labelfiltermodus
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Eén van
    .title = Minstens een van de geselecteerde labelcriteria moet overeenkomen
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Alle
    .title = Alle geselecteerde labelcriteria moeten overeenkomen
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Berichten filteren op:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Afzender
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Ontvangers
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Onderwerp
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Berichttekst
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Verder zoeken in alle mappen
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Druk nogmaals op ‘Enter’ om verder te zoeken naar { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Berichten ophalen
folder-pane-get-all-messages-menuitem =
    .label = Alle nieuwe berichten ophalen
    .accesskey = A
folder-pane-write-message-button = Nieuw bericht
    .title = Een nieuw bericht opstellen
folder-pane-more-menu-button =
    .title = Mappenpaneelopties
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Mapmodi
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = ‘Berichten ophalen’ tonen
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = ‘Nieuw bericht’ tonen
folder-pane-header-context-hide =
    .label = Koptekst mappenpaneel verbergen
folder-pane-show-total-toggle =
    .label = Toon het totaal aantal berichten
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Mapgrootte tonen
folder-pane-header-hide-local-folders =
    .label = Lokale mappen verbergen
folder-pane-mode-context-button =
    .title = Opties voor mapmodus
folder-pane-mode-context-toggle-compact-mode =
    .label = Compacte weergave
    .accesskey = C
folder-pane-mode-move-up =
    .label = Omhoog verplaatsen
folder-pane-mode-move-down =
    .label = Omlaag verplaatsen
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] 1 ongelezen bericht
       *[other] { $count } ongelezen berichten
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] totaal 1 bericht
       *[other] totaal { $count } berichten
    }

## Message thread pane

threadpane-column-header-select =
    .title = Alle berichten selecteren/deselecteren
threadpane-column-header-select-all =
    .title = Alle berichten selecteren
threadpane-column-header-deselect-all =
    .title = Alle berichten deselecteren
threadpane-column-label-select =
    .label = Berichten selecteren
threadpane-column-header-thread =
    .title = Berichtconversaties wisselen
threadpane-column-label-thread =
    .label = Conversatie
threadpane-column-header-flagged =
    .title = Sorteren op ster
threadpane-column-label-flagged =
    .label = Met ster
threadpane-flagged-cell-label = Met ster
threadpane-column-header-attachments =
    .title = Sorteren op bijlagen
threadpane-column-label-attachments =
    .label = Bijlagen
threadpane-attachments-cell-label = Bijlagen
threadpane-column-header-spam =
    .title = Sorteren op ongewenstberichtstatus
threadpane-column-label-spam =
    .label = Ongewenst
threadpane-spam-cell-label = Spam
threadpane-column-header-unread-button =
    .title = Sorteren op leesstatus
threadpane-column-label-unread-button =
    .label = Leesstatus
threadpane-read-cell-label = Gelezen
threadpane-unread-cell-label = Ongelezen
threadpane-column-header-sender = Van
    .title = Sorteren op van
threadpane-column-label-sender =
    .label = Van
threadpane-column-header-recipient = Ontvanger
    .title = Sorteren op ontvanger
threadpane-column-label-recipient =
    .label = Ontvanger
threadpane-column-header-correspondents = Correspondenten
    .title = Sorteren op correspondenten
threadpane-column-label-correspondents =
    .label = Correspondenten
threadpane-column-header-subject = Onderwerp
    .title = Sorteren op onderwerp
threadpane-column-label-subject =
    .label = Onderwerp
threadpane-column-header-date = Datum
    .title = Sorteren op datum
threadpane-column-label-date =
    .label = Datum
threadpane-column-header-received = Ontvangen
    .title = Sorteren op ontvangstdatum
threadpane-column-label-received =
    .label = Ontvangen
threadpane-column-header-status = Status
    .title = Sorteren op status
threadpane-column-label-status =
    .label = Status
threadpane-column-header-size = Grootte
    .title = Sorteren op grootte
threadpane-column-label-size =
    .label = Grootte
threadpane-column-header-tags = Labels
    .title = Sorteren op labels
threadpane-column-label-tags =
    .label = Labels
threadpane-column-header-account = Account
    .title = Sorteren op account
threadpane-column-label-account =
    .label = Account
threadpane-column-header-priority = Prioriteit
    .title = Sorteren op prioriteit
threadpane-column-label-priority =
    .label = Prioriteit
threadpane-column-header-unread = Ongelezen
    .title = Aantal ongelezen berichten in conversatie
threadpane-column-label-unread =
    .label = Ongelezen
threadpane-column-header-total = Totaal
    .title = Totale aantal berichten in conversatie
threadpane-column-label-total =
    .label = Totaal
threadpane-column-header-location = Locatie
    .title = Sorteren op locatie
threadpane-column-label-location =
    .label = Locatie
threadpane-column-header-id = Volgorde van ontvangst
    .title = Sorteren op volgorde van ontvangst
threadpane-column-label-id =
    .label = Volgorde van ontvangst
threadpane-column-header-delete =
    .title = Een bericht verwijderen
threadpane-column-label-delete =
    .label = Verwijderen

## Message state variations

threadpane-message-new =
    .alt = Nieuw bericht-indicator
    .title = Nieuw bericht
threadpane-message-replied =
    .alt = Beantwoord-indicator
    .title = Bericht beantwoord
threadpane-message-redirected =
    .alt = Doorgeleid-indicator
    .title = Bericht doorgeleid
threadpane-message-forwarded =
    .alt = Doorgestuurd-indicator
    .title = Bericht doorgestuurd
threadpane-message-replied-forwarded =
    .alt = Beantwoord en doorgestuurd-indicator
    .title = Bericht beantwoord en doorgestuurd
threadpane-message-replied-redirected =
    .alt = Beantwoord en doorgeleid-indicator
    .title = Bericht beantwoord en doorgeleid
threadpane-message-forwarded-redirected =
    .alt = Doorgestuurd en doorgeleid-indicator
    .title = Bericht doorgestuurd en doorgeleid
threadpane-message-replied-forwarded-redirected =
    .alt = Beantwoord, doorgestuurd en doorgeleid-indicator
    .title = Bericht beantwoord, doorgestuurd en doorgeleid
apply-columns-to-menu =
    .label = Kolommen toepassen op…
apply-current-view-to-menu =
    .label = Huidige weergave toepassen op…
apply-current-view-to-folder =
    .label = Map…
apply-current-view-to-folder-children =
    .label = Map en submappen…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Wijzigingen toepassen?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = De huidige mapkolommen toepassen op { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = De kolommen van de huidige map toepassen op { $name } en zijn submappen?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = De weergave van de huidige map toepassen op { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = De weergave van de huidige map toepassen op { $name } en de submappen?
