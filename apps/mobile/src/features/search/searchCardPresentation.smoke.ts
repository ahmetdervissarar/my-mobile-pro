import assert from 'node:assert/strict';

import { getSearchCardBadge, getSearchCardMetaLine } from './searchCardPresentation';

// ── Satır 2: marka · miktar (fiyat arama ucunda yok — segment hiç yazılmaz,
// bkz. cihaz testi 1 Ekim madde 3) ──────────────────────────────────────────
assert.equal(
  getSearchCardMetaLine({ brand: 'Dost', packageSize: { amount: 1000, unit: 'ml' } }),
  'Dost · 1000 ml',
);
assert.equal(getSearchCardMetaLine({}), null, 'hiçbir alan yoksa satır tamamen boş (null) olmalı — "Fiyat: Veri yok" YAZILMAMALI');
assert.equal(
  getSearchCardMetaLine({ brand: 'Dost', packageSize: { amount: 1000, unit: 'ml' }, duplicateBarcodeSuffix: '… 2021' }),
  'Dost · 1000 ml · … 2021',
);
assert.ok(
  !getSearchCardMetaLine({ brand: 'Dost' })!.toLocaleLowerCase('tr-TR').includes('fiyat'),
  'satırda "Fiyat" kelimesi hiç geçmemeli',
);

// ── Satır 3: çakışma varsa alerjen rozeti ──────────────────────────────────
assert.deepEqual(getSearchCardBadge({ tone: 'danger', text: 'Profilinle çakışıyor: Süt' }), {
  isAllergenBadge: true,
  text: 'Profilinle çakışıyor: Süt',
});

// ── Satır 3: çakışma yoksa puan rozeti (arama ucu puan döndürmez → "Veri yok") ─
assert.deepEqual(getSearchCardBadge({ tone: 'neutral', text: 'Beyanda: Süt' }), {
  isAllergenBadge: false,
  text: 'Puan: Veri yok',
});
assert.deepEqual(getSearchCardBadge({ tone: 'caution', text: 'Alerjen verisi yok — etiketi kontrol edin' }), {
  isAllergenBadge: false,
  text: 'Puan: Veri yok',
});

console.log('SEARCH_CARD_PRESENTATION_SMOKE_OK');
