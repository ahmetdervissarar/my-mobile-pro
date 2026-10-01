/**
 * RafSkoru — Ürün sayfası katlanır bölümleri varsayılan KAPALI testi
 * src/navigation/productResultCollapsedSectionsGuard.smoke.ts
 *
 * Katmanlı sadeleştirme (onaylı plan): İçindekiler, Besin değerleri, Dikkat
 * edilecekler, Veri kaynağı ve güven, Fiyat, Alternatifler — hepsi kapalı
 * başlamalı. RN render ortamı olmadığından (bu oturumda simülatör yok)
 * React state'i gerçek açma/kapamayla test edilemez; bu statik koruma,
 * (1) CollapsibleSection'ın varsayılanının `false` kaldığını ve (2) ürün
 * sayfasındaki HİÇBİR çağrının bunu `true`'ya override ETMEDİĞİNİ doğrular.
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

const collapsibleSection = readMobileFile('src/ui/CollapsibleSection.tsx');
assert.ok(
  /defaultOpen\s*=\s*false/.test(collapsibleSection),
  'CollapsibleSection varsayılan olarak kapalı (defaultOpen = false) olmalı',
);

const productResult = readMobileFile('app/(tabs)/product-result.tsx');
const sectionOpenings = productResult.match(/<CollapsibleSection\b/g) ?? [];

assert.equal(sectionOpenings.length, 6, 'ürün sayfasında tam olarak 6 katlanır bölüm olmalı');
assert.ok(
  !/<CollapsibleSection[^>]*defaultOpen/.test(productResult),
  'hiçbir ürün sayfası bölümü defaultOpen ile varsayılanı override ETMEMELİ (hepsi kapalı başlamalı)',
);

// Onaylı plan düzeltmesi 2: alerjen ayrıntısı TEK yerde (AllergenDetailSheet,
// modal) — sayfa içinde AYRI bir "Alerjen ayrıntısı" katlanır bölümü OLMAMALI.
assert.ok(
  !productResult.includes('"Alerjen ayrıntısı"'),
  'sayfa içinde ayrı bir "Alerjen ayrıntısı" katlanır bölümü OLMAMALI — tek yer AllergenDetailSheet',
);

const expectedTitles = [
  'İçindekiler',
  'Besin değerleri',
  'Dikkat edilecekler',
  'Veri kaynağı ve güven',
  'Fiyat',
  'Alternatifler',
];
for (const title of expectedTitles) {
  assert.ok(productResult.includes(`"${title}"`), `"${title}" katlanır bölümü sayfada olmalı`);
}

// Onaylı plan düzeltmesi 1: ProductHero ÖNCE, AllergenStatusRow HEMEN ALTINDA.
const heroIndex = productResult.indexOf('<ProductHero');
const allergenRowIndex = productResult.indexOf('<AllergenStatusRow');
assert.ok(heroIndex !== -1 && allergenRowIndex !== -1, 'ProductHero ve AllergenStatusRow ikisi de sayfada olmalı');
assert.ok(heroIndex < allergenRowIndex, 'ProductHero, AllergenStatusRow\'dan ÖNCE gelmeli (kullanıcı önce ürünü görsün)');

console.log('PRODUCT_RESULT_COLLAPSED_SECTIONS_GUARD_SMOKE_OK');
