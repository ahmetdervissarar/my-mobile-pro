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

// 6) Görsel adresi (yol haritası 1.6): API alanı varsa o; dökümde images kaydından üretilir.
{
  const fromApi = normalizeOffProduct({ code: '8690504000013', image_front_url: 'https://x/img.jpg' }, at)!;
  assert.equal(fromApi.imageUrl, 'https://x/img.jpg');
  const fromDump = normalizeOffProduct({
    code: '8690504000013', lang: 'en',
    images: { '1': { sizes: {} }, front_en: { rev: 7, sizes: { '400': {}, full: {} } }, front_tr: { rev: '12', sizes: { '400': {}, full: {} } } },
  }, at)!;
  assert.equal(fromDump.imageUrl, 'https://images.openfoodfacts.org/images/products/869/050/400/0013/front_tr.12.400.jpg');
  assert.ok(!fromDump.missingFields.includes('image'));
  const otherLang = normalizeOffProduct({ code: '8690504000013', lang: 'de', images: { front_de: { rev: 3, sizes: { '200': {} } } } }, at)!;
  assert.equal(otherLang.imageUrl, 'https://images.openfoodfacts.org/images/products/869/050/400/0013/front_de.3.200.jpg');
  const nestedFmt = normalizeOffProduct({ code: '86949705', images: { selected: { front: { tr: { rev: 5, sizes: { '400': {} } } } } } }, at)!;
  assert.equal(nestedFmt.imageUrl, 'https://images.openfoodfacts.org/images/products/86949705/front_tr.5.400.jpg');
  // Biçime uymayan kayıt: tahmin yok, adres üretilmez.
  for (const images of [{ front_tr: { rev: 'x', sizes: { '400': {} } } }, { front_tr: { rev: 4, sizes: { full: {} } } }, { front_tr: 'abc' }, null]) {
    const r = normalizeOffProduct({ code: '8690504000013', images }, at)!;
    assert.equal(r.imageUrl, null);
    assert.ok(r.missingFields.includes('image'));
  }
}
console.log('off-turkey-normalize image_url_OK');

// 7) Yeni besin şeması (nutrition.aggregated_set): eski nutriments boşsa okunur, fail-closed.
{
  const set = (over: Record<string, unknown> = {}, nutrients: Record<string, unknown> = {}) => ({
    aggregated_set: {
      preparation: 'as_sold', per: '100g',
      nutrients: {
        'energy-kcal': { value: 405, source: 'packaging', source_per: '100g', unit: 'kcal' },
        sugars: { value: 0.7, source: 'packaging', source_per: '100g', unit: 'g' },
        'saturated-fat': { value: 2.1, source: 'manufacturer', source_per: '100g', unit: 'g' },
        salt: { value: 1.2, source: 'packaging', source_per: '100g', unit: 'g' },
        fiber: { value: 0, source: 'estimate', modifier: '~', source_per: '100g', unit: 'g' },
        proteins: { value: 0.5, source: 'packaging', modifier: '<', source_per: '100g', unit: 'g' },
        fat: { value: 9.5, source: 'database', source_per: '100g', unit: 'g' },
        ...nutrients,
      },
      ...over,
    },
  });
  const v2 = normalizeOffProduct({ code: '8690504000013', nutriments: {}, nutrition: set() }, at)!;
  assert.equal(v2.nutrition100g.energyKcal, 405);
  assert.equal(v2.nutrition100g.sugars, 0.7);
  assert.equal(v2.nutrition100g.saturatedFat, 2.1);
  assert.equal(v2.nutrition100g.salt, 1.2);
  assert.equal(v2.nutrition100g.fiber, null); // OFF tahmini alınmaz
  assert.equal(v2.nutrition100g.proteins, null); // "<" işaretli değer alınmaz
  assert.equal(v2.nutrition100g.fat, null); // etiket beyanı olmayan kaynak alınmaz
  assert.equal(v2.nutrition100g.carbohydrates, null); // yok → null
  assert.ok(!v2.missingFields.some((f) => f.startsWith('nutrition.')));

  // Eski alan doluysa o kullanılır (0 da geçerli bir değerdir).
  const both = normalizeOffProduct({ code: '8690504000013', nutriments: { 'sugars_100g': 0 }, nutrition: set() }, at)!;
  assert.equal(both.nutrition100g.sugars, 0);
  assert.equal(both.nutrition100g.salt, 1.2);

  // Hazırlanmış ürün, porsiyon başı veya sütunu farklı değer → hiçbiri alınmaz.
  for (const bad of [set({ preparation: 'prepared' }), set({ per: 'serving' }), set({}, { salt: { value: 1.2, source: 'packaging', source_per: 'serving' } })]) {
    const r = normalizeOffProduct({ code: '8690504000013', nutrition: bad }, at)!;
    const salt = r.nutrition100g.salt;
    if ((bad as any).aggregated_set.preparation !== 'as_sold' || (bad as any).aggregated_set.per !== '100g') {
      assert.deepEqual(Object.values(r.nutrition100g), Array(8).fill(null));
    } else {
      assert.equal(salt, null);
    }
  }
  // Biçimsiz veri → null, hata yok.
  for (const junk of [null, 'x', { aggregated_set: null }, { aggregated_set: { preparation: 'as_sold', per: '100g', nutrients: [] } }]) {
    const r = normalizeOffProduct({ code: '8690504000013', nutrition: junk }, at)!;
    assert.equal(r.nutrition100g.energyKcal, null);
  }
}
console.log('off-turkey-normalize new_nutrition_schema_OK');
