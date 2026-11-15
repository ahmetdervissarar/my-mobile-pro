/**
 * RafSkoru — Çözümleme yoluna insan onaylı etiket kaydını uygular (ADR-009 §1)
 * apps/backend/src/price/productFacts/verifiedLabelResolver.ts
 *
 * priceProviderService.ts::tryFetchProductFacts buradan geçer:
 *   - OFF verisi (katalog veya canlı) varsa → onaylı kayıtla alan alan birleştirilir
 *   - OFF verisi yoksa → yalnız onaylı kayıttan ProductFacts üretilir
 *   - onaylı kayıt yoksa veya depo hazır değilse → taban AYNEN döner
 *
 * Liste ekranları (arama, kategori, sepet, alternatifler) AYNI birleştirmeyi
 * resolveWithVerifiedLabel üzerinden kullanır (catalog/effectiveCatalog.ts);
 * böylece ürün sayfası ile listeler aynı veriden puanlanır.
 *
 * Yalnız güncel onaylı kayıtlar kullanılır: onaylanmamış aday kayıtlar bu
 * yoldan ASLA geçmez. Depo hatası ürün sorgusunu düşürmez; taban veriyle
 * devam edilir.
 */
import { createHash } from 'node:crypto';

import { getCurrentVerified, isLabelStoreDbReady } from '../../labelStore/db.js';
import type { VerifiedLabelProduct } from '../../labelStore/types.js';
import type { NutriScoreCategory } from '../../nutriScore/nutriScore2023.js';
import type { ProductFacts } from './types.js';
import {
  mergeVerifiedLabelIntoFacts,
  productFactsFromVerifiedLabel,
  type LabelNutriScoreOutcome,
  type VerifiedLabelMergeConflict,
} from './verifiedLabelFacts.js';

export interface VerifiedLabelResolution {
  facts: ProductFacts | null;
  /** Uygulanan onaylı kayıt; uygulanmadıysa null. */
  verified: VerifiedLabelProduct | null;
  nutriScore: LabelNutriScoreOutcome | null;
  conflicts: VerifiedLabelMergeConflict[];
}

function hashBarcode(barcode: string): string {
  return createHash('sha256').update(barcode).digest('hex').slice(0, 12);
}

/**
 * Günlüğe yazmadan çözümler. Onaylı kayıt verilirse depoya yeniden
 * sorulmaz (liste katmanı kayıtları bellekte tutar); verilmezse depodan
 * güncel kayıt okunur.
 */
export function resolveWithVerifiedLabel(
  barcode: string,
  base: ProductFacts | null,
  baseNutriScoreCategory: NutriScoreCategory | null = null,
  knownVerified?: VerifiedLabelProduct | null,
): VerifiedLabelResolution {
  const unchanged: VerifiedLabelResolution = { facts: base, verified: null, nutriScore: null, conflicts: [] };
  // Birleştirme yalnız OFF tabanı için tanımlıdır; başka kaynağa dokunulmaz.
  if (base && base.dataSource !== 'off') return unchanged;

  let verified: VerifiedLabelProduct | null;
  if (knownVerified !== undefined) {
    verified = knownVerified;
  } else {
    if (!isLabelStoreDbReady()) return unchanged;
    verified = getCurrentVerified(barcode);
  }
  if (!verified || verified.barcode !== barcode) return unchanged;

  if (!base) {
    const only = productFactsFromVerifiedLabel(verified);
    return { facts: only.facts, verified, nutriScore: only.nutriScore, conflicts: [] };
  }

  const merged = mergeVerifiedLabelIntoFacts(base, verified, { baseNutriScoreCategory });
  return { facts: merged.facts, verified, nutriScore: merged.nutriScore, conflicts: merged.conflicts };
}

export function applyVerifiedLabel(
  barcode: string,
  base: ProductFacts | null,
  baseNutriScoreCategory: NutriScoreCategory | null = null,
): ProductFacts | null {
  try {
    const resolution = resolveWithVerifiedLabel(barcode, base, baseNutriScoreCategory);

    // Çelişki sessiz kalmaz (ADR-009 §7a). Ham barkod ve alan değerleri
    // günlüğe yazılmaz; onay ekranı (İş 1.5) ayrıntıyı depodan gösterecektir.
    for (const conflict of resolution.conflicts) {
      console.warn(
        `[label-merge] çelişki alan=${conflict.field} geçerli=${conflict.winner} ` +
          `sürüm=${resolution.verified?.version ?? '?'} barkodHash=${hashBarcode(barcode)}`,
      );
    }

    return resolution.facts;
  } catch (err) {
    console.warn(`[label-merge] onaylı etiket uygulanamadı; taban veriyle devam ediliyor: ${(err as Error).message}`);
    return base;
  }
}
