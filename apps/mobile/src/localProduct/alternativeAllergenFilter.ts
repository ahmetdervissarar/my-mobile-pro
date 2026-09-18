/**
 * RafSkoru — Alternatif aday alerjen güvenlik filtresi.
 * src/localProduct/alternativeAllergenFilter.ts
 *
 * Yalnız alerjen güvenliği içindir: aday sinyallerini `riskEngine.ts`'e verir ve sonucu
 * `criticalAllergenCodes.ts`'teki TEK kaynağa göre değerlendirir. Fiyat, skor, sıralama veya
 * mesafe hesaplamaz; `price` modülünden yalnız `AlternativeCandidateSignals` TİPİNİ okur,
 * fiyat kaynağı/hesaplama/ağırlık/sağlayıcı davranışına dokunmaz (proje sahibi onayı, 2026-09-18).
 */

import { evaluateProductRisks } from '../riskEngine/riskEngine';
import type { AlternativeCandidateSignals } from '../price/types';
import type { UserSensitivityProfile } from '../userProfile/userProfileTypes';
import { hasCriticalAllergenWarning } from './criticalAllergenCodes';

/**
 * Aday için declared ("içerir") VE trace ("içerebilir") alerjenleri AYRI alanlarla motora
 * verir — biri diğerine indirgenmez (ADR-004). Adayda `traceAllergens` yoksa (bugünkü backend
 * yanıtı gibi) boş dizi geçilir; bu, "iz beyanı yok" anlamına gelir, "güvenli" anlamına gelmez.
 */
export function evaluateAlternativeCandidateRisk(
  signals: AlternativeCandidateSignals | undefined,
  productName: string | undefined,
  userProfile: UserSensitivityProfile,
) {
  return evaluateProductRisks({
    name: productName ?? null,
    allergens: signals?.allergens ?? [],
    traceAllergens: signals?.traceAllergens ?? [],
    additives: signals?.additives ?? [],
    hasAdditives: (signals?.additives ?? []).length > 0,
    novaGroup: signals?.novaGroup ?? null,
    nutriScore: signals?.nutriScoreGrade ?? null,
    userProfile,
  });
}

/**
 * Bir alternatif aday kullanıcı profiliyle KRİTİK bir alerjen çakışması taşıyor mu?
 * `true` ise aday "uygun alternatif" olarak GÖSTERİLMEMELİDİR (declared veya trace fark etmez).
 */
export function isAlternativeCandidateCriticalMatch(
  signals: AlternativeCandidateSignals | undefined,
  productName: string | undefined,
  userProfile: UserSensitivityProfile,
): boolean {
  const risk = evaluateAlternativeCandidateRisk(signals, productName, userProfile);
  return hasCriticalAllergenWarning(risk.warnings);
}
