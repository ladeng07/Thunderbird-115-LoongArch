# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## The Enterprise Policies feature is aimed at system administrators
## who want to deploy these settings across several Thunderbird installations
## all at once. This is traditionally done through the Windows Group Policy
## feature, but the system also supports other forms of deployment.
## These are short descriptions for individual policies, to be displayed
## in the documentation section in about:policies.

policy-3rdparty = Defineix les polítiques a les quals WebExtensions pot accedir mitjançant chrome.storage.managed.
policy-AppAutoUpdate = Activa o desactiva les actualitzacions automàtiques de l'aplicació.
policy-AppUpdatePin = Impedeix que el { -brand-short-name } s'actualitzi més enllà de la versió indicada.
policy-AppUpdateURL = Defineix un URL personalitzat d'actualització de l'aplicació.
policy-Authentication = Configura l'autenticació integrada per a les pàgines web que l'admeten.
policy-BackgroundAppUpdate2 = Activa o desactiva l'actualitzador en segon pla.
policy-BlockAboutAddons = Bloca l'accés al gestor de complements (about:addons).
policy-BlockAboutConfig = Bloca l'accés a la pàgina about:config.
policy-BlockAboutProfiles = Bloca l'accés a la pàgina about:profiles.
policy-BlockAboutSupport = Bloca l'accés a la pàgina about:support.
policy-CaptivePortal = Activa o desactiva la funcionalitat de portal captiu.
policy-CertificatesDescription = Afegeix certificats o utilitza certificats integrats.
policy-Cookies = Permet o denega que els llocs web defineixin galetes.
policy-DisableBuiltinPDFViewer = Desactiva el PDF.js, el visor de PDF incorporat en el { -brand-short-name }.
policy-DisabledCiphers = Desactiva els xifratges.
policy-DefaultDownloadDirectory = Defineix el directori de baixades per defecte.
policy-DisableAppUpdate = Evita que el { -brand-short-name } s’actualitzi.
policy-DisableDefaultClientAgent = Evita que l'agent del client per defecte realitzi qualsevol acció. Només s'aplica al Windows; les altres plataformes no tenen l'agent.
policy-DisableDeveloperTools = Bloca l'accés a les eines per a desenvolupadors.
policy-DisableFeedbackCommands = Desactiva les ordres per enviar comentaris del menú Ajuda («Envia comentaris» i «Informa que el lloc és enganyós»).
policy-DisableForgetButton = Evita l'accés al botó Oblida.
policy-DisableFormHistory = No recorda l'historial de cerca ni de formularis.
policy-DisableMasterPasswordCreation = Si és cert, no es pot crear una contrasenya mestra.
policy-DisablePasswordReveal = No permet mostrar les contrasenyes dels inicis de sessió desats.
policy-DisableProfileImport = Desactiva l'ordre de menú per importar les dades d'una altra aplicació.
policy-DisableSafeMode = Desactiva la funció de reiniciar en mode segur. Nota: en el Windows, la tecla Maj per entrar en mode segur només es pot desactivar mitjançant l'Estratègia de grup.
policy-DisableSecurityBypass = Evita que l'usuari ignori certs avisos de seguretat.
policy-DisableSystemAddonUpdate = Evita que el { -brand-short-name } instal·li i actualitzi els complements del sistema.
policy-DisableTelemetry = Desactiva la telemesura.
policy-DisplayMenuBar = Mostra la barra de menús per defecte.
policy-DNSOverHTTPS = Configura DNS sobre HTTPS.
policy-DontCheckDefaultClient = Desactiva la comprovació de client per defecte en iniciar.
policy-DownloadDirectory = Defineix i bloca el directori de baixades.
# “lock” means that the user won’t be able to change this setting
policy-EnableTrackingProtection = Activa o desactiva el Bloqueig de contingut i, opcionalment, el bloca.
# “lock” means that the user won’t be able to change this setting
policy-EncryptedMediaExtensions = Activa o desactiva les extensions de contingut multimèdia xifrat i, opcionalment, les bloca.
# A “locked” extension can’t be disabled or removed by the user. This policy
# takes 3 keys (“Install”, ”Uninstall”, ”Locked”), you can either keep them in
# English or translate them as verbs.
policy-Extensions = Instal·la, desinstal·la o bloca extensions. L'opció d'instal·lar utilitza URL o camins com a paràmetres. Les opcions de desinstal·lar o blocar utilitzen els identificadors de les extensions.
policy-ExtensionSettings = Gestiona tots els aspectes de la instal·lació de l'extensió.
policy-ExtensionUpdate = Activa o desactiva les actualitzacions automàtiques de les extensions.
policy-Handlers = Configura els gestors d'aplicacions per defecte.
policy-HardwareAcceleration = Si és fals, desactiva l'acceleració de maquinari.
policy-InstallAddonsPermission = Permet que determinats llocs web instal·lin complements.
policy-LegacyProfiles = Desactiva la funció aplicant un perfil independent per a cada instal·lació.

