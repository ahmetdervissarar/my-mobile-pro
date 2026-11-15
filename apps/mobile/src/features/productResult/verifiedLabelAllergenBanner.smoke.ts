/**
 * RafSkoru — Onaylı etiket içindekileri ve alerjen bandı (ADR-009, İş 1.3b)
 * src/features/productResult/verifiedLabelAllergenBanner.smoke.ts
 *
 * Backend, OFF verisini insan onaylı etiket kaydıyla birleştirdiğinde ürün
 * sayfası şu yoldan geçer: risk motoru (ingredientsText) + alerjen bandı
 * (catalogAllergenData). Bu test, 1.3b alerjen incelemesinin iki bulgusunu
 * kabul testi olarak sabitler. Risk motoru ve alerjen çipi DEĞİŞMEDİ; test
 * yalnız mevcut kuralların yeni girdiyle doğru sonucu verdiğini kanıtlar.
 *
 *   Bulgu 1: OFF'ta alerjen beyanı var (durum 'present'), içindekiler onaylı
 *            kayıttan geldi ve profildeki alerjeni anıyor → band o alerjen
 *            için "belirtilmemiş" DEMEMELİ; risk motoru uyarısıyla çelişmemeli.
 *   Bulgu 2: OFF'ta alerjen verisi yok, içindekiler onaylı kayıttan geldi ve
 *            profildeki alerjeni ANMIYOR → band "veri yok / doğrulanmamış"
 *            kalmalı; hiçbir yerde olumlu ifade çıkmamalı.
 */
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../../api/catalogTypes';
import { evaluateProductRisks } from '../../riskEngine/riskEngine';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { getAllergenStatusLine } from './allergenStatusLine';
import { getAllergenBannerData, getAllergenBannerDataFromCatalog } from './helpers';

const BANNED_POSITIVE = ['güvenli', 'içermez', 'garanti', 'sorun yok', 'temiz'];

function profile(allergens: UserSensitivityProfile['allergens']): UserSensitivityProfile {
  return { allergens, chronicSensitivities: [], healthPreferences: [] };
}

function catalogData(overrides: Partial<CatalogAllergenData>): CatalogAllergenData {
  return {
    declared: [],
    traces: [],
    recognizedUnmodeled: [],
    rawUnmapped: [],
    dataStatus: 'unknown_or_unverified',
    ingredientsEvidence: { text: null, lang: null, source: 'off' },
    ...overrides,
  };
}

function risks(ingredients: string | null, allergens: string[], userProfile: UserSensitivityProfile) {
  return evaluateProductRisks({
    name: 'Bisküvi',
    ingredients,
    allergens,
    additives: [],
    novaGroup: null,
    trafficLight: null,
    nutriScore: null,
    userProfile,
  });
}

function assertNoPositiveClaim(texts: string[]): void {
  for (const text of texts) {
    const lower = text.toLocaleLowerCase('tr-TR');
    for (const banned of BANNED_POSITIVE) {
      assert.ok(!lower.includes(banned), `olumlu güvenlik ifadesi: "${banned}" — "${text}"`);
    }
  }
}

const VERIFIED_INGREDIENTS = 'Buğday unu, şeker, soya lesitini, bitkisel yağ';

