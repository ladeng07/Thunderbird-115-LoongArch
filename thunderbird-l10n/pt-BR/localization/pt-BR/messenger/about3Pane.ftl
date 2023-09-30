# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = Exibir/Ocultar barra de filtro rápido
quick-filter-button-label = Filtro rápido
thread-pane-header-display-button =
    .title = Opções de exibição da lista de mensagens
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
        [one] { $count } mensagem
       *[other] { $count } mensagens
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
        [one] { $count } selecionada
       *[other] { $count } selecionadas
    }
thread-pane-header-context-table-view =
    .label = Exibição em tabela
thread-pane-header-context-cards-view =
    .label = Exibição em cartões
thread-pane-header-context-hide =
    .label = Ocultar cabeçalho da lista de mensagens

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = Manter os filtros aplicados ao alternar pastas
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = Menu de filtro rápido
quick-filter-bar-dropdown-unread =
    .label = Não lidas
quick-filter-bar-dropdown-starred =
    .label = Com estrela
quick-filter-bar-dropdown-inaddrbook =
    .label = Contato
quick-filter-bar-dropdown-tags =
    .label = Etiquetas
quick-filter-bar-dropdown-attachment =
    .label = Anexos
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = Exibir somente mensagens não lidas
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = Não lidas
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = Exibir somente mensagens com estrela
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = Com estrela
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = Exibir somente mensagens de pessoas de seu catálogo de endereços
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = Contatos
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = Exibir somente mensagens com etiquetas
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = Etiquetas
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = Exibir somente mensagens com anexos
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = Anexos
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = Nenhum resultado
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results =
    { $count ->
        [one] { $count } mensagem
       *[other] { $count } mensagens
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
    .placeholder = Filtrar estas mensagens <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = Modo de filtragem de etiquetas
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = Qualquer
    .title = Pelo menos um dos critérios de etiqueta selecionado deve corresponder
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = Todos
    .title = Todos os critérios de etiqueta selecionados devem corresponder
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = Filtrar por:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = Remetente
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = Destinatários
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = Assunto
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = Texto da mensagem
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = Pesquise em todas as pastas
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = Pressione “Enter” de novo para continuar pesquisando por: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = Receber mensagens
folder-pane-get-all-messages-menuitem =
    .label = Receber de todas as contas
    .accesskey = t
folder-pane-write-message-button = Nova mensagem
    .title = Escrever uma nova mensagem
folder-pane-more-menu-button =
    .title = Opções do painel de pastas
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = Modos de pastas
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = Exibir “Receber mensagens”
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = Exibir “Nova mensagem”
folder-pane-header-context-hide =
    .label = Ocultar cabeçalho do painel de pastas
folder-pane-show-total-toggle =
    .label = Mostrar número total de mensagens
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = Exibir tamanho da pasta
folder-pane-header-hide-local-folders =
    .label = Ocultar pastas locais
folder-pane-mode-context-button =
    .title = Opções do modo de pasta
folder-pane-mode-context-toggle-compact-mode =
    .label = Exibição compacta
    .accesskey = c
folder-pane-mode-move-up =
    .label = Mover para cima
folder-pane-mode-move-down =
    .label = Mover para baixo
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
        [one] 1 mensagem não lida
       *[other] { $count } mensagens não lidas
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] 1 mensagem no total
       *[other] { $count } mensagens no total
    }

## Message thread pane

threadpane-column-header-select =
    .title = Alternar seleção de todas as mensagens
threadpane-column-header-select-all =
    .title = Selecionar todas as mensagens
threadpane-column-header-deselect-all =
    .title = Deixar de selecionar todas as mensagens
threadpane-column-label-select =
    .label = Selecionar mensagens
threadpane-column-header-thread =
    .title = Alternar tópicos de mensagens
threadpane-column-label-thread =
    .label = Tópico
threadpane-column-header-flagged =
    .title = Ordenar por estrela
threadpane-column-label-flagged =
    .label = Com estrela
threadpane-flagged-cell-label = Com estrela
threadpane-column-header-attachments =
    .title = Ordenar por anexos
threadpane-column-label-attachments =
    .label = Anexos
