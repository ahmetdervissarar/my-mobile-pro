/**
 * RafSkoru — Yerel ürün kurtarma dikey dilimi bayrakları.
 * src/localProduct/featureFlag.ts
 *
 * - EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY=1 → ürün sonuç ekranında üç veri durumu, alerjen beyanı
 *   özeti ve "Paket bilgisini ekle" akışı açılır. Kapalıyken eski davranış aynen korunur.
 * - EXPO_PUBLIC_LOCAL_PRODUCT_FIXTURE=1 → yalnız geliştirme derlemesinde (__DEV__) OCR aday
 *   fixture'ı ön doldurulur; ekranda her yerde "GELİŞTİRME FIXTURE" etiketiyle görünür ve
 *   gerçek veri gibi sunulmaz. Üretim derlemesinde hiçbir zaman açılmaz (D4).
 */

declare const __DEV__: boolean | undefined;

export function isLocalProductRecoveryEnabled(): boolean {
  return process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY === '1';
}

export function isLocalProductFixtureEnabled(): boolean {
  const isDevBuild = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return isDevBuild && process.env.EXPO_PUBLIC_LOCAL_PRODUCT_FIXTURE === '1';
}
