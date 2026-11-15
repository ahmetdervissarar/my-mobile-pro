/**
 * RafSkoru — Nutri-Score rozetinin metinleri
 * src/ui/nutriScoreBadgeLabel.ts
 *
 * NutriScoreBadge.tsx'ten ayrıldı: React Native'siz test edilebilsin diye.
 * Notun kaynağı her zaman erişilebilirlik etiketinde söylenir; etiket
 * değerlerinden hesaplanan not, etikette yazıyormuş gibi gösterilmez.
 */
import type { CatalogNutriScoreSource, CatalogNutriScoreStatus } from '../api/catalogTypes';

export type NutriScoreBadgeGrade = 'A' | 'B' | 'C' | 'D' | 'E';

const SOURCE_QUALIFIERS: Record<Exclude<CatalogNutriScoreSource, null>, string> = {
  off: ' (Open Food Facts verisi)',
  rafskoru_computed: ' (hesaplanmış)',
  rafskoru_label: ' (onaylı etiket değerlerinden hesaplanmış)',
};

export function getNutriScoreBadgeLabels(input: {
  grade: NutriScoreBadgeGrade | null;
  source?: CatalogNutriScoreSource;
  status?: CatalogNutriScoreStatus | null;
}): { baseLabel: string; label: string } {
  const baseLabel =
    input.status === 'not_applicable'
      ? 'Nutri-Score: Uygulanamaz'
      : input.grade
        ? `Nutri-Score ${input.grade}`
        : 'Nutri-Score: veri yok';

  const qualifier =
    input.grade && input.source && Object.prototype.hasOwnProperty.call(SOURCE_QUALIFIERS, input.source)
      ? SOURCE_QUALIFIERS[input.source]
      : '';

  return { baseLabel, label: `${baseLabel}${qualifier}` };
}
