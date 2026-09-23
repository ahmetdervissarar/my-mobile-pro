# ADR-006: Kronik Durum Eşik Kuralları — Diyabet, Hipertansiyon, Kalp-damar/Kolesterol

Date: 2026-09-23
Status: Accepted

## Context

ADR-005, kronik durum uyarılarının v1 kapsamını diyabet
(`blood_sugar_diabetes`), hipertansiyon (`hypertension_sodium`) ve
kalp-damar/kolesterol (`cardiovascular` / `cholesterol_saturated_fat`) ile
sınırlandırmış, `kidney_sensitivity`'i (fosfor/potasyum verisi hiçbir
katmanda yok) ve `celiac_gluten`'i (zaten allerjen eşleşmesiyle kapsanıyor)
kapsam dışı bırakmıştı.

Bu ADR, o üç eksen için kuralların **neden** ve **nasıl** hesaplandığını,
eşik sayılarının kaynağını ve bilinen sınırları kayıt altına alır.

## Kök neden: bant yetersizliği

Kurallar daha önce yalnız Traffic Light'ın önceden sınıflanmış
düşük/orta/yüksek bandını (`trafficLight.X.level === "high"`) okuyordu. İki
sorun vardı: (1) yerel TR katalogdan gelen ürünlerde bu bant sabit `null`
üretiliyordu (`productFactsFromCatalog`, `trafficLight: null` — bkz. önceki
denetim raporu), yani kurallar gerçek veriyle hiç çalışmıyordu; (2) bant tek
başına, düşük kalorili ama görece tuzlu/şekerli ürünleri (ör. ayran)
enerjiye göre normalize eden bir referansla karşılaştırmıyordu.

## Decision — veri yolu

- `CatalogProduct`/`ProductFacts` artık ham `nutrition100g`
  (energyKcal, sugars, salt, saturatedFat, fiber, proteins, carbohydrates,
  transFat) + `basis` (`per_100g`/`per_100ml`) taşıyor.
  `productFactsFromCatalog`, `trafficLight`'ı bu ham veriden
  hesaplıyor (artık sabit `null` değil); mobil `ProductRiskInput.nutrition`
  aynı ham veriyi taşıyor.
- `trafficLight` yalnız BİLGİ amaçlı bant olarak kalıyor; kural hesaplaması
  daima ham gram/kcal değerinden yapılıyor (`riskEngine.ts`,
  `classifySugarsForDiabetes` / `classifySaltForHypertension` /
  `classifySaturatedFatForCardio`).
- Geriye dönük uyumluluk: `nutrition` alanı boşsa (örn. yalnız `trafficLight`
  dolduran eski çağıranlar/test senaryoları), kural `trafficLight.X.value`'ya
  düşer — bu, mevcut 31 riskEngine senaryosunun aynı sonucu üretmeye devam
  etmesini sağladı (bkz. doğrulama).

## Decision — eşik tablosu

| Eksen | Birincil eşik (enerji varsa) | Enerji yoksa (fallback) | Kaynak |
|---|---|---|---|
| Diyabet (şeker) | şeker(g)×4 ≥ enerji(kcal)×0.10 | şeker > 22.5 g/100g | DSÖ (WHO 2015, *Sugars intake for adults and children*): serbest şekerden gelen enerji ≤%10. FSA (UK) per-100g "yüksek şeker" bandı. |
| Hipertansiyon (tuz/sodyum) | sodyum(mg) ÷ enerji(kcal) ≥ 1 **VEYA** tuz ≥ 0.75 g/100g | tuz ≥ 0.75 g/100g | TGK Beslenme Beyanları Yönetmeliği'nin "düşük sodyum" referans çerçevesi + PAHO Besin Profili Modeli (≈100 mg sodyum/100 kcal sınırının karşılığı: ≥1 mg/kcal "aşırı"). PAHO/Meksika modelindeki 300 mg sodyum/100g "aşırı" eşiğinin tuz karşılığı: 300÷400=0.75 g. |
| Kalp-damar / Kolesterol (doymuş yağ) | doymuşYağ(g)×9 ≥ enerji(kcal)×0.10 | doymuşYağ > 5 g/100g | DSÖ (WHO 2018 taslak kılavuz): doymuş yağdan gelen enerji ≤%10. FSA per-100g "yüksek doymuş yağ" bandı. |
| Kalp-damar (trans yağ, veri varsa) | transYağ(g)×9 ≥ enerji(kcal)×0.01 | — (veri yoksa değerlendirilmez) | DSÖ: trans yağdan gelen enerji <%1. **Bugün hiçbir veri kaynağı (OFF-TR JSONL, `normalize.ts` `NutrientKey`) trans yağ taşımıyor** — kod yolu var, veri geldiğinde devreye girer. |

Tuz→sodyum dönüşümü tek noktadan yapılır: `saltGramsToSodiumMg(g) = g × 400`
(`riskEngine.ts`), NaCl'nin kütlece ~%39.3 sodyum içermesinden gelen,
etiketlemede standart kabul edilen yuvarlanmış katsayı.

