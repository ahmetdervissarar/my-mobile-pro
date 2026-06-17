import type { HealthScoreResult } from './types';

export function getHealthScoreDisplayValue(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore) return 'Haz\u0131rlan\u0131yor';

  if (healthScore.status === 'unavailable') {
    return 'Hesaplanamad\u0131';
  }

  if (healthScore.score === null) {
    return 'Eksik';
  }

  return `${healthScore.score}/100`;
}

export function getHealthScoreStatusText(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore) {
    return 'Sa\u011fl\u0131k skoru i\u00e7in veri bekleniyor.';
  }

  if (healthScore.status === 'ready') {
    return healthScore.label;
  }

  if (healthScore.status === 'partial') {
    return 'Sa\u011fl\u0131k skoru eksik veriyle hesapland\u0131. Eksik besin verileri olabilir.';
  }

  return 'Sa\u011fl\u0131k skoru \u015fu anda hesaplanamad\u0131. Nutri-Score, NOVA veya Traffic Light verisi eksik olabilir.';
}

export function getHealthScoreConfidenceText(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore) return 'G\u00fcven d\u00fczeyi: Bekleniyor';

  if (healthScore.status === 'unavailable') return 'G\u00fcven d\u00fczeyi: Yok';
  if (healthScore.confidence === 'high') return 'G\u00fcven d\u00fczeyi: Y\u00fcksek';
  if (healthScore.confidence === 'medium') return 'G\u00fcven d\u00fczeyi: Orta';

  return 'G\u00fcven d\u00fczeyi: D\u00fc\u015f\u00fck';
}

export function getHealthScoreGradeText(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore?.grade) return 'Derece: Hesaplanamad\u0131';

  return `Derece: ${healthScore.grade}`;
}
