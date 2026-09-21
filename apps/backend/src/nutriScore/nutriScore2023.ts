// Nutri-Score 2023 (Santé publique France güncellemesi; içecekler dahil) — deterministik hesaplayıcı.
// Kurallar:
//  - Girdi yoksa tahmin yok: zorunlu besin eksikse sonuç 'insufficient_data'.
//  - Meyve/sebze/baklagil oranı bilinmiyorsa 0 kabul edilir ve bu varsayım sonuçta açıkça yazılır.
//  - Kategori (genel / içecek / su / peynir / yağ-kuruyemiş-tohum / kırmızı et) ürün kaydından gelir;
//    ürün adından çıkarılmaz.
//  - Alerjen ile ilgisi yoktur; alerjen kapısı ayrı ve bağımsızdır.

export const NUTRISCORE_ALGORITHM_VERSION = 'nutriscore-2023';

export type NutriScoreCategory =
  | 'general' | 'cheese' | 'red_meat' | 'fat_oil_nuts_seeds' | 'beverage' | 'water' | 'not_applicable';

export interface NutriScoreInput {
  category: NutriScoreCategory;
  /** 100 g (içecekte 100 ml) başına değerler. kJ yoksa kcal verilir, kJ = kcal × 4,184. */
  energyKj?: number | null;
  energyKcal?: number | null;
  sugars?: number | null;
  saturatedFat?: number | null;
  /** Yağ-kuruyemiş-tohum kategorisinde zorunlu (doymuş yağ / toplam yağ oranı için). */
  fat?: number | null;
  salt?: number | null;
  /** Tuz yoksa sodyum verilebilir; tuz = sodyum × 2,5. */
  sodium?: number | null;
  proteins?: number | null;
  fiber?: number | null;
  /** Meyve, sebze, baklagil yüzdesi (0–100). Bilinmiyorsa null → 0 varsayılır ve işaretlenir. */
  fruitsVegLegumesPercent?: number | null;
  /** Yalnız içecekler: kalorisiz tatlandırıcı (E950, E951, E955, E960 …) var mı? Bilinmiyorsa null. */
  hasNonNutritiveSweeteners?: boolean | null;
}

export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type NutriScoreResult =
  | {
      status: 'computed';
      grade: NutriScoreGrade;
      score: number;
      negativePoints: number;
      positivePoints: number;
      components: Record<string, number>;
      proteinsCounted: boolean;
      assumptions: string[];
      algorithmVersion: string;
    }
  | { status: 'not_applicable'; reason: string; algorithmVersion: string }
  | { status: 'insufficient_data'; missing: string[]; algorithmVersion: string };

// "değer > eşik" sayısı kadar puan.
const above = (v: number, thresholds: number[]) => thresholds.filter((t) => v > t).length;
// "değer ≥ eşik" sayısı kadar puan (oran bileşeni için).
const atLeast = (v: number, thresholds: number[]) => thresholds.filter((t) => v >= t).length;

const T = {
  energyKj: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  sugars: [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51],
  saturatedFat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  salt: [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4],
  proteins: [2.4, 4.8, 7.2, 9.6, 12, 14, 17],
  fiber: [3.0, 4.1, 5.2, 6.3, 7.4],
  // Yağ-kuruyemiş-tohum
  energyFromSatFatKj: [120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200],
  satFatRatio: [10, 16, 22, 28, 34, 40, 46, 52, 58, 64],
  // İçecek
  bevEnergyKj: [30, 90, 150, 210, 240, 270, 300, 330, 360, 390],
  bevSugars: [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11],
  bevProteins: [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0],
};

function fvlPoints(pct: number, beverage: boolean): number {
  if (beverage) return pct > 80 ? 6 : pct > 60 ? 4 : pct > 40 ? 2 : 0;
  return pct > 80 ? 5 : pct > 60 ? 2 : pct > 40 ? 1 : 0;
}

function gradeFor(score: number, category: NutriScoreCategory): NutriScoreGrade {
  if (category === 'beverage') return score <= 2 ? 'B' : score <= 6 ? 'C' : score <= 9 ? 'D' : 'E';
  const aMax = category === 'fat_oil_nuts_seeds' ? -6 : 0;
  return score <= aMax ? 'A' : score <= 2 ? 'B' : score <= 10 ? 'C' : score <= 18 ? 'D' : 'E';
}

