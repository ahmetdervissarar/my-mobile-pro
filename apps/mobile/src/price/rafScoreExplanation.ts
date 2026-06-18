import type { PriceResolveResponse } from './types';

function getRafScoreComponentLabel(key: string): string {
  if (key === 'price') return 'Fiyat';
  if (key === 'health') return 'Sağlık';
  if (key === 'content') return 'İçerik/alerjen';
  if (key === 'sustainability') return 'Sürdürülebilirlik';
  return key;
}

function formatRafScoreComponentWeight(weight: number): string {
  const percent = weight <= 1 ? weight * 100 : weight;
  return `%${Math.round(percent)}`;
}

export function getRafScoreExplanationItems(priceResult: PriceResolveResponse['result']): string[] {
  const rafScore = priceResult.rafScore;

  if (!rafScore) {
    return [];
  }

  if (rafScore.status === 'unavailable') {
    return ['Bu ürün için RafSkoru hesaplanamadı; fiyat veya ürün analiz verisi eksik olabilir.'];
  }

  const componentItems = rafScore.components.slice(0, 4).map((component) => {
    const scoreText =
      typeof component.score === 'number' ? `${Math.round(component.score)}/100` : 'veri eksik';
    const availabilityText = component.isAvailable ? '' : ' (kısmi/veri yok)';

    return `${getRafScoreComponentLabel(component.key)}: ${scoreText}, genel skordaki ağırlık ${formatRafScoreComponentWeight(component.weight)}${availabilityText}.`;
  });

  return [...rafScore.explanations.slice(0, 2), ...componentItems].slice(0, 5);
}
