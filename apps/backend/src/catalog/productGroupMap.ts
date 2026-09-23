// RafSkoru — OFF Kategori → Ürün Grubu Eşlemesi
// src/catalog/productGroupMap.ts
//
// Ürün grubu YALNIZ OFF categories_tags etiketlerinden atanır; ürün adından
// ÇIKARILMAZ (bkz. görev değişmez kural 4). Emin olunmayan etiket eklenmez —
// eşleşmeyen ürün 'unclassified' kalır; bu güvenli bir varsayılandır.
//
// Sıra önemlidir: birden çok grup eşleşirse listedeki İLK (en özel) grup
// seçilir. Bu yüzden dar kapsamlı gruplar (ör. lactose_free_milk) genel
// gruplarından (ör. milk) ÖNCE gelir.
//
// Kaynak: gerçek apps/backend/data/off-tr/products.jsonl çıktısındaki
// categories_tags değerleri + src/nutriScore/validateAgainstOff.ts'de zaten
// doğrulanmış etiketler (en:waters, en:cheeses, en:milks, en:fats,
// en:vegetable-oils, en:nuts, en:seeds, en:nut-butters, en:beverages,
// en:fermented-milk-drinks, en:plant-based-milks, en:beef, en:lamb-meat,
// en:veal-meat).

interface ProductGroupMapping {
  productGroupKey: string;
  /** Ürün bu etiketlerden EN AZ BİRİNİ taşıyorsa gruba atanır. */
  offTags: string[];
  /** Ürün bu etiketlerden herhangi birini taşıyorsa bu kural atlanır (daha özel bir gruba bırakılır). */
  excludeTags?: string[];
}

// PRODUCT_GROUP_MAPPINGS, apps/mobile/src/userProfile ile ilgisi olmayan,
// yalnız price/productGroups/registry.ts'teki 34 canonicalProductGroupKey'in
// bir alt kümesini kapsar. Gerçek OFF-TR verisiyle doğrulanan etiketler
// eklendikçe bu liste genişletilir (bkz. görev raporu — "eklenmedi" listesi).
const PRODUCT_GROUP_MAPPINGS: ProductGroupMapping[] = [
  { productGroupKey: 'lactose_free_milk', offTags: ['en:lactose-free-milks'] },
  { productGroupKey: 'milk', offTags: ['en:milks'], excludeTags: ['en:lactose-free-milks'] },
  { productGroupKey: 'yogurt', offTags: ['en:yogurts'] },
  { productGroupKey: 'cheese', offTags: ['en:cheeses'] },
  { productGroupKey: 'egg', offTags: ['en:eggs'] },
  { productGroupKey: 'chips', offTags: ['en:crisps', 'en:potato-crisps'] },
  { productGroupKey: 'cracker', offTags: ['en:crackers'] },
  { productGroupKey: 'biscuit', offTags: ['en:biscuits'], excludeTags: ['en:crackers'] },
  { productGroupKey: 'chocolate', offTags: ['en:chocolates'] },
  { productGroupKey: 'pasta', offTags: ['en:pastas'] },
  { productGroupKey: 'rice', offTags: ['en:rices'] },
  { productGroupKey: 'lentils', offTags: ['en:lentils'] },
  { productGroupKey: 'flour', offTags: ['en:flours'] },
  { productGroupKey: 'sugar', offTags: ['en:sugars'] },
  { productGroupKey: 'olive_oil', offTags: ['en:olive-oils'] },
  { productGroupKey: 'sunflower_oil', offTags: ['en:sunflower-oils'] },
  {
    productGroupKey: 'water',
    offTags: ['en:waters'],
    excludeTags: ['en:flavored-waters', 'en:carbonated-waters', 'en:sparkling-waters'],
  },
  { productGroupKey: 'cola', offTags: ['en:colas'] },
  { productGroupKey: 'fruit_juice', offTags: ['en:fruit-juices'] },
  { productGroupKey: 'tea', offTags: ['en:teas'] },
  { productGroupKey: 'coffee', offTags: ['en:coffees'] },
  { productGroupKey: 'breakfast_cereal', offTags: ['en:breakfast-cereals'] },
  { productGroupKey: 'jam', offTags: ['en:jams'] },
  { productGroupKey: 'honey', offTags: ['en:honeys'] },
];

export const UNCLASSIFIED_PRODUCT_GROUP_KEY = 'unclassified';

export function mapOffCategoriesToProductGroupKey(categories: string[]): string {
  for (const mapping of PRODUCT_GROUP_MAPPINGS) {
    const isExcluded = mapping.excludeTags?.some((tag) => categories.includes(tag)) ?? false;
    if (isExcluded) continue;

    if (mapping.offTags.some((tag) => categories.includes(tag))) {
      return mapping.productGroupKey;
    }
  }

  return UNCLASSIFIED_PRODUCT_GROUP_KEY;
}
