import { createHash } from 'node:crypto';

import type { PriceQuery, PriceResult, PriceStatus, PriceSource } from '../types.js';

export type BetaQueryEventType = 'price_resolve' | 'alternatives';

export type BetaQueryOutcome =
  | 'resolved'
  | 'unavailable'
  | 'recommended'
  | 'suppressed'
  | 'invalid_request'
  | 'error';

export type BetaAlternativeSuppressionReason =
  | 'invalid_category'
  | 'missing_product_group'
  | 'not_alternatives_eligible'
  | 'no_safe_recommendation';

export interface BetaQuerySummary {
  hasBarcode: boolean;
  barcodeHash?: string;
  barcodeLength?: number;
  hasProductName: boolean;
  productNameLength?: number;
  hasLocation: boolean;
}

export interface BetaQueryEvent {
  eventType: BetaQueryEventType;
  outcome: BetaQueryOutcome;
  timestamp: string;
  query: BetaQuerySummary;
  result?: {
    status?: PriceStatus;
    source?: PriceSource | null;
    productGroupKey?: string | null;
    resolvedProductGroupKey?: string | null;
    alternativesEligible?: boolean;
    recommendationCount?: number;
    triedProviderCount?: number;
  };
  suppressionReason?: BetaAlternativeSuppressionReason;
  errorCode?: string;
}

function hashValue(value: string): string {
  return createHash('sha256').update(value.trim()).digest('hex');
}

function summarizeQuery(query: PriceQuery): BetaQuerySummary {
  const barcode = query.barcode?.trim();
  const productName = query.productName?.trim();

  return {
    hasBarcode: Boolean(barcode),
    barcodeHash: barcode ? hashValue(barcode) : undefined,
    barcodeLength: barcode ? barcode.length : undefined,
    hasProductName: Boolean(productName),
    productNameLength: productName ? productName.length : undefined,
    hasLocation: Boolean(query.location),
  };
}

export function buildPriceResolveBetaQueryEvent(input: {
  query: PriceQuery;
  result?: PriceResult;
  triedProviders?: string[];
  errorCode?: string;
}): BetaQueryEvent {
  const outcome: BetaQueryOutcome = input.errorCode
    ? 'error'
    : input.result?.status === 'unavailable'
      ? 'unavailable'
      : 'resolved';

  return {
    eventType: 'price_resolve',
    outcome,
    timestamp: new Date().toISOString(),
    query: summarizeQuery(input.query),
    result: input.result
      ? {
          status: input.result.status,
          source: input.result.source,
          productGroupKey: input.result.productGroupKey ?? null,
          resolvedProductGroupKey: input.result.resolvedProductGroupKey ?? null,
          alternativesEligible: input.result.alternativesEligible,
          triedProviderCount: input.triedProviders?.length,
        }
      : undefined,
    errorCode: input.errorCode,
  };
}

export function buildAlternativesBetaQueryEvent(input: {
  query: PriceQuery;
  categoryKey?: string;
  productGroupKey?: string;
  resolvedProductGroupKey?: string | null;
  alternativesEligible?: boolean;
  recommendationCount: number;
  suppressionReason?: BetaAlternativeSuppressionReason;
  errorCode?: string;
}): BetaQueryEvent {
  const outcome: BetaQueryOutcome = input.errorCode
    ? 'error'
    : input.suppressionReason === 'invalid_category'
      ? 'invalid_request'
      : input.recommendationCount > 0
        ? 'recommended'
        : 'suppressed';

  return {
    eventType: 'alternatives',
    outcome,
    timestamp: new Date().toISOString(),
    query: summarizeQuery(input.query),
    result: {
      productGroupKey: input.productGroupKey ?? null,
      resolvedProductGroupKey: input.resolvedProductGroupKey ?? null,
      alternativesEligible: input.alternativesEligible,
      recommendationCount: input.recommendationCount,
    },
    suppressionReason: input.suppressionReason,
    errorCode: input.errorCode,
  };
}

export function logBetaQueryEvent(event: BetaQueryEvent): void {
  if (process.env.ENABLE_BETA_QUERY_LOGS !== '1') {
    return;
  }

  console.info('[beta-query]', JSON.stringify(event));
}
