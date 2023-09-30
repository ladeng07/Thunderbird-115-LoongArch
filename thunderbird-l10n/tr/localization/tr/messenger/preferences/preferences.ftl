# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

close-button =
    .aria-label = Kapat
preferences-doc-title2 = Ayarlar
category-list =
    .aria-label = Kategoriler
pane-general-title = Genel
category-general =
    .tooltiptext = { pane-general-title }
pane-compose-title = Düzenleme
category-compose =
    .tooltiptext = Düzenleme
pane-privacy-title = Gizlilik ve Güvenlik
category-privacy =
    .tooltiptext = Gizlilik ve Güvenlik
pane-chat-title = Sohbet
category-chat =
    .tooltiptext = Sohbet
pane-calendar-title = Takvim
category-calendar =
    .tooltiptext = Takvim
pane-sync-title = Eşitle
category-sync =
    .tooltiptext = Eşitle
general-language-and-appearance-header = Dil ve Görünüm
general-incoming-mail-header = Gelen E-postalar
general-files-and-attachment-header = Dosyalar ve Ekler
general-tags-header = Etiketler
general-reading-and-display-header = Okuma ve Görünüm
general-updates-header = Güncellemeler
general-network-and-diskspace-header = Ağ ve Disk Alanı
general-indexing-label = Dizin Oluşturma
composition-category-header = Düzenleme
composition-attachments-header = Ekler
composition-spelling-title = Yazım Denetimi
compose-html-style-title = HTML Stili
composition-addressing-header = Adresler
privacy-main-header = Gizlilik
privacy-passwords-header = Parolalar
privacy-junk-header = Gereksiz
collection-header = { -brand-short-name } Veri Toplama ve Kullanma İzinleri
collection-description = Yalnızca { -brand-short-name } yazılımını geliştirmemize yarayacak verileri topluyoruz ve istemezseniz onları da toplamıyoruz. Kişisel verilerinizi sunucularımıza göndermeden önce mutlaka izninizi istiyoruz.
collection-privacy-notice = Gizlilik Bildirimi
collection-health-report-telemetry-disabled = Artık { -vendor-short-name }’nın teknik veri ve etkileşim verisi toplamasına izin vermiyorsunuz. Eski verilerinizin hepsi 30 gün içinde silinecektir.
collection-health-report-telemetry-disabled-link = Daha fazla bilgi al
collection-health-report =
    .label = { -brand-short-name }, teknik ve etkileşim verilerimi { -vendor-short-name }’ya gönderebilir
    .accesskey = t
collection-health-report-link = Daha fazla bilgi al
# This message is displayed above disabled data sharing options in developer builds
# or builds with no Telemetry support available.
collection-health-report-disabled = Bu yapılandırma için veri raporlama devre dışı bırakılmış
collection-backlogged-crash-reports =
    .label = { -brand-short-name } geriye dönük çökme raporlarını benim adıma gönderebilir
    .accesskey = ö
collection-backlogged-crash-reports-link = Daha fazla bilgi al
privacy-security-header = Güvenlik
privacy-scam-detection-title = Dolandırıcılık Algılama
privacy-anti-virus-title = Antivirüs
privacy-certificates-title = Sertifikalar
chat-pane-header = Sohbet
chat-status-title = Durum
chat-notifications-title = Bildirimler
chat-pane-styling-header = Biçem
choose-messenger-language-description = { -brand-short-name } menülerini, iletilerini ve bildirimlerini göstermede kullanılacak dilleri seçin.
manage-messenger-languages-button =
    .label = Alternatifleri ayarla…
    .accesskey = l
