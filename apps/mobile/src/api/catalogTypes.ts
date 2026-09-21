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

/** backend'deki AllergenDataStatus ile birebir aynı — burada yeniden yorumlanmaz. */
export type CatalogAllergenDataStatus = 'present' | 'not_listed_in_available_data' | 'unknown_or_unverified';

export interface CatalogAllergenData {
  declared: AllergenKey[];
  traces: AllergenKey[];
  dataStatus: CatalogAllergenDataStatus;
}

export interface CatalogProvenance {
  source: 'off';
  license: 'ODbL-1.0';
  url: string;
  observedAt: string | null;
  fetchedAt: string;
}

export type CatalogCompleteness = 'complete' | 'usable_for_risk' | 'usable_for_health' | 'insufficient';
