import {
  parsePackageSizeFromText,
  type ProductPackageSize,
} from '../productGroups/index.js';

export interface NormalizedAlternativeProductShape {
  rawProductGroupKey: string | null;
  legacyProductGroupKey: string | null;
  canonicalProductGroupKey: string | null;
  packageSize: ProductPackageSize | null;
}

export interface AlternativeProductShapeInput {
  productGroupKey?: string | null;
  resolvedProductGroupKey?: string | null;
  packageSize?: ProductPackageSize | null;
  packageSizeText?: string | null;
  productName?: string | null;
}

interface LegacyAlternativeProductGroupShape {
  canonicalProductGroupKey: string;
  packageSizeText: string;
}

export const LEGACY_ALTERNATIVE_PRODUCT_GROUP_SHAPES: Record<
  string,
  LegacyAlternativeProductGroupShape
> = {
  milk_1l: {
    canonicalProductGroupKey: 'milk',
    packageSizeText: '1 L',
  },
  kefir_1l: {
    canonicalProductGroupKey: 'kefir',
    packageSizeText: '1 L',
  },
  mineral_water_200ml: {
    canonicalProductGroupKey: 'sparkling_water',
    packageSizeText: '200 ml',
  },
  cola_1l: {
    canonicalProductGroupKey: 'cola',
    packageSizeText: '1 L',
  },
  fruit_juice_1l: {
    canonicalProductGroupKey: 'fruit_juice',
    packageSizeText: '1 L',
  },
  cracker_100g: {
    canonicalProductGroupKey: 'cracker',
    packageSizeText: '100 g',
  },
  oat_bar_40g: {
    canonicalProductGroupKey: 'oat_bar',
    packageSizeText: '40 g',
  },
  chips_100g: {
    canonicalProductGroupKey: 'chips',
    packageSizeText: '100 g',
  },
};

export function getLegacyAlternativeProductGroupKeys(): string[] {
  return Object.keys(LEGACY_ALTERNATIVE_PRODUCT_GROUP_SHAPES).sort();
}

function normalizeKey(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parsePackageSize(input: AlternativeProductShapeInput): ProductPackageSize | null {
  if (input.packageSize) {
    return input.packageSize;
  }

  const packageSizeFromText = parsePackageSizeFromText(input.packageSizeText);
  if (packageSizeFromText) {
    return packageSizeFromText;
  }

  const packageSizeFromName = parsePackageSizeFromText(input.productName);
  if (packageSizeFromName) {
    return packageSizeFromName;
  }

  const rawProductGroupKey = normalizeKey(input.productGroupKey);
  const legacyShape = rawProductGroupKey
    ? LEGACY_ALTERNATIVE_PRODUCT_GROUP_SHAPES[rawProductGroupKey]
    : undefined;

  return legacyShape ? parsePackageSizeFromText(legacyShape.packageSizeText) : null;
}

export function normalizeAlternativeProductShape(
  input: AlternativeProductShapeInput,
): NormalizedAlternativeProductShape {
  const rawProductGroupKey = normalizeKey(input.productGroupKey);
  const explicitCanonicalProductGroupKey = normalizeKey(input.resolvedProductGroupKey);
  const legacyShape = rawProductGroupKey
    ? LEGACY_ALTERNATIVE_PRODUCT_GROUP_SHAPES[rawProductGroupKey]
    : undefined;

  return {
    rawProductGroupKey,
    legacyProductGroupKey: legacyShape ? rawProductGroupKey : null,
    canonicalProductGroupKey:
      explicitCanonicalProductGroupKey ??
      legacyShape?.canonicalProductGroupKey ??
      rawProductGroupKey,
    packageSize: parsePackageSize(input),
  };
}
