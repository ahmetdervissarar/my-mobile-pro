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
assertIncludes('package-capture.tsx', packageCapture, 'uygulama tarafından sunucuya gönderilmez');
assertIncludes('package-capture.tsx', packageCapture, 'önizleme');
assertIncludes('package-capture.tsx', packageCapture, 'Kaydediliyor');

assertIncludes('criticalAllergenCodes.ts', criticalAllergenCodes, 'PROFILE_EGG_ALLERGEN_MATCH');
assertIncludes('alternativeAllergenFilter.ts', alternativeAllergenFilter, 'traceAllergens');

// Aşama 6 (ADR-005): içerik çözümleme + insan alan incelemesi. On ekran durumu, Doğrula/Düzelt/Okunamıyor,
// "yerel aday" sonucu; kullanıcı beyanı asla readable, sonuç asla rafskoru_verified.
const packageReview = readMobileFile('app/package-review.tsx');
const resolutionUiState = readMobileFile('src/localProduct/resolution/uiState.ts');
const resolutionReview = readMobileFile('src/localProduct/resolution/review.ts');
const resolutionMerge = readMobileFile('src/localProduct/resolution/mergeEngine.ts');
const reviewFieldCard = readMobileFile('src/localProduct/review/ReviewFieldCard.tsx');
const allergenReviewBlock = readMobileFile('src/localProduct/review/AllergenReviewBlock.tsx');

assertIncludes('package-review.tsx', packageReview, 'Alan alan inceleme');
assertIncludes('package-review.tsx', packageReview, 'Yerel aday olarak kaydet — doğrulanmış ürün değildir.');
assertIncludes('package-review.tsx', packageReview, 'locally_reviewed');
assertIncludes('package-review.tsx', packageReview, 'İncelenen alan');
assertIncludes('package-review.tsx', packageReview, 'Taslağı ve fotoğrafları sil');
assertIncludes('package-review.tsx', packageReview, 'loadProductFactsSnapshot');
assertNotIncludes('package-review.tsx', packageReview, 'openfoodfacts.org/api');
assertIncludes('ReviewFieldCard.tsx', reviewFieldCard, 'Doğrula');
assertIncludes('ReviewFieldCard.tsx', reviewFieldCard, 'Düzelt');
assertIncludes('ReviewFieldCard.tsx', reviewFieldCard, 'Okunamıyor');
assertIncludes('ReviewFieldCard.tsx', reviewFieldCard, 'doğrulanmamış');
assertIncludes('ReviewFieldCard.tsx', reviewFieldCard, 'Mevcut kayıt');
assertIncludes('ReviewFieldCard.tsx', reviewFieldCard, 'Ambalaj adayı');
assertIncludes('resolution/review.ts', resolutionReview, 'Çatışmalı');
assertIncludes('resolution/review.ts', resolutionReview, 'Yalnız ambalajda');
assertIncludes('resolution/review.ts', resolutionReview, 'İnsan karşılaştırması gerekli');
assertIncludes('AllergenReviewBlock.tsx', allergenReviewBlock, 'Mevcut kaynak beyanı');
assertIncludes('AllergenReviewBlock.tsx', allergenReviewBlock, 'Ambalaj adayı');
assertNotIncludes('AllergenReviewBlock.tsx', allergenReviewBlock, 'geçici önbellek');
assertNotIncludes('ReviewFieldCard.tsx', reviewFieldCard, 'geçici önbellek');
const photoStorage = readMobileFile('src/localProduct/photoStorage.ts');
assertIncludes('photoStorage.ts', photoStorage, 'Paths.document');
assertNotIncludes('photoStorage.ts', photoStorage, 'MediaLibrary');
assertNotIncludes('photoStorage.ts', photoStorage, 'fetch(');
assertIncludes('contributionDraft.ts', contributionDraft, 'uygulamanın özel depolama alanında');
assertIncludes('contributionDraft.ts', contributionDraft, 'uygulama tarafından sunucuya');
assertIncludes('package-review.tsx', packageReview, 'ESKİ CİHAZ KAYDI');
assertIncludes('package-review.tsx', packageReview, 'isSnapshotFresh');
assertIncludes('AllergenReviewBlock.tsx', allergenReviewBlock, 'veri yok / doğrulanmamış');
assertIncludes('AllergenReviewBlock.tsx', allergenReviewBlock, 'Bu bir garanti değildir');
assertIncludes('resolution/review.ts', resolutionReview, "status: 'locally_reviewed_candidate'");
assertIncludes('resolution/review.ts', resolutionReview, 'not_rafskoru_verified');
assertIncludes('resolution/mergeEngine.ts', resolutionMerge, 'allergenCandidateText');
for (const title of [
  'Kaynaklar aranıyor',
  'Open Food Facts kaydı kısmi',
  'Kesin barkod eşleşmesi bulundu',
  'Birden fazla olası aday bulundu',
  'Kaynak bulundu fakat ambalajla çatışıyor',
  'Ambalaj fotoğrafı gerekli',
  'Aday metin doğrulama bekliyor',
  'Alan okunamıyor',
  'Yerel aday kaydedildi',
  'Veri hâlâ yetersiz',
]) {
  assertIncludes('resolution/uiState.ts', resolutionUiState, title);
}