confirm-messenger-language-change-description = Bu değişiklikleri uygulamak için { -brand-short-name } yeniden başlatılmalıdır
confirm-messenger-language-change-button = Uygula ve yeniden başlat
update-setting-write-failure-title = Güncelleme tercihleri kaydedilirken hata oluştu
# Variables:
#   $path (String) - Path to the configuration file
# The newlines between the main text and the line containing the path is
# intentional so the path is easier to identify.
update-setting-write-failure-message =
    { -brand-short-name } bir hatayla karşılaştı ve bu değişikliği kaydetmedi. Bu güncelleme tercihinin ayarlanması için aşağıdaki dosyaya yazma izninizin olması gerekir. Siz veya sistem yöneticiniz bu dosya için Kullanıcılar grubuna tam denetim vererek hatayı giderebilirsiniz.
    
    Dosyaya yazılamadı: { $path }
update-in-progress-title = Güncelleme sürüyor
update-in-progress-message = { -brand-short-name } bu güncellemeyi uygulamaya devam etsin mi?
update-in-progress-ok-button = &Vazgeç
# Continue is the cancel button so pressing escape or using a platform standard
# method of closing the UI will not discard the update.
update-in-progress-cancel-button = &Devam et
account-button = Hesap Ayarları
open-addons-sidebar-button = Eklentiler ve Temalar

## OS Authentication dialog

# This message can be seen by trying to add a Primary Password.
primary-password-os-auth-dialog-message-win = Ana parola oluşturmak için Windows hesap bilgilerinizi girin. Bu sayede hesaplarınızı daha güvenli bir şekilde koruyabiliriz.
# This message can be seen by trying to add a Primary Password.
# The macOS strings are preceded by the operating system with "Thunderbird is trying to "
# and includes subtitle of "Enter password for the user "xxx" to allow this." These
# notes are only valid for English. Please test in your locale.
primary-password-os-auth-dialog-message-macosx = ana parola oluşturma
# Don't change this label.
master-password-os-auth-dialog-caption = { -brand-full-name }

## General Tab

focus-search-shortcut =
    .key = f
focus-search-shortcut-alt =
    .key = k
general-legend = { -brand-short-name } Başlangıç Sayfası
start-page-label =
    .label = { -brand-short-name } açıldığında ileti alanında Başlangıç Sayfasını göster
    .accesskey = B
location-label =
    .value = Konum:
    .accesskey = o
restore-default-label =
    .label = Varsayılanı geri yükle
    .accesskey = V
default-search-engine = Varsayılan Arama Motoru
add-web-search-engine =
    .label = Ekle…
    .accesskey = E
remove-search-engine =
    .label = Kaldır
    .accesskey = r
add-opensearch-provider-title = OpenSearch sağlayıcısı ekle
add-opensearch-provider-text = Eklenecek OpenSearch sağlayıcının URL’sini girin. OpenSearch Açıklama dosyasının tam URL’sini veya sağlayıcının otomatik olarak keşfedilebileceği bir URL’yi kullanın.
adding-opensearch-provider-failed-title = OpenSearch sağlayıcısı ekleme başarısız
# Variables:
# $url (String) - URL an OpenSearch provider was requested for.
adding-opensearch-provider-failed-text = { $url } için OpenSearch sağlayıcısı eklenemedi.
minimize-to-tray-label =
    .label = { -brand-short-name } simge durumuna küçültüldüğünde sistem tepsisine taşı
    .accesskey = m
new-message-arrival = Yeni ileti geldiğinde:
mail-play-sound-label =
    .label =
        { PLATFORM() ->
            [macos] Aşağıdaki ses dosyasını çal:
           *[other] Ses çıkar
        }
    .accesskey =
        { PLATFORM() ->
            [macos] d
           *[other] S
        }
mail-play-button =
    .label = Çal
    .accesskey = l
change-dock-icon = Uygulama simgesi tercihlerini değiştir
app-icon-options =
    .label = Uygulama simgesi seçenekleri…
    .accesskey = m
notification-settings2 = Uyarıları ve varsayılan sesi Sistem Ayarları'ndaki Bildirim bölümünden kapatabilirsiniz.
animated-alert-label =
    .label = Uyarı göster
    .accesskey = U
customize-alert-label =
    .label = Özelleştir…
    .accesskey = z
biff-use-system-alert =
    .label = Sistem bildirimini kullan
