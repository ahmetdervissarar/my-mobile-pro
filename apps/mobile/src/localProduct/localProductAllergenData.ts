/**
 * RafSkoru — Kullanıcı Katkısı: Alerjen Kapısı Dönüşümü
 * src/localProduct/localProductAllergenData.ts
 *
 * Sorumluluk: UserContributedProduct.declaredAllergens'i, arama/sepet/ürün
 * sayfasıyla AYNI paylaşılan fonksiyonun (evaluateCatalogAllergenDataForProfile,
 * catalogAllergenChip.ts) tükettiği CatalogAllergenData şekline çevirmek.
 * catalogAllergenChip.ts'e HİÇ DOKUNMAZ — yalnız onun girdisini üretir.
 *
 * Temel kural: dataStatus ASLA 'present' OLAMAZ. 'present', katalog
 * sözleşiminde "ham etiketlerin TAMAMI bilinen bir kovaya düştü" (yani
 * kapsamlı, bağımsız doğrulanmış tarama) anlamına gelir — kullanıcının kendi
 * beyanı bunu iddia edemez. catalogAllergenChip.ts'in baseClassify()
 * fonksiyonu, dataStatus 'present' DEĞİLSE işaretlenmemiş her profil
 * anahtarını 'unknown_or_unverified' (temkinli: "bilmiyoruz") döndürür;
 * 'present' olsaydı bunun yerine 'not_listed_in_available_data' ("baktık,
 * yok" — daha az temkinli) dönerdi. dataStatus'ü 'present'in altında
 * tutmak, kullanıcının işaretlemediği her alerjen için bu daha temkinli
 * sonucu sağlar (bkz. localProductAllergenData.smoke.ts).
 */

import type { CatalogAllergenData } from '../api/catalogTypes';
import type { UserContributedProduct } from './types';

export function userContributedProductToCatalogAllergenData(
  product: UserContributedProduct,
): CatalogAllergenData {
  return {
    declared: product.declaredAllergens,
    // Kullanıcı formu tek bir düz onay-kutusu listesi sunar — ayrı bir "eser
    // miktarda" alanı yok; iz beyanı bu sürümde hiç üretilmez.
    traces: [],
    recognizedUnmodeled: [],
    rawUnmapped: [],
    dataStatus: product.declaredAllergens.length > 0 ? 'partial' : 'unknown_or_unverified',
    // `source: 'off'` yalnız tip zorunluluğu (CatalogIngredientsEvidence.source
    // bugün yalnız 'off' kabul ediyor) — `text: null` olduğu için bu alan
    // catalogAllergenChip.ts'te HİÇ OKUNMAZ: "içindekiler yükseltmesi" yalnız
    // status 'not_listed_in_available_data' iken çalışır, ki dataStatus asla
    // 'present' olmadığından bu status buraya asla ulaşmaz (bkz. yukarıdaki not).
    ingredientsEvidence: { text: null, lang: null, source: 'off' },
  };
}
