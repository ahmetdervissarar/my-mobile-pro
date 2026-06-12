import type { HealthScoreResult } from './types';

export function getHealthScoreDisplayValue(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore) return 'Hazırlanıyor';

  if (healthScore.status === 'unavailable' || healthScore.score === null) {
    return 'Hazırlanıyor';
  }

  return `${healthScore.score}/100`;
}

export function getHealthScoreStatusText(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore) {
    return 'Sağlık skoru için veri bekleniyor.';
  }

  if (healthScore.status === 'ready') {
    return healthScore.label;
  }

  if (healthScore.status === 'partial') {
    return 'Sağlık skoru bazı veri eksikleriyle hesaplandı.';
  }

  return 'Sağlık skoru şu anda hesaplanamadı.';
}

export function getHealthScoreConfidenceText(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore) return 'Güven: Bekleniyor';

  if (healthScore.confidence === 'high') return 'Güven: Yüksek';
  if (healthScore.confidence === 'medium') return 'Güven: Orta';

  return 'Güven: Düşük';
}

export function getHealthScoreGradeText(
  healthScore?: HealthScoreResult | null,
): string {
  if (!healthScore?.grade) return 'Derece: Bekleniyor';

  return `Derece: ${healthScore.grade}`;
}
