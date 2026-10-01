/**
 * RafSkoru — Alt sekme çubuğu regresyon koruması (device test 30 Eylül/1
 * Ekim, D-tabbar / madde 2)
 * src/navigation/productResultTabGuard.smoke.ts
 *
 * Commit 0ea51e2, product-result.tsx'i kök Stack'ten (tabs) grubuna taşıyıp
 * `href: null` ile ekleyerek alt sekme çubuğunun ürün sayfasında görünür
 * kalmasını sağladı. Cihaz testi 1 Ekim, madde 2: aynı deseni 8 ekrana daha
 * (profil ekranları, barkod/fotoğraf tarama, ürün katkısı, ürün grubu, sepet
 * sonucu) uygulandı. Bu betik, hiçbir simülatör/cihaz olmadan bu taşımaların
 * sessizce bozulmasına karşı statik bir koruma sağlar.
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

const layout = readMobileFile('app/(tabs)/_layout.tsx');

// Alt sekme çubuğunda görünür kalması gereken, href:null olarak (tabs)
// grubuna taşınmış TÜM ekranlar (product-result dahil).
const TAB_SCREEN_NAMES = [
  'product-result',
  'barcode-scan',
  'photo-search',
  'basket-result',
  'product-contribution',
  'product-group',
  'profile-allergens',
  'profile-chronic',
  'profile-health-preferences',
];

for (const name of TAB_SCREEN_NAMES) {
  assert.ok(
    existsSync(resolve(mobileRoot, `app/(tabs)/${name}.tsx`)),
    `${name}.tsx (tabs) grubunda olmalı — alt sekme çubuğu ancak böyle görünür kalır`,
  );
  assert.ok(
    !existsSync(resolve(mobileRoot, `app/${name}.tsx`)),
    `${name}.tsx kök Stack seviyesinde (app/ doğrudan altında) OLMAMALI — bu eski hataya geri döner (sekme çubuğu kaybolur)`,
  );

  const screenMatch = layout.match(new RegExp(`<Tabs\\.Screen\\s+name="${name}"[\\s\\S]*?/>`));
  assert.ok(screenMatch, `(tabs)/_layout.tsx içinde name="${name}" olan bir Tabs.Screen bulunmalı`);
  assert.ok(
    /href:\s*null/.test(screenMatch![0]),
    `${name} ekranı href:null olmalı — aksi halde sekme çubuğunda görünür olur ya da Tabs navigatöründen çıkarılmış olur`,
  );
}

// ── Bilinen tüm çağrı noktaları /product-result yoluna gitmeli ───────────
const callSites: { file: string; mustMatch: RegExp }[] = [
  { file: 'app/(tabs)/search.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/(tabs)/index.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/(tabs)/barcode-scan.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/(tabs)/photo-search.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'app/(tabs)/product-group.tsx', mustMatch: /['"]\/product-result['"]/ },
  { file: 'src/features/basket/ScoreTab.tsx', mustMatch: /['"]\/product-result['"]/ },
];

for (const { file, mustMatch } of callSites) {
  const content = readMobileFile(file);
  assert.ok(mustMatch.test(content), `${file} /product-result yoluna gitmeli (aksi halde (tabs) grubu dışında açılıp sekme çubuğunu kaybedebilir)`);
}

console.log('PRODUCT_RESULT_TAB_GUARD_SMOKE_OK');
