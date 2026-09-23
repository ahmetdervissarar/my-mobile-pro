import type { CatalogAllergenData } from '../../catalog/catalog.js';

export type ProductFactsSource = 'off' | 'beta_inference';

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
  sugars?: ProductFactsTrafficLightValue | null;
  salt?: ProductFactsTrafficLightValue | null;
  saturatedFat?: ProductFactsTrafficLightValue | null;
  fat?: ProductFactsTrafficLightValue | null;
}

/** Besin verisinin hangi porsiyon tabanına göre verildiği. OFF-TR bugün yalnız per_100g üretir. */
export type ProductFactsNutritionBasis = 'per_100g' | 'per_100ml';

/**
 * Ham (sınıflandırılmamış) besin değerleri, gram/kcal cinsinden — kronik durum
 * eşik kurallarının (bkz. riskEngine.ts) girdisidir. trafficLight yalnız
 * bunlardan türetilmiş düşük/orta/yüksek BİLGİ bandını taşır; kural
 * hesaplaması bu alandan, ham değerden yapılır.
 */
export interface ProductFactsNutrition100g {
  energyKcal: number | null;
  sugars: number | null;
  salt: number | null;
  saturatedFat: number | null;
  fiber: number | null;
  proteins: number | null;
  carbohydrates: number | null;
  /** OFF-TR içe aktarımı bu alanı bugün üretmiyor; veri kaynağı eklenene kadar hep null. */
  transFat: number | null;
}

export interface ProductFacts {
  barcode?: string | null;
  productName?: string | null;
  imageUrl?: string | null;

  nutriScoreGrade?: ProductFactsNutriScoreGrade | null;
  novaGroup?: ProductFactsNovaGroup | null;
  trafficLight?: ProductFactsTrafficLight | null;
  nutrition100g?: ProductFactsNutrition100g | null;
  nutritionBasis?: ProductFactsNutritionBasis | null;

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

