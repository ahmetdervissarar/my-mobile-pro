import type { ProductFacts } from './types.js';

/**
 * Bir kaynak kaydının çözümleme akışında kullanılıp kullanılamayacağını belirler (A1B).
 * Yalnız `completeness === 'insufficient'` kayıt kullanılamaz. Kısmi (`partial`) gerçek
 * kayıtlar korunur; eksik alanlar `missingFields` ile görünür kalır ve tahminle doldurulmaz.
 * `completeness` alanı olmayan eski kayıtlar için eski davranış (`isComplete`) uygulanır.
 */
export function selectUsableProductFacts(facts: ProductFacts | null | undefined): ProductFacts | null {
  if (!facts) return null;
  if (facts.completeness === undefined) return facts.isComplete ? facts : null;
  return facts.completeness === 'insufficient' ? null : facts;
}
