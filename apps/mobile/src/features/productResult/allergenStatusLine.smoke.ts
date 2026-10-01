/**
 * RafSkoru — Alerjen durumu tek satır testi
 * src/features/productResult/allergenStatusLine.smoke.ts
 */
import assert from 'node:assert/strict';

import { getAllergenStatusLine } from './allergenStatusLine';
import type { AllergenBannerData } from './helpers';

function bannerData(overrides: Partial<AllergenBannerData>): AllergenBannerData {
  return {
    status: 'unknown_or_unverified',
    declaredList: [],
    traceList: [],
    criticalMatches: [],
    displayInfo: null,
    perKey: [],
    ...overrides,
  };
}

// ── Profil çakışması → kırmızı, "Profilinle çakışıyor: X" ──────────────────
assert.deepEqual(
  getAllergenStatusLine(
    bannerData({
      status: 'declared_contains',
      declaredList: ['Süt'],
      displayInfo: { level: 'declared', text: 'Süt içerir (beyan)', otherLabels: [], isConflict: true },
    }),
  ),
  { tone: 'danger', text: 'Profilinle çakışıyor: Süt' },
);

// ── Profil yok, beyan var → nötr, "Beyanda: X" ─────────────────────────────
assert.deepEqual(
  getAllergenStatusLine(bannerData({ status: 'declared_contains', declaredList: ['Süt', 'Yumurta'] })),
  { tone: 'neutral', text: 'Beyanda: Süt, Yumurta' },
);

// ── Veri yok → sarı ─────────────────────────────────────────────────────
assert.deepEqual(getAllergenStatusLine(bannerData({ status: 'unknown_or_unverified' })), {
  tone: 'caution',
  text: 'Alerjen verisi yok — etiketi kontrol edin',
});

// ── Belirtilmemiş (present ama bu alerjen listede yok) → nötr ──────────────
assert.deepEqual(getAllergenStatusLine(bannerData({ status: 'not_listed_in_available_data' })), {
  tone: 'neutral',
  text: 'Veri kaydında belirtilmemiş',
});

// ── Kritik eşleşme var ama declaredList boş (live-OFF yolu) → genel kırmızı metin ─
assert.deepEqual(
  getAllergenStatusLine(
    bannerData({
      criticalMatches: [{ code: 'PROFILE_MILK_ALLERGEN_MATCH', title: 'x', message: 'y' }],
    }),
  ),
  { tone: 'danger', text: 'Profilinle çakışan alerjen uyarısı' },
);

console.log('ALLERGEN_STATUS_LINE_SMOKE_OK');
