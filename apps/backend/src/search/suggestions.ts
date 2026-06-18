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

  const suggestions = PRODUCT_GROUP_REGISTRY
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

  return {
    query: rawQuery,
    suggestions,
  };
}