tray-icon-unread-label =
    .label = Okunmamış iletiler için bildirim alanında simge göster
    .accesskey = O
tray-icon-unread-description = Küçük görev çubuğu düğmelerini kullanırken önerilir
mail-system-sound-label =
    .label = Yeni posta için varsayılan sistem sesi
    .accesskey = v
mail-custom-sound-label =
    .label = Aşağıdaki ses dosyasını kullan
    .accesskey = d
mail-browse-sound-button =
    .label = Gözat…
    .accesskey = G
enable-gloda-search-label =
    .label = Global aramayı ve dizin oluşturmayı etkinleştir
    .accesskey = G
datetime-formatting-legend = Tarih ve Saat Biçimi
language-selector-legend = Dil
allow-hw-accel =
    .label = Mümkün olduğunda donanım ivmelenmesini kullan
    .accesskey = d
store-type-label =
    .value = Yeni hesaplarda ileti depolama türü:
    .accesskey = t
mbox-store-label =
    .label = Her klasör için ayrı dosya (mbox)
maildir-store-label =
    .label = Her ileti için bir dosya (maildir)
scrolling-legend = Kaydırma
autoscroll-label =
    .label = Otomatik kaydırmayı kullan
    .accesskey = O
smooth-scrolling-label =
    .label = Yumuşak kaydırmayı kullan
    .accesskey = Y
browsing-gtk-use-non-overlay-scrollbars =
    .label = Kaydırma çubuklarını her zaman göster
    .accesskey = u
window-layout-legend = Pencere Düzeni
draw-in-titlebar-label =
    .label = Sistem penceresi başlık çubuğunu gizle
    .accesskey = z
auto-hide-tabbar-label =
    .label = Sekme çubuğunu otomatik gizle
    .accesskey = o
auto-hide-tabbar-description = Yalnızca tek bir sekme açıkken sekme çubuğunu gizle
system-integration-legend = Sistem Bütünleşmesi
always-check-default =
    .label = Varsayılan e-posta istemcimin { -brand-short-name } olup olmadığını açılışta denetle
    .accesskey = a
check-default-button =
    .label = Şimdi denetle…
    .accesskey = n
# Note: This is the search engine name for all the different platforms.
# Platforms that don't support it should be left blank.
search-engine-name =
    { PLATFORM() ->
        [macos] Spotlight
        [windows] Windows Araması
       *[other] { "" }
    }
search-integration-label =
    .label = { search-engine-name } uygulamasının iletileri aramasına izin ver
    .accesskey = s
config-editor-button =
    .label = Yapılandırma düzenleyici…
    .accesskey = z
return-receipts-description = { -brand-short-name } uygulamasının alındı onayı gönderme ayarlarını belirleyin
return-receipts-button =
    .label = Alındı onayları…
    .accesskey = A
update-app-legend = { -brand-short-name } Güncellemeleri
# Variables:
#   $version (String): version of Thunderbird, e.g. 68.0.1
update-app-version = Sürüm { $version }
allow-description = { -brand-short-name } şunları yapabilir
automatic-updates-label =
    .label = Güncellemeleri otomatik olarak kur (önerilir: artırılmış güvenlik)
    .accesskey = o
check-updates-label =
    .label = Güncellemeleri denetle, ama onları kurma kararını bana bırak
    .accesskey = d
update-history-button =
    .label = Güncelleme geçmişini göster
    .accesskey = n
use-service =
    .label = Güncellemeleri kurmak için arka plan hizmetini kullan
    .accesskey = G
cross-user-udpate-warning = Bu ayar tüm Windows hesaplarına ve bu { -brand-short-name } profilini kullanan { -brand-short-name } kurulumlarına uygulanacaktır.
networking-legend = Bağlantı
proxy-config-description = { -brand-short-name } uygulamasının internete nasıl bağlandığını yapılandır
network-settings-button =
    .label = Ayarlar…
    .accesskey = A
offline-legend = Çevrimdışı
offline-settings = Çevrimdışı ayarlarını yapılandır
offline-settings-button =
    .label = Çevrimdışı…
    .accesskey = d
