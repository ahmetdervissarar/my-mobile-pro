/**
 * RafSkoru — Etiket okumalarının karşılaştırılması ve içe aktarılması (İş 1.4)
 * apps/backend/src/labelStore/importReads.smoke.ts
 *
 * Korunan kurallar:
 *   - yalnız yazım biçimi farkı (harf, boşluk, sondaki nokta) fark sayılmaz;
 *     içerik, sayı ve "okundu / okunamadı" farkı her zaman farktır
 *   - fotoğrafı çekilmemiş bölümden değer taşıyan okuma reddedilir
 *   - içe aktarma onay vermez; aday doğrulanmış kayıt gibi görünmez
 *   - aynı fotoğraf kümesi ikinci kez alınmaz; hata yarım aday bırakmaz
 */
import assert from 'node:assert/strict';

import { compareLabelReads, normalizeLabelText } from './compareReads.js';
import {
  __resetLabelStoreDbForTesting,
  getCurrentVerified,
  LabelStoreValidationError,
  listCandidatesForBarcode,
} from './db.js';
import { importLabelReads, type LabelReadImport } from './importReads.js';
import type { LabelFields, LabelRead } from './types.js';

__resetLabelStoreDbForTesting(':memory:');

const BARCODE = '8691004000022';

const fields: LabelFields = {
  productName: 'Elma Suyu',
  brand: 'Örnek',
  quantityText: '1 L',
  ingredientsText: 'Elma suyu konsantresi, su, antioksidan (askorbik asit).',
  ingredientsLang: 'tr',
  allergenStatementText: null,
  traceStatementText: null,
  nutritionPer100: {
    basis: '100ml',
    energyKcal: 46,
    fat: 0,
    saturatedFat: 0,
    carbohydrates: 11,
    sugars: 10.5,
    fiber: null,
    protein: 0.1,
    salt: 0.01,
  },
};

function read(overrides: Partial<LabelFields> = {}, unreadableFields: string[] = []): LabelRead {
  return {
    reader: 'desktop_session',
    model: 'label-reader',
    readAt: '2026-11-18T10:00:00.000Z',
    fields: { ...fields, ...overrides },
    unreadableFields,
  };
}

const allPhotos = [
  { slot: 'front' as const, ref: 'photos/a-front.jpg', attribution: null },
  { slot: 'ingredients' as const, ref: 'photos/a-ingredients.jpg', attribution: null },
  { slot: 'nutrition' as const, ref: 'photos/a-nutrition.jpg', attribution: null },
];

function input(overrides: Partial<LabelReadImport> = {}): LabelReadImport {
  return {
    barcode: BARCODE,
    photoSource: 'intake',
    photos: allPhotos,
    observedAt: '2026-11-10T09:30:00.000Z',
    declaredProductKind: 'beverage',
    extractRead: read(),
    verifyRead: read(),
    ...overrides,
  };
}

// ── Metin karşılaştırma: yalnız yazım biçimi ─────────────────────────────
assert.equal(normalizeLabelText('Elma Suyu Konsantresi, Su.'), normalizeLabelText('elma suyu konsantresi,su'));
assert.equal(normalizeLabelText('antioksidan ( askorbik asit )'), normalizeLabelText('antioksidan (askorbik asit)'));
assert.equal(normalizeLabelText('SÜT  TOZU'), normalizeLabelText('süt tozu'));
assert.notEqual(normalizeLabelText('süt tozu'), normalizeLabelText('süt'), 'eksik kelime fark sayılmalı');
assert.notEqual(normalizeLabelText('fındık'), normalizeLabelText('fistik'), 'Türkçe harf farkı içerik farkıdır');
assert.notEqual(normalizeLabelText('%3'), normalizeLabelText('%3,5'));

// ── Okuma karşılaştırma ─────────────────────────────────────────────────
assert.deepEqual(compareLabelReads(read(), read()), []);
assert.deepEqual(
  compareLabelReads(read(), read({ ingredientsText: 'elma suyu konsantresi,su,antioksidan(askorbik asit)' })),
  [],
  'yalnız boşluk/harf/sondaki nokta farkı ayrışma sayılmamalı',
);
assert.deepEqual(compareLabelReads(read(), read({ ingredientsText: 'Elma suyu konsantresi, su.' })), ['ingredientsText']);
assert.deepEqual(compareLabelReads(read(), read({ ingredientsText: null }, ['ingredientsText'])), ['ingredientsText'], 'okundu/okunamadı farkı ayrışmadır');
assert.deepEqual(compareLabelReads(read(), read({ traceStatementText: 'Eser miktarda süt içerebilir.' })), ['traceStatementText']);
// İş 1.5c: büyük "I" Türkçe ve Latin yazımda farklı küçülür; yalnız harf büyüklüğü farkıdır.
assert.deepEqual(compareLabelReads(read({ brand: 'PEPSI' }), read({ brand: 'Pepsi' })), [], 'Latin marka: PEPSI = Pepsi');
assert.deepEqual(compareLabelReads(read({ brand: 'FINDIK' }), read({ brand: 'Fındık' })), [], 'Türkçe: FINDIK = Fındık');
assert.deepEqual(compareLabelReads(read({ brand: 'fındık' }), read({ brand: 'findik' })), ['brand'], 'ı/i farkı içerik farkı kalmalı');
assert.deepEqual(
  compareLabelReads(read(), read({ nutritionPer100: { ...fields.nutritionPer100!, sugars: 10.6, salt: null } })),
  ['nutritionPer100.sugars', 'nutritionPer100.salt'],
  'sayılar birebir aynı olmalı',
);
assert.deepEqual(compareLabelReads(read(), read({ nutritionPer100: { ...fields.nutritionPer100!, basis: '100g' } })), ['nutritionPer100.basis']);
assert.deepEqual(compareLabelReads(read(), read({ nutritionPer100: null })), ['nutritionPer100']);

