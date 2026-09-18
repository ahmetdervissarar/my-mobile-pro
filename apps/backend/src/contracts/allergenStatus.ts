/**
 * RafSkoru contracts — alerjen veri durumu.
 *
 * Alerjen bir güvenlik kapısıdır, puan değildir (P2). Dört durum asla birleştirilmez ve
 * hiçbiri "güvenli" anlamına gelmez (D1). Bu dosya profil eşleşmesi veya risk motoru
 * içermez; yalnız ürün düzeyindeki veri durumunu modeller.
 */

import type { FieldSource, ReadableDeclarationSource } from './provenance.js';

/** Ürün düzeyinde tek bir alerjen için veri durumu. */
export type AllergenDataState =
  | 'declared_contains'
  | 'trace_may_contain'
  | 'not_listed_in_available_data'
  | 'unknown_or_unverified';

/**
 * Beyanın (alerjen listesinin) kendisinin durumu.
 * - readable: güncel ve okunabilir alerjen beyanı mevcut (yapılandırılmış OFF etiketi,
 *   doğrulanmış etiket kaydı vb.).
 * - unreadable: beyan var ama okunamıyor/eksik (OCR başarısız, kısmi görsel).
 * - absent: hiçbir beyan kaydı yok.
 */
export type AllergenDeclarationStatus = 'readable' | 'unreadable' | 'absent';

/**
 * Ürün düzeyi alerjen beyanı (discriminated union). Etiket/kaynak sözlüğünden gelen tag'ler
 * ham hâliyle taşınır. `readable` beyanın kaynağı zorunlu, null olamaz ve
 * `ReadableDeclarationSource` ile sınırlıdır: kaynağı belirsiz, OCR veya çıkarım kaynaklı
 * bir beyan okunabilir sayılmaz.
 */
export type AllergenDeclaration =
  | {
      status: 'readable';
      declaredTags: ReadonlyArray<string>;
      traceTags: ReadonlyArray<string>;
      /** Yalnız `off | rafskoru_verified | manufacturer`; OCR/çıkarım kaynaklı beyan okunabilir sayılmaz. */
      source: ReadableDeclarationSource;
    }
  | {
      status: 'unreadable';
      declaredTags: ReadonlyArray<string>;
      traceTags: ReadonlyArray<string>;
      source: FieldSource | null;
    }
  | {
      status: 'absent';
      declaredTags: readonly [];
      traceTags: readonly [];
      source: null;
    };

export interface AllergenStateEntry {
  allergenTag: string;
  state: AllergenDataState;
}

/**
 * Tek bir alerjen için durum türetir.
 *
 * Kural (Aşama 4A madde 4): `not_listed_in_available_data` yalnız beyan `readable` iken ve
 * ilgili alerjen ne beyan ne iz listesinde değilse üretilir. Beyan `unreadable` veya
 * `absent` ise sonuç her zaman `unknown_or_unverified`.
 *
 * Bu fonksiyon tag eşleştirmesini normalize etmez; çağıran taraf sözlük eşlemesini tek
 * yerde uygulamalıdır (allergen-safety skill). Ürün adı/kategori/LLM çıkarımı girdi olamaz.
 */
export function deriveAllergenState(
  declaration: AllergenDeclaration,
  allergenTag: string,
): AllergenDataState {
  if (declaration.status !== 'readable') {
    return 'unknown_or_unverified';
  }
  if (declaration.declaredTags.includes(allergenTag)) {
    return 'declared_contains';
  }
  if (declaration.traceTags.includes(allergenTag)) {
    return 'trace_may_contain';
  }
  return 'not_listed_in_available_data';
}

/** Durumun olumlu bir uygunluk kararına dönüştürülmesi yasaktır; bu sabit UI/metin katmanı için hatırlatıcıdır. */
export const ALLERGEN_STATE_IS_NEVER_SAFE = true as const;
