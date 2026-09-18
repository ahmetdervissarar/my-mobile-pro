/**
 * RafSkoru — Canlı OFF denemesinden KAYDEDİLMİŞ kanıt (araştırma, 2026-09-18).
 * src/localProduct/resolution/recordedEvidence.ts
 *
 * Kaynak: docs/research/evidence/off-content-resolution-2026-09-18.live.json (GET
 * world.openfoodfacts.org/api/v2/product/{gtin}.json). Uydurma DEĞİLDİR; backend OFF adapter
 * kurallarıyla (`openFoodFactsAdapter.ts`: allergenInfo yalnız etiket varsa `present`; eksik alan →
 * `partial`) mobil `ProductFactsWire` biçimine aktarılmıştır. Yalnız senaryo koşucusu kullanır;
 * ekrana ürün verisi olarak GİRMEZ. İçerik metinleri kısaltılmadan alınmadı; yalnız yapılandırılmış
 * alanlar (etiketler, skorlar, durum) korunur — bu dosya OFF'un kopyası değildir (ODbL atfı: Open
 * Food Facts, https://openfoodfacts.org).
 */

import type { ProductFactsWire } from '../types';

export const RECORDED_EVIDENCE_MEASURED_AT = '2026-09-18';
export const RECORDED_EVIDENCE_SOURCE = 'docs/research/evidence/off-content-resolution-2026-09-18.live.json';

/** 8690504121336 — Ülker Çokokrem 400 g: içerik+alerjen+Nutri-Score var, NOVA ve iz etiketi YOK → kısmi. */
export const recordedCokokremPartial: ProductFactsWire = {
  barcode: '8690504121336',
  productName: 'Ülker Çokokrem 400 G',
  imageUrl: 'https://images.openfoodfacts.org/recorded/8690504121336/front',
  ingredientsText: '[kaydedilmiş OFF içerik metni — kısaltıldı]',
  allergens: ['milk', 'nuts', 'soybeans'],
  traceAllergens: [],
  allergenInfo: { dataStatus: 'present', declaredAllergens: ['milk', 'nuts', 'soybeans'], traceAllergens: [], source: 'off_structured' },
  additives: [],
  nutriScoreGrade: 'E',
  novaGroup: null,
  trafficLight: { sugar: 'high', salt: 'low', saturatedFat: 'high', fat: 'high' },
  dataSource: 'off',
  isComplete: false,
  completeness: 'partial',
  capabilities: { risk: true, health: true, content: true },
  missingFields: ['novaGroup'],
  confidence: 'medium',
  sourceUrl: 'https://world.openfoodfacts.org/product/8690504121336',
  observedAt: '2026-09-18T19:40:00.000Z',
};

/** 8690504034506 — Ülker Albeni 40 g: 10/10 alan; declared gluten/milk/nuts/soybeans, trace gluten/nuts. */
export const recordedAlbeniComplete: ProductFactsWire = {
  barcode: '8690504034506',
  productName: 'Albeni',
  imageUrl: 'https://images.openfoodfacts.org/recorded/8690504034506/front',
  ingredientsText: '[kaydedilmiş OFF içerik metni — kısaltıldı]',
  allergens: ['gluten', 'milk', 'nuts', 'soybeans'],
  traceAllergens: ['gluten', 'nuts'],
  allergenInfo: { dataStatus: 'present', declaredAllergens: ['gluten', 'milk', 'nuts', 'soybeans'], traceAllergens: ['gluten', 'nuts'], source: 'off_structured' },
  additives: [],
  nutriScoreGrade: 'E',
  novaGroup: 4,
  trafficLight: { sugar: 'high', salt: 'medium', saturatedFat: 'high', fat: 'high' },
  dataSource: 'off',
  isComplete: true,
  completeness: 'complete',
  capabilities: { risk: true, health: true, content: true },
  missingFields: [],
  confidence: 'high',
  sourceUrl: 'https://world.openfoodfacts.org/product/8690504034506',
  observedAt: '2026-09-18T19:40:00.000Z',
};

/** 8683347030866 — wefood Glutensiz Karabuğday Patlağı 100 g: alerjen VE iz etiketi boş → beyan `absent` (negatif kanıt değil). */
export const recordedWefoodNoAllergenTags: ProductFactsWire = {
  barcode: '8683347030866',
  productName: 'Glutensiz Karabuğday Patlağı',
  imageUrl: 'https://images.openfoodfacts.org/recorded/8683347030866/front',
  ingredientsText: '[kaydedilmiş OFF içerik metni — kısaltıldı]',
  allergens: [],
  traceAllergens: [],
  allergenInfo: { dataStatus: 'unknown', declaredAllergens: [], traceAllergens: [], source: 'none' },
  additives: [],
  nutriScoreGrade: 'B',
  novaGroup: 3,
  trafficLight: { sugar: 'low', salt: 'low', saturatedFat: 'low', fat: 'medium' },
  dataSource: 'off',
  isComplete: false,
  completeness: 'partial',
  capabilities: { risk: false, health: true, content: true },
  missingFields: ['allergens'],
  confidence: 'medium',
  sourceUrl: 'https://world.openfoodfacts.org/product/8683347030866',
  observedAt: '2026-09-18T19:40:00.000Z',
};

/** 8682815041403 — OFF 404 ("product found with a different product type: product None"): gıda kaydı YOK. */
export const RECORDED_NOT_FOUND_GTIN = '8682815041403';

/** 8691381000486 — negatif kontrol; kimlik yalnız OFF yanıtından: Beypazarı Doğal Maden Suyu 200 ml, alerjen etiketi yok. */
export const RECORDED_NEGATIVE_CONTROL = { gtin: '8691381000486', productName: 'Beypazarı Doğal Maden Suyu', allergensTags: [] as string[] };

/** v2 search (brands_tags=torku, countries_tags=en:turkey) örneklemi — barkodsuz ADAY gürültüsü gerçek: ad yok, marka küçük harf, "120gr". */
export const recordedTorkuSearchSample = [
  { code: '8680181051347', product_name: 'Nefis Ayran', brands: 'Torku', quantity: '2l' },
  { code: '8680181051392', product_name: 'Yarım Yağlı Taze Lor Peyniri', brands: 'Torku', quantity: null },
  { code: '8690120093932', product_name: null, brands: 'Torku', quantity: null },
  { code: '8690120138725', product_name: 'tortu tam kraker', brands: 'torku', quantity: '120gr' },
] as const;
