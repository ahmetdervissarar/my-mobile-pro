import assert from 'node:assert/strict';

import {
  getAlternativesSummary,
  getAttentionSummary,
  getDataSourceSummary,
  getEmptySectionsSummaryLine,
  getIngredientsSummary,
  getNutritionSummary,
  getPriceSummary,
  isPriceSectionVisible,
} from './sectionSummaries';

assert.equal(getIngredientsSummary(null), 'Veri yok');
assert.equal(getIngredientsSummary('  '), 'Veri yok');
assert.equal(getIngredientsSummary('süt, şeker'), null);

assert.equal(getNutritionSummary(false), 'Veri yok');
assert.equal(getNutritionSummary(true), null);

// Madde 7 (cihaz testi 1 Ekim): özet yalnız uyarı sayısı veya "Yok" — olumlu
// yön/katkı maddesi sayısı başlık özetini ETKİLEMEZ (anlamsız "Olumlu" kaldırıldı).
assert.equal(getAttentionSummary(0), 'Yok');
assert.equal(getAttentionSummary(2), '2 uyarı');
assert.equal(getAttentionSummary(1), '1 uyarı');

assert.equal(getDataSourceSummary('Orta', false), 'Orta');
assert.equal(getDataSourceSummary('Orta', true), 'Eksik');
assert.equal(getDataSourceSummary(null, false), null);

assert.equal(getPriceSummary(false, true), 'Yükleniyor');
assert.equal(getPriceSummary(false, false), 'Veri yok');
assert.equal(getPriceSummary(true, false), null);

assert.equal(getAlternativesSummary(0), null);
assert.equal(getAlternativesSummary(3), '3 seçenek');

// ── İş 1 (feat/ui-clarity, görev onayı): fiyat yüklenirken henüz "veri
// yok" sayılmaz — sonuç gelmeden bölüm yanlışlıkla gizlenmesin. ──────────
assert.equal(isPriceSectionVisible({ hasPrice: false, isPriceLoading: true }), true);
assert.equal(isPriceSectionVisible({ hasPrice: false, isPriceLoading: false }), false);
assert.equal(isPriceSectionVisible({ hasPrice: true, isPriceLoading: false }), true);

assert.equal(
  getEmptySectionsSummaryLine({ hasIngredients: true, hasNutrition: true, hasPrice: true, isPriceLoading: false }),
  null,
  'hiçbir konu eksik değilse özet satırı hiç gösterilmemeli',
);
assert.equal(
  getEmptySectionsSummaryLine({ hasIngredients: false, hasNutrition: false, hasPrice: false, isPriceLoading: false }),
  '3 konuda veri yok: içindekiler, besin değerleri, fiyat',
);
assert.equal(
  getEmptySectionsSummaryLine({ hasIngredients: true, hasNutrition: false, hasPrice: true, isPriceLoading: false }),
  '1 konuda veri yok: besin değerleri',
);
assert.equal(
  getEmptySectionsSummaryLine({ hasIngredients: true, hasNutrition: true, hasPrice: false, isPriceLoading: true }),
  null,
  'fiyat yükleniyorken eksik sayılmamalı',
);

console.log('SECTION_SUMMARIES_SMOKE_OK');
