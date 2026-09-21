import type { CatalogAllergenData, CatalogNova, CatalogNutriScore, CatalogProduct } from '../catalog/catalog.js';
import { getCatalog } from '../catalog/catalog.js';
import { PRODUCT_GROUP_REGISTRY } from '../price/productGroups/registry.js';

export type SearchSuggestion = ProductGroupSearchSuggestion | ProductSearchSuggestion;

export interface ProductGroupSearchSuggestion {
  type: 'product_group';
  productGroupKey: string;
  label: string;
  coverage: 'covered';
  source: 'product_group_registry';
}

export interface ProductSearchSuggestion {
  type: 'product';
  productId: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: {
    amount: number;
    unit: string;
  };
  source: 'product_index';
  /** Aşağıdakiler yalnız katalogdan (OFF-TR) geldiğinde doludur; katalog boşsa hiç eklenmez. */
  imageUrl?: string | null;
  nutriScore?: CatalogNutriScore;
  nova?: CatalogNova;
  allergenData?: CatalogAllergenData;
  completeness?: CatalogProduct['completeness'];
  provenance?: CatalogProduct['provenance'];
}

export interface SearchSuggestResponse {
  query: string;
  suggestions: SearchSuggestion[];
}

export interface SuggestSearchOptions {
  limit?: number;
}

const PRODUCT_GROUP_ALIASES: Record<string, string[]> = {
  milk: ['sut', 'süt', 'inek sütü', 'uht süt'],
  lactose_free_milk: ['laktozsuz sut', 'laktozsuz süt'],
  kefir: ['kefir'],
  ayran: ['ayran'],
  yogurt: ['yoğurt', 'yogurt', 'süzme yoğurt'],
  cheese: ['peynir', 'beyaz peynir', 'kaşar peyniri'],
  egg: ['yumurta'],
  chips: ['cips', 'patates cipsi'],
  cracker: ['kraker'],
  biscuit: ['bisküvi', 'biskuvi'],
  wafer: ['gofret'],
  chocolate: ['çikolata', 'cikolata'],
  oat_bar: ['yulaf bar', 'bar'],
  pasta: ['makarna', 'spagetti', 'burgu makarna'],
  rice: ['pirinc', 'pirinç', 'baldo pirinç', 'osmancık pirinç', 'pilavlık pirinç'],
  bulgur: ['bulgur', 'pilavlık bulgur', 'köftelik bulgur'],
  lentils: ['mercimek', 'kırmızı mercimek', 'yeşil mercimek'],
  flour: ['un', 'bugday unu', 'buğday unu'],
  sugar: ['şeker', 'seker', 'toz şeker'],
  olive_oil: ['zeytinyagi', 'zeytinyağı'],
  sunflower_oil: ['aycicek yagi', 'ayçiçek yağı', 'sıvı yağ'],
  tomato_paste: ['salca', 'salça', 'domates salçası', 'biber salçası'],
  canned_tuna: ['ton balığı', 'ton baligi', 'konserve ton'],
  water: ['su', 'içme suyu'],
  sparkling_water: ['maden suyu', 'soda'],
  cola: ['kola', 'cola'],
  fruit_juice: ['meyve suyu'],
  tea: ['çay', 'cay'],
  coffee: ['kahve', 'turk kahvesi', 'türk kahvesi'],
  breakfast_cereal: ['kahvaltılık gevrek', 'gevrek', 'mısır gevreği'],
  jam: ['reçel', 'recel'],
  honey: ['bal'],
  baby_formula: ['bebek maması', 'devam sütü'],
  baby_cereal: ['bebek tahılı', 'bebek ek gıda'],
  baby_food: ['bebek kavanoz maması', 'bebek püresi'],
};

export function foldSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .trim();
}

function getEntryTerms(entry: (typeof PRODUCT_GROUP_REGISTRY)[number]): string[] {
  return [
    entry.canonicalProductGroupKey,
    entry.displayName.tr,
    entry.displayName.en,
    ...(PRODUCT_GROUP_ALIASES[entry.canonicalProductGroupKey] ?? []),
  ];
}

