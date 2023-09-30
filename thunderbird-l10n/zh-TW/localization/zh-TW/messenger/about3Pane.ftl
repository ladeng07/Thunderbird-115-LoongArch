# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message List Header Bar

quick-filter-button =
    .title = 啟用或停用快速篩選列。
quick-filter-button-label = 快速篩選
thread-pane-header-display-button =
    .title = 郵件清單顯示選項
# Variables:
# $count (Number) - The number of messages in this folder.
thread-pane-folder-message-count =
    { $count ->
       *[other] { $count } 封郵件
    }
# Variables:
# $count (Number) - The number of messages currently selected.
thread-pane-folder-selected-count =
    { $count ->
       *[other] 已選擇 { $count } 封
    }
thread-pane-header-context-table-view =
    .label = 表格檢視
thread-pane-header-context-cards-view =
    .label = 卡片檢視
thread-pane-header-context-hide =
    .label = 隱藏訊息清單標題

## Quick Filter Bar

# The tooltip to display when the user hovers over the sticky button
# (currently displayed as a push-pin). When active, the sticky button
# causes the current filter settings to be retained when the user changes
# folders or opens new tabs. (When inactive, only the state of the text
# filters are propagated between folder changes and when opening new tabs.)
quick-filter-bar-sticky =
    .title = 切換資料夾時仍然套用篩選條件？
# The tooltip for the filter button that replaces the quick filter buttons with
# a dropdown menu.
quick-filter-bar-dropdown =
    .title = 快速篩選選單
quick-filter-bar-dropdown-unread =
    .label = 未讀
quick-filter-bar-dropdown-starred =
    .label = 已標星號
quick-filter-bar-dropdown-inaddrbook =
    .label = 聯絡人
quick-filter-bar-dropdown-tags =
    .label = 標籤
quick-filter-bar-dropdown-attachment =
    .label = 附件
# The tooltip for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread =
    .title = 只顯示未讀訊息
# The label for the filter button that causes us to filter results to only
# include unread messages.
quick-filter-bar-unread-label = 未讀
# The tooltip for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred =
    .title = 只顯示已加星號的訊息
# The label for the filter button that causes us to filter results to only
# include messages that have been starred/flagged.
quick-filter-bar-starred-label = 已標星號
# The tooltip for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook =
    .title = 只顯示從通訊錄當中的人寄來的訊息
# The label for the filter button that causes us to filter results to only
# include messages from contacts in one of the user's non-remote address
# books.
quick-filter-bar-inaddrbook-label = 聯絡人
# The tooltip for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags =
    .title = 只顯示有被掛上標籤的訊息
# The label for the filter button that causes us to filter results to only
# include messages with at least one tag on them.
quick-filter-bar-tags-label = 標籤
# The tooltip for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment =
    .title = 只顯示有附件的訊息
# The label for the filter button that causes us to filter results to only
# include messages with attachments.
quick-filter-bar-attachment-label = 附件
# The contents of the results box when there is a filter active but there
# are no messages matching the filter.
quick-filter-bar-no-results = 無結果
# This is used to populate the results box; it either displays the
# number of messages found using this string, that there are no messages
# (using quick-filter-bar-no-results), or the box is hidden.
# Variables:
# $count (Number) - The number of messages that match selected filters.
quick-filter-bar-results = { $count } 封郵件
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
    .placeholder = 過濾這些訊息 <{ quick-filter-bar-textbox-shortcut }>
# Tooltip of the Any-of/All-of tagging mode selector.
quick-filter-bar-boolean-mode =
    .title = 標籤篩選模式
# The Any-of tagging mode.
quick-filter-bar-boolean-mode-any =
    .label = 任一個
    .title = 至少應符合一個選擇的標籤條件
# The All-of tagging mode.
quick-filter-bar-boolean-mode-all =
    .label = 所有
    .title = 需符合所有選擇的標籤條件
