# ADR-005: OFF'ta Bulunmayan / Kısmi Ürünler için İçerik Çözümleme ve İnsan Alan İncelemesi

Date: 2026-09-18
Status: Accepted (proje sahibi görev tanımı; dikey dilim v1)
Dal: `feat/local-product-content-resolution-v1` · Taban: `92dbfc1` (`integration/rafskoru-ready-for-code`)
Araştırma: `docs/research/local-product-content-resolution-2026-09-18.md`

## Bağlam

Barkod OFF'ta yoksa veya kayıt kısmiyse kullanıcı boş sonuçta kalıyordu; önceki dilim (ADR-004 dalı)
yalnız üç veri durumu ve gönderilmeyen bir katkı taslağı üretiyordu. Kaynak merdiveni (OFF → doğrulanmış
yerel kayıt → üretici resmî kataloğu → izinli perakendeci → ambalaj fotoğrafı → OCR adayı → insan
doğrulaması) için sözleşme, sağlayıcı arayüzü, alan bazlı birleştirme ve insan inceleme ekranı yoktu.
Bu görev fiyat araştırması değildir; fiyat sağlayıcıları, ağırlıklar ve hesaplar değişmedi.

## Karar (seçilen mimari: hibrit — kaynak adayı + ambalaj kanıtı + insan incelemesi, bağımlılıksız)

1. **Sözleşmeler** (`src/localProduct/resolution/types.ts`): `ResolutionCandidate`, `FieldEvidence`
   (alan × kaynak × `observedAt/fetchedAt/confidence/evidenceId`), `FieldConflict`, `MergedProductRecord`,
   `ProductResolutionAttempt`, `HumanFieldCheck`, `LocallyReviewedRecord`. `src/contracts/generated.ts`
   tipleri kopyalanmaz, içe alınır. **Ürün-geneli güven değeri yoktur** (senaryo 14 bunu kilitler).
2. **Kimlik** (`identity.ts`): aynı GTIN (14 haneye normalize) → `exact_gtin`; farklı GTIN asla
   birleştirilmez; barkodsuz eşleşme yalnız `marka + normalize ad + varyant + net miktar` dördü de varken
   `candidate_no_gtin` olur ve **birleştirmeye girmez**. Benzer ad/fotoğraf eşleşme değildir.
3. **Sağlayıcılar** (`providers.ts`): `off` (backend `ProductFacts` → aday; mobil OFF'a doğrudan çağrı
   yapmaz), `verified_local` (gerçek `VerifiedLocalStore` arayüzü + `emptyVerifiedLocalStore`: bu sürümde
   kayıt yok), `contribution_draft` (cihaz taslağı → `user_ocr`, `verified=false`), `manufacturer_official`
   → **uygulanmadı** (`not_implemented`, görünür neden); sahte adapter yazılmadı.
4. **Birleştirme** (`mergeEngine.ts`): mevcut yapılandırılmış alan korunur; eksik alan yalnız kanıtlı
   adayla tamamlanır (user_ocr → `low`, yapılandırılmamışsa `candidateText`); farklı değerler `unresolved`
   kalır; güncel ambalaj kanıtı `displayHint` ile gösterilir ama insan kararı olmadan üzerine yazmaz;
   `fetchedAt` gözlem sayılmaz. Öncelik: `rafskoru_verified > off > manufacturer > user_ocr`
   (üretici verisi doğrulama kaydı olmadan otomatik yüksek güven değildir — product-data-provenance).
5. **Alerjen**: beyan yalnız okunabilir kaynaktan (`off/rafskoru_verified/manufacturer`); OCR/elle metin
   `allergenCandidateText`te ayrı kalır, beyana dönüşmez. OFF'un boş `allergens_tags`'ı negatif kanıt
   değildir (`absent` → `unknown_or_unverified`; gerçek wefood/Beypazarı kayıtlarıyla test edildi).
   Yerel incelenmiş kayıt her zaman `allergenState: 'unknown_or_unverified'`; alternatif kapısı
   (`isAlternativeCandidateSafeForAllergyProfile`) değişmedi ve bu kayıtlar ondan geçemez.
6. **İnsan incelemesi** (`review.ts`, `app/package-review.tsx`, `src/localProduct/review/*`): fotoğraf + aday
   metin yan yana; her alan için Doğrula / Düzelt / Okunamıyor; alerjen alanı en üstte ve ilk sırada.
   Sonuç `locally_reviewed_candidate` — `rafskoru_verified` değildir, hiçbir yolla ona dönüşmez, hiçbir
   yere gönderilmez. Düzeltme eski kanıtı silmez (`supersededByEvidenceId`). Okunamayan alan değer üretmez.
