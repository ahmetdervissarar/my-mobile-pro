/**
 * RafSkoru — Katalog Alerjen Çipi Türetimi
 * src/riskEngine/catalogAllergenChip.ts
 *
 * Arama ve sepet satırlarındaki alerji çipini, katalogdan gelen
 * CatalogAllergenData ile cihazdaki kullanıcı profilini birleştirerek
 * üretir. riskEngine.ts DEĞİŞTİRİLMEDEN, mevcut evaluateProductRisks
 * API'si üzerinden çağrılır (bkz. görev değişmez kural 1). Yeni bir
 * alerjen kararı ÜRETMEZ — yalnız zaten hesaplanmış çıktının sunumudur.
 *
 * Bilinen sınırlama: riskEngine'in TREE_NUTS_KEYWORDS listesi madde adı
 * (fındık, badem, ceviz…) bekler; kanonik 'tree_nuts' anahtarı doğrudan
 * geçmeyebilir. Bu, product-result ekranındaki mevcut davranışla aynı
 * önceden var olan sınırlamadır (bkz. görev raporu) — riskEngine.ts'e
 * dokunmadan düzeltilemez.
 */

import type { CatalogAllergenData } from '../api/catalogTypes';
import type { AllergenBannerStatus } from '../ui/AllergenBanner';
import { evaluateProductRisks } from './riskEngine';
import { CRITICAL_ALLERGEN_CODES } from './criticalAllergenCodes';
import type { UserSensitivityProfile } from '../userProfile/userProfileTypes';

function baseStatusFromCatalog(data: CatalogAllergenData): AllergenBannerStatus {
  if (data.dataStatus === 'present') {
    if (data.declared.length > 0) return 'declared_contains';
    if (data.traces.length > 0) return 'trace_may_contain';
    return 'not_listed_in_available_data';
  }

  if (data.dataStatus === 'not_listed_in_available_data') {
    return 'not_listed_in_available_data';
  }

  return 'unknown_or_unverified';
}

/**
 * Dönüş tipi açıkça 'unknown_or_unverified' olarak sabitlenmiştir (geniş
 * AllergenBannerStatus birleşimi değil). Biri gövdeyi değiştirip başka bir
 * durum döndürmeye çalışırsa `npm run check` (tsc) derleme hatasıyla durur
 * — "alerjen verisi yoksa her zaman 'veri yok' çipi" kuralı böylece
 * derleme zamanında güvenceye alınmış olur.
 */
function statusForMissingAllergenData(): 'unknown_or_unverified' {
  return 'unknown_or_unverified';
}

export function getCatalogAllergenChipStatus(
  allergenData: CatalogAllergenData | undefined,
  userProfile: UserSensitivityProfile,
): AllergenBannerStatus {
  if (!allergenData) {
    return statusForMissingAllergenData();
  }

  const riskResult = evaluateProductRisks({
    allergens: [...allergenData.declared, ...allergenData.traces],
    userProfile,
  });

  const hasCriticalMatch = riskResult.warnings.some((warning) =>
    CRITICAL_ALLERGEN_CODES.includes(warning.code),
  );

  if (hasCriticalMatch) {
    return 'declared_contains';
  }

  return baseStatusFromCatalog(allergenData);
}
