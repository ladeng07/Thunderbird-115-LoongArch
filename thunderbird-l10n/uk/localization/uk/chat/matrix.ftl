# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Matrix Protocol strings


## Conversation names when a room has no user readable name.

room-name-empty = Порожня розмова
# Variables:
#  $oldName (String) - The previous name the conversation had before it was
#    removed.
room-name-empty-had-name = Порожня розмова (називалась { $oldName })
# Variables:
#  $participant (String) - The name of one participant that isn't the user.
#  $otherParticipantsCount (Number) - The count of other participants apart from
#    the user and $participant.
room-name-others =
    { $otherParticipantsCount ->
        [one] { $participant } та { $otherParticipantCount } інший
        [few] { $participant } та { $otherParticipantCount } інші
       *[many] { $participant } та { $otherParticipantCount } інших
    }
# Variables:
#  $participant (String) - The name of one participant that isn't the user.
#  $otherParticipantCount (Number) - The count of other participants apart from
#    the user and $participant.
room-name-others2 =
    { $otherParticipantCount ->
        [one] { $participant } і { $otherParticipantCount } інший
        [few] { $participant } і { $otherParticipantCount } інших
        [many] { $participant } і { $otherParticipantCount } інших
       *[other] { $participant } і { $otherParticipantCount } інших
    }
