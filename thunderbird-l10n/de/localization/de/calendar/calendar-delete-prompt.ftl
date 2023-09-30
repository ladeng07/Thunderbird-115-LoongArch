# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Variables:
## $count (Number) - Number of events selected for deletion.

calendar-delete-event-prompt-title =
    { $count ->
        [one] Termin löschen
       *[other] Termine löschen
    }
calendar-delete-event-prompt-message =
    { $count ->
        [one] Soll dieser Termin wirklich gelöscht werden?
       *[other] Sollen diese { $count } Termine wirklich gelöscht werden?
    }

## Variables:
## $count (Number) - Number of tasks selected for deletion.

calendar-delete-task-prompt-title =
    { $count ->
        [one] Aufgabe löschen
       *[other] Aufgaben löschen
    }
calendar-delete-task-prompt-message =
    { $count ->
        [one] Soll diese Aufgabe wirklich gelöscht werden?
       *[other] Sollen diese { $count } Aufgaben wirklich gelöscht werden?
    }

## Variables:
## $count (Number) - Number of items selected for deletion.

calendar-delete-item-prompt-title =
    { $count ->
        [one] Eintrag löschen
       *[other] Einträge löschen
    }
calendar-delete-item-prompt-message =
    { $count ->
        [one] Soll dieser Eintrag wirklich gelöscht werden?
       *[other] Sollen diese { $count } Einträge wirklich gelöscht werden?
    }

##

calendar-delete-prompt-disable-message = Nicht mehr danach fragen.
