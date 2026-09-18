# ADR-004: Risk Motorunda Eser/Çapraz Bulaşma (Trace) Alerjen Profil Eşleşmesi

Date: 2026-09-18
Status: Accepted (proje sahibi onayı; bu görevde doğrudan verildi)

## Revizyon 2026-09-18 (dördüncü tur) — uçtan uca kanıt-eksikliği düzeltmesi

Proje sahibi üçüncü turdan sonra gerçek veri yolunu denetledi ve bir boşluk buldu: madde 7'nin
mobil tip eklemesi (`AlternativeCandidateSignals.traceAllergens`) yalnız TİP tanımıydı — gerçek
backend (`apps/backend/src/price/alternatives/types.ts`) ve gerçek seed verisi
(`apps/backend/data/seed-candidates.json`, 11 aday) bu alanı hiç taşımıyordu. Üçüncü turun 9/9
testi yalnız elle kurulmuş mobil nesnelerde geçiyordu; gerçek uygulama yanıtında trace filtresi
fiilen **etkisizdi** ("Kapsam dışı" bölümünün eski 3. maddesi bunu belirtiyordu ama bu, alternatif
listesinin sessizce eski/kanıtsız davranışta kalması demekti).

Bu tur, geniş bir backend/alternatif veri hattı **kurmaz** (backend/`types.ts`, `seed-candidates.json`,
fiyat kaynağı/hesaplama/ağırlık/sağlayıcı dosyalarının hiçbiri değişmedi). Bunun yerine küçük,
fail-closed bir kanıt-eksikliği kapısı eklendi:

