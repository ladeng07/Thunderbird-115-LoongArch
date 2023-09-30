# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## The following feature name must be treated as a brand.
##
## They cannot be:
## - Transliterated.
## - Translated.
##
## Declension should be avoided where possible, leaving the original
## brand unaltered in prominent UI positions.
##
## For further details, consult:
## https://mozilla-l10n.github.io/styleguides/mozilla_general/#brands-copyright-and-trademark

##

# This is the title of the page
about-logging-title = Om logging
about-logging-page-title = Loggbehandler
about-logging-current-log-file = Current Log File:
about-logging-new-log-file = Ny loggfil:
about-logging-currently-enabled-log-modules = Aktiverte loggmoduler for øyeblikket:
about-logging-log-tutorial = See <a data-l10n-name="logging">HTTP Logging</a> for instructions on how to use this tool.
# This message is used as a button label, "Open" indicates an action.
about-logging-open-log-file-dir = Åpne mappe
about-logging-set-log-file = Velg loggfil
about-logging-set-log-modules = Velg loggmoduler
about-logging-start-logging = Start loggføring
about-logging-stop-logging = Stopp loggføring
about-logging-buttons-disabled = Logging konfigurert via miljøvariabler, dynamisk konfigurasjon er ikke tilgjengelig.
about-logging-some-elements-disabled = Logging konfigurert via URL, noen konfigurasjonsalternativer er ikke tilgjengelige
about-logging-info = Info:
about-logging-log-modules-selection = Loggmodulvalg
about-logging-new-log-modules = Nye loggmoduler:
about-logging-logging-output-selection = Loggresultat
about-logging-logging-to-file = Logger til en fil
about-logging-logging-to-profiler = Logger til { -profiler-brand-name }
about-logging-no-log-modules = Ingen
about-logging-no-log-file = Ingen
about-logging-logging-preset-selector-text = Forhåndsvalg for logging:

## Logging presets

about-logging-preset-networking-label = Nettverk
about-logging-preset-networking-description = Loggmoduler for å diagnostisere nettverksproblemer
about-logging-preset-media-playback-label = Medieavspilling
about-logging-preset-media-playback-description = Loggmoduler for å diagnostisere problemer med medieavspilling (ikke for problemer med videokonferanser)
about-logging-preset-custom-label = Tilpasset
about-logging-preset-custom-description = Loggmoduler valgt manuelt

# Error handling
about-logging-error = Feil:

## Variables:
##   $k (String) - Variable name
##   $v (String) - Variable value

about-logging-invalid-output = Ugyldig verdi «{ $v }» for nøkkel «{ $k }»
about-logging-unknown-logging-preset = Ukjent forhåndsvalg for logging «{ $v }»
about-logging-unknown-profiler-preset = Ukjent forhåndsvalg for profilering «{ $v }»
about-logging-unknown-option = Ukjent alternativ for about:logging «{ $k }»
about-logging-configuration-url-ignored = Konfigurasjons-URL ignorert
about-logging-file-and-profiler-override = Kan ikke tvinge utdata for fil og overstyre innstillinger for profilering samtidig

about-logging-configured-via-url = Alternativ satt opp via URL
