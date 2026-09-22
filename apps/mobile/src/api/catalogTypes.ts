/**
 * RafSkoru — Katalog Sözleşme Tipleri (mobil)
 * src/api/catalogTypes.ts
 *
 * apps/backend/src/catalog/catalog.ts ile ELLE birebir eşleşir (paylaşılan
 * paket ayrı bir görev). Bu tipler arama önerisi ve sepet uç noktalarının
 * isteğe bağlı ürün alanlarını taşır; skor mantığı içermez.
 */

import type { AllergenKey } from '../userProfile/userProfileTypes';

export type CatalogNutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type CatalogNutriScoreStatus = 'computed' | 'off' | 'insufficient_data';
export type CatalogNutriScoreSource = 'rafskoru_computed' | 'off' | null;

export interface CatalogNutriScore {
  grade: CatalogNutriScoreGrade | null;
  status: CatalogNutriScoreStatus;
  source: CatalogNutriScoreSource;
  algorithmVersion: string | null;
  assumptions: string[];
}

export interface CatalogNova {
  group: 1 | 2 | 3 | 4 | null;
  source: 'off' | null;
}

/**
 * backend'deki CatalogAllergenDataStatus ile birebir aynı — burada yeniden
 * yorumlanmaz. not_listed_in_available_data BURADA yoktur; o yalnız çip
 * düzeyinde, profil alerjeni başına bir sonuçtur (bkz. catalogAllergenChip.ts).
 */
export type CatalogAllergenDataStatus = 'present' | 'partial' | 'unknown_or_unverified';

export interface CatalogIngredientsEvidence {
  text: string | null;
  lang: 'tr' | 'other' | null;
  source: 'off';
}

export interface CatalogAllergenData {
  declared: AllergenKey[];
  traces: AllergenKey[];
  /** AB/TR zorunlu ama profilde modellenmemiş, tanınan ham etiketler (ör. 'en:celery'). */
  recognizedUnmodeled: string[];
  /** Ne modellenmiş ne tanınan ham etiketler — 'partial' durumunu tetikler. */
  rawUnmapped: string[];
  dataStatus: CatalogAllergenDataStatus;
  /** Yalnız çipin "daha az temkinli olamaz" yükseltmesi için — içerik skoru KULLANMAZ. */
  ingredientsEvidence: CatalogIngredientsEvidence;
}

export interface CatalogProvenance {
  source: 'off';
  license: 'ODbL-1.0';
  url: string;
  observedAt: string | null;
  fetchedAt: string;
}

export type CatalogCompleteness = 'complete' | 'usable_for_risk' | 'usable_for_health' | 'insufficient';
