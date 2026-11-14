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
  /**
   * İş 3 (feat/ui-clarity, görev onayı): TEK eylem/marka rengi — "Sepete
   * ekle", alt menü etkin sekme, ana ekran barkod kartı ve bağlantı
   * metinleri hepsi BU token'ı kullanır. Önceki `citrus` (sarı/gold) sarı
   * uyarı rengiyle (`caution`) karışıyordu; bu yüzden tamamen kaldırıldı —
   * hiçbir eylem öğesi artık uyarı renklerinden (kırmızı/turuncu/sarı/yeşil)
   * birini kullanmıyor. Kontrast (WCAG AA, ≥4.5:1, doğrulandı):
   *   light: accent-üzeri onAccent metni 5.22:1; accent metin/ikon olarak
   *     bg üzerinde 4.79:1, surface üzerinde 5.22:1.
   *   dark: accent-üzeri onAccent metni 7.55:1; accent metin/ikon olarak
   *     bg üzerinde 7.55:1, surface üzerinde 6.83:1.
   */
  accent: string;
  /** accent arka planı üzerindeki metin/ikon rengi — temaya göre değişir (bkz. accent). */
  onAccent: string;
  danger: string;
  dangerBg: string;
  warn: string;
  warnBg: string;
  caution: string;
  cautionBg: string;
  info: string;
  infoBg: string;
}

export const lightColors: ThemeColors = {
  bg: '#F2F6F3',
  surface: '#FFFFFF',
  ink: '#13241C',
  muted: '#5A6B62',
  line: '#DCE5DF',
  soft: '#E8EFEA',
  pine: '#0F3D2E',
  pine2: '#18583F',
  leaf: '#2E9E5B',
  accent: '#1D6FB8',
  onAccent: '#FFFFFF',
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
  accent: '#5AA9FF',
  onAccent: '#0D1512',
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

/**
 * İş 3 (feat/ui-clarity, görev onayı): 4 boyuta indirildi — başlık/ürün
 * adı/gövde/küçük not. Önceki 7 token (h1/h2/title/body/label/caption/
 * small) hiçbir yerde kullanılmıyordu (her bileşen kendi fontSize'ını
 * elle yazıyordu) — bu yüzden saf bir "token sayısı azaltma" değil,
 * gerçek kullanıma geçiş: ürün sayfası ve alt bileşenleri artık bu 4
 * token'ı referans alır (bkz. ProductHero, CollapsibleSection,
 * WarningsSection, PositivesSection, FooterSection, AllergenDetailSheet,
 * LegalNoticeModal). Kapsam yalnız ürün sayfası — tüm uygulamanın her
 * fontSize'ı bu görevde değiştirilmedi.
 */
export const typography = {
  title: { fontSize: 17, fontWeight: '800' as const },
  productName: { fontSize: 22, fontWeight: '800' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  small: { fontSize: 11.5, fontWeight: '700' as const },
};

/** Erişilebilirlik: her dokunulabilir öğe için en küçük hedef alan (44 pt). */
export const MIN_TOUCH_TARGET = 44;

export type { ScoreBand, ScoreBandKey } from './scoreBand';
export { getScoreBand } from './scoreBand';

export function useTheme(): { colors: ThemeColors; scheme: ColorScheme } {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: scheme === 'dark' ? darkColors : lightColors, scheme };
}
