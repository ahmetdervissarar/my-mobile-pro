import type { CatalogAllergenData } from '../../catalog/catalog.js';

/**
 * 'user_contributed': kullanıcının cihazda elle (veya ileride OCR adayıyla)
 * girdiği, sunucuya HENÜZ gönderilmeyen/doğrulanmayan katkı (bkz. mobil
 * localProduct/types.ts). 'verified_db': çoklu-kullanıcı mutabakatı veya
 * insan/üretici doğrulamasından geçmiş sunucu kaydı — bu sürümde henüz
 * hiçbir kod bu değeri ÜRETMİYOR; sözleşme ileriki sunucu-taraflı mutabakat
 * görevi için şimdiden eklendi (additive-only).
 */
export type ProductFactsSource = 'off' | 'beta_inference' | 'user_contributed' | 'verified_db';

export type ProductFactsNutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type ProductFactsNovaGroup = 1 | 2 | 3 | 4;

export type ProductFactsTrafficLightValue = 'low' | 'medium' | 'high';

export type ProductFactsMissingField =
  | 'productName'
  | 'imageUrl'
  | 'ingredientsText'
  | 'allergens'
  | 'nutrition'
  | 'nutriScoreGrade'
  | 'novaGroup'
  | 'trafficLight';

export type ProductFactsConfidence = 'low' | 'medium' | 'high';

export type ProductFactsAllergenDataStatus = 'present' | 'unknown';

export type ProductFactsAllergenInfoSource = 'off_structured' | 'none';

export interface ProductFactsAllergenInfo {
  dataStatus: ProductFactsAllergenDataStatus;
  declaredAllergens: string[];
  traceAllergens: string[];
  source: ProductFactsAllergenInfoSource;
}

export interface ProductFactsTrafficLight {
  sugar?: ProductFactsTrafficLightValue | null;
  salt?: ProductFactsTrafficLightValue | null;
  saturatedFat?: ProductFactsTrafficLightValue | null;
  fat?: ProductFactsTrafficLightValue | null;
}

export interface ProductFacts {
  barcode?: string | null;
  productName?: string | null;
  imageUrl?: string | null;

  nutriScoreGrade?: ProductFactsNutriScoreGrade | null;
  novaGroup?: ProductFactsNovaGroup | null;
  trafficLight?: ProductFactsTrafficLight | null;

  ingredientsText?: string | null;
  additives?: string[];
  allergens?: string[];
  traceAllergens?: string[];
  allergenInfo?: ProductFactsAllergenInfo;
  /**
   * Yerel OFF-TR katalogdan geldiyse zaten sınıflandırılmış (AllergenKey[])
   * alerjen verisi — ham etikete geri dönüştürülmeden taşınır. Doluysa,
   * mobil ürün sayfası bunu arama/sepetle AYNI birleştirme fonksiyonuyla
   * (evaluateCatalogAllergenDataForProfile) değerlendirir; boşsa eski
   * allergenInfo tabanlı (profil-farkında olmayan) yola düşer.
   */
  catalogAllergenData?: CatalogAllergenData;

  dataSource: ProductFactsSource;
  isComplete: boolean;
  missingFields?: ProductFactsMissingField[];
  verificationNeeded?: boolean;
  verificationReason?: string;
  confidence?: ProductFactsConfidence;
  sourceUrl?: string | null;
  observedAt?: string | null;
  verifiedAt?: string | null;
}

