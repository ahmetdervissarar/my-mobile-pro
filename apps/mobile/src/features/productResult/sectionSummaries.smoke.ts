import assert from 'node:assert/strict';

import {
  getAlternativesSummary,
  getAttentionSummary,
  getDataSourceSummary,
  getIngredientsSummary,
  getNutritionSummary,
  getPriceSummary,
} from './sectionSummaries';

assert.equal(getIngredientsSummary(null), 'Veri yok');
assert.equal(getIngredientsSummary('  '), 'Veri yok');
assert.equal(getIngredientsSummary('süt, şeker'), null);

assert.equal(getNutritionSummary(false), 'Veri yok');
assert.equal(getNutritionSummary(true), null);

assert.equal(getAttentionSummary(0, 0), 'Yok');
assert.equal(getAttentionSummary(2, 0), '2 uyarı');
assert.equal(getAttentionSummary(0, 3), 'Olumlu');
assert.equal(getAttentionSummary(1, 1), '1 uyarı');
assert.equal(getAttentionSummary(0, 0, 2), 'Katkı maddesi');
assert.equal(getAttentionSummary(0, 0, 0), 'Yok');

assert.equal(getDataSourceSummary('Orta', false), 'Orta');
assert.equal(getDataSourceSummary('Orta', true), 'Eksik');
assert.equal(getDataSourceSummary(null, false), null);

assert.equal(getPriceSummary(false, true), 'Yükleniyor');
assert.equal(getPriceSummary(false, false), 'Veri yok');
assert.equal(getPriceSummary(true, false), null);

assert.equal(getAlternativesSummary(false), 'Yok');
assert.equal(getAlternativesSummary(true), null);

console.log('SECTION_SUMMARIES_SMOKE_OK');
