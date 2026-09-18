# Yerel ürün kurtarma + ürün sonuç arayüzü — tasarım kararları

Dal: `feat/local-product-recovery-ux` · Taban: `9e62ad3` · Bayrak: `EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY=1`
(kapalıyken ürün sonuç ekranı eski davranışını aynen korur). Fiyat modülü, fiyat ağırlıkları ve fiyat araştırma dosyalarına dokunulmadı.

Denetimler (birer tur): `product-data-contract-reviewer` (fallback hizalama, ham `allergens` kaynağı), `allergen-safety-reviewer` (F1 ve F2 düzeltildi — bkz. ADR-004), `release-gatekeeper` (aşağıda).

## Revizyon 2026-09-18 (ikinci tur) — proje sahibi kararları
1. **F2 kapatıldı** (`docs/decisions/ADR-004-trace-allergen-profile-matching.md`): risk motoru artık
   `trace_may_contain` ("içerebilir") için de `PROFILE_*_TRACE_MATCH` kodu üretir, kritik uyarı alanında
   görünür. Alternatif aday filtresi için açık madde kaldı (aşağıda).
2. Bu PR'da dış gönderim kanalı **açılmadı**; taslak cihazda `candidate` kalır (değişmedi). İnsan
   doğrulama ekranı (fotoğraf + aday alan yan yana, alan başına doğrula/düzelt/okunamıyor,
   `VerificationRecord`, henüz `rafskoru_verified` değil) ayrı, sonraki bir PR'dır.
3. Ad/fotoğraf araması: **doğrulandı, kod değişmedi.** `product-result.tsx`'in gerçek kullandığı
   `getFallbackProductSummary` (`src/services/productService.ts`) barkod dışı aramada sahte ürün/skor
   üretmez; `analysisStatus:'not_found'` + "Ürün bilgileri doğrulanıyor… güvenilir ürün verisi
   bekleniyor" döner. Dosyadaki `MOCK_PRODUCTS`/`getMockProductResult` (sahte sağlık skoru, alerjen)
   koddadır ama hiçbir ekran tarafından çağrılmaz (`grep` ile doğrulandı) — ölü koddur. Bu nedenle
   "Ürün adını yazarak ara" / "Ürün fotoğrafı ile dene" butonları **gizlenmedi**; mevcut rota mock
   veriye dayanmıyor. Gerçek çözümleyici (OFF → doğrulanmış yerel ürün → izinli üretici → paket/OCR
   adayı) ayrı görevdir.

Ek düzeltmeler (aynı tur): AsyncStorage kayıt hatası artık kullanıcıya bildirilir (`saveContributionDraft`
→ `{ok, errorMessage}`, "Taslak kaydedildi" yalnız `ok:true` iken gösterilir); GTIN uzunluk + GS1 kontrol
basamağı doğrulaması (`src/localProduct/gtin.ts`) taslak kaydından önce zorunlu; fotoğraf artık gerçek
önizleme ile gösterilir (`Image`) ve "Önceki adım" ile herhangi bir adıma dönüp yeniden çekilebilir;
fotoğrafların yalnız geçici önbellek dosyası olduğu (`PHOTO_TEMPORARY_STORAGE_NOTICE`) hem ekranda hem
taslak özetinde açıkça yazılır — kalıcı depolama (`expo-file-system`) kurulmadı, yeni bağımlılık onayı
gerektirir; kamera izni artık yalnız kullanıcı "Kamera izni ver" butonuna basınca istenir, ekran açılır
açılmaz otomatik istenmez (önce gerekçe metni gösterilir).

## Uzatma noktaları (doğrulandı)
- Backend `ProductFacts` kanonik kaynaktır; mobil yalnız `priceResolution.result.productFacts`'ı projekte eder (`src/localProduct/productDataState.ts`). İkinci OFF/skor hattı yok.
- Sözleşme tipleri `src/contracts/generated.ts`'ten alınır (`AllergenDeclaration`, `deriveAllergenState`, `PackagingPhotoKind`, `ProductFactField`, `UsabilityCapabilities`); kopyalanmadı. `price/types.ts` (korumalı bölge) değişmedi; backend'in geriye uyumlu `completeness`/`capabilities` alanları `ProductFactsWire` ile yalnız okunur.
- Kamera: mevcut `expo-camera` (`CameraView`, `takePictureAsync`, barkod tarama). Yeni native paket yok; lockfile değişmedi.
- Risk motoru (`riskEngine.ts`): **ADR-004 kapsamında, proje sahibi onayıyla** trace desteği eklendi
  (ayrı commit); skor formülleri ve alternatif filtre **mantığı** değişmedi — `CRITICAL_ALLERGEN_CODES`
  listesine yeni kodlar eklendi (bkz. Alerjen kapısı bölümü).

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

