/**
 * Fiyatsiz degerlendirme (onayli KARAR, 1 Ekim cihaz testi):
 * Fiyat eksikse de saglik/icerik mevcutsa genel RafSkoru renormalize
 * edilerek hesaplanir; saglik VE icerik ikisi birden eksikse puan
 * hesaplanmaz. Alerjen cakismasi kurali (skor yerine uyari oncelikli
 * gosterim) mobil tarafta ScorePill/indicatorTrio seviyesinde uygulanir —
 * bu dosya yalniz backend hesaplamasini dogrular.
 */
import assert from 'node:assert/strict';

import { calculateRafScore } from './rafScoreCalculator.js';

// Fiyat yok + saglik/icerik var -> puan uretilir.
const withHealthAndContent = calculateRafScore({
  priceScore: null,
  healthScore: 80,
  contentScore: 60,
  sustainabilityScore: null,
});

assert.equal(withHealthAndContent.status, 'partial');
assert.equal(typeof withHealthAndContent.score, 'number');
// Renormalize: (80*30 + 60*20) / (30+20) = 72
assert.equal(withHealthAndContent.score, 72);

const withOnlyHealth = calculateRafScore({
  priceScore: null,
  healthScore: 80,
  contentScore: null,
  sustainabilityScore: null,
});

assert.equal(typeof withOnlyHealth.score, 'number');
assert.equal(withOnlyHealth.score, 80);

const withOnlyContent = calculateRafScore({
  priceScore: null,
  healthScore: null,
  contentScore: 60,
  sustainabilityScore: null,
});

assert.equal(typeof withOnlyContent.score, 'number');
assert.equal(withOnlyContent.score, 60);

// Saglik VE icerik ikisi de yok (yalniz surdurulebilirlik var) -> "Veri yetersiz".
const withoutHealthOrContent = calculateRafScore({
  priceScore: null,
  healthScore: null,
  contentScore: null,
  sustainabilityScore: 70,
});

assert.equal(withoutHealthOrContent.score, null);
assert.equal(withoutHealthOrContent.status, 'partial');

// Hicbir bilesen yok -> 'unavailable', puan null.
const unavailable = calculateRafScore({
  priceScore: null,
  healthScore: null,
  contentScore: null,
  sustainabilityScore: null,
});

assert.equal(unavailable.status, 'unavailable');
assert.equal(unavailable.score, null);

// Tum bilesenler mevcutsa (ready) davranis degismez.
const ready = calculateRafScore({
  priceScore: 90,
  healthScore: 80,
  contentScore: 70,
  sustainabilityScore: 60,
});

assert.equal(ready.status, 'ready');
assert.equal(ready.score, Math.round(90 * 0.35 + 80 * 0.3 + 70 * 0.2 + 60 * 0.15));

console.log('RAF_SCORE_CALCULATOR_SMOKE_OK');