diskspace-legend = Disk Alanı
offline-compact-folder =
    .label = Toplam
    .accesskey = o
offline-compact-folder-automatically =
    .label = Sıkıştırmadan önce her seferinde sor
    .accesskey = o
compact-folder-size =
    .value = MB kazanılabileceği zaman tüm dizinleri sıkıştır

## Note: The entities use-cache-before and use-cache-after appear on a single
## line in preferences as follows:
## use-cache-before [ textbox for cache size in MB ] use-cache-after

use-cache-before =
    .value = Önbellek için en fazla
    .accesskey = b
use-cache-after = MB kullan

##

smart-cache-label =
    .label = Otomatik önbellek yönetiminin üzerine yaz
    .accesskey = O
clear-cache-button =
    .label = Şimdi temizle
    .accesskey = t
clear-cache-shutdown-label =
    .label = Kapanırken önbelleği temizle
    .accesskey = t
fonts-legend = Yazı Tipleri ve Renkler
default-font-label =
    .value = Varsayılan yazı tipi:
    .accesskey = z
default-size-label =
    .value = Boyut:
    .accesskey = o
font-options-button =
    .label = Gelişmiş…
    .accesskey = e
color-options-button =
    .label = Renkler…
    .accesskey = R
display-width-legend = Düz Metinli İletiler
# Note : convert-emoticons-label 'Emoticons' are also known as 'Smileys', e.g. :-)
convert-emoticons-label =
    .label = Duygu simgelerini grafik olarak göster
    .accesskey = D
display-text-label = Alıntılanmış düz metin iletileri görüntülerken:
style-label =
    .value = Biçem:
    .accesskey = B
regular-style-item =
    .label = Normal
bold-style-item =
    .label = Kalın
italic-style-item =
    .label = Eğik
bold-italic-style-item =
    .label = Kalın ve eğik
size-label =
    .value = Boyut:
    .accesskey = u
regular-size-item =
    .label = Normal
bigger-size-item =
    .label = Daha Büyük
smaller-size-item =
    .label = Daha Küçük
quoted-text-color =
    .label = Renk:
    .accesskey = n
search-handler-table =
    .placeholder = İçerik türlerini ve eylemleri filtrele
type-column-header = İçerik türü
action-column-header = Eylem
save-to-label =
    .label = Dosyaları kaydetme konumu
    .accesskey = k
choose-folder-label =
    .label =
        { PLATFORM() ->
            [macos] Seç…
           *[other] Gözat…
        }
    .accesskey =
        { PLATFORM() ->
            [macos] S
           *[other] G
        }
always-ask-label =
    .label = Dosyaların nereye kaydedileceğini her zaman sor
    .accesskey = s
display-tags-text = Etiketler iletilerinizi sınıflandırmak ve önemlerini belirlemek için kullanılabilir.
new-tag-button =
    .label = Yeni…
    .accesskey = Y
edit-tag-button =
    .label = Düzenle…
    .accesskey = D
delete-tag-button =
    .label = Sil
    .accesskey = S
auto-mark-as-read =
    .label = İletileri otomatik olarak okundu olarak işaretle
    .accesskey = o
mark-read-no-delay =
    .label = İletiye bakar bakmaz
    .accesskey = z
view-attachments-inline =
    .label = Ekleri satır içinde görüntüle
    .accesskey = E

## Note: This will concatenate to "After displaying for [___] seconds",
## using (mark-read-delay) and a number (seconds-label).

mark-read-delay =
    .label = Baktıktan
    .accesskey = k
seconds-label = saniye sonra

##

open-msg-label =
    .value = Yeni postayı:
open-msg-tab =
    .label = Yeni sekmede aç
    .accesskey = s
open-msg-window =
    .label = Yeni ileti penceresinde aç
    .accesskey = i
open-msg-ex-window =
    .label = Mevcut bir ileti penceresinde aç
    .accesskey = c
