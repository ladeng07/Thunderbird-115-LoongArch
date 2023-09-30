# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

calendar-invitation-panel-status-new = თქვენ მოწვეული ხართ ამ ღონისძიებაზე.
calendar-invitation-panel-status-processed = ღონისძიება უკვე დამატებულია თქვენს კალენდარში.
calendar-invitation-panel-status-updateminor = გზავნილი შეიცავს სიახლეს ამ ღონისძიების შესახებ.
calendar-invitation-panel-status-updatemajor = გზავნილი შეიცავს სიახლეს ამ ღონისძიების შესახებ. კვლავ უნდა დაადასტუროთ დასწრების თანხმობა.
calendar-invitation-panel-status-cancelled = გზავნილი შეიცავს ღონისძიების გაუქმების ცნობას.
calendar-invitation-panel-status-cancelled-notfound = გზავნილი შეიცავს იმ ღონისძიების გაუქმების ცნობას, რომელიც არ იძებნება თქვენს კალენდარში.
# Variables:
# $organizer (String) - The participant that cancelled the invitation.
calendar-invitation-panel-intro-cancel = { $organizer } – გაუქმებულია:
# Variables:
# $summary (String) - A short summary or title of the event.
calendar-invitation-panel-title = { $summary }
calendar-invitation-panel-view-button = ჩვენება
calendar-invitation-panel-update-button = განახლება
calendar-invitation-panel-delete-button = წაშლა
calendar-invitation-panel-accept-button = დიახ
calendar-invitation-panel-decline-button = არა
calendar-invitation-panel-tentative-button = შესაძლოა
calendar-invitation-panel-more-button = სხვა
calendar-invitation-panel-menu-item-save-copy =
    .label = კალენდარზე დატანა
calendar-invitation-panel-menu-item-toggle-changes =
    .label = ცვლილებების ჩვენება
calendar-invitation-panel-prop-title-when = როდის:
calendar-invitation-panel-prop-title-location = მისამართი:
# Example: Friday, September 16, 2022
# Variables:
# $startDate (String) - The date (without time) the event starts on.
calendar-invitation-interval-all-day = { $startDate }
# Example: September 16, 2022 – September 16, 2023
# Variables:
# $startMonth (String) - The month the interval starts.
# $startDay   (String) - The day of the month the interval starts.
# $startYear  (String) - The year the interval starts.
# $endMonth   (String) - The month the interval ends.
# $endDay     (String) - The day of the month the interval ends.
# $endYear    (String) - The year the interval ends.
calendar-invitation-interval-all-day-between-years = { $startDay } { $startMonth }, { $startYear } – { $endDay } { $endMonth }, { $endYear }
# Example: September 16 – 20, 2022
# Variables:
# $month      (String) - The month the interval is in.
# $startDay   (String) - The day of the month the interval starts.
# $endDay     (String) - The day of the month the interval ends.
# $year       (String) - The year the interval is in.
calendar-invitation-interval-all-day-in-month = { $startDay } { $month } – { $endDay }, { $year }
# Example: September 16 – October 20, 2022
# Variables:
# $startMonth (String) - The month the interval starts.
# $startDay   (String) - The day of the month the interval starts.
# $endMonth   (String) - The month the interval ends.
# $endDay     (String) - The day of the month the interval ends.
# $year       (String) - The year the interval is in.
calendar-invitation-interval-all-day-between-months = { $startDay } { $startMonth } – { $endDay } { $endMonth }, { $year }
# Example: Friday, September 16, 2022 15:00 America/Port of Spain
# Variables:
# $startDate (String) - The date the interval starts.
# $startTime (String) - The time the interval starts.
# $timezone  (String) - The timezone the interval is in.
calendar-invitation-interval-same-date-time = { $startDate }<b>{ $startTime }</b> { $timezone }
# Example: Friday, September 16, 2022 14:00 – 16:00 America/Port of Spain
# Variables:
# $startDate (String) - The date the interval starts.
# $startTime (String) - The time the interval starts.
# $endTime   (String) - The time the interval ends.
# $timezone  (String) - The timezone the interval is in.
calendar-invitation-interval-same-day = { $startDate } <b>{ $startTime }</b> – <b>{ $endTime }</b> { $timezone }
# Example: Friday, September 16, 2022 14:00 – Tuesday, September 20, 2022 16:00 America/Port of Spain
# Variables:
# $startDate (String) - The date the interval starts.
# $startTime (String) - The time the interval starts.
# $endDate   (String) - The date the interval ends.
# $endTime   (String) - The time the interval ends.
# $timezone  (String) - The timezone the interval is in.
calendar-invitation-interval-several-days = { $startDate } <b>{ $startTime }</b> – { $endDate } <b>{ $endTime }</b> { $timezone }
calendar-invitation-panel-prop-title-recurrence = გამეორება:
calendar-invitation-panel-prop-title-attendees = დამსწრეები:
calendar-invitation-panel-prop-title-description = აღწერილობა:
# Variables:
# $count (Number) - The number of attendees with the "ACCEPTED" participation status.
calendar-invitation-panel-partstat-accepted = { $count } დიახ
# Variables:
# $count (Number) - The number of attendees with the "DECLINED" participation status.
calendar-invitation-panel-partstat-declined = { $count } არა
# Variables:
# $count (Number) - The number of attendees with the "TENTATIVE" participation status.
calendar-invitation-panel-partstat-tentative = { $count } შესაძლოა
# Variables:
# $count (Number) - The number of attendees with the "NEEDS-ACTION" participation status.
calendar-invitation-panel-partstat-needs-action = { $count } ელოდება
# Variables:
# $count (Number) - The total number of attendees.
calendar-invitation-panel-partstat-total = { $count } დაესწრება
calendar-invitation-panel-prop-title-attachments = დანართები:
calendar-invitation-change-indicator-removed = მოცილებული
calendar-invitation-change-indicator-added = ახალი
calendar-invitation-change-indicator-modified = შეცვლილი
