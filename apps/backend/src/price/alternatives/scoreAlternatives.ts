import { arePackageSizesComparable } from '../productGroups/index.js';
import type {
  AlternativeCandidate,
  AlternativeRecommendation,
  ScoreAlternativesInput,
} from './types.js';
import { normalizeAlternativeProductShape } from './alternativeProductShape.js';

const DEFAULT_LIMIT = 3;
const USE_CANONICAL_ALTERNATIVE_MATCHING = 'USE_CANONICAL_ALTERNATIVE_MATCHING';
const SHADOW_CANONICAL_ALTERNATIVE_MATCHING = 'SHADOW_CANONICAL_ALTERNATIVE_MATCHING';

type AlternativeMatchingMode = 'legacy' | 'canonical';

function isEnabled(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

function getAlternativeMatchingMode(): AlternativeMatchingMode {
  return isEnabled(process.env[USE_CANONICAL_ALTERNATIVE_MATCHING]) ? 'canonical' : 'legacy';
}

function shouldShadowCanonicalAlternativeMatching(): boolean {
  return isEnabled(process.env[SHADOW_CANONICAL_ALTERNATIVE_MATCHING]);
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function confidencePoints(candidate: AlternativeCandidate): number {
  switch (candidate.overallConfidence.level) {
    case 'high':
      return 12;
    case 'medium':
      return 6;
    case 'low':
    default:
      return 0;
  }
}

function distancePoints(candidate: AlternativeCandidate): number {
  const distanceMeters = candidate.distanceMeters;

  if (distanceMeters === undefined) {
    return 0;
  }

  if (distanceMeters <= 1000) {
    return 8;
  }

  if (distanceMeters <= 2000) {
    return 4;
  }

  return 0;
}

function formatPriceDelta(priceDelta: number | null): string | undefined {
  if (priceDelta === null) {
    return undefined;
  }

  const formatted = Math.abs(priceDelta).toLocaleString('tr-TR', {
    maximumFractionDigits: 2,
  });

  if (Math.abs(priceDelta) < 0.01) {
    return 'Aynı fiyat seviyesinde';
  }

  if (priceDelta < 0) {
    return `${formatted} TL daha ucuz`;
  }

  return `${formatted} TL daha pahalı`;
}

function buildReasons(
  candidate: AlternativeCandidate,
  rafScoreDelta: number | null,
  priceDelta: number | null,
): string[] {
  const reasons: string[] = [];

  if (rafScoreDelta !== null && rafScoreDelta > 0) {
    reasons.push(`+${rafScoreDelta} RafSkoru`);
  }

  const priceDeltaText = formatPriceDelta(priceDelta);
  if (priceDeltaText) {
    reasons.push(priceDeltaText);
  }

  if (candidate.distanceText) {
    reasons.push(`${candidate.distanceText} yakında`);
  }

  if (candidate.overallConfidence.level !== 'low') {
    reasons.push('Veri güveni yeterli');
  }

  return reasons;
}

function getCandidateRankingScore(
  candidate: AlternativeCandidate,
  input: ScoreAlternativesInput,
  rafScoreDelta: number | null,
  priceDelta: number | null,
): number {
  const current = input.currentProduct;
  let score = 0;

  if (rafScoreDelta !== null) {
    score += rafScoreDelta * 2;
  } else {
    score += candidate.scores.rafScore * 0.4;
  }

  if (priceDelta !== null) {
    if (priceDelta < 0) {
      score += Math.min(25, Math.abs(priceDelta));
    } else {
      score -= Math.min(15, priceDelta * 0.5);
    }
  }

  if (current.healthScore !== null && current.healthScore !== undefined) {
    score += (candidate.scores.healthScore - current.healthScore) * 0.4;
  }

  if (current.contentScore !== null && current.contentScore !== undefined) {
    score += (candidate.scores.contentScore - current.contentScore) * 0.4;
  }

  if (
    current.sustainabilityScore !== null &&
    current.sustainabilityScore !== undefined &&
    candidate.scores.sustainabilityScore !== undefined
  ) {
    score += (candidate.scores.sustainabilityScore - current.sustainabilityScore) * 0.2;
  }

  score += distancePoints(candidate);
  score += confidencePoints(candidate);

  return roundScore(score);
}

function isSameProduct(current: ScoreAlternativesInput['currentProduct'], candidate: AlternativeCandidate): boolean {
  if (current.id && candidate.id === current.id) {
    return true;
  }

  if (current.barcode && candidate.barcode && candidate.barcode === current.barcode) {
    return true;
  }

  return false;
}

function isLegacyAlternativeMatch(
  current: ScoreAlternativesInput['currentProduct'],
  candidate: AlternativeCandidate,
): boolean {
  const currentShape = normalizeAlternativeProductShape(current);
  const candidateShape = normalizeAlternativeProductShape(candidate);
  const currentProductGroupKey = currentShape.rawProductGroupKey;

  return Boolean(
    currentProductGroupKey &&
      candidate.categoryKey === current.categoryKey &&
      candidateShape.rawProductGroupKey === currentProductGroupKey,
  );
}

function isCanonicalAlternativeMatch(
  current: ScoreAlternativesInput['currentProduct'],
  candidate: AlternativeCandidate,
): boolean {
  if (current.alternativesEligible !== true) {
    return false;
  }

  if (candidate.categoryKey !== current.categoryKey) {
    return false;
  }

  const currentShape = normalizeAlternativeProductShape(current);
  const candidateShape = normalizeAlternativeProductShape(candidate);

  if (!currentShape.canonicalProductGroupKey || !candidateShape.canonicalProductGroupKey) {
    return false;
  }

  if (currentShape.canonicalProductGroupKey !== candidateShape.canonicalProductGroupKey) {
    return false;
  }

  if (!currentShape.packageSize || !candidateShape.packageSize) {
    return false;
  }

  return arePackageSizesComparable(currentShape.packageSize, candidateShape.packageSize);
}

function isAlternativeMatch(
  current: ScoreAlternativesInput['currentProduct'],
  candidate: AlternativeCandidate,
  mode: AlternativeMatchingMode,
): boolean {
  return mode === 'canonical'
    ? isCanonicalAlternativeMatch(current, candidate)
    : isLegacyAlternativeMatch(current, candidate);
}

function getRecommendationIds(recommendations: AlternativeRecommendation[]): string[] {
  return recommendations.map((recommendation) => recommendation.candidate.id);
}

function buildCanonicalShadowInput(input: ScoreAlternativesInput): ScoreAlternativesInput {
  const currentShape = normalizeAlternativeProductShape(input.currentProduct);

  return {
    ...input,
    currentProduct: {
      ...input.currentProduct,
      resolvedProductGroupKey:
        input.currentProduct.resolvedProductGroupKey ??
        currentShape.canonicalProductGroupKey ??
        undefined,
      packageSize: input.currentProduct.packageSize ?? currentShape.packageSize ?? undefined,
      alternativesEligible:
        input.currentProduct.alternativesEligible ??
        Boolean(currentShape.canonicalProductGroupKey && currentShape.packageSize),
    },
  };
}

function logCanonicalMatchingParityIfNeeded(
  input: ScoreAlternativesInput,
  mode: AlternativeMatchingMode,
  recommendations: AlternativeRecommendation[],
): void {
  if (!shouldShadowCanonicalAlternativeMatching()) {
    return;
  }

  const legacyRecommendations =
    mode === 'legacy' ? recommendations : scoreAlternativesWithMode(input, 'legacy');
  const canonicalInput = buildCanonicalShadowInput(input);
  const canonicalRecommendations =
    mode === 'canonical' ? recommendations : scoreAlternativesWithMode(canonicalInput, 'canonical');

  const legacyIds = getRecommendationIds(legacyRecommendations);
  const canonicalIds = getRecommendationIds(canonicalRecommendations);

  if (JSON.stringify(legacyIds) === JSON.stringify(canonicalIds)) {
    return;
  }

  console.info(
    '[alternatives] canonical_matching_parity_mismatch',
    JSON.stringify({
      currentProductGroupKey: input.currentProduct.productGroupKey ?? null,
      resolvedProductGroupKey: input.currentProduct.resolvedProductGroupKey ?? null,
      legacyIds,
      canonicalIds,
    }),
  );
}

function scoreAlternativesWithMode(
  input: ScoreAlternativesInput,
  mode: AlternativeMatchingMode,
): AlternativeRecommendation[] {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const current = input.currentProduct;

  return input.candidates
    .filter((candidate) => isAlternativeMatch(current, candidate, mode))
    .filter((candidate) => !isSameProduct(current, candidate))
    .map((candidate): AlternativeRecommendation => {
      const rafScoreDelta =
        current.rafScore !== null && current.rafScore !== undefined
          ? candidate.scores.rafScore - current.rafScore
          : null;

      const priceDelta =
        current.price !== null && current.price !== undefined
          ? roundScore(candidate.price - current.price)
          : null;

      const rankingScore = getCandidateRankingScore(candidate, input, rafScoreDelta, priceDelta);

      return {
        candidate,
        rankingScore,
        reasonLabel: 'Aynı ürün grubunda daha iyi seçenek',
        rafScoreDelta,
        priceDelta,
        priceDeltaText: formatPriceDelta(priceDelta),
        distanceText: candidate.distanceText,
        reasons: buildReasons(candidate, rafScoreDelta, priceDelta),
        confidenceLevel: candidate.overallConfidence.level,
      };
    })
    .filter((recommendation) => recommendation.rankingScore > 0)
    .filter((recommendation) => {
      const improvesRafScore =
        recommendation.rafScoreDelta !== null && recommendation.rafScoreDelta > 0;
      const isNotMoreExpensive =
        recommendation.priceDelta === null || recommendation.priceDelta <= 0;

      return improvesRafScore && isNotMoreExpensive;
    })
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }

      return a.candidate.price - b.candidate.price;
    })
    .slice(0, limit);
}

export function scoreAlternatives(input: ScoreAlternativesInput): AlternativeRecommendation[] {
  const mode = getAlternativeMatchingMode();
  const recommendations = scoreAlternativesWithMode(input, mode);

  logCanonicalMatchingParityIfNeeded(input, mode, recommendations);

  return recommendations;
}