Yalnız `exceeds` durumu bir `RiskWarning` üretir. `within` sessizdir.
`no_data` da **uyarı üretmez** — bunun yerine `getChronicNutritionDataGap`
ürün sayfasının besin bölümünde nötr, tek satırlık bir not
("Besin değeri verisi yok — etiketi kontrol edin.") tetikler, yalnızca
kullanıcının profilinde ilgili eksen aktifse. Katalogda enerji verisi 11.292
üründen yalnız 2.546'sında (%22.5), şeker 2.066'sında (%18.3) var — her eksik
veriyi tam bir uyarıya çevirmek uyarı yorgunluğu yaratırdı.

## celiac_gluten

Ayrı bir eşik kuralı yazılmadı. `evaluateProductRisks`, `celiac_gluten`
seçiliyken `effectiveAllergens` listesine `gluten_wheat`'i ekliyor; bu liste
hem allerjen-kapısını (`PROFILE_ALLERGEN_INFO_MISSING`) hem gluten
beyan/iz/içindekiler eşleşmesini (`PROFILE_GLUTEN_ALLERGEN_MATCH`) besliyor.
İki anahtar için sonuç birebir aynı — `celiacGlutenParity.smoke.ts` bunu
hem beyan hem veri-yok durumu için kanıtlıyor.

## Bilinen sınırlar

- **Sıvılar için ayrı bir eşik tablosu yok.** `basis` alanı (`per_100g` /
  `per_100ml`) sözleşmeye eklendi ama OFF-TR içe aktarımı bugün her ürünü
  `per_100g` OFF alanlarından (`*_100g`) okuyor — sıvı ürünler (süt, ayran,
  içecekler) de per-100g eşiklerle değerlendiriliyor. Gerçek per-100ml bir
  eşik tablosu (DSÖ/FSA'nın sıvı için farklı bantları var) sonraki adım.
- **Serbest şeker yerine TOPLAM şeker kullanılıyor.** DSÖ'nün %10-enerji
  kılavuzu serbest/eklenmiş şekeri hedefler; OFF verisi serbest ve doğal
  şekeri (ör. süt/meyvedeki laktoz/früktoz) ayırmıyor. Toplam şeker
  kullanmak ihtiyatlı yönde (fazla uyarı, kaçırılan uyarı değil) ama süt/
  meyve gibi ürünlerde yanlış pozitif riski taşır.
- **Böbrek (fosfor/potasyum) kapsam dışı** — gerekçe ADR-005'te.
- **Trans yağ kuralı bugün hiçbir gerçek veriyle tetiklenmiyor** — veri
  kaynağı eklenene kadar inert.
- **Eşik sayıları (DSÖ %10-enerji, TGK/PAHO sodyum, FSA bantları) bir
  diyetisyen/beslenme uzmanı tarafından TGK Beslenme Beyanları
  Yönetmeliği'nin tam metnine karşı doğrulanmadı** — bu ADR'de atıf verilen
  kaynaklar genel kılavuz düzeyindedir, resmi TR mevzuat metninden
  birebir alınmamıştır (ADR-004'teki `TR_ALLERGEN_SYNONYMS` için önerilen
  uzman incelemesiyle aynı ilke). **Bu kural seti geniş kullanıcı kitlesine
  açılmadan önce diyetisyen/beslenme uzmanı incelemesi gerekir.**

## Doğrulama

- Mevcut 31 riskEngine senaryosu değişmeden (bit-bit aynı kod listesi)
  geçmeye devam ediyor — yeni eşik mantığı, `trafficLight.value` fallback'i
  sayesinde eski senaryoların sayısal girdileriyle aynı sonucu üretiyor.
- 21 yeni senaryo (scenario-32..52): her kural için eşiğin altı/üstü,
  enerji-yok fallback'in altı/üstü, veri-yok durumu; bir trans-yağ kod-yolu
  testi; 5 gerçek katalog ürünü (Nutella, Trabzon tereyağı, Sivri Bamya,
  Nefis Ayran, TOBLERONE); kronik eşik eşleşmesinin bir allerjen eşleşmesini
  hiç hafifletmediğini/geciktirmediğini kanıtlayan bir senaryo.
- Toplam 52/52 senaryo yeşil. Mobil `tsc`, `betaWordingGuard`, backend
  `npm run check` + `npm run smoke` (tam paket) yeşil.

## Consequences

Diyabet/hipertansiyon/kalp-damar-kolesterol uyarıları artık yerel TR
katalog verisiyle gerçekten çalışıyor (önceden `trafficLight: null`
sabitlendiği için hiç tetiklenmiyorlardı). Eşik hesaplaması ham veriye
dayandığından, kapsam genişletmesi (ör. sıvı-özel bantlar, serbest şeker
ayrımı, trans yağ verisi) gelecekte bu ADR'nin sınırlar bölümünü güncelleyen
ayrı görevlerle yapılabilir; sözleşme (`nutrition100g`+`basis`) bunu
öngörecek şekilde tasarlandı.
