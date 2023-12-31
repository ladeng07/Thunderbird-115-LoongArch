# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


def test(mod, path, entity=None):
    import re

    # ignore anything but calendar stuff
    if mod not in ("netwerk", "dom", "toolkit", "security/manager", "calendar"):
        return False

    # Timezone properties don't have to be translated
    if path == "chrome/calendar/timezones.properties":
        return "report"

    # Noun class entries do not have to be translated
    if path == "chrome/calendar/calendar-event-dialog.properties":
        return not re.match(r".*Nounclass[1-9]", entity)

    # most extraction related strings are not required
    if path == "chrome/calendar/calendar-extract.properties":
        if not re.match(r"from.today", entity):
            return "report"

    # Everything else should be taken into account
    return True
