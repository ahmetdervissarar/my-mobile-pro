export type ProductSearchInput = {
  barcode?: string;
  productName?: string;
  photoSource?: string;
};

export type ProductResult = {
  id: string;
  productName: string;
  barcode: string;
  source: 'barcode' | 'name' | 'photo';
  healthScore: number;
  price: {
    amount: number;
    currency: 'TRY';
    note: string;
  };
  warnings: string[];
};

const PRODUCT_API_URL = process.env.EXPO_PUBLIC_PRODUCT_API_URL?.trim() ?? '';

const MOCK_PRODUCTS: ProductResult[] = [
  {
    id: 'p-001',
    productName: 'Yoğurtlu Protein Bar',
    barcode: '8691004000012',
    source: 'barcode',
    healthScore: 74,
    price: {
      amount: 36.9,
      currency: 'TRY',
      note: 'Demo fiyat verisi',
    },
    warnings: ['Süt ürünü içerir', 'Yüksek protein içerir'],
  },
  {
    id: 'p-002',
    productName: 'Şekersiz Fıstık Ezmesi',
    barcode: '8691004000029',
    source: 'name',
    healthScore: 81,
    price: {
      amount: 89.5,
      currency: 'TRY',
      note: 'Demo fiyat verisi',
    },
    warnings: ['Yer fıstığı alerjeni içerir'],
  },
  {
    id: 'p-003',
    productName: 'Tam Tahıllı Granola',
    barcode: '8691004000036',
    source: 'photo',
    healthScore: 68,
    price: {
      amount: 62,
      currency: 'TRY',
      note: 'Demo fiyat verisi',
    },
    warnings: ['Gluten içerebilir', 'Ek şeker içerir'],
  },
];

const fallbackProduct: ProductResult = {
  id: 'p-fallback',
  productName: 'Tanınmayan Ürün',
  barcode: 'Bilinmiyor',
  source: 'name',
  healthScore: 50,
  price: {
    amount: 0,
    currency: 'TRY',
    note: 'Demo ürün - fiyat bilgisi yok',
  },
  warnings: ['Detaylı analiz için gerçek API entegrasyonu bekleniyor'],
};

function hasProductApiUrl(): boolean {
  return PRODUCT_API_URL.length > 0;
}

export function getMockProductResult(input: ProductSearchInput): ProductResult {
  if (input.photoSource?.trim()) {
    return {
      ...MOCK_PRODUCTS[2],
      source: 'photo',
    };
  }

  if (input.barcode?.trim()) {
    const byBarcode = MOCK_PRODUCTS.find((item) => item.barcode === input.barcode?.trim());

    return {
      ...(byBarcode ?? MOCK_PRODUCTS[0]),
      barcode: input.barcode.trim(),
      source: 'barcode',
    };
  }

  if (input.productName?.trim()) {
    const normalizedName = input.productName.trim().toLowerCase();
    const byName = MOCK_PRODUCTS.find((item) => item.productName.toLowerCase().includes(normalizedName));

    return {
      ...(byName ?? fallbackProduct),
      productName: input.productName.trim(),
      source: 'name',
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
