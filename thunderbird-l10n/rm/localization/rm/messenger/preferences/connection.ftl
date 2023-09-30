# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

connection-dns-over-https-url-resolver = Utilisar il purschider
    .accesskey = r
# Variables:
#   $name (String) - Display name or URL for the DNS over HTTPS provider
connection-dns-over-https-url-item-default =
    .label = { $name } (predefinì)
    .tooltiptext = Utilisar l'URL da standard per resolver DNS via HTTPS
connection-dns-over-https-url-custom =
    .label = Persunalisà
    .accesskey = P
    .tooltiptext = Endatescha l'URL preferì per resolver DNS via HTTPS
connection-dns-over-https-custom-label = Persunalisà
connection-dialog-window =
    .title = Preferenzas da connexiun
    .style =
        { PLATFORM() ->
            [macos] width: 44em !important
           *[other] width: 49em !important
        }
connection-dialog-window2 =
    .title = Parameters da connexiun
disable-extension-button = Deactivar l'extensiun
# Variables:
#   $name (String) - The extension that is controlling the proxy settings.
#
# The extension-icon is the extension's icon, or a fallback image. It should be
# purely decoration for the actual extension name, with alt="".
proxy-settings-controlled-by-extension = Ina extensiun, <img data-l10n-name="extension-icon" alt="" /> { $name }, administrescha la moda da connexiun cun l'internet da { -brand-short-name }.
connection-proxy-legend = Configurar ils proxies per l'access a l'internet
proxy-type-no =
    .label = Nagin proxy
    .accesskey = y
proxy-type-wpad =
    .label = Enconuscher automaticamain las preferenzas da proxy per questa rait
    .accesskey = E
proxy-type-system =
    .label = Utilisar las preferenzas da proxy dal sistem
    .accesskey = U
proxy-type-manual =
    .label = Configuraziun da proxy manuala
    .accesskey = M
proxy-http-label =
    .value = Proxy HTTP:
    .accesskey = H
http-port-label =
    .value = Port:
    .accesskey = P
proxy-http-sharing =
    .label = Era utilisar quest proxy per HTTPS
    .accesskey = x
proxy-https-label =
    .value = Proxy HTTPS:
    .accesskey = S
ssl-port-label =
    .value = Port:
    .accesskey = o
proxy-socks-label =
    .value = Host da SOCKS:
    .accesskey = C
socks-port-label =
    .value = Port:
    .accesskey = t
proxy-socks4-label =
    .label = SOCKS v4
    .accesskey = K
proxy-socks5-label =
    .label = SOCKS v5
    .accesskey = v
proxy-type-auto =
    .label = URL per la configuraziun da proxy automatica:
    .accesskey = A
proxy-reload-label =
    .label = Rechargiar
    .accesskey = R
no-proxy-label =
    .value = Nagin proxy per:
    .accesskey = N
no-proxy-example = Exempel: .mozilla.org, .giuru.ch, 192.168.1.0/24
# Do not translate "localhost", "127.0.0.1/8" and "::1". (You can translate "and".)
connection-proxy-noproxy-localhost-desc-2 = Las connexiuns cun localhost, 127.0.0.1/8 e ::1 n'utiliseschan mai in proxy.
proxy-password-prompt =
    .label = Betg pretender l'autentificaziun sch'il pled-clav è memorisà
    .accesskey = i
    .tooltiptext = Questa opziun t'autentifitgescha automaticamain tar proxies sche ti has memorisà las infurmaziuns d'annunzia correspundentas. L'autentificaziun manuala è mo necessaria sche l'autentificaziun automatica na reussescha betg.
proxy-remote-dns =
    .label = Utilisar in DNS proxy sche SOCKS v5 è activ
    .accesskey = d
proxy-enable-doh =
    .label = Activar DNS via HTTPS
    .accesskey = v
