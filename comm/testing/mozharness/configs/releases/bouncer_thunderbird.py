#  This Source Code Form is subject to the terms of the Mozilla Public
#  License, v. 2.0. If a copy of the MPL was not distributed with this
#  file, You can obtain one at http://mozilla.org/MPL/2.0/.

# lint_ignore=E501
config = {
    "products": {
        "installer": {
            "product-name": "Thunderbird-%(version)s",
            "platforms": [
                "linux",
                "linux64",
                "osx",
                "win",
                "win64",
            ],
        },
        "installer-ssl": {
            "product-name": "Thunderbird-%(version)s-SSL",
            "platforms": [
                "linux",
                "linux64",
                "osx",
                "win",
                "win64",
            ],
        },
        "msi": {
            "product-name": "Thunderbird-%(version)s-msi-SSL",
            "platforms": [
                "win",
                "win64",
            ],
        },
        "msix": {
            "product-name": "Thunderbird-%(version)s-msix-SSL",
            "platforms": [
                "win",
                "win64",
            ],
        },
        "complete-mar": {
            "product-name": "Thunderbird-%(version)s-Complete",
            "platforms": [
                "linux",
                "linux64",
                "osx",
                "win",
                "win64",
            ],
        },
    },
    "partials": {
        "releases-dir": {
            "product-name": "Thunderbird-%(version)s-Partial-%(prev_version)s",
            "platforms": [
                "linux",
                "linux64",
                "osx",
                "win",
                "win64",
            ],
        },
    },
}
