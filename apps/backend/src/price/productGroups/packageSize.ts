import type { ProductPackageSize, ProductPackageUnit } from './types.js';

const UNIT_ALIASES: Record<string, ProductPackageUnit> = {
  ml: 'ml',
  mililitre: 'ml',
  millilitre: 'ml',
  l: 'l',
  lt: 'l',
  litre: 'l',
  liter: 'l',
  g: 'g',
  gr: 'g',
  gram: 'g',
  kg: 'kg',
  kilogram: 'kg',
  adet: 'unit',
  piece: 'unit',
  unit: 'unit',
};

function normalizePackageText(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replaceAll(',', '.')
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'i')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u');
}

function normalizeUnit(rawUnit: string): ProductPackageUnit | null {
  return UNIT_ALIASES[rawUnit.trim().toLocaleLowerCase('tr-TR')] ?? null;
}

export function parsePackageSizeFromText(input?: string | null): ProductPackageSize | null {
  const normalized = normalizePackageText(input ?? '');

  if (!normalized.trim()) {
    return null;
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(ml|mililitre|millilitre|lt|l|litre|liter|kg|kilogram|gr|g|gram|adet|piece|unit)\b/);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = normalizeUnit(match[2]);

  if (!Number.isFinite(value) || value <= 0 || !unit) {
    return null;
  }

  if (unit === 'l') {
    return {
      value,
      unit,
      normalizedValue: value * 1000,
      normalizedUnit: 'ml',
      text: match[0],
    };
  }

  if (unit === 'kg') {
    return {
      value,
      unit,
      normalizedValue: value * 1000,
      normalizedUnit: 'g',
      text: match[0],
    };
  }

  if (unit === 'unit') {
    return {
      value,
      unit,
      normalizedValue: value,
      normalizedUnit: 'unit',
      text: match[0],
    };
  }

  return {
    value,
    unit,
    normalizedValue: value,
    normalizedUnit: unit,
    text: match[0],
  };
}

export function arePackageSizesComparable(
  left: ProductPackageSize | null | undefined,
  right: ProductPackageSize | null | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }

  if (left.normalizedUnit !== right.normalizedUnit) {
    return false;
  }

  return Math.abs(left.normalizedValue - right.normalizedValue) < 0.001;
}
