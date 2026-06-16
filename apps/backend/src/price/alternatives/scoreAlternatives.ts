import type {
  AlternativeCandidate,
  AlternativeRecommendation,
  ScoreAlternativesInput,
} from './types.js';

const DEFAULT_LIMIT = 3;

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

export function scoreAlternatives(input: ScoreAlternativesInput): AlternativeRecommendation[] {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const current = input.currentProduct;
  const currentProductGroupKey = current.productGroupKey?.trim();

  if (!currentProductGroupKey) {
    return [];
  }

  return input.candidates
    .filter(
      (candidate) =>
        candidate.categoryKey === current.categoryKey &&
        candidate.productGroupKey === currentProductGroupKey,
    )
    .filter((candidate) => !isSameProduct(current, candidate))
    .map((candidate): AlternativeRecommendation => {
      const rafScoreDelta =
        current.rafScore !== null && current.rafScore !== undefined
          ? candidate.scores.rafScore - current.rafScore
          : null;

      const priceDelta =
        current.price !== null && current.price !== undefined
          ? candidate.price - current.price
          : null;

      const rankingScore = getCandidateRankingScore(candidate, input, rafScoreDelta, priceDelta);

      return {
        candidate,
        rankingScore,
        reasonLabel: 'Daha iyi alternatif bulundu',
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
