// OFF kategori etiketlerinden Nutri-Score 2023 kategorisi türetir.
// src/nutriScore/validateAgainstOff.ts'den taşındı (aşama 1); iki yer de
// buradan kullanır. Kategori ürün adından ÇIKARILMAZ, yalnız OFF
// categories_tags etiketlerinden atanır (bkz. görev değişmez kural 4).
import type { NutriScoreCategory } from '../nutriScore/nutriScore2023.js';

/** Kalorisiz tatlandırıcı katkı kodları (yalnız içecek kategorisinde kullanılır). */
export const SWEETENER_ADDITIVE_TAGS = [
  'en:e950',
  'en:e951',
  'en:e952',
  'en:e954',
  'en:e955',
  'en:e960',
  'en:e961',
  'en:e962',
  'en:e969',
];

export function hasNonNutritiveSweetenerTag(additives: string[]): boolean {
  return additives.some((tag) => SWEETENER_ADDITIVE_TAGS.includes(tag));
}

export function categoryFromOffTags(tags: string[]): NutriScoreCategory {
  const has = (t: string) => tags.includes(t);
  if (has('en:waters') && !has('en:flavored-waters')) return 'water';
  if (has('en:cheeses')) return 'cheese';
  if (has('en:fats') || has('en:vegetable-oils') || has('en:nuts') || has('en:seeds') || has('en:nut-butters')) {
    return 'fat_oil_nuts_seeds';
  }
  if (has('en:beverages') || has('en:milks') || has('en:fermented-milk-drinks') || has('en:plant-based-milks')) {
    return 'beverage';
  }
  if (has('en:beef') || has('en:lamb-meat') || has('en:veal-meat')) return 'red_meat';
  return 'general';
}
