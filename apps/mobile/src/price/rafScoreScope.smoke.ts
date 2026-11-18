/**
 * RafSkoru — Puan kapsamı dışındaki ürün ekranda (ADR-009 §11, İş 1.4b)
 * src/price/rafScoreScope.smoke.ts
 *
 * Korunan kurallar:
 *   - kapsam dışı ürün "Veri yetersiz" / "Veri yok" diye değil, "Puan
 *     kapsamında değil" diye gösterilir
 *   - profil alerjen çakışması her zaman puan metninden önce gelir
 *   - alerjen uyarıları (ör. arpa maltından gluten) puan kararından etkilenmez
 */
import assert from 'node:assert/strict';

import { getRafScoreIndicator } from '../features/productResult/indicatorTrio';
import { getSearchCardBadge } from '../features/search/searchCardPresentation';
import { evaluateProductRisks } from '../riskEngine/riskEngine';
import { getRafScoreExplanationItems } from './rafScoreExplanation';
import {
  isRafScoreOutOfScope,
  RAF_SCORE_OUT_OF_SCOPE_EXPLANATION,
  RAF_SCORE_OUT_OF_SCOPE_LABEL,
  RAF_SCORE_OUT_OF_SCOPE_REASON_CODE,
} from './rafScoreScope';
import type { PriceResolveResponse, RafScoreResult } from './types';

const outOfScope: RafScoreResult = {
  score: null,
  status: 'unavailable',
  confidence: 'low',
  weights: { price: 0.25, health: 0.35, content: 0.25, sustainability: 0.15 },
  components: [
    { key: 'price', label: 'Fiyat', score: null, weight: 0.25, isAvailable: false },
    { key: 'health', label: 'Sağlık', score: null, weight: 0.35, isAvailable: false },
    { key: 'content', label: 'İçerik', score: null, weight: 0.25, isAvailable: false },
    { key: 'sustainability', label: 'Sürdürülebilirlik', score: null, weight: 0.15, isAvailable: false },
  ],
  explanations: [],
  reasons: [{ code: RAF_SCORE_OUT_OF_SCOPE_REASON_CODE, category: 'data_quality', severity: 'neutral', params: { scope: 'alcoholic_beverage' } }],
  disclaimer: '',
};
const noData: RafScoreResult = { ...outOfScope, reasons: [{ code: 'raf_score_unavailable', category: 'data_quality', severity: 'warning' }] };

assert.equal(isRafScoreOutOfScope(outOfScope), true);
assert.equal(isRafScoreOutOfScope(noData), false);
assert.equal(isRafScoreOutOfScope(undefined), false);

// ── Ürün sayfası göstergesi ──────────────────────────────────────────────
assert.equal(getRafScoreIndicator(null, false, false, true).statusText, RAF_SCORE_OUT_OF_SCOPE_LABEL);
assert.equal(getRafScoreIndicator(null, false, false, false).statusText, 'Veri yetersiz', 'veri yokluğu ayrı kalmalı');
assert.equal(
  getRafScoreIndicator(null, true, false, true).statusText,
  'Alerjen uyarısı öncelikli',
  'profil alerjen çakışması kapsam metninden önce gelmeli',
);

// ── Arama kartı rozeti ───────────────────────────────────────────────────
assert.deepEqual(getSearchCardBadge({ tone: 'neutral', text: 'Beyanda: Gluten / Buğday' }, outOfScope), {
  isAllergenBadge: false,
  text: `Puan: ${RAF_SCORE_OUT_OF_SCOPE_LABEL}`,
});
assert.equal(
  getSearchCardBadge({ tone: 'danger', text: 'Profilinle çakışıyor: Gluten / Buğday' }, outOfScope).isAllergenBadge,
  true,
  'çakışmada alerjen rozeti öncelikli kalmalı',
);
assert.notEqual(getSearchCardBadge({ tone: 'neutral', text: '' }, noData).text, `Puan: ${RAF_SCORE_OUT_OF_SCOPE_LABEL}`);

// ── Açıklama metni ───────────────────────────────────────────────────────
{
  const items = getRafScoreExplanationItems({ rafScore: outOfScope } as unknown as PriceResolveResponse['result']);
  assert.ok(items.includes(RAF_SCORE_OUT_OF_SCOPE_EXPLANATION), 'kapsam dışı açıklaması gösterilmeli');
  for (const banned of ['güvenli', 'içermez', 'garanti']) {
    assert.ok(!RAF_SCORE_OUT_OF_SCOPE_EXPLANATION.toLocaleLowerCase('tr-TR').includes(banned));
  }
}

// ── Alerjen uyarısı puan kararından bağımsız sürer ───────────────────────
{
  const result = evaluateProductRisks({
    name: 'Bira',
    ingredients: 'Su, arpa maltı, şerbetçiotu, maya',
    allergens: [],
    additives: [],
    novaGroup: null,
    trafficLight: null,
    nutriScore: null,
    userProfile: { allergens: ['gluten_wheat'], chronicSensitivities: [], healthPreferences: [] },
  });
  assert.ok(
    result.warnings.some((warning) => warning.code === 'PROFILE_GLUTEN_ALLERGEN_MATCH'),
    'arpa maltı içeren alkollü içecekte gluten uyarısı üretilmeli',
  );
}

console.log('RAF_SCORE_SCOPE_SMOKE_OK');
