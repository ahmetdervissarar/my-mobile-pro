/**
 * RafSkoru — Kullanıcı Katkısı: Cihazda Saklama
 * src/localProduct/localProductStorage.ts
 *
 * Sorumluluk: UserContributedProduct kayıtlarını AsyncStorage'a yaz/oku/listele.
 * userProfileStorage.ts ile aynı desen: saf bir I/O katmanı, UI'a ve risk
 * motoruna bağımlılığı yok. Sunucuya HİÇBİR ağ isteği atmaz.
 *
 * AsyncStorage tercih edildi (SQLite değil): kayıt hacmi düşük (kullanıcı
 * başına birkaç GTIN), karmaşık sorgu (join, filtre, sıralama) ihtiyacı yok
 * — yalnız "GTIN ile getir" ve "tümünü listele". Proje zaten
 * @react-native-async-storage/async-storage'a bağımlı ve aynı deseni
 * userProfileStorage.ts'te kullanıyor; SQLite ek bağımlılık/şema yükü
 * getirir ve bu ölçekte karşılığı yoktur.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserContributedProduct } from './types';

const KEY_PREFIX = 'rafskoru:localProduct:';

function keyForGtin(gtin: string): string {
  return `${KEY_PREFIX}${gtin}`;
}

/** Kaydı AsyncStorage'a yazar (varsa üzerine yazar). */
export async function saveLocalProduct(product: UserContributedProduct): Promise<void> {
  try {
    await AsyncStorage.setItem(keyForGtin(product.gtin), JSON.stringify(product));
  } catch {
    // Kayıt başarısız olursa sessizce geç — uygulama çalışmaya devam eder.
  }
}

/** GTIN ile tek kaydı okur. Kayıt yoksa veya ayrıştırma başarısızsa null döner. */
export async function getLocalProduct(gtin: string): Promise<UserContributedProduct | null> {
  try {
    const raw = await AsyncStorage.getItem(keyForGtin(gtin));
    if (!raw) return null;
    return JSON.parse(raw) as UserContributedProduct;
  } catch {
    return null;
  }
}

/** Cihazda saklanan tüm kullanıcı katkılarını listeler. Bozuk bir kayıt diğerlerini etkilemez. */
export async function listLocalProducts(): Promise<UserContributedProduct[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const productKeys = allKeys.filter((key) => key.startsWith(KEY_PREFIX));
    if (productKeys.length === 0) return [];

    const entries = await AsyncStorage.multiGet(productKeys);
    const products: UserContributedProduct[] = [];

    for (const [, raw] of entries) {
      if (!raw) continue;
      try {
        products.push(JSON.parse(raw) as UserContributedProduct);
      } catch {
        // Bozuk tek bir kayıt listenin tamamını başarısız kılmaz.
      }
    }

    return products;
  } catch {
    return [];
  }
}

/** Kaydı siler. Kayıt yoksa sessizce başarılı sayılır. */
export async function removeLocalProduct(gtin: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyForGtin(gtin));
  } catch {
    // Silme başarısız olursa sessizce geç.
  }
}
