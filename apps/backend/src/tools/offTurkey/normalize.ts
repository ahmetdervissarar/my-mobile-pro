// OFF ham ürününü RafSkoru içe aktarma kaydına çevirir.
// Kurallar: tahmin yok; bulunmayan alan null + missingFields; alerjen kararı yalnız OFF etiket verisinden.
// Kişisel alerji profili burada YOKTUR; profil-ürün eşleşmesi cihazda yapılır.

import { OFF_ALLERGEN_TO_PROFILE_KEY } from './offAllergenMap.js';
import type { AllergenKey } from './allergenKey.js';

export type { AllergenKey } from './allergenKey.js';

/** present: OFF'ta beyan/iz etiketi var. not_listed: içerik metni var ama alerjen etiketi yok
 *  (bu "içermez" demek DEĞİLDİR). unknown: içerik metni de alerjen verisi de yok. */
export type AllergenDataStatus = 'present' | 'not_listed_in_available_data' | 'unknown_or_unverified';

export type Completeness = 'complete' | 'usable_for_risk' | 'usable_for_health' | 'insufficient';

export interface OffImportRecord {
  gtin: string;
  name: string | null;
  brand: string | null;
  quantity: string | null;
  categories: string[];
  imageUrl: string | null;
  ingredientsText: string | null;
  ingredientsLang: 'tr' | 'other' | null;
  allergens: {
    declared: AllergenKey[];
    traces: AllergenKey[];
    rawDeclared: string[];
    rawTraces: string[];
    dataStatus: AllergenDataStatus;
  };
  nutriscoreGrade: 'a' | 'b' | 'c' | 'd' | 'e' | null;
  /** OFF'un ham nutrition_grades değeri — 'not-applicable'/'unknown' dahil, hiç normalize edilmeden saklanır. */
  offGradeRaw: string | null;
  novaGroup: 1 | 2 | 3 | 4 | null;
  nutrition100g: Record<NutrientKey, number | null>;
  additives: string[];
  provenance: {
    source: 'off';
    license: 'ODbL-1.0';
    url: string;
    observedAt: string | null; // OFF last_modified_t
    fetchedAt: string;
  };
  missingFields: string[];
  completeness: Completeness;
}

type NutrientKey = 'energyKcal' | 'fat' | 'saturatedFat' | 'carbohydrates' | 'sugars' | 'fiber' | 'proteins' | 'salt';
const NUTRIENTS: Record<NutrientKey, string> = {
  energyKcal: 'energy-kcal_100g', fat: 'fat_100g', saturatedFat: 'saturated-fat_100g',
  carbohydrates: 'carbohydrates_100g', sugars: 'sugars_100g', fiber: 'fiber_100g',
  proteins: 'proteins_100g', salt: 'salt_100g',
};

/** İçe aktarmada istenen OFF alanları (API fields parametresi). */
export const OFF_FIELDS = [
  'code', 'product_name', 'product_name_tr', 'brands', 'quantity', 'categories_tags',
  'image_front_url', 'ingredients_text', 'ingredients_text_tr', 'allergens_tags', 'traces_tags',
  'nutrition_grades', 'nova_group', 'nutriments', 'additives_tags', 'last_modified_t', 'countries_tags',
].join(',');

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};
const mapAllergens = (tags: string[]): AllergenKey[] =>
  [...new Set(tags.map((t) => OFF_ALLERGEN_TO_PROFILE_KEY[t]).filter((k): k is AllergenKey => Boolean(k)))];

export interface CompletenessInput {
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredientsText: string | null;
  /** true, allerjen durumu unknown_or_unverified DIŞINDAYSA (present/not_listed veya katalogun kendi present/partial). */
  hasAllergenData: boolean;
  /** Yalnız truthy/null ayrımı kullanılır — harf büyüklüğü/kaynak (OFF ham veya RafSkoru hesaplanmış nihai grade) önemsizdir. */
  nutriscoreGrade: string | null;
  novaGroup: OffImportRecord['novaGroup'];
  nutrition100g: OffImportRecord['nutrition100g'];
}

export interface CompletenessResult {
  missingFields: string[];
  completeness: Completeness;
}

/**
 * missingFields + completeness hesaplaması — hem içe aktarma zamanında
 * (normalizeOffProduct) hem katalog yükleme zamanında (catalog.ts) AYNI
 * fonksiyondan çağrılır. Böylece completeness, alerjenlerde olduğu gibi,
 * products.jsonl'daki KAYITLI alandan değil her yüklemede HAM alanlardan
 * yeniden türetilir — eski (fix'ten önce üretilmiş) JSONL dökümleri bile
 * re-import gerekmeden doğru sınıflanır (bkz. P1-8 device-test bulgusu).
 */
