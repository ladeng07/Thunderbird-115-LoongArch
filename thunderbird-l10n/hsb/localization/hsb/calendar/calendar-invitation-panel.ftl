# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Variables:
# $organizer (String) - The participant that created the original invitation.
calendar-invitation-panel-intro = { $organizer } je was přeprosył do:
calendar-invitation-panel-status-new = Maće přeprošenje na tutón podawk.
calendar-invitation-panel-status-processed = Tutón podawk je so hižo wašej protyce přidał.
calendar-invitation-panel-status-updateminor = Tuta powěsć aktualizaciju za tutón podawk wobsahuje.
calendar-invitation-panel-status-updatemajor = Tuta powěsć aktualizaciju za tutón podawk wobsahuje. Wy měł swoje wobdźělenje znowa wobkrućić.
calendar-invitation-panel-status-cancelled = Tuta powěsć wotprajenje za tutón podawk wobsahuje.
calendar-invitation-panel-status-cancelled-notfound = Tuta powěsć wotprajenje za podawk wobsahuje, kotryž we wašej protyce njeje.
# Variables:
# $organizer (String) - The participant that cancelled the invitation.
calendar-invitation-panel-intro-cancel = { $organizer } je přetorhnył:
# Variables:
# $summary (String) - A short summary or title of the event.
calendar-invitation-panel-title = { $summary }
calendar-invitation-panel-action-button = Składować
calendar-invitation-panel-view-button = Pokazać
calendar-invitation-panel-update-button = Aktualizować
calendar-invitation-panel-delete-button = Zhašeć
calendar-invitation-panel-accept-button = Haj
calendar-invitation-panel-decline-button = Ně
calendar-invitation-panel-tentative-button = Snano
calendar-invitation-panel-reply-status = * Hišće njejsće rozsudźił abo wotmołwił
calendar-invitation-panel-more-button = Wjace
calendar-invitation-panel-menu-item-save =
    .label = Do protyki składować
calendar-invitation-panel-menu-item-save-copy =
    .label = Kopiju składować
calendar-invitation-panel-menu-item-toggle-changes =
    .label = Změny pokazać
calendar-invitation-panel-prop-title-when = Hdy:
calendar-invitation-panel-prop-title-location = Městno:
# Variables:
# $dayOfWeek (String) - The day of the week for a given date.
# $date (String) - The date example: Tuesday, February 24, 2022.
calendar-invitation-datetime-date = { $dayOfWeek }, { $date }
# Variables:
# $time (String) - The time part of a datetime using the "short" timeStyle.
# $timezone (String) - The timezone info for the datetime.
calendar-invitation-datetime-time = { $time } ({ $timezone })
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
calendar-invitation-interval-all-day-between-years = { $startDay }. { $startMonth } { $startYear } – { $endDay }. { $endMonth } { $endYear }
# Example: September 16 – 20, 2022
# Variables:
# $month      (String) - The month the interval is in.
# $startDay   (String) - The day of the month the interval starts.
# $endDay     (String) - The day of the month the interval ends.
# $year       (String) - The year the interval is in.
calendar-invitation-interval-all-day-in-month = { $startDay }.–{ $endDay }. { $month } { $year }
# Example: September 16 – October 20, 2022
# Variables:
# $startMonth (String) - The month the interval starts.
# $startDay   (String) - The day of the month the interval starts.
# $endMonth   (String) - The month the interval ends.
# $endDay     (String) - The day of the month the interval ends.
# $year       (String) - The year the interval is in.
calendar-invitation-interval-all-day-between-months = { $startDay }. { $startMonth } – { $endDay }. { $endMonth } { $year }
# Example: Friday, September 16, 2022 15:00 America/Port of Spain
# Variables:
# $startDate (String) - The date the interval starts.
# $startTime (String) - The time the interval starts.
# $timezone  (String) - The timezone the interval is in.
calendar-invitation-interval-same-date-time = { $startDate } <b>{ $startTime }</b> { $timezone }
# Example: Friday, September 16, 2022 14:00 – 16:00 America/Port of Spain
# Variables:
# $startDate (String) - The date the interval starts.
# $startTime (String) - The time the interval starts.
# $endTime   (String) - The time the interval ends.
# $timezone  (String) - The timezone the interval is in.
calendar-invitation-interval-same-day = { $startDate } <b>{ $startTime }</b>–<b>{ $endTime }</b> { $timezone }
# Example: Friday, September 16, 2022 14:00 – Tuesday, September 20, 2022 16:00 America/Port of Spain
# Variables:
# $startDate (String) - The date the interval starts.
# $startTime (String) - The time the interval starts.
# $endDate   (String) - The date the interval ends.
# $endTime   (String) - The time the interval ends.
# $timezone  (String) - The timezone the interval is in.
calendar-invitation-interval-several-days = { $startDate } <b>{ $startTime }</b> – { $endDate } <b>{ $endTime }</b> { $timezone }
calendar-invitation-panel-prop-title-recurrence = Wospjetowanja:
calendar-invitation-panel-prop-title-attendees = Wobdźělnicy:
calendar-invitation-panel-prop-title-description = Wopisanje:
# Variables:
# $count (Number) - The number of attendees with the "ACCEPTED" participation status.
calendar-invitation-panel-partstat-accepted = { $count } haj
# Variables:
# $count (Number) - The number of attendees with the "DECLINED" participation status.
calendar-invitation-panel-partstat-declined = { $count } ně
# Variables:
# $count (Number) - The number of attendees with the "TENTATIVE" participation status.
calendar-invitation-panel-partstat-tentative = { $count } snano
# Variables:
# $count (Number) - The number of attendees with the "NEEDS-ACTION" participation status.
calendar-invitation-panel-partstat-needs-action = { $count } bjez wotmołwy
# Variables:
# $count (Number) - The total number of attendees.
calendar-invitation-panel-partstat-total = { $count } wobdźělnikow
calendar-invitation-panel-prop-title-attachments = Přiwěški:
calendar-invitation-change-indicator-removed = Wotstronjeny
calendar-invitation-change-indicator-added = Nowy
calendar-invitation-change-indicator-modified = Změnjeny