close-move-delete =
    .label = Taşınınca veya silinince ileti penceresini/sekmesini kapat
    .accesskey = k
display-name-label =
    .value = Görünen ad:
condensed-addresses-label =
    .label = Adres defterimdeki kişilerin sadece görünen adlarını göster
    .accesskey = d

## Compose Tab

forward-label =
    .value = İletileri
    .accesskey = İ
inline-label =
    .label = ileti içinde ilet
as-attachment-label =
    .label = ek olarak ilet
extension-label =
    .label = dosya adına uzantı ekle
    .accesskey = d

## Note: This will concatenate to "Auto Save every [___] minutes",
## using (auto-save-label) and a number (auto-save-end).

auto-save-label =
    .label = Her
    .accesskey = e
auto-save-end = dakikada bir otomatik kaydet

##

warn-on-send-accel-key =
    .label = İleti göndermek için klavye kısayolu kullanıldığında onay iste
    .accesskey = k
add-link-previews =
    .label = Adresleri yapıştırırken bağlantı ön izlemelerini ekle
    .accesskey = ö
spellcheck-label =
    .label = Göndermeden önce yazım denetimi yap
    .accesskey = a
spellcheck-inline-label =
    .label = Yazı yazarken anında yazım denetimini etkinleştir
    .accesskey = k
language-popup-label =
    .value = Dil:
    .accesskey = D
download-dictionaries-link = Daha fazla sözlük indir
font-label =
    .value = Yazı tipi:
    .accesskey = Y
font-size-label =
    .value = Boyut:
    .accesskey = B
default-colors-label =
    .label = Okuyucunun varsayılan renklerini kullan
    .accesskey = O
font-color-label =
    .value = Metin rengi:
    .accesskey = t
bg-color-label =
    .value = Arka plan rengi:
    .accesskey = n
restore-html-label =
    .label = Varsayılanları geri yükle
    .accesskey = V
default-format-label =
    .label = Varsayılan olarak gövde metni yerine paragraf biçimini kullan
    .accesskey = V
compose-send-format-title = Gönderme Biçimi
compose-send-automatic-option =
    .label = Otomatik
compose-send-automatic-description = İletide herhangi bir biçem kullanılmıyorsa düz metin gönder. Aksi halde düz metin yedeğiyle birlikte HTML gönder.
compose-send-both-option =
    .label = Hem HTML hem de düz metin
compose-send-both-description = Hangi sürümün gösterileceğini alıcının e-posta uygulaması belirleyecektir.
compose-send-html-option =
    .label = Yalnızca HTML
compose-send-html-description = Bazı alıcılar düz metin yedeği olmayan iletileri okuyamayabilir.
compose-send-plain-option =
    .label = Yalnızca düz metin
compose-send-plain-description = Bazı stiller düz metne dönüştürülecek ve bazı kompozisyon özellikleri devre dışı bırakılacaktır.
autocomplete-description = Adres girerken eşleşen kayıtları bulmak için buraya bak:
ab-label =
    .label = Yerel adres defterleri
    .accesskey = a
directories-label =
    .label = Dizin sunucusu:
    .accesskey = D
directories-none-label =
    .none = Hiçbiri
edit-directories-label =
    .label = Dizinleri düzenle…
    .accesskey = e
email-picker-label =
    .label = E-posta gönderdiğim adresleri otomatik olarak buraya ekle:
    .accesskey = t
default-directory-label =
    .value = Adres defteri penceresinin varsayılan açılış dizini:
    .accesskey = d
default-last-label =
    .none = Son kullanılan dizin
attachment-label =
    .label = Eklenmesi unutulan ekleri denetle
    .accesskey = d
attachment-options-label =
    .label = Anahtar kelimeler…
    .accesskey = A
enable-cloud-share =
    .label = Bundan büyük dosyaları paylaşmayı öner:
cloud-share-size =
    .value = MB
add-cloud-account =
    .label = Ekle…
    .accesskey = E
    .defaultlabel = Ekle…
remove-cloud-account =
    .label = Kaldır
    .accesskey = K
