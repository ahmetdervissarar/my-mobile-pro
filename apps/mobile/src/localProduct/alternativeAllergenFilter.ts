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

/**
 * Bir adayın alerjen KANITI eksiksiz mi (uçtan uca boşluk düzeltmesi, proje sahibi, 2026-09-18)?
 *
 * Bugün gerçek backend yanıtı (`GET /api/price/alternatives`, `seed-candidates.json`) yalnız
 * declared `allergens`'ı doldurur; `traceAllergens` HİÇ göndermez (alan yok, `undefined`).
 * `signals`/`traceAllergens` YOKLUĞU "iz beyanı yok" (negatif kanıt) DEĞİLDİR — "bu alan hiç
 * değerlendirilmedi" demektir (kanıt eksik/doğrulanmamış). Bu iki durum karıştırılamaz (D1).
 *
 * Kanıt yalnız HER İKİ alan da açıkça bir dizi olarak mevcutsa (boş dizi dahil — boş dizi de
 * "değerlendirildi, hiçbir şey yok" anlamına gelir, ama yalnız gerçekten böyle geldiyse) eksiksiz
 * sayılır. Bu fonksiyon veriyi UYDURMAZ; yalnız var olan `signals` nesnesinin şeklini okur.
 */
export function hasCompleteAllergenEvidence(signals: AlternativeCandidateSignals | undefined): boolean {
  if (!signals) return false;
  return Array.isArray(signals.allergens) && Array.isArray(signals.traceAllergens);
}

/**
 * Bir alternatif adayın, kullanıcının alerji profiliyle "uygun" gösterilip gösterilemeyeceğine
 * karar veren TEK giriş noktası (proje sahibi düzeltmesi, 2026-09-18 — dördüncü tur).
 *
 * Kural (fail-closed):
 * - Kullanıcı profilinde HİÇ alerjen tanımlı değilse → mevcut davranış aynen korunur (yalnız
 *   `isAlternativeCandidateCriticalMatch`, ki profil boşken zaten hiçbir zaman true dönmez).
 * - Kullanıcı profilinde EN AZ BİR alerjen varsa → adayın declared+trace kanıtı eksiksiz
 *   OLMALIDIR (`hasCompleteAllergenEvidence`); eksikse/doğrulanmamışsa aday GİZLENİR — kritik
 *   eşleşme kontrolüne bile geçilmez. Kanıt eksiksizse, normal kritik eşleşme kontrolü uygulanır.
 *
 * Bu, `verified=true` gibi uydurulmuş bir bayrağa DAYANMAZ; yalnız `signals` şeklini okur. Bugün
 * hiçbir gerçek aday (`seed-candidates.json`) bu kanıt eşiğini geçemez — bu KASITLIDIR: alan
 * bazlı köken sözleşmesi (`src/contracts/generated.ts`) alternatif adaylara henüz bağlanmadı;
 * bağlanana kadar alerji profili olan kullanıcı için doğrulanmamış seed alternatifleri tamamen
 * gizli kalır (bkz. `docs/decisions/ADR-004-trace-allergen-profile-matching.md`, revizyon 4).
 */
export function isAlternativeCandidateSafeForAllergyProfile(
  signals: AlternativeCandidateSignals | undefined,
  productName: string | undefined,
  userProfile: UserSensitivityProfile,
): boolean {
  const hasAllergyProfile = userProfile.allergens.length > 0;
  if (!hasAllergyProfile) {
    return !isAlternativeCandidateCriticalMatch(signals, productName, userProfile);
  }
  if (!hasCompleteAllergenEvidence(signals)) {
    return false;
  }
  return !isAlternativeCandidateCriticalMatch(signals, productName, userProfile);
}
