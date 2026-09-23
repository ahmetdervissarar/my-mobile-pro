// P1-6: importOffTurkey.ts'in rapor istatistiği, catalog.ts'in kullandığı AYNI
// paylaşılan sınıflandırmadan (classifyAllergenTags → buildAllergenData) gelmeli
// — normalize.ts'in vestigial dataStatus'una (normalizeOffProduct çıktısı) GÜVENMEMELİ.
// Somut regresyon: etiketsiz (rawDeclared/rawTraces boş) ama içindekiler metni OLAN
// bir ürün, eski yolda yanlışlıkla "not_listed_in_available_data" sayılıyordu; rapor
// artık bunu "unknown_or_unverified" saymalı.
import assert from 'node:assert/strict';

import { buildAllergenData } from '../../catalog/catalog.js';
import { normalizeOffProduct } from './normalize.js';

const at = '2026-09-22T00:00:00.000Z';

// Etiketsiz ürün: içindekiler metni var, allergens_tags/traces_tags YOK.
const untagged = normalizeOffProduct(
  { code: '8690504000013', product_name: 'Su', ingredients_text: 'doğal kaynak suyu' },
  at,
)!;

// Eski (vestigial) normalize.ts dataStatus'u — importOffTurkey.ts ARTIK BUNU KULLANMIYOR,
// yalnız karşıtlığı belgelemek için burada doğrulanır.
assert.equal(
  untagged.allergens.dataStatus,
  'not_listed_in_available_data',
  'normalize.ts dataStatus hâlâ eski 3 durumu üretmeli (bu test onu DEĞİŞTİRMEZ)',
);

// Rapor artık catalog.ts'in paylaşılan sınıflandırmasını kullanıyor — etiketsiz
// ürün unknown_or_unverified sayılmalı, not_listed_in_available_data DEĞİL.
const reportClassification = buildAllergenData(untagged);
assert.equal(
  reportClassification.dataStatus,
  'unknown_or_unverified',
  'etiketsiz ürün raporda unknown_or_unverified sayılmalı, not_listed DEĞİL',
);
assert.notEqual(reportClassification.dataStatus, 'not_listed_in_available_data');

// Karşılaştırma: gerçekten beyan edilmiş bir ürün 'present' kalmalı (regresyon değil).
const declared = normalizeOffProduct(
  { code: '8690504000013', product_name: 'Süt', allergens_tags: ['en:milk'] },
  at,
)!;
assert.equal(buildAllergenData(declared).dataStatus, 'present');

// Hiç veri yok (ne etiket ne içindekiler) → yine unknown_or_unverified.
const bare = normalizeOffProduct({ code: '8690504000013', product_name: 'Bilinmeyen' }, at)!;
assert.equal(buildAllergenData(bare).dataStatus, 'unknown_or_unverified');

console.log('IMPORT_OFF_TURKEY_ALLERGEN_STATS_SMOKE_OK (3 senaryo)');
