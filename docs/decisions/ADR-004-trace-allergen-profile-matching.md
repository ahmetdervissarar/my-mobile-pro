# ADR-004: Risk Motorunda Eser/Çapraz Bulaşma (Trace) Alerjen Profil Eşleşmesi

Date: 2026-09-18
Status: Accepted (proje sahibi onayı; bu görevde doğrudan verildi)

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

Ayrıca inceleme sırasında, OFF'un bazı **genel** alerjen etiketlerinin (`nuts`, `crustaceans`, `molluscs`)
mevcut anahtar kelime listeleriyle (ör. `TREE_NUTS_KEYWORDS`, `SHELLFISH_KEYWORDS`) hiç eşleşmediği görüldü —
bu, yalnız trace yolunu değil, bugün var olan **declared** eşleşmeyi de aynı OFF etiketleri için sessizce
bozan, bağımsız bir hata olarak tespit edildi.

## Karar

1. `ProductRiskInput`'a `traceAllergenInfo?: string | null` ve `traceAllergens?: string[]` eklendi.
   Bu alanlar `allergenInfo`/`allergens` (declared) ile **karıştırılmaz**; ayrı, paralel bir girdidir.
2. Her mevcut `PROFILE_*_ALLERGEN_MATCH` kuralı için (peanut, soy, gluten_wheat, milk, lactose, tree_nuts,
   sesame, fish, shellfish — 9 anahtar) aynı anahtar kelime listesini yalnız trace alanlarında arayan bir
   `PROFILE_*_TRACE_MATCH` kuralı eklendi (`productTraceContainsAny`). Declared ve trace kuralları
   birbirinden bağımsızdır; aynı ürün için ikisi de tetiklenebilir (çelişki değildir, farklı kesinlik
   düzeylerini ayrı ayrı bildirirler). `egg` için declared eşleşme kuralı zaten yoktu (yalnız
   `PROFILE_EGG_PRECAUTION` kategori ihtiyatı); bu ADR bunu genişletmez.
3. Mesaj dili ihtiyatlıdır: "içerebilir", "eser miktarda", "çapraz bulaşma beyanı" — asla "içerir"
   kesinliği. Her mesaj "tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır" ile biter
   (E4, P5 — olumlu güvenlik iddiası yok).
4. `MISSING_ALLERGEN_INFO` / `PROFILE_ALLERGEN_INFO_MISSING` kuralı genişletildi: yalnız trace beyanı olan
   (declared boş) bir ürün artık "eksik" sayılmaz — trace beyanı da "alerjen bilgisi"dir, yalnız farklı
   kesinlik düzeyindedir.
5. `TREE_NUTS_KEYWORDS`'e `"nuts"`, `SHELLFISH_KEYWORDS`'e `"crustaceans"` ve `"molluscs"` eklendi (OFF'un
   genel etiketleri). `crustaceans`+`molluscs` → tek `shellfish` profil anahtarına birleştirme
   allergen-safety skill'inde zaten "kesinleşmiş sayılmaz" olarak işaretli; bu ADR birleşimi
   **değiştirmez**, yalnız mevcut (zaten kodda var olan) birleşimin OFF'un iki ayrı etiketiyle de
   çalışmasını sağlar.
6. Yeni 9 kod `PRIORITY_ORDER`'a, ilgili declared kodun hemen ardına eklendi.
7. `PROFILE_*_TRACE_MATCH` kodları mobil `app/product-result.tsx` içindeki `CRITICAL_ALLERGEN_CODES`
   listesine eklendi → kritik uyarı kartında görünür ve profil sahibine bu ürün "uygun alternatif" olarak
   **gösterilmez** (bkz. Sonuçlar §2).

## Kapsam dışı / sonraki adım gerektiren

- **Alternatif aday sinyalleri (`price` modülü).** `AlternativeCandidateSignals`
  (`apps/mobile/src/price/types.ts`) bugün yalnız `allergens` (declared) taşıyor; `traceAllergens` alanı
  yok. Bu görevde **fiyat modülüne dokunulmadı** (proje sahibi talimatı). Sonuç: `CRITICAL_ALLERGEN_CODES`
  listesine trace kodları eklenmiş olsa da, alternatif aday değerlendirmesi bugün trace verisi
  taşımadığı için trace eşleşmesi üzerinden bir adayı **fiilen** filtreleyemez — yalnız ana ürünün kendi
  uyarı kartı ve risk sonucu için çalışır. Aday sinyallerine `traceAllergens` eklenmesi ayrı bir görev ve
  `price` modülü onayı gerektirir; bu ADR bunu **açık madde** olarak bırakır.
- `egg` için declared/trace eşleşme kuralı eklenmedi (mevcut kapsam dışı, yeni istek gerekir).

## Sonuçlar

1. `riskEngine.ts` artık dört durumun ikisini (`declared_contains`, `trace_may_contain`) aynı merkezi
   motorda, ayrı kodlarla üretir; ekran artık bu ikisi için ayrı bir "gölge" mantık yürütmez
   (`findProfileDeclarationMatches` yalnız ekran özet metni için kalır, güvenlik kararı motordan gelir).
2. Ana ürün için: trace eşleşmesi artık `criticalProfileWarnings` kartında (skordan önce) görünür ve
   `evaluateRecoveryRisk` üzerinden `PriceScore`/skor mantığına karışmadan, bağımsız bir güvenlik
   sinyali olarak kalır.
3. `apps/mobile/src/localProduct/productDataState.ts` → `toRiskInputFromProductFacts` artık okunabilir
   beyandan `traceAllergens: declaration.traceTags` de geçirir (yalnız `readable` durumda).
4. Testler: `src/riskEngine/riskEngineScenarios.ts` senaryo-29..33 (5 yeni) + `runLocalProductScenarios.ts`
   güncellenen senaryo 3 ve 8.
5. `riskEngine.ts`, `CRITICAL_ALLERGEN_CODES` ve keyword listeleri "korumalı bölge" (S2) olmaya devam
   eder; bu ADR'ın kapsamı dışındaki bir değişiklik yine insan onayı ve `allergen-safety-reviewer` gerektirir.

## Doğrulama

- `npx tsc --noEmit` (mobil)
- `src/riskEngine/runRiskEngineScenarios.ts` → 33/33
- `src/localProduct/runLocalProductScenarios.ts` → güncellenmiş senaryolarla yeşil
