import type { ContentScoreResult } from './types';

export function getContentScoreDisplayValue(
  contentScore?: ContentScoreResult | null,
): string {
  if (!contentScore) return 'Haz\u0131rlan\u0131yor';

  if (contentScore.status === 'unavailable') {
    return 'Hesaplanamad\u0131';
  }

  if (contentScore.score === null) {
    return 'Eksik';
  }

  return `${contentScore.score}/100`;
}

export function getContentScoreStatusText(
  contentScore?: ContentScoreResult | null,
): string {
  if (!contentScore) {
    return '\u0130\u00e7erik/Alerjen skoru i\u00e7in veri bekleniyor.';
  }

  if (contentScore.status === 'ready') {
    return contentScore.label;
  }

  if (contentScore.status === 'partial') {
    return '\u0130\u00e7erik/Alerjen skoru eksik veriyle hesapland\u0131. \u0130\u00e7erik, katk\u0131 veya alerjen bilgisi eksik olabilir.';
  }

  return '\u0130\u00e7erik/Alerjen skoru \u015fu anda hesaplanamad\u0131. \u00dcr\u00fcn etiketi kontrol edilmelidir.';
}

export function getContentScoreConfidenceText(
  contentScore?: ContentScoreResult | null,
): string {
  if (!contentScore) return 'G\u00fcven d\u00fczeyi: Bekleniyor';

  if (contentScore.status === 'unavailable') return 'G\u00fcven d\u00fczeyi: Yok';
  if (contentScore.confidence === 'high') return 'G\u00fcven d\u00fczeyi: Y\u00fcksek';
  if (contentScore.confidence === 'medium') return 'G\u00fcven d\u00fczeyi: Orta';

  return 'G\u00fcven d\u00fczeyi: D\u00fc\u015f\u00fck';
}
