# RafSkoru kapalı beta yol haritası

Tarih: 2026-11-14 · Karar dayanağı: `docs/decisions/ADR-009-etiket-okuma-hatti.md`

Süreler tahmindir (tek kişi + Claude oturumu varsayımı). Her faz, çalışma sırasına uyar:
araştır → planla → insan onayı → küçük değişiklik → doğrula → raporla.

## Hedef

Raf önünde barkod okutan kullanıcı hiçbir zaman boş ekranla kalmaz: ürün ya kayıtlıdır ya da
kullanıcı etiket fotoğrafı çekerek etiketli bir değerlendirme alır. Beta bir ürün listesiyle
sınırlanmaz. Fiyat beta kapsamında değildir (ADR-008; konu ertelendi).

## Başlangıç durumu (2026-11-14 ölçümü)

| Gösterge | Değer |
|---|---|
| OFF-TR katalog ürünü | 11.293 |
| Tam verili (`complete`) | 1.824 |
| İçindekiler metni olmayan | 8.498 |
| Görsel adresi olan | 0 |
| Doğrulanmış RafSkoru kaydı | 0 (depo henüz yok) |
| Raf başı isabet oranı | ölçülmedi |
| OFF'ta etiket fotoğrafı olup metni olmayan ürün | ölçülmedi |

## Faz 0 — Karar ve ölçüm

| İş | Durum |
|---|---|
| ADR-009 yazıldı | tamam (commit bekliyor) |
| `feat/ui-clarity` kalite kapıları | yeşil: backend check, smoke (52 `_OK`), kodlama denetimi, mobil tsc, ifade denetimi, risk senaryoları 31/31 |
| `feat/ui-clarity` → `main` birleştirme | proje sahibi onayı bekliyor |
| OFF'ta etiket fotoğrafı sayımı | dış çağrı onayı bekliyor |
| Raf başı isabet ölçümü | proje sahibinin barkod listesi bekleniyor (aşağıya bakın) |
| Etiket okuma denemesi (≤ 1 ABD doları) | API anahtarı ve paket onayı bekliyor |

### Raf başı isabet ölçümü nasıl yapılır

1. Bir markette, seçmeden, farklı reyonlardan yaklaşık 100 paketli gıda ürününün barkod
   numarasını topla (herhangi bir barkod okuyucu uygulamasıyla; satır başına bir numara).
2. Listeyi metin olarak Claude oturumuna ver.
3. Oturum listeyi yerel katalogla karşılaştırır ve şu oranları raporlar: tam verili,
   kısmi verili, adı var ama içindekiler yok, hiç kayıtlı değil.
4. Kayıtlı olmayanların canlı OFF'ta olup olmadığına bakmak dış çağrıdır; ayrıca onay ister.

## Faz 1 — Etiket okuma hattı (yaklaşık 1 hafta)

- Doğrulanmış ürün deposu ve katalogla barkod bazında, alan kökenini koruyan birleştirme.
- Kuyruk (durum takibi) ve onay ekranı; intake yönetici paneli genişletilir.
- Çıkarım ve doğrulama adımları; okunamayan alanın `unknown` kalması için kabul testleri.
- İçe aktarıcıda görsel adresinin dökümdeki `images` alanından üretilmesi.
- Sözleşme değişiklikleri mobil ve backend'de aynı değişiklikte; sözleşme incelemesi şart.

### Faz 1 durumu (2026-11-19)

| İş | Durum |
|---|---|
| 1.1 Doğrulanmış etiket kayıt deposu | tamam |
| 1.2 Sözleşmeye `rafskoru_verified` / `label_unverified` | tamam |
| 1.3a Onaylı kayıttan ürün verisi + OFF ile birleştirme | tamam |
| 1.3c Besin tablosundan Nutri-Score + ürün türü | tamam |
| 1.3b Barkod sorgusuna bağlama (+ alerjen incelemesi, yumurta düzeltmesi) | tamam |
| 1.3d Arama, kategori, sepet ve alternatiflerin onaylı kayıtları kullanması | tamam |
| 1.4a Okuma ajanı, karşılaştırma, içe aktarma + 2 ürünlük pilot | tamam |
| 1.4b Alkollü içeceklerin puan kapsamı dışında tutulması (ADR-009 §11) | tamam |
| 1.4c OFF etiket fotoğraflarının toplu okunması (yaklaşık 950 ürün) | ilk parti tamam: 49 üründen 42'si okundu (okunmayan 7: 5 su, 2 hijyen ürünü); depoda pilot dâhil 43 aday onay bekliyor; kalan parti sırada |
| 1.5a–d Onay ekranı: uçlar, yönetici sayfasında "Etiket onayı" sekmesi, karşılaştırma düzeltmesi, gönüllü aracının onaylı kayda bakması | tamam |
| 1.5 ek: içindekiler metinleri farklıysa alerjen kontrolünün ikisine bakması (ADR-009 §12) | tamam |
| 1.5e OFF'ta olmayan onaylı ürünlerin aramada çıkması (sözleşme değişikliği; mobil+backend) | bekliyor (plan + onay) |
| 1.6 Görsel adresi düzeltmesi | bekliyor |

