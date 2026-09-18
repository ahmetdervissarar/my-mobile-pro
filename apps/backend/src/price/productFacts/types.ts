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

/**
 * Katmanlı tamlık (A1B). `isComplete` yalnız `complete` iken true'dur.
 * - complete: skorlamada kullanılan tüm alanlar mevcut.
 * - partial: gerçek kaynak kaydı var, bazı alanlar eksik; kayıt ATILMAZ.
 * - insufficient: anlamlı gıda verisi yok; kullanılamaz sayılır.
 */
export type ProductFactsCompleteness = 'complete' | 'partial' | 'insufficient';

/**
 * Birbirinden bağımsız kullanılabilirlik yetenekleri.
 * - risk: yalnız yapılandırılmış alerjen/iz tag'i varken true; içerik metni tek başına açmaz.
 * - health: Nutri-Score, NOVA veya en az bir trafik ışığı değeri varken true.
 * - content: içerik metni veya katkı listesi varken true.
 */
export interface ProductFactsCapabilities {
  risk: boolean;
  health: boolean;
  content: boolean;
}

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

  dataSource: ProductFactsSource;
  isComplete: boolean;
  /** Opsiyonel (geriye uyumlu). Yoksa eski istemciler `isComplete` ile devam eder. */
  completeness?: ProductFactsCompleteness;
  /** Opsiyonel (geriye uyumlu). */
  capabilities?: ProductFactsCapabilities;
  missingFields?: ProductFactsMissingField[];
  verificationNeeded?: boolean;
  verificationReason?: string;
  confidence?: ProductFactsConfidence;
  sourceUrl?: string | null;
  observedAt?: string | null;
  verifiedAt?: string | null;
}

