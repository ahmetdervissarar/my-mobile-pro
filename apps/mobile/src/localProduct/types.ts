/**
 * RafSkoru — Kullanıcı Katkısı: Yerel Ürün Tipleri
 * src/localProduct/types.ts
 *
 * Sorumluluk: kullanıcının cihazda elle (bu sürümde) veya ileride OCR ile
 * doldurduğu, sunucuya gitmeyen bir ürün katkısının veri şeklini tanımlamak.
 * Bu dosya saf tip katmanıdır — depolamaya, skorlamaya, UI'a dokunmaz.
 *
 * Kaynak adı 'user_contributed'dir, 'user_ocr' DEĞİL: bu sürümde hiçbir OCR
 * entegrasyonu yok, değerler kullanıcı tarafından elle giriliyor. 'user_ocr'
 * gibi bir köken adı, aslında yapılmamış bir OCR çıkarımı iddia eder.
 * `entryMethod` alanı OCR'ın ileride nasıl girdiğini AYRI olarak taşır.
 */

import type { AllergenKey } from '../userProfile/userProfileTypes';

/**
 * Değerin nasıl girildiği. 'manual': kullanıcı klavyeyle yazdı (bu sürümün
 * TEK yolu). 'ocr': cihaz-içi OCR adayından geldi — bu değer bu sürümde HİÇ
 * ÜRETİLMEZ (OCR taşınmadı, bkz. denetim raporu); tip ileriye dönük olarak
 * şimdiden eklendi.
 */
export type ContributionEntryMethod = 'manual' | 'ocr';

/**
 * Ham besin değerleri (g/100g, enerji kcal/100g). Katalog sözleşmesinden
 * (CatalogNutrition100g) farklı olarak `fat` (toplam yağ) alanını da taşır —
 * yalnızca bu modülün toplam-tutarlılık kontrolleri (bkz.
 * contributionValidation.ts) için gereklidir; sunucuya senkron olduğunda
 * eşleme ayrı bir görevin konusudur.
 */
export interface UserContributedNutrition100g {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  proteins: number | null;
  salt: number | null;
}

export const emptyUserContributedNutrition100g: UserContributedNutrition100g = {
  energyKcal: null,
  fat: null,
  saturatedFat: null,
  carbohydrates: null,
  sugars: null,
  fiber: null,
  proteins: null,
  salt: null,
};

export interface CapturedContributionPhotos {
  front: string | null;
  ingredients: string | null;
  nutrition: string | null;
}

/**
 * Kullanıcının onayladığı, cihazda saklanan katkı.
 * `dataSource` sabit 'user_contributed'dir (ProductFactsSource'un bir alt
 * kümesi — bkz. price/types.ts) ve `verified` sabit `false`dur: bu iki alan
 * hiçbir kod yolunda değiştirilemez biçimde tip düzeyinde sabitlenmiştir —
 * "asla doğrulanmış sayılmaz" kuralı derleme zamanında güvenceye alınır.
 */
export interface UserContributedProduct {
  gtin: string;
  name: string;
  brand: string | null;
  quantityText: string | null;
  ingredientsText: string | null;
  nutrition100g: UserContributedNutrition100g;
  /** Kullanıcının işaretlediği alerjenler — boş başlar, hiçbir zaman ön doldurulmaz. */
  declaredAllergens: AllergenKey[];
  photos: CapturedContributionPhotos;
  entryMethod: ContributionEntryMethod;
  dataSource: 'user_contributed';
  verified: false;
  createdAt: string;
}
