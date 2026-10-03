// buildAlternativeSections — saf TS, react-native importu yok (bkz.
// riskEngine/allergenChipParity.smoke.ts'teki aynı çalıştırma deseni):
//   cd apps/backend && npx tsx ../mobile/src/features/alternatives/buildAlternativeSections.smoke.ts
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../../api/catalogTypes';
import type { RafScoreResult } from '../../price/types';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { buildAlternativeSections, type AlternativeCandidate } from './buildAlternativeSections';

const PROFILE_WITH_MILK: UserSensitivityProfile = {
  allergens: ['milk'],
  chronicSensitivities: [],
  healthPreferences: [],
};

const EMPTY_PROFILE: UserSensitivityProfile = {
  allergens: [],
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

function rafScore(score: number | null): RafScoreResult {
  return {
    score,
    status: score === null ? 'unavailable' : 'partial',
    confidence: 'low',
    weights: { price: 35, health: 30, content: 20, sustainability: 15 },
    components: [],
    explanations: [],
    disclaimer: 'test',
  };
}

function candidate(overrides: Partial<AlternativeCandidate>): AlternativeCandidate {
  return {
    productId: 'test-id',
    name: 'Test Ürün',
    brand: 'Test',
    quantityText: '1 L',
    productGroupKey: 'milk',
    imageUrl: null,
    nutriScore: { grade: null, status: 'insufficient_data', source: null, algorithmVersion: null, assumptions: [] },
    nova: { group: null, source: null },
    allergenData: allergenData({ dataStatus: 'present' }),
    completeness: 'insufficient',
    rafScore: rafScore(60),
    scoreCoverageKey: 'content',
    scoreCoverageLabel: 'yalnız içerik',
    ...overrides,
  };
}

// 1) Fail-closed: profille çakışan (declared) aday HİÇBİR bölümde görünmez —
// mevcut ürün çakışsa (profile_fit açıksa) bile.
{
  const conflicting = candidate({
    productId: 'conflict',
    allergenData: allergenData({ declared: ['milk'], dataStatus: 'present' }),
    rafScore: rafScore(90),
  });
  const result = buildAlternativeSections({
    currentHasConflict: true,
    currentScore: 50,
    currentScoreCoverageKey: 'content',
    candidates: [conflicting],
    userProfile: PROFILE_WITH_MILK,
  });
  assert.deepEqual(result.sections, [], 'profille çakışan aday asla gösterilmemeli (fail-closed)');
}

// 2) Mevcut ürün profille çakışıyor -> güvenli aday "Profiline uygun seçenekler"e girer.
{
  const safe = candidate({ productId: 'safe', rafScore: rafScore(55) });
  const result = buildAlternativeSections({
    currentHasConflict: true,
    currentScore: 50,
    currentScoreCoverageKey: 'content',
    candidates: [safe],
    userProfile: PROFILE_WITH_MILK,
  });
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].key, 'profile_fit');
  assert.equal(result.sections[0].title, 'Profiline uygun seçenekler');
}

// 3) Mevcut ürün ÇAKIŞMIYOR, aynı bileşen kümesinden daha yüksek puanlı aday ->
// "Daha yüksek puanlı seçenekler".
{
  const better = candidate({ productId: 'better', rafScore: rafScore(80), scoreCoverageKey: 'content+health' });
  const result = buildAlternativeSections({
    currentHasConflict: false,
    currentScore: 50,
    currentScoreCoverageKey: 'content+health',
    candidates: [better],
    userProfile: EMPTY_PROFILE,
  });
  assert.equal(result.sections[0].title, 'Daha yüksek puanlı seçenekler');
}

// 4) Aynı senaryo ama aday FARKLI bileşen kümesinden puanlanmış -> nötr başlık.
{
  const betterDifferentCoverage = candidate({
    productId: 'better-diff-coverage',
    rafScore: rafScore(80),
    scoreCoverageKey: 'content',
  });
  const result = buildAlternativeSections({
    currentHasConflict: false,
    currentScore: 50,
    currentScoreCoverageKey: 'content+health',
    candidates: [betterDifferentCoverage],
    userProfile: EMPTY_PROFILE,
  });
  assert.equal(result.sections[0].title, 'Aynı gruptaki diğer seçenekler');
}

// 5) Alerjen verisi doğrulanmamış (unknown_or_unverified) aday -> "güvenli" denmez,
// ayrı "Veri eksik seçenekler" bölümünde, en fazla 2.
{
  const unverifiedCandidates = [1, 2, 3].map((n) =>
    candidate({
      productId: `unverified-${n}`,
      allergenData: allergenData({ dataStatus: 'unknown_or_unverified' }),
      rafScore: rafScore(55),
    }),
  );
  const result = buildAlternativeSections({
    currentHasConflict: false,
    currentScore: 50,
    currentScoreCoverageKey: 'content',
    candidates: unverifiedCandidates,
    userProfile: EMPTY_PROFILE,
  });
  const dataMissingSection = result.sections.find((s) => s.key === 'data_missing');
  assert.ok(dataMissingSection, 'veri eksik bölümü görünmeli');
  assert.equal(dataMissingSection!.title, 'Veri eksik seçenekler');
  assert.equal(dataMissingSection!.items.length, 2, 'en fazla 2 tane olmalı');
}

// 6) Mevcut üründen düşük puanlı aday hiçbir bölümde gösterilmez.
{
  const worse = candidate({ productId: 'worse', rafScore: rafScore(40) });
  const result = buildAlternativeSections({
    currentHasConflict: false,
    currentScore: 50,
    currentScoreCoverageKey: 'content',
    candidates: [worse],
    userProfile: EMPTY_PROFILE,
  });
  assert.deepEqual(result.sections, [], 'düşük puanlı aday hiç gösterilmemeli');
}

// 7) Hiç aday yoksa (veya hepsi elenmişse) sections boş, totalCount 0 — çağıran
// taraf bölümü HİÇ göstermemeli.
{
  const result = buildAlternativeSections({
    currentHasConflict: false,
    currentScore: 50,
    currentScoreCoverageKey: 'content',
    candidates: [],
    userProfile: EMPTY_PROFILE,
  });
  assert.deepEqual(result.sections, []);
  assert.equal(result.totalCount, 0);
}

console.log('BUILD_ALTERNATIVE_SECTIONS_SMOKE_OK');
