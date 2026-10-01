// P0 regresyon: sepet özeti eski riskFlags/CRITICAL_ALLERGEN_CODES yolunu
// (kullanıcı profiline hiç bakmıyordu) DEĞİL, arama/ürün satırlarıyla aynı
// getCatalogAllergenChipStatus birleştirmesini kullanmalı. "Tespit edilmedi"
// yalnız tüm ürünler present VE çakışma yoksa; en az bir üründe veri yoksa
// ASLA kullanılmaz (bkz. görev raporu).
import assert from 'node:assert/strict';

import type { BasketEvaluateResponse } from '../../api/basketClient';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { summarizeBasketAllergenStatus } from './helpers';

type PerItem = BasketEvaluateResponse['basketProfile']['perItem'];

function makeItem(overrides: Partial<PerItem[number]>): PerItem[number] {
  return {
    type: 'product',
    label: 'Test Ürünü',
    productGroupKey: 'test',
    quantity: { amount: 1, unit: 'piece' },
    score: 70,
    subScores: { health: null, content: null, additives: null, sustainability: null },
    riskFlags: [], // KASITLI boş — eski hata tam burada oluşuyordu (backend bu alanı doldurmuyor)
    scoreSource: 'group_estimate',
    ...overrides,
  };
}

function profileFor(allergens: UserSensitivityProfile['allergens']): UserSensitivityProfile {
  return { allergens, chronicSensitivities: [], healthPreferences: [] };
}

const dostSutData = {
  declared: ['milk'] as const,
  traces: [],
  recognizedUnmodeled: [],
  rawUnmapped: [],
  dataStatus: 'present' as const,
  ingredientsEvidence: { text: null, lang: null, source: 'off' as const },
};

// 1) Gerçek hata senaryosu: declared=milk, riskFlags=[], profil={milk} → ÇAKIŞMA raporlanmalı.
{
  const summary = summarizeBasketAllergenStatus(
    [makeItem({ allergenData: { ...dostSutData, declared: ['milk'] } })],
    profileFor(['milk']),
  );
  assert.equal(summary.conflictCount, 1);
  assert.equal(summary.headline, '1 üründe profilinizle çakışan alerjen var');
  assert.equal(summary.tone, 'danger');
  assert.ok(!summary.headline.includes('tespit edilmedi'));
}

// 2) Karışık sepet: bir çakışma + bir veri-yok → başlık ÇAKIŞMA olmalı (öncelik conflictCount'ta).
{
  const summary = summarizeBasketAllergenStatus(
    [
      makeItem({ allergenData: { ...dostSutData, declared: ['milk'] } }),
      makeItem({ allergenDataStatus: 'unknown_or_unverified' }),
    ],
    profileFor(['milk']),
  );
  assert.equal(summary.conflictCount, 1);
  assert.equal(summary.noDataCount, 1);
  assert.equal(summary.headline, '1 üründe profilinizle çakışan alerjen var');
}

// 3) Yalnız veri-yok (hiç çakışma yok) → "tespit edilmedi" YASAK, "veri yok" başlığı gösterilmeli.
{
  const summary = summarizeBasketAllergenStatus(
    [makeItem({ allergenDataStatus: 'unknown_or_unverified' }), makeItem({ allergenDataStatus: 'unknown_or_unverified' })],
    profileFor(['milk']),
  );
  assert.equal(summary.conflictCount, 0);
  assert.equal(summary.noDataCount, 2);
  assert.equal(summary.headline, '2 üründe alerjen verisi yok — etiketi kontrol edin');
  assert.equal(summary.tone, 'warning');
  assert.ok(!summary.headline.includes('tespit edilmedi'));
}

// 4) Tüm ürünler present + hiç çakışma yok (not_listed) → özel "garanti değildir" metni, "tespit edilmedi" DEĞİL.
{
  const summary = summarizeBasketAllergenStatus(
    [makeItem({ allergenData: { ...dostSutData, declared: [] } })],
    profileFor(['milk']),
  );
  assert.equal(summary.conflictCount, 0);
  assert.equal(summary.noDataCount, 0);
  assert.equal(summary.headline, 'Mevcut verilerde profil alerjeniniz belirtilmemiş — bu bir garanti değildir');
  assert.ok(!summary.headline.includes('tespit edilmedi'));
}

// 5) D2 (device test 30 Eylül): profil boş AMA sepette beyan edilmiş alerjen
// var → hüküm kelimesi bastırılmalı (suppressVerdict=true), "N üründe beyan
// edilmiş alerjen var" başlığı, "profilinizle çakışıyor" İDDİASI YOK (henüz
// hiçbir profil yok, çakışma iddia edilemez — conflictCount=0 kalır).
{
  const summary = summarizeBasketAllergenStatus(
    [
      makeItem({ allergenData: { ...dostSutData, declared: ['milk'] } }),
      makeItem({ allergenData: { ...dostSutData, declared: [] } }),
    ],
    profileFor([]),
  );
  assert.equal(summary.conflictCount, 0, 'profil boşken çakışma iddia edilemez');
  assert.equal(summary.declaredWithoutProfileCount, 1);
  assert.equal(summary.headline, '1 üründe beyan edilmiş alerjen var — profil ekleyerek kişiselleştir');
  assert.equal(summary.tone, 'warning');
  assert.equal(summary.suppressVerdict, true, 'beyan edilmiş alerjen varken hüküm kelimesi bastırılmalı');
}

// 6) Profil boş VE sepette hiç beyan edilmiş alerjen yok → nötr, hüküm kelimesi bastırılmaz.
{
  const summary = summarizeBasketAllergenStatus(
    [makeItem({ allergenData: { ...dostSutData, declared: [] } })],
    profileFor([]),
  );
  assert.equal(summary.conflictCount, 0);
  assert.equal(summary.declaredWithoutProfileCount, 0);
  assert.equal(summary.tone, 'neutral');
  assert.equal(summary.suppressVerdict, false);
}

console.log('BASKET_ALLERGEN_SUMMARY_SMOKE_OK (6 senaryo)');
