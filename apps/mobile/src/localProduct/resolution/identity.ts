/**
 * RafSkoru — Ürün kimliği eşleştirme kuralları (ADR-005).
 * src/localProduct/resolution/identity.ts
 *
 * - Aynı GTIN (14 haneye normalize) → `exact_gtin`. Farklı GTIN → asla birleştirilmez.
 * - Barkodsuz eşleşme yalnız marka + normalize ad + varyant + net miktar dördü de varken ADAY olur;
 *   biri eksikse aday bile olamaz. Benzer ad veya fotoğraf tek başına eşleşme değildir.
 */

import { isValidGtin } from '../gtin';
import type { CandidateIdentity, MatchLevel } from './types';

/** GTIN-8/12/13/14 → 14 haneli kanonik biçim (öndeki sıfırlar). Geçersizse null. */
export function normalizeGtin(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!isValidGtin(digits)) return null;
  return digits.padStart(14, '0');
}

export function isSameGtin(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeGtin(a);
  const nb = normalizeGtin(b);
  return na !== null && nb !== null && na === nb;
}

/** Türkçe büyük İ/I farkını Intl'e bağımlı olmadan giderir; noktalama ve fazla boşluk atılır. */
export function normalizeIdentityText(value: string | null | undefined): string | null {
  if (!value) return null;
  const lowered = value.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  const cleaned = lowered.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Net miktar metni: "400 G", "2l", "120gr" → "400 g", "2 l", "120 g". Anlaşılmazsa null. */
export function normalizeQuantityText(value: string | null | undefined): string | null {
  const text = normalizeIdentityText(value);
  if (!text) return null;
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|mg|l|lt|ml|cl|adet)$/);
  if (!match) return null;
  const amount = match[1].replace(',', '.');
  const unitMap: Record<string, string> = { gr: 'g', lt: 'l' };
  const unit = unitMap[match[2]] ?? match[2];
  return `${amount} ${unit}`;
}

/**
 * Barkodsuz aday anahtarı. Dört parça da zorunludur; eksikse null döner ve kaynak aday olamaz.
 * Anahtar eşitliği "aynı ürün" DEMEK DEĞİLDİR; yalnız insan doğrulaması için aday listesine girer.
 */
export function buildIdentityKey(identity: CandidateIdentity): string | null {
  const brand = normalizeIdentityText(identity.brand);
  const name = normalizeIdentityText(identity.productName);
  const variant = normalizeIdentityText(identity.variant);
  const quantity = normalizeQuantityText(identity.netQuantityText);
  if (!brand || !name || !variant || !quantity) return null;
  return `${brand}|${name}|${variant}|${quantity}`;
}

export function classifyMatch(queryGtin: string | null, candidate: CandidateIdentity): MatchLevel {
  if (queryGtin && candidate.gtin) {
    return isSameGtin(queryGtin, candidate.gtin) ? 'exact_gtin' : 'none';
  }
  return buildIdentityKey(candidate) ? 'candidate_no_gtin' : 'none';
}
