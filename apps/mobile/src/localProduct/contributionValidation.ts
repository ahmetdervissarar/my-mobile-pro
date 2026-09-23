/**
 * RafSkoru — Kullanıcı Katkısı: Form Doğrulama Kuralları
 * src/localProduct/contributionValidation.ts
 *
 * Sorumluluk: katkı formunun (gtin, ad, besin değerleri) kaydedilmeden önce
 * geçmesi gereken kuralları saf fonksiyonlar olarak tutmak. UI'a, depolamaya
 * dokunmaz. Fotoğraf ZORUNLU DEĞİLDİR (sunucuya hiç gitmiyor) — yalnız
 * barkod ve ürün adı zorunludur.
 */

import type { UserContributedNutrition100g } from './types';

export type ContributionValidationIssueCode =
  | 'missing_gtin'
  | 'missing_name'
  | 'value_out_of_range'
  | 'total_exceeds_100g'
  | 'saturated_fat_exceeds_fat'
  | 'sugars_exceeds_carbohydrates';

export interface ContributionValidationIssue {
  code: ContributionValidationIssueCode;
  field?: keyof UserContributedNutrition100g;
  message: string;
}

export interface ContributionDraftInput {
  gtin: string | null;
  name: string | null;
  nutrition100g: UserContributedNutrition100g;
}

/** Kayan noktalı ondalık girişte (ör. "12.30") oluşabilecek yuvarlama farkını yutar. */
const EPSILON = 0.01;

/** energyKcal hariç tüm besin alanları g/100g'dır; tek bir bileşen 100g'ı geçemez. */
const NUTRIENT_RANGES: Record<keyof UserContributedNutrition100g, { min: number; max: number }> = {
  energyKcal: { min: 0, max: 900 },
  fat: { min: 0, max: 100 },
  saturatedFat: { min: 0, max: 100 },
  carbohydrates: { min: 0, max: 100 },
  sugars: { min: 0, max: 100 },
  fiber: { min: 0, max: 100 },
  proteins: { min: 0, max: 100 },
  salt: { min: 0, max: 100 },
};

function validateRanges(nutrition: UserContributedNutrition100g): ContributionValidationIssue[] {
  const issues: ContributionValidationIssue[] = [];

  for (const field of Object.keys(NUTRIENT_RANGES) as (keyof UserContributedNutrition100g)[]) {
    const value = nutrition[field];
    if (value === null) continue;

    const range = NUTRIENT_RANGES[field];
    if (value < range.min - EPSILON || value > range.max + EPSILON) {
      issues.push({
        code: 'value_out_of_range',
        field,
        message: `Değer ${range.min}-${range.max} aralığında olmalı.`,
      });
    }
  }

  return issues;
}

/**
 * Toplam tutarlılık kontrolleri. Yalnız karşılaştırılan alanların HEPSİ
 * doluysa değerlendirilir — eksik alan varsa o kural sessizce atlanır
 * (besin değerleri zorunlu değil; kısmi doldurmayı cezalandırmaz).
 */
function validateConsistency(nutrition: UserContributedNutrition100g): ContributionValidationIssue[] {
  const issues: ContributionValidationIssue[] = [];
  const { fat, saturatedFat, carbohydrates, sugars, proteins, salt } = nutrition;

  if (fat !== null && carbohydrates !== null && proteins !== null && salt !== null) {
    const total = fat + carbohydrates + proteins + salt;
    if (total > 100 + EPSILON) {
      issues.push({
        code: 'total_exceeds_100g',
        message: `Yağ + karbonhidrat + protein + tuz toplamı 100 g'ı geçemez (girilen: ${total.toFixed(1)} g).`,
      });
    }
  }

  if (saturatedFat !== null && fat !== null && saturatedFat > fat + EPSILON) {
    issues.push({
      code: 'saturated_fat_exceeds_fat',
      field: 'saturatedFat',
      message: 'Doymuş yağ, toplam yağdan büyük olamaz.',
    });
  }

  if (sugars !== null && carbohydrates !== null && sugars > carbohydrates + EPSILON) {
    issues.push({
      code: 'sugars_exceeds_carbohydrates',
      field: 'sugars',
      message: 'Şeker, toplam karbonhidrattan büyük olamaz.',
    });
  }

  return issues;
}

export function validateContributionDraft(input: ContributionDraftInput): ContributionValidationIssue[] {
  const issues: ContributionValidationIssue[] = [];

  if (!input.gtin?.trim()) {
    issues.push({ code: 'missing_gtin', message: 'Barkod zorunludur.' });
  }
  if (!input.name?.trim()) {
    issues.push({ code: 'missing_name', message: 'Ürün adı zorunludur.' });
  }

  issues.push(...validateRanges(input.nutrition100g));
  issues.push(...validateConsistency(input.nutrition100g));

  return issues;
}

export function isContributionDraftValid(input: ContributionDraftInput): boolean {
  return validateContributionDraft(input).length === 0;
}
