import assert from 'node:assert/strict';

import { PRODUCT_GROUP_CATALOG } from './catalog.js';
import { PRODUCT_GROUP_REGISTRY } from './registry.js';

const allowedRiskLevels = new Set(['standard', 'elevated', 'restricted']);
const allowedEligibilities = new Set(['enabled', 'shadow', 'disabled']);
const allowedPackageUnits = new Set(['ml', 'g', 'unit']);
const allowedNormalizers = new Set(['per_liter', 'per_kg', 'per_unit']);
const allowedBetaCoverage = new Set(['core', 'expanded', 'restricted']);

const allowedAttributes = new Set([
  'baby_age_range',
  'base_ingredient',
  'cheese_type',
  'chocolate_type',
  'coffee_type',
  'count',
  'fat_level',
  'flour_type',
  'fruit_type',
  'gluten_free',
  'grain_size',
  'honey_type',
  'juice_percent',
  'lactose_free',
  'lentil_type',
  'medical_claim',
  'oil_type',
  'paste_type',
  'plain_or_flavored',
  'plain_or_fruit',
  'preservation_medium',
  'rice_type',
  'sugar_free',
  'sugar_type',
  'tea_type',
  'meal_type',
]);

assert.ok(PRODUCT_GROUP_REGISTRY.length >= 30, 'Expected broad closed-beta registry coverage');

const seenKeys = new Set<string>();

for (const entry of PRODUCT_GROUP_REGISTRY) {
  assert.ok(entry.canonicalProductGroupKey, 'Expected registry key');
  assert.equal(
    seenKeys.has(entry.canonicalProductGroupKey),
    false,
    `Duplicate registry key: ${entry.canonicalProductGroupKey}`,
  );
  seenKeys.add(entry.canonicalProductGroupKey);

  assert.ok(entry.displayName.tr, `Expected Turkish display name for ${entry.canonicalProductGroupKey}`);
  assert.ok(entry.displayName.en, `Expected English display name for ${entry.canonicalProductGroupKey}`);
  assert.ok(entry.department, `Expected department for ${entry.canonicalProductGroupKey}`);
  assert.ok(entry.category, `Expected category for ${entry.canonicalProductGroupKey}`);
  assert.ok(entry.coarseGroup, `Expected coarseGroup for ${entry.canonicalProductGroupKey}`);

  assert.ok(
    allowedRiskLevels.has(entry.riskLevel),
    `Invalid riskLevel for ${entry.canonicalProductGroupKey}`,
  );
  assert.ok(
    allowedEligibilities.has(entry.alternativeEligibility),
    `Invalid alternativeEligibility for ${entry.canonicalProductGroupKey}`,
  );
  assert.ok(
    allowedEligibilities.has(entry.healthierSwapEligibility),
    `Invalid healthierSwapEligibility for ${entry.canonicalProductGroupKey}`,
  );
  assert.ok(
    allowedBetaCoverage.has(entry.betaCoverage),
    `Invalid betaCoverage for ${entry.canonicalProductGroupKey}`,
  );

  assert.ok(
    allowedPackageUnits.has(entry.packageSizeCompatibility.unit),
    `Invalid package unit for ${entry.canonicalProductGroupKey}`,
  );
  assert.ok(
    allowedNormalizers.has(entry.packageSizeCompatibility.normalizeBy),
    `Invalid price normalizer for ${entry.canonicalProductGroupKey}`,
  );
  assert.ok(
    entry.packageSizeCompatibility.maxRatio >= 1,
    `Invalid maxRatio for ${entry.canonicalProductGroupKey}`,
  );
  assert.ok(
    entry.minCandidatesForCard >= 2,
    `Expected at least 2 candidates for card for ${entry.canonicalProductGroupKey}`,
  );

  for (const attribute of entry.matchAttributes) {
    assert.ok(
      allowedAttributes.has(attribute),
      `Unknown matchAttribute "${attribute}" in ${entry.canonicalProductGroupKey}`,
    );
  }

  if (entry.riskLevel === 'restricted') {
    assert.equal(
      entry.alternativeEligibility,
      'disabled',
      `Restricted group must not enable alternatives in beta: ${entry.canonicalProductGroupKey}`,
    );
  }

  assert.equal(
    entry.healthierSwapEligibility,
    'disabled',
    `Healthier swaps must stay disabled in beta: ${entry.canonicalProductGroupKey}`,
  );
}

for (const catalogEntry of PRODUCT_GROUP_CATALOG) {
  assert.ok(
    seenKeys.has(catalogEntry.key),
    `Catalog key missing from registry: ${catalogEntry.key}`,
  );
}

assert.ok(seenKeys.has('milk'), 'Expected milk registry entry');
assert.ok(seenKeys.has('chips'), 'Expected chips registry entry');
assert.ok(seenKeys.has('baby_formula'), 'Expected baby_formula registry entry');

console.log('PRODUCT_GROUP_REGISTRY_SMOKE_OK');

