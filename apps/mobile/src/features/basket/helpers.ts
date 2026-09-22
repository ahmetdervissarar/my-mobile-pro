/**
 * RafSkoru — Sepet Yardımcı Fonksiyonları
 * src/features/basket/helpers.ts
 *
 * apps/mobile/app/basket-result.tsx içindeki biçimlendirme mantığından
 * uyarlanmıştır (bkz. görev raporu). Backend sepet sözleşmesi
 * (src/api/basketClient.ts) değiştirilmez; bu dosya yalnızca sunum katmanıdır.
 */

import type { BasketEvaluateResponse, BasketMarketEvaluation } from '../../api/basketClient';
import { getCatalogAllergenChipStatus } from '../../riskEngine/catalogAllergenChip';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';

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

export interface BasketAllergenSummary {
  /** declared_contains veya trace_may_contain (içindekiler eşleşmesi dahil) olan ürün sayısı. */
  conflictCount: number;
  /** unknown_or_unverified olan (hiç alerjen verisi olmayan) ürün sayısı. */
  noDataCount: number;
  headline: string;
  tone: 'danger' | 'warning' | 'neutral';
}

/**
 * Sepetteki her ürünü, arama ve ürün satırlarıyla AYNI birleştirme
 * fonksiyonuyla (getCatalogAllergenChipStatus) profille karşılaştırır —
 * eski riskFlags/CRITICAL_ALLERGEN_CODES yoluna artık dokunmaz (o yol
 * kullanıcı profiline hiç bakmıyordu, bkz. görev raporu: "tespit edilmedi"
 * hatası). "Tespit edilmedi" ifadesi yalnız TÜM ürünler present VE hiç
 * çakışma yoksa kullanılır; en az bir üründe veri yoksa asla kullanılmaz.
 */
export function summarizeBasketAllergenStatus(
  perItem: BasketEvaluateResponse['basketProfile']['perItem'],
  userProfile: UserSensitivityProfile,
): BasketAllergenSummary {
  if (userProfile.allergens.length === 0) {
    return {
      conflictCount: 0,
      noDataCount: 0,
      headline: 'Alerjen profili tanımlı değil — Profilim üzerinden ekleyebilirsiniz.',
      tone: 'neutral',
    };
  }

  let conflictCount = 0;
  let noDataCount = 0;

  for (const item of perItem) {
    const chip = getCatalogAllergenChipStatus(item.allergenData, userProfile);
    if (chip.status === 'declared_contains' || chip.status === 'trace_may_contain') {
      conflictCount++;
    } else if (chip.status === 'unknown_or_unverified') {
      noDataCount++;
    }
  }

  if (conflictCount > 0) {
    return {
      conflictCount,
      noDataCount,
      headline: `${conflictCount} üründe profilinizle çakışan alerjen var`,
      tone: 'danger',
    };
  }

  if (noDataCount > 0) {
    return {
      conflictCount,
      noDataCount,
      headline: `${noDataCount} üründe alerjen verisi yok — etiketi kontrol edin`,
      tone: 'warning',
    };
  }

  return {
    conflictCount,
    noDataCount,
    headline: 'Mevcut verilerde profil alerjeniniz belirtilmemiş — bu bir garanti değildir',
    tone: 'neutral',
  };
}
