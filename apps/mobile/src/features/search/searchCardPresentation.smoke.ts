import assert from 'node:assert/strict';

import type { RafScoreResult } from '../../price/types';
import { getSearchCardBadge, getSearchCardMetaLine } from './searchCardPresentation';

const BASE_WEIGHTS = { price: 35, health: 30, content: 20, sustainability: 15 };

function buildRafScore(score: number | null, priceAvailable: boolean): RafScoreResult {
  return {
    score,
    status: score === null ? 'unavailable' : 'partial',
    confidence: 'medium',
    weights: BASE_WEIGHTS,
    components: [
      { key: 'price', label: 'Fiyat', score: null, weight: 35, isAvailable: priceAvailable },
      { key: 'health', label: 'Sağlık', score: 80, weight: 30, isAvailable: true },
      { key: 'content', label: 'İçerik/Alerjen', score: 70, weight: 20, isAvailable: true },
      { key: 'sustainability', label: 'Sürdürülebilirlik', score: 50, weight: 15, isAvailable: true },
    ],
    explanations: [],
    disclaimer: '',
  };
}

// ── Satır 2: marka · miktar (fiyat arama ucunda yok — segment hiç yazılmaz,
// bkz. cihaz testi 1 Ekim madde 3) ──────────────────────────────────────────
assert.equal(
  getSearchCardMetaLine({ brand: 'Dost', packageSize: { amount: 1000, unit: 'ml' } }),
  'Dost · 1000 ml',
);
assert.equal(getSearchCardMetaLine({}), null, 'hiçbir alan yoksa satır tamamen boş (null) olmalı — "Fiyat: Veri yok" YAZILMAMALI');
assert.ok(
  !getSearchCardMetaLine({ brand: 'Dost' })!.toLocaleLowerCase('tr-TR').includes('fiyat'),
  'satırda "Fiyat" kelimesi hiç geçmemeli',
);

// ── Satır 3: çakışma varsa alerjen rozeti ──────────────────────────────────
assert.deepEqual(getSearchCardBadge({ tone: 'danger', text: 'Profilinle çakışıyor: Süt' }), {
  isAllergenBadge: true,
  text: 'Profilinle çakışıyor: Süt',
});

// ── Satır 3: çakışma yoksa puan rozeti; rafScore yoksa "Veri yok" ─────────
assert.deepEqual(getSearchCardBadge({ tone: 'neutral', text: 'Beyanda: Süt' }), {
  isAllergenBadge: false,
  text: 'Puan: Veri yok',
});
assert.deepEqual(getSearchCardBadge({ tone: 'caution', text: 'Alerjen verisi yok — etiketi kontrol edin' }), {
  isAllergenBadge: false,
  text: 'Puan: Veri yok',
});

// ── Madde 4 (cihaz testi 1 Ekim): rafScore doluysa liste puanı ürün
// sayfasıyla AYNI biçimlendirmeyi kullanır — fiyat eksikse "Puan (fiyatsız)". ─
const pricelessBadge = getSearchCardBadge({ tone: 'neutral', text: 'Beyanda yok' }, buildRafScore(72, false));
assert.deepEqual(pricelessBadge, { isAllergenBadge: false, text: 'Puan (fiyatsız): 72' });

// ── Alerjen çakışması, puandan HER ZAMAN önceliklidir — rafScore dolu olsa
// bile puan yerine alerjen rozeti gösterilir (P2 invariant). ───────────────
const conflictWithScore = getSearchCardBadge(
  { tone: 'danger', text: 'Profilinle çakışıyor: Süt' },
  buildRafScore(72, false),
);
assert.deepEqual(conflictWithScore, { isAllergenBadge: true, text: 'Profilinle çakışıyor: Süt' });

console.log('SEARCH_CARD_PRESENTATION_SMOKE_OK');