find-cloud-providers =
    .value = Daha fazla sağlayıcı bul…
cloud-account-description = Yeni Filelink depolama hizmeti ekle

## Privacy Tab

mail-content = E-posta İçeriği
remote-content-label =
    .label = İletilerde uzaktan çekilen içeriğe izin ver
    .accesskey = u
exceptions-button =
    .label = Ayrıcalıklar…
    .accesskey = A
remote-content-info =
    .value = Uzaktan içeriklerin gizlilik sorunları hakkında daha fazla bilgi alın
web-content = Web İçeriği
history-label =
    .label = Ziyaret ettiğim web sitelerini ve bağlantıları hatırla
    .accesskey = h
cookies-label =
    .label = Sitelerden çerez kabul et
    .accesskey = k
third-party-label =
    .value = Üçüncü taraf çerezlerini kabul et:
    .accesskey = c
third-party-always =
    .label = Her zaman
third-party-never =
    .label = Asla
third-party-visited =
    .label = Ziyaret edilenlerden
keep-label =
    .value = Tutma sınırı:
    .accesskey = T
keep-expire =
    .label = Süresi dolana dek
keep-close =
    .label = { -brand-short-name } kapatılana dek
keep-ask =
    .label = Her seferinde bana sor
cookies-button =
    .label = Çerezleri göster…
    .accesskey = z
do-not-track-label =
    .label = Web sitelerine izlenmek istemediğimi bildiren “Do Not Track” sinyalini gönder
    .accesskey = n
learn-button =
    .label = Daha fazla bilgi al
dnt-learn-more-button =
    .value = Daha fazla bilgi al
passwords-description = { -brand-short-name } bütün hesaplarınızın parolalarını hatırlayabilir.
passwords-button =
    .label = Kayıtlı parolalar…
    .accesskey = K
primary-password-description = Ana parola bütün parolalarınızı korur. Her oturumda ana parolayı bir kez yazmanız gerekir.
primary-password-label =
    .label = Ana parola kullan
    .accesskey = k
primary-password-button =
    .label = Ana parolayı değiştir…
    .accesskey = d
forms-primary-pw-fips-title = Şu anda FIPS kipindesiniz. FIPS için boş olmayan bir ana parola gereklidir.
forms-master-pw-fips-desc = Parola değiştirme başarısız
junk-description = Varsayılan gereksiz e-posta ayarlarınızı yapılandırın. Hesaba özel gereksiz e-posta ayarlarını hesap ayarlarından yapılandırılabilirsiniz.
junk-label =
    .label = İletileri gereksiz olarak işaretlediğimde:
    .accesskey = l
junk-move-label =
    .label = Hesaba ait "Gereksiz" dizinine taşı
    .accesskey = t
junk-delete-label =
    .label = İletileri sil
    .accesskey = s
junk-read-label =
    .label = Gereksiz iletileri okundu olarak işaretle
    .accesskey = G
junk-log-label =
    .label = Uyumlu gereksiz filtresi günlüğünü etkinleştir
    .accesskey = n
junk-log-button =
    .label = Günlüğü göster
    .accesskey = G
reset-junk-button =
    .label = Eğitim verilerini sıfırla
    .accesskey = r
phishing-description = { -brand-short-name } sizi aldatmaya yönelik sık kullanılan teknikleri arayarak şüpheli e-posta dolandırıcılarına karşı iletileri inceleyebilir.
phishing-label =
    .label = Okuduğum iletinin sahtekârlık girişimi olup olmadığını bana söyle
    .accesskey = O
antivirus-description = { -brand-short-name } antivirüs yazılımlarının gelen iletilerin depolanmadan önce virüslere karşı çözümlenmesini kolaylaştırabilir.
antivirus-label =
    .label = Antivirüs yazılımlarının gelen iletileri tek tek karantinaya almasına izin ver
    .accesskey = A
certificate-description = Bir sunucu kişisel sertifikamı istediğinde:
certificate-auto =
    .label = Birini otomatik olarak seç
    .accesskey = S
