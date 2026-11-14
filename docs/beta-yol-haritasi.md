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
