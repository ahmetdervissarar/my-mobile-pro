/**
 * RafSkoru — Alerjen Durumu Tek Satır (saf mantık)
 * src/features/productResult/allergenStatusLine.ts
 *
 * Katmanlı sadeleştirme (onaylı plan, madde 2): ürün sayfasındaki eski
 * çok satırlı AllergenBanner yerine TEK satır + ›. Üç durum:
 *   - Profil çakışması varsa kırmızı: "Profilinle çakışıyor: Süt"
 *   - Profil yok/çakışma yok ama beyan varsa nötr: "Beyanda: Süt, Yumurta"
 *   - Veri yoksa sarı: "Alerjen verisi yok — etiketi kontrol edin"
 * Yeni bir alerjen KARARI üretmez — yalnız AllergenBannerData'dan (zaten
 * hesaplanmış) tek satırlık özet metni türetir. Güvenlik sınırı: bu satır
 * HER ZAMAN görünür (katlanmaz); yalnız ayrıntı paneli (AllergenDetailSheet)
 * dokununca açılır.
 */
import type { AllergenBannerData } from './helpers';

export type AllergenStatusTone = 'danger' | 'neutral' | 'caution';

export interface AllergenStatusLine {
  tone: AllergenStatusTone;
  text: string;
}

export function getAllergenStatusLine(data: AllergenBannerData): AllergenStatusLine {
  const hasConflict = data.criticalMatches.length > 0 || (data.displayInfo?.isConflict ?? false);

  if (hasConflict) {
    const names = data.declaredList.length > 0 ? data.declaredList : data.traceList;
    return {
      tone: 'danger',
      text: names.length > 0 ? `Profilinle çakışıyor: ${names.join(', ')}` : 'Profilinle çakışan alerjen uyarısı',
    };
  }

  if (data.declaredList.length > 0) {
    return { tone: 'neutral', text: `Beyanda: ${data.declaredList.join(', ')}` };
  }

  if (data.traceList.length > 0) {
    return { tone: 'neutral', text: `Eser miktarda içerebilir: ${data.traceList.join(', ')}` };
  }

  if (data.status === 'not_listed_in_available_data') {
    return { tone: 'neutral', text: 'Veri kaydında belirtilmemiş' };
  }

  return { tone: 'caution', text: 'Alerjen verisi yok — etiketi kontrol edin' };
}