### Unutulmaması gerekenler

- **Elma suyu pilot kaydı barkod bekliyor.** İki okuması yerelde
  (`apps/backend/data/label-store/pilot/elma-suyu-okuma-*.json`); barkod gelince
  `npm run label:import` ile alınacak. Fotoğraflarda barkod rakamları görünmüyor.
- **Onaylı etiketteki alerjen ve eser ifadeleri henüz uyarıya dönüşmüyor.** Örn. elma suyundaki
  "eser miktarda süt içerebilir". Alerjen kapısına dokunduğu için ayrı inceleme ve onay ister.
- **Okuma kullanımı (2026-11-18 ölçümü):** gerçek `label-reader` ajanıyla okuma başına yaklaşık
  18,6 bin token, yaklaşık 22 saniye (3 fotoğraflı ürün). Toplu okuma günlük partilerle yapılacak.

- **OFF'ta hiç olmayan onaylı ürünler aramada çıkmıyor.** Arama ve kategori listeleri
  yalnız OFF kataloğundaki ürünleri tarıyor; OFF'ta olmayan bir ürün onaylansa bile yalnız
  barkod okutulunca bulunuyor. Onay ekranı (1.5) işinde, onaylı kayıtların listeye katalog
  dışı ürün olarak eklenmesi ele alınacak. (Proje sahibi isteği, 2026-11-15.)
- **Gönüllü aracı onaylı kayıtları henüz bilmiyor.** Barkodun hangi fotoğraflarının eksik
  olduğunu yalnız OFF verisine göre söylüyor; onaylanmış bir ürün için yeniden fotoğraf
  isteyebilir. 1.5 ile birlikte ele alınacak.

## Faz 2 — Veri doldurma (Faz 1 ile kısmen paralel, yaklaşık 1 hafta)

- OFF'taki etiket fotoğrafları masaüstü oturumunda toplu okunur (API ücreti yok).
- Proje sahibinin ve varsa gönüllülerin fotoğrafları aynı kuyruğa girer.
- Onay kuyruğu eritilir; onaylanan kayıtlarda alerjen değerlendirmesi açılır.

## Faz 3 — Beta sertleştirme (yaklaşık 1 hafta)

- Katkı ekranı fotoğrafları kuyruğa gönderir; "tanındı ama eksik" durumunda yalnız eksik
  parça istenir.
- Tarama ekranına elle barkod girişi.
- Canlı OFF yolundaki eski alerjen bandının profil süzgecine bağlanması (ADR-004 son madde);
  korumalı bölge, ayrı onay.
- Arama, ürün sonucu ve sepetteki skorların tutarlılığı.
- Tasarım geçişi: ana ekran, ürün sonucu, "kayıtlı değil / eksik" akışı
  (`docs/design/prototip-v3.html` referans). Fiyat arayüzü betada gizlenir.
- Profilde eksik dört zorunlu alerjen (ADR-009 açık karar 1).
- Bilgilendirme/rıza metinleri (`legal-privacy-reviewer` incelemesi).

## Faz 4 — Kapalı beta

- Backend küçük bir sanal sunucuya kurulur; `rafskoru.com.tr` alt alan adı DNS ile bağlanır.
- 20–50 kişi, Android kurulum dosyası (`test/android-pilot-preview` dalındaki derleme akışı).
- Ölçütler: barkod isabet oranı, fotoğrafla tamamlanan ürün oranı, onay kuyruğu bekleme
  süresi, geri bildirim türleri, ürün başına okuma maliyeti.

## Bütçe (tahmin, Android)

| Kalem | Tutar |
|---|---|
| Alan adı | 0 (mevcut, 10 Haziran 2027'ye kadar) |
| Sunucu | ayda yaklaşık 5–8 ABD doları, beta başlayınca |
| Raf başı etiket okuma (API) | sert sınır: toplam 50 ABD doları |
| Toplu ön doldurma | 0 (masaüstü oturumu, abonelik) |
| Google Play hesabı | 25 ABD doları, bir kerelik, isteğe bağlı |

Okuma maliyeti varsayımı: orta seviye model, raf başında ürün başına yaklaşık 4 sent. Bu
rakam deneme yapılmadan doğrulanmış sayılmaz.
