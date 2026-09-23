import type { ContentScoreInput } from '../contentScore/types.js';
import type { HealthScoreInput } from '../healthScore/types.js';
import type { SustainabilityInput } from '../sustainability/types.js';
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
  facts: ProductFacts,
): ContentScoreInput['allergenDataStatus'] {
  if (facts.allergenInfo?.dataStatus === 'unknown') return 'unknown';

  const declaredCount = facts.allergenInfo?.declaredAllergens.length ?? facts.allergens?.length ?? 0;
  const traceCount = facts.allergenInfo?.traceAllergens.length ?? facts.traceAllergens?.length ?? 0;

  if (declaredCount > 0 || traceCount > 0) return 'contains_allergen';

  return 'unknown';
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
    // HealthScoreInput kendi bağımsız sözleşmesinde hâlâ 'sugar' (tekil) adını
    // kullanıyor; ProductFactsTrafficLight'ın 'sugars' (çoğul) alanı buradan
    // AÇIKÇA eşlenmezse iki opsiyonel alan yapısal olarak uyumlu göründüğünden
    // tsc hatayı yakalamaz ve şeker sağlık-skoru katkısı sessizce sıfırlanır.
    trafficLight: facts.trafficLight
      ? {
          sugar: facts.trafficLight.sugars,
          salt: facts.trafficLight.salt,
          saturatedFat: facts.trafficLight.saturatedFat,
          fat: facts.trafficLight.fat,
        }
      : null,
  };
}

export function productFactsToContentScoreInput(facts: ProductFacts): ContentScoreInput {
  return {
    productName: facts.productName ?? undefined,
    ingredientsText: facts.ingredientsText ?? null,
    additives: facts.additives ?? null,
    additiveRiskLevel: getAdditiveRiskLevel(facts.additives),
    allergenDataStatus: getAllergenDataStatus(facts),
    hasPalmOil: hasPalmOil(facts.ingredientsText),
    isUltraProcessedHint: facts.novaGroup === 4 ? true : null,
  };
}
function getSustainabilityProcessingFromProductFacts(
  facts: ProductFacts,
): SustainabilityInput['processing'] {
  if (facts.novaGroup === 1) return 'nova_1';
  if (facts.novaGroup === 2) return 'nova_2';
  if (facts.novaGroup === 3) return 'nova_3';
  if (facts.novaGroup === 4) return 'nova_4';

  return undefined;
}

export function productFactsToSustainabilityInput(
  facts: ProductFacts,
): SustainabilityInput {
  return {
    productName: facts.productName ?? undefined,
    categoryText: facts.productName ?? undefined,
    ingredientsText: facts.ingredientsText ?? undefined,
    processing: getSustainabilityProcessingFromProductFacts(facts),
  };
}


