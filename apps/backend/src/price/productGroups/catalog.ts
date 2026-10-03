import type { ProductGroupCatalogEntry } from './types.js';

export const PRODUCT_GROUP_CATALOG: ProductGroupCatalogEntry[] = [
  {
    key: 'milk',
    coarseGroup: 'dairy_drinkable',
    include: ['sut', 'milk'],
    exclude: ['kefir', 'ayran', 'yogurt', 'yogurt', 'yoğurt', 'labne'],
    offHints: ['en:milks', 'en:dairies'],
    packageUnits: ['ml', 'l'],
  },
  {
    key: 'kefir',
    coarseGroup: 'dairy_drinkable',
    include: ['kefir'],
    exclude: ['sut', 'milk', 'ayran', 'yogurt', 'yoğurt'],
    offHints: ['en:fermented-milk-products', 'en:dairies'],
    packageUnits: ['ml', 'l'],
  },
  {
    key: 'ayran',
    coarseGroup: 'dairy_drinkable',
    include: ['ayran'],
    exclude: ['sut', 'milk', 'kefir', 'yogurt', 'yoğurt'],
    offHints: ['en:fermented-milk-products', 'en:dairies'],
    packageUnits: ['ml', 'l'],
  },
  {
    key: 'yogurt',
    coarseGroup: 'dairy_spoonable',
    include: ['yogurt', 'yoğurt'],
    exclude: ['sut', 'milk', 'kefir', 'ayran'],
    offHints: ['en:yogurts', 'en:dairies'],
    packageUnits: ['g', 'kg'],
  },
  {
    key: 'chips',
    coarseGroup: 'snacks_salty',
    include: ['cips', 'chips', 'patates cipsi'],
    exclude: ['kraker', 'biskuvi', 'bisküvi', 'gofret', 'cikolata', 'çikolata'],
    offHints: ['en:chips-and-fries', 'en:salty-snacks'],
    packageUnits: ['g'],
  },
  {
    key: 'wafer',
    coarseGroup: 'snacks_sweet',
    include: ['gofret', 'wafer'],
    exclude: ['cips', 'chips', 'kraker', 'biskuvi', 'bisküvi'],
    offHints: ['en:wafers', 'en:sweet-snacks'],
    packageUnits: ['g'],
  },
  {
    key: 'biscuit',
    coarseGroup: 'snacks_sweet',
    include: ['biskuvi', 'bisküvi', 'biscuit'],
    exclude: ['cips', 'chips', 'kraker', 'gofret', 'wafer'],
    offHints: ['en:biscuits-and-cakes', 'en:sweet-snacks'],
    packageUnits: ['g'],
  },
  {
    key: 'chocolate',
    coarseGroup: 'snacks_sweet',
    include: ['cikolata', 'çikolata', 'chocolate'],
    exclude: ['cips', 'chips', 'kraker', 'biskuvi', 'bisküvi'],
    offHints: ['en:chocolates', 'en:sweet-snacks'],
    packageUnits: ['g'],
  },
  {
    key: 'rice',
    coarseGroup: 'staple_grain',
    include: ['pirinc', 'pirinç', 'osmancik', 'osmancık', 'baldo', 'rice'],
    // patlak/patlaklı/patlağı (puffed): gerçek veride "pirinç patlağı/
    // patlaklı" adındaki ürünlerin 14/160'ı pirinç DEĞİL, patlamış mısır/
    // pirinç ATIŞTIRMALIK'ı (bkz. görev ölçümü) — kelime sınırı eşleşmesi
    // Türkçe çekim ekleriyle (patlak+lı/+ğı) örtüşmediği için her çekimi
    // ayrı listelemek gerekiyor (bu dosyadaki ['yogurt','yoğurt'] deseniyle
    // AYNI gerekçe).
    exclude: [
      'bulgur', 'makarna', 'pasta', 'noodle', 'sehriye', 'şehriye', 'un', 'flour',
      'patlak', 'patlaklı', 'patlağı', 'patlamis', 'patlamış',
    ],
    offHints: ['en:rices', 'en:grains'],
    packageUnits: ['g', 'kg'],
  },
  {
    key: 'water',
    coarseGroup: 'water_beverage',
    include: ['dogal kaynak suyu', 'doğal kaynak suyu', 'kaynak suyu', 'icme suyu', 'içme suyu', 'water'],
    exclude: ['maden suyu', 'soda', 'kola', 'cola', 'gazoz', 'meyve suyu', 'nektar', 'sut', 'süt', 'ayran', 'kefir'],
    offHints: ['en:waters', 'en:spring-waters'],
    packageUnits: ['ml', 'l'],
  },
  {
    key: 'sparkling_water',
    coarseGroup: 'water_beverage',
    include: ['maden suyu', 'soda', 'sparkling water'],
    exclude: ['kola', 'cola', 'gazoz', 'enerji icecegi', 'enerji içeceği'],
    offHints: ['en:sparkling-waters', 'en:waters'],
    packageUnits: ['ml', 'l'],
  },
  {
    key: 'cola',
    coarseGroup: 'soft_drink',
    include: ['kola', 'cola'],
    // haribo: "Happy Cola" gibi kola AROMALI JÖLE ŞEKERLEME ürünleri gerçek
    // veride 'cola' kelimesini TAM KELİME olarak içeriyor ama içecek değil
    // (bkz. görev ölçümü) — Haribo kesin bir şekerleme markası, kola
    // içeceği satmaz.
    exclude: ['maden suyu', 'soda', 'ayran', 'kefir', 'haribo'],
    offHints: ['en:colas', 'en:sodas'],
    packageUnits: ['ml', 'l'],
  },
  {
    key: 'breakfast_cereal',
    coarseGroup: 'breakfast',
    include: ['kahvaltilik gevrek', 'kahvaltılık gevrek', 'cereal', 'corn flakes'],
    exclude: ['biskuvi', 'bisküvi', 'gofret', 'cips'],
    offHints: ['en:breakfast-cereals'],
    packageUnits: ['g', 'kg'],
  },
  {
    key: 'baby_formula',
    coarseGroup: 'baby_food',
    include: ['bebek mamasi', 'bebek maması', 'devam sutu', 'devam sütü', 'formula'],
    exclude: ['sut', 'milk', 'kefir', 'ayran', 'yogurt', 'yoğurt'],
    offHints: ['en:baby-formulas', 'en:baby-foods'],
    packageUnits: ['g', 'kg'],
    alternativesEligible: false,
  },
];

export function findProductGroupCatalogEntry(
  key: string,
): ProductGroupCatalogEntry | undefined {
  return PRODUCT_GROUP_CATALOG.find((entry) => entry.key === key);
}
