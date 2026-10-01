/**
 * RafSkoru — Uyarı rengi TÜRDEN gelsin testi (device test 30 Eylül, D5)
 * src/riskEngine/warningColorKind.smoke.ts
 *
 * Cihaz raporu: profil çakışması olmayan genel uyarılar ("Ultra işlenmiş
 * ürün") kırmızı görünüyordu. Onaylanan çözüm: kırmızı yalnız gerçek
 * profil-alerjen çakışmasına ayrılır; "alerjen verisi yok" (fail-closed
 * ilkesi gereği level="high" KALIR) sarı; genel uyarılar turuncu/nötr.
 */
import assert from 'node:assert/strict';

import { evaluateProductRisks, getWarningColorKind } from './riskEngine';

function findWarning(warnings: ReturnType<typeof evaluateProductRisks>['warnings'], code: string) {
  const warning = warnings.find((w) => w.code === code);
  assert.ok(warning, `${code} üretilmeliydi`);
  return warning!;
}

// ── MISSING_ALLERGEN_INFO: level "high" KALIR (fail-closed), kind sarı ──────
{
  const result = evaluateProductRisks({ name: 'Test Ürünü', ingredients: null, allergens: [], allergenInfo: null });
  const warning = findWarning(result.warnings, 'MISSING_ALLERGEN_INFO');
  assert.equal(warning.level, 'high', 'alerjen verisi yokluğu fail-closed ilkesi gereği high kalmalı');
  assert.equal(getWarningColorKind(warning.code), 'missing_allergen_data');
}

// ── Profil eşleşmesi (süt): level "high" kalır, kind kırmızı ────────────────
{
  const result = evaluateProductRisks({
    name: 'Süt',
    ingredients: 'süt',
    allergens: ['milk'],
    userProfile: { allergens: ['milk'], chronicSensitivities: [], healthPreferences: [] },
  });
  const warning = findWarning(result.warnings, 'PROFILE_MILK_ALLERGEN_MATCH');
  assert.equal(warning.level, 'high');
  assert.equal(getWarningColorKind(warning.code), 'profile_conflict');
}

// ── NOVA_GROUP_4: artık level "medium" (turuncu, genel uyarı) ───────────────
{
  const result = evaluateProductRisks({
    name: 'Cips',
    ingredients: 'patates, tuz',
    allergens: ['Alerjen beyanı yok'],
    novaGroup: 4,
  });
  const warning = findWarning(result.warnings, 'NOVA_GROUP_4');
  assert.equal(warning.level, 'medium', 'NOVA_GROUP_4 artık medium (turuncu) olmalı, high değil');
  assert.equal(getWarningColorKind(warning.code), 'general');
}

// ── PROFILE_ALLERGEN_INFO_MISSING: profil-farkında "veri yok" da sarı ───────
assert.equal(getWarningColorKind('PROFILE_ALLERGEN_INFO_MISSING'), 'missing_allergen_data');

// ── Sağlık tercihi notları (ör. daha az şeker): kırmızı/sarı DEĞİL, genel ───
assert.equal(getWarningColorKind('PROFILE_LESS_SUGAR_PREFERENCE'), 'general');

console.log('WARNING_COLOR_KIND_SMOKE_OK');
