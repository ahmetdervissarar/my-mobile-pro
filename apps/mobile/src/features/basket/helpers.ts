/**
 * RafSkoru — Sepet Yardımcı Fonksiyonları
 * src/features/basket/helpers.ts
 *
 * apps/mobile/app/basket-result.tsx içindeki biçimlendirme mantığından
 * uyarlanmıştır (bkz. görev raporu). Backend sepet sözleşmesi
 * (src/api/basketClient.ts) değiştirilmez; bu dosya yalnızca sunum katmanıdır.
 */

import type { BasketEvaluateResponse, BasketMarketEvaluation } from '../../api/basketClient';
import { CRITICAL_ALLERGEN_CODES } from '../../riskEngine/criticalAllergenCodes';

export function formatScore(value: number | null | undefined): string {
  return typeof value === 'number' ? `${Math.round(value)}` : '—';
}

export function formatCoverage(value: BasketEvaluateResponse['basketProfile']['coverage']): string {
  if (value === 'full') return 'Tam';
  if (value === 'partial') return 'Kısmi';
  return 'Veri bekleniyor';
}

export function formatMarketStatus(value: BasketEvaluateResponse['marketEvaluations']['status']): string {
  if (value === 'real') return 'Gerçek veri';
  if (value === 'demo') return 'Beta fiyat verisi';
  return 'Veri yetersiz';
}

export function getMarketStatusMessage(
  marketEvaluations: BasketEvaluateResponse['marketEvaluations'],
): string {
  if (marketEvaluations.status === 'real') {
    return 'Market fiyatı ve bulunurluk verisi bağlı. Tam kapsamlı marketler karşılaştırılıyor.';
  }

  if (marketEvaluations.status === 'demo') {
    return 'Bu bölüm beta fiyat verisiyle çalışıyor. Eksik ürün olan marketler en ucuz market olarak seçilmez.';
  }

  return marketEvaluations.insufficientDataReason ?? 'Hiçbir market sepetin tamamı için yeterli fiyat verisi sunmadı.';
}

export function formatPriceEstimate(market: BasketMarketEvaluation): string {
  if (!market.priceEstimate) {
    return 'Tam sepet fiyatı yok';
  }

  const formatted = market.priceEstimate.amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} TL`;
}

export function formatAvailability(market: BasketMarketEvaluation): string {
  return `${market.availability.available}/${market.availability.total} ürün fiyatlandı`;
}

export function sortMarketsForDisplay(markets: BasketMarketEvaluation[]): BasketMarketEvaluation[] {
  return [...markets].sort((a, b) => {
    const aHasFullPrice = a.priceEstimate ? 1 : 0;
    const bHasFullPrice = b.priceEstimate ? 1 : 0;

    if (aHasFullPrice !== bHasFullPrice) {
      return bHasFullPrice - aHasFullPrice;
    }

    const aPrice = a.priceEstimate?.amount ?? Number.POSITIVE_INFINITY;
    const bPrice = b.priceEstimate?.amount ?? Number.POSITIVE_INFINITY;

    if (aPrice !== bPrice) {
      return aPrice - bPrice;
    }

    return a.name.localeCompare(b.name, 'tr-TR');
  });
}

/**
 * Profil ile çakışan kritik alerjen uyarısı olan ürün sayısı — yalnızca
 * backend'in bu ürün için ürettiği riskFlags kodlarından okunur (tahmin
 * yok). Bugün demo ürün kayıtlarının çoğu riskFlags=[] döndürür; bu
 * "alerjen yok" anlamına gelmez, yalnızca "bu kayıt için uyarı üretilmedi"
 * demektir — bu yüzden UI'da her zaman açık bir uyarı notu eşlik eder.
 */
export function countCriticalAllergenItems(perItem: BasketEvaluateResponse['basketProfile']['perItem']): number {
  return perItem.filter((item) => item.riskFlags.some((flag) => CRITICAL_ALLERGEN_CODES.includes(flag))).length;
}

export function hasCriticalAllergenFlag(riskFlags: string[]): boolean {
  return riskFlags.some((flag) => CRITICAL_ALLERGEN_CODES.includes(flag));
}