**F2 kapatıldı (ADR-004).** `ProductRiskInput`'a `traceAllergenInfo`/`traceAllergens` eklendi;
`riskEngine.ts` artık her declared kuralın (`PROFILE_*_ALLERGEN_MATCH`) yanında bağımsız bir
`PROFILE_*_TRACE_MATCH` kuralı çalıştırır (`productTraceContainsAny`, aynı anahtar kelime listeleri).
Mesaj dili: "eser miktarda içerebilir / çapraz bulaşma beyanı", "kesin içerik bilgisi değildir",
"tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır". Trace kodları
`CRITICAL_ALLERGEN_CODES`'a eklendi → kritik uyarı kartında görünür. Ayrıca `TREE_NUTS_KEYWORDS`'e
`"nuts"`, `SHELLFISH_KEYWORDS`'e `"crustaceans"`/`"molluscs"` eklendi — OFF'un genel etiketleri
öncesinde declared eşleşmeyi de sessizce atlıyordu (bağımsız düzeltme, ADR-004 §Bağlam).
`toRiskInputFromProductFacts` artık `traceAllergens: declaration.traceTags` de geçirir (yalnız
`readable` beyanda). Ekranın kendi projeksiyonu (`findProfileDeclarationMatches`) hâlâ ayrı bir metin
gösterir, ama artık motorun gerçek uyarısıyla tutarlı — çelişmez, aynı bulguyu iki bağlamda anlatır.

**Açık kalan madde:** `AlternativeCandidateSignals` (`apps/mobile/src/price/types.ts`, fiyat modülü) bugün
yalnız declared `allergens` taşıyor; `traceAllergens` yok. Bu turda **fiyat modülüne dokunulmadı**
(proje sahibi talimatı). Sonuç: alternatif aday filtresi bugün trace verisiyle çalışamaz — yalnız
ana ürünün kendi kartı için tam etkin. Aday sinyallerine trace eklenmesi ayrı görev + `price` modülü onayı ister.

## "Paket bilgisini ekle" akışı (`app/package-capture.tsx`)
Adımlar ve gerekçe metinleri `PACKAGE_CAPTURE_STEPS`'te: ön yüz → barkod (zorunlu, kamera taramasıyla
otomatik; taranan kod da GS1 kontrol basamağından geçer) → içindekiler → alerjen beyanı/"içerebilir" →
besin tablosu → net miktar. Her adımda "neden" ve "atlarsan" metni.

Gezinme: "Tekrar çek" fotoğrafı siler (yeniden çekilebilir); "◀ Önceki adım" herhangi bir adıma dönüp
çekilmiş fotoğrafın **gerçek önizlemesini** (`Image`, checkmark değil) gösterir; "Bu adımı atla"
`skippedSteps`'e yazar ve daha önce atlanmış bir adımda "Sonraki adım" tekrar basmadan görünür.
"Metni doğrula" ekranindeki "Fotoğraf adımlarına dön" 1. adıma sıfırlar, böylece tüm adımlar
gözden geçirilebilir.

