import type { SustainabilityCategoryKey, SustainabilityInput } from './types.js';

const CATEGORY_KEYWORDS: Record<SustainabilityCategoryKey, string[]> = {
  plant_based: ['mercimek', 'nohut', 'fasulye', 'barbunya', 'bezelye', 'bakliyat', 'vegan', 'bitkisel protein'],
  staple_food: ['makarna', 'pirinc', 'bulgur', 'un', 'irmik', 'yulaf', 'sehriye', 'tarhana', 'nisasta'],
  sweets_chocolate: ['cikolata', 'seker', 'lokum', 'helva', 'draje', 'sekerleme', 'kakao', 'bonibon'],
  meat: ['et', 'tavuk', 'hindi', 'balik', 'ton baligi', 'sucuk', 'salam', 'sosis', 'pastirma', 'kiyma'],
  baby_food: ['bebek', 'devam sutu', 'bebek mamasi', 'kasik mamasi', 'cocuk', 'organik bebek', 'pure'],
  dairy: ['sut', 'yogurt', 'peynir', 'ayran', 'kefir', 'tereyagi', 'krema', 'kaymak', 'labne'],
  beverages: ['su', 'maden suyu', 'soda', 'meyve suyu', 'ice tea', 'gazoz', 'kola', 'limonata', 'enerji icecegi', 'soguk cay'],
  breakfast: ['zeytin', 'recel', 'bal', 'tahin', 'pekmez', 'findik kremasi', 'kahvaltilik', 'ezme'],
  sauces_condiments: ['ketcap', 'mayonez', 'hardal', 'sos', 'salca', 'sirke', 'baharat', 'tuz', 'karabiber', 'pul biber'],
  snacks: ['cips', 'kraker', 'biskuvi', 'gofret', 'cerez', 'patlamis misir', 'kuruyemis', 'bar'],
  frozen_ready: ['donuk', 'dondurulmus', 'pizza', 'manti', 'nugget', 'hazir yemek', 'corba', 'konserve', 'mikrodalga'],
  unknown: [],
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasKeyword(searchableText: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  return ` ${searchableText} `.includes(` ${normalizedKeyword} `);
}

export function classifySustainabilityCategory(
  input: SustainabilityInput,
): SustainabilityCategoryKey {
  const searchableText = normalizeText(
    [input.productName, input.categoryText, input.ingredientsText]
      .filter(Boolean)
      .join(' '),
  );

  if (!searchableText) {
    return 'unknown';
  }

  const categories = Object.keys(CATEGORY_KEYWORDS) as SustainabilityCategoryKey[];

  for (const category of categories) {
    if (category === 'unknown') {
      continue;
    }

    const keywords = CATEGORY_KEYWORDS[category];

    if (keywords.some((keyword) => hasKeyword(searchableText, keyword))) {
      return category;
    }
  }

  return 'unknown';
}
