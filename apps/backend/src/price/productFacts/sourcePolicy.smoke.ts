/**
 * RafSkoru — Kaynak sınıfı izin tablosu sözleşmesi (ADR-009 §4, §5)
 * apps/backend/src/price/productFacts/sourcePolicy.smoke.ts
 *
 * Korunan kurallar:
 *   - doğrulanmamış etiket ve tahmin kaynakları ASLA alerjen uyarısı üretmez,
 *     ASLA uygunluk kararını desteklemez, güvenleri "low"u geçmez
 *   - OFF uyarı üretebilir ama uygunluk kararını desteklemez
 *   - uygunluk kararını destekleyebilen tek kaynak insan onaylı kayıttır ve
 *     yalnız doğrulama kaydı tamsa
 *   - güven tavanı yalnız indirir, yükseltmez
 */
import assert from 'node:assert/strict';

import {
  clampConfidenceToSource,
  getProductFactsSourcePolicy,
  PRODUCT_FACTS_SOURCE_POLICY,
} from './sourcePolicy.js';
import type { ProductFactsConfidence, ProductFactsSource } from './types.js';

const ALL_SOURCES: ProductFactsSource[] = ['off', 'rafskoru_verified', 'label_unverified', 'beta_inference'];
const ALL_CONFIDENCES: ProductFactsConfidence[] = ['low', 'medium', 'high'];

// ── Tablo, sözleşmedeki her kaynağı ve yalnız onları kapsar ──────────────
assert.deepEqual(
  Object.keys(PRODUCT_FACTS_SOURCE_POLICY).sort(),
  [...ALL_SOURCES].sort(),
  'izin tablosu sözleşmedeki kaynaklarla birebir aynı olmalı',
);

// ── Doğrulanmamış kaynaklar: uyarı yok, uygunluk yok, güven düşük ────────
for (const source of ['label_unverified', 'beta_inference'] as const) {
  const policy = getProductFactsSourcePolicy(source);
  assert.equal(policy.mayProduceAllergenWarning, false, `${source} alerjen uyarısı üretmemeli`);
  assert.equal(policy.suitabilityDecisionSupport, 'never', `${source} uygunluk kararını desteklememeli`);
  assert.equal(policy.confidenceCeiling, 'low', `${source} güven tavanı low olmalı`);
  assert.equal(policy.isHumanVerified, false);

  for (const confidence of ALL_CONFIDENCES) {
    assert.equal(clampConfidenceToSource(source, confidence), 'low', `${source} güveni low'u geçmemeli`);
  }
}

// ── OFF: uyarı üretebilir, uygunluk kararını desteklemez ─────────────────
{
  const policy = getProductFactsSourcePolicy('off');
  assert.equal(policy.mayProduceAllergenWarning, true);
  assert.equal(policy.suitabilityDecisionSupport, 'never', 'OFF hiçbir zaman uygunluk kararını desteklememeli');
  assert.equal(policy.isHumanVerified, false);
}

// ── İnsan onaylı kayıt: tek koşullu istisna ──────────────────────────────
{
  const policy = getProductFactsSourcePolicy('rafskoru_verified');
  assert.equal(policy.mayProduceAllergenWarning, true);
  assert.equal(policy.suitabilityDecisionSupport, 'only_with_complete_verification_record');
  assert.equal(policy.isHumanVerified, true);
}

for (const source of ALL_SOURCES) {
  const policy = getProductFactsSourcePolicy(source);
  if (source !== 'rafskoru_verified') {
    assert.equal(policy.suitabilityDecisionSupport, 'never', `${source}: yalnız insan onaylı kayıt istisna olabilir`);
    assert.equal(policy.isHumanVerified, false, `${source} insan onaylı sayılmamalı`);
  }
  // Koşulsuz uygunluk desteği diye bir değer yoktur.
  assert.ok(
    policy.suitabilityDecisionSupport === 'never' ||
      policy.suitabilityDecisionSupport === 'only_with_complete_verification_record',
  );
}

// ── Güven tavanı yalnız indirir ──────────────────────────────────────────
for (const source of ['off', 'rafskoru_verified'] as const) {
  for (const confidence of ALL_CONFIDENCES) {
    assert.equal(clampConfidenceToSource(source, confidence), confidence, 'tavanın altındaki güven değişmemeli');
  }
}
assert.equal(clampConfidenceToSource('label_unverified', 'low'), 'low');

console.log('PRODUCT_FACTS_SOURCE_POLICY_SMOKE_OK');