threadpane-attachments-cell-label = Anexos
threadpane-column-header-spam =
    .title = Ordenar por status de spam
threadpane-column-label-spam =
    .label = Spam
threadpane-spam-cell-label = Spam
threadpane-column-header-unread-button =
    .title = Ordenar por status de leitura
threadpane-column-label-unread-button =
    .label = Status de leitura
threadpane-read-cell-label = Lida
threadpane-unread-cell-label = Não lida
threadpane-column-header-sender = De
    .title = Ordenar por remetente
threadpane-column-label-sender =
    .label = De
threadpane-column-header-recipient = Destinatário
    .title = Ordenar por destinatário
threadpane-column-label-recipient =
    .label = Destinatário
threadpane-column-header-correspondents = Correspondentes
    .title = Ordenar por correspondentes
threadpane-column-label-correspondents =
    .label = Correspondentes
threadpane-column-header-subject = Assunto
    .title = Ordenar por assunto
threadpane-column-label-subject =
    .label = Assunto
threadpane-column-header-date = Data
    .title = Ordenar por data
threadpane-column-label-date =
    .label = Data
threadpane-column-header-received = Recebimento
    .title = Ordenar por data de recebimento
threadpane-column-label-received =
    .label = Recebimento
threadpane-column-header-status = Status
    .title = Ordenar por status
threadpane-column-label-status =
    .label = Status
threadpane-column-header-size = Tamanho
    .title = Ordenar por tamanho
threadpane-column-label-size =
    .label = Tamanho
threadpane-column-header-tags = Etiqueta
    .title = Ordenar por etiquetas
threadpane-column-label-tags =
    .label = Etiqueta
threadpane-column-header-account = Conta
    .title = Ordenar por conta
threadpane-column-label-account =
    .label = Conta
threadpane-column-header-priority = Prioridade
    .title = Ordenar por prioridade
threadpane-column-label-priority =
    .label = Prioridade
threadpane-column-header-unread = Não lida
    .title = Número de mensagens não lidas na discussão
threadpane-column-label-unread =
    .label = Não lida
threadpane-column-header-total = Total
    .title = Número total de mensagens na discussão
threadpane-column-label-total =
    .label = Total
threadpane-column-header-location = Local
    .title = Ordenar por localização
threadpane-column-label-location =
    .label = Local
threadpane-column-header-id = Ordem de chegada
    .title = Ordenar por ordem de chegada
threadpane-column-label-id =
    .label = Ordem de chegada
threadpane-column-header-delete =
    .title = Excluir uma mensagem
threadpane-column-label-delete =
    .label = Excluir

## Message state variations

threadpane-message-new =
    .alt = Indicador de nova mensagem
    .title = Nova mensagem
threadpane-message-replied =
    .alt = Indicador de respondida
    .title = Mensagem respondida
threadpane-message-redirected =
    .alt = Indicador de redirecionada
    .title = Mensagem redirecionada
threadpane-message-forwarded =
    .alt = Indicador de encaminhada
    .title = Mensagem encaminhada
threadpane-message-replied-forwarded =
    .alt = Indicador de respondida e encaminhada
    .title = Mensagem respondida e encaminhada
threadpane-message-replied-redirected =
    .alt = Indicador de respondida e redirecionada
    .title = Mensagem respondida e redirecionada
threadpane-message-forwarded-redirected =
    .alt = Indicador de encaminhada e redirecionada
    .title = Mensagem encaminhada e redirecionada
threadpane-message-replied-forwarded-redirected =
    .alt = Indicador de respondida, encaminhada e redirecionada
    .title = Mensagem respondida, encaminhada e redirecionada
apply-columns-to-menu =
    .label = Aplicar colunas a…
apply-current-view-to-menu =
    .label = Aplicar exibição atual a…
apply-current-view-to-folder =
    .label = Pasta…
apply-current-view-to-folder-children =
    .label = Pasta e subpastas…

## Apply columns confirmation dialog

apply-changes-to-folder-title = Aplicar alterações?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = Aplicar as colunas da pasta atual em { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = Aplicar as colunas da pasta atual em { $name } e suas filhas?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = Aplicar a exibição da pasta atual a { $name }?
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = Aplicar a exibição da pasta atual a { $name } e seus filhos?
