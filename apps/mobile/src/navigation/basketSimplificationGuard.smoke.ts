/**
 * RafSkoru — Sepet katmanlı sadeleştirme regresyon koruması
 * src/navigation/basketSimplificationGuard.smoke.ts
 *
 * Onaylı plan: sepet özeti tek satır durum + sönük/küçük puan (büyük halka
 * YOK); ürün satırı ad + tek rozet + miktar kontrolü + Kaldır (açıklama
 * metni YOK). Alerjen KARAR mantığına dokunulmadı — bu statik koruma yalnız
 * sunum katmanındaki kaldırmaların geri gelmediğini doğrular.
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
for (const forbidden of ['<NutriScoreBadge', '<NovaBadge', '<AllergenChip', 'otherLabels', 'allergenNote', 'Profilinizle çakışıyor']) {
  assert.ok(
    !basketItemRow.includes(forbidden),
    `sepet ürün satırında "${forbidden}" OLMAMALI — ad + tek rozet + miktar + Kaldır dışında açıklama yok`,
  );
}
assert.ok(basketItemRow.includes('<ScorePill'), 'sepet ürün satırında tek rozet (ScorePill) olmalı');

console.log('BASKET_SIMPLIFICATION_GUARD_SMOKE_OK');
