// openFoodFactsAdapter smoke — canlı OFF yolunda alerjen kapısının katalog
// yoluyla AYNI sınıflandırmayı ürettiğini kanıtlar (P0-1, feat/v2-catalog).
import assert from 'node:assert/strict';

import { openFoodFactsInfoToProductFacts } from './openFoodFactsAdapter.js';

// Kısmi canlı OFF verisi: içindekiler var, Nutri-Score YOK, süt beyanı var.
const facts = openFoodFactsInfoToProductFacts({
  barcode: '8690000000123',
  productName: 'Test Süt Ürünü',
  ingredientsText: 'süt, şeker, aroma verici',
  allergens: ['milk'],
  rawAllergenTags: ['en:milk'],
  traceAllergens: null,
  rawTraceAllergenTags: null,
  nutriScore: null,
  novaGroup: null,
});

// Ürün hâlâ "kısmi" (Nutri-Score eksik) — isComplete bunu doğru yansıtmalı.
assert.equal(facts.isComplete, false, 'nutriScore eksikken isComplete=false kalmalı');
assert.ok(facts.missingFields?.includes('nutriScoreGrade'));

// Ama alerjen kapısı KISMİ olmaktan etkilenmemeli: süt beyanı katalog
// yoluyla AYNI CatalogAllergenData şeklinde, 'present' dataStatus'üyle geliyor.
assert.ok(facts.catalogAllergenData, 'canlı OFF yolu da catalogAllergenData üretmeli');
assert.deepEqual(facts.catalogAllergenData!.declared, ['milk']);
assert.equal(facts.catalogAllergenData!.dataStatus, 'present');
assert.equal(facts.catalogAllergenData!.ingredientsEvidence.text, 'süt, şeker, aroma verici');

// Ham etiketsiz (rawAllergenTags eksik/boş) durumda dataStatus 'present' OLMAMALI —
// kozmetik `allergens` dolu olsa bile sınıflandırma ham etiketten yapılmalı.
const factsWithoutRawTags = openFoodFactsInfoToProductFacts({
  barcode: '8690000000124',
  productName: 'Ham Etiketi Olmayan Ürün',
  ingredientsText: 'un, su, tuz',
  allergens: ['milk'],
  rawAllergenTags: null,
  traceAllergens: null,
  rawTraceAllergenTags: null,
  nutriScore: 'B',
  novaGroup: 1,
});
assert.equal(factsWithoutRawTags.catalogAllergenData!.dataStatus, 'unknown_or_unverified');
assert.deepEqual(factsWithoutRawTags.catalogAllergenData!.declared, []);

console.log('OPEN_FOOD_FACTS_ADAPTER_LIVE_ALLERGEN_SMOKE_OK');
