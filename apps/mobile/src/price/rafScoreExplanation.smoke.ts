/**
 * Cihaz testi 1 Ekim, madde 6b: "Puan şeffaflığı". Eski
 * getRafScoreExplanationItems, reasonItems ile componentItems'ı aynı 5
 * maddelik listede paylaştırıyordu — reasonItems 5 maddeyi doldurduğunda
 * (sık rastlanan bir durum) sayısal boyut dökümü HİÇ görünmüyordu. Bu test,
 * getRafScoreComponentBreakdownText'in reasons'tan BAĞIMSIZ, HER ZAMAN tam
 * (4 boyutun tamamını içeren) bir satır ürettiğini doğrular.
 */
import assert from 'node:assert/strict';

import {
  getRafScoreComponentBreakdownText,
  getRafScoreExplanationItems,
  getRafScorePositiveItems,
} from './rafScoreExplanation';
import type { PriceResolveResponse, RafScoreReason, RafScoreResult } from './types';

function buildRafScore(overrides: Partial<RafScoreResult> = {}): RafScoreResult {
  return {
    score: 67,
    status: 'partial',
    confidence: 'low',
    weights: { price: 35, health: 30, content: 20, sustainability: 15 },
    components: [
      { key: 'price', label: 'Fiyat', score: null, weight: 35, isAvailable: false },
      { key: 'health', label: 'Saglik', score: 20, weight: 30, isAvailable: true },
      { key: 'content', label: 'Icerik/Alerjen', score: 83, weight: 20, isAvailable: true },
      { key: 'sustainability', label: 'Surdurulebilirlik', score: 45, weight: 15, isAvailable: true },
    ],
    explanations: [],
    disclaimer: '',
    ...overrides,
  };
}

assert.equal(getRafScoreComponentBreakdownText(null), null);
assert.equal(getRafScoreComponentBreakdownText(undefined), null);

const breakdown = getRafScoreComponentBreakdownText(buildRafScore());
assert.equal(breakdown, 'Sağlık 20 · İçerik ve alerjen 83 · Sürdürülebilirlik 45 · Fiyat: veri yok');

// Madde 6, kanıt senaryosu: Baldo Pirinç benzeri — sağlık/içerik/sürdürülebilirlik
// ikisi de VERİ YOK olsa (yalnız sürdürülebilirlik varsa) bile dörtü de tam listelenmeli.
const sparse = getRafScoreComponentBreakdownText(
  buildRafScore({
    components: [
      { key: 'price', label: 'Fiyat', score: null, weight: 35, isAvailable: false },
      { key: 'health', label: 'Saglik', score: null, weight: 30, isAvailable: false },
      { key: 'content', label: 'Icerik/Alerjen', score: null, weight: 20, isAvailable: false },
      { key: 'sustainability', label: 'Surdurulebilirlik', score: 50, weight: 15, isAvailable: true },
    ],
  }),
);
assert.equal(sparse, 'Sağlık: veri yok · İçerik ve alerjen: veri yok · Sürdürülebilirlik 50 · Fiyat: veri yok');

// Cihaz testi: backend'in reason.params.label alanı ham/iç bir etiket
// ("Icerik/Alerjen") olsa bile, componentKey varsa HER ZAMAN bu dosyanın
// insan-okur haritalamasına (getRafScoreComponentLabel) düşülür — ham
// jargon kullanıcıya hiç gösterilmez.
function buildReason(overrides: Partial<RafScoreReason>): RafScoreReason {
  return {
    code: 'content_high_score',
    category: 'content',
    severity: 'positive',
    params: { componentKey: 'content', label: 'Icerik/Alerjen', score: 85 },
    ...overrides,
  };
}

function buildPriceResult(reasons: RafScoreReason[]): PriceResolveResponse['result'] {
  return {
    productName: 'Test Ürünü',
    marketName: 'Test Market',
    price: null,
    currency: 'TRY',
    source: null,
    status: 'unavailable',
    updatedAt: '2026-06-19T09:00:00.000Z',
    confidence: 0.5,
    rafScore: { ...buildRafScore(), reasons },
  };
}

{
  const positiveItems = getRafScorePositiveItems(buildPriceResult([buildReason({})]));
  assert.equal(positiveItems.length, 1);
  assert.ok(
    positiveItems[0].includes('İçerik ve alerjen'),
    `insan-okur etiket kullanılmalı: "${positiveItems[0]}"`,
  );
  assert.ok(!positiveItems[0].includes('Icerik/Alerjen'), 'ham jargon hiç görünmemeli');
  assert.ok(!positiveItems[0].includes('İçerik/Alerjen'), 'ham jargon (slash biçimi) hiç görünmemeli');
}

// P2 invariant: profille çakışan alerjen varken "İçerik ve alerjen açısından
// ürün iyi durumda" gibi çelişkili bir cümle HİÇ gösterilmez.
{
  const priceResult = buildPriceResult([buildReason({})]);
  const suppressed = getRafScorePositiveItems(priceResult, { hasAllergenConflict: true });
  assert.deepEqual(suppressed, [], 'çakışma varken content kategorisindeki olumlu cümle gösterilmemeli');

  const notSuppressed = getRafScorePositiveItems(priceResult, { hasAllergenConflict: false });
  assert.equal(notSuppressed.length, 1, 'çakışma yoksa olumlu cümle normal şekilde gösterilmeli');
}

{
  const explanationItems = getRafScoreExplanationItems(buildPriceResult([buildReason({})]));
  assert.ok(
    explanationItems.every((item) => !item.includes('Icerik/Alerjen') && !item.includes('İçerik/Alerjen')),
    'genel açıklama listesinde de ham jargon hiç görünmemeli',
  );
}

console.log('RAF_SCORE_EXPLANATION_SMOKE_OK');
