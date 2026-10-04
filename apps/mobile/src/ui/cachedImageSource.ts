/**
 * RafSkoru — Ürün görseli önbellek kaynağı (saf yardımcı)
 * src/ui/cachedImageSource.ts
 *
 * Görev (ürün görselleri): liste kaydırmada (arama/kategori/sepet) aynı
 * görsel tekrar tekrar ağdan çekilmesin diye RN Image'ın yerleşik disk
 * önbelleğini zorlar — yeni bağımlılık (ör. expo-image) EKLEMEZ, onay
 * gerektiren bir paket kurulumu değildir. `cache` alanı iOS'a özeldir;
 * Android'de no-op'tur (RN Image Android'de zaten varsayılan disk
 * önbelleği kullanır) — iki platformda da güvenli.
 */
import type { ImageURISource } from 'react-native';

export function cachedImageSource(uri: string): ImageURISource {
  return { uri, cache: 'force-cache' };
}