const ok = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function computeNutriScore2023(input: NutriScoreInput): NutriScoreResult {
  const v = NUTRISCORE_ALGORITHM_VERSION;
  const c = input.category;
  if (c === 'not_applicable') return { status: 'not_applicable', reason: 'Bu ürün sınıfı Nutri-Score kapsamında değil.', algorithmVersion: v };
  if (c === 'water') {
    return { status: 'computed', grade: 'A', score: 0, negativePoints: 0, positivePoints: 0, components: {}, proteinsCounted: false, assumptions: [], algorithmVersion: v };
  }

  const energyKj = ok(input.energyKj) ? input.energyKj : ok(input.energyKcal) ? input.energyKcal * 4.184 : null;
  const salt = ok(input.salt) ? input.salt : ok(input.sodium) ? input.sodium * 2.5 : null;
  const beverage = c === 'beverage';
  const fatCat = c === 'fat_oil_nuts_seeds';

  const missing: string[] = [];
  if (energyKj === null) missing.push('energy');
  if (!ok(input.sugars)) missing.push('sugars');
  if (!ok(input.saturatedFat)) missing.push('saturatedFat');
  if (salt === null) missing.push('salt');
  if (!ok(input.proteins)) missing.push('proteins');
  if (fatCat && !ok(input.fat)) missing.push('fat');
  if (missing.length) return { status: 'insufficient_data', missing, algorithmVersion: v };

  const assumptions: string[] = [];
  const fiber = ok(input.fiber) ? input.fiber : (assumptions.push('fiber_assumed_0'), 0);
  const fvl = ok(input.fruitsVegLegumesPercent) ? Math.min(100, input.fruitsVegLegumesPercent) : (assumptions.push('fvl_assumed_0'), 0);

  const comp: Record<string, number> = {};
  if (beverage) {
    comp.energy = above(energyKj!, T.bevEnergyKj);
    comp.sugars = above(input.sugars!, T.bevSugars);
    comp.saturatedFat = above(input.saturatedFat!, T.saturatedFat);
    comp.salt = above(salt!, T.salt);
    if (input.hasNonNutritiveSweeteners === null || input.hasNonNutritiveSweeteners === undefined) assumptions.push('sweeteners_assumed_absent');
    comp.sweeteners = input.hasNonNutritiveSweeteners ? 4 : 0;
  } else if (fatCat) {
    const fat = input.fat!;
    comp.energyFromSatFat = above(input.saturatedFat! * 37, T.energyFromSatFatKj);
    comp.sugars = above(input.sugars!, T.sugars);
    comp.satFatRatio = fat > 0 ? atLeast((input.saturatedFat! / fat) * 100, T.satFatRatio) : 0;
    comp.salt = above(salt!, T.salt);
  } else {
    comp.energy = above(energyKj!, T.energyKj);
    comp.sugars = above(input.sugars!, T.sugars);
    comp.saturatedFat = above(input.saturatedFat!, T.saturatedFat);
    comp.salt = above(salt!, T.salt);
  }
  const negativePoints = Object.values(comp).reduce((a, b) => a + b, 0);

  let proteinPts = above(input.proteins!, beverage ? T.bevProteins : T.proteins);
  if (c === 'red_meat') proteinPts = Math.min(proteinPts, 2);
  const fiberPts = above(fiber, T.fiber);
  const fvlPts = fvlPoints(fvl, beverage);

  // Protein, olumsuz puan eşiğini aşan katı gıdalarda sayılmaz (peynir ve içecekler hariç).
  const threshold = fatCat ? 7 : 11;
  const proteinsCounted = beverage || c === 'cheese' || negativePoints < threshold;
  comp.proteins = proteinsCounted ? proteinPts : 0;
  comp.fiber = fiberPts;
  comp.fruitsVegLegumes = fvlPts;
  const positivePoints = comp.proteins + fiberPts + fvlPts;

  const score = negativePoints - positivePoints;
  return {
    status: 'computed', grade: gradeFor(score, c), score, negativePoints, positivePoints,
    components: comp, proteinsCounted, assumptions, algorithmVersion: v,
  };
}
