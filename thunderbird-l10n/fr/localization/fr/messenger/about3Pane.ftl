# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Afficher/Masquer la barre de filtre rapide
quick-filter-button-label = Filtre rapide
thread-pane-header-display-button =
    .title = Options d’affichage de la liste des messages
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } message
       *[other] { $count } messages
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } message sélectionné
       *[other] { $count } messages sélectionnés
    }
thread-pane-header-context-table-view =
    .label = Vue tableau
thread-pane-header-context-cards-view =
    .label = Vue en fiches
thread-pane-header-context-hide =
    .label = Masquer l’en-tête de la liste de messages

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Conserver les filtres lors des changements de dossiers ?
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Menu de filtre rapide
quick-filter-bar-dropdown-unread =
    .label = Non lus
quick-filter-bar-dropdown-starred =
    .label = Suivis
quick-filter-bar-dropdown-inaddrbook =
    .label = Contacts
quick-filter-bar-dropdown-tags =
    .label = Étiquettes
quick-filter-bar-dropdown-attachment =
    .label = Pièces jointes
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Afficher seulement les messages non lus.
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Non lus
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Afficher seulement les messages suivis.
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Suivis
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Afficher seulement les messages des personnes présentes dans mon carnet d’adresses.
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Contacts
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Afficher seulement les messages ayant des étiquettes.
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Étiquettes
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Afficher seulement les messages ayant des pièces jointes.
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Pièces jointes
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Pas de résultats
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } message
       *[other] { $count } messages
    }
# Keyboard shortcut for the text search box.
# This should match quick-filter-bar-show in messenger.ftl.
quick-filter-bar-textbox-shortcut =
    { PLATFORM() ->
        [macos] ⇧ ⌘ K
       *[other] Ctrl+Maj+K
    }
# This is the empty text for the text search box.
# The goal is to convey to the user that typing in the box will filter
# the messages and that there is a hotkey they can press to get to the
# box faster.
quick-filter-bar-textbox =
    .placeholder = Filtrer ces messages <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Mode de filtrage par étiquettes
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Au moins une
    .title = Au moins une des étiquettes sélectionnées doit correspondre
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Toutes
    .title = Toutes les étiquettes sélectionnées doivent correspondre
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Filtrer les messages selon :
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Expéditeur
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Destinataires
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Sujet
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Corps du message
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Continuer cette recherche dans tous les dossiers
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Appuyez sur la touche « Entrée » à nouveau pour continuer votre recherche pour : { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Relever les nouveaux messages
folder-pane-get-all-messages-menuitem =
    .label = Relever tous les nouveaux messages
    .accesskey = R
folder-pane-write-message-button = Nouveau message
    .title = Rédiger un nouveau message
folder-pane-more-menu-button =
    .title = Options du panneau des dossiers
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Modes des dossiers
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Afficher « Relever les messages »
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Afficher « Nouveau message »
folder-pane-header-context-hide =
    .label = Masquer l’en-tête du panneau des dossiers
folder-pane-show-total-toggle =
    .label = Afficher le nombre total de messages
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Afficher la taille du dossier
folder-pane-header-hide-local-folders =
    .label = Masquer les dossiers locaux
folder-pane-mode-context-button =
    .title = Options du mode dossier
folder-pane-mode-context-toggle-compact-mode =
    .label = Vue compacte
    .accesskey = V
folder-pane-mode-move-up =
    .label = Déplacer vers le haut
folder-pane-mode-move-down =
    .label = Déplacer vers le bas
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] 1 message non lu
       *[other] { $count } messages non lus
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] 1 message au total
       *[other] { $count } messages au total
    }

## Message thread pane

threadpane-column-header-select =
    .title = Sélectionner/désélectionner tous les messages
threadpane-column-header-select-all =
    .title = Sélectionner tous les messages
threadpane-column-header-deselect-all =
    .title = Désélectionner tous les messages
threadpane-column-label-select =
    .label = Sélectionner des messages
threadpane-column-header-thread =
    .title = Grouper ou non par fils de discussion
threadpane-column-label-thread =
    .label = Discussion
threadpane-column-header-flagged =
    .title = Trier par suivi
threadpane-column-label-flagged =
    .label = Suivi
