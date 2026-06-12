import {
  HEALTH_SCORE_DISCLAIMER,
  HEALTH_SCORE_WEIGHTS,
  NOVA_POINTS,
  NUTRI_SCORE_POINTS,
  TRAFFIC_LIGHT_POINTS,
} from './rules.js';
import type {
  HealthScoreConfidence,
  HealthScoreInput,
  HealthScoreResult,
  HealthScoreStatus,
} from './types.js';

type TrafficLightValue = 'low' | 'medium' | 'high';

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getNutriScorePoints(input: HealthScoreInput): number | null {
  if (!input.nutriScoreGrade) return null;
  return NUTRI_SCORE_POINTS[input.nutriScoreGrade] ?? null;
}

function getNovaPoints(input: HealthScoreInput): number | null {
  if (input.novaGroup === null || input.novaGroup === undefined) return null;
  return NOVA_POINTS[input.novaGroup] ?? null;
}

function isTrafficLightValue(value: unknown): value is TrafficLightValue {
  return value === 'low' || value === 'medium' || value === 'high';
}

function getTrafficLightPoints(input: HealthScoreInput): number | null {
  if (!input.trafficLight) return null;

  const values = [
    input.trafficLight.sugar,
    input.trafficLight.salt,
    input.trafficLight.saturatedFat,
    input.trafficLight.fat,
  ].filter(isTrafficLightValue);

  if (values.length === 0) return null;

  const total = values.reduce(
    (sum, value) => sum + TRAFFIC_LIGHT_POINTS[value],
    0,
  );

  return total / values.length;
}

function getStatus(availableCount: number): HealthScoreStatus {
  if (availableCount === 0) return 'unavailable';
  if (availableCount < 3) return 'partial';
  return 'ready';
}

function getConfidence(availableCount: number): HealthScoreConfidence {
  if (availableCount >= 3) return 'high';
  if (availableCount >= 2) return 'medium';
  return 'low';
}

function getLabel(score: number | null, status: HealthScoreStatus): string {
  if (status === 'unavailable') return 'Hesaplanamadi';
  if (score === null) return 'Veri eksik';
  if (score >= 80) return 'Daha saglikli secim';
  if (score >= 60) return 'Orta duzey';
  if (score >= 40) return 'Dikkatli tuketim';
  return 'Sinirli tuketim onerilir';
}

function getGrade(score: number | null): HealthScoreResult['grade'] {
  if (score === null) return null;
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'E';
}

function buildExplanations(
  status: HealthScoreStatus,
  availableLabels: string[],
  missingLabels: string[],
): string[] {
  if (status === 'unavailable') {
    return [
      'Nutri-Score, NOVA veya Traffic Light verisi bulunamadigi icin saglik skoru hesaplanamadi.',
    ];
  }

  const explanations = [
    `Saglik skoru icin kullanilan bilesenler: ${availableLabels.join(', ')}.`,
  ];

  if (missingLabels.length > 0) {
    explanations.push(`Eksik bilesenler: ${missingLabels.join(', ')}.`);
  }

  explanations.push(
    'Agirliklandirma: Nutri-Score %45, NOVA %30, Traffic Light %25.',
  );

  return explanations;
}

export function calculateHealthScore(
  input: HealthScoreInput,
): HealthScoreResult {
  const nutriScore = getNutriScorePoints(input);
  const nova = getNovaPoints(input);
  const trafficLight = getTrafficLightPoints(input);

  const components = [
    {
      label: 'Nutri-Score',
      value: nutriScore,
      weight: HEALTH_SCORE_WEIGHTS.nutriScore,
    },
    {
      label: 'NOVA',
      value: nova,
      weight: HEALTH_SCORE_WEIGHTS.nova,
    },
    {
      label: 'Traffic Light',
      value: trafficLight,
      weight: HEALTH_SCORE_WEIGHTS.trafficLight,
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
    grade: getGrade(score),
    factors: {
      nutriScore: nutriScore ?? 0,
      nova: nova ?? 0,
      trafficLight: trafficLight ?? 0,
      category: 0,
    },
    explanations: buildExplanations(status, availableLabels, missingLabels),
    disclaimer: HEALTH_SCORE_DISCLAIMER,
  };
}