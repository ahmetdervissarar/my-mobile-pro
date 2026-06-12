import {
  PRICE_SCORE_AVERAGE_THRESHOLD,
  PRICE_SCORE_DISCLAIMER,
  PRICE_SCORE_GOOD_THRESHOLD,
  PRICE_SCORE_HIGH_THRESHOLD,
} from './rules.js';
import type {
  PriceScoreConfidence,
  PriceScoreInput,
  PriceScoreResult,
  PriceScoreStatus,
} from './types.js';

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getReferencePrice(input: PriceScoreInput): number | null {
  if (input.referencePrice !== null && input.referencePrice !== undefined) {
    return input.referencePrice;
  }

  if (
    input.lowestPrice !== null &&
    input.lowestPrice !== undefined &&
    input.highestPrice !== null &&
    input.highestPrice !== undefined
  ) {
    return (input.lowestPrice + input.highestPrice) / 2;
  }

  return null;
}

function getStatus(productPrice: number | null, referencePrice: number | null): PriceScoreStatus {
  if (productPrice === null) return 'unavailable';
  if (referencePrice === null) return 'partial';
  return 'ready';
}

function getConfidence(input: PriceScoreInput, status: PriceScoreStatus): PriceScoreConfidence {
  if (status !== 'ready') return 'low';

  const offerCount = input.offerCount ?? 0;

  if (offerCount >= 5) return 'high';
  if (offerCount >= 2) return 'medium';

  return 'low';
}

function getLabel(priceRatio: number | null): string {
  if (priceRatio === null) return 'Hesaplanamadi';
  if (priceRatio <= PRICE_SCORE_GOOD_THRESHOLD) return 'Avantajli fiyat';
  if (priceRatio <= PRICE_SCORE_AVERAGE_THRESHOLD) return 'Ortalama fiyat';
  if (priceRatio <= PRICE_SCORE_HIGH_THRESHOLD) return 'Yuksek fiyat';
  return 'Cok yuksek fiyat';
}

function buildExplanations(status: PriceScoreStatus, priceRatio: number | null): string[] {
  if (status === 'unavailable') {
    return ['Fiyat bilgisi bulunamadigi icin fiyat skoru hesaplanamadi.'];
  }

  if (status === 'partial') {
    return ['Referans fiyat veya karsilastirma araligi eksik oldugu icin fiyat skoru hazir degil.'];
  }

  if (priceRatio === null) {
    return ['Fiyat orani hesaplanamadi.'];
  }

  return [`Urun fiyati referans fiyatin yaklasik ${priceRatio.toFixed(2)} kati olarak hesaplandi.`];
}

export function calculatePriceScore(input: PriceScoreInput): PriceScoreResult {
  const productPrice = input.productPrice;
  const referencePrice = getReferencePrice(input);
  const status = getStatus(productPrice, referencePrice);

  const priceRatio =
    status === 'ready' && productPrice !== null && referencePrice !== null && referencePrice > 0
      ? productPrice / referencePrice
      : null;

  const score =
    priceRatio !== null
      ? clampScore(100 - Math.max(0, priceRatio - PRICE_SCORE_GOOD_THRESHOLD) * 250)
      : null;

  return {
    score,
    status,
    confidence: getConfidence(input, status),
    label: getLabel(priceRatio),
    explanations: buildExplanations(status, priceRatio),
    reference: {
      productPrice,
      referencePrice,
      lowestPrice: input.lowestPrice ?? null,
      highestPrice: input.highestPrice ?? null,
      offerCount: input.offerCount ?? 0,
    },
    disclaimer: PRICE_SCORE_DISCLAIMER,
  };
}