11. `src/localProduct/alternativeAllergenFilter.ts::hasCompleteAllergenEvidence(signals)` — bir
    adayın alerjen KANITININ eksiksiz olup olmadığını denetler: yalnız `signals.allergens` VE
    `signals.traceAllergens` HER İKİSİ de (boş dizi dahil) açıkça bir dizi olarak MEVCUTSA eksiksiz
    sayılır. `signals` yokluğu veya `traceAllergens === undefined`, "iz beyanı yok" (negatif kanıt)
    OLARAK OKUNMAZ — "bu alan hiç değerlendirilmedi" (kanıt eksik) olarak okunur. Bu ayrım kasıtlıdır:
    üçüncü turdaki `signals?.traceAllergens ?? []` geçişi (madde 1'deki `evaluateAlternativeCandidateRisk`)
    fail-closed AMAÇLI değildi — yalnız motora güvenli bir varsayılan değer geçiriyordu; dördüncü tur
    buna ek olarak, kanıt eksikken adayı **tamamen gizleyen** ayrı bir kapı ekler.
12. `isAlternativeCandidateSafeForAllergyProfile(signals, productName, userProfile)` — alternatif
    listesi filtresinin TEK giriş noktası oldu (`isAlternativeCandidateCriticalMatch`'in yerini aldı,
    `product-result.tsx`'te). Kural: kullanıcı profilinde **hiç alerjen yoksa** mevcut davranış aynen
    korunur (yalnız kritik eşleşme kontrolü). Kullanıcı profilinde **en az bir alerjen varsa**, adayın
    kanıtı eksiksiz olmalıdır (madde 11); eksikse/doğrulanmamışsa aday **kritik eşleşme kontrolüne bile
    geçilmeden** gizlenir. Bu, uydurulmuş bir `verified=true` bayrağına DAYANMAZ; yalnız `signals`
    nesnesinin şeklini okur — alan bazlı köken sözleşmesi (`src/contracts/generated.ts`) alternatif
    adaylara henüz bağlı değildir (bu tur da bağlamaz, kapsamı aşar).
13. **Ampirik sonuç (kasıtlı, doğrulanmış):** bugün `seed-candidates.json`'daki 11 adayın HİÇBİRİ bu
    kanıt eşiğini geçemez (hiçbiri `traceAllergens` alanı taşımıyor — doğrudan dosya okunarak
    doğrulandı). Bu nedenle alerji profili tanımlı bir kullanıcı için **tüm** seed alternatifleri
    fail-closed gizlenir; alerji profili olmayan kullanıcının mevcut alternatif davranışı
    değişmez (aşağıdaki senaryo 14 bunu gerçek dosyayla kanıtlar). Bu, istenen ve doğru sonuçtur —
    kanıtsız veriyi "muhtemelen güvenli" saymak yerine, kanıt gelene kadar göstermemeyi tercih eder.

## Revizyon 2026-09-18 (üçüncü tur) — çelişki düzeltmesi

İlk sürümün §Karar madde 7'si "alternatif filtresi bu ürünü uygun alternatif olarak
**göstermez**" derken, §Kapsam dışı bunun **fiilen çalışmadığını** yazıyordu — bu çelişkiliydi
(proje sahibi bulgusu). Bu revizyon çelişkiyi ortadan kaldırır: aşağıdaki madde 1, 2, 5, 7 ve
"Kapsam dışı" bölümü artık **gerçek, uygulanmış** davranışı anlatır. Aynı turda ayrıca:
- `egg` için declared+trace eşleşmesi eklendi (madde 8) — önceki sürümde kapsam dışıydı.
- OFF'un genel `nuts`/`crustaceans`/`molluscs` etiketleri artık serbest metinde **aranmaz**;
  yalnız yapılandırılmış dizide tam eşleşmeyle değerlendirilir (madde 9) — önceki sürümdeki
  serbest metin eklemesi "coconuts", "doughnuts" ve declared `"peanuts"` ile yanlış eşleşiyordu.
- Türkiye'de zorunlu olup profilde henüz modellenmeyen kereviz, hardal, sülfit ve acı bakla
  için yayın engeli **aynen sürüyor** (madde 10) — bu turda dokunulmadı, dokunulmayacak.

## Bağlam

`allergen-safety` skill'i dört ayrı alerjen veri durumu tanımlar: `declared_contains`,
`trace_may_contain`, `not_listed_in_available_data`, `unknown_or_unverified`. `feat/local-product-recovery-ux`
dalındaki ürün sonuç ekranı bu dört durumu ekranda ayrı ayrı gösteriyordu (`describeAllergenDeclaration`),
ancak `apps/mobile/src/riskEngine/riskEngine.ts` yalnız `declared_contains` (beyana göre "içerir") için
profil eşleşmesi (`PROFILE_*_ALLERGEN_MATCH`) üretiyordu. `trace_may_contain` ("içerebilir" / eser /
çapraz bulaşma) beyanı motor girdisinde hiç taşınmıyordu (`ProductRiskInput`'ta alan yoktu).

`allergen-safety-reviewer` denetimi (F2, 2026-09-18) bu boşluğu şöyle işaretledi: profildeki bir alerjenle
yalnız iz/trace düzeyinde eşleşen bir ürün, risk motorundan hiçbir uyarı üretmiyordu; ekran yalnız bir
projeksiyon metni gösteriyordu (`findProfileDeclarationMatches`), kritik uyarı alanına (`CRITICAL_ALLERGEN_CODES`)
ve alternatif filtresine hiç girmiyordu. Bu, merkezi risk motoru (S2, korumalı bölge) dışında ikinci bir
"gölge" alerjen mantığı oluşturuyordu.

İlk turda ayrıca, OFF'un bazı **genel** alerjen etiketlerinin (`nuts`, `crustaceans`, `molluscs`) mevcut
anahtar kelime listeleriyle (ör. `TREE_NUTS_KEYWORDS`, `SHELLFISH_KEYWORDS`) hiç eşleşmediği görüldü ve
bu listelere serbest metin anahtar kelimesi olarak eklendi. Üçüncü turda proje sahibi bunun yanlış
tasarım olduğunu belirledi: kısa İngilizce kelimeler ("nuts") serbest içindekiler metninde "coconuts",
"doughnuts" gibi ilgisiz kelimelerle, yapılandırılmış dizide ise declared `"peanuts"` (ayrı bir alerjen)
ile de eşleşiyordu — madde 9'da düzeltildi.

## Karar

1. `ProductRiskInput`'a `traceAllergenInfo?: string | null` ve `traceAllergens?: string[]` eklendi.
   Bu alanlar `allergenInfo`/`allergens` (declared) ile **karıştırılmaz**; ayrı, paralel bir girdidir.
2. Her mevcut `PROFILE_*_ALLERGEN_MATCH` kuralı için (peanut, soy, gluten_wheat, milk, lactose, tree_nuts,
   sesame, fish, shellfish — 9 anahtar, + üçüncü turda egg) aynı anahtar kelime listesini yalnız trace
   alanlarında arayan bir `PROFILE_*_TRACE_MATCH` kuralı eklendi (`productTraceContainsAny`). Declared ve
   trace kuralları birbirinden bağımsızdır; aynı ürün için ikisi de tetiklenebilir (çelişki değildir,
   farklı kesinlik düzeylerini ayrı ayrı bildirirler).
3. Mesaj dili ihtiyatlıdır: "içerebilir", "eser miktarda", "çapraz bulaşma beyanı" — asla "içerir"
   kesinliği. Her mesaj "tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır" ile biter
   (E4, P5 — olumlu güvenlik iddiası yok).
4. `MISSING_ALLERGEN_INFO` / `PROFILE_ALLERGEN_INFO_MISSING` kuralı genişletildi: yalnız trace beyanı olan
   (declared boş) bir ürün artık "eksik" sayılmaz — trace beyanı da "alerjen bilgisi"dir, yalnız farklı
   kesinlik düzeyindedir.
5. **(Üçüncü tur ile değişti)** OFF'un genel `nuts`/`crustaceans`/`molluscs` etiketleri
   `TREE_NUTS_KEYWORDS`/`SHELLFISH_KEYWORDS` serbest metin listelerinde **değildir**. Bunun yerine
   `GENERIC_TREE_NUT_TAGS`/`GENERIC_SHELLFISH_TAGS` + `arrayHasExactTag()` yalnız yapılandırılmış
   `allergens`/`traceAllergens` dizisinde TAM etiket eşleşmesi arar (`normalizeText` ile büyük/küçük harf
   ve Türkçe karakter farkı giderilir, ama alt dize aranmaz). `crustaceans`+`molluscs` → tek `shellfish`
   profil anahtarına birleştirme allergen-safety skill'inde "kesinleşmiş sayılmaz" olarak işaretli; bu ADR
   birleşimi değiştirmez, yalnız eşleştirme yöntemini güvenli hâle getirir.
6. Yeni kodlar `PRIORITY_ORDER`'a, ilgili declared kodun hemen ardına eklendi.
7. **(Üçüncü tur ile gerçek davranış oldu)** `PROFILE_*_ALLERGEN_MATCH`/`PROFILE_*_TRACE_MATCH` kodları
   tek kaynaklı `src/localProduct/criticalAllergenCodes.ts::CRITICAL_ALLERGEN_CODES` listesindedir. Ana
   ürünün kritik uyarı kartı VE alternatif aday filtresi (`src/localProduct/alternativeAllergenFilter.ts::
   isAlternativeCandidateCriticalMatch`) **aynı** listeyi ve **aynı** `evaluateProductRisks` çağrısını
   kullanır — declared ve trace ayrı alanlarla. `AlternativeCandidateSignals.traceAllergens`
   (`apps/mobile/src/price/types.ts`, tek satırlık opsiyonel alan eklemesi) sayesinde bir alternatif
   adayın profil ile trace eşleşmesi de artık **fiilen** onu "uygun alternatif" listesinden düşürür
   (bkz. Sonuçlar §2, madde 11).
8. **(Üçüncü tur)** `egg` için declared+trace eşleşmesi eklendi: `PROFILE_EGG_ALLERGEN_MATCH`,
   `PROFILE_EGG_TRACE_MATCH` (`EGG_KEYWORDS`). Mevcut kategori bazlı `PROFILE_EGG_PRECAUTION`
   (işlenmiş et/tatlı/vegan ürün grubu ihtiyatı) bunun **yerine geçmez**; üç kod ayrı ayrı kalır ve
   birbirini bastırmaz. Yalnız `*_ALLERGEN_MATCH`/`*_TRACE_MATCH` kodları `CRITICAL_ALLERGEN_CODES`
   listesindedir — `PROFILE_EGG_PRECAUTION` kritik sayılmaz, tek başına alternatifi gizlemez.
9. **(Üçüncü tur)** Madde 5'in düzeltmesi: bkz. yukarı.
10. Türkiye'de zorunlu olup profilde henüz modellenmeyen **kereviz, hardal, sülfit/sülfür dioksit ve acı
    bakla** hâlâ `OFF_ALLERGEN_TAG_TO_PROFILE_KEYS` ve `riskEngine.ts`'te profil eşleşmesi almıyor
    (allergen-safety skill'in "modellenmemiş zorunlu alerjenler" notu geçerli). Bu ADR bunu **genişletmez**;
    ayrı bir profil modeli görevi gerektirir. Dikey dilim `EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY` bayrağı
    arkasında ve varsayılan kapalı kalır — bu gerekçe genel kullanıma açılmayı engelleyen kalıcı bir
    koşuldur, yalnız belge notu değildir.

## Kapsam dışı / sonraki adım gerektiren

- Kereviz/hardal/sülfit/lupin profil modeli (madde 10) — ayrı görev, ayrı insan onayı.
- Kullanıcı kaynaklı katkı taslağındaki (`ContributionDraft`) alerjen beyanı hâlâ `unreadable`/`absent`
  ötesine geçmiyor ve motora girmiyor (kasıtlı — bkz. `contributionDraft.ts`); bu ADR bunu değiştirmez.
- **(Dördüncü tur ile düzeltildi)** `AlternativeCandidateSignals.traceAllergens` hâlâ yalnız mobil
  TİP tanımıdır; backend'in gerçek alternatif yanıtında bu alanı doldurması bu görevin kapsamı
  dışındadır (backend/`price` modülü davranışına dokunulmadı, bu tur da dokunmadı). Ancak alan
  yokluğu artık "iz beyanı yok" (negatif kanıt) OLARAK OKUNMAZ — bkz. yukarı, madde 11-13:
  kanıt eksikliği, alerji profili olan kullanıcı için adayı tamamen gizler (fail-closed). Backend
  gerçekten `traceAllergens` doldurmaya başladığında (ayrı görev, alan bazlı köken sözleşmesi
  entegrasyonu ile), bu adaylar otomatik olarak kanıt eşiğini geçip görünür hâle gelecektir —
  bu ADR o entegrasyonu KURMAZ, yalnız ona hazır bir kapı bırakır.

## Sonuçlar

1. `riskEngine.ts` artık dört durumun ikisini (`declared_contains`, `trace_may_contain`) aynı merkezi
   motorda, ayrı kodlarla üretir; ekran artık bu ikisi için ayrı bir "gölge" mantık yürütmez
   (`findProfileDeclarationMatches` yalnız ekran özet metni için kalır, güvenlik kararı motordan gelir).
2. Ana ürün VE alternatif aday değerlendirmesi **aynı** kod tabanını paylaşır (`evaluateProductRisks` +
   `CRITICAL_ALLERGEN_CODES`); biri diğerinden farklı sonuç veremez (tek kaynak, madde 7).
3. `apps/mobile/src/localProduct/productDataState.ts` → `toRiskInputFromProductFacts` okunabilir beyandan
   `traceAllergens: declaration.traceTags` geçirir; `alternativeAllergenFilter.ts` adayın kendi
   `signals.traceAllergens`'ını geçirir — iki farklı veri kaynağı, aynı motor sözleşmesi.
4. Testler: `src/riskEngine/riskEngineScenarios.ts` senaryo-29..39 (11 yeni, ilk turdan 5 + üçüncü turdan
   6: egg declared/trace, coconut/doughnut negatif, peanuts-vs-tree_nuts negatif, crustaceans/molluscs
   serbest metin negatif, egg+peanut karışık) + `runLocalProductScenarios.ts` (11/11) +
   `runAlternativeAllergenFilterScenarios.ts` (14/14 — 9 üçüncü turdan + 5 dördüncü tur: signals yok,
   traceAllergens undefined, trace eşleşmesi, doğrulanmış kanıt+çakışma yok, GERÇEK
   `seed-candidates.json` dosyasıyla hem boşluğun hem düzeltmenin kanıtı).
5. `riskEngine.ts`, `CRITICAL_ALLERGEN_CODES` ve keyword listeleri "korumalı bölge" (S2) olmaya devam
   eder; bu ADR'ın kapsamı dışındaki bir değişiklik yine insan onayı ve `allergen-safety-reviewer` gerektirir.
6. Fiyat modülü: `apps/mobile/src/price/types.ts`'te yalnız bir opsiyonel alan eklendi
   (`AlternativeCandidateSignals.traceAllergens`, üçüncü tur); dördüncü tur bu dosyaya hiç dokunmadı.
   Fiyat kaynağı, hesaplama, ağırlık, sağlayıcı, backend veya seed veri dosyalarının hiçbiri değişmedi
   (`git diff -- apps/mobile/src/price apps/backend/src/price apps/backend/data/seed-candidates.json`
   ile doğrulandı — boş diff).
7. **(Dördüncü tur)** `app/product-result.tsx`'teki `visibleAlternativeRecommendations` filtresi artık
   `isAlternativeCandidateSafeForAllergyProfile`'ı çağırır (eskiden `isAlternativeCandidateCriticalMatch`);
   davranış kritik eşleşme kontrolünü İÇERİR, ayrıca alerji profili olan kullanıcı için kanıt eksikliği
   kapısını da uygular.

## Doğrulama

- `npx tsc --noEmit` (mobil) → PASS
- `src/riskEngine/runRiskEngineScenarios.ts` → 39/39 (dördüncü turda değişmedi)
- `src/localProduct/runLocalProductScenarios.ts` → 11/11 (dördüncü turda değişmedi)
- `src/localProduct/runAlternativeAllergenFilterScenarios.ts` → 14/14 (dördüncü tur: 9→14)
- `npm run smoke:beta-wording` → PASS
- `git diff -- apps/mobile/src/price apps/backend/src/price apps/backend/data/seed-candidates.json
  package.json package-lock.json apps/mobile/package.json apps/mobile/package-lock.json
  apps/backend/package.json apps/backend/package-lock.json` → boş (dördüncü tur)
