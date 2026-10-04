/**
 * RafSkoru — Tek Cümlelik Karar Özeti (saf projeksiyon)
 * src/features/productResult/decisionSummary.ts
 *
 * İş 4 (feat/ui-clarity, görev onayı + ek 3): ilk ekranda (kaydırmadan önce)
 * gösterilecek TEK cümle. CLAUDE.md değişmez ilke 6 ("Açıklama yapıcı salt
 * projeksiyondur") gereği YENİ bir eşik/karar üretmez — yalnız ZATEN
 * HESAPLANMIŞ sinyallerden (allergenStatusLine, riskEngine uyarı önceliği,
 * rafScore pozitif gerekçeleri) öncelik sırasıyla ilkini seçer:
 *
 *   1. Profil çakışması varsa → ÇAKIŞMA cümlesi (getAllergenStatusLine'ın
 *      AYNI metni — ek 3: "iki mesaj yan yana çelişmesin" şartı, bu yüzden
 *      StickyAddBar üstünde tekrarlanan satırla TAM AYNI kaynak). Beslenme/
 *      pozitif sinyal bu durumda HİÇ karışmaz.
 *   2. Yoksa, riskEngine'in zaten önceliklendirdiği (sortWarningsByPriority)
 *      ilk kritik-olmayan uyarının kendi `title`'ı — yeni metin üretilmez.
 *   3. Yoksa, backend'in severity='positive' işaretlediği ilk gerekçe.
 *   4. Hiçbiri yoksa → null (ek 3: "sinyal yoksa cümle üretilmemesi onaylı").
 */

export interface DecisionSummaryInput {
  isAllergenConflict: boolean;
  /** Çakışma varsa AllergenStatusRow/sticky bar ile AYNI metin (getAllergenStatusLine(data).text). */
  allergenConflictText: string | null;
  /** riskEngine'in zaten önceliklendirdiği ilk kritik-olmayan uyarının başlığı. */
  topWarningTitle: string | null;
  /** rafScore.reasons'taki ilk severity='positive' gerekçe metni. */
  topPositiveItem: string | null;
}

export function getDecisionSummaryLine({
  isAllergenConflict,
  allergenConflictText,
  topWarningTitle,
  topPositiveItem,
}: DecisionSummaryInput): string | null {
  if (isAllergenConflict) {
    return allergenConflictText;
  }

  if (topWarningTitle) {
    return topWarningTitle;
  }

  if (topPositiveItem) {
    return topPositiveItem;
  }

  return null;
}
