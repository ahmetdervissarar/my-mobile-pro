import type { ProductGroupResolution } from './types.js';

export type AlternativeSuppressionReason =
  | 'missing_group'
  | 'low_confidence'
  | 'unknown_group'
  | 'not_alternatives_eligible';

export interface AlternativeSuppressionEvent {
  barcode?: string;
  productName?: string;
  coarseGroup: string | null;
  resolvedProductGroupKey: string | null;
  groupConfidence: ProductGroupResolution['groupConfidence'];
  groupSource: ProductGroupResolution['groupSource'];
  packageSize: ProductGroupResolution['packageSize'];
  reason: AlternativeSuppressionReason;
}

export function getAlternativeSuppressionReason(
  resolution: ProductGroupResolution,
): AlternativeSuppressionReason | null {
  if (resolution.alternativesEligible) {
    return null;
  }

  if (!resolution.productGroupKey) {
    return resolution.groupConfidence === 'unknown' ? 'unknown_group' : 'missing_group';
  }

  if (resolution.groupConfidence === 'assisted' || resolution.groupConfidence === 'unknown') {
    return 'low_confidence';
  }

  return 'not_alternatives_eligible';
}

export function logAlternativeSuppression(input: {
  barcode?: string | null;
  productName?: string | null;
  resolution: ProductGroupResolution;
}): void {
  const reason = getAlternativeSuppressionReason(input.resolution);

  if (!reason) {
    return;
  }

  const event: AlternativeSuppressionEvent = {
    barcode: input.barcode?.trim() || undefined,
    productName: input.productName?.trim() || undefined,
    coarseGroup: input.resolution.coarseGroup,
    resolvedProductGroupKey: input.resolution.productGroupKey,
    groupConfidence: input.resolution.groupConfidence,
    groupSource: input.resolution.groupSource,
    packageSize: input.resolution.packageSize,
    reason,
  };

  console.info('[product-group] alternative_suppressed', JSON.stringify(event));
}
