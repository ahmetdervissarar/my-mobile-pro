/**
 * RafSkoru — Çözümleme yoluna insan onaylı etiket kaydını uygular (ADR-009 §1)
 * apps/backend/src/price/productFacts/verifiedLabelResolver.ts
 *
 * priceProviderService.ts::tryFetchProductFacts buradan geçer:
 *   - OFF verisi (katalog veya canlı) varsa → onaylı kayıtla alan alan birleştirilir
 *   - OFF verisi yoksa → yalnız onaylı kayıttan ProductFacts üretilir
 *   - onaylı kayıt yoksa veya depo hazır değilse → taban AYNEN döner
 *
 * Yalnız getCurrentVerified kullanılır: onaylanmamış aday kayıtlar bu yoldan
 * ASLA geçmez. Depo hatası ürün sorgusunu düşürmez; taban veriyle devam edilir.
 */
import { createHash } from 'node:crypto';

import { getCurrentVerified, isLabelStoreDbReady } from '../../labelStore/db.js';
import type { NutriScoreCategory } from '../../nutriScore/nutriScore2023.js';
import type { ProductFacts } from './types.js';
import { mergeVerifiedLabelIntoFacts, productFactsFromVerifiedLabel } from './verifiedLabelFacts.js';

function hashBarcode(barcode: string): string {
  return createHash('sha256').update(barcode).digest('hex').slice(0, 12);
}

export function applyVerifiedLabel(
  barcode: string,
  base: ProductFacts | null,
  baseNutriScoreCategory: NutriScoreCategory | null = null,
): ProductFacts | null {
  if (!isLabelStoreDbReady()) return base;
  // Birleştirme yalnız OFF tabanı için tanımlıdır; başka kaynağa dokunulmaz.
  if (base && base.dataSource !== 'off') return base;

  try {
    const verified = getCurrentVerified(barcode);
    if (!verified) return base;

    if (!base) return productFactsFromVerifiedLabel(verified).facts;

    const { facts, conflicts } = mergeVerifiedLabelIntoFacts(base, verified, { baseNutriScoreCategory });

    // Çelişki sessiz kalmaz (ADR-009 §7a). Ham barkod ve alan değerleri
    // günlüğe yazılmaz; onay ekranı (İş 1.5) ayrıntıyı depodan gösterecektir.
    for (const conflict of conflicts) {
      console.warn(
        `[label-merge] çelişki alan=${conflict.field} geçerli=${conflict.winner} ` +
          `sürüm=${verified.version} barkodHash=${hashBarcode(barcode)}`,
      );
    }

    return facts;
  } catch (err) {
    console.warn(`[label-merge] onaylı etiket uygulanamadı; taban veriyle devam ediliyor: ${(err as Error).message}`);
    return base;
  }
}
