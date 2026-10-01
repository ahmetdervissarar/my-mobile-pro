/**
 * RafSkoru — konum kabalaştırma (P1-7, feat/v2-catalog)
 * src/services/locationPrecision.ts
 *
 * expo-location'dan bağımsız, saf bir dosyada tutulur ki plain Node/tsx
 * altında (locationService.ts'in kendisi react-native'i import ettiği için
 * çalışmaz) smoke test edilebilsin.
 */

/**
 * ~1 km'lik bir kareye yuvarlar (bkz. ADR-006 "konum isteğe bağlı, kaba,
 * saklanmıyor"). 0.01 derece enlem ~1,1 km'ye karşılık gelir; Türkiye
 * enlemlerinde (~36-42°N) boylam için de kabaca aynı büyüklük mertebesindedir.
 * Amaç mağaza/mesafe özelliği için yeterli kabalıkta bir konum vermek,
 * kullanıcının kesin konumunu asla ağ üzerinden göndermemektir.
 */
export function roundToCoarseGrid(value: number): number {
  return Math.round(value * 100) / 100;
}
