import type { MarketChainCode } from '../stores/storeTypes.js';

const TR_LOWER: Record<string, string> = {
  İ: 'i',
  I: 'i',
  Ş: 's',
  Ğ: 'g',
  Ü: 'u',
  Ö: 'o',
  Ç: 'c',
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
};

function normalizeTr(input: string): string {
  return input
    .split('')
    .map((char) => TR_LOWER[char] ?? char.toLowerCase())
    .join('')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const PATTERNS: Array<{
  code: Exclude<MarketChainCode, 'UNKNOWN'>;
  displayName: string;
  tokens: string[];
}> = [
  { code: 'BIZIM_TOPTAN', displayName: 'Bizim Toptan', tokens: ['bizim toptan', 'bizim'] },
  { code: 'CARREFOURSA', displayName: 'CarrefourSA', tokens: ['carrefoursa', 'carrefour sa', 'carrefour'] },
  { code: 'MIGROS', displayName: 'Migros', tokens: ['migros'] },
  { code: 'A101', displayName: 'A101', tokens: ['a101', 'a 101'] },
  { code: 'SOK', displayName: 'ŞOK', tokens: ['sok market', 'sokmarket', 'sok'] },
  { code: 'BIM', displayName: 'BİM', tokens: ['bim'] },
];

export interface NormalizedMarketName {
  chainCode: MarketChainCode;
  displayName: string;
}

export function normalizeMarketName(raw: string | null | undefined): NormalizedMarketName {
  if (!raw) {
    return { chainCode: 'UNKNOWN', displayName: '' };
  }

  const normalized = normalizeTr(raw);

  for (const pattern of PATTERNS) {
    if (pattern.tokens.some((token) => normalized.includes(token))) {
      return { chainCode: pattern.code, displayName: pattern.displayName };
    }
  }

  return { chainCode: 'UNKNOWN', displayName: '' };
}
