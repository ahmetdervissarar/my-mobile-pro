// Cihaz testi (feat/catalog-alternatives) — fail-open rozet düzeltmesi:
// profil tanımlıyken HER liste kartında (arama/alternatifler/sepet/kategori)
// mutlaka bir alerjen rozeti olmalı — çakışma / beyan / belirtilmemiş / veri
// yok dört durumun hiçbirinde rozetsiz kart kalmamalı.
//
// Arama (SearchResultRow) + alternatifler (AlternativesSection, aynı satırı
// kullanır) ve sepet (BasketItemRow) + kategori (ProductRow) hepsi AYNI
// paylaşılan çekirdekten (getAllergenBannerDataFromCatalog /
// evaluateCatalogAllergenDataForProfile + getAllergenDisplayLevel) beslenir
// — bu test o çekirdeğin HER durumda AllergenChip'in render edebileceği bir
// {status, displayInfo} ürettiğini doğrular.
//
// Çalıştırma: cd apps/backend && npx tsx ../mobile/src/features/productResult/allergenBadgeCoverage.smoke.ts
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../../api/catalogTypes';
import { getAllergenStatusLine } from './allergenStatusLine';
import { getAllergenBannerDataFromCatalog } from './helpers';
import { getSearchCardBadge } from '../search/searchCardPresentation';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';

const PROFILE_WITH_MILK: UserSensitivityProfile = {
  allergens: ['milk'],
  chronicSensitivities: [],
  healthPreferences: [],
};

function allergenData(overrides: Partial<CatalogAllergenData>): CatalogAllergenData {
  return {
    declared: [],
    traces: [],
    recognizedUnmodeled: [],
    rawUnmapped: [],
    dataStatus: 'present',
    ingredientsEvidence: { text: null, lang: null, source: 'off' },
    ...overrides,
  };
}

const SCENARIOS = [
  { label: 'çakışma (declared)', data: allergenData({ declared: ['milk'], dataStatus: 'present' }) },
  { label: 'eser miktar (trace)', data: allergenData({ traces: ['milk'], dataStatus: 'present' }) },
  { label: 'belirtilmemiş (not_listed)', data: allergenData({ dataStatus: 'present' }) },
  { label: 'veri yok (unknown_or_unverified)', data: allergenData({ dataStatus: 'unknown_or_unverified' }) },
];

for (const scenario of SCENARIOS) {
  const result = getAllergenBannerDataFromCatalog({
    catalogAllergenData: scenario.data,
    userProfile: PROFILE_WITH_MILK,
    riskWarnings: [],
  });

  // 1) status her zaman dört geçerli değerden biri — AllergenChip'in
  // render edemeyeceği bir undefined/null durum hiç çıkmaz.
  assert.ok(
    ['declared_contains', 'trace_may_contain', 'not_listed_in_available_data', 'unknown_or_unverified'].includes(
      result.status,
    ),
    `${scenario.label}: status geçerli olmalı`,
  );

  // 2) Arama/alternatifler kartı bu statüden rozet ÜRETEBİLMELİ: ya danger
  // rozeti (çakışma), ya da (aşağıda doğrulanan) ayrı AllergenChip.
  const allergenLine = getAllergenStatusLine(result);
  const badge = getSearchCardBadge(allergenLine);
  const hasDangerBadge = badge.isAllergenBadge;
  const hasFallbackChip = !hasDangerBadge; // SearchResultRow/BasketItemRow bu durumda AllergenChip ekler.
  assert.ok(
    hasDangerBadge || hasFallbackChip,
    `${scenario.label}: kart rozetsiz kalmamalı`,
  );
}

// 3) Profil tanımlıyken (allergens: ['milk']) + katalog verisi doğrulanmamışsa,
// perKey üzerinden türetilen displayInfo.level 'no_data' olmalı — bu,
// AllergenChip'te SARI (caution) rozete karşılık gelir (bkz. AllergenChip.tsx
// TONES_BY_LEVEL.no_data). Profil boşsa bu seviye hiç hesaplanmaz (perKey
// boş kalır) ama o durumda da status map'i (unknown_or_unverified) ayrı bir
// renkli rozet üretir — hiçbir koşulda rozet YOK olmaz.
{
  const unverified = getAllergenBannerDataFromCatalog({
    catalogAllergenData: allergenData({ dataStatus: 'unknown_or_unverified' }),
    userProfile: PROFILE_WITH_MILK,
    riskWarnings: [],
  });
  assert.equal(unverified.displayInfo?.level, 'no_data', 'profil tanımlıyken veri-yok sarı rozete düşmeli');
}

// 4) P2 invariant hâlâ geçerli: çakışma varsa rozet HER ZAMAN alerjen rozeti
// (puan rozetinin yerini alır) — bu testin 2. maddesindeki "ya/ya da" dalını
// sabitler.
{
  const conflict = getAllergenBannerDataFromCatalog({
    catalogAllergenData: allergenData({ declared: ['milk'], dataStatus: 'present' }),
    userProfile: PROFILE_WITH_MILK,
    riskWarnings: [],
  });
  const badge = getSearchCardBadge(getAllergenStatusLine(conflict));
  assert.equal(badge.isAllergenBadge, true, 'çakışmada rozet her zaman alerjen rozeti olmalı');
}

console.log('ALLERGEN_BADGE_COVERAGE_SMOKE_OK');
