/**
 * RafSkoru — Fiyatsız Değerlendirme Tespiti (saf, RN'siz)
 * src/price/rafScorePriceless.ts
 *
 * Onaylı KARAR: fiyat bileşeni eksikken kalan boyutlardan renormalize
 * edilmiş bir puan üretiliyor. Bu tek fonksiyon, ürün sayfası/arama/
 * kategori listesinin HEPSİNİN aynı "fiyatsız mı?" kuralını kullanmasını
 * sağlar — her yerde ayrı ayrı yazılmaz.
 */
import type { RafScoreResult } from './types';

export function isRafScorePriceless(rafScore: RafScoreResult | null | undefined): boolean {
  if (!rafScore || rafScore.score === null) return false;
  return rafScore.components.find((component) => component.key === 'price')?.isAvailable === false;
}
