import type { RafScoreResult } from './types';

export function getRafScoreDisplayValue(rafScore?: RafScoreResult | null): string {
  if (!rafScore) return 'Hazırlanıyor';

  if (rafScore.status !== 'ready' || rafScore.score === null) {
    return 'Hazırlanıyor';
  }

  return `${rafScore.score}/100`;
}

export function getRafScoreStatusText(rafScore?: RafScoreResult | null): string {
  if (!rafScore) {
    return 'RafSkoru için veri bekleniyor.';
  }

  if (rafScore.status === 'ready') {
    return 'Fiyat, sağlık, içerik/alerjen ve sürdürülebilirlik birlikte hesaplandı.';
  }

  if (rafScore.status === 'partial') {
    return 'Genel RafSkoru için bazı bileşenler henüz eksik.';
  }

  return 'Genel RafSkoru şu anda hesaplanamadı.';
}

export function getRafScoreConfidenceText(rafScore?: RafScoreResult | null): string {
  if (!rafScore) return 'Güven düzeyi: Bekleniyor';

  if (rafScore.confidence === 'high') return 'Güven düzeyi: Yüksek';
  if (rafScore.confidence === 'medium') return 'Güven düzeyi: Orta';

  return 'Güven düzeyi: Düşük';
}