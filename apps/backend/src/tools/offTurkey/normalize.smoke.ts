import assert from 'node:assert/strict';
import { isValidGtin, normalizeOffProduct } from './normalize.js';

const at = '2026-09-21T00:00:00.000Z';
assert.equal(isValidGtin('8690504000013'), true);
assert.equal(isValidGtin('8690504000019'), false);
assert.equal(normalizeOffProduct({ code: 'abc' }, at), null);

// 1) Tam veri: alerjen beyanı + iz + Türkçe içerik
const full = normalizeOffProduct({
  code: '8690504000013', product_name_tr: 'Kakaolu Fındık Kreması', brands: 'Örnek, Alt Marka',
  ingredients_text_tr: 'şeker, fındık, süt tozu', allergens_tags: ['en:nuts', 'en:milk'], traces_tags: ['en:peanuts', 'en:eggs', 'en:molluscs'],
  nutrition_grades: 'e', nova_group: 4, image_front_url: 'https://x/img.jpg', last_modified_t: 1757000000,
  nutriments: { 'energy-kcal_100g': 540, 'sugars_100g': 54, 'saturated-fat_100g': 10.6, 'salt_100g': 0.1 },
}, at)!;
assert.deepEqual(full.allergens.declared.sort(), ['milk', 'tree_nuts']);
assert.deepEqual(full.allergens.traces.sort(), ['egg', 'peanut', 'shellfish']); // borç #6: yumurta/kabuklu eşleşmesi
assert.equal(full.allergens.dataStatus, 'present');
assert.equal(full.brand, 'Örnek');
assert.equal(full.ingredientsLang, 'tr');
assert.equal(full.completeness, 'complete');
assert.equal(full.provenance.license, 'ODbL-1.0');

// 2) İçerik var, alerjen etiketi yok → "listelenmemiş", asla "içermez" değil
const nl = normalizeOffProduct({ code: '8690504000013', product_name: 'Su', ingredients_text: 'doğal kaynak suyu' }, at)!;
assert.equal(nl.allergens.dataStatus, 'not_listed_in_available_data');
assert.equal(nl.completeness, 'usable_for_risk');

// 3) Hiç veri yok → fail-closed: unknown, eksik alanlar görünür, kısmi veri ATILMAZ
const bare = normalizeOffProduct({ code: '8690504000013', product_name: 'Bilinmeyen', nutrition_grades: 'unknown', nova_group: '' }, at)!;
assert.equal(bare.allergens.dataStatus, 'unknown_or_unverified');
assert.equal(bare.nutriscoreGrade, null);
assert.equal(bare.novaGroup, null);
assert.ok(bare.missingFields.includes('allergens'));
assert.equal(bare.completeness, 'insufficient');
assert.equal(bare.name, 'Bilinmeyen');

// 4) Negatif/metin besin değeri tahminle doldurulmaz
const neg = normalizeOffProduct({ code: '8690504000013', nutriments: { 'sugars_100g': -3, 'salt_100g': 'abc' } }, at)!;
assert.equal(neg.nutrition100g.sugars, null);
assert.equal(neg.nutrition100g.salt, null);

// 5) P1-8 (device-test bulgusu): nutriscoreGrade VAR ama NOVA ve beslenim
// EKSİK — eskiden 'complete' dönüyordu (→ mobilde "Veri güveni: Yüksek"),
// artık en fazla 'usable_for_risk' (→ "Orta") olmalı; missingFields nova ve
// nutrition.* alanlarını göstermeye devam eder.
const partialHealth = normalizeOffProduct({
  code: '8690504000013', product_name: 'Kısmi Ürün', allergens_tags: ['en:milk'],
  nutrition_grades: 'c',
}, at)!;
assert.notEqual(partialHealth.completeness, 'complete', 'NOVA/beslenim eksikken completeness "complete" OLAMAZ');
assert.equal(partialHealth.completeness, 'usable_for_risk');
assert.ok(partialHealth.missingFields.includes('nova'));
assert.ok(partialHealth.missingFields.some((f) => f.startsWith('nutrition.')));

console.log('offTurkey normalize smoke: 5 senaryo geçti');
