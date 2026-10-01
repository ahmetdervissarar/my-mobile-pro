/**
 * Genel kural testi (görev koşulu 2, madde 6): sağlık skoru bileşenlerinin
 * HİÇBİRİ veri yokluğunu iyi bir değer olarak yorumlamamalı. Her bileşen
 * (Nutri-Score, NOVA, Traffic Light) için: veri yok → bileşen null/hariç,
 * iyi değer → yüksek katkı; ikisi aynı puanı üretmez.
 */
import assert from 'node:assert/strict';

import { calculateHealthScore } from './healthScoreCalculator.js';

// ── Nutri-Score ──────────────────────────────────────────────────────────
const noNutriScore = calculateHealthScore({ nutriScoreGrade: null, novaGroup: 2, trafficLight: null });
const goodNutriScore = calculateHealthScore({ nutriScoreGrade: 'A', novaGroup: 2, trafficLight: null });

assert.equal(noNutriScore.factors.nutriScore, 0, 'nutriScoreGrade yoksa factors.nutriScore 0 (gösterim amaçlı, hesaba katılmaz)');
assert.notEqual(noNutriScore.score, goodNutriScore.score);
assert.ok((goodNutriScore.score ?? 0) > (noNutriScore.score ?? 0), 'bilinen A notu, veri yokluğundan daha yüksek puan vermeli');

// ── NOVA ─────────────────────────────────────────────────────────────────
const noNova = calculateHealthScore({ nutriScoreGrade: 'B', novaGroup: null, trafficLight: null });
const goodNova = calculateHealthScore({ nutriScoreGrade: 'B', novaGroup: 1, trafficLight: null });

assert.notEqual(noNova.score, goodNova.score);
assert.ok((goodNova.score ?? 0) > (noNova.score ?? 0), 'bilinen NOVA 1 (az işlenmiş), veri yokluğundan daha yüksek puan vermeli');

// ── Traffic Light ────────────────────────────────────────────────────────
const noTrafficLight = calculateHealthScore({ nutriScoreGrade: 'B', novaGroup: 2, trafficLight: null });
const goodTrafficLight = calculateHealthScore({
  nutriScoreGrade: 'B',
  novaGroup: 2,
  trafficLight: { sugar: 'low', salt: 'low', saturatedFat: 'low', fat: 'low' },
});

assert.notEqual(noTrafficLight.score, goodTrafficLight.score);
assert.ok(
  (goodTrafficLight.score ?? 0) > (noTrafficLight.score ?? 0),
  'bilinen düşük (iyi) Traffic Light değerleri, veri yokluğundan daha yüksek puan vermeli',
);

// ── Hiçbir veri yoksa puan null kalır (en iyi değerle KARIŞTIRILMAZ) ──────
const unavailable = calculateHealthScore({ nutriScoreGrade: null, novaGroup: null, trafficLight: null });
assert.equal(unavailable.score, null);
assert.equal(unavailable.status, 'unavailable');

console.log('HEALTH_SCORE_CALCULATOR_SMOKE_OK');
