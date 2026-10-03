/**
 * RafSkoru — Alternatif önerisi: profil-farkında bölümleme (saf mantık)
 * src/features/alternatives/buildAlternativeSections.ts
 *
 * Backend (price/alternatives/catalogAlternatives.ts) yalnız aynı grup
 * içindeki, mevcut üründen düşük puanlı OLMAYAN adayları ham veriyle döner —
 * profil eleme BURADA yapılır (profil cihazdan çıkmaz, bkz.
 * rafskoru-invariants). evaluateCatalogAllergenDataForProfile, arama çipi/
 * sepet/ürün sayfası banner'ıyla AYNI paylaşılan çekirdektir — sonuç asla
 * farklılaşamaz.
 *
 * Fail-closed: declared/trace eşleşen aday (profille çakışan) HİÇ ASLA
 * listelenmez — hangi bölümde olursa olsun, koşulsuz elenir.
 */
import type { CatalogAllergenData, CatalogNova, CatalogNutriScore, CatalogCompleteness } from '../../api/catalogTypes';
import type { RafScoreResult } from '../../price/types';
import { evaluateCatalogAllergenDataForProfile } from '../../riskEngine/catalogAllergenChip';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';

export interface AlternativeCandidate {
  productId: string;
  name: string | null;
  brand: string | null;
  quantityText: string | null;
  packageSize?: { amount: number; unit: string } | null;
  productGroupKey: string;
  imageUrl: string | null;
  nutriScore: CatalogNutriScore;
  nova: CatalogNova;
  allergenData: CatalogAllergenData;
  completeness: CatalogCompleteness;
  rafScore: RafScoreResult;
  scoreCoverageKey: string;
  scoreCoverageLabel: string;
}

export type AlternativeSectionKey = 'profile_fit' | 'higher_scored' | 'data_missing';

export interface AlternativeSection {
  key: AlternativeSectionKey;
  title: string;
  items: AlternativeCandidate[];
}

export interface AlternativeSectionsResult {
  sections: AlternativeSection[];
  totalCount: number;
}

const MAX_PROFILE_FIT = 3;
const MAX_HIGHER_SCORED = 3;
const MAX_DATA_MISSING = 2;

export function buildAlternativeSections(input: {
  /** Mevcut ürün, kullanıcının profiliyle çakışıyor mu (bkz. product-result.tsx, isAllergenConflict). */
  currentHasConflict: boolean;
  currentScore: number | null;
  currentScoreCoverageKey: string;
  candidates: AlternativeCandidate[];
  userProfile: UserSensitivityProfile;
}): AlternativeSectionsResult {
  const profileFit: AlternativeCandidate[] = [];
  const higherScored: AlternativeCandidate[] = [];
  const dataMissing: AlternativeCandidate[] = [];

  for (const candidate of input.candidates) {
    const evaluation = evaluateCatalogAllergenDataForProfile(candidate.allergenData, input.userProfile);

    if (evaluation.status === 'declared_contains' || evaluation.status === 'trace_may_contain') {
      continue;
    }

    const score = candidate.rafScore.score;
    const isWorseThanCurrent =
      score === null || (input.currentScore !== null && score < input.currentScore);

    if (evaluation.status === 'unknown_or_unverified') {
      if (!isWorseThanCurrent) dataMissing.push(candidate);
      continue;
    }

    // evaluation.status === 'not_listed_in_available_data' — profille çakışmıyor.
    if (isWorseThanCurrent) continue;

    if (input.currentHasConflict) {
      profileFit.push(candidate);
    } else if (input.currentScore !== null && score !== null && score > input.currentScore) {
      higherScored.push(candidate);
    }
  }

  const sections: AlternativeSection[] = [];

  if (profileFit.length > 0) {
    sections.push({
      key: 'profile_fit',
      title: 'Profiline uygun seçenekler',
      items: profileFit.slice(0, MAX_PROFILE_FIT),
    });
  }

  if (higherScored.length > 0) {
    const allSameCoverage = higherScored.every(
      (candidate) => candidate.scoreCoverageKey === input.currentScoreCoverageKey,
    );
    sections.push({
      key: 'higher_scored',
      title: allSameCoverage ? 'Daha yüksek puanlı seçenekler' : 'Aynı gruptaki diğer seçenekler',
      items: higherScored.slice(0, MAX_HIGHER_SCORED),
    });
  }

  if (dataMissing.length > 0) {
    sections.push({
      key: 'data_missing',
      title: 'Veri eksik seçenekler',
      items: dataMissing.slice(0, MAX_DATA_MISSING),
    });
  }

  const totalCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  return { sections, totalCount };
}