## Do not translate "SameSite", it's the name of a cookie attribute.

policy-LegacySameSiteCookieBehaviorEnabled = Activa la configuració del comportament antic per defecte de les galetes SameSite.
policy-LegacySameSiteCookieBehaviorEnabledForDomainList = Torna al comportament de SameSite antic per a les galetes dels llocs especificats.

##

policy-LocalFileLinks = Permetre que llocs web específics enllacin a fitxers locals.
policy-ManualAppUpdateOnly = Permet només les actualitzacions manuals i no notifiquis l'usuari quan hi hagi actualitzacions.
policy-NetworkPrediction = Activa o desactiva la predicció de xarxa (obtenció prèvia de DNS).
policy-OfferToSaveLogins = Força el paràmetre per a permetre que el { -brand-short-name } ofereixi recordar els inicis de sessió i les contrasenyes que s'hagin desat. Els valors acceptats són «true» (cert) i «false» (fals).
policy-OfferToSaveLoginsDefault = Defineix el valor per defecte del paràmetre per a permetre que el { -brand-short-name } ofereixi recordar els inicis de sessió i les contrasenyes que s'hagin desat. Els valors acceptats són «true» (cert) i «false» (fals).
policy-OverrideFirstRunPage = Substitueix la pàgina de la primera execució. Deixeu aquesta política en blanc si voleu desactivar la pàgina de la primera execució.
policy-OverridePostUpdatePage = Substitueix la pàgina «Novetats» després d'una actualització. Deixeu aquesta política en blanc si voleu desactivar la pàgina de després de les actualitzacions.
policy-PasswordManagerEnabled = Permet desar les contrasenyes en el gestor de contrasenyes.
# PDF.js and PDF should not be translated
policy-PDFjs = Desactiva o configura el PDF.js, el visor de PDF incorporat en el { -brand-short-name }.
policy-Permissions2 = Configura els permisos per a la càmera, el micròfon, la ubicació, les notificacions i la reproducció automàtica.
policy-Preferences = Defineix i bloca els valors d'un subconjunt de preferències.
policy-PrimaryPassword = Requereix o impedeix l'ús d'una contrasenya principal.
policy-PromptForDownloadLocation = Demana on es desaran els fitxers en baixar-los.
policy-Proxy = Configura els paràmetres del servidor intermediari.
policy-RequestedLocales = Defineix la llista de llengües sol·licitades per a l'aplicació, en ordre de preferència.
policy-SanitizeOnShutdown2 = Esborra les dades de navegació en tancar.
policy-SearchEngines = Configura els paràmetres del motor de cerca. Aquesta política només està disponible en la versió Extended Support Release (ESR).
policy-SearchSuggestEnabled = Activa o desactiva els suggeriments de cerca.
# For more information, see https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/PKCS11/Module_Installation
policy-SecurityDevices = Instal·la mòduls PKCS #11.
policy-SSLVersionMax = Defineix la versió màxima de SSL.
policy-SSLVersionMin = Defineix la versió mínima de SSL.
policy-SupportMenu = Afegeix un element de menú d'assistència personalitzat en el menú d'ajuda.
policy-UserMessaging = No mostra certs missatges a l'usuari.
# “format” refers to the format used for the value of this policy.
policy-WebsiteFilter = Bloca les visites a pàgines web. Vegeu la documentació per a més detalls sobre el format.
