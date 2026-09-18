# Araştırma: OFF'ta bulunmayan ürünler için içerik çözümleme (Aşama 6) — 2026-09-18

Karar: `docs/decisions/ADR-005-local-product-content-resolution.md`. Kanıt:
`docs/research/evidence/off-content-resolution-2026-09-18.live.json`. Fiyat kaynakları bu belgede yer almaz.

Bütçe: 5/12 web araması, birincil kaynak okuma 4 belge + 9 canlı OFF isteği (≤15). Aynı kaynak iki kez okunmadı.

## 1. Mimari karşılaştırması (uygulanabilir üç seçenek)

| Ölçüt | A. Hibrit: kaynak adayı + ambalaj kanıtı + insan incelemesi (**seçildi**) | B. Cihaz içi OCR (ML Kit / Apple Vision) | C. Sunucu OCR (Google Cloud Vision) |
|---|---|---|---|
| Erişim hakkı | OFF ODbL/DbCL okuma, atıf zorunlu; kullanıcı fotoğrafı kullanıcının kendi çekimi | Modül lisansı README'de belirtilmemiş (rn-mlkit-ocr); ML Kit koşulları developers.google.com'dan doğrulanamadı (egress engelli) | Google Cloud ToS; ücretli hesap + API anahtarı |
| Türkiye kapsamı | OFF TR: denenen 7 GTIN'in 6'sı var; alerjen etiketi 2'sinde boş | Latin alfabesi modeli; Türkçe için birincil doğrulama alınamadı | Türkçe destekli (genel bilgi; sayfa okunmadı) |
| Maliyet | 0 | 0 (uygulama boyutu artar) | 1.000 birim/ay ücretsiz, 1.001–5 M: 1,50 $/1.000, üstü 0,60 $/1.000 (cloud.google.com/vision/pricing) |
| Expo uyumu | Mevcut bağımlılıklarla çalışır | Native modül + config plugin, **Expo Go'da çalışmaz**, prebuild gerekir | Yalnız HTTP; fakat fotoğraf yükleme gerekir |
| Kişisel veri riski | Düşük: fotoğraf ve kayıt cihazda; profil gönderilmez | Düşük (cihazda) | **Yüksek**: ambalaj fotoğrafı üçüncü tarafa gider; KVKK değerlendirmesi gerekir |
| Yanlış eşleşme riski | Düşük: yalnız aynı GTIN birleşir; barkodsuz yalnız aday | OCR metni aday kalır; kimlik yine GTIN'e bağlı | Aynı |
| Çevrimdışı | İnceleme ve kayıt çevrimdışı çalışır | Evet | Hayır |
| Ölçeklenebilirlik | İnsan incelemesi darboğaz (kasıtlı; `rafskoru_verified` hattı ayrı görev) | İyi | İyi, maliyet lineer |
| Durma koşulu | Yok | **Yeni native bağımlılık** | **Ücretli API + anahtar + fotoğraf yükleme** |

Kaynak olarak ayrıca değerlendirilenler (mimari değil):
- **GS1 Verified by GS1 / GS1 TR ürün doğrulama**: GTIN → marka/ad/GPC/miktar/görsel kimlik doğrulaması;
  içindekiler/alerjen yok; API erişimi üye/kamu koşullu (arama özeti). gs1.org egress'te engelli,
  gs1tr.org 503, urunkimlikkarti.gs1tr.org yalnız başlık döndü → **birincil kaynakla doğrulanamadı**.
- **Üretici resmî kataloğu**: tek arama; sonuçlar OFF ürün sayfaları, üçüncü taraf toplayıcı (icerir.com) ve
  toptan perakendeci sayfası. Kullanım hakkı açık resmî ürün sayfası **bulunamadı** → adapter yazılmadı.
- **OFF v2 arama** (`brands_tags` + `countries_tags`): belgelenmiş salt okunur uç nokta; ilk istek 503, tek
  yeniden denemede 200 (13 Torku/TR kaydı). Barkodsuz aday listesi için kullanılabilir; gürültü gerçek
  (adı boş kayıt, "torku"/"Torku", "120gr").

## 2. Birincil kaynaklar

