# Yerel ürün kurtarma + ürün sonuç arayüzü — tasarım kararları

Dal: `feat/local-product-recovery-ux` · Taban: `9e62ad3` · Bayrak: `EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY=1`
(kapalıyken ürün sonuç ekranı eski davranışını aynen korur). Fiyat modülü, fiyat ağırlıkları ve fiyat araştırma dosyalarına dokunulmadı.

Denetimler (birer tur): `product-data-contract-reviewer` (fallback hizalama, ham `allergens` kaynağı), `allergen-safety-reviewer` (F1 düzeltildi, F2 açık karar), `release-gatekeeper` (aşağıda).

## Uzatma noktaları (doğrulandı)
- Backend `ProductFacts` kanonik kaynaktır; mobil yalnız `priceResolution.result.productFacts`'ı projekte eder (`src/localProduct/productDataState.ts`). İkinci OFF/skor hattı yok.
- Sözleşme tipleri `src/contracts/generated.ts`'ten alınır (`AllergenDeclaration`, `deriveAllergenState`, `PackagingPhotoKind`, `ProductFactField`, `UsabilityCapabilities`); kopyalanmadı. `price/types.ts` (korumalı bölge) değişmedi; backend'in geriye uyumlu `completeness`/`capabilities` alanları `ProductFactsWire` ile yalnız okunur.
- Kamera: mevcut `expo-camera` (`CameraView`, `takePictureAsync`, barkod tarama). Yeni native paket yok; lockfile değişmedi.
- Risk motoru (`riskEngine.ts`), `CRITICAL_ALLERGEN_CODES`, skor formülleri ve alternatif filtresi değişmedi.

## Üç veri durumu (ürün sonuç ekranı, barkod aramasında)
| Durum | Koşul (backend alanı) | Ekran |
|---|---|---|
| Kullanılabilir | `dataSource='off'` ve `completeness='complete'` (yoksa `isComplete=true`) | ✔ "Ürün kaydı kullanılabilir" + mevcut alanlar |
| Kısmi | `dataSource='off'`, `completeness='partial'` (yoksa `isComplete=false` ama en az bir yetenek) | ◐ "Ürün kaydı kısmi" + Mevcut/Eksik listesi + "Eksik alanları paketten ekle" |
| Bulunamadı | kayıt yok, `completeness='insufficient'` veya `dataSource='beta_inference'` | ✕ "Ürün verisi bulunamadı" + "Paket bilgisini ekle", ad arama, fotoğraf |

Kısmi kayıt artık risk motoruna girer (bayrak açıkken): kayıt atılmaz, eksik alanlar motorun kendi
`MISSING_*` / `PROFILE_ALLERGEN_INFO_MISSING` uyarılarıyla görünür kalır. Motora verilen alerjen listesi
yalnız okunabilir (yapılandırılmış OFF) beyandan gelir; beyan yoksa boş liste verilir ve motor "alerjen
bilgisi eksik" uyarısını üretir (ham `allergens` dizisi ikinci bir gerçek kaynağı değildir).
`completeness` alanı olmayan eski yanıtta mobil, backend `selectUsableProductFacts` ile aynı kuralı
uygular (yalnız `isComplete`); backend'in attığı kayıt mobilde görünmez (`product-data-contract-reviewer`).
Bayrak açıkken barkod aramasının **tek** risk yolu `evaluateRecoveryRisk`'tir: OFF dışı, `beta_inference`
veya kayıt yoksa eski ham `productFacts`/`isComplete` yoluna düşülmez, fail-closed "Gıda analizi
yapılamadı" döner (`allergen-safety-reviewer` F1 düzeltmesi; senaryo 7). Kapalı bayrakta mevcut
`isComplete` kapısı aynen çalışır. `beta_inference` bayrak açıkken ürün verisi olarak gösterilmez ve
güvenlik kararına girmez (D3); skor panelleri backend'den geldiği gibi kalır.