certificate-ask =
    .label = Her seferinde bana sor
    .accesskey = H
ocsp-label =
    .label = Sertifikaların geçerliliğini doğrulamak için OCSP yanıt sunucularını sorgula
    .accesskey = S
certificate-button =
    .label = Sertifikaları yönet…
    .accesskey = ö
security-devices-button =
    .label = Güvenlik aygıtları…
    .accesskey = G
email-e2ee-header = Uçtan Uca E-posta Şifreleme
account-settings = Hesap ayarları
email-e2ee-enable-info = Uçtan uca şifreleme için e-posta hesaplarını ve kimlikleri hesap ayarlarından ayarlayabilirsiniz.
email-e2ee-automatism = Otomatik Şifreleme Kullanımı
email-e2ee-automatism-pre =
    { -brand-short-name }, e-posta oluştururken şifrelemeyi otomatik olarak etkinleştirerek veya devre dışı bırakarak işinizi kolaylaştırabilir.
    Otomatik etkinleştirme/devre dışı bırakmanın çalışması için, yazıştığınız kişilerin geçerli ve kabul edilmiş anahtar veya sertifikalarının bulunması gerekir.
email-e2ee-auto-on =
    .label = Mümkün olduğunda şifrelemeyi otomatik olarak etkinleştir
email-e2ee-auto-off =
    .label = Alıcılar değiştiğinde ve şifreleme artık mümkün olmadığında şifrelemeyi otomatik olarak devre dışı bırak
email-e2ee-auto-off-notify =
    .label = Şifreleme otomatik olarak devre dışı bırakıldığında bildirim göster
email-e2ee-automatism-post =
    Otomatik kararlar, bir ileti oluşturulurken şifrelemenin manuel olarak etkinleştirilmesi veya devre dışı bırakılmasıyla geçersiz kılınabilir.
    Not: Şifreli bir iletiye yanıt verilirken şifreleme her zaman otomatik olarak etkinleştirilir.

## Chat Tab

startup-label =
    .value = { -brand-short-name } açıldığında:
    .accesskey = a
offline-label =
    .label = Sohbet hesaplarımı çevrimdışı tut
auto-connect-label =
    .label = Sohbet hesaplarıma otomatik olarak bağlan

## Note: idle-label is displayed first, then there's a field where the user
## can enter a number, and itemTime is displayed at the end of the line.
## The translations of the idle-label and idle-time-label parts don't have
## to mean the exact same thing as in English; please try instead to
## translate the whole sentence.

idle-label =
    .label = Kişi listemdekiler
    .accesskey = K
idle-time-label = dakika hareketsizlikten sonra uzakta olduğumu bilsin

##

away-message-label =
    .label = ve durumumu şu durum iletisiyle Uzakta olarak ayarla:
    .accesskey = U
send-typing-label =
    .label = Yazışmalarda yazma bildirimleri gönder
    .accesskey = Y
notification-label = Bana gönderilen iletiler ulaştığında:
show-notification-label =
    .label = Bildirim göster:
    .accesskey = B
notification-all =
    .label = gönderenin adı ve ileti ön izlemesiyle
notification-name =
    .label = yalnızca gönderenin adıyla
notification-empty =
    .label = hiçbir bilgi olmadan
notification-type-label =
    .label =
        { PLATFORM() ->
            [macos] Hareketli dock simgesi
           *[other] Görev çubuğu öğesini yakıp söndür
        }
    .accesskey =
        { PLATFORM() ->
            [macos] H
           *[other] G
        }
chat-play-sound-label =
    .label = Ses çal
    .accesskey = S
chat-play-button =
    .label = Çal
    .accesskey = a
chat-system-sound-label =
    .label = Yeni posta için varsayılan sistem sesi
    .accesskey = Y
chat-custom-sound-label =
    .label = Aşağıdaki ses dosyasını kullan
    .accesskey = d
chat-browse-sound-button =
    .label = Gözat…
    .accesskey = G