7. **On ekran durumu** (`uiState.ts`): searching_sources · off_partial · exact_gtin_match ·
   multiple_candidates · official_source_conflict · packaging_photo_needed ·
   ocr_candidate_pending_review · field_unreadable · local_candidate_saved · data_still_insufficient.
   İkon + metin; olumlu güvenlik iddiası yok (wording guard'a eklendi).
8. **`product-result.tsx` büyütülmedi**: yalnız `onReviewDraft` geri çağrısı (1 satır); akış yeni ekrandadır.
9. Bayrak: mevcut `EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY` (varsayılan kapalı). Yeni bayrak, paket, lockfile,
   backend, veritabanı veya dış servis çağrısı eklenmedi.

## Reddedilen / ertelenen seçenekler (ayrıntı ve tablo: araştırma raporu)

- **Cihaz içi OCR** (ML Kit / Apple Vision; `rn-mlkit-ocr`, `expo-mlkit-ocr`): teknik olarak uygun ve
  kişisel veri riski düşük; ancak native modül + prebuild = yeni bağımlılık → durma koşulu. Sözleşme OCR'ı
  `entryMethod: 'ocr'` ile hazır bekler; **insan onayı bekliyor**.
- **Sunucu OCR / ücretli görsel servis** (Google Cloud Vision, 1.000 birim/ay ücretsiz, sonra 1,50 $/1.000):
  API anahtarı + ambalaj fotoğrafının backend'e yüklenmesi → iki durma koşulu; bu turda reddedildi.
- **Üretici resmî kataloğu adapter'ı**: tek aramada kullanım hakkı açık resmî ürün sayfası bulunamadı
  (sonuçlar OFF sayfaları ve üçüncü taraf toplayıcılar). Uygulanmadı; hak yazılı olmadan uygulanmayacak.
- **GS1 Verified by GS1 / GS1 Türkiye ürün doğrulama**: kimlik doğrulama (marka, ad, GPC, miktar) sağlar,
  içindekiler/alerjen vermez; API erişimi üye/kamu koşullu. gs1.org egress'te engelli, gs1tr.org 503 →
  birincil kaynakla doğrulanamadı; karar ertelendi.

## Sonuçlar

- Testler: `runResolutionScenarios.ts` 16/16 (zorunlu 11 + gerçek kaydedilmiş OFF kanıtı 2 + güven yokluğu +
  metin + doğrulanmış-beyan önceliği). Mevcut koşucular değişmedi: risk 39/39, yerel ürün 11/11, alternatif
  filtre 14/14.
- Denetim (2026-09-18, birer tur): `product-data-contract-reviewer` F1 (yüksek) — alerjen beyanı bloğu alan
  seçiminden ayrı ikinci bir seçim yapıyordu; düzeltildi, senaryo 16 ile kilitlendi. `allergen-safety-reviewer`:
  yüksek/orta bulgu yok; F1 (düşük): inceleme ekranı OFF adayını içermiyor, kayıtlı OFF beyanı karşılaştırma
  için görünmüyor → ürün kararı (aşağıda). `legal-privacy-reviewer`: profil verisi kayda/log'a yazılmıyor;
  OFF tam atıf metni eklendi; dışa aktarım başlarsa share-alike ve `contributorPseudonymousId` uzman görüşü ister.
- Açık kararlar: (1) inceleme ekranına OFF adayının eklenmesi (backend `resolve` çağrısı ekler); (2)
  `locally_reviewed_candidate` durumunun backend `VerifiedLocalProductStatus`'a taşınıp taşınmayacağı;
  (3) `MergedProductRecord`'dan `UsabilityCapabilities`/`CompletenessTier` türetimi (bu turda üretilmiyor).
- Gerçek veri denemesi: 7 GTIN (6 bulundu, 1 OFF 404), v2 arama 13 Torku adayı; kanıt dosyası
  `docs/research/evidence/off-content-resolution-2026-09-18.live.json`.
- Yayın engelleri sürüyor: zorunlu dört alerjenin profil modeli, gerçek cihaz görsel testi, kalıcı fotoğraf
  saklama, `rafskoru_verified` doğrulama hattı, gerçek ürün çözümleyici (üretici/GS1). Dizi varlığı tek
  başına doğrulanmış köken sayılmaz (ADR-004 rev. 4 ilkesi burada da geçerlidir).
- Lisans notu: OFF verisi ODbL/DbCL; birleştirilmiş kayıt cihazda kalır ve dışa aktarılmaz. Yeniden dağıtım
  başlarsa paylaşım (share-alike) yükümlülüğü ayrıca değerlendirilecek (`legal-privacy-reviewer`).
