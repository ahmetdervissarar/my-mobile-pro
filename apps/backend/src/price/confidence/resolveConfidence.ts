import type { PriceResult } from '../types.js';
import type { DataConfidenceLevel, DataConfidenceResult } from './types.js';

function hasPriceData(result: PriceResult): boolean {
  return result.price !== null && result.status !== 'unavailable';
}

function hasOfferData(result: PriceResult): boolean {
  return Boolean(
    result.bestOffer ||
      (result.offers && result.offers.length > 0) ||
      (result.marketPrices && result.marketPrices.length > 0),
  );
}

function resolveProductFactsLevel(result: PriceResult): {
  level: DataConfidenceLevel;
  reason: string;
} {
  const facts = result.productFacts;

  if (!facts) {
    return {
      level: 'low',
      reason: 'Ürün içerik verisi bulunamadı.',
    };
  }

  if (facts.verificationNeeded || facts.confidence === 'low') {
    return {
      level: 'low',
      reason: 'Ürün verisi doğrulama gerektiriyor.',
    };
  }

  if (facts.isComplete && facts.confidence === 'high') {
    return {
      level: 'high',
      reason: 'Ürün verisi yüksek güven düzeyinde.',
    };
  }

  return {
    level: 'medium',
    reason: 'Ürün verisi kısmen tamamlanmış.',
  };
}

function resolvePriceLevel(result: PriceResult): {
  level: DataConfidenceLevel;
  reason: string;
} {
  if (!hasPriceData(result)) {
    return {
      level: 'low',
      reason: 'Fiyat verisi bulunamadı.',
    };
  }

  if (result.status === 'live' && result.confidence >= 0.7 && hasOfferData(result)) {
    return {
      level: 'high',
      reason: 'Fiyat verisi güncel ve destekleyici teklif içeriyor.',
    };
  }

  if (result.status === 'last_known') {
    return {
      level: 'medium',
      reason: 'Fiyat verisi son bilinen kayıt düzeyinde.',
    };
  }

  if (result.status === 'manual_beta' || result.status === 'beta_reference') {
    return {
      level: 'medium',
      reason: 'Fiyat verisi beta veya referans kaynaklı.',
    };
  }

  return {
    level: result.confidence >= 0.5 ? 'medium' : 'low',
    reason: 'Fiyat verisinin güven düzeyi sınırlı.',
  };
}

function combineLevels(
  productFactsLevel: DataConfidenceLevel,
  priceLevel: DataConfidenceLevel,
): DataConfidenceLevel {
  if (productFactsLevel === 'low' || priceLevel === 'low') {
    return 'low';
  }

  if (productFactsLevel === 'high' && priceLevel === 'high') {
    return 'high';
  }

  return 'medium';
}

export function resolveDataConfidence(result: PriceResult): DataConfidenceResult {
  const productFactsConfidence = resolveProductFactsLevel(result);
  const priceConfidence = resolvePriceLevel(result);

  return {
    level: combineLevels(productFactsConfidence.level, priceConfidence.level),
    reasons: [productFactsConfidence.reason, priceConfidence.reason],
  };
}