function getMatchScore(foldedQuery: string, terms: string[], betaCoverage: string): number {
  let score = 0;

  for (const term of terms) {
    const foldedTerm = foldSearchText(term);

    if (foldedTerm === foldedQuery) {
      score = Math.max(score, 120);
    } else if (foldedTerm.startsWith(foldedQuery)) {
      score = Math.max(score, 100);
    } else if (foldedTerm.includes(foldedQuery)) {
      score = Math.max(score, 70);
    }
  }

  if (score > 0 && betaCoverage === 'core') {
    score += 5;
  }

  return score;
}

const PRODUCT_SUGGESTION_LIMIT = 25;

const NUTRISCORE_GRADE_RANK: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const COMPLETENESS_RANK: Record<CatalogProduct['completeness'], number> = {
  complete: 0,
  usable_for_risk: 1,
  usable_for_health: 2,
  insufficient: 2,
};

function catalogProductToSuggestion(product: CatalogProduct): ProductSearchSuggestion {
  return {
    type: 'product',
    productId: product.productId,
    productGroupKey: product.productGroupKey,
    label: product.name ?? product.brand ?? product.productId,
    brand: product.brand ?? undefined,
    packageSize: product.packageSize,
    source: 'product_index',
    imageUrl: product.imageUrl,
    nutriScore: product.nutriScore,
    nova: product.nova,
    allergenData: product.allergenData,
    completeness: product.completeness,
    provenance: product.provenance,
  };
}

/**
 * Sıralama: (1) en üstteki grup önerisiyle aynı ürün grubu önce, (2) veri
 * tamlığı (complete > usable_for_risk > diğerleri), (3) Nutri-Score (A→E;
 * notu olmayan en sonda), (4) ad. Ürün grubu ürün adından ÇIKARILMAZ —
 * yalnız katalogda zaten hesaplanmış productGroupKey kullanılır.
 */
function compareCatalogProducts(a: CatalogProduct, b: CatalogProduct, topGroupKey: string | null): number {
  if (topGroupKey) {
    const aInTopGroup = a.productGroupKey === topGroupKey ? 0 : 1;
    const bInTopGroup = b.productGroupKey === topGroupKey ? 0 : 1;
    if (aInTopGroup !== bInTopGroup) return aInTopGroup - bInTopGroup;
  }

  const aCompleteness = COMPLETENESS_RANK[a.completeness];
  const bCompleteness = COMPLETENESS_RANK[b.completeness];
  if (aCompleteness !== bCompleteness) return aCompleteness - bCompleteness;

  const aGradeRank = a.nutriScore.grade ? NUTRISCORE_GRADE_RANK[a.nutriScore.grade] : 5;
  const bGradeRank = b.nutriScore.grade ? NUTRISCORE_GRADE_RANK[b.nutriScore.grade] : 5;
  if (aGradeRank !== bGradeRank) return aGradeRank - bGradeRank;

  return (a.name ?? '').localeCompare(b.name ?? '', 'tr-TR');
}

export function suggestSearch(query: string, options: SuggestSearchOptions = {}): SearchSuggestResponse {
  const rawQuery = query.trim();
  const foldedQuery = foldSearchText(rawQuery);
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 12);

  if (foldedQuery.length < 2) {
    return {
      query: rawQuery,
      suggestions: [],
    };
  }

  const groupSuggestions: ProductGroupSearchSuggestion[] = PRODUCT_GROUP_REGISTRY
    .map((entry) => ({
      entry,
      score: getMatchScore(foldedQuery, getEntryTerms(entry), entry.betaCoverage),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.displayName.tr.localeCompare(b.entry.displayName.tr, 'tr-TR');
    })
    .slice(0, limit)
    .map(({ entry }): ProductGroupSearchSuggestion => ({
      type: 'product_group',
      productGroupKey: entry.canonicalProductGroupKey,
      label: entry.displayName.tr,
      coverage: 'covered',
      source: 'product_group_registry',
    }));

  const topGroupKey = groupSuggestions[0]?.productGroupKey ?? null;

  const productSuggestions: ProductSearchSuggestion[] = getCatalog()
    .products.filter((product) => product.searchText.includes(foldedQuery))
    .sort((a, b) => compareCatalogProducts(a, b, topGroupKey))
    .slice(0, PRODUCT_SUGGESTION_LIMIT)
    .map(catalogProductToSuggestion);

  return {
    query: rawQuery,
    suggestions: [...groupSuggestions, ...productSuggestions],
  };
}
