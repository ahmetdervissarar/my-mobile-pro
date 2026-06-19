import { PRODUCT_GROUP_CATALOG, findProductGroupCatalogEntry } from './catalog.js';
import { parsePackageSizeFromText } from './packageSize.js';
import type { ProductGroupCatalogEntry, ProductGroupResolution } from './types.js';

export interface ProductGroupResolverInput {
  productName?: string | null;
  barcode?: string | null;
  offCategories?: string[] | null;
  candidateGroupKey?: string | null;
}

const BARCODE_GROUP_OVERRIDES: Record<string, string> = {
  '8691004000050': 'milk',
};

function normalizeText(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replace(/\u0069\u0307/g, 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u');
}

function normalizeOffCategory(input: string): string {
  return normalizeText(input).trim();
}

function emptyResolution(): ProductGroupResolution {
  return {
    productGroupKey: null,
    coarseGroup: null,
    groupConfidence: 'unknown',
    groupSource: 'none',
    packageSize: null,
    alternativesEligible: false,
  };
}

function hasAnyToken(normalizedName: string, tokens: string[]): boolean {
  return tokens.some((token) => normalizedName.includes(normalizeText(token)));
}

function hasExcludedToken(normalizedName: string, entry: ProductGroupCatalogEntry): boolean {
  return hasAnyToken(normalizedName, entry.exclude);
}

function hasIncludedToken(normalizedName: string, entry: ProductGroupCatalogEntry): boolean {
  return hasAnyToken(normalizedName, entry.include);
}

function hasOffHint(
  offCategories: string[] | null | undefined,
  entry: ProductGroupCatalogEntry,
): boolean {
  if (!offCategories || !entry.offHints || entry.offHints.length === 0) {
    return false;
  }

  const normalizedOffCategories = offCategories.map(normalizeOffCategory);
  const normalizedHints = entry.offHints.map(normalizeOffCategory);

  return normalizedHints.some((hint) =>
    normalizedOffCategories.some((category) => category.includes(hint) || hint.includes(category)),
  );
}

function isCatalogEntryAlternativesEligible(entry: ProductGroupCatalogEntry): boolean {
  return entry.alternativesEligible !== false;
}

function resolveFromEntry(
  entry: ProductGroupCatalogEntry,
  input: ProductGroupResolverInput,
  source: ProductGroupResolution['groupSource'],
  confidence: ProductGroupResolution['groupConfidence'],
  allowAlternatives: boolean,
): ProductGroupResolution {
  return {
    productGroupKey: entry.key,
    coarseGroup: entry.coarseGroup,
    groupConfidence: confidence,
    groupSource: source,
    packageSize: parsePackageSizeFromText(input.productName),
    alternativesEligible: allowAlternatives && isCatalogEntryAlternativesEligible(entry),
    ruleId: entry.key,
  };
}

export function resolveProductGroup(input: ProductGroupResolverInput): ProductGroupResolution {
  const normalizedBarcode = input.barcode?.trim();

  if (normalizedBarcode) {
    const barcodeGroupKey = BARCODE_GROUP_OVERRIDES[normalizedBarcode];
    const entry = barcodeGroupKey ? findProductGroupCatalogEntry(barcodeGroupKey) : undefined;

    if (entry) {
      return resolveFromEntry(entry, input, 'barcode', 'exact', true);
    }
  }

  const normalizedName = normalizeText(input.productName ?? '');

  if (!normalizedName.trim()) {
    return emptyResolution();
  }

  for (const entry of PRODUCT_GROUP_CATALOG) {
    if (hasExcludedToken(normalizedName, entry)) {
      continue;
    }

    if (hasIncludedToken(normalizedName, entry)) {
      return resolveFromEntry(entry, input, 'name_rule', 'strong', true);
    }
  }

  for (const entry of PRODUCT_GROUP_CATALOG) {
    if (hasExcludedToken(normalizedName, entry)) {
      continue;
    }

    if (hasOffHint(input.offCategories, entry)) {
      return resolveFromEntry(entry, input, 'off_assisted', 'assisted', false);
    }
  }

  const candidateGroupKey = input.candidateGroupKey?.trim();
  const candidateEntry = candidateGroupKey
    ? findProductGroupCatalogEntry(candidateGroupKey)
    : undefined;

  if (candidateEntry) {
    return resolveFromEntry(candidateEntry, input, 'provider_hint', 'assisted', true);
  }

  return emptyResolution();
}
