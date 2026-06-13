import type {
  ProductFacts,
  ProductFactsNovaGroup,
  ProductFactsNutriScoreGrade,
  ProductFactsTrafficLight,
  ProductFactsTrafficLightValue,
} from './types.js';

export interface OpenFoodFactsProductInfoLike {
  barcode?: string | null;
  productName?: string | null;
  imageUrl?: string | null;
  ingredientsText?: string | null;
  allergens?: string[] | null;
  nutriScore?: string | null;
  novaGroup?: number | null;
  additives?: string[] | null;
  nutritionValues?: {
    fat?: number | null;
    saturatedFat?: number | null;
    sugars?: number | null;
    salt?: number | null;
  } | null;
}

type TrafficLightNutrient = 'fat' | 'saturatedFat' | 'sugars' | 'salt';

const SOLID_FOOD_THRESHOLDS: Record<TrafficLightNutrient, { lowMax: number; highMinExclusive: number }> = {
  fat: {
    lowMax: 3,
    highMinExclusive: 17.5,
  },
  saturatedFat: {
    lowMax: 1.5,
    highMinExclusive: 5,
  },
  sugars: {
    lowMax: 5,
    highMinExclusive: 22.5,
  },
  salt: {
    lowMax: 0.3,
    highMinExclusive: 1.5,
  },
};

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeStringList(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeNutriScoreGrade(
  value: string | null | undefined,
): ProductFactsNutriScoreGrade | null {
  const normalized = value?.trim().toUpperCase();

  if (
    normalized === 'A' ||
    normalized === 'B' ||
    normalized === 'C' ||
    normalized === 'D' ||
    normalized === 'E'
  ) {
    return normalized;
  }

  return null;
}

function normalizeNovaGroup(value: number | null | undefined): ProductFactsNovaGroup | null {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  return null;
}

function classifyTrafficLightLevel(
  value: number | null | undefined,
  nutrient: TrafficLightNutrient,
): ProductFactsTrafficLightValue | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const threshold = SOLID_FOOD_THRESHOLDS[nutrient];

  if (value <= threshold.lowMax) {
    return 'low';
  }

  if (value > threshold.highMinExclusive) {
    return 'high';
  }

  return 'medium';
}

function mapNutritionValuesToTrafficLight(
  nutritionValues: OpenFoodFactsProductInfoLike['nutritionValues'],
): ProductFactsTrafficLight | null {
  if (!nutritionValues) {
    return null;
  }

  return {
    fat: classifyTrafficLightLevel(nutritionValues.fat, 'fat'),
    saturatedFat: classifyTrafficLightLevel(nutritionValues.saturatedFat, 'saturatedFat'),
    sugar: classifyTrafficLightLevel(nutritionValues.sugars, 'sugars'),
    salt: classifyTrafficLightLevel(nutritionValues.salt, 'salt'),
  };
}

function hasMeaningfulFoodFacts(facts: ProductFacts): boolean {
  return (
    !!facts.ingredientsText?.trim() ||
    (facts.allergens?.length ?? 0) > 0 ||
    (facts.additives?.length ?? 0) > 0 ||
    facts.nutriScoreGrade !== null ||
    facts.novaGroup !== null ||
    facts.trafficLight?.fat !== null ||
    facts.trafficLight?.saturatedFat !== null ||
    facts.trafficLight?.sugar !== null ||
    facts.trafficLight?.salt !== null
  );
}

export function openFoodFactsInfoToProductFacts(
  input: OpenFoodFactsProductInfoLike,
): ProductFacts {
  const facts: ProductFacts = {
    barcode: normalizeText(input.barcode),
    productName: normalizeText(input.productName),
    imageUrl: normalizeText(input.imageUrl),
    ingredientsText: normalizeText(input.ingredientsText),
    allergens: normalizeStringList(input.allergens),
    additives: normalizeStringList(input.additives),
    nutriScoreGrade: normalizeNutriScoreGrade(input.nutriScore),
    novaGroup: normalizeNovaGroup(input.novaGroup),
    trafficLight: mapNutritionValuesToTrafficLight(input.nutritionValues),
    dataSource: 'off',
    isComplete: false,
  };

  return {
    ...facts,
    isComplete: hasMeaningfulFoodFacts(facts),
  };
}
