import type { ProductFacts } from './types.js';
import {
  openFoodFactsInfoToProductFacts,
  type OpenFoodFactsProductInfoLike,
} from './openFoodFactsAdapter.js';

interface OpenFoodFactsApiResponse {
  status?: number;
  product?: {
    product_name?: string;
    image_url?: string;
    image_front_url?: string;
    nutriscore_grade?: string;
    nova_group?: number;
    ingredients_text?: string;
    allergens_tags?: string[];
    additives_tags?: string[];
    nutriments?: {
      fat_100g?: unknown;
      'saturated-fat_100g'?: unknown;
      sugars_100g?: unknown;
      salt_100g?: unknown;
    };
  };
}

export interface OpenFoodFactsFetcherOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

function parseNutrientNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseTagList(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => tag.replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ').trim())
    .filter(Boolean);
}

function buildOpenFoodFactsEndpoint(barcode: string): string {
  const fields = [
    'product_name',
    'image_url',
    'image_front_url',
    'nutriscore_grade',
    'nova_group',
    'ingredients_text',
    'allergens_tags',
    'additives_tags',
    'nutriments',
  ].join(',');

  return `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode,
  )}?fields=${encodeURIComponent(fields)}`;
}

function mapApiResponseToInfoLike(
  barcode: string,
  data: OpenFoodFactsApiResponse,
): OpenFoodFactsProductInfoLike | null {
  if (data.status !== 1 || !data.product) {
    return null;
  }

  const nutriments = data.product.nutriments;

  return {
    barcode,
    productName: data.product.product_name ?? null,
    imageUrl: data.product.image_url ?? data.product.image_front_url ?? null,
    ingredientsText: data.product.ingredients_text ?? null,
    allergens: parseTagList(data.product.allergens_tags),
    nutriScore: data.product.nutriscore_grade ?? null,
    novaGroup: data.product.nova_group ?? null,
    additives: parseTagList(data.product.additives_tags),
    nutritionValues: {
      fat: parseNutrientNumber(nutriments?.fat_100g),
      saturatedFat: parseNutrientNumber(nutriments?.['saturated-fat_100g']),
      sugars: parseNutrientNumber(nutriments?.sugars_100g),
      salt: parseNutrientNumber(nutriments?.salt_100g),
    },
  };
}

export async function fetchOpenFoodFactsProductFactsByBarcode(
  barcode: string,
  options: OpenFoodFactsFetcherOptions = {},
): Promise<ProductFacts | null> {
  const trimmedBarcode = barcode.trim();

  if (!trimmedBarcode) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(buildOpenFoodFactsEndpoint(trimmedBarcode), {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenFoodFactsApiResponse;
    const info = mapApiResponseToInfoLike(trimmedBarcode, data);

    return info ? openFoodFactsInfoToProductFacts(info) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
