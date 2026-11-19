/**
 * RafSkoru — Onaylı etiketin çözümleme yoluna bağlanması (ADR-009 §1, İş 1.3b)
 * apps/backend/src/price/productFacts/verifiedLabelResolver.smoke.ts
 *
 * Korunan kurallar:
 *   - depo hazır değilse veya onaylı kayıt yoksa taban AYNEN döner
 *   - onaylanmamış aday kayıt çözümleme yoluna ASLA girmez
 *   - OFF'ta olmayan üründe onaylı kayıt tek başına kullanılır; alerjen
 *     verisi "bilinmiyor" kalır
 *   - OFF tabanında alerjen sınıflandırması değişmez; yalnız kanıt metni
 *     onaylı içindekilerle tamamlanır
 *   - canlı OFF isteği başarısız olsa da onaylı kayıtla devam edilir
 *   - çelişki günlüğe yazılır; ham barkod yazılmaz
 */
import assert from 'node:assert/strict';

import {
  __resetLabelStoreDbForTesting,
  approveCandidate,
  createCandidate,
  isLabelStoreDbReady,
  recordExtraction,
  recordVerification,
} from '../../labelStore/db.js';
import type { LabelFields, LabelProductKind, LabelRead } from '../../labelStore/types.js';
import { PriceProviderService } from '../priceProviderService.js';
import type { ProductFacts } from './types.js';
import { applyVerifiedLabel } from './verifiedLabelResolver.js';

function ean13(first12: string): string {
  const sum = first12
    .split('')
    .map(Number)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return first12 + String((10 - (sum % 10)) % 10);
}

const emptyFields: LabelFields = {
  productName: null,
  brand: null,
  quantityText: null,
  ingredientsText: null,
  ingredientsLang: null,
  allergenStatementText: null,
  traceStatementText: null,
  nutritionPer100: null,
};

function read(fields: LabelFields): LabelRead {
  return { reader: 'desktop_session', model: null, readAt: '2026-11-14T12:00:00.000Z', fields, unreadableFields: [] };
}

function addCandidate(barcode: string, fields: Partial<LabelFields>, approve: boolean, kind?: LabelProductKind): void {
  const full = { ...emptyFields, ...fields };
  const candidate = createCandidate({
    barcode,
    photoSource: 'intake',
    photos: [{ slot: 'ingredients', ref: 'photos/x.jpg', attribution: null }],
    observedAt: '2026-11-10T09:30:00.000Z',
  });
  recordExtraction(candidate.id, read(full));
  recordVerification(candidate.id, read(full), []);
  if (approve) approveCandidate(candidate.id, { approvedBy: 'proje-sahibi', ...(kind ? { productKind: kind } : {}) });
}

