/**
 * Cihaz testi 1 Ekim, madde 4 ("aynı ürün için liste puanı = ürün sayfası
 * puanı"): backend tarafı suggestionRafScoreParity.smoke.ts ile doğrulanıyor
 * (aynı calculateRafScore çağrısı). Bu test, mobil SUNUM katmanının da aynı
 * RafScoreResult'tan arama kartı (getSearchCardBadge) ve ürün sayfası
 * göstergesi (getRafScoreIndicator) için TUTARLI metin/değer ürettiğini
 * doğrular — ikisi de aynı paylaşılan isRafScorePriceless + sayısal puanı
 * kullanır, ayrı ayrı karar ÜRETMEZ.
 */
import assert from 'node:assert/strict';

import { getRafScoreIndicator } from '../features/productResult/indicatorTrio';
import { getSearchCardBadge } from '../features/search/searchCardPresentation';
import { isRafScorePriceless } from './rafScorePriceless';
import type { RafScoreResult } from './types';

function buildRafScore(score: number | null, priceAvailable: boolean): RafScoreResult {
  return {
    score,
    status: score === null ? 'unavailable' : 'partial',
    confidence: 'medium',
    weights: { price: 35, health: 30, content: 20, sustainability: 15 },
    components: [
      { key: 'price', label: 'Fiyat', score: null, weight: 35, isAvailable: priceAvailable },
      { key: 'health', label: 'Sağlık', score: 80, weight: 30, isAvailable: true },
      { key: 'content', label: 'İçerik/Alerjen', score: 70, weight: 20, isAvailable: true },
      { key: 'sustainability', label: 'Sürdürülebilirlik', score: 50, weight: 15, isAvailable: true },
    ],
    explanations: [],
    disclaimer: '',
  };
}

for (const rafScore of [buildRafScore(72, false), buildRafScore(45, true), buildRafScore(null, false)]) {
  const priceless = isRafScorePriceless(rafScore);
  const badge = getSearchCardBadge({ tone: 'neutral', text: 'Beyanda yok' }, rafScore);
  const indicator = getRafScoreIndicator(rafScore.score, false, priceless);

  if (rafScore.score === null) {
    assert.equal(badge.text, 'Puan: Veri yok');
    assert.equal(indicator.value, '—');
    continue;
  }

  // İkisi de AYNI sayısal puanı göstermeli.
  assert.ok(badge.text.includes(String(Math.round(rafScore.score))), `arama rozeti puanı içermeli: "${badge.text}"`);
  assert.equal(indicator.value, String(Math.round(rafScore.score)));

  // İkisi de AYNI "fiyatsız" durumunu yansıtmalı.
  assert.equal(badge.text.includes('fiyatsız'), priceless, `arama rozeti fiyatsızlık durumuyla tutarlı olmalı: "${badge.text}"`);
  assert.equal(indicator.statusText === 'Fiyatsız değerlendirme', priceless);
}

console.log('RAF_SCORE_CROSS_SCREEN_CONSISTENCY_SMOKE_OK');