## Alerjen kapısı skordan önce
Kritik profil uyarısı kartı (mevcut) ve yeni durum kartındaki "Alerjen beyanı" bloğu RAF skoru kartının
üstündedir. Blok yalnız `allergenInfo.source='off_structured'` ise `readable` sayar; metinler:
"Beyana göre içerir", "İçerebilir (eser / çapraz bulaşma beyanı)", "listelenmemiş — garanti değildir",
"Alerjen verisi yok / doğrulanmamış". Dört durum birleştirilmez; olumlu iddia üretilmez.

Bilinen boşluk (F2, insan kararı): `ProductRiskInput`'ta iz alanı yoktur; motor "içerebilir" etiketinden
profil uyarısı üretmez ve `riskEngine.ts` bu görevde değiştirilemez. Ekran projeksiyonu
(`findProfileDeclarationMatches`, OFF etiketi → profil anahtarı tablosu allergen-safety skill'inden) profil
ile iz eşleşmesini kartta görünür yazar: "Profilinizdeki … için 'içerebilir' beyanı var … etiketi kontrol
edin". Motor düzeyinde ayrı `*_TRACE_MATCH` kodu eklenmesi ADR + `allergen-safety-reviewer` + insan onayı ister.

## "Paket bilgisini ekle" akışı (`app/package-capture.tsx`)
Adımlar ve gerekçe metinleri `PACKAGE_CAPTURE_STEPS`'te: ön yüz → barkod (zorunlu, kamera taramasıyla
otomatik) → içindekiler → alerjen beyanı/"içerebilir" → besin tablosu → net miktar. Her adımda "neden" ve
"atlarsan" metni; "Tekrar çek" fotoğrafı siler; "Bu adımı atla" adımı `skippedSteps`'e yazar.
Kamera izni yoksa "fotoğrafsız devam" ile elle metin girişi mümkündür.

OCR sınırı: entegrasyon yok, sahte OCR üretilmez. "Metni doğrula" ekranı `OcrCandidate` alanlarını elle
yazdırır (`entryMethod='manual'`, `source='user_ocr'`, `verified=false`). Yalnız `__DEV__` +
`EXPO_PUBLIC_LOCAL_PRODUCT_FIXTURE=1` iken fixture metni ön dolar ve her yerde "GELİŞTİRME FIXTURE —
gerçek veri değil" etiketiyle görünür; özet ve taslakta da etiket korunur.

Katkı taslağı (`createContributionDraft`): `status='candidate'`, `gtin`, `observedAt` (ilk fotoğraf),
`packagingVersion`, `photos` (yalnız yerel URI), `skippedSteps`, `candidates`, `missingFields`,
`allergenDeclaration` (`unreadable` metin varsa / `absent` yoksa) ve `allergenState='unknown_or_unverified'`
— kullanıcı kaynaklı beyan sözleşme gereği hiçbir zaman `readable` olamaz. `submission.boundary=
'no_upload_in_this_build'`, `nextTask='human_verification'`. Taslak yalnız cihazda AsyncStorage'da
(`contributionDraftStorage.ts`); profil, konum veya kimlik içermez. Ürün sonuç ekranı odağa gelince
barkoda ait taslağı "aday, doğrulanmadı; skorlara girmez" notuyla gösterir.

## Görsel ve erişilebilirlik kararları
- Renk tek anlam taşımaz: her durum ikon (✔ ◐ ✕) + başlık; alerjen bloğu ikon (! ~ – ?) + metin.
- Dokunma alanları ≥48 pt; tüm butonlar `accessibilityRole="button"`, `accessibilityLabel`, gerekli yerde
  `accessibilityHint`/`accessibilityState`; barkod okuma sonucu `accessibilityLiveRegion`.
