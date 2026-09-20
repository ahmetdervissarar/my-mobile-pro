/**
 * RafSkoru — Yerel ürün kurtarma dikey dilimi bayrakları.
 * src/localProduct/featureFlag.ts
 *
 * - EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY=1 → ürün sonuç ekranında üç veri durumu, alerjen beyanı
 *   özeti ve "Paket bilgisini ekle" akışı açılır. Kapalıyken eski davranış aynen korunur.
 * - EXPO_PUBLIC_LOCAL_PRODUCT_FIXTURE=1 → yalnız geliştirme derlemesinde (__DEV__) OCR aday
 *   fixture'ı ön doldurulur; ekranda her yerde "GELİŞTİRME FIXTURE" etiketiyle görünür ve
 *   gerçek veri gibi sunulmaz. Üretim derlemesinde hiçbir zaman açılmaz (D4).
 * - EXPO_PUBLIC_LOCAL_OCR=1 → cihaz içi OCR aday katmanı (Aşama 7, ADR-006) açılır; yalnız
 *   `isLocalProductRecoveryEnabled()` DE açıkken etkilidir. Kapalıyken (varsayılan) OCR arayüzü
 *   hiç render edilmez, mevcut elle giriş akışı birebir korunur. Fotoğraf/metin bu bayrakla dahi
 *   hiçbir zaman cihaz dışına çıkmaz — yalnız cihaz üzerinde çalışan ML Kit motoru tetiklenir.
 * - EXPO_PUBLIC_CONSUMER_UX_V2=1 → tüketici karar akışı V2 (Aşama 8, `src/consumerUx/`) ürün
 *   sonuç ekranında açılır. Kapalıyken (varsayılan) mevcut `product-result.tsx` ekranı birebir
 *   korunur; bu bayrak `riskEngine`/skor/alternatif MANTIĞINI değiştirmez, yalnız SUNUMU değiştirir.
 * - EXPO_PUBLIC_PILOT_PREVIEW=1 → yalnız pilot önizleme derlemesinde (Aşama 10) açılır; ana
 *   ekranda küçük "Pilot önizleme" giriş noktasını ve `__DEV__` durum galerilerini (yalnız bu
 *   EK koşulla, `__DEV__` yerine değil) görünür kılar. Hiçbir izlenen `.env`/`app.json` dosyasında
 *   `1` değeri YOKTUR; yalnız CI'nin pilot iş akışının job ortamında açılır. Kapalıyken (varsayılan,
 *   normal derleme) hiçbir davranış değişmez.
 */

declare const __DEV__: boolean | undefined;

export function isLocalProductRecoveryEnabled(): boolean {
  return process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY === '1';
}

export function isLocalProductFixtureEnabled(): boolean {
  const isDevBuild = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return isDevBuild && process.env.EXPO_PUBLIC_LOCAL_PRODUCT_FIXTURE === '1';
}

export function isLocalOcrEnabled(): boolean {
  return isLocalProductRecoveryEnabled() && process.env.EXPO_PUBLIC_LOCAL_OCR === '1';
}

export function isConsumerUxV2Enabled(): boolean {
  return process.env.EXPO_PUBLIC_CONSUMER_UX_V2 === '1';
}

export function isPilotPreviewEnabled(): boolean {
  return process.env.EXPO_PUBLIC_PILOT_PREVIEW === '1';
}
