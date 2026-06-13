import type { ContentScoreInput } from '../contentScore/types.js';
import type { HealthScoreInput } from '../healthScore/types.js';
import type { ProductFacts } from './types.js';

function getAdditiveRiskLevel(
  additives: ProductFacts['additives'],
): ContentScoreInput['additiveRiskLevel'] {
  if (!Array.isArray(additives)) return null;
  if (additives.length === 0) return 'none';
  if (additives.length >= 6) return 'high';
  if (additives.length >= 3) return 'medium';
  return 'low';
}

function getAllergenDataStatus(
  allergens: ProductFacts['allergens'],
): ContentScoreInput['allergenDataStatus'] {
  if (!Array.isArray(allergens)) return 'unknown';
  return allergens.length > 0 ? 'contains_allergen' : 'clear';
}

function hasPalmOil(ingredientsText: ProductFacts['ingredientsText']): boolean | null {
  if (!ingredientsText?.trim()) return null;

  const normalized = ingredientsText.toLocaleLowerCase('tr-TR');

  return (
    normalized.includes('palm') ||
    normalized.includes('palmiye')
  );
}

export function productFactsToHealthScoreInput(facts: ProductFacts): HealthScoreInput {
  return {
    productName: facts.productName ?? undefined,
    nutriScoreGrade: facts.nutriScoreGrade ?? null,
    novaGroup: facts.novaGroup ?? null,
    trafficLight: facts.trafficLight ?? null,
  };
}

export function productFactsToContentScoreInput(facts: ProductFacts): ContentScoreInput {
  return {
    productName: facts.productName ?? undefined,
    ingredientsText: facts.ingredientsText ?? null,
    additives: facts.additives ?? null,
    additiveRiskLevel: getAdditiveRiskLevel(facts.additives),
    allergenDataStatus: getAllergenDataStatus(facts.allergens),
    hasPalmOil: hasPalmOil(facts.ingredientsText),
    isUltraProcessedHint: facts.novaGroup === 4 ? true : null,
  };
}
