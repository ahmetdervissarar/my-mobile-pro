import type { PriceScoreResult } from './types';

export function getPriceScoreDisplayValue(
  priceScore?: PriceScoreResult | null,
): string {
  if (!priceScore) return 'Hazırlanıyor';

  if (priceScore.status !== 'ready' || priceScore.score === null) {
    return 'Hazırlanıyor';
  }

  return `${priceScore.score}/100`;
}

export function getPriceScoreStatusText(
  priceScore?: PriceScoreResult | null,
): string {
  if (!priceScore) {
    return 'Fiyat skoru için veri bekleniyor.';
  }

  if (priceScore.status === 'ready') {
    return priceScore.label;
  }

  if (priceScore.status === 'partial') {
    return 'Fiyat skoru için karşılaştırma verisi eksik.';
  }

  return 'Fiyat skoru şu anda hesaplanamadı.';
}

export function getPriceScoreConfidenceText(
  priceScore?: PriceScoreResult | null,
): string {
  if (!priceScore) return 'Güven düzeyi: Bekleniyor';

  if (priceScore.confidence === 'high') return 'Güven düzeyi: Yüksek';
  if (priceScore.confidence === 'medium') return 'Güven düzeyi: Orta';

  return 'Güven düzeyi: Düşük';
}