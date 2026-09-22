// P0-3: "Grup tahmini puanlarda hüküm kelimesi hiç kullanılmaz; yalnızca
// 'Puan (tahmini): 78'." ve P0-1: "Profille çakışan üründe hüküm kelimesi
// gösterilmez." — bu iki kuralı ScorePill/ScoreRing'in render ettiği METNİ
// üreten saf fonksiyonlar üzerinden doğrular (bkz. görev onayı, wording
// guard testi). "Puan: Tahmini: N" biçimi (çift ":") kullanıcı tarafından
// reddedildi — "Puan (tahmini): N" biçimine düzeltildi.
import assert from 'node:assert/strict';

import { getScorePillLabel, getScoreRingBandText, VERDICT_WORDS } from './scoreVerdict';

const SCORES = [0, 12, 40, 60, 90, 100, null];

// 1) Grup tahmini: hüküm kelimesi ASLA görünmez, yalnız "Puan (tahmini): N" —
// ve KESİNLİKLE çift ":" YOK.
for (const score of SCORES) {
  const label = getScorePillLabel({ score, isEstimate: true });
  for (const word of VERDICT_WORDS) {
    assert.ok(!label.includes(word), `grup tahmini etiketi hüküm kelimesi içeriyor: "${word}" in "${label}"`);
  }
  assert.ok(label.toLocaleLowerCase('tr-TR').includes('tahmini'), `grup tahmini etiketi "tahmini" içermeli: "${label}"`);
  assert.equal(label, `Puan (tahmini): ${score === null ? '—' : score}`);
  assert.equal((label.match(/:/g) ?? []).length, 1, `grup tahmini etiketinde tek ":" olmalı, çift OLMAMALI: "${label}"`);
}

// 2) Alerjen önceliği: hüküm kelimesi ASLA görünmez (ne ScorePill ne ScoreRing).
for (const score of SCORES) {
  const pillLabel = getScorePillLabel({ score, allergenPriority: true });
  const ringText = getScoreRingBandText(score, true);
  for (const word of VERDICT_WORDS) {
    assert.ok(!pillLabel.includes(word), `alerjen öncelikli çip hüküm kelimesi içeriyor: "${word}" in "${pillLabel}"`);
    assert.ok(!ringText.includes(word), `alerjen öncelikli halka hüküm kelimesi içeriyor: "${word}" in "${ringText}"`);
  }
  assert.ok(pillLabel.includes('Alerjen uyarısı öncelikli'));
  assert.equal(ringText, 'Alerjen uyarısı öncelikli');
}

// 3) Alerjen önceliği + grup tahmini AYNI ANDA true ise, alerjen önceliği kazanır
// (P2: alerjen kapısı her zaman skorun/tahminin üstünde).
const bothLabel = getScorePillLabel({ score: 78, allergenPriority: true, isEstimate: true });
assert.ok(bothLabel.includes('Alerjen uyarısı öncelikli'));
assert.ok(!bothLabel.toLocaleLowerCase('tr-TR').includes('tahmini'));

// 4) Normal durumda hüküm kelimesi GÖRÜNMELİ (regresyon değil — bu testin
// kendisi de "her zaman gizli" bir kural yazmadığını kanıtlar).
assert.ok(VERDICT_WORDS.some((w) => getScorePillLabel({ score: 90 }).includes(w)));
assert.ok(VERDICT_WORDS.some((w) => getScoreRingBandText(90, false).includes(w)));

console.log(`SCORE_VERDICT_WORDING_SMOKE_OK (${SCORES.length} puan × 3 senaryo)`);
