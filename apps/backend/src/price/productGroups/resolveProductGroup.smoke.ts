import assert from 'node:assert/strict';

import { resolveProductGroup } from './index.js';

const milk = resolveProductGroup({ productName: 'Sütaş Laktozsuz Süt 1 LT' });
assert.equal(milk.productGroupKey, 'milk');
assert.equal(milk.coarseGroup, 'dairy_drinkable');
assert.equal(milk.groupConfidence, 'strong');
assert.equal(milk.groupSource, 'name_rule');
assert.equal(milk.alternativesEligible, true);
assert.equal(milk.packageSize?.normalizedValue, 1000);
assert.equal(milk.packageSize?.normalizedUnit, 'ml');

const barcodeMilk = resolveProductGroup({
  productName: 'Bilinmeyen ürün 1 L',
  barcode: '8691004000050',
});
assert.equal(barcodeMilk.productGroupKey, 'milk');
assert.equal(barcodeMilk.groupConfidence, 'exact');
assert.equal(barcodeMilk.groupSource, 'barcode');
assert.equal(barcodeMilk.alternativesEligible, true);

const kefir = resolveProductGroup({ productName: 'Kefir 1 L' });
assert.equal(kefir.productGroupKey, 'kefir');
assert.notEqual(kefir.productGroupKey, 'milk');
assert.equal(kefir.alternativesEligible, true);

const yogurt = resolveProductGroup({ productName: 'Yoğurt 1 kg' });
assert.equal(yogurt.productGroupKey, 'yogurt');
assert.equal(yogurt.coarseGroup, 'dairy_spoonable');
assert.equal(yogurt.packageSize?.normalizedValue, 1000);
assert.equal(yogurt.packageSize?.normalizedUnit, 'g');

const chips = resolveProductGroup({ productName: 'Patates Cipsi 100 g' });
assert.equal(chips.productGroupKey, 'chips');
assert.equal(chips.packageSize?.normalizedValue, 100);
assert.equal(chips.packageSize?.normalizedUnit, 'g');

const offOnly = resolveProductGroup({
  productName: 'Bilinmeyen içecek',
  offCategories: ['en:milks', 'en:dairies'],
});
assert.equal(offOnly.productGroupKey, 'milk');
assert.equal(offOnly.groupConfidence, 'assisted');
assert.equal(offOnly.groupSource, 'off_assisted');
assert.equal(offOnly.alternativesEligible, false);

const water = resolveProductGroup({ productName: 'Abant Doğal Kaynak Suyu Su 0,5 L' });
assert.equal(water.productGroupKey, 'water');
assert.equal(water.coarseGroup, 'water_beverage');
assert.equal(water.groupConfidence, 'strong');
assert.equal(water.groupSource, 'name_rule');
assert.equal(water.alternativesEligible, true);

const providerHint = resolveProductGroup({
  productName: 'Bilinmeyen seed ürünü 500 ml',
  candidateGroupKey: 'water',
});
assert.equal(providerHint.productGroupKey, 'water');
assert.equal(providerHint.coarseGroup, 'water_beverage');
assert.equal(providerHint.groupConfidence, 'assisted');
assert.equal(providerHint.groupSource, 'provider_hint');
assert.equal(providerHint.alternativesEligible, true);

const invalidProviderHint = resolveProductGroup({
  productName: 'Bilinmeyen seed ürünü 500 ml',
  candidateGroupKey: 'unknown_seed_group',
});
assert.equal(invalidProviderHint.productGroupKey, null);
assert.equal(invalidProviderHint.groupConfidence, 'unknown');
assert.equal(invalidProviderHint.alternativesEligible, false);
const unknown = resolveProductGroup({ productName: 'Bilinmeyen ithal sos' });
assert.equal(unknown.productGroupKey, null);
assert.equal(unknown.groupConfidence, 'unknown');
assert.equal(unknown.alternativesEligible, false);

console.log('PRODUCT_GROUP_RESOLUTION_SMOKE_OK');