Okunanlar: (1) `world.openfoodfacts.org/terms-of-use` — ODbL/DbCL, fotoğraflar CC BY-SA, "Contributors agree
not to add on Open Food Facts information, data and photos from other websites", katkıcı fotoğrafı kendi çekimi
olmalı; (2) `world.openfoodfacts.org/data` — atıf metni, share-alike, "1 API call = 1 real scan", scraping
engellenir, toplu ihtiyaç için dump; (3) `rn-mlkit-ocr` README (raw.githubusercontent) — cihaz içi, Latin
script, Expo Go'da çalışmaz, plugin + prebuild, iOS 15.5+/Android 23+; (4) `cloud.google.com/vision/pricing`.
Canlı: OFF v2 product ×7, v2 search ×2 (özel User-Agent, ≥1,2 s aralık, 15/dk sınırının altında).

Erişilemeyenler (bypass denenmedi): openfoodfacts.github.io ve developers.google.com (egress engeli),
wiki.openfoodfacts.org (Anubis bot koruması), gs1.org, tobb.org.tr, mevzuat.gov.tr (egress), gs1tr.org (503),
npmjs.com (403), developer.apple.com (gövde boş). Arama sonuçlarındaki blog/pazarlama sayfaları karar
girdisi yapılmadı.

## 3. Gerçek GTIN denemesi (OFF API v2, 2026-09-18)

| GTIN | Kaynak/neden | Sonuç | Kimlik (OFF) | Alan | Alerjen / iz etiketi | İnsan müdahalesi |
|---|---|---|---|---|---|---|
| 8690504121336 | OFF TR sayfası | 200, bulundu | Ülker Çokokrem 400 G, TR | 8/10 (NOVA, iz yok) | milk, nuts, soybeans / — | NOVA için yok; iz beyanı ambalajdan |
| 8680181051347 | OFF TR sayfası | 200 | Nefis Ayran, Torku, 2 l | 9/10 (iz yok) | milk / — | iz beyanı ambalajdan |
| 8690504034506 | OFF TR sayfası | 200 | Albeni, Ülker, 40 g (TR+RU) | 10/10 | gluten, milk, nuts, soybeans / gluten, nuts | yok |
| 8690120070056 | OFF TR sayfası | 200 | Torku Banada 400 g (TR+FR, lang fr) | 9/10 (iz yok) | gluten / — | dil/etiket kontrolü |
| 8683347030866 | Open Prices ∩ OFF | 200 | Glutensiz Karabuğday Patlağı, wefood, 100 g | 8/10 | **boş / boş → unknown** | ambalaj + inceleme gerekli |
| 8682815041403 | Open Prices, OFF 404 | **404** ("different product type") | — | 0 | — | tam paket çekimi + inceleme |
| 8691381000486 | negatif kontrol | 200 | Beypazarı Doğal Maden Suyu 200 ml (yalnız OFF yanıtından) | 8/10 | boş / boş | kimlik varsayılmadı |

Metrikler: doğru GTIN eşleşmesi 6/6 (yanıt `code` = sorgu); geri kazanılan alan 0–10; kaynak kanıtı her
satırda uç nokta + JSON; çatışmalı alan 0 (tek kaynak; çatışma yalnız ambalaj kanıtı eklenince oluşur,
senaryo 6); insan müdahalesi gereken 4/7. **"Glutensiz" adı gluten durumunu değiştirmez** (ad çıkarımı yok).

## 4. Uygulanan dikey dilim / yapılmayanlar

Tamamlandı: sözleşmeler, üç sağlayıcı + `not_implemented` üretici kaydı, birleştirme motoru, on durum,
`package-review` ekranı ve üç bileşen, `package-capture` → inceleme geçişi, `ProductDataStateCard`'a
"Taslağı alan alan incele", 15 saf senaryo, wording guard genişletmesi.
Yapılmadı (durma koşulu / kapsam): OCR entegrasyonu (bağımlılık onayı), üretici/GS1 adapter'ı (hak
belirsiz), kalıcı fotoğraf saklama, gönderim kanalı ve `rafskoru_verified` hattı, cihaz/emülatör görsel testi
("görsel olarak doğrulandı" iddiası yoktur), ürün sonuç ekranında OFF verisiyle inceleme ekranının aynı anda
birleştirilmesi (inceleme ekranı cihaz kaynaklarını çözer; OFF adayı ürün sonuç ekranından gelir).
