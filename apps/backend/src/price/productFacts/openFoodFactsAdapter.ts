import type {
  ProductFacts,
  ProductFactsConfidence,
  ProductFactsMissingField,
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
  traceAllergens?: string[] | null;
  nutriScore?: string | null;
  novaGroup?: number | null;
  additives?: string[] | null;
  nutritionValues?: {
    fat?: number | null;
    saturatedFat?: number | null;
    sugars?: number | null;
    salt?: number | null;
  } | null;
  sourceUrl?: string | null;
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

function buildAllergenInfo(
  declaredAllergens: string[],
  traceAllergens: string[],
): ProductFacts['allergenInfo'] {
  const hasStructuredAllergenData = declaredAllergens.length > 0 || traceAllergens.length > 0;

  return {
    dataStatus: hasStructuredAllergenData ? 'present' : 'unknown',
    declaredAllergens,
    traceAllergens,
    source: hasStructuredAllergenData ? 'off_structured' : 'none',
  };
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

function hasAnyTrafficLightValue(trafficLight: ProductFactsTrafficLight | null | undefined): boolean {
  if (!trafficLight) {
    return false;
  }

  return (
    trafficLight.fat !== null &&
    trafficLight.fat !== undefined ||
    trafficLight.saturatedFat !== null &&
    trafficLight.saturatedFat !== undefined ||
    trafficLight.sugar !== null &&
    trafficLight.sugar !== undefined ||
    trafficLight.salt !== null &&
    trafficLight.salt !== undefined
  );
}

function getMissingFields(facts: ProductFacts): ProductFactsMissingField[] {
  const missingFields: ProductFactsMissingField[] = [];

  if (!facts.productName?.trim()) missingFields.push('productName');
  if (!facts.imageUrl?.trim()) missingFields.push('imageUrl');
  if (!facts.ingredientsText?.trim()) missingFields.push('ingredientsText');
  if (facts.allergenInfo?.dataStatus !== 'present') missingFields.push('allergens');
  if (!hasAnyTrafficLightValue(facts.trafficLight)) missingFields.push('nutrition');
  if (!facts.nutriScoreGrade) missingFields.push('nutriScoreGrade');
  if (!facts.novaGroup) missingFields.push('novaGroup');
  if (!hasAnyTrafficLightValue(facts.trafficLight)) missingFields.push('trafficLight');

  return missingFields;
}

function getVerificationReason(missingFields: ProductFactsMissingField[]): string | undefined {
  if (missingFields.length === 0) return undefined;

  if (missingFields.includes('ingredientsText')) {
    return 'OFF ürünü bulundu ancak içerik listesi eksik olduğu için doğrulama kuyruğuna alınmalı.';
  }

  if (missingFields.includes('nutrition')) {
    return 'OFF ürünü bulundu ancak besin değerleri eksik olduğu için sağlık skoru sınırlı kalır.';
  }

  return 'OFF ürünü bulundu ancak skorlamada kullanılan bazı alanlar eksik.';
}

function getConfidence(missingFields: ProductFactsMissingField[]): ProductFactsConfidence {
  if (missingFields.length === 0) return 'high';
  if (missingFields.includes('ingredientsText') || missingFields.includes('nutrition')) return 'low';
  return 'medium';
}

function hasMeaningfulFoodFacts(facts: ProductFacts): boolean {
  return (
    !!facts.ingredientsText?.trim() ||
    (facts.allergens?.length ?? 0) > 0 ||
    (facts.additives?.length ?? 0) > 0 ||
    facts.nutriScoreGrade !== null ||
    facts.novaGroup !== null ||
    hasAnyTrafficLightValue(facts.trafficLight)
  );
}

export function openFoodFactsInfoToProductFacts(
  input: OpenFoodFactsProductInfoLike,
): ProductFacts {
  const declaredAllergens = normalizeStringList(input.allergens);
  const traceAllergens = normalizeStringList(input.traceAllergens);

  const facts: ProductFacts = {
    barcode: normalizeText(input.barcode),
    productName: normalizeText(input.productName),
    imageUrl: normalizeText(input.imageUrl),
    ingredientsText: normalizeText(input.ingredientsText),
    allergens: Array.isArray(input.allergens) ? declaredAllergens : undefined,
    traceAllergens: Array.isArray(input.traceAllergens) ? traceAllergens : undefined,
    allergenInfo: buildAllergenInfo(declaredAllergens, traceAllergens),
    additives: Array.isArray(input.additives) ? normalizeStringList(input.additives) : undefined,
    nutriScoreGrade: normalizeNutriScoreGrade(input.nutriScore),
    novaGroup: normalizeNovaGroup(input.novaGroup),
    trafficLight: mapNutritionValuesToTrafficLight(input.nutritionValues),
    dataSource: 'off',
    isComplete: false,
    sourceUrl: normalizeText(input.sourceUrl),
    observedAt: new Date().toISOString(),
  };

  const missingFields = getMissingFields(facts);
  const isComplete = hasMeaningfulFoodFacts(facts) && missingFields.length === 0;

  return {
    ...facts,
    isComplete,
    missingFields,
    verificationNeeded: missingFields.length > 0,
    verificationReason: getVerificationReason(missingFields),
    confidence: getConfidence(missingFields),
  };
}


