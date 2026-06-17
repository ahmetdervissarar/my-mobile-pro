import type { PriceScoreResult } from './types';

export function getPriceScoreDisplayValue(
  priceScore?: PriceScoreResult | null,
): string {
  if (!priceScore) return 'Haz\u0131rlan\u0131yor';

  if (priceScore.status === 'unavailable') {
    return 'Bulunamad\u0131';
  }

  if (priceScore.score === null) {
    return 'Eksik';
  }

  return `${priceScore.score}/100`;
}

export function getPriceScoreStatusText(
  priceScore?: PriceScoreResult | null,
): string {
  if (!priceScore) {
    return 'Fiyat skoru i\u00e7in veri bekleniyor.';
  }

  if (priceScore.status === 'ready') {
    return priceScore.label;
  }

  if (priceScore.status === 'partial') {
    return 'Fiyat skoru eksik veriyle hesapland\u0131. Kar\u015f\u0131la\u015ft\u0131rma verisi s\u0131n\u0131rl\u0131 olabilir.';
  }

  return 'Fiyat skoru \u015fu anda hesaplanamad\u0131. G\u00fcncel fiyat veya kar\u015f\u0131la\u015ft\u0131rma verisi bulunamad\u0131.';
}

export function getPriceScoreConfidenceText(
  priceScore?: PriceScoreResult | null,
): string {
  if (!priceScore) return 'G\u00fcven d\u00fczeyi: Bekleniyor';

  if (priceScore.status === 'unavailable') return 'G\u00fcven d\u00fczeyi: Yok';
  if (priceScore.confidence === 'high') return 'G\u00fcven d\u00fczeyi: Y\u00fcksek';
  if (priceScore.confidence === 'medium') return 'G\u00fcven d\u00fczeyi: Orta';

  return 'G\u00fcven d\u00fczeyi: D\u00fc\u015f\u00fck';
}
