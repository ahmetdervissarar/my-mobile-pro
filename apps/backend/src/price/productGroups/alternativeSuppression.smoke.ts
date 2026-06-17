import assert from 'node:assert/strict';

import { getAlternativeSuppressionReason } from './index.js';
import type { ProductGroupResolution } from './index.js';

function makeResolution(
  partial: Partial<ProductGroupResolution>,
): ProductGroupResolution {
  return {
    productGroupKey: null,
    coarseGroup: null,
    groupConfidence: 'unknown',
    groupSource: 'none',
    packageSize: null,
    alternativesEligible: false,
    ...partial,
  };
}

assert.equal(
  getAlternativeSuppressionReason(
    makeResolution({
      productGroupKey: 'milk',
      coarseGroup: 'dairy_drinkable',
      groupConfidence: 'strong',
      groupSource: 'name_rule',
      alternativesEligible: true,
    }),
  ),
  null,
);

assert.equal(
  getAlternativeSuppressionReason(makeResolution({})),
  'unknown_group',
);

assert.equal(
  getAlternativeSuppressionReason(
    makeResolution({
      productGroupKey: 'milk',
      coarseGroup: 'dairy_drinkable',
      groupConfidence: 'assisted',
      groupSource: 'off_assisted',
      alternativesEligible: false,
    }),
  ),
  'low_confidence',
);

assert.equal(
  getAlternativeSuppressionReason(
    makeResolution({
      productGroupKey: 'milk',
      coarseGroup: 'dairy_drinkable',
      groupConfidence: 'strong',
      groupSource: 'name_rule',
      alternativesEligible: false,
    }),
  ),
  'not_alternatives_eligible',
);

console.log('ALTERNATIVE_SUPPRESSION_SMOKE_OK');