threadpane-flagged-cell-label = Suivi
threadpane-column-header-attachments =
    .title = Trier par pièces jointes
threadpane-column-label-attachments =
    .label = Pièces jointes
threadpane-attachments-cell-label = Pièces jointes
threadpane-column-header-spam =
    .title = Trier par statut indésirable
threadpane-column-label-spam =
    .label = Indésirables
threadpane-spam-cell-label = Indésirables
threadpane-column-header-unread-button =
    .title = Trier par statut de lecture
threadpane-column-label-unread-button =
    .label = Statut de lecture
threadpane-read-cell-label = Lu
threadpane-unread-cell-label = Non lu
threadpane-column-header-sender = Expéditeur
    .title = Trier par expéditeur
threadpane-column-label-sender =
    .label = Expéditeur
threadpane-column-header-recipient = Destinataire
    .title = Trier par destinataire
threadpane-column-label-recipient =
    .label = Destinataire
threadpane-column-header-correspondents = Correspondants
    .title = Trier par correspondants
threadpane-column-label-correspondents =
    .label = Correspondants
threadpane-column-header-subject = Sujet
    .title = Trier par sujet
threadpane-column-label-subject =
    .label = Sujet
threadpane-column-header-date = Date
    .title = Trier par date
threadpane-column-label-date =
    .label = Date
threadpane-column-header-received = Reçu
    .title = Trier par date de réception
threadpane-column-label-received =
    .label = Reçu
threadpane-column-header-status = Statut
    .title = Trier par statut
threadpane-column-label-status =
    .label = Statut
threadpane-column-header-size = Taille
    .title = Trier par taille
threadpane-column-label-size =
    .label = Taille
threadpane-column-header-tags = Étiquettes
    .title = Trier par étiquettes
threadpane-column-label-tags =
    .label = Étiquettes
threadpane-column-header-account = Compte
    .title = Trier par compte
threadpane-column-label-account =
    .label = Compte
threadpane-column-header-priority = Priorité
    .title = Trier par priorité
threadpane-column-label-priority =
    .label = Priorité
threadpane-column-header-unread = Non lu
    .title = Nombre de messages non lus dans le fil
threadpane-column-label-unread =
    .label = Non lu
threadpane-column-header-total = Total
    .title = Nombre total de messages dans le fil
threadpane-column-label-total =
    .label = Total
threadpane-column-header-location = Emplacement
    .title = Trier par adresse
threadpane-column-label-location =
    .label = Emplacement
threadpane-column-header-id = Ordre de réception
    .title = Trier par ordre de réception
threadpane-column-label-id =
    .label = Ordre de réception
threadpane-column-header-delete =
    .title = Supprimer un message
threadpane-column-label-delete =
    .label = Supprimer

## Message state variations

threadpane-message-new =
    .alt = Indicateur de nouveau message
    .title = Nouveau message
threadpane-message-replied =
    .alt = Indicateur de réponse
    .title = Message répondu
threadpane-message-redirected =
    .alt = Indicateur de redirection
    .title = Message redirigé
threadpane-message-forwarded =
    .alt = Indicateur de transfert
    .title = Message transféré
threadpane-message-replied-forwarded =
    .alt = Indicateur de réponse et transfert
    .title = Message répondu et transféré
threadpane-message-replied-redirected =
    .alt = Indicateur de réponse et de redirection
    .title = Message répondu et redirigé
threadpane-message-forwarded-redirected =
    .alt = Indicateur de transfert et redirection
    .title = Message transféré et redirigé
threadpane-message-replied-forwarded-redirected =
    .alt = Indicateur de réponse, transfert et redirection
    .title = Message répondu, transféré et redirigé
apply-columns-to-menu =
    .label = Appliquer ces paramètres à…
apply-current-view-to-menu =
    .label = Appliquer la vue actuelle à…
apply-current-view-to-folder =
    .label = Dossier…
apply-current-view-to-folder-children =
    .label = Dossier et sous-dossiers…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Appliquer les modifications ?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Appliquer les paramètres de ce dossier à { $name } ?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Appliquer les paramètres de ce dossier à { $name } et ses sous-dossiers ?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Appliquer la vue de ce dossier à { $name } ?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Appliquer la vue de ce dossier à { $name } et à ses sous-dossiers ?