function offFacts(barcode: string, overrides: Partial<ProductFacts> = {}): ProductFacts {
  return {
    barcode,
    productName: 'Bisküvi',
    imageUrl: null,
    nutriScoreGrade: null,
    novaGroup: null,
    trafficLight: null,
    ingredientsText: null,
    allergens: ['milk'],
    traceAllergens: [],
    allergenInfo: { dataStatus: 'present', declaredAllergens: ['milk'], traceAllergens: [], source: 'off_structured' },
    catalogAllergenData: {
      declared: ['milk'],
      traces: [],
      recognizedUnmodeled: [],
      rawUnmapped: [],
      dataStatus: 'present',
      ingredientsEvidence: { text: null, lang: null, source: 'off' },
    },
    dataSource: 'off',
    isComplete: false,
    missingFields: ['imageUrl', 'ingredientsText', 'nutriScoreGrade'],
    confidence: 'medium',
    sourceUrl: null,
    observedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

const BARCODE_A = ean13('869000000100');

// ── Depo hazır değil → taban aynen döner ─────────────────────────────────
{
  assert.equal(isLabelStoreDbReady(), false, 'bu test depo başlatılmadan başlamalı');
  const base = offFacts(BARCODE_A);
  assert.equal(applyVerifiedLabel(BARCODE_A, base), base);
  assert.equal(applyVerifiedLabel(BARCODE_A, null), null);
}

__resetLabelStoreDbForTesting(':memory:');

// ── Onaylı kayıt yok → taban aynen döner ─────────────────────────────────
{
  const base = offFacts(BARCODE_A);
  assert.equal(applyVerifiedLabel(BARCODE_A, base), base);
  assert.equal(applyVerifiedLabel(BARCODE_A, null), null);
}

// ── Onaylanmamış aday çözümleme yoluna girmez ────────────────────────────
{
  addCandidate(BARCODE_A, { ingredientsText: 'Buğday unu, şeker' }, false);
  const base = offFacts(BARCODE_A);
  assert.equal(applyVerifiedLabel(BARCODE_A, base), base, 'uyuşmuş ama onaylanmamış aday tabanı değiştirmemeli');
  assert.equal(applyVerifiedLabel(BARCODE_A, null), null, 'onaylanmamış aday tek başına ürün verisi üretmemeli');
}

// ── Onaylı kayıt + OFF tabanı → birleştirme ──────────────────────────────
{
  addCandidate(BARCODE_A, { ingredientsText: 'Buğday unu, şeker, süt tozu', ingredientsLang: 'tr' }, true);
  const base = offFacts(BARCODE_A);
  const merged = applyVerifiedLabel(BARCODE_A, base)!;

  assert.notEqual(merged, base);
  assert.equal(merged.dataSource, 'off');
  assert.equal(merged.ingredientsText, 'Buğday unu, şeker, süt tozu');
  assert.equal(merged.fieldSources?.ingredientsText?.source, 'rafskoru_verified');
  assert.deepEqual(merged.allergenInfo, base.allergenInfo, 'alerjen beyanı değişmemeli');
  assert.deepEqual(merged.catalogAllergenData?.declared, ['milk']);
  assert.equal(merged.catalogAllergenData?.dataStatus, 'present');
  assert.deepEqual(
    merged.catalogAllergenData?.ingredientsEvidence,
    { text: 'Buğday unu, şeker, süt tozu', lang: 'tr', source: 'rafskoru_verified' },
    'alerjen satırının kanıt metni onaylı içindekilerle aynı olmalı',
  );

  // OFF dışı taban birleştirilmez.
  const inferred = offFacts(BARCODE_A, { dataSource: 'beta_inference' });
  assert.equal(applyVerifiedLabel(BARCODE_A, inferred), inferred);
}

// ── Onaylı kayıt, OFF yok → tek başına; alerjen verisi bilinmiyor ────────
{
  const only = applyVerifiedLabel(BARCODE_A, null)!;
  assert.equal(only.dataSource, 'rafskoru_verified');
  assert.equal(only.ingredientsText, 'Buğday unu, şeker, süt tozu');
  assert.equal(only.allergenInfo?.dataStatus, 'unknown');
  assert.equal(only.catalogAllergenData, undefined);
  assert.equal(only.allergens, undefined);
}

// ── Çelişki günlüğe yazılır; ham barkod yazılmaz ─────────────────────────
{
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };
  try {
    const merged = applyVerifiedLabel(BARCODE_A, offFacts(BARCODE_A, { ingredientsText: 'Buğday unu' }))!;
    assert.equal(merged.ingredientsText, 'Buğday unu, şeker, süt tozu', 'daha yeni onaylı kayıt geçerli olmalı');
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1, 'çelişki sessiz kalmamalı');
  assert.ok(warnings[0]!.includes('alan=ingredientsText'));
  assert.ok(warnings[0]!.includes('geçerli=verified'));
  assert.ok(!warnings[0]!.includes(BARCODE_A), 'ham barkod günlüğe yazılmamalı');
  assert.ok(!warnings[0]!.includes('süt tozu'), 'alan değeri günlüğe yazılmamalı');
}

// ── Uçtan uca: PriceProviderService üzerinden (katalog boş, canlı OFF taklit)
const NOT_IN_OFF = ean13('869000000200');
const OFF_FETCH_FAILS = ean13('869000000300');
const OFF_PARTIAL = ean13('869000000400');
const NOWHERE = ean13('869000000500');
const NAME_ONLY = ean13('869000000600');
const OFF_CONFLICT = ean13('869000000700');

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
  const url = typeof input === 'string' ? input : input.toString();

  if (url.includes(OFF_FETCH_FAILS)) throw new Error('ağ hatası (test)');

  if (url.includes(OFF_PARTIAL)) {
    return new Response(
      JSON.stringify({
        status: 1,
        product: { product_name: 'Canlı OFF Bisküvi', allergens_tags: ['en:milk'], traces_tags: [] },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  if (url.includes(OFF_CONFLICT)) {
    return new Response(
      JSON.stringify({
        status: 1,
        product: { product_name: 'Canlı OFF Kraker', ingredients_text: 'Buğday unu, şeker', allergens_tags: [], traces_tags: [] },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ status: 0, status_verbose: 'product not found' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}) as typeof fetch;

try {
  const service = new PriceProviderService();
  const label = { productName: 'Yerel Bisküvi', ingredientsText: 'Buğday unu, şeker, yumurta' };
  addCandidate(NOT_IN_OFF, label, true);
  addCandidate(OFF_FETCH_FAILS, label, true);
  addCandidate(OFF_PARTIAL, { ingredientsText: 'Buğday unu, şeker, süt tozu' }, true);
  addCandidate(NAME_ONLY, { productName: 'Yalnız Adı Olan Ürün' }, true);

  // OFF'ta yok + onaylı kayıt var → ürün artık boş dönmez.
  {
    const facts = (await service.resolve({ barcode: NOT_IN_OFF })).result.productFacts;
    assert.ok(facts, "OFF'ta olmayan ama onaylı kaydı olan ürün productFacts döndürmeli");
    assert.equal(facts.dataSource, 'rafskoru_verified');
    assert.equal(facts.productName, 'Yerel Bisküvi');
    assert.equal(facts.ingredientsText, 'Buğday unu, şeker, yumurta');
    assert.equal(facts.allergenInfo?.dataStatus, 'unknown', 'alerjen verisi "bilinmiyor" kalmalı');
    assert.equal(facts.catalogAllergenData, undefined);
    assert.equal(facts.isComplete, false);
  }

  // Canlı OFF isteği başarısız + onaylı kayıt var → onaylı kayıtla devam.
  {
    const facts = (await service.resolve({ barcode: OFF_FETCH_FAILS })).result.productFacts;
    assert.ok(facts, 'OFF isteği başarısız olsa da onaylı kayıt kullanılmalı');
    assert.equal(facts.dataSource, 'rafskoru_verified');
  }

  // Canlı OFF kısmi + onaylı kayıt → birleştirme; alerjen sınıflandırması OFF'tan.
  {
    const facts = (await service.resolve({ barcode: OFF_PARTIAL })).result.productFacts;
    assert.ok(facts);
    assert.equal(facts.dataSource, 'off');
    assert.equal(facts.productName, 'Canlı OFF Bisküvi');
    assert.equal(facts.ingredientsText, 'Buğday unu, şeker, süt tozu');
    assert.equal(facts.fieldSources?.ingredientsText?.source, 'rafskoru_verified');
    assert.deepEqual(facts.catalogAllergenData?.declared, ['milk']);
    assert.equal(facts.catalogAllergenData?.dataStatus, 'present');
    assert.equal(facts.catalogAllergenData?.ingredientsEvidence.source, 'rafskoru_verified');
    assert.equal(facts.catalogAllergenData?.ingredientsEvidence.text, 'Buğday unu, şeker, süt tozu');
  }

  // ADR-009 §12, uçtan uca: canlı OFF metni daha yeni ve süt içermiyor, onaylı
  // metin süt içeriyor → ekranda OFF metni, alerjen kontrolünde İKİ metin; alan
  // JSON yanıtından (API serileştirmesi) da düşmemeli.
  {
    addCandidate(OFF_CONFLICT, { ingredientsText: 'Buğday unu, şeker, süt tozu' }, true);
    const resolution = JSON.parse(JSON.stringify(await service.resolve({ barcode: OFF_CONFLICT })));
    const facts = resolution.result.productFacts;
    assert.equal(facts.ingredientsText, 'Buğday unu, şeker', 'daha yeni OFF metni ekranda kalmalı');
    assert.ok(facts.allergenCheckIngredientsText.includes('süt tozu'), 'onaylı metindeki süt alerjen kontrolünden düşmemeli');
    assert.ok(facts.allergenCheckIngredientsText.includes('Buğday unu, şeker'));
    assert.equal(facts.catalogAllergenData.ingredientsEvidence.source, 'off_and_rafskoru_verified');
  }

  // Hiçbir yerde yok → eskisi gibi productFacts yok.
  assert.ok(!(await service.resolve({ barcode: NOWHERE })).result.productFacts);

  // Onaylı kayıtta yalnız ad var → anlamlı gıda verisi sayılmaz.
  assert.ok(
    !(await service.resolve({ barcode: NAME_ONLY })).result.productFacts,
    'içindekiler ve not içermeyen onaylı kayıt tek başına ürün verisi sayılmamalı',
  );

  console.log('VERIFIED_LABEL_RESOLVER_SMOKE_OK');
} finally {
  globalThis.fetch = originalFetch;
}