// ── Bulgu 1: beyan 'present' (süt), onaylı içindekiler soya anıyor ────
{
  const userProfile = profile(['soy']);
  const riskResult = risks(VERIFIED_INGREDIENTS, ['milk'], userProfile);
  assert.ok(
    riskResult.warnings.some((warning) => warning.code === 'PROFILE_SOY_ALLERGEN_MATCH'),
    'risk motoru onaylı içindekilerden soya uyarısı üretmeli',
  );

  // Birleştirme kanıt metnini onaylı içindekilerle doldurduğunda (1.3b):
  const merged = getAllergenBannerDataFromCatalog({
    catalogAllergenData: catalogData({
      declared: ['milk'],
      dataStatus: 'present',
      ingredientsEvidence: { text: VERIFIED_INGREDIENTS, lang: 'tr', source: 'rafskoru_verified' },
    }),
    userProfile,
    riskWarnings: riskResult.warnings,
  });
  const soyKey = merged.perKey.find((entry) => entry.key === 'soy')!;
  assert.notEqual(soyKey.status, 'not_listed_in_available_data', 'uyarı varken band "belirtilmemiş" dememeli');
  assert.equal(soyKey.basis, 'ingredients');
  assert.notEqual(merged.status, 'not_listed_in_available_data');
  assert.ok(merged.criticalMatches.length > 0, 'kritik uyarı bandda görünmeli');
  assert.equal(getAllergenStatusLine(merged).tone, 'danger');

  // Kanıt metni OFF'ta kalsaydı (düzeltme olmasaydı) çelişki oluşurdu — bu,
  // backend birleştirmesinin kanıt metnini neden güncellediğinin belgesidir.
  const withoutEvidence = getAllergenBannerDataFromCatalog({
    catalogAllergenData: catalogData({ declared: ['milk'], dataStatus: 'present' }),
    userProfile,
    riskWarnings: riskResult.warnings,
  });
  assert.equal(
    withoutEvidence.perKey.find((entry) => entry.key === 'soy')!.status,
    'not_listed_in_available_data',
    'kanıt metni olmadan band "belirtilmemiş" der (düzeltmenin önlediği durum)',
  );
}

// ── Bulgu 2: alerjen verisi yok, onaylı içindekiler profildekini anmıyor ─
{
  const userProfile = profile(['sesame']);
  const riskResult = risks(VERIFIED_INGREDIENTS, [], userProfile);
  assert.ok(
    !riskResult.warnings.some((warning) => warning.code === 'PROFILE_SESAME_ALLERGEN_MATCH'),
    'içindekilerde geçmeyen alerjen için eşleşme uyarısı üretilmemeli',
  );

  const merged = getAllergenBannerDataFromCatalog({
    catalogAllergenData: catalogData({
      ingredientsEvidence: { text: VERIFIED_INGREDIENTS, lang: 'tr', source: 'rafskoru_verified' },
    }),
    userProfile,
    riskWarnings: riskResult.warnings,
  });
  assert.equal(merged.status, 'unknown_or_unverified', 'içindekilerde geçmemesi "belirtilmemiş" sayılmamalı');
  assert.equal(merged.perKey.find((entry) => entry.key === 'sesame')!.status, 'unknown_or_unverified');
  assert.deepEqual(merged.declaredList, []);
  assert.deepEqual(merged.traceList, []);

  const line = getAllergenStatusLine(merged);
  assert.equal(line.tone, 'caution', 'durum satırı ihtiyat tonunda kalmalı');
  assert.equal(line.text, 'Alerjen verisi yok — etiketi kontrol edin');
  assertNoPositiveClaim([line.text, merged.displayInfo?.text ?? '', ...riskResult.warnings.map((w) => `${w.title} ${w.message}`)]);
}

// ── Yalnız onaylı kayıt (OFF'ta yok): catalogAllergenData hiç yok ────────
{
  const userProfile = profile(['sesame', 'soy']);
  const riskResult = risks(VERIFIED_INGREDIENTS, [], userProfile);
  const banner = getAllergenBannerData({
    productFacts: {
      barcode: '8690000002004',
      productName: 'Yerel Bisküvi',
      ingredientsText: VERIFIED_INGREDIENTS,
      allergenInfo: { dataStatus: 'unknown', declaredAllergens: [], traceAllergens: [], source: 'none' },
      dataSource: 'rafskoru_verified',
      isComplete: false,
    },
    riskWarnings: riskResult.warnings,
  });

  assert.equal(banner.status, 'unknown_or_unverified', 'onaylı kayıt tek başına "belirtilmemiş" durumuna ulaşmamalı');
  assert.deepEqual(banner.declaredList, []);
  assert.ok(
    banner.criticalMatches.some((match) => match.code === 'PROFILE_SOY_ALLERGEN_MATCH'),
    'onaylı içindekilerde geçen alerjen için kritik uyarı görünmeli',
  );
  assert.ok(!banner.criticalMatches.some((match) => match.code === 'PROFILE_SESAME_ALLERGEN_MATCH'));
  assertNoPositiveClaim([getAllergenStatusLine(banner).text]);
}

console.log('VERIFIED_LABEL_ALLERGEN_BANNER_SMOKE_OK');
