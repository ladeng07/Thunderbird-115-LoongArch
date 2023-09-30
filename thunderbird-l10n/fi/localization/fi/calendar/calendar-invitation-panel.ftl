# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Variables:
# $organizer (String) - The participant that created the original invitation.
calendar-invitation-panel-intro = { $organizer } kutsui sinut:
calendar-invitation-panel-status-new = Sinut on kutsuttu tähän tapahtumaan.
calendar-invitation-panel-status-processed = Tämä tapahtuma on jo lisätty kalenteriisi.
calendar-invitation-panel-status-updateminor = Tämä viesti sisältää päivityksen tähän tapahtumaan.
calendar-invitation-panel-status-updatemajor = Tämä viesti sisältää päivityksen tähän tapahtumaan. Sinun tulee vahvistaa osallistumisesi uudelleen.
calendar-invitation-panel-status-cancelled = Tämä viesti sisältää tämän tapahtuman peruutuksen.
calendar-invitation-panel-status-cancelled-notfound = Tämä viesti sisältää peruutuksen tapahtumalle, jota ei löydy kalenteristasi.
# Variables:
# $organizer (String) - The participant that cancelled the invitation.
calendar-invitation-panel-intro-cancel = { $organizer } perui:
# Variables:
# $summary (String) - A short summary or title of the event.
calendar-invitation-panel-title = { $summary }
calendar-invitation-panel-action-button = Tallenna
calendar-invitation-panel-view-button = Näytä
calendar-invitation-panel-update-button = Päivitä
calendar-invitation-panel-delete-button = Poista
calendar-invitation-panel-accept-button = Kyllä
calendar-invitation-panel-decline-button = Ei
calendar-invitation-panel-tentative-button = Ehkä
calendar-invitation-panel-reply-status = * Et ole vielä päättänyt tai vastannut
calendar-invitation-panel-more-button = Lisää
calendar-invitation-panel-menu-item-save-copy =
    .label = Tallenna kopio
calendar-invitation-panel-menu-item-toggle-changes =
    .label = Näytä muutokset
calendar-invitation-panel-prop-title-when = Aika:
calendar-invitation-panel-prop-title-location = Sijainti:
# Variables:
# $dayOfWeek (String) - The day of the week for a given date.
# $date (String) - The date example: Tuesday, February 24, 2022.
calendar-invitation-datetime-date = { $dayOfWeek }, { $date }
# Variables:
# $time (String) - The time part of a datetime using the "short" timeStyle.
# $timezone (String) - The timezone info for the datetime.
calendar-invitation-datetime-time = { $time } ({ $timezone })
calendar-invitation-panel-prop-title-recurrence = Toistuu:
calendar-invitation-panel-prop-title-attendees = Osallistujat:
calendar-invitation-panel-prop-title-description = Kuvaus:
# Variables:
# $count (Number) - The number of attendees with the "ACCEPTED" participation status.
calendar-invitation-panel-partstat-accepted = { $count } kyllä
# Variables:
# $count (Number) - The number of attendees with the "DECLINED" participation status.
calendar-invitation-panel-partstat-declined = { $count } ei
# Variables:
# $count (Number) - The number of attendees with the "TENTATIVE" participation status.
calendar-invitation-panel-partstat-tentative = { $count } ehkä
# Variables:
# $count (Number) - The number of attendees with the "NEEDS-ACTION" participation status.
calendar-invitation-panel-partstat-needs-action = { $count } odottaa
# Variables:
# $count (Number) - The total number of attendees.
calendar-invitation-panel-partstat-total = { $count } osallistujaa
calendar-invitation-panel-prop-title-attachments = Liitteet:
calendar-invitation-change-indicator-removed = Poistettu
calendar-invitation-change-indicator-added = Uusi
calendar-invitation-change-indicator-modified = Muutettu
