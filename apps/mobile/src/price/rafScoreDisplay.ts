import type { RafScoreResult } from './types';

function isPriceComponentMissing(rafScore: RafScoreResult): boolean {
  const priceComponent = rafScore.components.find((component) => component.key === 'price');

  return Boolean(
    priceComponent &&
      (!priceComponent.isAvailable || priceComponent.score === null),
  );
}

export function getRafScoreDisplayValue(rafScore?: RafScoreResult | null): string {
  if (!rafScore) return 'Haz\u0131rlan\u0131yor';

  if (rafScore.status === 'unavailable') {
    return 'Hesaplanamad\u0131';
  }

  if (rafScore.score === null) {
    return 'Eksik';
  }

  return `${rafScore.score}/100`;
}

export function getRafScoreStatusText(rafScore?: RafScoreResult | null): string {
  if (!rafScore) {
    return 'RafSkoru i\u00e7in veri bekleniyor.';
  }

  if (rafScore.status === 'ready') {
    return 'Fiyat, sa\u011fl\u0131k, i\u00e7erik/alerjen ve s\u00fcrd\u00fcr\u00fclebilirlik birlikte hesapland\u0131.';
  }

  if (rafScore.status === 'partial') {
    if (isPriceComponentMissing(rafScore)) {
      return 'Fiyat verisi eksik oldu\u011fu i\u00e7in genel RafSkoru eksik hesapland\u0131.';
    }

    return 'Genel RafSkoru eksik veriyle hesapland\u0131.';
  }

  return 'Genel RafSkoru \u015fu anda hesaplanamad\u0131.';
}

export function getRafScoreConfidenceText(rafScore?: RafScoreResult | null): string {
  if (!rafScore) return 'G\u00fcven d\u00fczeyi: Bekleniyor';

  if (rafScore.status === 'partial' && isPriceComponentMissing(rafScore)) {
    return 'Sa\u011fl\u0131k, i\u00e7erik/alerjen ve s\u00fcrd\u00fcr\u00fclebilirlik analizleri ayr\u0131ca g\u00f6sterilebilir.';
  }

  if (rafScore.status === 'unavailable') return 'G\u00fcven d\u00fczeyi: Yok';
  if (rafScore.confidence === 'high') return 'G\u00fcven d\u00fczeyi: Y\u00fcksek';
  if (rafScore.confidence === 'medium') return 'G\u00fcven d\u00fczeyi: Orta';

  return 'G\u00fcven d\u00fczeyi: D\u00fc\u015f\u00fck';
}