for (const [fileName, content] of [
  ['ProductDataStateCard.tsx', productDataStateCard],
  ['package-capture.tsx', packageCapture],
  ['productDataState.ts', productDataState],
  ['contributionDraft.ts', contributionDraft],
  ['gtin.ts', gtin],
  ['contributionDraftStorage.ts', contributionDraftStorage],
  ['criticalAllergenCodes.ts', criticalAllergenCodes],
  ['alternativeAllergenFilter.ts', alternativeAllergenFilter],
  ['package-review.tsx', packageReview],
  ['resolution/uiState.ts', resolutionUiState],
  ['resolution/review.ts', resolutionReview],
  ['resolution/mergeEngine.ts', resolutionMerge],
  ['ReviewFieldCard.tsx', reviewFieldCard],
  ['AllergenReviewBlock.tsx', allergenReviewBlock],
]) {
  assertNotIncludes(fileName, content, 'alerjen içermez');
  assertNotIncludes(fileName, content, 'güvenli alternatif');
  assertNotIncludes(fileName, content, 'ürün güvenlidir');
  assertNotIncludes(fileName, content, 'garanti eder');
  assertNotIncludes(fileName, content, 'alerjensiz');
  assertNotIncludes(fileName, content, 'sağlıklı alternatif');
}

// riskEngine.ts pre-existing VEGAN_ALLERGEN_PRECAUTION metni bilinçli olarak "alerjensiz"
// kelimesini olumsuzlama içinde kullanır ("...alerjensiz olduğu anlamına gelmez"); bu nedenle
// yukarıdaki genel taramaya alınmaz. Yine de en katı iki iddia (kesin güvenlik/garanti) burada
// da yasaktır.
assertNotIncludes('riskEngine.ts', riskEngine, 'alerjen içermez');
assertNotIncludes('riskEngine.ts', riskEngine, 'güvenli alternatif');
assertNotIncludes('riskEngine.ts', riskEngine, 'ürün güvenlidir');
assertNotIncludes('riskEngine.ts', riskEngine, 'garanti eder');

// Tüketici karar akışı V2 (Aşama 8, bayrak EXPO_PUBLIC_CONSUMER_UX_V2, src/consumerUx/).
const decisionViewModel = readMobileFile('src/consumerUx/decisionViewModel.ts');
const allergenGateCard = readMobileFile('src/consumerUx/AllergenGateCard.tsx');
const dataTrustStrip = readMobileFile('src/consumerUx/DataTrustStrip.tsx');
const scoreDimensionCard = readMobileFile('src/consumerUx/ScoreDimensionCard.tsx');
const alternativePreviewCard = readMobileFile('src/consumerUx/AlternativePreviewCard.tsx');
const missingDataActionCard = readMobileFile('src/consumerUx/MissingDataActionCard.tsx');
const devStateGallery = readMobileFile('src/consumerUx/DevStateGallery.tsx');
const consumerUxTokens = readMobileFile('src/consumerUx/tokens.ts');
const consumerUxFeatureFlag = readMobileFile('src/localProduct/featureFlag.ts');

