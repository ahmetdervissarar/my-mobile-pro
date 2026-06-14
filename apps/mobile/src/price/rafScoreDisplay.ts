import type { RafScoreResult } from './types';

function isPriceComponentMissing(rafScore: RafScoreResult): boolean {
  const priceComponent = rafScore.components.find((component) => component.key === 'price');

  return Boolean(
    priceComponent &&
      (!priceComponent.isAvailable || priceComponent.score === null),
  );
}

export function getRafScoreDisplayValue(rafScore?: RafScoreResult | null): string {
  if (!rafScore) return 'Hazırlanıyor';

  if (rafScore.status === 'unavailable' || rafScore.score === null) {
    return 'Eksik';
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
    if (isPriceComponentMissing(rafScore)) {
      return 'Fiyat verisi eksik olduğu için genel RafSkoru henüz tamamlanmadı.';
    }

    return 'Genel RafSkoru için bazı bileşenler henüz eksik.';
  }

  return 'Genel RafSkoru şu anda hesaplanamadı.';
}

export function getRafScoreConfidenceText(rafScore?: RafScoreResult | null): string {
  if (!rafScore) return 'Güven düzeyi: Bekleniyor';

  if (rafScore.status === 'partial' && isPriceComponentMissing(rafScore)) {
    return 'Sağlık, içerik ve sürdürülebilirlik analizleri yine gösterilebilir.';
  }

  if (rafScore.confidence === 'high') return 'Güven düzeyi: Yüksek';
  if (rafScore.confidence === 'medium') return 'Güven düzeyi: Orta';

  return 'Güven düzeyi: Düşük';
}