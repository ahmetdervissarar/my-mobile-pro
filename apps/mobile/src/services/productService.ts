import type { ProductResult } from '../types/product';
import { createTrafficLightNutrition } from '../nutrition/trafficLight';
import { fetchOpenFoodFactsByBarcode } from './openFoodFactsService';
import { calculateHealthScore } from '../scoring/healthScore';

export type ProductSearchInput = {
  barcode?: string;
  productName?: string;
  photoSource?: string;
};

const PRODUCT_API_URL = process.env.EXPO_PUBLIC_PRODUCT_API_URL?.trim() ?? '';

const LOW_SUGAR_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 3.2,
  saturatedFat: 0.8,
  sugars: 2.1,
  salt: 0.12,
});

const SWEET_SNACK_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 12.4,
  saturatedFat: 5.8,
  sugars: 28.5,
  salt: 0.32,
});

const GRANOLA_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 8.1,
  saturatedFat: 1.4,
  sugars: 18.7,
  salt: 0.18,
});

const UNKNOWN_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: null,
  saturatedFat: null,
  sugars: null,
  salt: null,
});

const MOCK_PRODUCTS: ProductResult[] = [
  {
    id: 'p-001',
    name: 'Yoğurtlu Protein Bar',
    barcode: '8691004000012',
    searchSource: 'barcode',
    healthScore: 74,
    priceText: '36,90 TL (Demo fiyat verisi)',
    warnings: ['Süt ürünü içerir', 'Yüksek protein içerir'],
    allergens: ['Süt'],
    additives: [],
    ingredients: 'Süt proteini, yoğurt tozu, lif karışımı, tatlandırıcı (steviol glikozitleri).',
    nutriScore: null,
    novaGroup: null,
    trafficLight: SWEET_SNACK_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-002',
    name: 'Şekersiz Fıstık Ezmesi',
    barcode: '8691004000029',
    searchSource: 'name',
    healthScore: 81,
    priceText: '89,50 TL (Demo fiyat verisi)',
    warnings: ['Yer fıstığı alerjeni içerir'],
    allergens: ['Yer fıstığı'],
    additives: [],
    ingredients: 'Yer fıstığı (%99,5), deniz tuzu.',
    nutriScore: null,
    novaGroup: null,
    trafficLight: LOW_SUGAR_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-003',
    name: 'Tam Tahıllı Granola',
    barcode: '8691004000036',
    searchSource: 'photo',
    healthScore: 68,
    priceText: '62,00 TL (Demo fiyat verisi)',
    warnings: ['Gluten içerebilir', 'Ek şeker içerir'],
    allergens: ['Gluten'],
    additives: [],
    ingredients: 'Yulaf, bal, kuru meyve, bitkisel yağ, şeker.',
    nutriScore: 'E',
    novaGroup: null,
    trafficLight: GRANOLA_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
];

const fallbackProduct: ProductResult = {
  id: 'p-fallback',
  name: 'Tanınmayan Ürün',
  barcode: 'Bilinmiyor',
  searchSource: 'name',
  healthScore: 50,
  priceText: 'Demo ürün - fiyat bilgisi yok',
  warnings: ['Detaylı analiz için gerçek API entegrasyonu bekleniyor'],
  allergens: [],
  additives: [],
  ingredients: null,
  nutriScore: null,
  novaGroup: null,
  trafficLight: UNKNOWN_TRAFFIC_LIGHT,
  analysisStatus: 'not_found',
  analysisMessage: 'Bu ürün için güvenilir barkod verisi bulunamadı.',
};

function hasProductApiUrl(): boolean {
  return PRODUCT_API_URL.length > 0;
}

export function mapApiResponseToProductResult(apiResponse: unknown): ProductResult {
  // TODO: API alanları kontrol edilecek.
  // TODO: Eksik alanlar güvenli varsayılan değerlerle doldurulacak.
  // TODO: price değeri TL formatına çevrilecek.
  // TODO: warnings dizisi/metni ekrana uygun hale getirilecek.
  void apiResponse;

  return fallbackProduct;
}

export async function fetchProductFromApi(input: ProductSearchInput): Promise<ProductResult | null> {
  if (!hasProductApiUrl()) {
    return null;
  }

  // TODO: API URL .env içinden alınacak.
  // TODO: barkod / ürün adı / fotoğraf kaynağı API'ye gönderilecek.
  // TODO: API cevabı ProductResult formatına çevrilecek.
  void input;

  return null;
}

export function getMockProductResult(input: ProductSearchInput): ProductResult {
  if (input.photoSource?.trim()) {
    return {
      ...MOCK_PRODUCTS[2],
      searchSource: 'photo',
    };
  }

  if (input.barcode?.trim()) {
    const barcode = input.barcode.trim();
    const byBarcode = MOCK_PRODUCTS.find((item) => item.barcode === barcode);

    if (byBarcode) {
      return {
        ...byBarcode,
        barcode,
        searchSource: 'barcode',
      };
    }

    // Barkod eşleşmesi yok — yanlış mock döndürmek yerine açık not_found dön
    return {
      ...fallbackProduct,
      id: `p-unknown-barcode-${barcode}`,
      name: 'Barkodlu ürün bulunamadı',
      barcode,
      searchSource: 'barcode',
      analysisStatus: 'not_found',
      analysisMessage: 'Bu barkod için ürün bilgisi bulunamadı. Ürün etiketi kontrol edilmelidir.',
      trafficLight: UNKNOWN_TRAFFIC_LIGHT,
      healthScore: 50,
      nutriScore: null,
      novaGroup: null,
      ingredients: null,
      allergens: [],
      additives: [],
    };
  }

  if (input.productName?.trim()) {
    const normalizedName = input.productName.trim().toLowerCase();
    const byName = MOCK_PRODUCTS.find((item) => item.name.toLowerCase().includes(normalizedName));

    return {
      ...(byName ?? fallbackProduct),
      name: input.productName.trim(),
      searchSource: 'name',
    };
  }

  return fallbackProduct;
}

// ─── Open Food Facts Yardımcıları ─────────────────────────────────────────────

type NutritionValues = {
  fat: number | null;
  saturatedFat: number | null;
  sugars: number | null;
  salt: number | null;
};

/**
 * nutritionValues içindeki tüm alanlar null ise gerçek besin verisi yok
 * demektir; bu durumda UNKNOWN_TRAFFIC_LIGHT kullanılır.
 */
function resolveTrafficLight(nutritionValues: NutritionValues) {
  const hasAnyValue =
    nutritionValues.fat !== null ||
    nutritionValues.saturatedFat !== null ||
    nutritionValues.sugars !== null ||
    nutritionValues.salt !== null;

  if (!hasAnyValue) {
    return UNKNOWN_TRAFFIC_LIGHT;
  }

  return createTrafficLightNutrition({
    fat: nutritionValues.fat,
    saturatedFat: nutritionValues.saturatedFat,
    sugars: nutritionValues.sugars,
    salt: nutritionValues.salt,
  });
}

/**
 * Open Food Facts'ten dönen kayıtta gıda analizi yapmaya yetecek en az bir
 * anlamlı alan var mı kontrol eder.
 *
 * Hiçbir alan dolmamışsa ürün gıda dışı bir barkod (ıslak mendil, temizlik
 * ürünü vb.) olabilir; bu durumda analiz yapılmamalıdır.
 */
function hasMeaningfulFoodData(
  productName: string | null,
  ingredients: string | null,
  allergens: string[],
  additives: string[],
  nutriScore: string | null,
  novaGroup: number | null,
  nutritionValues: NutritionValues,
): boolean {
  // productName tek başına yeterli sayılmaz: gıda dışı bir ürün de
  // isimle dönebilir. Analiz için besin/içerik verisinin bulunması gerekir.
  void productName;

  return (
    !!ingredients?.trim() ||
    allergens.length > 0 ||
    additives.length > 0 ||
    nutriScore !== null ||
    novaGroup !== null ||
    nutritionValues.fat !== null ||
    nutritionValues.saturatedFat !== null ||
    nutritionValues.sugars !== null ||
    nutritionValues.salt !== null
  );
}

function mapOpenFoodFactsToProductResult(
  barcode: string,
  productName: string | null,
  allergens: string[],
  additives: string[],
  ingredients: string | null,
  nutriScore: string | null,
  novaGroup: number | null,
  nutritionValues: NutritionValues,
): ProductResult {
  const trafficLight = resolveTrafficLight(nutritionValues);

  const isAnalysisReady = hasMeaningfulFoodData(
    productName,
    ingredients,
    allergens,
    additives,
    nutriScore,
    novaGroup,
    nutritionValues,
  );

  if (!isAnalysisReady) {
    return {
      id: `off-${barcode}`,
      name: productName?.trim() || 'Tanınmayan Ürün',
      barcode,
      searchSource: 'barcode',
      healthScore: 50,
      priceText: 'Demo ürün - fiyat bilgisi yok',
      warnings: [],
      allergens: [],
      additives: [],
      ingredients: null,
      nutriScore: null,
      novaGroup: null,
      trafficLight: UNKNOWN_TRAFFIC_LIGHT,
      analysisStatus: 'insufficient_food_data',
      analysisMessage:
        'Bu barkod için gıda analizi yapmaya yetecek besin veya içerik verisi bulunamadı.',
    };
  }

  const healthScore = calculateHealthScore({ nutriScore, novaGroup, trafficLight });

  return {
    id: `off-${barcode}`,
    name: productName?.trim() || 'Tanınmayan Ürün',
    barcode,
    searchSource: 'barcode',
    healthScore,
    priceText: 'Demo ürün - fiyat bilgisi yok',
    warnings: ['Ürün bilgisi Open Food Facts kaynağından alınmıştır. Eksik veya hatalı olabilir.'],
    allergens,
    additives,
    ingredients,
    nutriScore,
    novaGroup,
    trafficLight,
    analysisStatus: 'ready',
    analysisMessage: null,
  };
}

export async function getProductResult(input: ProductSearchInput): Promise<ProductResult> {
  try {
    const barcode = input.barcode?.trim();

    if (barcode) {
      const openFoodFactsResult = await fetchOpenFoodFactsByBarcode(barcode);

      if (openFoodFactsResult) {
        return mapOpenFoodFactsToProductResult(
          barcode,
          openFoodFactsResult.productName,
          openFoodFactsResult.allergens,
          openFoodFactsResult.additives,
          openFoodFactsResult.ingredientsText,
          openFoodFactsResult.nutriScore,
          openFoodFactsResult.novaGroup,
          openFoodFactsResult.nutritionValues,
        );
      }

      // OFF'tan kayıt dönmedi — not_found
      return {
        ...fallbackProduct,
        id: `p-unknown-barcode-${barcode}`,
        name: 'Barkodlu ürün bulunamadı',
        barcode,
        searchSource: 'barcode',
        analysisStatus: 'not_found',
        analysisMessage:
          'Bu barkod için ürün bilgisi bulunamadı. Ürün etiketi kontrol edilmelidir.',
      };
    }

    if (hasProductApiUrl()) {
      // TODO: API URL hazır. Gerçek çağrı burada eklenecek.
      // Not: Barkod dışı kaynaklarda şimdilik mock sonuç dönmeye devam ediyoruz.
    }

    return getMockProductResult(input);
  } catch (error) {
    // Gelecekte gerçek API çağrısı hata verirse uygulamanın çökmesini önlemek için güvenli fallback.
    return getMockProductResult(input);
  }
}