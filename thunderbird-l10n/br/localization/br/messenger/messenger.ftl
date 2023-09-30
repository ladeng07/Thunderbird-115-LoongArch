# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Window controls


## Content tabs


# Back


# Forward


# Reload


# Stop


## Toolbar

quick-filter-toolbarbutton =
    .label = Sil prim
    .tooltiptext = Silañ ar c’hemennadennoù

## Folder Pane

folder-pane-header-label = Teuliad

## Folder Toolbar Header Popup

show-tags-folders-label =
    .label = Merkoù
    .accesskey = M

## Menu


## File Menu


## Edit Menu

menu-edit-delete-folder =
    .label = Dilemel an teuliad
    .accesskey = D
# Variables:
# $count (Number) - Number of selected messages.
menu-edit-delete-messages =
    .label =
        { $count ->
            [1] Dilemel ar gemennadenn
            [one] Dilemel ar c’hemennadennoù diuzet
            [two] Dilemel ar c’hemennadennoù diuzet
            [few] Dilemel ar c’hemennadennoù diuzet
            [many] Dilemel ar c’hemennadennoù diuzet
           *[other] Dilemel ar c’hemennadennoù diuzet
        }
    .accesskey = D
# Variables:
# $count (Number) - Number of selected messages.
menu-edit-undelete-messages =
    .label =
        { $count ->
            [1] Dizilemel ar gemennadenn
            [one] Dizilemel ar c’hemennadennoù diuzet
            [two] Dizilemel ar c’hemennadennoù diuzet
            [few] Dizilemel ar c’hemennadennoù diuzet
            [many] Dizilemel ar c’hemennadennoù diuzet
           *[other] Dizilemel ar c’hemennadennoù diuzet
        }
    .accesskey = d
menu-edit-properties =
    .label = Perzhioù…
    .accesskey = s
menu-edit-folder-properties =
    .label = Perzhioù an teuliad
    .accesskey = s
menu-edit-newsgroup-properties =
    .label = Perzhioù ar strollad-keleier
    .accesskey = s

## Message Menu


## AppMenu

appmenu-settings =
    .label = Arventennoù

## Context menu

# Variables:
# $count (Number) - Number of selected messages.
mail-context-undelete-messages =
    .label =
        { $count ->
            [1] Dizilemel ar gemennadenn
            [one] Dizilemel ar c’hemennadennoù diuzet
            [two] Dizilemel ar c’hemennadennoù diuzet
            [few] Dizilemel ar c’hemennadennoù diuzet
            [many] Dizilemel ar c’hemennadennoù diuzet
           *[other] Dizilemel ar c’hemennadennoù diuzet
        }

## Message header pane


## Message header cutomize panel


## Action Button Context Menu


## Add-on removal warning


## no-reply handling


## error messages


## Spaces toolbar

spaces-toolbar-button-chat2 =
    .title = Flapva
spaces-toolbar-button-settings2 =
    .title = Arventennoù
settings-context-open-settings-item2 =
    .label = Arventennoù
settings-context-open-account-settings-item2 =
    .label = Arventennoù ar gont

## Spaces toolbar pinned tab menupopup

spaces-pinned-button-menuitem-address-book2 =
    .label = { spaces-toolbar-button-address-book2.title }
spaces-pinned-button-menuitem-calendar2 =
    .label = { spaces-toolbar-button-calendar2.title }
spaces-pinned-button-menuitem-tasks2 =
    .label = { spaces-toolbar-button-tasks2.title }
spaces-pinned-button-menuitem-chat2 =
    .label = { spaces-toolbar-button-chat2.title }
spaces-pinned-button-menuitem-settings2 =
    .label = { spaces-toolbar-button-settings2.title }
spaces-pinned-button-menuitem-show =
    .label = { spaces-toolbar-button-show.title }

## Spaces toolbar customize panel


## Quick Filter Bar

# The label to display for the "View... Toolbars..." menu item that controls
# whether the quick filter bar is visible.
quick-filter-bar-toggle =
    .label = Barrenn sil prim
    .accesskey = s
# This is the key used to show the quick filter bar.
# This should match quick-filter-bar-textbox-shortcut in about3Pane.ftl.
quick-filter-bar-show =
    .key = k

## OpenPGP


## Quota panel.

