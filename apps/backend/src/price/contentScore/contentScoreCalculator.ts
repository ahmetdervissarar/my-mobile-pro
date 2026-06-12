import {
  ADDITIVE_RISK_POINTS,
  ALLERGEN_DATA_POINTS,
  CONTENT_SCORE_DISCLAIMER,
  CONTENT_SCORE_WEIGHTS,
} from './rules.js';
import type {
  AdditiveRiskLevel,
  AllergenDataStatus,
  ContentScoreConfidence,
  ContentScoreInput,
  ContentScoreResult,
  ContentScoreStatus,
} from './types.js';

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isAdditiveRiskLevel(value: unknown): value is AdditiveRiskLevel {
  return value === 'none' || value === 'low' || value === 'medium' || value === 'high';
}

function isAllergenDataStatus(value: unknown): value is AllergenDataStatus {
  return value === 'clear' || value === 'contains_allergen' || value === 'unknown';
}

function getIngredientClarityPoints(input: ContentScoreInput): number | null {
  const text = input.ingredientsText?.trim();

  if (!text) return null;

  if (text.length >= 40) return 100;
  if (text.length >= 15) return 75;

  return 50;
}

function getAdditiveRiskPoints(input: ContentScoreInput): number | null {
  if (isAdditiveRiskLevel(input.additiveRiskLevel)) {
    return ADDITIVE_RISK_POINTS[input.additiveRiskLevel];
  }

  if (input.additives && input.additives.length > 0) {
    if (input.additives.length >= 6) return ADDITIVE_RISK_POINTS.high;
    if (input.additives.length >= 3) return ADDITIVE_RISK_POINTS.medium;
    return ADDITIVE_RISK_POINTS.low;
  }

  return null;
}

function getAllergenTransparencyPoints(input: ContentScoreInput): number | null {
  if (!isAllergenDataStatus(input.allergenDataStatus)) return null;

  return ALLERGEN_DATA_POINTS[input.allergenDataStatus];
}

function getProcessingHintPoints(input: ContentScoreInput): number | null {
  if (input.isUltraProcessedHint === null || input.isUltraProcessedHint === undefined) {
    return null;
  }

  return input.isUltraProcessedHint ? 30 : 100;
}

function getPalmOilPoints(input: ContentScoreInput): number | null {
  if (input.hasPalmOil === null || input.hasPalmOil === undefined) {
    return null;
  }

  return input.hasPalmOil ? 40 : 100;
}

function getStatus(availableCount: number): ContentScoreStatus {
  if (availableCount === 0) return 'unavailable';
  if (availableCount < 3) return 'partial';
  return 'ready';
}

function getConfidence(availableCount: number): ContentScoreConfidence {
  if (availableCount >= 5) return 'high';
  if (availableCount >= 3) return 'medium';
  return 'low';
}

function getLabel(score: number | null, status: ContentScoreStatus): string {
  if (status === 'unavailable') return 'Hesaplanamadi';
  if (score === null) return 'Veri eksik';
  if (score >= 80) return 'Temiz ve anlasilir icerik';
  if (score >= 60) return 'Kabul edilebilir icerik';
  if (score >= 40) return 'Dikkat gerektiren icerik';
  return 'Riskli veya belirsiz icerik';
}

function buildExplanations(
  status: ContentScoreStatus,
  availableLabels: string[],
  missingLabels: string[],
): string[] {
  if (status === 'unavailable') {
    return [
      'Icerik, katki veya alerjen bilgisi bulunamadigi icin icerik/alerjen skoru hesaplanamadi.',
    ];
  }

  const explanations = [
    `Icerik/Alerjen skoru icin kullanilan bilesenler: ${availableLabels.join(', ')}.`,
  ];

  if (missingLabels.length > 0) {
    explanations.push(`Eksik bilesenler: ${missingLabels.join(', ')}.`);
  }

  explanations.push(
    'Bu skor kritik alerjen uyarilarinin yerine gecmez; alerjen eslesmeleri ayri guvenlik uyarisi olarak degerlendirilmelidir.',
  );

  return explanations;
}

export function calculateContentScore(
  input: ContentScoreInput,
): ContentScoreResult {
  const ingredientClarity = getIngredientClarityPoints(input);
  const additiveRisk = getAdditiveRiskPoints(input);
  const allergenTransparency = getAllergenTransparencyPoints(input);
  const processingHint = getProcessingHintPoints(input);
  const palmOil = getPalmOilPoints(input);

  const components = [
    {
      label: 'Icerik listesi acikligi',
      value: ingredientClarity,
      weight: CONTENT_SCORE_WEIGHTS.ingredientClarity,
    },
    {
      label: 'Katki riski',
      value: additiveRisk,
      weight: CONTENT_SCORE_WEIGHTS.additiveRisk,
    },
    {
      label: 'Alerjen bilgi seffafligi',
      value: allergenTransparency,
      weight: CONTENT_SCORE_WEIGHTS.allergenTransparency,
    },
    {
      label: 'Islenmislik ipucu',
      value: processingHint,
      weight: CONTENT_SCORE_WEIGHTS.processingHint,
    },
    {
      label: 'Palm yagi bilgisi',
      value: palmOil,
      weight: CONTENT_SCORE_WEIGHTS.palmOil,
    },
  ];

  const availableComponents = components.filter(
    (component): component is typeof component & { value: number } =>
      component.value !== null,
  );

  const availableCount = availableComponents.length;
  const status = getStatus(availableCount);

  const availableWeightTotal = availableComponents.reduce(
    (sum, component) => sum + component.weight,
    0,
  );

  const weightedTotal = availableComponents.reduce(
    (sum, component) => sum + component.value * component.weight,
    0,
  );

  const score =
    availableWeightTotal > 0 ? clampScore(weightedTotal / availableWeightTotal) : null;

  const availableLabels = availableComponents.map((component) => component.label);
  const missingLabels = components
    .filter((component) => component.value === null)
    .map((component) => component.label);

  return {
    score,
    status,
    confidence: getConfidence(availableCount),
    label: getLabel(score, status),
    factors: {
      ingredientClarity: ingredientClarity ?? 0,
      additiveRisk: additiveRisk ?? 0,
      allergenTransparency: allergenTransparency ?? 0,
      processingHint: processingHint ?? 0,
      palmOil: palmOil ?? 0,
    },
    explanations: buildExplanations(status, availableLabels, missingLabels),
    disclaimer: CONTENT_SCORE_DISCLAIMER,
  };
}
