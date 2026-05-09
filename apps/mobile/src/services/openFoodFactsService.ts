export type OpenFoodFactsProductInfo = {
  barcode: string;
  productName: string | null;
  ingredientsText: string | null;
  allergens: string[];
  nutriScore: string | null;
  novaGroup: number | null;
  additives: string[];
};

/**
 * Open Food Facts üzerinden barkoda göre ürün bilgisini getirir.
 *
 * TODO: Open Food Facts API endpoint'ine barkod ile istek atılacak.
 * TODO: Barkod ile ürün adı (product_name) bilgisi alınacak.
 * TODO: Barkod ile içerik (ingredients_text) bilgisi alınacak.
 * TODO: Barkod ile alerjen (allergens_tags / allergens) bilgisi alınacak.
 * TODO: Barkod ile nutriscore (nutriscore_grade) bilgisi alınacak.
 * TODO: Barkod ile nova (nova_group) bilgisi alınacak.
 * TODO: Barkod ile katkı (additives_tags) bilgisi alınacak.
 */
export async function fetchOpenFoodFactsByBarcode(
  barcode: string,
): Promise<OpenFoodFactsProductInfo | null> {
  // Not: Şimdilik gerçek API çağrısı yapılmıyor.
  // Not: İleride fetch ile entegrasyon burada eklenecek.

  if (!barcode?.trim()) {
    return null;
  }

  return {
    barcode: barcode.trim(),
    productName: null,
    ingredientsText: null,
    allergens: [],
    nutriScore: null,
    novaGroup: null,
    additives: [],
  };
}
