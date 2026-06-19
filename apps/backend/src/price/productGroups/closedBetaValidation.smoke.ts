import assert from 'node:assert/strict';

import { resolveProductGroup } from './index.js';
import { CLOSED_BETA_PRODUCT_GROUP_FIXTURES } from './closedBetaValidationFixtures.js';

for (const fixture of CLOSED_BETA_PRODUCT_GROUP_FIXTURES) {
  const resolution = resolveProductGroup({ productName: fixture.productName });

  if ('expectedProductGroupKey' in fixture) {
    assert.equal(
      resolution.productGroupKey,
      fixture.expectedProductGroupKey ?? null,
      `${fixture.id}: expected product group ${fixture.expectedProductGroupKey}, got ${resolution.productGroupKey}`,
    );
  }

  if ('expectedCoarseGroup' in fixture) {
    assert.equal(
      resolution.coarseGroup,
      fixture.expectedCoarseGroup ?? null,
      `${fixture.id}: expected coarse group ${fixture.expectedCoarseGroup}, got ${resolution.coarseGroup}`,
    );
  }

  if ('expectedAlternativesEligible' in fixture) {
    assert.equal(
      resolution.alternativesEligible,
      fixture.expectedAlternativesEligible,
      `${fixture.id}: expected alternativesEligible ${fixture.expectedAlternativesEligible}, got ${resolution.alternativesEligible}`,
    );
  }

  for (const forbiddenGroupKey of fixture.forbiddenProductGroupKeys ?? []) {
    assert.notEqual(
      resolution.productGroupKey,
      forbiddenGroupKey,
      `${fixture.id}: resolved to forbidden group ${forbiddenGroupKey}`,
    );
  }

  if (fixture.hardFail && fixture.forbiddenProductGroupKeys?.length) {
    assert.ok(
      !fixture.forbiddenProductGroupKeys.includes(resolution.productGroupKey ?? ''),
      `${fixture.id}: hard fail trap resolved to forbidden group`,
    );
  }
}

console.log('CLOSED_BETA_PRODUCT_GROUP_VALIDATION_SMOKE_OK');