export function computeCompletenessAndMissingFields(input: CompletenessInput): CompletenessResult {
  const missing: string[] = [];
  if (!input.name) missing.push('name');
  if (!input.brand) missing.push('brand');
  if (!input.imageUrl) missing.push('image');
  if (!input.ingredientsText) missing.push('ingredients');
  if (!input.hasAllergenData) missing.push('allergens');
  if (!input.nutriscoreGrade) missing.push('nutriscore');
  if (!input.novaGroup) missing.push('nova');
  const coreNutrients = (['energyKcal', 'sugars', 'saturatedFat', 'salt'] as NutrientKey[]).filter(
    (k) => input.nutrition100g[k] === null,
  );
  if (coreNutrients.length) missing.push(...coreNutrients.map((k) => `nutrition.${k}`));

  const risk = input.hasAllergenData;
  const health = Boolean(input.nutriscoreGrade) || coreNutrients.length === 0;
  const hasFullHealthData = Boolean(input.nutriscoreGrade) && coreNutrients.length === 0 && Boolean(input.novaGroup);
  const completeness: Completeness = risk && hasFullHealthData && Boolean(input.name)
    ? 'complete'
    : risk
      ? 'usable_for_risk'
      : health
        ? 'usable_for_health'
        : 'insufficient';

  return { missingFields: missing, completeness };
}

export function isValidGtin(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((a, d, i) => a + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function normalizeOffProduct(raw: Record<string, unknown>, fetchedAt: string): OffImportRecord | null {
  const gtin = str(raw.code);
  if (!gtin || !isValidGtin(gtin)) return null;

  const ingTr = str(raw.ingredients_text_tr);
  const ingAny = ingTr ?? str(raw.ingredients_text);
  const rawDeclared = arr(raw.allergens_tags);
  const rawTraces = arr(raw.traces_tags);
  const dataStatus: AllergenDataStatus =
    rawDeclared.length || rawTraces.length ? 'present'
    : ingAny ? 'not_listed_in_available_data'
    : 'unknown_or_unverified';

  const offGradeRaw = str(raw.nutrition_grades)?.toLowerCase() ?? null;
  const nutriscoreGrade = offGradeRaw && ['a', 'b', 'c', 'd', 'e'].includes(offGradeRaw) ? (offGradeRaw as OffImportRecord['nutriscoreGrade']) : null;
  const nova = num(raw.nova_group);
  const novaGroup = nova && [1, 2, 3, 4].includes(nova) ? (nova as 1 | 2 | 3 | 4) : null;

  const n = (raw.nutriments ?? {}) as Record<string, unknown>;
  const nutrition100g = Object.fromEntries(
    (Object.keys(NUTRIENTS) as NutrientKey[]).map((k) => [k, num(n[NUTRIENTS[k]])]),
  ) as Record<NutrientKey, number | null>;

  const lm = num(raw.last_modified_t);
  const rec: OffImportRecord = {
    gtin,
    name: str(raw.product_name_tr) ?? str(raw.product_name),
    brand: str(raw.brands)?.split(',')[0].trim() || null,
    quantity: str(raw.quantity),
    categories: arr(raw.categories_tags),
    imageUrl: str(raw.image_front_url),
    ingredientsText: ingAny,
    ingredientsLang: ingTr ? 'tr' : ingAny ? 'other' : null,
    allergens: { declared: mapAllergens(rawDeclared), traces: mapAllergens(rawTraces), rawDeclared, rawTraces, dataStatus },
    nutriscoreGrade,
    offGradeRaw,
    novaGroup,
    nutrition100g,
    additives: arr(raw.additives_tags),
    provenance: {
      source: 'off', license: 'ODbL-1.0',
      url: `https://world.openfoodfacts.org/product/${gtin}`,
      observedAt: lm ? new Date(lm * 1000).toISOString() : null,
      fetchedAt,
    },
    missingFields: [],
    completeness: 'insufficient',
  };

  const { missingFields, completeness } = computeCompletenessAndMissingFields({
    name: rec.name,
    brand: rec.brand,
    imageUrl: rec.imageUrl,
    ingredientsText: rec.ingredientsText,
    hasAllergenData: dataStatus !== 'unknown_or_unverified',
    nutriscoreGrade,
    novaGroup,
    nutrition100g,
  });
  rec.missingFields = missingFields;
  rec.completeness = completeness;
  return rec;
}
