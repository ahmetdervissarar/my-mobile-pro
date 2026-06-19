import type { PriceResolveResponse, RafScoreReason } from './types';

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

function getReasonParamText(
  reason: RafScoreReason,
  key: string,
): string | null {
  const value = reason.params?.[key];

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(Math.round(value));
  if (typeof value === 'boolean') return value ? 'evet' : 'hayır';

  return null;
}

function getUnknownReasonFallback(reason: RafScoreReason): string | null {
  if (reason.severity === 'positive' || reason.severity === 'neutral') {
    return null;
  }

  const fallbackMessage = reason.message?.trim();

  if (fallbackMessage) {
    return fallbackMessage;
  }

  if (reason.severity === 'negative') {
    return 'Bu üründe skoru düşüren bir bileşen var; detaylar backend değerlendirmesine göre gösteriliyor.';
  }

  return 'Bu üründe dikkat edilmesi gereken bir veri veya skor noktası var.';
}

function formatKnownReason(reason: RafScoreReason): string | null {
  const label = getReasonParamText(reason, 'label');

  if (reason.code === 'price_missing') {
    return 'Fiyat verisi bulunamadı; fiyat bileşeni kısmi yorumlanır.';
  }

  if (reason.code === 'price_live_available') {
    return 'Canlı fiyat verisi bulundu; fiyat bileşeni daha güncel veriyle hesaplandı.';
  }

  if (reason.code === 'price_recent') {
    return 'Fiyat verisi son bilinen/veri tarihiyle yorumlanır; satın alma öncesinde güncel market fiyatını kontrol edin.';
  }

  if (reason.code === 'price_beta_reference') {
    return 'Fiyat bileşeni beta referans verisiyle hesaplandı; güncel market fiyatı farklı olabilir.';
  }

  if (reason.code === 'allergen_data_unknown') {
    return 'Alerjen verisi eksik; ürün etiketi esas alınmalıdır.';
  }

  if (reason.code === 'allergen_structured_present') {
    return 'Yapılandırılmış alerjen bilgisi bulundu; profil eşleşmesi ayrı uyarı alanında değerlendirilir.';
  }

  if (reason.code === 'data_low_confidence') {
    return 'Veri güveni düşük; skor yardımcı gösterge olarak değerlendirilmelidir.';
  }

  if (reason.code.endsWith('_component_missing')) {
    return `${label ?? 'Bir skor bileşeni'} için veri eksik; genel skor kısmi hesaplanır.`;
  }

  if (reason.code.endsWith('_low_score')) {
    return `${label ?? 'Bir skor bileşeni'} düşük puan aldı ve genel RafSkoru aşağı çekti.`;
  }

  if (reason.code.endsWith('_high_score')) {
    return `${label ?? 'Bir skor bileşeni'} yüksek puan aldı ve genel RafSkoru destekledi.`;
  }

  if (reason.code === 'raf_score_unavailable') {
    return 'Bu ürün için RafSkoru hesaplanamadı; fiyat veya ürün analiz verisi eksik olabilir.';
  }

  return getUnknownReasonFallback(reason);
}

function getRafScoreReasonItems(reasons: RafScoreReason[] | undefined): string[] {
  if (!reasons?.length) {
    return [];
  }

  return reasons
    .map(formatKnownReason)
    .filter((item): item is string => Boolean(item))
    .slice(0, 5);
}

export function getRafScoreExplanationItems(priceResult: PriceResolveResponse['result']): string[] {
  const rafScore = priceResult.rafScore;

  if (!rafScore) {
    return [];
  }

  const reasonItems = getRafScoreReasonItems(rafScore.reasons);

  if (rafScore.status === 'unavailable') {
    return reasonItems.length > 0
      ? reasonItems
      : ['Bu ürün için RafSkoru hesaplanamadı; fiyat veya ürün analiz verisi eksik olabilir.'];
  }

  const componentItems = rafScore.components.slice(0, 4).map((component) => {
    const scoreText =
      typeof component.score === 'number' ? `${Math.round(component.score)}/100` : 'veri eksik';
    const availabilityText = component.isAvailable ? '' : ' (kısmi/veri yok)';

    return `${getRafScoreComponentLabel(component.key)}: ${scoreText}, genel skordaki ağırlık ${formatRafScoreComponentWeight(component.weight)}${availabilityText}.`;
  });

  if (reasonItems.length > 0) {
    return [...reasonItems, ...componentItems].slice(0, 5);
  }

  return [...rafScore.explanations.slice(0, 2), ...componentItems].slice(0, 5);
}
