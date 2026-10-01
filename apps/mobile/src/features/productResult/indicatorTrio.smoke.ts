/**
 * RafSkoru — Üç küçük gösterge karar mantığı testi
 * src/features/productResult/indicatorTrio.smoke.ts
 */
import assert from 'node:assert/strict';

import { getNovaIndicator, getNutriScoreIndicator, getRafScoreIndicator } from './indicatorTrio';

// ── RafSkoru: puan yok → "—" + "Veri yetersiz" (büyük halka YOK) ──────────
assert.deepEqual(getRafScoreIndicator(null, false), {
  label: 'RafSkoru',
  value: '—',
  colorToken: 'muted',
  statusText: 'Veri yetersiz',
});

// ── RafSkoru: profil çakışması → hüküm kelimesi YERİNE öncelik metni ───────
assert.deepEqual(getRafScoreIndicator(82, true), {
  label: 'RafSkoru',
  value: '—',
  colorToken: 'muted',
  statusText: 'Alerjen uyarısı öncelikli',
});

// ── RafSkoru: normal puan → bant rengi + etiketi ───────────────────────────
assert.deepEqual(getRafScoreIndicator(82, false), {
  label: 'RafSkoru',
  value: '82',
  colorToken: 'leaf',
  statusText: 'Çok iyi',
});
assert.equal(getRafScoreIndicator(10, false).colorToken, 'danger');

// ── Nutri-Score: grade yok → "—" + "Veri yetersiz" ─────────────────────────
assert.deepEqual(getNutriScoreIndicator(null), {
  label: 'Nutri-Score',
  value: '—',
  colorToken: 'muted',
  statusText: 'Veri yetersiz',
});
assert.equal(getNutriScoreIndicator('A').colorToken, 'leaf');
assert.equal(getNutriScoreIndicator('E').colorToken, 'danger');

// ── NOVA: grup yok → "—" + "Veri yetersiz" ─────────────────────────────────
assert.deepEqual(getNovaIndicator(null), {
  label: 'İşlenmişlik',
  value: '—',
  colorToken: 'muted',
  statusText: 'Veri yetersiz',
});
assert.equal(getNovaIndicator(4).colorToken, 'danger');
assert.equal(getNovaIndicator(1).colorToken, 'leaf');

console.log('INDICATOR_TRIO_SMOKE_OK');
