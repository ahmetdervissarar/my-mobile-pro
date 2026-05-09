import type { ProductResult } from '../types/product';

export type ProductSearchInput = {
  barcode?: string;
  productName?: string;
  photoSource?: string;
};

const PRODUCT_API_URL = process.env.EXPO_PUBLIC_PRODUCT_API_URL?.trim() ?? '';

const MOCK_PRODUCTS: ProductResult[] = [
  {
    id: 'p-001',
    name: 'Yoğurtlu Protein Bar',
    barcode: '8691004000012',
    searchSource: 'barcode',
    healthScore: 74,
    priceText: '36,90 TL (Demo fiyat verisi)',
    warnings: ['Süt ürünü içerir', 'Yüksek protein içerir'],
  },
  {
    id: 'p-002',
    name: 'Şekersiz Fıstık Ezmesi',
    barcode: '8691004000029',
    searchSource: 'name',
    healthScore: 81,
    priceText: '89,50 TL (Demo fiyat verisi)',
    warnings: ['Yer fıstığı alerjeni içerir'],
  },
  {
    id: 'p-003',
    name: 'Tam Tahıllı Granola',
    barcode: '8691004000036',
    searchSource: 'photo',
    healthScore: 68,
    priceText: '62,00 TL (Demo fiyat verisi)',
    warnings: ['Gluten içerebilir', 'Ek şeker içerir'],
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
};

function hasProductApiUrl(): boolean {
  return PRODUCT_API_URL.length > 0;
}

export function getMockProductResult(input: ProductSearchInput): ProductResult {
  if (input.photoSource?.trim()) {
    return {
      ...MOCK_PRODUCTS[2],
      searchSource: 'photo',
    };
  }

  if (input.barcode?.trim()) {
    const byBarcode = MOCK_PRODUCTS.find((item) => item.barcode === input.barcode?.trim());

    return {
      ...(byBarcode ?? MOCK_PRODUCTS[0]),
      barcode: input.barcode.trim(),
      searchSource: 'barcode',
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

export function getProductResult(input: ProductSearchInput): ProductResult {
  try {
    if (hasProductApiUrl()) {
      // TODO: API URL hazır. Gerçek çağrı burada eklenecek.
      // Not: Şimdilik güvenli geçiş için mock sonuç dönmeye devam ediyoruz.
    }

    return getMockProductResult(input);
  } catch (error) {
    // Gelecekte gerçek API çağrısı hata verirse uygulamanın çökmesini önlemek için güvenli fallback.
    return getMockProductResult(input);
  }
}
