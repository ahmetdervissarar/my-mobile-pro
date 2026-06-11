import { DEFAULT_RAF_SCORE_WEIGHTS, RAF_SCORE_DISCLAIMER } from './rules.js';
import type {
  RafScoreComponent,
  RafScoreConfidence,
  RafScoreInput,
  RafScoreResult,
  RafScoreStatus,
  RafScoreWeights,
} from './types.js';

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeOptionalScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return clampScore(value);
}

function buildComponents(
  input: RafScoreInput,
  weights: RafScoreWeights,
): RafScoreComponent[] {
  return [
    {
      key: 'price',
      label: 'Fiyat',
      score: normalizeOptionalScore(input.priceScore),
      weight: weights.price,
      isAvailable: input.priceScore !== null && input.priceScore !== undefined,
    },
    {
      key: 'health',
      label: 'Saglik',
      score: normalizeOptionalScore(input.healthScore),
      weight: weights.health,
      isAvailable: input.healthScore !== null && input.healthScore !== undefined,
    },
    {
      key: 'content',
      label: 'Icerik/Alerjen',
      score: normalizeOptionalScore(input.contentScore),
      weight: weights.content,
      isAvailable: input.contentScore !== null && input.contentScore !== undefined,
    },
    {
      key: 'sustainability',
      label: 'Surdurulebilirlik',
      score: normalizeOptionalScore(input.sustainabilityScore),
      weight: weights.sustainability,
      isAvailable:
        input.sustainabilityScore !== null && input.sustainabilityScore !== undefined,
    },
  ];
}

function getStatus(availableCount: number): RafScoreStatus {
  if (availableCount === 0) return 'unavailable';
  if (availableCount < 4) return 'partial';
  return 'ready';
}

function getConfidence(availableCount: number): RafScoreConfidence {
  if (availableCount >= 4) return 'high';
  if (availableCount >= 3) return 'medium';
  return 'low';
}

function buildExplanations(components: RafScoreComponent[]): string[] {
  const available = components.filter((component) => component.isAvailable);
  const missing = components.filter((component) => !component.isAvailable);

  const explanations: string[] = [];

  if (available.length > 0) {
    explanations.push(
      `Skor hesaplamasinda kullanilan bilesenler: ${available
        .map((component) => component.label)
        .join(', ')}.`,
    );
  }

  if (missing.length > 0) {
    explanations.push(
      `Genel RafSkoru henuz hesaplanmadi. Eksik bilesenler: ${missing
        .map((component) => component.label)
        .join(', ')}.`,
    );
  }

  return explanations;
}

export function calculateRafScore(
  input: RafScoreInput,
  weights: RafScoreWeights = DEFAULT_RAF_SCORE_WEIGHTS,
): RafScoreResult {
  const components = buildComponents(input, weights);
  const availableComponents = components.filter(
    (component): component is RafScoreComponent & { score: number } =>
      component.isAvailable && component.score !== null,
  );

  const availableCount = availableComponents.length;
  const status = getStatus(availableCount);

  const weightedScoreTotal = availableComponents.reduce(
    (total, component) => total + component.score * component.weight,
    0,
  );

  const weightTotal = components.reduce(
    (total, component) => total + component.weight,
    0,
  );

  const score =
    status === 'ready' && weightTotal > 0
      ? clampScore(weightedScoreTotal / weightTotal)
      : null;

  return {
    score,
    status,
    confidence: getConfidence(availableCount),
    weights,
    components,
    explanations: buildExplanations(components),
    disclaimer: RAF_SCORE_DISCLAIMER,
  };
}