- Dinamik yazı: RN varsayılan `allowFontScaling` korunur; satır yükseklikleri ölçekle büyür.
- Teknik terim yerine Türkçe alan etiketleri (`PRODUCT_FIELD_LABELS`); "Mevcut / Eksik" iki satır.
- Fiyat paneli, RAF skoru ve diğer paneller yerinde; yeni kart yalnız üst bölüme eklendi.

## Senaryolar (`src/localProduct/runLocalProductScenarios.ts`, 9/9)
1. Tam OFF ürünü → usable, üç yetenek, `PROFILE_MILK_ALLERGEN_MATCH`.
2. Görsel/Nutri-Score eksik, alerjen kullanılabilir → partial, kayıt düşmez, süt uyarısı üretilir, fıstık `not_listed_in_available_data`.
3. Yalnız "içerebilir" → `trace_may_contain`, "içerir" dili yok, motor "eksik alerjen bilgisi" uyarısını korur.
4. OFF'ta olmayan / `beta_inference` → not_found, risk girdisi yok.
4b. Eski yanıt (`completeness` yok, `isComplete=false`) → backend ile aynı: not_found; `allergenInfo` yokken ham `allergens` motora geçmez, eksik alerjen uyarısı üretilir.
5. Katkı taslağı, alerjen alanı okunamıyor → `unknown_or_unverified`; elle yazılsa da doğrulanmamış; gönderim kapalı.
6. Adım metinleri + olumlu iddia taraması.
7. Bayrak açık, OFF dışı ama `isComplete=true` kayıt → eski yola düşmez; fail-closed "değerlendirilemedi", boş liste yok.
8. Declared+trace karışık, profil yalnız iz listesinde → motor sessiz (belgelenmiş boşluk), ekran projeksiyonu uyarır.

Çalıştırma (yeni bağımlılık yok):
```
cd apps/mobile
npx tsc src/localProduct/runLocalProductScenarios.ts --outDir /tmp/rafskoru-local-product --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --strict
node /tmp/rafskoru-local-product/localProduct/runLocalProductScenarios.js
```

## Doğrulama kapıları (`release-gatekeeper`, 2026-09-18)
| Kapı | Sonuç |
|---|---|
| `npx tsc --noEmit` (mobil) | PASS |
| `npm run smoke:beta-wording` | PASS (yeni dilim metinleri guard'a eklendi) |
| Risk senaryoları | PASS 28/28 |
| Yerel ürün senaryoları | PASS 9/9 |
| package.json / lockfile / backend / riskEngine.ts / price/types.ts | değişmedi |
| BOM/CRLF, gizli anahtar, olumlu iddia taraması | PASS |
| Backend `npm run check` / `smoke` | uygulanamadı: backend dokunulmadı, bağımlılık kurulu değil |

## Ekran görüntüleri
Alınamadı: bu ortamda Android/iOS emülatörü yok ve `expo start --web` için gereken `react-dom` /
`react-native-web` paketleri lockfile'da yok (kurulum lockfile değişikliği gerektirir; yapılmadı).
Kullanıcı testi için: `EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY=1 npx expo start` ile cihazda barkod okutun;
OFF'ta olmayan bir barkodda ✕ kartı ve "Paket bilgisini ekle" görünür.

## Açık bırakılanlar (sonraki görevler)
- İz ("içerebilir") beyanı için motor düzeyinde profil uyarısı (F2): ADR + insan onayı; bugün yalnız ekran projeksiyonu.
- Ad/fotoğraf aramasındaki yerel `productService` mock/fallback yolu bu dilimin dışında; bayrak yalnız barkod aramasını kapsar.
- Gönderim kanalı ve insan doğrulama ekranı (`VerificationRecord`, `FieldCheck`); bu sürümde yok.
- Fotoğraf içerik hash'i (`PackagingPhotoRef.contentHash`) — dosya sistemi paketi gerektirir; taslak yerel URI tutar.
- OCR entegrasyonu (varsa cihaz içi) — aday üretimi, yine `verified=false`.
- Ürün sonuç ekranının parçalanması (2.2k satır) ayrı görev.
