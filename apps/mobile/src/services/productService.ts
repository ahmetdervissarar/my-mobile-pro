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

const CRACKER_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 7.2,
  saturatedFat: 1.1,
  sugars: 1.8,
  salt: 0.6,
});

const MILK_BAR_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 11.8,
  saturatedFat: 4.9,
  sugars: 24.0,
  salt: 0.28,
});

const DRINK_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 0.2,
  saturatedFat: 0.0,
  sugars: 18.0,
  salt: 0.05,
});

const SOUP_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 3.5,
  saturatedFat: 0.8,
  sugars: 1.2,
  salt: 1.6,
});

const CANDY_TRAFFIC_LIGHT = createTrafficLightNutrition({
  fat: 0.1,
  saturatedFat: 0.0,
  sugars: 54.0,
  salt: 0.05,
});

const MOCK_PRODUCTS: ProductResult[] = [
  {
    id: 'p-001',
    name: 'YoÄŸurtlu Protein Bar',
    barcode: '8691004000012',
    searchSource: 'barcode',
    healthScore: 74,
    priceText: '36,90 TL (Demo fiyat verisi)',
    warnings: ['SÃ¼t Ã¼rÃ¼nÃ¼ iÃ§erir', 'YÃ¼ksek protein iÃ§erir'],
    allergens: ['SÃ¼t'],
    additives: [],
    ingredients: 'SÃ¼t proteini, yoÄŸurt tozu, lif karÄ±ÅŸÄ±mÄ±, tatlandÄ±rÄ±cÄ± (steviol glikozitleri).',
    nutriScore: null,
    novaGroup: null,
    trafficLight: SWEET_SNACK_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-002',
    name: 'Åekersiz FÄ±stÄ±k Ezmesi',
    barcode: '8691004000029',
    searchSource: 'name',
    healthScore: 81,
    priceText: '89,50 TL (Demo fiyat verisi)',
    warnings: ['Yer fÄ±stÄ±ÄŸÄ± alerjeni iÃ§erir'],
    allergens: ['Yer fÄ±stÄ±ÄŸÄ±'],
    additives: [],
    ingredients: 'Yer fÄ±stÄ±ÄŸÄ± (%99,5), deniz tuzu.',
    nutriScore: null,
    novaGroup: null,
    trafficLight: LOW_SUGAR_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-003',
    name: 'Tam TahÄ±llÄ± Granola',
    barcode: '8691004000036',
    searchSource: 'photo',
    healthScore: 68,
    priceText: '62,00 TL (Demo fiyat verisi)',
    warnings: ['Gluten iÃ§erebilir', 'Ek ÅŸeker iÃ§erir'],
    allergens: ['Gluten'],
    additives: [],
    ingredients: 'Yulaf, bal, kuru meyve, bitkisel yaÄŸ, ÅŸeker.',
    nutriScore: 'E',
    novaGroup: null,
    trafficLight: GRANOLA_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-004',
    name: 'Tam BuÄŸdaylÄ± Kraker',
    barcode: '8691004000043',
    searchSource: 'name',
    healthScore: 58,
    priceText: '44,90 TL (Demo fiyat verisi)',
    warnings: ['Gluten iÃ§erir'],
    allergens: ['gluten'],
    additives: [],
    ingredients: 'Tam buÄŸday unu, bitkisel yaÄŸ, tuz, maya.',
    nutriScore: null,
    novaGroup: null,
    trafficLight: CRACKER_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-005',
    name: 'SÃ¼tlÃ¼ Protein Bar',
    barcode: '8691004000050',
    searchSource: 'name',
    healthScore: 64,
    priceText: '39,90 TL (Demo fiyat verisi)',
    warnings: ['SÃ¼t iÃ§erir'],
    allergens: ['milk'],
    additives: [],
    ingredients: 'SÃ¼t proteini, yoÄŸurt tozu, kakao, tatlandÄ±rÄ±cÄ±.',
    nutriScore: null,
    novaGroup: null,
    trafficLight: MILK_BAR_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-006',
    name: 'AromalÄ± Ä°Ã§ecek',
    barcode: '8691004000067',
    searchSource: 'name',
    healthScore: 42,
    priceText: '24,90 TL (Demo fiyat verisi)',
    warnings: ['KatkÄ± maddesi iÃ§erir'],
    allergens: ['Alerjen beyanÄ± yok'],
    additives: ['sitrik asit', 'aroma verici'],
    ingredients: 'Su, ÅŸeker, aroma verici, sitrik asit.',
    nutriScore: 'D',
    novaGroup: null,
    trafficLight: DRINK_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-007',
    name: 'HazÄ±r Ã‡orba',
    barcode: '8691004000074',
    searchSource: 'name',
    healthScore: 38,
    priceText: '19,90 TL (Demo fiyat verisi)',
    warnings: ['Ultra iÅŸlenmiÅŸ Ã¼rÃ¼n olabilir'],
    allergens: ['Alerjen beyanÄ± yok'],
    additives: [],
    ingredients: 'Modifiye niÅŸasta, aroma verici, tuz, bitkisel yaÄŸ.',
    nutriScore: 'C',
    novaGroup: 4,
    trafficLight: SOUP_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-008',
    name: 'Renkli Jelibon',
    barcode: '8691004000081',
    searchSource: 'name',
    healthScore: 25,
    priceText: '29,90 TL (Demo fiyat verisi)',
    warnings: ['YÃ¼ksek ÅŸeker iÃ§erir', 'KatkÄ± maddesi iÃ§erir'],
    allergens: ['Alerjen beyanÄ± yok'],
    additives: ['aroma verici', 'renklendirici'],
    ingredients: 'Glikoz ÅŸurubu, ÅŸeker, jelatin, aroma verici, renklendirici.',
    nutriScore: 'E',
    novaGroup: 4,
    trafficLight: CANDY_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
];

const fallbackProduct: ProductResult = {
  id: 'p-fallback',
  name: 'TanÄ±nmayan ÃœrÃ¼n',
  barcode: 'Bilinmiyor',
  searchSource: 'name',
  healthScore: 50,
  priceText: 'Demo Ã¼rÃ¼n - fiyat bilgisi yok',
  warnings: ['DetaylÄ± analiz iÃ§in gerÃ§ek API entegrasyonu bekleniyor'],
  allergens: [],
  additives: [],
  ingredients: null,
  nutriScore: null,
  novaGroup: null,
  trafficLight: UNKNOWN_TRAFFIC_LIGHT,
  analysisStatus: 'not_found',
  analysisMessage: 'Bu Ã¼rÃ¼n iÃ§in gÃ¼venilir barkod verisi bulunamadÄ±.',
};

function hasProductApiUrl(): boolean {
  return PRODUCT_API_URL.length > 0;
}

export function mapApiResponseToProductResult(apiResponse: unknown): ProductResult {
  // TODO: API alanlarÄ± kontrol edilecek.
  // TODO: Eksik alanlar gÃ¼venli varsayÄ±lan deÄŸerlerle doldurulacak.
  // TODO: price deÄŸeri TL formatÄ±na Ã§evrilecek.
  // TODO: warnings dizisi/metni ekrana uygun hale getirilecek.
  void apiResponse;

  return fallbackProduct;
}

export async function fetchProductFromApi(input: ProductSearchInput): Promise<ProductResult | null> {
  if (!hasProductApiUrl()) {
    return null;
  }

  // TODO: API URL .env iÃ§inden alÄ±nacak.
  // TODO: barkod / Ã¼rÃ¼n adÄ± / fotoÄŸraf kaynaÄŸÄ± API'ye gÃ¶nderilecek.
  // TODO: API cevabÄ± ProductResult formatÄ±na Ã§evrilecek.
  void input;

  return null;
}

/**
 * ÃœrÃ¼n adÄ± aramasÄ±nda TÃ¼rkÃ§e karakter ve bÃ¼yÃ¼k/kÃ¼Ã§Ã¼k harf farkÄ±nÄ± gidermek iÃ§in
 * kullanÄ±lan normalleÅŸtirici.
 *
 * AdÄ±mlar:
 * 1. trim â€” baÅŸtaki/sondaki boÅŸluklarÄ± at.
 * 2. Ä± â†’ i â€” dotless-Ä± NFD ile ayrÄ±ÅŸmaz; aÃ§Ä±kÃ§a deÄŸiÅŸtirilir.
 * 3. NFD normalize â€” ÅŸ, Ã§, ÄŸ, Ã¼, Ã¶, Ä° gibi karakterleri temel harf + iÅŸaret Ã§iftine bÃ¶ler.
 * 4. BirleÅŸtirici iÅŸaretleri (U+0300â€“U+036F) kaldÄ±r â€” temel Latin harfleri kalÄ±r.
 * 5. toLowerCase â€” bÃ¼yÃ¼k/kÃ¼Ã§Ã¼k harf farkÄ±nÄ± kapat.
 *
 * Ã–rnek: "AromalÄ± Ä°Ã§ecek" â†’ "aromali iceecek" â†’ doÄŸru: "aromali icecek"
 */
function normalizeSearchText(text: string): string {
  return text
    .trim()
    .replace(/Ä±/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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

    // Barkod eÅŸleÅŸmesi yok â€” yanlÄ±ÅŸ mock dÃ¶ndÃ¼rmek yerine aÃ§Ä±k not_found dÃ¶n
    return {
      ...fallbackProduct,
      id: `p-unknown-barcode-${barcode}`,
      name: 'Barkodlu Ã¼rÃ¼n bulunamadÄ±',
      barcode,
      searchSource: 'barcode',
      analysisStatus: 'not_found',
      analysisMessage: 'Bu barkod iÃ§in Ã¼rÃ¼n bilgisi bulunamadÄ±. ÃœrÃ¼n etiketi kontrol edilmelidir.',
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
    const normalizedName = normalizeSearchText(input.productName);
    const byName = MOCK_PRODUCTS.find((item) =>
      normalizeSearchText(item.name).includes(normalizedName),
    );

    return {
      ...(byName ?? fallbackProduct),
      name: input.productName.trim(),
      searchSource: 'name',
    };
  }

  return fallbackProduct;
}

// â”€â”€â”€ Open Food Facts YardÄ±mcÄ±larÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type NutritionValues = {
  fat: number | null;
  saturatedFat: number | null;
  sugars: number | null;
  salt: number | null;
};

/**
 * nutritionValues iÃ§indeki tÃ¼m alanlar null ise gerÃ§ek besin verisi yok
 * demektir; bu durumda UNKNOWN_TRAFFIC_LIGHT kullanÄ±lÄ±r.
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
 * Open Food Facts'ten dÃ¶nen kayÄ±tta gÄ±da analizi yapmaya yetecek en az bir
 * anlamlÄ± alan var mÄ± kontrol eder.
 *
 * HiÃ§bir alan dolmamÄ±ÅŸsa Ã¼rÃ¼n gÄ±da dÄ±ÅŸÄ± bir barkod (Ä±slak mendil, temizlik
 * Ã¼rÃ¼nÃ¼ vb.) olabilir; bu durumda analiz yapÄ±lmamalÄ±dÄ±r.
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
  // productName tek baÅŸÄ±na yeterli sayÄ±lmaz: gÄ±da dÄ±ÅŸÄ± bir Ã¼rÃ¼n de
  // isimle dÃ¶nebilir. Analiz iÃ§in besin/iÃ§erik verisinin bulunmasÄ± gerekir.
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
  imageUrl: string | null,
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
      name: productName?.trim() || 'TanÄ±nmayan ÃœrÃ¼n',
      barcode,
      imageUrl,
      searchSource: 'barcode',
      healthScore: 50,
      priceText: 'Demo Ã¼rÃ¼n - fiyat bilgisi yok',
      warnings: [],
      allergens: [],
      additives: [],
      ingredients: null,
      nutriScore: null,
      novaGroup: null,
      trafficLight: UNKNOWN_TRAFFIC_LIGHT,
      analysisStatus: 'insufficient_food_data',
      analysisMessage:
        'Bu barkod iÃ§in gÄ±da analizi yapmaya yetecek besin veya iÃ§erik verisi bulunamadÄ±.',
    };
  }

  const healthScore = calculateHealthScore({ nutriScore, novaGroup, trafficLight });

  return {
    id: `off-${barcode}`,
    name: productName?.trim() || 'TanÄ±nmayan ÃœrÃ¼n',
    barcode,
      imageUrl,
    searchSource: 'barcode',
    healthScore,
    priceText: 'Demo Ã¼rÃ¼n - fiyat bilgisi yok',
    warnings: ['ÃœrÃ¼n bilgisi Open Food Facts kaynaÄŸÄ±ndan alÄ±nmÄ±ÅŸtÄ±r. Eksik veya hatalÄ± olabilir.'],
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
          openFoodFactsResult.imageUrl,
          openFoodFactsResult.allergens,
          openFoodFactsResult.additives,
          openFoodFactsResult.ingredientsText,
          openFoodFactsResult.nutriScore,
          openFoodFactsResult.novaGroup,
          openFoodFactsResult.nutritionValues,
        );
      }

      // OFF'tan kayÄ±t dÃ¶nmedi â€” not_found
      return {
        ...fallbackProduct,
        id: `p-unknown-barcode-${barcode}`,
        name: 'Barkodlu Ã¼rÃ¼n bulunamadÄ±',
        barcode,
        searchSource: 'barcode',
        analysisStatus: 'not_found',
        analysisMessage:
          'Bu barkod iÃ§in Ã¼rÃ¼n bilgisi bulunamadÄ±. ÃœrÃ¼n etiketi kontrol edilmelidir.',
      };
    }

    if (hasProductApiUrl()) {
      // TODO: API URL hazÄ±r. GerÃ§ek Ã§aÄŸrÄ± burada eklenecek.
      // Not: Barkod dÄ±ÅŸÄ± kaynaklarda ÅŸimdilik mock sonuÃ§ dÃ¶nmeye devam ediyoruz.
    }

    return getMockProductResult(input);
  } catch (error) {
    // Gelecekte gerÃ§ek API Ã§aÄŸrÄ±sÄ± hata verirse uygulamanÄ±n Ã§Ã¶kmesini Ã¶nlemek iÃ§in gÃ¼venli fallback.
    return getMockProductResult(input);
  }
}
