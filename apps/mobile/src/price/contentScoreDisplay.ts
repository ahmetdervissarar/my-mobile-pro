import type { ContentScoreResult } from './types';

export function getContentScoreDisplayValue(
  contentScore?: ContentScoreResult | null,
): string {
  if (!contentScore) return 'Hazırlanıyor';

  if (contentScore.status === 'unavailable' || contentScore.score === null) {
    return 'Hazırlanıyor';
  }

  return `${contentScore.score}/100`;
}

export function getContentScoreStatusText(
  contentScore?: ContentScoreResult | null,
): string {
  if (!contentScore) {
    return 'İçerik/Alerjen skoru için veri bekleniyor.';
  }

  if (contentScore.status === 'ready') {
    return contentScore.label;
  }

  if (contentScore.status === 'partial') {
    return 'İçerik/Alerjen skoru bazı veri eksikleriyle hesaplandı.';
  }

  return 'İçerik/Alerjen skoru şu anda hesaplanamadı.';
}

export function getContentScoreConfidenceText(
  contentScore?: ContentScoreResult | null,
): string {
  if (!contentScore) return 'Güven: Bekleniyor';

  if (contentScore.confidence === 'high') return 'Güven: Yüksek';
  if (contentScore.confidence === 'medium') return 'Güven: Orta';

  return 'Güven: Düşük';
}
