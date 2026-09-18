import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '..');

function readMobileFile(relativePath) {
  return readFileSync(resolve(mobileRoot, relativePath), 'utf8');
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

const productResult = readMobileFile('app/product-result.tsx');
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

// Local product recovery slice (feature-flagged): three data states, package capture, candidate draft.
const productDataStateCard = readMobileFile('src/localProduct/ProductDataStateCard.tsx');
const packageCapture = readMobileFile('app/package-capture.tsx');
const productDataState = readMobileFile('src/localProduct/productDataState.ts');
const contributionDraft = readMobileFile('src/localProduct/contributionDraft.ts');

assertIncludes('ProductDataStateCard.tsx', productDataStateCard, 'Ürün verisi bulunamadı');
assertIncludes('ProductDataStateCard.tsx', productDataStateCard, 'Paket bilgisini ekle');
assertIncludes('ProductDataStateCard.tsx', productDataStateCard, 'Ürün kaydı kısmi');
assertIncludes('ProductDataStateCard.tsx', productDataStateCard, 'Aday kayıt, doğrulanmadı');
assertIncludes('ProductDataStateCard.tsx', productDataStateCard, 'skordan bağımsızdır');
assertIncludes('productDataState.ts', productDataState, 'Beyana göre içerir');
assertIncludes('productDataState.ts', productDataState, 'İçerebilir');
assertIncludes('productDataState.ts', productDataState, 'Alerjen verisi yok / doğrulanmamış');
assertIncludes('productDataState.ts', productDataState, 'Bu bir garanti değildir');
assertIncludes('package-capture.tsx', packageCapture, 'OCR bu sürümde yok');
assertIncludes('package-capture.tsx', packageCapture, 'GELİŞTİRME FIXTURE');
assertIncludes('package-capture.tsx', packageCapture, 'aday, gönderilmez');
assertIncludes('contributionDraft.ts', contributionDraft, 'veri yok / doğrulanmamış');
assertIncludes('contributionDraft.ts', contributionDraft, 'no_upload_in_this_build');

// ADR-004 (risk motoru trace desteği) + proje sahibi düzeltmeleri (kayıt hatası, GTIN
// doğrulama, geçici fotoğraf uyarısı, izin gerekçesi önce, alternatif aday trace filtresi,
// egg declared/trace kodları).
const riskEngine = readMobileFile('src/riskEngine/riskEngine.ts');
const gtin = readMobileFile('src/localProduct/gtin.ts');
const contributionDraftStorage = readMobileFile('src/localProduct/contributionDraftStorage.ts');
const criticalAllergenCodes = readMobileFile('src/localProduct/criticalAllergenCodes.ts');
const alternativeAllergenFilter = readMobileFile('src/localProduct/alternativeAllergenFilter.ts');

assertIncludes('riskEngine.ts', riskEngine, 'PROFILE_MILK_TRACE_MATCH');
assertIncludes('riskEngine.ts', riskEngine, 'PROFILE_EGG_ALLERGEN_MATCH');
assertIncludes('riskEngine.ts', riskEngine, 'PROFILE_EGG_TRACE_MATCH');
assertIncludes('riskEngine.ts', riskEngine, 'eser miktarda içerebilir');
assertIncludes('riskEngine.ts', riskEngine, 'çapraz bulaşma');
assertIncludes('riskEngine.ts', riskEngine, 'tıbbi hüküm niteliği taşımaz');
assertIncludes('gtin.ts', gtin, 'kontrol basamağı');
assertIncludes('contributionDraftStorage.ts', contributionDraftStorage, 'kaydedilemedi');
assertIncludes('contributionDraft.ts', contributionDraft, 'geçici önbellek');
assertIncludes('package-capture.tsx', packageCapture, 'Önceki adım');
assertIncludes('package-capture.tsx', packageCapture, 'Kamera izni ver');
assertIncludes('package-capture.tsx', packageCapture, 'geçici olarak tutulur');
assertIncludes('package-capture.tsx', packageCapture, 'önizleme');
assertIncludes('package-capture.tsx', packageCapture, 'Kaydediliyor');

assertIncludes('criticalAllergenCodes.ts', criticalAllergenCodes, 'PROFILE_EGG_ALLERGEN_MATCH');
assertIncludes('alternativeAllergenFilter.ts', alternativeAllergenFilter, 'traceAllergens');

for (const [fileName, content] of [
  ['ProductDataStateCard.tsx', productDataStateCard],
  ['package-capture.tsx', packageCapture],
  ['productDataState.ts', productDataState],
  ['contributionDraft.ts', contributionDraft],
  ['gtin.ts', gtin],
  ['contributionDraftStorage.ts', contributionDraftStorage],
  ['criticalAllergenCodes.ts', criticalAllergenCodes],
  ['alternativeAllergenFilter.ts', alternativeAllergenFilter],
]) {
  assertNotIncludes(fileName, content, 'alerjen içermez');
  assertNotIncludes(fileName, content, 'güvenli alternatif');
  assertNotIncludes(fileName, content, 'ürün güvenlidir');
  assertNotIncludes(fileName, content, 'garanti eder');
  assertNotIncludes(fileName, content, 'alerjensiz');
}

// riskEngine.ts pre-existing VEGAN_ALLERGEN_PRECAUTION metni bilinçli olarak "alerjensiz"
// kelimesini olumsuzlama içinde kullanır ("...alerjensiz olduğu anlamına gelmez"); bu nedenle
// yukarıdaki genel taramaya alınmaz. Yine de en katı iki iddia (kesin güvenlik/garanti) burada
// da yasaktır.
assertNotIncludes('riskEngine.ts', riskEngine, 'alerjen içermez');
assertNotIncludes('riskEngine.ts', riskEngine, 'güvenli alternatif');
assertNotIncludes('riskEngine.ts', riskEngine, 'ürün güvenlidir');
assertNotIncludes('riskEngine.ts', riskEngine, 'garanti eder');

console.log('MOBILE_BETA_WORDING_GUARD_OK');