/**
 * Genel kural testi (görev koşulu 2, madde 6): sürdürülebilirlik skoru
 * diğer iki hesaplayıcıdan FARKLI bir modeldir — asla null dönmez, bilinmeyen
 * alanlar için NÖTR (0) bir etki kullanır (rules.ts: PACKAGING_EFFECTS.unknown
 * = 0 vb.). Bu test, "unknown" değerinin asla EN İYİ (pozitif) etkiyle aynı
 * sonucu üretmediğini ve nötr kaldığını doğrular — veri yokluğu iyi bir
 * değerle karıştırılmıyor.
 */
import assert from 'node:assert/strict';

import { calculateSustainabilityScore } from './sustainabilityScorer.js';

const base = { productName: 'Sürdürülebilirlik Smoke Ürünü', categoryText: 'bilinmeyen kategori metni' };

// ── Paketleme ────────────────────────────────────────────────────────────
const unknownPackaging = calculateSustainabilityScore({ ...base, packaging: 'unknown' });
const goodPackaging = calculateSustainabilityScore({ ...base, packaging: 'carton' });

assert.equal(unknownPackaging.factors.packaging, 0, 'bilinmeyen paketleme NÖTR (0) etki üretmeli — pozitif bir değer DEĞİL');
assert.ok(goodPackaging.factors.packaging > 0);
assert.ok(goodPackaging.score > unknownPackaging.score, 'bilinen iyi paketleme (karton), veri yokluğundan daha yüksek puan vermeli');

// ── İşlenmişlik ──────────────────────────────────────────────────────────
const unknownProcessing = calculateSustainabilityScore({ ...base, processing: 'unknown' });
const goodProcessing = calculateSustainabilityScore({ ...base, processing: 'nova_1' });

assert.equal(unknownProcessing.factors.processing, 0);
assert.ok(goodProcessing.score > unknownProcessing.score);

// ── Orijin ───────────────────────────────────────────────────────────────
const unknownOrigin = calculateSustainabilityScore({ ...base, origin: 'unknown' });
const goodOrigin = calculateSustainabilityScore({ ...base, origin: 'local_domestic' });

assert.equal(unknownOrigin.factors.origin, 0);
assert.ok(goodOrigin.score > unknownOrigin.score);

// ── Eko-skor referansı ───────────────────────────────────────────────────
const unknownEcoScore = calculateSustainabilityScore({ ...base, ecoScore: 'unknown' });
const goodEcoScore = calculateSustainabilityScore({ ...base, ecoScore: 'a' });

assert.equal(unknownEcoScore.factors.ecoScoreReference, 0);
assert.ok(goodEcoScore.score > unknownEcoScore.score);

// ── Hiçbir alan bilinmiyorsa: nötr kategori ortalaması (50), EN İYİ (80+)
// değer DEĞİL, ve güven düzeyi düşük ──────────────────────────────────────
const allUnknown = calculateSustainabilityScore({ productName: undefined, categoryText: undefined });
assert.equal(allUnknown.categoryKey, 'unknown');
assert.equal(allUnknown.score, 50, 'tamamen veri yokken skor nötr (50) olmalı — iyi bir kategorinin (80+) değeriyle KARIŞTIRILMAMALI');
assert.equal(allUnknown.confidence, 'low');
assert.ok(allUnknown.score < goodPackaging.score);

console.log('SUSTAINABILITY_SCORER_SMOKE_OK');
