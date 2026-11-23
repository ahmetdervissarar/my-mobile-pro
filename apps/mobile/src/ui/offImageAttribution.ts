/**
 * RafSkoru — Open Food Facts görsel atfı (saf yardımcı)
 * src/ui/offImageAttribution.ts
 *
 * OFF ürün fotoğrafları CC BY-SA 3.0 lisanslıdır; gösterildiği yerde katkıcılar,
 * lisans ve ürünün OFF sayfası anılır (OFF kullanım şartları, "Attribution").
 * Yalnız görsel gerçekten OFF görsel sunucusundan geliyorsa atıf döner; kamera
 * fotoğrafı veya başka kaynak için null (atıf uydurulmaz).
 */
export interface OffImageAttribution {
  text: string;
  url: string;
}

const OFF_IMAGE_HOST = /^https:\/\/images\.openfoodfacts\.org\//;

export function offImageAttribution(imageUrl: string | null | undefined, barcode: string | null | undefined): OffImageAttribution | null {
  if (!imageUrl || !OFF_IMAGE_HOST.test(imageUrl)) return null;
  const code = barcode && /^[0-9]{8,14}$/.test(barcode) ? barcode : null;
  return {
    text: 'Görsel: Open Food Facts katkıcıları (CC BY-SA 3.0)',
    url: code ? `https://world.openfoodfacts.org/product/${code}` : 'https://world.openfoodfacts.org',
  };
}
