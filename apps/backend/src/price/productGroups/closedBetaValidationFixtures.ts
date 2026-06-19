export type ClosedBetaProductGroupFixture = {
  id: string;
  productName: string;
  axis: string;
  expectedProductGroupKey?: string | null;
  expectedCoarseGroup?: string | null;
  expectedAlternativesEligible?: boolean;
  forbiddenProductGroupKeys?: string[];
  hardFail: boolean;
};

export const CLOSED_BETA_PRODUCT_GROUP_FIXTURES: ClosedBetaProductGroupFixture[] = [
  {
    id: 'milk-reference',
    productName: 'Sutas Laktozsuz Sut 1 L',
    axis: 'milk_reference',
    expectedProductGroupKey: 'milk',
    expectedCoarseGroup: 'dairy_drinkable',
    expectedAlternativesEligible: true,
    hardFail: true,
  },
  {
    id: 'kefir-not-milk',
    productName: 'Kefir 1 L',
    axis: 'trap_milk_vs_kefir',
    expectedProductGroupKey: 'kefir',
    forbiddenProductGroupKeys: ['milk'],
    expectedAlternativesEligible: true,
    hardFail: true,
  },
  {
    id: 'ayran-not-milk-or-yogurt',
    productName: 'Ayran 1 L',
    axis: 'trap_milk_yogurt_vs_ayran',
    forbiddenProductGroupKeys: ['milk', 'yogurt'],
    hardFail: true,
  },
  {
    id: 'yogurt-reference',
    productName: 'Yogurt 1 kg',
    axis: 'yogurt_reference',
    expectedProductGroupKey: 'yogurt',
    expectedCoarseGroup: 'dairy_spoonable',
    forbiddenProductGroupKeys: ['milk', 'kefir'],
    hardFail: true,
  },
  {
    id: 'rice-reference',
    productName: 'Migros Osmancik Pirinc 1 kg',
    axis: 'rice_reference',
    expectedProductGroupKey: 'rice',
    expectedCoarseGroup: 'staple_grain',
    expectedAlternativesEligible: true,
    hardFail: true,
  },
  {
    id: 'bulgur-not-rice',
    productName: 'Bulgur 1 kg',
    axis: 'trap_rice_vs_bulgur',
    forbiddenProductGroupKeys: ['rice'],
    hardFail: true,
  },
  {
    id: 'chips-reference',
    productName: 'Patates Cipsi 100 g',
    axis: 'chips_reference',
    expectedProductGroupKey: 'chips',
    expectedAlternativesEligible: true,
    hardFail: false,
  },
  {
    id: 'water-reference',
    productName: 'Dogal Kaynak Suyu 500 ml',
    axis: 'water_reference',
    expectedProductGroupKey: 'water',
    expectedCoarseGroup: 'water_beverage',
    expectedAlternativesEligible: true,
    hardFail: false,
  },
  {
    id: 'baby-formula-fail-closed',
    productName: 'Bebek mamasi 400 g',
    axis: 'sensitive_category',
    expectedProductGroupKey: 'baby_formula',
    expectedCoarseGroup: 'baby_food',
    expectedAlternativesEligible: false,
    hardFail: true,
  },
  {
    id: 'unknown-product-fail-closed',
    productName: 'Bilinmeyen ithal sos',
    axis: 'unknown_product',
    expectedProductGroupKey: null,
    expectedAlternativesEligible: false,
    hardFail: true,
  },
];