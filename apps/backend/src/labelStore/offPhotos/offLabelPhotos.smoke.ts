/**
 * RafSkoru — OFF etiket fotoğrafı seçimi (İş 1.4c)
 * apps/backend/src/labelStore/offPhotos/offLabelPhotos.smoke.ts
 *
 * Ağ çağrısı yapmaz; OFF yanıt biçimini taklit eden sabit veriyle çalışır.
 * Korunan kurallar: tam boy seçili fotoğraf kullanılır, Türkçe fotoğraf
 * önceliklidir, beklenmeyen adres tahminle düzeltilmez, iletişim adresi
 * zorunludur, atıf her fotoğrafta vardır.
 */
import assert from 'node:assert/strict';

import {
  buildOffLabelSearchUrl,
  buildOffUserAgent,
  extractSelectedPhotos,
  localPhotoFileName,
  observedAtFor,
  offImageFolder,
  offPhotoAttribution,
  toFullSizeUrl,
} from './offLabelPhotos.js';

const BASE = 'https://images.openfoodfacts.org/images/products/869/123/456/7890';

// ── Arama adresi ─────────────────────────────────────────────────────────
{
  const url = new URL(buildOffLabelSearchUrl(50));
  assert.equal(url.origin + url.pathname, 'https://world.openfoodfacts.org/api/v2/search');
  assert.equal(url.searchParams.get('countries_tags_en'), 'turkey');
  assert.equal(url.searchParams.get('states_tags'), 'en:ingredients-to-be-completed,en:ingredients-photo-selected');
  assert.equal(url.searchParams.get('page_size'), '50');
  assert.ok(url.searchParams.get('fields')!.includes('selected_images'));
}

// ── Tam boy adres ────────────────────────────────────────────────────────
assert.equal(toFullSizeUrl(`${BASE}/ingredients_tr.12.400.jpg`), `${BASE}/ingredients_tr.12.full.jpg`);
assert.equal(toFullSizeUrl(`${BASE}/nutrition_en.3.200.jpg`), `${BASE}/nutrition_en.3.full.jpg`);
assert.equal(toFullSizeUrl(`${BASE}/ingredients_tr.12.full.jpg`), `${BASE}/ingredients_tr.12.full.jpg`);
assert.equal(toFullSizeUrl('https://example.com/ingredients_tr.12.400.jpg'), null, 'başka alan adı kabul edilmemeli');
assert.equal(toFullSizeUrl(`${BASE}/1.400.jpg`), null, 'seçili olmayan ham fotoğraf beklenmiyor');

// ── Klasör kuralı ────────────────────────────────────────────────────────
assert.equal(offImageFolder('8690793020068'), '869/079/302/0068');
assert.equal(offImageFolder('12345678'), '12345678', '8 hane bölünmez');
assert.equal(offImageFolder('123456789012'), '012/345/678/9012', '13 haneye sıfırla tamamlanır');
assert.equal(offImageFolder('abc'), null);

// ── Gerçek yanıt biçimi (2026-11-18): içindekiler yalnız images alanında ──
{
  const photos = extractSelectedPhotos({
    code: '8690793020068',
    selected_images: {
      front: { display: { tr: 'https://images.openfoodfacts.org/images/products/869/079/302/0068/front_tr.3.400.jpg' } },
    },
    images: {
      '1': { sizes: { full: { h: 4000, w: 3000 } }, uploaded_t: 1714074557 },
      '2': { sizes: { full: { h: 4000, w: 3000 } }, uploaded_t: 1752061452 },
      front_tr: { imgid: '1', rev: '3', sizes: { full: { h: 4000, w: 3000 } } },
      ingredients_tr: { imgid: '2', rev: '5', sizes: { '400': { h: 400, w: 300 }, full: { h: 4000, w: 3000 } } },
      ingredients_en: { imgid: '2', rev: '4', sizes: { full: { h: 4000, w: 3000 } } },
    },
  });
  assert.deepEqual(
    photos.map((photo) => [photo.slot, photo.lang, photo.url, photo.uploadedAt]),
    [[
      'ingredients',
      'tr',
      'https://images.openfoodfacts.org/images/products/869/079/302/0068/ingredients_tr.5.full.jpg',
      new Date(1752061452 * 1000).toISOString(),
    ]],
    'images alanındaki seçili Türkçe içindekiler fotoğrafı tam boy olarak bulunmalı',
  );
}

// Tam boyu olmayan veya revizyonu bozuk kayıt atlanır.
assert.deepEqual(
  extractSelectedPhotos({ code: '8690793020068', images: { ingredients_tr: { imgid: '2', rev: '5', sizes: { '400': {} } } } }),
  [],
);
assert.deepEqual(
  extractSelectedPhotos({ code: '8690793020068', images: { ingredients_tr: { imgid: '2', rev: 'x', sizes: { full: {} } } } }),
  [],
);

// ── Yedek: selected_images ───────────────────────────────────────────────
{
  const photos = extractSelectedPhotos({
    code: '8691234567890',
    selected_images: {
      front: { display: { tr: `${BASE}/front_tr.5.400.jpg` } },
      ingredients: { display: { en: `${BASE}/ingredients_en.4.400.jpg`, tr: `${BASE}/ingredients_tr.12.400.jpg` } },
      nutrition: { display: { en: `${BASE}/nutrition_en.3.400.jpg` } },
    },
    images: {
      ingredients_tr: { imgid: '7', rev: '12' },
      '7': { uploaded_t: 1767225600 },
      nutrition_en: { imgid: 9 },
      '9': { uploaded_t: 1767312000 },
    },
  });

  assert.deepEqual(
    photos.map((photo) => [photo.slot, photo.lang, photo.url]),
    [
      ['ingredients', 'tr', `${BASE}/ingredients_tr.12.full.jpg`],
      ['nutrition', 'en', `${BASE}/nutrition_en.3.full.jpg`],
    ],
    'ön yüz istenmez; Türkçe içindekiler önceliklidir; tam boy kullanılır',
  );
  assert.equal(photos[0]!.uploadedAt, new Date(1767225600 * 1000).toISOString());
  assert.equal(observedAtFor(photos, 1700000000), new Date(1767312000 * 1000).toISOString(), 'en yeni fotoğrafın yüklenme anı');
  assert.equal(localPhotoFileName(photos[0]!), 'ingredients-tr.12.jpg');
}

assert.deepEqual(extractSelectedPhotos({ code: '1' }), [], 'seçili fotoğraf yoksa boş');
assert.deepEqual(
  extractSelectedPhotos({ selected_images: { ingredients: { display: { tr: 'https://example.com/x.jpg' } } } }),
  [],
  'beklenmeyen adres atlanmalı',
);
assert.equal(observedAtFor([], 1700000000), new Date(1700000000 * 1000).toISOString(), 'yükleme anı yoksa son değişiklik');
assert.equal(observedAtFor([], undefined), null);

// ── Atıf ve kimlik ───────────────────────────────────────────────────────
assert.equal(
  offPhotoAttribution('8691234567890'),
  'Open Food Facts katkıcıları — CC BY-SA — https://world.openfoodfacts.org/product/8691234567890',
);
assert.equal(buildOffUserAgent('iletisim@rafskoru.com.tr'), 'RafSkoru/0.3 (etiket okuma pilotu; iletisim@rafskoru.com.tr)');
assert.throws(() => buildOffUserAgent(''), /iletişim/);
assert.throws(() => buildOffUserAgent('adres-yok'), /iletişim/);

console.log('OFF_LABEL_PHOTOS_SMOKE_OK');
