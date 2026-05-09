export type OpenFoodFactsProductInfo = {
  barcode: string;
  productName: string | null;
  ingredientsText: string | null;
  allergens: string[];
  nutriScore: string | null;
  novaGroup: number | null;
  additives: string[];
};

function parseNutriScoreGrade(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const lowered = normalized.toLowerCase();

  if (lowered === 'unknown' || lowered === 'null' || lowered === 'undefined') {
    return null;
  }

  const upper = lowered.toUpperCase();
  return ['A', 'B', 'C', 'D', 'E'].includes(upper) ? upper : null;
}

function parseNovaGroup(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return [1, 2, 3, 4].includes(value) ? value : null;
}

type OpenFoodFactsApiResponse = {
  status?: number;
  product?: {
    product_name?: string;
    nutriscore_grade?: string;
    nova_group?: number;
    ingredients_text?: string;
    allergens_tags?: string[];
    additives_tags?: string[];
  };
};

/**
 * Open Food Facts üzerinden barkoda göre ürün bilgisini getirir.
 */
export async function fetchOpenFoodFactsByBarcode(
  barcode: string,
): Promise<OpenFoodFactsProductInfo | null> {
  const trimmedBarcode = barcode?.trim();

  if (!trimmedBarcode) {
    return null;
  }

  try {
    const fields = [
      'product_name',
      'nutriscore_grade',
      'nova_group',
      'ingredients_text',
      'allergens_tags',
      'additives_tags',
    ].join(',');
    const endpoint = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmedBarcode)}?fields=${encodeURIComponent(fields)}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenFoodFactsApiResponse;

    if (data.status !== 1 || !data.product) {
      return null;
    }

    return {
      barcode: trimmedBarcode,
      productName: data.product.product_name ?? null,
      ingredientsText: data.product.ingredients_text ?? null,
      allergens: data.product.allergens_tags ?? [],
      nutriScore: parseNutriScoreGrade(data.product.nutriscore_grade),
      novaGroup: parseNovaGroup(data.product.nova_group),
      additives: data.product.additives_tags ?? [],
    };
  } catch (error) {
    return null;
  }
}
