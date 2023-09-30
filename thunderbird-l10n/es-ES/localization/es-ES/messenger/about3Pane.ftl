# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Alternar la barra de filtro rápido
quick-filter-button-label = Filtro rápido
thread-pane-header-display-button =
    .title = Opciones de visualización de la lista de mensajes
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } Mensaje
       *[other] { $count } Mensajes
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } Seleccionado
       *[other] { $count } Seleccionados
    }
thread-pane-header-context-table-view =
    .label = Vista de tabla
thread-pane-header-context-cards-view =
    .label = Vista de tarjetas
thread-pane-header-context-hide =
    .label = Ocultar cabecera de lista de mensajes

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Mantener filtros aplicados al cambiar de carpetas
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Menú de filtro rápido
quick-filter-bar-dropdown-unread =
    .label = No leídos
quick-filter-bar-dropdown-starred =
    .label = Con estrella
quick-filter-bar-dropdown-inaddrbook =
    .label = Contacto
quick-filter-bar-dropdown-tags =
    .label = Etiquetas
quick-filter-bar-dropdown-attachment =
    .label = Adjunto
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Mostrar sólo los mensajes no leídos
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = No leídos
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Mostrar sólo los mensajes con estrella
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Con estrella
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Mostrar sólo los mensajes de personas en su libreta de direcciones
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Contacto
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Mostrar sólo los mensajes con etiquetas en ellos
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Etiquetas
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Mostrar sólo los mensajes con adjuntos
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Adjunto
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = No hay resultados
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } mensaje
       *[other] { $count } mensajes
    }
# Keyboard shortcut for the text search box.
# This should match quick-filter-bar-show in messenger.ftl.
quick-filter-bar-textbox-shortcut =
    { PLATFORM() ->
        [macos] ⇧ ⌘ K
       *[other] Ctrl+Mayús+K
    }
# This is the empty text for the text search box.
# The goal is to convey to the user that typing in the box will filter
# the messages and that there is a hotkey they can press to get to the
# box faster.
quick-filter-bar-textbox =
    .placeholder = Filtrar estos mensajes <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Modo de filtrado de etiquetas
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Cualquiera de ellas
    .title = Al menos una de las etiquetas seleccionadas debe coincidir
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Todas ellas
    .title = Todas las etiquetas seleccionadas deben coincidir
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Filtrar mensajes por:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Remitente
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Destinatarios
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Asunto
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Cuerpo
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Continuar esta búsqueda por todas las carpetas
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Pulse ‘Enter’ de nuevo para continuar su búsqueda de: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Obtener mensajes
folder-pane-get-all-messages-menuitem =
    .label = Recibir todos los mensajes nuevos
    .accesskey = R
folder-pane-write-message-button = Nuevo mensaje
    .title = Redactar un nuevo mensaje
folder-pane-more-menu-button =
    .title = Opciones del panel de carpetas
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Modos de carpeta
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Mostrar “Obtener mensajes”
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Mostrar “Nuevo mensaje”
folder-pane-header-context-hide =
    .label = Ocultar cabecera del panel de carpetas
folder-pane-show-total-toggle =
    .label = Mostrar el número total de mensajes
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Mostrar tamaño de carpeta
folder-pane-header-hide-local-folders =
    .label = Ocultar carpetas locales
folder-pane-mode-context-button =
    .title = Opciones del modo de carpeta
folder-pane-mode-context-toggle-compact-mode =
    .label = Vista compacta
    .accesskey = C
folder-pane-mode-move-up =
    .label = Subir
folder-pane-mode-move-down =
    .label = Bajar
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] 1 mensaje no leído
       *[other] { $count } mensajes no leídos
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] 1 mensaje en total
       *[other] { $count } mensajes en total
    }

## Message thread pane

threadpane-column-header-select =
    .title = Alternar la selección de todos los mensajes
threadpane-column-header-select-all =
    .title = Seleccionar todos los mensajes
threadpane-column-header-deselect-all =
    .title = Deseleccionar todos los mensajes
threadpane-column-label-select =
    .label = Seleccionar mensajes
threadpane-column-header-thread =
    .title = Activar/desactivar conversaciones de mensajes
threadpane-column-label-thread =
    .label = Conversación
threadpane-column-header-flagged =
    .title = Ordenar por estrella
threadpane-column-label-flagged =
    .label = Con estrella
threadpane-flagged-cell-label = Con estrella
threadpane-column-header-attachments =
    .title = Ordenar por adjuntos
