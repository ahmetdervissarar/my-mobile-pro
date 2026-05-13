export type OpenFoodFactsProductInfo = {
  barcode: string;
  productName: string | null;
  ingredientsText: string | null;
  allergens: string[];
  nutriScore: string | null;
  novaGroup: number | null;
  additives: string[];
  /**
   * 100 g başına besin değerleri.
   * Open Food Facts'ten gelen nutriments nesnesinden parse edilir.
   * Değer eksik veya geçersizse ilgili alan null kalır.
   */
  nutritionValues: {
    fat: number | null;
    saturatedFat: number | null;
    sugars: number | null;
    salt: number | null;
  };
};

// ─── Parse Yardımcıları ────────────────────────────────────────────────────────

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

/**
 * Open Food Facts nutriments nesnesinden gelen ham değeri güvenli şekilde
 * sayıya çevirir.
 * - number türünde ve sonlu ise doğrudan döner.
 * - string ise Number() ile parse edilmeye çalışılır.
 * - Geçersiz, NaN veya sonsuz ise null döner.
 */
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

// ─── API Tipleri ──────────────────────────────────────────────────────────────

type OpenFoodFactsApiResponse = {
  status?: number;
  product?: {
    product_name?: string;
    nutriscore_grade?: string;
    nova_group?: number;
    ingredients_text?: string;
    allergens_tags?: string[];
    additives_tags?: string[];
    /**
     * Open Food Facts nutriments nesnesi.
     * Alan adları OFF API'siyle birebir eşleşir; değerler number veya string
     * olarak gelebileceğinden unknown tipinde tutulur.
     */
    nutriments?: {
      fat_100g?: unknown;
      'saturated-fat_100g'?: unknown;
      sugars_100g?: unknown;
      salt_100g?: unknown;
    };
  };
};

// ─── Dizi Parse Yardımcıları ──────────────────────────────────────────────────

function parseAllergens(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => tag.replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ').trim())
    .filter(Boolean)
    .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
}

function parseIngredientsText(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function parseAdditives(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => tag.replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ').trim())
    .filter(Boolean)
    .map((tag) => tag.toUpperCase());
}

// ─── Ana Fonksiyon ────────────────────────────────────────────────────────────

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
      'nutriments',
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

    const nutriments = data.product.nutriments;

    return {
      barcode: trimmedBarcode,
      productName: data.product.product_name ?? null,
      ingredientsText: parseIngredientsText(data.product.ingredients_text),
      allergens: parseAllergens(data.product.allergens_tags),
      nutriScore: parseNutriScoreGrade(data.product.nutriscore_grade),
      novaGroup: parseNovaGroup(data.product.nova_group),
      additives: parseAdditives(data.product.additives_tags),
      nutritionValues: {
        fat: parseNutrientNumber(nutriments?.fat_100g),
        saturatedFat: parseNutrientNumber(nutriments?.['saturated-fat_100g']),
        sugars: parseNutrientNumber(nutriments?.sugars_100g),
        salt: parseNutrientNumber(nutriments?.salt_100g),
      },
    };
  } catch (error) {
    return null;
  }
}