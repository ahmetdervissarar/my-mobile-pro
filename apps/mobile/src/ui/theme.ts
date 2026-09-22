/**
 * RafSkoru — Ortak Tasarım Jetonları
 * src/ui/theme.ts
 *
 * Kaynak: docs/design/prototip-v3.html (:root ve dark-mode değişkenleri).
 * Bu dosya saf bir tasarım katmanıdır — veri, skor veya alerjen mantığı içermez.
 */

import { useColorScheme } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  soft: string;
  pine: string;
  pine2: string;
  leaf: string;
  citrus: string;
  danger: string;
  dangerBg: string;
  warn: string;
  warnBg: string;
  caution: string;
  cautionBg: string;
  info: string;
  infoBg: string;
}

const lightColors: ThemeColors = {
  bg: '#F2F6F3',
  surface: '#FFFFFF',
  ink: '#13241C',
  muted: '#5A6B62',
  line: '#DCE5DF',
  soft: '#E8EFEA',
  pine: '#0F3D2E',
  pine2: '#18583F',
  leaf: '#2E9E5B',
  citrus: '#F5B700',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  warn: '#9A4D00',
  warnBg: '#FFF2DD',
  caution: '#8A6D00',
  cautionBg: '#FFF9DB',
  info: '#44524B',
  infoBg: '#EDF1EF',
};

const darkColors: ThemeColors = {
  bg: '#0D1512',
  surface: '#15201B',
  ink: '#E6EEE9',
  muted: '#9AAFA4',
  line: '#27362E',
  soft: '#1C2A23',
  pine: '#123F30',
  pine2: '#1C5A43',
  leaf: '#2E9E5B',
  citrus: '#F5B700',
  danger: '#FF8A80',
  dangerBg: '#3A1714',
  warn: '#FFB74D',
  warnBg: '#382711',
  caution: '#FFD54F',
  cautionBg: '#332B05',
  info: '#C3D0C9',
  infoBg: '#1D2923',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2: { fontSize: 18, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '800' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 11.5, fontWeight: '700' as const },
};

/** Erişilebilirlik: her dokunulabilir öğe için en küçük hedef alan (44 pt). */
export const MIN_TOUCH_TARGET = 44;

export type ScoreBandKey = 'very_good' | 'good' | 'medium' | 'weak';

export interface ScoreBand {
  key: ScoreBandKey;
  label: string;
  colorToken: keyof ThemeColors;
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

export function useTheme(): { colors: ThemeColors; scheme: ColorScheme } {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: scheme === 'dark' ? darkColors : lightColors, scheme };
}