// ── İçe aktarma: uyuşan okumalar → agreed aday, onay yok ─────────────────
{
  const result = importLabelReads(input());
  assert.equal(result.status, 'imported');
  assert.equal(result.candidate.status, 'agreed');
  assert.deepEqual(result.candidate.differingFields, []);
  assert.equal(result.candidate.declaredProductKind, 'beverage');
  assert.equal(result.candidate.extractRead!.fields.ingredientsText, fields.ingredientsText);
  assert.equal(getCurrentVerified(BARCODE), null, 'içe aktarma onay vermemeli');

  const again = importLabelReads(input());
  assert.equal(again.status, 'duplicate', 'aynı fotoğraf kümesi ikinci kez alınmamalı');
  assert.equal(again.candidate.id, result.candidate.id);
  assert.equal(listCandidatesForBarcode(BARCODE).length, 1);

  const reordered = importLabelReads(input({ photos: [...allPhotos].reverse() }));
  assert.equal(reordered.status, 'duplicate', 'fotoğraf sırası farklı olsa da aynı küme sayılmalı');
}

// ── İçe aktarma: ayrışan okumalar → disagreed ────────────────────────────
{
  const result = importLabelReads(
    input({
      photos: allPhotos.map((photo) => ({ ...photo, ref: photo.ref.replace('a-', 'b-') })),
      verifyRead: read({ ingredientsText: 'Elma suyu konsantresi, su.' }),
    }),
  );
  assert.equal(result.candidate.status, 'disagreed');
  assert.deepEqual(result.candidate.differingFields, ['ingredientsText']);
}

// ── Fotoğrafı olmayan bölümden değer → ret, yarım aday kalmaz ────────────
{
  const before = listCandidatesForBarcode(BARCODE).length;
  const frontOnly = [{ slot: 'front' as const, ref: 'photos/c-front.jpg', attribution: null }];

  assert.throws(
    () => importLabelReads(input({ photos: frontOnly, extractRead: read({ ingredientsText: null, nutritionPer100: fields.nutritionPer100 }), verifyRead: read({ ingredientsText: null, nutritionPer100: null }) })),
    LabelStoreValidationError,
    'besin tablosu fotoğrafı yokken besin değeri reddedilmeli',
  );
  assert.throws(
    () => importLabelReads(input({ photos: frontOnly, extractRead: read({ nutritionPer100: null }), verifyRead: read({ ingredientsText: null, nutritionPer100: null }) })),
    LabelStoreValidationError,
    'içindekiler fotoğrafı yokken içindekiler reddedilmeli',
  );

  const onlyNameRead = read({ ingredientsText: null, ingredientsLang: null, nutritionPer100: null });
  const ok = importLabelReads(input({ photos: frontOnly, extractRead: onlyNameRead, verifyRead: onlyNameRead }));
  assert.equal(ok.candidate.status, 'agreed', 'yalnız ön yüzden okunan ad kabul edilmeli');

  // Doğrulama okuması biçim hatalıysa (boş metin) hiçbir şey yazılmaz.
  const countBeforeBroken = listCandidatesForBarcode(BARCODE).length;
  assert.throws(
    () =>
      importLabelReads(
        input({
          photos: allPhotos.map((photo) => ({ ...photo, ref: photo.ref.replace('a-', 'd-') })),
          verifyRead: read({ ingredientsText: '   ' }),
        }),
      ),
    LabelStoreValidationError,
  );
  assert.equal(listCandidatesForBarcode(BARCODE).length, countBeforeBroken, 'hatalı içe aktarma yarım aday bırakmamalı');
  assert.equal(countBeforeBroken, before + 1);
}

// ── Besin tablosu içindekiler fotoğrafındaysa kabul edilir (İş 1.5a) ──────
{
  const ingredientsOnly = [{ slot: 'ingredients' as const, ref: 'photos/f-ingredients.jpg', attribution: null }];
  const result = importLabelReads(input({ photos: ingredientsOnly }));
  assert.equal(result.status, 'imported', 'içindekiler fotoğrafındaki besin tablosu kabul edilmeli');
  assert.deepEqual(result.candidate.extractRead!.fields.nutritionPer100, fields.nutritionPer100);
}

// ── Okuyucu notu saklanır; barkod gibi fazladan alanlar atılır ──────────
{
  const withExtras = { ...read(), barcodeDigits: '8691004000022', notes: '  kenar kesik  ' } as unknown as LabelRead;
  const noNotes = { ...read(), notes: '   ' } as LabelRead;
  const result = importLabelReads(
    input({ photos: allPhotos.map((photo) => ({ ...photo, ref: photo.ref.replace('a-', 'e-') })), extractRead: withExtras, verifyRead: noNotes }),
  );
  assert.equal(result.candidate.extractRead!.notes, 'kenar kesik');
  assert.equal(result.candidate.verifyRead!.notes, null, 'boş not null olmalı');
  assert.equal('barcodeDigits' in result.candidate.extractRead!, false);
  assert.deepEqual(result.candidate.differingFields, [], 'not farkı ayrışma sayılmamalı');

  const tooLong = { ...read(), notes: 'x'.repeat(4001) } as LabelRead;
  assert.throws(
    () =>
      importLabelReads(
        input({ photos: allPhotos.map((photo) => ({ ...photo, ref: photo.ref.replace('a-', 'g-') })), extractRead: tooLong }),
      ),
    LabelStoreValidationError,
  );
}

console.log('LABEL_IMPORT_READS_SMOKE_OK');
