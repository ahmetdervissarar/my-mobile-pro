// TR alerjen eş anlamlı tablosu (TR_ALLERGEN_SYNONYMS) — tam eşleşme kuralı doğrulaması.
// Kod incelemesi: her satır TR verisinde gözlenen bir ham etikete karşılık gelir
// (bkz. offAllergenMap.ts başlığı ve görev raporu). Alt dizi eşleşmesi YOK.
import assert from 'node:assert/strict';

import { classifyAllergenTags } from './offAllergenMap.js';

// 16 satırın her biri için en az bir vaka (declared üzerinden, dataStatus'a bakılmaz —
// yalnız classifyAllergenTags çıktısı test edilir).
const CASES: { tag: string; expectMapped?: string[]; expectRecognizedUnmodeled?: string[] }[] = [
  { tag: 'en:süt', expectMapped: ['milk'] },
  { tag: 'tr:sütü', expectMapped: ['milk'] },
  { tag: 'tr:süt ürünü', expectMapped: ['milk'] },
  { tag: 'tr:peyniraltı suyu tozu', expectMapped: ['milk'] },
  { tag: 'en:inek sütü', expectMapped: ['milk'] },
  { tag: 'tr:yulaf', expectMapped: ['gluten_wheat'] },
  { tag: 'tr:sodyum metabisülfit', expectRecognizedUnmodeled: ['en:sulphur-dioxide-and-sulphites'] },
  { tag: 'en:yumurta', expectMapped: ['egg'] },
  { tag: 'en:fındık', expectMapped: ['tree_nuts'] },
  { tag: 'tr:süt proteini', expectMapped: ['milk'] },
  { tag: 'en:süt proteini', expectMapped: ['milk'] },
  { tag: 'en:susam', expectMapped: ['sesame'] },
  { tag: 'en:Pastörize inek sütü', expectMapped: ['milk'] },
  { tag: 'en:badem', expectMapped: ['tree_nuts'] },
  { tag: 'en:fıstık', expectMapped: ['peanut', 'tree_nuts'] },
  { tag: 'en:Whey proteini konsantresi', expectMapped: ['milk'] },
  { tag: 'tr:laktoz', expectMapped: ['milk'] },
];

for (const { tag, expectMapped, expectRecognizedUnmodeled } of CASES) {
  const result = classifyAllergenTags([tag]);
  if (expectMapped) {
    assert.deepEqual(result.mapped.sort(), [...expectMapped].sort(), `${tag}: mapped beklenmedik`);
    assert.deepEqual(result.unmapped, [], `${tag}: unmapped boş olmalı`);
  }
  if (expectRecognizedUnmodeled) {
    assert.deepEqual(result.recognizedUnmodeled, expectRecognizedUnmodeled, `${tag}: recognizedUnmodeled beklenmedik`);
    assert.deepEqual(result.unmapped, [], `${tag}: unmapped boş olmalı`);
  }
}

// fıstık → peanut + tree_nuts (belirsiz vaka, açıkça iki anahtara birden düşer).
const fistikResult = classifyAllergenTags(['en:fıstık']);
assert.deepEqual(fistikResult.mapped.sort(), ['peanut', 'tree_nuts']);

// "hindistan cevizi sütü" (coconut milk) — tabloda YOK, eşleşmemeli, unmapped'te kalmalı
// (partial'ı tetikleyen gerçek bir "yanlış dost" örneği; süt/memeli alerjeniyle karıştırılmamalı).
const coconutMilkResult = classifyAllergenTags(['en:hindistan cevizi sütü']);
assert.deepEqual(coconutMilkResult.mapped, []);
assert.deepEqual(coconutMilkResult.unmapped, ['en:hindistan cevizi sütü']);

// Zaten tanınan kanonik etiketler (bucket A/B) TR eş anlamlı tablosundan ETKİLENMEMELİ.
const knownCanonicalResult = classifyAllergenTags(['en:milk', 'en:celery']);
assert.deepEqual(knownCanonicalResult.mapped, ['milk']);
assert.deepEqual(knownCanonicalResult.recognizedUnmodeled, ['en:celery']);
assert.deepEqual(knownCanonicalResult.unmapped, []);

console.log(`offAllergenMap TR eş anlamlı smoke: ${CASES.length + 2} senaryo geçti`);
