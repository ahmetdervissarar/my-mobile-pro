import type { ProductResult } from '../types/product';
import { createTrafficLightNutrition } from '../nutrition/trafficLight';

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
  {
    id: 'p-004',
    name: 'Tam Buğdaylı Kraker',
    barcode: '8691004000043',
    searchSource: 'name',
    healthScore: 58,
    priceText: '44,90 TL (Demo fiyat verisi)',
    warnings: ['Gluten içerir'],
    allergens: ['gluten'],
    additives: [],
    ingredients: 'Tam buğday unu, bitkisel yağ, tuz, maya.',
    nutriScore: null,
    novaGroup: null,
    trafficLight: CRACKER_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-005',
    name: 'Sütlü Protein Bar',
    barcode: '8691004000050',
    searchSource: 'name',
    healthScore: 64,
    priceText: '39,90 TL (Demo fiyat verisi)',
    warnings: ['Süt içerir'],
    allergens: ['milk'],
    additives: [],
    ingredients: 'Süt proteini, yoğurt tozu, kakao, tatlandırıcı.',
    nutriScore: null,
    novaGroup: null,
    trafficLight: MILK_BAR_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-006',
    name: 'Aromalı İçecek',
    barcode: '8691004000067',
    searchSource: 'name',
    healthScore: 42,
    priceText: '24,90 TL (Demo fiyat verisi)',
    warnings: ['Katkı maddesi içerir'],
    allergens: ['Alerjen beyanı yok'],
    additives: ['sitrik asit', 'aroma verici'],
    ingredients: 'Su, şeker, aroma verici, sitrik asit.',
    nutriScore: 'D',
    novaGroup: null,
    trafficLight: DRINK_TRAFFIC_LIGHT,
    analysisStatus: 'ready',
    analysisMessage: null,
  },
  {
    id: 'p-007',
    name: 'Hazır Çorba',
    barcode: '8691004000074',
    searchSource: 'name',
    healthScore: 38,
    priceText: '19,90 TL (Demo fiyat verisi)',
    warnings: ['Ultra işlenmiş ürün olabilir'],
    allergens: ['Alerjen beyanı yok'],
    additives: [],
    ingredients: 'Modifiye nişasta, aroma verici, tuz, bitkisel yağ.',
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
    warnings: ['Yüksek şeker içerir', 'Katkı maddesi içerir'],
    allergens: ['Alerjen beyanı yok'],
    additives: ['aroma verici', 'renklendirici'],
    ingredients: 'Glikoz şurubu, şeker, jelatin, aroma verici, renklendirici.',
    nutriScore: 'E',
    novaGroup: 4,
    trafficLight: CANDY_TRAFFIC_LIGHT,
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

/**
 * Ürün adı aramasında Türkçe karakter ve büyük/küçük harf farkını gidermek için
 * kullanılan normalleştirici.
 *
 * Adımlar:
 * 1. trim — baştaki/sondaki boşlukları at.
 * 2. ı → i — dotless-ı NFD ile ayrışmaz; açıkça değiştirilir.
 * 3. NFD normalize — ş, ç, ğ, ü, ö, İ gibi karakterleri temel harf + işaret çiftine böler.
 * 4. Birleştirici işaretleri (U+0300–U+036F) kaldır — temel Latin harfleri kalır.
 * 5. toLowerCase — büyük/küçük harf farkını kapat.
 *
 * Örnek: "Aromalı İçecek" → "aromali icecek" → doğru: "aromali icecek"
 */
function normalizeSearchText(text: string): string {
  return text
    .trim()
    .replace(/ı/g, 'i')
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

/**
 * Isim/foto aramalari icin fallback urun ozeti.
 *
 * Not: Barkod urun verisi artik backend ProductFacts hattinin sorumlulugundadir.
 * Bu fonksiyon barkod icin Open Food Facts sorgusu yapmaz ve saglik skoru hesaplamaz.
 * Barkodla cagrilirsa rastgele mock yerine acik not_found doner.
 */
export async function getFallbackProductSummary(
  input: ProductSearchInput,
): Promise<ProductResult> {
  try {
    const barcode = input.barcode?.trim();

    if (barcode) {
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
      // TODO: Barkod disi kaynaklar icin gercek API cagrisi buraya eklenecek.
    }

    const productName = input.productName?.trim();
    const photoSource = input.photoSource?.trim();

    return {
      ...fallbackProduct,
      id: productName ? `p-name-pending-${productName}` : 'p-photo-pending',
      name: productName || (photoSource ? 'Fotoğraftan ürün analizi bekleniyor' : 'Ürün analizi bekleniyor'),
      barcode: 'Bilinmiyor',
      searchSource: photoSource ? 'photo' : 'name',
      healthScore: 0,
      priceText: '',
      imageUrl: photoSource || null,
      warnings: [],
      allergens: [],
      additives: [],
      ingredients: null,
      nutriScore: null,
      novaGroup: null,
      trafficLight: null,
      analysisStatus: 'not_found',
      analysisMessage: 'Ürün bilgileri doğrulanıyor. Sağlık ve alerjen yorumu için güvenilir ürün verisi bekleniyor.',
    };
  } catch {
    return {
      ...fallbackProduct,
      healthScore: 0,
      priceText: '',
      warnings: [],
      allergens: [],
      additives: [],
      ingredients: null,
      nutriScore: null,
      novaGroup: null,
      trafficLight: null,
      analysisStatus: 'not_found',
      analysisMessage: 'Ürün bilgileri doğrulanıyor. Sağlık ve alerjen yorumu için güvenilir ürün verisi bekleniyor.',
    };
  }
}

