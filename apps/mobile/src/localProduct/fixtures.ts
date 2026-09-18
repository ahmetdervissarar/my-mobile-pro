/**
 * RafSkoru — Yerel ürün kurtarma GELİŞTİRME FIXTURE'LARI.
 * src/localProduct/fixtures.ts
 *
 * Uydurma yapı verisidir; gerçek OFF yanıtı DEĞİLDİR. Yalnız senaryo koşucusu ve
 * (EXPO_PUBLIC_LOCAL_PRODUCT_FIXTURE=1 + __DEV__) OCR aday ön doldurması için kullanılır.
 * Her kayıt `_fixture: true` taşır; ekranda "GELİŞTİRME FIXTURE" etiketi zorunludur.
 */

import type { OcrCandidate, ProductFactsWire } from './types';

export const FIXTURE_LABEL = 'GELİŞTİRME FIXTURE — gerçek veri değil';

export type ProductFactsFixtureKey = 'full_off' | 'partial_allergen_usable' | 'trace_only' | 'not_found';

export const productFactsFixtures: Record<ProductFactsFixtureKey, (ProductFactsWire & { _fixture: true }) | null> = {
  full_off: {
    _fixture: true,
    barcode: '8690000000010',
    productName: 'Fixture Yulaflı Bisküvi 200 g',
    imageUrl: 'https://example.invalid/fixture-front.jpg',
    nutriScoreGrade: 'C',
    novaGroup: 4,
    trafficLight: { sugar: 'high', salt: 'medium', saturatedFat: 'medium', fat: 'medium' },
    ingredientsText: 'Buğday unu, şeker, bitkisel yağ, yulaf ezmesi, süt tozu, kabartıcı.',
    additives: ['E500'],
    allergens: ['gluten', 'milk'],
    traceAllergens: ['nuts'],
    allergenInfo: { dataStatus: 'present', declaredAllergens: ['gluten', 'milk'], traceAllergens: ['nuts'], source: 'off_structured' },
    dataSource: 'off',
    isComplete: true,
    completeness: 'complete',
    capabilities: { risk: true, health: true, content: true },
    missingFields: [],
    confidence: 'high',
    sourceUrl: 'https://example.invalid/off/8690000000010',
    observedAt: '2026-09-01T00:00:00.000Z',
  },
  partial_allergen_usable: {
    _fixture: true,
    barcode: '8690000000027',
    productName: 'Fixture Sütlü Çikolata 80 g',
    imageUrl: null,
    nutriScoreGrade: null,
    novaGroup: null,
    trafficLight: null,
    ingredientsText: 'Şeker, kakao yağı, tam yağlı süt tozu, kakao kitlesi, emülgatör (soya lesitini).',
    additives: ['E322'],
    allergens: ['milk', 'soybeans'],
    traceAllergens: [],
    allergenInfo: { dataStatus: 'present', declaredAllergens: ['milk', 'soybeans'], traceAllergens: [], source: 'off_structured' },
    dataSource: 'off',
    isComplete: false,
    completeness: 'partial',
    capabilities: { risk: true, health: false, content: true },
    missingFields: ['imageUrl', 'nutriScoreGrade', 'novaGroup', 'trafficLight', 'nutrition'],
    verificationNeeded: true,
    verificationReason: 'Görsel ve besin değerleri eksik; içindekiler ve alerjen beyanı mevcut.',
    confidence: 'medium',
    sourceUrl: 'https://example.invalid/off/8690000000027',
    observedAt: '2026-08-15T00:00:00.000Z',
  },
  trace_only: {
    _fixture: true,
    barcode: '8690000000034',
    productName: 'Fixture Tuzlu Kraker 100 g',
    imageUrl: null,
    nutriScoreGrade: 'D',
    novaGroup: 4,
    trafficLight: { sugar: 'low', salt: 'high', saturatedFat: 'medium', fat: 'medium' },
    ingredientsText: 'Mısır unu, bitkisel yağ, tuz, kabartıcı.',
    additives: [],
    allergens: [],
    traceAllergens: ['milk', 'sesame-seeds'],
    allergenInfo: { dataStatus: 'present', declaredAllergens: [], traceAllergens: ['milk', 'sesame-seeds'], source: 'off_structured' },
    dataSource: 'off',
    isComplete: false,
    completeness: 'partial',
    capabilities: { risk: true, health: true, content: true },
    missingFields: ['imageUrl'],
    confidence: 'medium',
    sourceUrl: 'https://example.invalid/off/8690000000034',
    observedAt: '2026-07-20T00:00:00.000Z',
  },
  not_found: null,
};

/** OCR aday fixture'ı: alerjen alanı bilerek boş → `unknown_or_unverified` senaryosu. */
export const ocrCandidateFixture: readonly OcrCandidate[] = [
  { field: 'productName', text: `[${FIXTURE_LABEL}] Örnek Ürün Adı`, entryMethod: 'fixture', isFixture: true, source: 'user_ocr', verified: false },
  { field: 'ingredientsText', text: `[${FIXTURE_LABEL}] Un, şeker, tuz, bitkisel yağ.`, entryMethod: 'fixture', isFixture: true, source: 'user_ocr', verified: false },
  { field: 'allergenDeclaration', text: null, entryMethod: 'none', isFixture: true, source: 'user_ocr', verified: false },
  { field: 'nutrition', text: `[${FIXTURE_LABEL}] Enerji 450 kcal, yağ 18 g, şeker 22 g, tuz 0,9 g`, entryMethod: 'fixture', isFixture: true, source: 'user_ocr', verified: false },
  { field: 'netQuantity', text: `[${FIXTURE_LABEL}] 200 g`, entryMethod: 'fixture', isFixture: true, source: 'user_ocr', verified: false },
];
