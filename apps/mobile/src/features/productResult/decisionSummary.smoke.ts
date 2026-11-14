import assert from 'node:assert/strict';

import { getDecisionSummaryLine } from './decisionSummary';

// ── Hiçbir sinyal yoksa cümle üretilmez (ek 3: onaylı) ──────────────────────
assert.equal(
  getDecisionSummaryLine({
    isAllergenConflict: false,
    allergenConflictText: null,
    topWarningTitle: null,
    topPositiveItem: null,
  }),
  null,
);

// ── Profil çakışması varsa ÇAKIŞMA cümlesi — beslenme/pozitif sinyal olsa bile ──
assert.equal(
  getDecisionSummaryLine({
    isAllergenConflict: true,
    allergenConflictText: 'Profilinle çakışıyor: Süt',
    topWarningTitle: 'Ultra işlenmiş ürün tercihinize dikkat',
    topPositiveItem: 'Katkı maddesi beyanı yok.',
  }),
  'Profilinle çakışıyor: Süt',
);

// ── Çakışma yoksa, önce uyarı (riskEngine önceliğiyle) ──────────────────────
assert.equal(
  getDecisionSummaryLine({
    isAllergenConflict: false,
    allergenConflictText: null,
    topWarningTitle: 'Ultra işlenmiş ürün tercihinize dikkat',
    topPositiveItem: 'Katkı maddesi beyanı yok.',
  }),
  'Ultra işlenmiş ürün tercihinize dikkat',
);

// ── Uyarı yoksa, pozitif gerekçe ────────────────────────────────────────────
assert.equal(
  getDecisionSummaryLine({
    isAllergenConflict: false,
    allergenConflictText: null,
    topWarningTitle: null,
    topPositiveItem: 'Katkı maddesi beyanı yok.',
  }),
  'Katkı maddesi beyanı yok.',
);

// ── Çakışma true ama metin null geldiyse (çağıran hatası) — fabricate ETMEZ, null döner ──
assert.equal(
  getDecisionSummaryLine({
    isAllergenConflict: true,
    allergenConflictText: null,
    topWarningTitle: 'Ultra işlenmiş ürün tercihinize dikkat',
    topPositiveItem: null,
  }),
  null,
);

console.log('DECISION_SUMMARY_SMOKE_OK');
