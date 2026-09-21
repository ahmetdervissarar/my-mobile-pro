import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '..');

function readMobileFile(relativePath) {
  return readFileSync(resolve(mobileRoot, relativePath), 'utf8');
}

/**
 * app/product-result.tsx aşama 2'de src/features/productResult/ altındaki
 * bölüm bileşenlerine bölündü. Bu fonksiyon ekranı ve tüm bölümlerini tek
 * bir metinde birleştirir; aşağıdaki assertIncludes/assertNotIncludes
 * kontrolleri dosya sayısından bağımsız olarak aynı kalır.
 */
function readMobileDirRecursive(relativePath) {
  const absoluteDir = resolve(mobileRoot, relativePath);

  function walk(dir) {
    let combined = '';

    for (const entry of readdirSync(dir)) {
      const entryPath = resolve(dir, entry);
      if (statSync(entryPath).isDirectory()) {
        combined += walk(entryPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        combined += readFileSync(entryPath, 'utf8');
      }
    }

    return combined;
  }

  return walk(absoluteDir);
}

function assertIncludes(fileName, content, expectedText) {
  assert.ok(
    content.includes(expectedText),
    `${fileName} must include user-facing wording fragment: ${expectedText}`,
  );
}

function assertAnyIncludes(fileName, content, expectedTexts) {
  assert.ok(
    expectedTexts.some((text) => content.includes(text)),
    `${fileName} must include at least one wording fragment: ${expectedTexts.join(' | ')}`,
  );
}

function assertNotIncludes(fileName, content, forbiddenText) {
  assert.ok(
    !content.includes(forbiddenText),
    `${fileName} must not include user-facing wording: ${forbiddenText}`,
  );
}

const productResult =
  readMobileFile('app/product-result.tsx') + readMobileDirRecursive('src/features/productResult');
const basketResult = readMobileFile('app/basket-result.tsx');
const priceClient = readMobileFile('src/price/priceClient.ts');
const rafScoreExplanation = readMobileFile('src/price/rafScoreExplanation.ts');

// Product result: beta/reference + privacy wording must remain visible.
assertIncludes('product-result.tsx', productResult, 'Fiyatlar');
assertIncludes('product-result.tsx', productResult, 'beta');
assertIncludes('product-result.tsx', productResult, 'referans');
assertIncludes('product-result.tsx', productResult, 'Gizlilik');
assertIncludes('product-result.tsx', productResult, 'profil tercihleri');
assertIncludes('product-result.tsx', productResult, 'cihazda tutulur');
assertIncludes('product-result.tsx', productResult, 'konum');
assertIncludes('product-result.tsx', productResult, 'yakın market');
assertIncludes('product-result.tsx', productResult, 'fiyat sorgusu');

// Basket result: beta/insufficient-data/partial-coverage wording must remain visible.
assertIncludes('basket-result.tsx', basketResult, 'Beta fiyat verisi');
assertIncludes('basket-result.tsx', basketResult, 'Veri yetersiz');
assertIncludes('basket-result.tsx', basketResult, 'Eksik ürün olan marketler');
assertIncludes('basket-result.tsx', basketResult, 'en ucuz market olarak seçilmez');
assertIncludes('basket-result.tsx', basketResult, 'Tam sepet fiyatı yok');
assertIncludes('basket-result.tsx', basketResult, 'Market sıralaması yapılmadı');
assertIncludes('basket-result.tsx', basketResult, 'yanlış biçimde');
assertIncludes('basket-result.tsx', basketResult, 'Kapalı beta veri notu');

assertIncludes('product-result.tsx', productResult, 'Ürün bulunamadı');
assertIncludes('product-result.tsx', productResult, 'Ürün adını yazarak ara');
assertIncludes('product-result.tsx', productResult, 'Ürün fotoğrafı ile dene');
assertIncludes('product-result.tsx', productResult, 'Ürünü beta verisine katkı olarak gönder');
assertIncludes('product-result.tsx', productResult, 'product_contribution');
assertIncludes('product-result.tsx', productResult, 'initialQuery');
assertIncludes('product-result.tsx', productResult, 'priceConfidence');
assertIncludes('product-result.tsx', productResult, 'Canlı fiyat');
assertIncludes('product-result.tsx', productResult, 'Son güncelleme');
assertIncludes('product-result.tsx', productResult, 'Beta referans fiyat');
assertIncludes('product-result.tsx', productResult, 'Fiyat bulunamadı');

const searchScreen = readMobileFile('app/search.tsx');
assertIncludes('search.tsx', searchScreen, 'useLocalSearchParams');
assertIncludes('search.tsx', searchScreen, 'initialQuery');

// Price source label: internal_test should be shown as Beta, not İç Test.
assertIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'price_missing');
assertIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'price_beta_reference');
assertIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'allergen_data_unknown');
assertIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'data_low_confidence');

assertNotIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'sağlıksız');
assertNotIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'alerjensiz');
assertNotIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'ucuz');
assertNotIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'pahalı');
assertNotIncludes('rafScoreExplanation.ts', rafScoreExplanation, 'çevreye zararlı');

assertIncludes('priceClient.ts', priceClient, 'internal_test');
assertAnyIncludes('priceClient.ts', priceClient, ['Beta', 'beta']);

const betaFeedbackClient = readMobileFile('src/api/betaFeedbackClient.ts');
assertIncludes('betaFeedbackClient.ts', betaFeedbackClient, 'product_contribution');
assertIncludes('betaFeedbackClient.ts', betaFeedbackClient, 'Ürün katkısı');

for (const [fileName, content] of [
  ['product-result.tsx', productResult],
  ['basket-result.tsx', basketResult],
  ['priceClient.ts', priceClient],
]) {
  assertNotIncludes(fileName, content, 'İç Test');
  assertNotIncludes(fileName, content, 'İç test');
  assertNotIncludes(fileName, content, 'qanlış');
  assertNotIncludes(fileName, content, 'qanlÄ±ÅŸ');
}

console.log('MOBILE_BETA_WORDING_GUARD_OK');