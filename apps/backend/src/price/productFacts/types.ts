import type { CatalogAllergenData } from '../../catalog/catalog.js';

/**
 * Ürün verisinin kaynak sınıfı (ADR-009 §4). Her kaynağın izinleri tek yerde
 * tanımlıdır: sourcePolicy.ts. Mobil kopya: apps/mobile/src/price/types.ts —
 * ikisi AYNI değişiklikte güncellenir.
 *
 *   off               Open Food Facts yapılandırılmış verisi
 *   rafskoru_verified İnsan onaylı etiket kaydı (labelStore, güncel sürüm)
 *   label_unverified  Etiket fotoğrafından okunmuş, henüz onaylanmamış aday
 *   beta_inference    Ad/kategori tahmini (yalnız "tahmin" etiketiyle)
 */
export type ProductFactsSource = 'off' | 'rafskoru_verified' | 'label_unverified' | 'beta_inference';

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

/** Kaynağı alan bazında izlenebilen alanlar (ADR-009 §4, §7a). */
export type ProductFactsFieldKey =
  | 'productName'
  | 'imageUrl'
  | 'ingredientsText'
  | 'allergens'
  | 'nutriScoreGrade'
  | 'novaGroup';

export interface ProductFactsFieldSource {
  source: ProductFactsSource;
  /** O alanın kaynağının gözlem zamanı (ISO); bilinmiyorsa null. */
  observedAt: string | null;
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
  /**
   * Alerjen kontrolünün taraması gereken içindekiler metni (ADR-009 §12,
   * 2026-11-19). Yalnız OFF ile insan onaylı etiket kaydının içindekiler
   * metinleri FARKLIYSA doludur ve İKİSİNİ birlikte taşır: ekranda hangisi
   * gösterilirse gösterilsin, alerjen iki metinden birinde geçiyorsa uyarı
   * verilir ("daha az temkinli olamaz"). Ekranda gösterilmez. Yoksa alerjen
   * kontrolü ingredientsText'i kullanır.
   */
  allergenCheckIngredientsText?: string | null;
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
  /**
   * Yalnız kaynağı `dataSource`tan FARKLI olan alanlar için doludur (karışık
   * kaynak). Yoksa bütün alanlar `dataSource`tan gelir. Bir alanın başka
   * kaynaktan geldiği hâlde burada anılmaması sözleşme ihlalidir.
   */
  fieldSources?: Partial<Record<ProductFactsFieldKey, ProductFactsFieldSource>>;
  /**
   * Ürün puan kapsamı dışındaysa nedeni (ADR-009 §11); yoksa kapsam içi.
   * Yalnız yapılandırılmış veriden gelir (OFF kategorisi veya onaylayanın
   * seçtiği ürün türü); ürün adından çıkarılmaz. Alerjen değerlendirmesini
   * ETKİLEMEZ.
   */
  scoreScopeExclusion?: 'alcoholic_beverage' | null;
  isComplete: boolean;
  missingFields?: ProductFactsMissingField[];
  verificationNeeded?: boolean;
  verificationReason?: string;
  confidence?: ProductFactsConfidence;
  sourceUrl?: string | null;
  observedAt?: string | null;
  verifiedAt?: string | null;
}