# This label explains what the sender/recipients/subject/body buttons do.
# This string should ideally be kept short because the label and the text
# filter buttons share their bar (that appears when there is text in the text
# filter box) with the list of tags when the tag filter is active, and the
# tag sub-bar wants as much space as possible. (Overflow is handled by an
# arrow scroll box.)
quick-filter-bar-text-filter-explanation = 篩選訊息透過:
# The button label that toggles whether the text filter searches the message
# sender for the string.
quick-filter-bar-text-filter-sender = 寄件者
# The button label that toggles whether the text filter searches the message
# recipients (to, cc) for the string.
quick-filter-bar-text-filter-recipients = 收件者
# The button label that toggles whether the text filter searches the message
# subject for the string.
quick-filter-bar-text-filter-subject = 主旨
# The button label that toggles whether the text filter searches the message
# body for the string.
quick-filter-bar-text-filter-body = 內文
# The first line of the panel popup that tells the user we found no matches
# but we can convert to a global search for them.
quick-filter-bar-gloda-upsell-line1 = 繼續在所有資料夾搜尋
# The second line of the panel popup that tells the user we found no matches.
# Variables:
# $text (String) - What the user has typed so far.
quick-filter-bar-gloda-upsell-line2 = 按下 Enter 鍵以繼續搜尋: { $text }

## Folder pane

folder-pane-get-messages-button =
    .title = 下載郵件
folder-pane-get-all-messages-menuitem =
    .label = 下載所有新郵件
    .accesskey = G
folder-pane-write-message-button = 寫新訊息
    .title = 撰寫新訊息
folder-pane-more-menu-button =
    .title = 資料夾窗格選項
# Context menu item to show/hide different folder types in the folder pane
folder-pane-header-folder-modes =
    .label = 信件匣模式
# Context menu item to toggle display of "Get messages" button in folder pane header
folder-pane-header-context-toggle-get-messages =
    .label = 顯示「下載郵件」
# Context menu item to toggle display of "New Message" button in folder pane header
folder-pane-header-context-toggle-new-message =
    .label = 顯示「寫新訊息」
folder-pane-header-context-hide =
    .label = 隱藏資料夾窗格標題
folder-pane-show-total-toggle =
    .label = 顯示郵件總數
# Context menu item to show or hide folder sizes
folder-pane-header-toggle-folder-size =
    .label = 顯示資料夾大小
folder-pane-header-hide-local-folders =
    .label = 隱藏本機信件匣
folder-pane-mode-context-button =
    .title = 資料夾模式選項
folder-pane-mode-context-toggle-compact-mode =
    .label = 精簡檢視
    .accesskey = C
folder-pane-mode-move-up =
    .label = 上移
folder-pane-mode-move-down =
    .label = 下移
# Variables:
# $count (Number) - Number of unread messages.
folder-pane-unread-aria-label =
    { $count ->
       *[other] { $count } 封未讀訊息
    }
# Variables:
# $count (Number) - Number of total messages.
folder-pane-total-aria-label =
    { $count ->
        [one] { $count } 封訊息
       *[other] 共 { $count } 封訊息
    }

## Message thread pane

threadpane-column-header-select =
    .title = 切換選擇所有訊息
threadpane-column-header-select-all =
    .title = 選擇所有訊息
threadpane-column-header-deselect-all =
    .title = 取消選擇所有訊息
threadpane-column-label-select =
    .label = 選擇訊息
threadpane-column-header-thread =
    .title = 切換討論串
threadpane-column-label-thread =
    .label = 主題
threadpane-column-header-flagged =
    .title = 依照星號狀態排序
threadpane-column-label-flagged =
    .label = 已標星號
threadpane-flagged-cell-label = 已標星號
threadpane-column-header-attachments =
    .title = 依照附件排序
threadpane-column-label-attachments =
    .label = 附件
threadpane-attachments-cell-label = 有附件
threadpane-column-header-spam =
    .title = 依照垃圾信狀態排序
threadpane-column-label-spam =
    .label = 是垃圾信
threadpane-spam-cell-label = 是垃圾信
threadpane-column-header-unread-button =
    .title = 依照閱讀狀態排序
