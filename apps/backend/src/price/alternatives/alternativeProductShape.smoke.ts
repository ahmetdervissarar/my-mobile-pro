import assert from 'node:assert/strict';

import {
  getLegacyAlternativeProductGroupKeys,
  normalizeAlternativeProductShape,
} from './index.js';

const expectedLegacyShapes = {
  chips_100g: ['chips', 100, 'g'],
  cola_1l: ['cola', 1000, 'ml'],
  cracker_100g: ['cracker', 100, 'g'],
  fruit_juice_1l: ['fruit_juice', 1000, 'ml'],
  kefir_1l: ['kefir', 1000, 'ml'],
  milk_1l: ['milk', 1000, 'ml'],
  mineral_water_200ml: ['sparkling_water', 200, 'ml'],
  oat_bar_40g: ['oat_bar', 40, 'g'],
} as const;

assert.deepEqual(
  getLegacyAlternativeProductGroupKeys(),
  Object.keys(expectedLegacyShapes).sort(),
);

for (const [legacyProductGroupKey, expected] of Object.entries(expectedLegacyShapes)) {
  const normalized = normalizeAlternativeProductShape({
    productGroupKey: legacyProductGroupKey,
  });

  assert.equal(normalized.rawProductGroupKey, legacyProductGroupKey);
  assert.equal(normalized.legacyProductGroupKey, legacyProductGroupKey);
  assert.equal(normalized.canonicalProductGroupKey, expected[0]);
  assert.ok(normalized.packageSize);
  assert.equal(normalized.packageSize.normalizedValue, expected[1]);
  assert.equal(normalized.packageSize.normalizedUnit, expected[2]);
}

const canonicalMilk = normalizeAlternativeProductShape({
  productGroupKey: 'milk',
  packageSizeText: '1000 ml',
});

assert.equal(canonicalMilk.rawProductGroupKey, 'milk');
assert.equal(canonicalMilk.legacyProductGroupKey, null);
assert.equal(canonicalMilk.canonicalProductGroupKey, 'milk');
assert.ok(canonicalMilk.packageSize);
assert.equal(canonicalMilk.packageSize.normalizedValue, 1000);
assert.equal(canonicalMilk.packageSize.normalizedUnit, 'ml');

const explicitResolvedMilk = normalizeAlternativeProductShape({
  productGroupKey: 'milk_1l',
  resolvedProductGroupKey: 'milk',
  packageSizeText: '1 L',
});

assert.equal(explicitResolvedMilk.rawProductGroupKey, 'milk_1l');
assert.equal(explicitResolvedMilk.legacyProductGroupKey, 'milk_1l');
assert.equal(explicitResolvedMilk.canonicalProductGroupKey, 'milk');
assert.ok(explicitResolvedMilk.packageSize);
assert.equal(explicitResolvedMilk.packageSize.normalizedValue, 1000);
assert.equal(explicitResolvedMilk.packageSize.normalizedUnit, 'ml');

console.log('ALTERNATIVE_PRODUCT_SHAPE_SMOKE_OK');
