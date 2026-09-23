# ADR-005: Kronik Durum Uyarıları v1 Kapsamı — Diyabet, Hipertansiyon, Kalp-damar/Kolesterol

Date: 2026-09-23
Status: Accepted

## Context

`feat/chronic-conditions` dalında yapılan salt-okunur denetim (bkz. dal geçmişindeki
8 maddelik rapor) şunları ortaya çıkardı:

- `UserSensitivityProfile.chronicSensitivities` (`userProfileTypes.ts:29-35`) 6 anahtar
  tanımlıyor: `blood_sugar_diabetes`, `hypertension_sodium`, `cardiovascular`,
  `celiac_gluten`, `kidney_sensitivity`, `cholesterol_saturated_fat`.
- `celiac_gluten` riskEngine.ts'te hiç geçmiyor; gluten hassasiyeti zaten ayrı bir
  allerjen anahtarı (`allergens.gluten_wheat`, `riskEngine.ts:580-594`) üzerinden
  kapsanıyor.
- `kidney_sensitivity`'nin tek sinyali Traffic Light tuz seviyesidir
  (`PROFILE_KIDNEY_SALT_SENSITIVITY`, `riskEngine.ts:839-854`) — ve bu sinyal yerel
  TR katalog verisinde bugün hiç ulaşmıyor: `productFactsFromCatalog`
  (`catalogAdapter.ts:68`) `trafficLight`'ı sabit `null` döndürüyor, çünkü
  `buildCatalogProduct` (`catalog.ts:284-323`) `nutrition100g`'i yalnız Nutri-Score
  hesabında kullanıyor, `CatalogProduct` arayüzüne (`catalog.ts:73-89`) hiç taşımıyor.
- Ne OFF-TR JSONL şeması (`normalize.ts:49`, `NutrientKey`: energyKcal / fat /
  saturatedFat / carbohydrates / sugars / fiber / proteins / salt) ne de
  `ProductFacts.trafficLight` (`productFacts/types.ts:34-39`: sugar / salt /
  saturatedFat / fat) fosfor veya potasyum alanı taşıyor.

Eşik tablosu ve kural tasarımına geçmeden önce, v1'in hangi kronik anahtarları
gerçek bir tasarımla kapsayacağına karar vermek gerekiyordu.

## Decision

v1 kapsamı yalnızca üç kronik grup ile sınırlandırıldı:

1. `blood_sugar_diabetes` (kan şekeri / diyabet)
2. `hypertension_sodium` (hipertansiyon / sodyum)
3. `cardiovascular` ve `cholesterol_saturated_fat` (ortak doymuş-yağ sinyali
   üzerinden, mevcut `PROFILE_SATURATED_FAT_SENSITIVITY` kuralında olduğu gibi)

`celiac_gluten` için ayrı bir chronic kural tasarlanmayacak; mevcut
`allergens.gluten_wheat` eşleşmesi bu ihtiyacı zaten karşıladığı kabul edildi.

`kidney_sensitivity` bu sürümde **kapsam dışıdır**.

## Kapsam dışı: kidney_sensitivity — gerekçe

- Böbrek hassasiyetinde klinik olarak belirleyici olan fosfor ve potasyum
  **miktarıdır**. RafSkoru'nun veri sözleşmesinin hiçbir katmanında (OFF-TR JSONL,
  `ProductFacts`, `CatalogProduct`) bu iki besin öğesi taşınmıyor — ekleyecek veri
  kaynağı yok.
- Katkı maddesi tespiti (`hasAdditives` / `additives[]`) yalnızca ikili bir
  "içeriyor / içermiyor" sinyalidir, miktar taşımaz. "Fosfat katkısı var" tespiti
  bile böbrek hassasiyeti için tek başına yetersizdir; doz bilinmeden bir risk
  seviyesi (medium/high) atamak, elimizde olmayan bir miktar bilgisini ima eder.
- ADR-004'te benimsenen ilke burada da geçerli: eksik veriyi "güvenli" ya da
  ölçülü bir "risk seviyesi" gibi göstermek yanlış güven yaratır. Miktar iddiası
  taşıyamayan bir sinyalden seviyeli bir tıbbi-benzeri uyarı üretmemek tercih
  edildi.
- `kidney_sensitivity` anahtarı `userProfileTypes.ts`'ten ve profil ekranından
  KALDIRILMADI — kullanıcı seçebilmeye devam ediyor. Yalnızca v1 riskEngine
  tasarımı ona özel yeni bir kural eklemeyecek. Bu, "seçilebilir ama şimdilik
  sessiz" bilinen bir ara durumdur.

## İkinci aşama adayı (bu görevin kapsamında değil)

Böbrek hassasiyeti için, miktar iddiası taşımayan **nötr bir katkı-maddesi bilgi
notu** ikinci aşama adayı olarak işaretlendi: örn. "Bu üründe fosfat bazlı katkı
maddesi bulunabilir" türünde, seviye/skor üretmeyen, salt bilgilendirici bir not.
Bu not:

- bir risk seviyesi (`low`/`medium`/`high`) TAŞIMAMALI,
- hangi katkı kodlarının "fosfat bazlı" sayılacağını belirleyen liste ve uyarı
  metni bir diyetisyen/beslenme uzmanı incelemesinden geçmeden UYGULANMAMALI —
  ADR-004'ün `TR_ALLERGEN_SYNONYMS` için önerdiği uzman incelemesi ile aynı ilke.

## Consequences

Eşik tablosu ve kural tasarımı yalnızca diyabet, hipertansiyon ve
kalp-damar/kolesterol için yapılacak. `kidney_sensitivity` kullanıcıya görünür
kalmaya devam eder ama v1'de hiçbir ürün için ek uyarı üretmez; bu ADR, seçeneğin
UI'dan geçici olarak gizlenip gizlenmeyeceğine dair bir karar VERMEZ — o ayrı bir
karardır. `celiac_gluten` için de yeni bir chronic kural eklenmeyecek; mevcut
gluten allerjen eşleşmesi yeterli kabul edildi.