threadpane-column-label-unread-button =
    .label = 閱讀狀態
threadpane-read-cell-label = 已讀
threadpane-unread-cell-label = 未讀
threadpane-column-header-sender = 從
    .title = 依照寄件者排序
threadpane-column-label-sender =
    .label = 從
threadpane-column-header-recipient = 收件者
    .title = 依照收件者排序
threadpane-column-label-recipient =
    .label = 收件者
threadpane-column-header-correspondents = 通訊者
    .title = 依照通訊者排序
threadpane-column-label-correspondents =
    .label = 通訊者
threadpane-column-header-subject = 主旨
    .title = 依照主旨排序
threadpane-column-label-subject =
    .label = 主旨
threadpane-column-header-date = 日期
    .title = 依照日期排序
threadpane-column-label-date =
    .label = 日期
threadpane-column-header-received = 接收時間
    .title = 依照接收日期排序
threadpane-column-label-received =
    .label = 接收時間
threadpane-column-header-status = 狀態
    .title = 依照狀態排序
threadpane-column-label-status =
    .label = 狀態
threadpane-column-header-size = 大小
    .title = 依照大小排序
threadpane-column-label-size =
    .label = 大小
threadpane-column-header-tags = 標籤
    .title = 依照標籤排序
threadpane-column-label-tags =
    .label = 標籤
threadpane-column-header-account = 帳號
    .title = 依照帳號排序
threadpane-column-label-account =
    .label = 帳號
threadpane-column-header-priority = 重要性
    .title = 依照重要性排序
threadpane-column-label-priority =
    .label = 重要性
threadpane-column-header-unread = 未讀
    .title = 討論串中未讀訊息數量
threadpane-column-label-unread =
    .label = 未讀
threadpane-column-header-total = 全部
    .title = 討論串中所有訊息數量
threadpane-column-label-total =
    .label = 全部
threadpane-column-header-location = 地點
    .title = 依照位置
threadpane-column-label-location =
    .label = 地點
threadpane-column-header-id = 收件順序
    .title = 依照接收順序排序
threadpane-column-label-id =
    .label = 收件順序
threadpane-column-header-delete =
    .title = 刪除訊息
threadpane-column-label-delete =
    .label = 刪除

## Message state variations

threadpane-message-new =
    .alt = 新訊息圖示
    .title = 新訊息
threadpane-message-replied =
    .alt = 已回覆圖示
    .title = 已回覆的訊息
threadpane-message-redirected =
    .alt = 已改寄圖示
    .title = 已改寄的訊息
threadpane-message-forwarded =
    .alt = 已轉寄圖示
    .title = 已轉寄的訊息
threadpane-message-replied-forwarded =
    .alt = 已回覆與轉寄圖示
    .title = 已回覆並轉寄的訊息
threadpane-message-replied-redirected =
    .alt = 已回覆與改寄圖示
    .title = 已回覆與改寄的訊息
threadpane-message-forwarded-redirected =
    .alt = 已轉寄與改寄圖示
    .title = 已轉寄與改寄的訊息
threadpane-message-replied-forwarded-redirected =
    .alt = 已回覆、轉寄並改寄圖示
    .title = 已回覆、轉寄並改寄的訊息
apply-columns-to-menu =
    .label = 套用欄位至…
apply-current-view-to-menu =
    .label = 將目前畫面套用到…
apply-current-view-to-folder =
    .label = 資料夾…
apply-current-view-to-folder-children =
    .label = 資料夾與其子資料夾

## Apply columns confirmation dialog

apply-changes-to-folder-title = 確定要套用變更嗎？
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-message = 套用目前資料夾的欄位到 { $name }？
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-columns-to-folder-with-children-message = 套用目前資料夾的欄位到 { $name } 和它的子資料夾？
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-message = 確定要將目前信件匣的畫面套用到 { $name } 嗎？
# Variables:
#  $name (String): The name of the folder to apply to.
apply-current-view-to-folder-with-children-message = 確定要將目前信件匣的畫面套用到 { $name } 與其子信件匣嗎？