theme-label =
    .value = Tema:
    .accesskey = T
style-mail =
    .label = { -brand-short-name }
style-bubbles =
    .label = Balonlar
style-dark =
    .label = Koyu
style-paper =
    .label = Kâğıt Sayfaları
style-simple =
    .label = Basit
preview-label = Ön izleme:
no-preview-label = Ön izleme yok
no-preview-description = Bu tema geçersiz veya şu anda kullanılamıyor (devre dışı bırakılmış eklenti, güvenli mod…).
chat-variant-label =
    .value = Varyant:
    .accesskey = V
# This is used to determine the width of the search field in about:preferences,
# in order to make the entire placeholder string visible
#
# Please keep the placeholder string short to avoid truncation.
#
# Notice: The value of the `.style` attribute is a CSS string, and the `width`
# is the name of the CSS property. It is intended only to adjust the element's width.
# Do not translate.
search-preferences-input2 =
    .style = width: 15.4em
    .placeholder = Ayarlarda ara

## Settings UI Search Results

search-results-header = Arama Sonuçları
# `<span data-l10n-name="query"></span>` will be replaced by the search term.
search-results-empty-message2 =
    { PLATFORM() ->
        [windows] Kusura bakmayın, seçeneklerde “<span data-l10n-name="query"></span>” ile ilgili bir sonuç bulamadık.
       *[other] Kusura bakmayın, ayarlarda “<span data-l10n-name="query"></span>” ile ilgili bir sonuç bulamadık.
    }
search-results-help-link = Yardım mı gerekiyor? <a data-l10n-name="url">{ -brand-short-name } Destek</a>’i ziyaret edin.

## Sync Tab

sync-signedout-caption = Web’inizi yanınızda taşıyın
sync-signedout-description = Hesaplarınızı, adres defterlerinizi, takvimlerinizi, eklentilerinizi ve ayarlarınızı tüm cihazlarınız arasında senkronize edin.
# Note: "Sync" represents the Firefox Sync product so it shouldn't be translated.
sync-signedout-account-signin-btn = Eşitlemek için giriş yap…
sync-pane-header = Eşitle
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-pane-email-not-verified = “{ $userEmail }” doğrulanmamış.
# Variables:
# $userEmail (String) - The email logged into Sync.
sync-signedin-login-failure = Yeniden “{ $userEmail }” hesabınıza bağlanmak için lütfen giriş yapın
sync-pane-resend-verification = Doğrulamayı yeniden gönder
sync-pane-sign-in = Giriş yap
sync-pane-remove-account = Hesabı kaldır
sync-pane-edit-photo =
    .title = Profil resmini değiştir
sync-pane-manage-account = Hesabı yönet
sync-pane-sign-out = Çıkış yap…
sync-pane-device-name-title = Cihaz adı
sync-pane-change-device-name = Cihaz adını değiştir
sync-pane-cancel = Vazgeç
sync-pane-save = Kaydet
sync-pane-show-synced-header-on = Eşitleme AÇIK
sync-pane-show-synced-header-off = Eşitleme KAPALI
sync-pane-sync-now = Şimdi eşitle
sync-panel-sync-now-syncing = Eşitleniyor…
show-synced-list-heading = Şu anda aşağıdaki öğeleri eşitliyorsunuz:
show-synced-learn-more = Daha fazla bilgi al…
show-synced-item-account = E-posta hesapları
show-synced-item-address = Adres defterleri
show-synced-item-calendar = Takvimler
show-synced-item-identity = Kimlikler
show-synced-item-passwords = Parolalar
show-synced-change = Değiştir…
synced-acount-item-server-config = Sunucu yapılandırması
synced-acount-item-filters = Süzgeçler
synced-acount-item-keys = OpenPGP - S/MIME
sync-disconnected-text = E-postalarınızı, adres defterlerinizi, takvimlerinizi ve kimliklerinizi tüm cihazlarınız arasında senkronize edin.
sync-disconnected-turn-on-sync = Eşitlemeyi aç…
