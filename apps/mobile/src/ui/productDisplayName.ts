/**
 * RafSkoru — Ad bilinmeyen ürün başlığı (saf mantık)
 * src/ui/productDisplayName.ts
 *
 * Cihaz testi (feat/catalog-alternatives), madde 3: backend'in
 * (search/suggestions.ts catalogProductToSuggestion) adı VE markası olmayan
 * bir ürün için label alanına barkodu koyması ("name ?? brand ?? productId"),
 * liste kartlarında barkodun BAŞLIK olarak görünmesine yol açıyordu.
 * Bu modül, o durumu (label === productId) tespit edip yerine "Adı bilinmeyen
 * ürün" + miktar gösterir; barkod artık yalnız alt satırda küçük/gri (meta
 * stilinde) kalır. Arama, kategori ve sepet listeleri AYNI tespiti kullanır —
 * yeni bir veri kararı ÜRETMEZ, yalnız sunumu düzeltir.
 */

export interface ProductDisplayNameInput {
  /** Backend'den gelen etiket — ad/marka yoksa barkodla AYNI olabilir. */
  label: string;
  productId?: string | null;
  packageSize?: { amount: number; unit: string } | null;
}

export interface ProductDisplayName {
  /** Başlıkta gösterilecek metin. */
  title: string;
  /** Ad bilinmiyorsa barkod — alt satırda küçük/gri gösterilir; biliniyorsa null. */
  unknownNameBarcode: string | null;
}

export function getProductDisplayName(input: ProductDisplayNameInput): ProductDisplayName {
  const isNameUnknown = Boolean(input.productId) && input.label === input.productId;

  if (!isNameUnknown) {
    return { title: input.label, unknownNameBarcode: null };
  }

  const quantityText = input.packageSize ? `${input.packageSize.amount} ${input.packageSize.unit}` : null;

  return {
    title: quantityText ? `Adı bilinmeyen ürün · ${quantityText}` : 'Adı bilinmeyen ürün',
    unknownNameBarcode: input.productId ?? null,
  };
}