// Dört alerjen durumu, görev metniyle birebir (Aşama 8 zorunlu ifadeler).
assertIncludes('decisionViewModel.ts', decisionViewModel, 'Beyana göre içerir:');
assertIncludes('decisionViewModel.ts', decisionViewModel, 'İçerebilir:');
assertIncludes(
  'decisionViewModel.ts',
  decisionViewModel,
  'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.',
);
assertIncludes('decisionViewModel.ts', decisionViewModel, 'Alerjen verisi yok veya doğrulanmamış. Güncel ambalaj etiketini kontrol edin.');
assertIncludes('AllergenGateCard.tsx', allergenGateCard, 'skordan bağımsızdır');
assertIncludes('AlternativePreviewCard.tsx', alternativePreviewCard, 'Aynı gruptan seçenekler');
assertIncludes('ScoreDimensionCard.tsx', scoreDimensionCard, 'Bu boyut için veri yetersiz');
assertIncludes('DataTrustStrip.tsx', dataTrustStrip, 'doğrulanmadı');
assertIncludes('DataTrustStrip.tsx', dataTrustStrip, 'otomatik kazanan yok');
assertIncludes('MissingDataActionCard.tsx', missingDataActionCard, 'Paket bilgisini ekle');
assertIncludes('DevStateGallery.tsx', devStateGallery, 'GELİŞTİRME ÖNİZLEMESİ');
assertIncludes('tokens.ts', consumerUxTokens, 'GELİŞTİRME ÖNİZLEMESİ');
assertIncludes('featureFlag.ts', consumerUxFeatureFlag, 'EXPO_PUBLIC_CONSUMER_UX_V2');

for (const [fileName, content] of [
  ['decisionViewModel.ts', decisionViewModel],
  ['AllergenGateCard.tsx', allergenGateCard],
  ['DataTrustStrip.tsx', dataTrustStrip],
  ['ScoreDimensionCard.tsx', scoreDimensionCard],
  ['AlternativePreviewCard.tsx', alternativePreviewCard],
  ['MissingDataActionCard.tsx', missingDataActionCard],
  ['DevStateGallery.tsx', devStateGallery],
]) {
  assertNotIncludes(fileName, content, 'alerjen içermez');
  assertNotIncludes(fileName, content, 'güvenli alternatif');
  assertNotIncludes(fileName, content, 'ürün güvenlidir');
  assertNotIncludes(fileName, content, 'garanti eder');
  assertNotIncludes(fileName, content, 'alerjensiz');
  assertNotIncludes(fileName, content, 'sağlıklı alternatif');
  assertNotIncludes(fileName, content, 'tüketebilirsiniz');
}

// Haftalık sepet V1 (Aşama 9, aynı bayrak EXPO_PUBLIC_CONSUMER_UX_V2, src/weeklyBasket/).
const basketHeader = readMobileFile('src/weeklyBasket/BasketHeader.tsx');
const basketAllergenSummaryCard = readMobileFile('src/weeklyBasket/BasketAllergenSummaryCard.tsx');
const basketCriticalAllergenCard = readMobileFile('src/weeklyBasket/BasketCriticalAllergenCard.tsx');
const basketDimensionCoverageCard = readMobileFile('src/weeklyBasket/BasketDimensionCoverageCard.tsx');
const weeklyBasketLineRow = readMobileFile('src/weeklyBasket/WeeklyBasketLineRow.tsx');
const weeklyBasketScreen = readMobileFile('src/weeklyBasket/WeeklyBasketScreen.tsx');
const basketViewModel = readMobileFile('src/weeklyBasket/basketViewModel.ts');
const basketStorage = readMobileFile('src/weeklyBasket/basketStorage.ts');
const basketOperationsFile = readMobileFile('src/weeklyBasket/basketOperations.ts');
const weeklyBasketRoute = readMobileFile('app/weekly-basket.tsx');
const basketActionBar = readMobileFile('src/consumerUx/BasketActionBar.tsx');

assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Bu haftanın sepeti');
assertIncludes('BasketAllergenSummaryCard.tsx', basketAllergenSummaryCard, 'Sepet alerjen özeti');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'güvenlik garantisi değildir');
assertIncludes('BasketDimensionCoverageCard.tsx', basketDimensionCoverageCard, 'Bu boyut için veri yetersiz');
assertIncludes('WeeklyBasketLineRow.tsx', weeklyBasketLineRow, 'Aynı gruptan seçenekler');
assertIncludes('basketStorage.ts', basketStorage, 'kaydedilemedi');
assertIncludes('weekly-basket.tsx', weeklyBasketRoute, 'bu sürümde kapalı');
assertIncludes('BasketActionBar.tsx', basketActionBar, 'Sepete ekle');
assertIncludes('BasketActionBar.tsx', basketActionBar, 'Sepete git');

// Odaklı düzeltme turu — Sorun 1: gerçek hafta geçişi.
assertIncludes('basketOperations.ts', basketOperationsFile, "'week_mismatch'");
assertIncludes('BasketHeader.tsx', basketHeader, 'Yeni haftaya başla');
assertIncludes('BasketHeader.tsx', basketHeader, 'Bu sepet önceki haftaya ait');
// Odaklı düzeltme turu — Sorun 3: ürün beyanı ile profil çakışmasını ayır.
assertIncludes('BasketCriticalAllergenCard.tsx', basketCriticalAllergenCard, 'Sepete eklenirken profilinizle eşleşen kritik uyarılar');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Alerji profilinizi daha sonra değiştirdiyseniz ürünleri yeniden kontrol edin');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Beyan edilmiş alerjen bulunan ürünler');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'İz/eser beyanı bulunan ürünler');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Alerjen verisi eksik veya doğrulanmamış ürünler');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Mevcut kayıtta alerjen belirtilmemiş ürünler');
// Odaklı düzeltme turu — Sorun 4: veri kapsamı ve ortalama dili.
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'basit ortalamasıdır');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'miktar ve tüketim sıklığı hesaba katılmaz');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'bu boyut hesaplanamadı');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Kullanılabilir veri');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Kaynak çatışması');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Yerel incelenmiş aday');
assertIncludes('weeklyBasket/basketViewModel.ts', basketViewModel, 'Bulunamadı / yüklenemedi');

for (const [fileName, content] of [
  ['BasketHeader.tsx', basketHeader],
  ['BasketAllergenSummaryCard.tsx', basketAllergenSummaryCard],
  ['BasketCriticalAllergenCard.tsx', basketCriticalAllergenCard],
  ['BasketDimensionCoverageCard.tsx', basketDimensionCoverageCard],
  ['WeeklyBasketLineRow.tsx', weeklyBasketLineRow],
  ['WeeklyBasketScreen.tsx', weeklyBasketScreen],
  ['weeklyBasket/basketViewModel.ts', basketViewModel],
  ['basketStorage.ts', basketStorage],
  ['basketOperations.ts', basketOperationsFile],
  ['weekly-basket.tsx', weeklyBasketRoute],
  ['BasketActionBar.tsx', basketActionBar],
]) {
  assertNotIncludes(fileName, content, 'alerjen içermez');
  assertNotIncludes(fileName, content, 'güvenli alternatif');
  assertNotIncludes(fileName, content, 'ürün güvenlidir');
  assertNotIncludes(fileName, content, 'garanti eder');
  assertNotIncludes(fileName, content, 'alerjensiz');
  assertNotIncludes(fileName, content, 'sağlıklı alternatif');
  assertNotIncludes(fileName, content, 'tüketebilirsiniz');
  assertNotIncludes(fileName, content, 'sepet güvenli');
  // Bu ifade Aşama 9 düzeltme turunda kaldırıldı; profille çakışma iddiası taşıyordu.
  assertNotIncludes(fileName, content, 'çakışması görünmüyor');
}

console.log('MOBILE_BETA_WORDING_GUARD_OK');