/**
 * RafSkoru — İki bağımsız etiket okumasının karşılaştırılması (ADR-009 §3)
 * apps/backend/src/labelStore/compareReads.ts
 *
 * Deterministik koddur; yapay zekâ kullanmaz. Sonuç, recordVerification'a
 * verilen `differingFields` listesidir: boşsa aday 'agreed', doluysa
 * 'disagreed' olur ve onaylayan ayrışan alanları açıkça çözmek zorundadır.
 *
 * Fark sayılmayanlar (yalnız yazım biçimi):
 *   - büyük/küçük harf
 *   - boşluk sayısı ve noktalama işaretlerinin çevresindeki boşluk
 *   - metnin sonundaki nokta, virgül, noktalı virgül, iki nokta
 * Fark sayılanlar: bunların dışındaki HER şey; sayılar birebir aynı olmalıdır.
 * Bir okumada değer var, diğerinde yoksa (null) bu da farktır.
 */
import type { LabelFields, LabelNutritionPer100, LabelRead } from './types.js';

const TEXT_KEYS = [
  'productName',
  'brand',
  'quantityText',
  'ingredientsText',
  'ingredientsLang',
  'allergenStatementText',
  'traceStatementText',
] as const satisfies readonly (keyof LabelFields)[];

const NUTRIENT_KEYS = [
  'energyKcal',
  'fat',
  'saturatedFat',
  'carbohydrates',
  'sugars',
  'fiber',
  'protein',
  'salt',
] as const satisfies readonly (keyof LabelNutritionPer100)[];

/** Yalnız yazım biçimi farklarını giderir; içerik farkına dokunmaz. */
export function normalizeLabelText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .replace(/\s*([,;:()\[\].%])\s*/g, '$1')
    .trim()
    .replace(/[.,;:]+$/, '');
}

function sameText(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return normalizeLabelText(a) === normalizeLabelText(b);
}

/** İki okumanın ayrıştığı alan adları; besin değerleri "nutritionPer100.<alan>" biçiminde. */
export function compareLabelReads(first: LabelRead, second: LabelRead): string[] {
  const differing: string[] = [];

  for (const key of TEXT_KEYS) {
    if (!sameText(first.fields[key], second.fields[key])) differing.push(key);
  }

  const a = first.fields.nutritionPer100;
  const b = second.fields.nutritionPer100;
  if (a === null || b === null) {
    if (a !== b) differing.push('nutritionPer100');
  } else {
    if (a.basis !== b.basis) differing.push('nutritionPer100.basis');
    for (const key of NUTRIENT_KEYS) {
      if (a[key] !== b[key]) differing.push(`nutritionPer100.${key}`);
    }
  }

  return differing;
}