threadpane-column-label-attachments =
    .label = Adjuntos
threadpane-attachments-cell-label = Adjuntos
threadpane-column-header-spam =
    .title = Ordenar por estado de mensaje no deseado
threadpane-column-label-spam =
    .label = Mensaje no deseado
threadpane-spam-cell-label = Mensaje no deseado
threadpane-column-header-unread-button =
    .title = Ordenar por estado de lectura
threadpane-column-label-unread-button =
    .label = Estado de lectura
threadpane-read-cell-label = Leído
threadpane-unread-cell-label = No leído
threadpane-column-header-sender = Remitente
    .title = Ordenar por remitente
threadpane-column-label-sender =
    .label = Remitente
threadpane-column-header-recipient = Destinatario
    .title = Ordenar por destinatario
threadpane-column-label-recipient =
    .label = Destinatario
threadpane-column-header-correspondents = Participantes
    .title = Ordenar por participantes
threadpane-column-label-correspondents =
    .label = Participantes
threadpane-column-header-subject = Asunto
    .title = Ordenar por asunto
threadpane-column-label-subject =
    .label = Asunto
threadpane-column-header-date = Fecha
    .title = Ordenar por fecha
threadpane-column-label-date =
    .label = Fecha
threadpane-column-header-received = Recibido
    .title = Ordenar por fecha de recepción
threadpane-column-label-received =
    .label = Recibido
threadpane-column-header-status = Estado
    .title = Ordenar por estado
threadpane-column-label-status =
    .label = Estado
threadpane-column-header-size = Tamaño
    .title = Ordenar por tamaño
threadpane-column-label-size =
    .label = Tamaño
threadpane-column-header-tags = Etiqueta
    .title = Ordenar por etiquetas
threadpane-column-label-tags =
    .label = Etiqueta
threadpane-column-header-account = Cuenta
    .title = Ordenar por cuenta
threadpane-column-label-account =
    .label = Cuenta
threadpane-column-header-priority = Prioridad
    .title = Ordenar por prioridad
threadpane-column-label-priority =
    .label = Prioridad
threadpane-column-header-unread = No leídos
    .title = Número de mensajes no leídos en una conversación
threadpane-column-label-unread =
    .label = No leídos
threadpane-column-header-total = Total
    .title = Número total de mensajes en la conversación
threadpane-column-label-total =
    .label = Total
threadpane-column-header-location = Ubicación
    .title = Ordenar por ubicación
threadpane-column-label-location =
    .label = Ubicación
threadpane-column-header-id = Orden de recepción
    .title = Ordenar por orden de recepción
threadpane-column-label-id =
    .label = Orden de recepción
threadpane-column-header-delete =
    .title = Eliminar un mensaje
threadpane-column-label-delete =
    .label = Eliminar

## Message state variations

threadpane-message-new =
    .alt = Indicador de mensaje nuevo
    .title = Mensaje nuevo
threadpane-message-replied =
    .alt = Indicador de mensaje respondido
    .title = Mensaje respondido
threadpane-message-redirected =
    .alt = Indicador de mensaje redirigido
    .title = Mensaje redirigido
threadpane-message-forwarded =
    .alt = Indicador de mensaje reenviado
    .title = Mensaje reenviado
threadpane-message-replied-forwarded =
    .alt = Indicador de mensaje respondido y reenviado
    .title = Mensaje respondido y reenviado
threadpane-message-replied-redirected =
    .alt = Indicador de mensaje respondido y redirigido
    .title = Mensaje respondido y redirigido
threadpane-message-forwarded-redirected =
    .alt = Indicador de mensaje reenviado y redirigido
    .title = Mensaje reenviado y redirigido
threadpane-message-replied-forwarded-redirected =
    .alt = Indicador de mensaje respondido, reenviado y redirigido
    .title = Mensaje respondido, reenviado y redirigido
apply-columns-to-menu =
    .label = Aplicar columnas a…
apply-current-view-to-menu =
    .label = Aplicar la vista actual a…
apply-current-view-to-folder =
    .label = Carpeta…
apply-current-view-to-folder-children =
    .label = Carpeta y sus subcarpetas…

## Apply columns confirmation dialog

apply-changes-to-folder-title = ¿Aplicar cambios?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = ¿Aplicar las columnas de la carpeta actual a { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = ¿Aplicar las columnas de la carpeta actual a { $name } y sus subcarpetas?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = ¿Aplicar la vista de la carpeta actual a { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = ¿Aplicar la vista de la carpeta actual a { $name } y sus subcarpetas?
