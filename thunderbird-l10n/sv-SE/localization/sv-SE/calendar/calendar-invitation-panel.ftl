# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Variables:
# $organizer (String) - The participant that created the original invitation.
calendar-invitation-panel-intro = { $organizer } har bjudit in dig till:
calendar-invitation-panel-status-new = Du har blivit inbjuden till denna händelse.
calendar-invitation-panel-status-processed = Denna händelse har redan lagts till i din kalender.
calendar-invitation-panel-status-updateminor = Det här meddelandet innehåller en uppdatering för denna händelse.
calendar-invitation-panel-status-updatemajor = Det här meddelandet innehåller en uppdatering för denna händelse. Du bör bekräfta din närvaro igen.
calendar-invitation-panel-status-cancelled = Detta meddelande innehåller en avbokning för denna händelse.
calendar-invitation-panel-status-cancelled-notfound = Det här meddelandet innehåller en avbokning för en händelse som inte finns i din kalender.
# Variables:
# $organizer (String) - The participant that cancelled the invitation.
calendar-invitation-panel-intro-cancel = { $organizer } har avbrutit:
# Variables:
# $summary (String) - A short summary or title of the event.
calendar-invitation-panel-title = { $summary }
calendar-invitation-panel-action-button = Spara
calendar-invitation-panel-view-button = Visa
calendar-invitation-panel-update-button = Uppdatera
calendar-invitation-panel-delete-button = Ta bort
calendar-invitation-panel-accept-button = Ja
calendar-invitation-panel-decline-button = Nej
calendar-invitation-panel-tentative-button = Kanske
calendar-invitation-panel-reply-status = * Du har inte bestämt dig eller svarat ännu
calendar-invitation-panel-more-button = Fler
calendar-invitation-panel-menu-item-save =
    .label = Spara i kalendern
calendar-invitation-panel-menu-item-save-copy =
    .label = Spara en kopia
calendar-invitation-panel-menu-item-toggle-changes =
    .label = Visa ändringar
calendar-invitation-panel-prop-title-when = När:
calendar-invitation-panel-prop-title-location = Plats:
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
calendar-invitation-interval-all-day-between-years = { $startMonth } { $startDay }, { $startYear } – { $endMonth } { $endDay }, { $endYear }
# Example: September 16 – 20, 2022
# Variables:
# $month      (String) - The month the interval is in.
# $startDay   (String) - The day of the month the interval starts.
# $endDay     (String) - The day of the month the interval ends.
# $year       (String) - The year the interval is in.
calendar-invitation-interval-all-day-in-month = { $month } { $startDay } – { $endDay }, { $year }
# Example: September 16 – October 20, 2022
# Variables:
# $startMonth (String) - The month the interval starts.
# $startDay   (String) - The day of the month the interval starts.
# $endMonth   (String) - The month the interval ends.
# $endDay     (String) - The day of the month the interval ends.
# $year       (String) - The year the interval is in.
calendar-invitation-interval-all-day-between-months = { $startMonth } { $startDay } – { $endMonth } { $endDay }, { $year }
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
calendar-invitation-interval-same-day = { $startDate } <b>{ $startTime }</b> – <b>{ $endTime }</b> { $timezone }
# Example: Friday, September 16, 2022 14:00 – Tuesday, September 20, 2022 16:00 America/Port of Spain
# Variables:
# $startDate (String) - The date the interval starts.
# $startTime (String) - The time the interval starts.
# $endDate   (String) - The date the interval ends.
# $endTime   (String) - The time the interval ends.
# $timezone  (String) - The timezone the interval is in.
calendar-invitation-interval-several-days = { $startDate } <b>{ $startTime }</b> – { $endDate } <b>{ $endTime }</b> { $timezone }
calendar-invitation-panel-prop-title-recurrence = Upprepningar:
calendar-invitation-panel-prop-title-attendees = Deltagare:
calendar-invitation-panel-prop-title-description = Beskrivning:
# Variables:
# $count (Number) - The number of attendees with the "ACCEPTED" participation status.
calendar-invitation-panel-partstat-accepted = { $count } ja
# Variables:
# $count (Number) - The number of attendees with the "DECLINED" participation status.
calendar-invitation-panel-partstat-declined = { $count } nej
# Variables:
# $count (Number) - The number of attendees with the "TENTATIVE" participation status.
calendar-invitation-panel-partstat-tentative = { $count } kanske
# Variables:
# $count (Number) - The number of attendees with the "NEEDS-ACTION" participation status.
calendar-invitation-panel-partstat-needs-action = { $count } väntande
# Variables:
# $count (Number) - The total number of attendees.
calendar-invitation-panel-partstat-total = { $count } deltagare
calendar-invitation-panel-prop-title-attachments = Bilagor:
calendar-invitation-change-indicator-removed = Borttagen
calendar-invitation-change-indicator-added = Ny
calendar-invitation-change-indicator-modified = Ändrad
