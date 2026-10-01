/**
 * RafSkoru — Sabit üst başlık çubuğu regresyon koruması (cihaz testi 1 Ekim,
 * madde 3)
 * src/navigation/fixedHeaderBarGuard.smoke.ts
 *
 * Ürün sayfasında geri düğmesi önceden ScrollView'in İÇİNDEYDİ — kaydırınca
 * kayboluyordu. FixedHeaderBar artık ScrollView'in DIŞINDA, sabit bir
 * kardeş öğe olarak render edilir. RN render ortamı olmadığından bu statik
 * koruma, her ekranda <FixedHeaderBar ...>'ın <ScrollView İÇİNDE değil,
 * ÖNCESİNDE geçtiğini metin düzeyinde doğrular.
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

const SCREENS = ['app/(tabs)/product-group.tsx', 'app/(tabs)/product-contribution.tsx'];

for (const screen of SCREENS) {
  const content = readMobileFile(screen);
  const headerIndex = content.indexOf('<FixedHeaderBar');
  const scrollIndex = content.indexOf('<ScrollView');

  assert.ok(headerIndex !== -1, `${screen} <FixedHeaderBar> kullanmalı`);
  assert.ok(scrollIndex !== -1, `${screen} <ScrollView> kullanmalı`);
  assert.ok(
    headerIndex < scrollIndex,
    `${screen}: <FixedHeaderBar> <ScrollView>'DAN ÖNCE (dışında, sabit kardeş öğe olarak) render edilmeli`,
  );
}

// product-result.tsx: iki dönüş dalı da (isUnknownProduct + normal) kendi
// <ScrollView>'inden önce bir <FixedHeaderBar> içermeli.
const productResult = readMobileFile('app/(tabs)/product-result.tsx');
const headerMatches = productResult.match(/<FixedHeaderBar\b/g) ?? [];
const scrollMatches = [...productResult.matchAll(/<ScrollView\b/g)];

assert.equal(headerMatches.length, 2, 'product-result.tsx iki dönüş dalında da (bilinmeyen ürün + normal) bir FixedHeaderBar olmalı');
assert.equal(scrollMatches.length, 2, 'product-result.tsx iki ScrollView dönüşü olmalı');

for (const scrollMatch of scrollMatches) {
  const precedingContent = productResult.slice(0, scrollMatch.index);
  assert.ok(
    precedingContent.includes('<FixedHeaderBar'),
    'her ScrollView dönüşünden ÖNCE bir FixedHeaderBar gelmeli (sabit kalması için ScrollView İÇİNDE DEĞİL)',
  );
}

// Eski, kaydırılan geri düğmesi bileşeni geri gelmemeli.
assert.ok(!productResult.includes('ProductResultBackButton'), 'eski ProductResultBackButton (ScrollView içinde kaydırılan) kullanılmamalı — yerini FixedHeaderBar aldı');

console.log('FIXED_HEADER_BAR_GUARD_SMOKE_OK');
