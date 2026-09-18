/**
 * RafSkoru — Kritik alerjen uyarı kodları (tek kaynak).
 * src/localProduct/criticalAllergenCodes.ts
 *
 * Bu liste, `riskEngine.ts`'in ürettiği hangi uyarı kodlarının:
 *  1) ürün sonuç ekranında "kritik profil uyarısı" kartında (skordan önce) gösterileceğini, ve
 *  2) bir alternatif adayın kullanıcı profiline "uygun" sayılıp sayılmayacağını (bkz.
 *     `alternativeAllergenFilter.ts`) belirler.
 *
 * Tek kaynak olması bilinçlidir: ana ürün ve alternatif adaylar aynı listeyi kullanmazsa,
 * bir ürün kritik sayılıp aynı alerjenle eşleşen bir alternatif "uygun" gösterilebilir —
 * tam da bu dosyanın önlediği hata sınıfı (proje sahibi düzeltmesi, 2026-09-18).
 *
 * Yalnız *_ALLERGEN_MATCH (declared, "içerir") ve *_TRACE_MATCH (eser/çapraz bulaşma,
 * "içerebilir") kodları burada yer alır — kategori bazlı ihtiyatlar (ör.
 * PROFILE_EGG_PRECAUTION, PROFILE_*_PREFERENCE/SENSITIVITY) kritik sayılmaz; ayrı panelde kalır.
 */
export const CRITICAL_ALLERGEN_CODES = [
  'PROFILE_PEANUT_ALLERGEN_MATCH',
  'PROFILE_PEANUT_TRACE_MATCH',
  'PROFILE_SOY_ALLERGEN_MATCH',
  'PROFILE_SOY_TRACE_MATCH',
  'PROFILE_GLUTEN_ALLERGEN_MATCH',
  'PROFILE_GLUTEN_TRACE_MATCH',
  'PROFILE_MILK_ALLERGEN_MATCH',
  'PROFILE_MILK_TRACE_MATCH',
  'PROFILE_LACTOSE_ALLERGEN_MATCH',
  'PROFILE_LACTOSE_TRACE_MATCH',
  'PROFILE_TREE_NUTS_ALLERGEN_MATCH',
  'PROFILE_TREE_NUTS_TRACE_MATCH',
  'PROFILE_SESAME_ALLERGEN_MATCH',
  'PROFILE_SESAME_TRACE_MATCH',
  'PROFILE_FISH_ALLERGEN_MATCH',
  'PROFILE_FISH_TRACE_MATCH',
  'PROFILE_SHELLFISH_ALLERGEN_MATCH',
  'PROFILE_SHELLFISH_TRACE_MATCH',
  'PROFILE_EGG_ALLERGEN_MATCH',
  'PROFILE_EGG_TRACE_MATCH',
] as const;

export type CriticalAllergenCode = (typeof CRITICAL_ALLERGEN_CODES)[number];

/** Uyarı listesinde en az bir kritik (declared veya trace) alerjen kodu var mı? */
export function hasCriticalAllergenWarning(warnings: readonly { code: string }[]): boolean {
  return warnings.some((warning) => (CRITICAL_ALLERGEN_CODES as readonly string[]).includes(warning.code));
}
