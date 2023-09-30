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


## Folder Pane


## Folder Toolbar Header Popup

show-tags-folders-label =
    .label = الوسوم
    .accesskey = و

## Menu


## File Menu


## Edit Menu

menu-edit-delete-folder =
    .label = احذف المجلد
    .accesskey = د
# Variables:
# $count (Number) - Number of selected messages.
menu-edit-delete-messages =
    .label =
        { $count ->
            [one] احذف الرسالة
           *[other] احذف الرسائل المختارة
        }
    .accesskey = ح
# Variables:
# $count (Number) - Number of selected messages.
menu-edit-undelete-messages =
    .label =
        { $count ->
            [one] ألغِ حذف الرسالة
           *[other] ألغِ حذف الرسائل المختارة
        }
    .accesskey = ل
menu-edit-properties =
    .label = الخصائص
    .accesskey = م
menu-edit-folder-properties =
    .label = خصائص المجلد
    .accesskey = م
menu-edit-newsgroup-properties =
    .label = خصائص مجموعة البريد
    .accesskey = م

## Message Menu


## AppMenu


## Context menu

# Variables:
# $count (Number) - Number of selected messages.
mail-context-undelete-messages =
    .label =
        { $count ->
            [one] ألغِ حذف الرسالة
           *[other] ألغِ حذف الرسائل المختارة
        }

## Message header pane


## Message header cutomize panel


## Action Button Context Menu


## Add-on removal warning


## no-reply handling


## error messages


## Spaces toolbar


## Spaces toolbar pinned tab menupopup


## Spaces toolbar customize panel


## Quick Filter Bar

# The label to display for the "View... Toolbars..." menu item that controls
# whether the quick filter bar is visible.
quick-filter-bar-toggle =
    .label = شريط الترشيح السريع
    .accesskey = ش
# This is the key used to show the quick filter bar.
# This should match quick-filter-bar-textbox-shortcut in about3Pane.ftl.
quick-filter-bar-show =
    .key = k

## OpenPGP


## Quota panel.

