export type TrafficLightLevel = 'low' | 'medium' | 'high' | 'unknown';

export type NutritionValue = {
  value: number | null;
  unit: 'g' | 'mg' | null;
  level: TrafficLightLevel;
};

export type TrafficLightNutrition = {
  fat: NutritionValue;
  saturatedFat: NutritionValue;
  sugars: NutritionValue;
  salt: NutritionValue;
};

/**
 * Ürünün gıda analizi için uygunluk durumunu belirtir.
 * - ready: Yeterli veri var; riskEngine ve Traffic Light çalışabilir.
 * - not_found: Barkod için kayıt bulunamadı.
 * - insufficient_food_data: Kayıt var ama anlamlı gıda verisi yok
 *   (örn. ıslak mendil, temizlik ürünü gibi gıda dışı barkodlar).
 */
export type AnalysisStatus = 'ready' | 'not_found' | 'insufficient_food_data';

export type ProductResult = {
  id: string;
  name: string;
  barcode: string;
  searchSource: 'barcode' | 'name' | 'photo';
  healthScore: number;
  priceText: string;
  imageUrl?: string | null;
  warnings: string[];
  allergens: string[];
  additives: string[];
  ingredients: string | null;
  nutriScore: string | null;
  novaGroup: number | null;
  trafficLight?: TrafficLightNutrition | null;
  /** Gıda analizi uygunluk durumu */
  analysisStatus: AnalysisStatus;
  /** analysisStatus !== 'ready' ise kullanıcıya gösterilecek açıklama; 'ready' ise null */
  analysisMessage: string | null;
};