/**
 * RafSkoru — Sepet katmanlı sadeleştirme regresyon koruması
 * src/navigation/basketSimplificationGuard.smoke.ts
 *
 * Onaylı plan: sepet özeti tek satır durum + sönük/küçük puan (büyük halka
 * YOK); ürün satırı ad + rozet(ler) + miktar kontrolü + Kaldır — açıklama
 * METNİ ve fazladan satır YOK. Alerjen KARAR mantığına dokunulmadı — bu
 * statik koruma yalnız sunum katmanındaki kaldırmaların geri gelmediğini
 * doğrular.
 *
 * Güncelleme (onaylı, 405d2fe sonrası): AllergenChip artık YASAKLI DEĞİL —
 * fail-open düzeltmesi (405d2fe) çakışma YOKKEN (beyan/belirtilmemiş/veri
 * yok) rozetsiz satır kalmaması için kasıtlı eklendi; kendi regresyon
 * kilidi allergenBadgeCoverage.smoke.ts. Bu test artık rozetin VARLIĞINI
 * bekler — "sadeleştirme" kuralı yalnız açıklama metinleri/fazladan
 * satırlar için geçerli kalır.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '../..');

function readMobileFile(relativePath: string): string {
  return readFileSync(resolve(mobileRoot, relativePath), 'utf8');
}

const scoreTab = readMobileFile('src/features/basket/ScoreTab.tsx');
assert.ok(!scoreTab.includes('ScoreRing'), 'sepet özetinde büyük puan halkası (ScoreRing) OLMAMALI');

const basketItemRow = readMobileFile('src/features/basket/BasketItemRow.tsx');
for (const forbidden of ['<NutriScoreBadge', '<NovaBadge', 'otherLabels', 'allergenNote', 'Profilinizle çakışıyor']) {
  assert.ok(
    !basketItemRow.includes(forbidden),
    `sepet ürün satırında "${forbidden}" OLMAMALI — ad + rozet(ler) + miktar + Kaldır dışında açıklama yok`,
  );
}
assert.ok(basketItemRow.includes('<ScorePill'), 'sepet ürün satırında puan rozeti (ScorePill) olmalı');

// Fail-open düzeltmesi (405d2fe, onaylı): çakışma YOKSA da rozetsiz satır
// kalmasın diye AllergenChip BULUNMALI — "sadeleştirme" bunu yasaklamaz,
// yalnız AÇIKLAMA METNİNİ (otherLabels/allergenNote) yasaklar.
assert.ok(
  basketItemRow.includes('<AllergenChip'),
  'sepet ürün satırında AllergenChip BULUNMALI (fail-open düzeltmesi, 405d2fe) — çakışma yoksa da alerjen rozeti gösterilir',
);
assert.ok(
  /\{!isAllergenConflict \? \(\s*<AllergenChip/.test(basketItemRow),
  'AllergenChip çakışma YOKKEN gösterilmeli — çakışma zaten kırmızı kenar + ScorePill ile ayrıca görünür',
);

console.log('BASKET_SIMPLIFICATION_GUARD_SMOKE_OK');