Kamera izni: ekran açılır açılmaz **istenmez**. Her adımda önce gerekçe metni ("Bu adımda… kamera
erişimi gerekir. Fotoğraf yalnız bu cihazda, geçici olarak tutulur…") gösterilir; OS izin isteği
yalnız kullanıcı "Kamera izni ver" butonuna basınca tetiklenir. İzin verilmezse "Fotoğrafsız devam et"
ile elle metin girişine geçilebilir.

Fotoğraflar bu sürümde yalnız **geçici önbellek dosyasıdır** (`expo-camera` cache URI); kalıcı depolama
(`expo-file-system`) bu görevde **kurulmadı** — yeni bağımlılık gerektirdiği için durup onay istenmesi
gerekiyordu, bu doğrultuda kurulmadı. Bu sınır hem "Metni doğrula" ekranında hem taslak özetinde
(`PHOTO_TEMPORARY_STORAGE_NOTICE`) açıkça yazılır: "Uygulama önbelleği temizlenirse… fotoğraflar
kaybolabilir." Kalıcı depolama isteniyorsa ayrı onay ve bağımlılık kurulumu gerekir.

Barkod alanı: `src/localProduct/gtin.ts` → `validateGtin` (uzunluk 8/12/13/14 + GS1 kontrol basamağı).
Geçersiz barkod kırmızı çerçeve + Türkçe hata metniyle işaretlenir; "Taslağı kaydet" geçersiz veya boş
barkodda devre dışıdır.

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

**Kayıt hatası görünürlüğü.** `saveContributionDraft` artık `{ ok, errorMessage }` döner; başarısız
kayıtta (`ok:false`) ekran "Taslak kaydedildi" **göstermez**, kırmızı hata kartı ve Türkçe hata
metniyle review ekranında kalır, "Taslağı kaydet" tekrar denenebilir (proje sahibi düzeltmesi).

**İnsan doğrulama ekranı — sonraki PR (bu turda kararlaştırıldı, kod yok).** Fotoğraf ile aday alan yan
yana; alan başına "doğrula / düzelt / okunamıyor" seçimi; sonuç yerel bir `VerificationRecord`
(sözleşmede zaten var, `src/contracts/generated.ts`) — bu kayıt **henüz `rafskoru_verified` sayılmaz**.
Backend'e yükleme, kullanıcı hesabı ve resmî doğrulama süreci ayrıca, sonradan onaylanacak.

## Görsel ve erişilebilirlik kararları
- Renk tek anlam taşımaz: her durum ikon (✔ ◐ ✕) + başlık; alerjen bloğu ikon (! ~ – ?) + metin.
- Dokunma alanları ≥48 pt; tüm butonlar `accessibilityRole="button"`, `accessibilityLabel`, gerekli yerde
  `accessibilityHint`/`accessibilityState`; barkod okuma sonucu `accessibilityLiveRegion`.
- Dinamik yazı: RN varsayılan `allowFontScaling` korunur; satır yükseklikleri ölçekle büyür.
- Teknik terim yerine Türkçe alan etiketleri (`PRODUCT_FIELD_LABELS`); "Mevcut / Eksik" iki satır.
- Fiyat paneli, RAF skoru ve diğer paneller yerinde; yeni kart yalnız üst bölüme eklendi.

## Senaryolar (`src/localProduct/runLocalProductScenarios.ts`, 11/11)
1. Tam OFF ürünü → usable, üç yetenek, `PROFILE_MILK_ALLERGEN_MATCH`.
2. Görsel/Nutri-Score eksik, alerjen kullanılabilir → partial, kayıt düşmez, süt uyarısı üretilir, fıstık `not_listed_in_available_data`.
3. Yalnız "içerebilir" → `trace_may_contain`; peanut profiliyle eşleşme/eksik uyarısı yok (ADR-004:
   trace beyanı "eksik" saydırmaz); süt profiliyle `PROFILE_MILK_TRACE_MATCH` tetiklenir, declared değil.
4. OFF'ta olmayan / `beta_inference` → not_found, risk girdisi yok.
4b. Eski yanıt (`completeness` yok, `isComplete=false`) → backend ile aynı: not_found; `allergenInfo` yokken ham `allergens` motora geçmez, eksik alerjen uyarısı üretilir.
5. Katkı taslağı, alerjen alanı okunamıyor → `unknown_or_unverified`; elle yazılsa da doğrulanmamış; gönderim kapalı.
6. Adım metinleri + olumlu iddia taraması.
7. Bayrak açık, OFF dışı ama `isComplete=true` kayıt → eski yola düşmez; fail-closed "değerlendirilemedi", boş liste yok.
8. Declared+trace karışık, profil yalnız iz listesinde → motor `PROFILE_MILK_TRACE_MATCH` üretir (ADR-004), declared üretmez; ekran projeksiyonu motorla tutarlı.
9. GTIN doğrulama: ölçülmüş gerçek GTIN'ler geçerli, geçersiz kontrol basamağı/uzunluk/rakam-dışı reddedilir.
10. Geçici fotoğraf uyarısı: fotoğraf varsa özette görünür, yoksa görünmez.

Risk motorunun kendi senaryo dosyası (`src/riskEngine/riskEngineScenarios.ts`, 33/33): senaryo 29–33
ADR-004'ü kapsar — yalnız trace eşleşmesi, declared+trace birlikte, trace var ama profil eşleşmiyor
(eksik uyarısı bastırılır), OFF genel etiketleri `nuts`/`crustaceans`/`molluscs`.

Çalıştırma (yeni bağımlılık yok):
```
cd apps/mobile
npx tsc src/localProduct/runLocalProductScenarios.ts --outDir /tmp/rafskoru-local-product --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --strict
node /tmp/rafskoru-local-product/localProduct/runLocalProductScenarios.js
```

## Doğrulama kapıları
İlk tur (`release-gatekeeper`, 2026-09-18):

| Kapı | Sonuç |
|---|---|
| `npx tsc --noEmit` (mobil) | PASS |
| `npm run smoke:beta-wording` | PASS |
| Risk senaryoları | PASS 28/28 |
| Yerel ürün senaryoları | PASS 9/9 |
| package.json / lockfile / backend / riskEngine.ts / price/types.ts | değişmedi |
| BOM/CRLF, gizli anahtar, olumlu iddia taraması | PASS |
| Backend `npm run check` / `smoke` | uygulanamadı: backend dokunulmadı, bağımlılık kurulu değil |

İkinci tur (proje sahibi düzeltmeleri + ADR-004, aynı gün): `npx tsc --noEmit` PASS ·
`npm run smoke:beta-wording` PASS (guard genişletildi) · risk senaryoları **33/33** ·
yerel ürün senaryoları **11/11** · `git diff --check` temiz · gizli anahtar taraması temiz ·
`package.json` / lockfile / backend / `price/` modülü değişmedi (yalnız `riskEngine.ts` proje sahibi
onayıyla, ayrı commit).

## Ekran görüntüleri
Alınamadı: bu ortamda Android/iOS emülatörü yok ve `expo start --web` için gereken `react-dom` /
`react-native-web` paketleri lockfile'da yok (kurulum lockfile değişikliği gerektirir; yapılmadı).
Kullanıcı testi için: `EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY=1 npx expo start` ile cihazda barkod okutun;
OFF'ta olmayan bir barkodda ✕ kartı ve "Paket bilgisini ekle" görünür.

## Açık bırakılanlar (sonraki görevler)
- **Alternatif aday filtresi trace verisi taşımıyor** (fiyat modülü, bu turda dokunulmadı — ADR-004 §Kapsam dışı).
- İnsan doğrulama ekranı (fotoğraf + aday alan, doğrula/düzelt/okunamıyor, yerel `VerificationRecord`,
  henüz `rafskoru_verified` değil) ve gönderim kanalı; bu sürümde yok, ayrı PR.
- Ad/fotoğraf araması için **gerçek** çözümleyici (OFF → doğrulanmış yerel ürün → izinli üretici kaynağı
  → paket/OCR adayı) ayrı görev; mevcut yol zaten mock üretmiyor (bu turda doğrulandı), yalnız dürüst
  "doğrulanıyor / bulunamadı" durumu gösteriyor.
- Kalıcı fotoğraf depolama (`expo-file-system`) — yeni bağımlılık onayı gerekir; bu turda kurulmadı,
  yalnız geçicilik açıkça belirtildi.
- Fotoğraf içerik hash'i (`PackagingPhotoRef.contentHash`) — kalıcı depolamayla birlikte ele alınacak.
- OCR entegrasyonu (varsa cihaz içi) — aday üretimi, yine `verified=false`.
- Ürün sonuç ekranının parçalanması (2.2k satır) ayrı görev.
- `MOCK_PRODUCTS`/`getMockProductResult` (`src/services/productService.ts`) hiçbir ekran tarafından
  çağrılmıyor (doğrulandı) — ölü kod; kaldırma ayrı, küçük bir temizlik görevi olabilir.
