/**
 * RafSkoru — Ürün sayfası sekme çubuğu regresyon koruması (device test 30
 * Eylül, D-tabbar)
 * src/navigation/productResultTabGuard.smoke.ts
 *
 * Commit 0ea51e2, product-result.tsx'i kök Stack'ten (tabs) grubuna taşıyıp
 * `href: null` ile ekleyerek alt sekme çubuğunun ürün sayfasında görünür
 * kalmasını sağladı (480ec1a ile cihazda doğrulandı). Bu betik, hiçbir
 * simülatör/cihaz olmadan gelecekte bu taşımanın sessizce bozulmasına karşı
 * statik bir koruma sağlar: dosya konumunu, Tabs.Screen ayarını ve tüm
 * bilinen çağrı noktalarının doğru yola gittiğini metin düzeyinde denetler.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '../..');

function readMobileFile(relativePath: string): string {
  return readFileSync(resolve(mobileRoot, relativePath), 'utf8');
}

// ── product-result.tsx yalnızca (tabs) grubunda bulunmalı ────────────────
assert.ok(
  existsSync(resolve(mobileRoot, 'app/(tabs)/product-result.tsx')),
  'product-result.tsx (tabs) grubunda olmalı — alt sekme çubuğu ancak böyle görünür kalır',
);
assert.ok(
  !existsSync(resolve(mobileRoot, 'app/product-result.tsx')),
  'product-result.tsx kök Stack seviyesinde (app/ doğrudan altında) OLMAMALI — bu eski hataya geri döner (sekme çubuğu kaybolur)',
);

// ── (tabs)/_layout.tsx: product-result için href:null Tabs.Screen ───────
const layout = readMobileFile('app/(tabs)/_layout.tsx');
const productResultScreenMatch = layout.match(
  /<Tabs\.Screen\s+name="product-result"[\s\S]*?\/>/,
);
assert.ok(productResultScreenMatch, '(tabs)/_layout.tsx içinde name="product-result" olan bir Tabs.Screen bulunmalı');
assert.ok(
  /href:\s*null/.test(productResultScreenMatch![0]),
  'product-result ekranı href:null olmalı — aksi halde sekme çubuğunda görünür olur ya da Tabs navigatöründen çıkarılmış olur',
);

// ── Bilinen tüm çağrı noktaları /product-result yoluna gitmeli ───────────
const callSites: { file: string; mustMatch: RegExp }[] = [
  { file: 'app/(tabs)/search.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/(tabs)/index.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/barcode-scan.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/photo-search.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/product-group.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'src/features/basket/ScoreTab.tsx', mustMatch: /['"]\/product-result['"]/ },
];

for (const { file, mustMatch } of callSites) {
  const content = readMobileFile(file);
  assert.ok(mustMatch.test(content), `${file} /product-result yoluna gitmeli (aksi halde (tabs) grubu dışında açılıp sekme çubuğunu kaybedebilir)`);
}

console.log('PRODUCT_RESULT_TAB_GUARD_SMOKE_OK');
