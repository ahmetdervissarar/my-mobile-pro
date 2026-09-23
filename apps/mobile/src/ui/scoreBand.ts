/**
 * RafSkoru — Puan Bandı (saf mantık)
 * src/ui/scoreBand.ts
 *
 * theme.ts'ten AYRI tutulur: theme.ts react-native'i (useColorScheme) içe
 * aktardığından, onu içe aktaran hiçbir dosya tsx/esbuild ile RN'siz
 * (mobil'in kendi devDependency'si olmadan, backend'in tsx'i üzerinden)
 * çalıştırılamaz. Bu dosyanın saf kalması, scoreVerdict.smoke.ts gibi
 * testlerin RN'e dokunmadan çalışabilmesini sağlar. theme.ts bunu re-export
 * eder — mevcut `import { getScoreBand } from './theme'` çağrıları değişmez.
 */

export type ScoreBandKey = 'very_good' | 'good' | 'medium' | 'weak';

export interface ScoreBand {
  key: ScoreBandKey;
  label: string;
  colorToken: 'leaf' | 'pine2' | 'warn' | 'danger';
}

/**
 * Puan eşikleri: ≥75 Çok iyi, 50–74 İyi, 25–49 Orta, <25 Zayıf.
 * Renk tek başına anlam taşımaz; label her zaman birlikte gösterilmelidir.
 */
export function getScoreBand(score: number | null | undefined): ScoreBand | null {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return null;
  }

  if (score >= 75) return { key: 'very_good', label: 'Çok iyi', colorToken: 'leaf' };
  if (score >= 50) return { key: 'good', label: 'İyi', colorToken: 'pine2' };
  if (score >= 25) return { key: 'medium', label: 'Orta', colorToken: 'warn' };
  return { key: 'weak', label: 'Zayıf', colorToken: 'danger' };
}
