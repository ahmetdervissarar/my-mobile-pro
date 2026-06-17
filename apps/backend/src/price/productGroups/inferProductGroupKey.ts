function normalizeTurkish(input: string): string {
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

const DEMO_PRODUCT_GROUP_BY_BARCODE: Record<string, string> = {
  '8691004000050': 'milk_1l',
};

const DEMO_EXACT_QUERY_PRODUCT_GROUPS: Record<string, string> = {
  sut: 'milk_1l',
  cips: 'chips_100g',
  chips: 'chips_100g',
};

export function inferProductGroupKey(
  productName?: string | null,
  barcode?: string | null,
): string | undefined {
  const normalizedBarcode = barcode?.trim();

  if (normalizedBarcode) {
    const barcodeProductGroupKey = DEMO_PRODUCT_GROUP_BY_BARCODE[normalizedBarcode];

    if (barcodeProductGroupKey) {
      return barcodeProductGroupKey;
    }
  }

  const normalizedName = normalizeTurkish(productName ?? '');

  if (!normalizedName) {
    return undefined;
  }

  const exactQueryProductGroupKey = DEMO_EXACT_QUERY_PRODUCT_GROUPS[normalizedName];

  if (exactQueryProductGroupKey) {
    return exactQueryProductGroupKey;
  }

  const hasOneLiterHint =
    normalizedName.includes('1 l') ||
    normalizedName.includes('1l') ||
    normalizedName.includes('1 lt') ||
    normalizedName.includes('1lt') ||
    normalizedName.includes('1000 ml') ||
    normalizedName.includes('1000ml');

  const hasHundredGramHint =
    normalizedName.includes('100 g') ||
    normalizedName.includes('100g') ||
    normalizedName.includes('100 gr') ||
    normalizedName.includes('100gr');

  const hasFortyGramHint =
    normalizedName.includes('40 g') ||
    normalizedName.includes('40g') ||
    normalizedName.includes('40 gr') ||
    normalizedName.includes('40gr');

  const hasTwoHundredMlHint =
    normalizedName.includes('200 ml') ||
    normalizedName.includes('200ml');

  if (normalizedName.includes('kefir') && hasOneLiterHint) {
    return 'kefir_1l';
  }

  if (normalizedName.includes('sut') && hasOneLiterHint) {
    return 'milk_1l';
  }

  if (
    (normalizedName.includes('maden suyu') || normalizedName.includes('soda')) &&
    hasTwoHundredMlHint
  ) {
    return 'mineral_water_200ml';
  }

  if ((normalizedName.includes('kola') || normalizedName.includes('cola')) && hasOneLiterHint) {
    return 'cola_1l';
  }

  if (
    (normalizedName.includes('meyve suyu') || normalizedName.includes('nektar')) &&
    hasOneLiterHint
  ) {
    return 'fruit_juice_1l';
  }

  if (normalizedName.includes('kraker') && hasHundredGramHint) {
    return 'cracker_100g';
  }

  if (normalizedName.includes('yulaf bar') && hasFortyGramHint) {
    return 'oat_bar_40g';
  }

  if (
    (normalizedName.includes('cips') || normalizedName.includes('chips')) &&
    hasHundredGramHint
  ) {
    return 'chips_100g';
  }

  return undefined;
}

