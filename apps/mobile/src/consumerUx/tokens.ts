/**
 * RafSkoru — Tüketici karar akışı V2 tasarım sistemi (Aşama 8).
 * src/consumerUx/tokens.ts
 *
 * Küçük, tutarlı bir jeton kümesi: yeni paket/görsel varlık YOK, yalnız React Native
 * `StyleSheet` ile uyumlu düz nesneler. RafSkoru karakteri "karar + kanıt + eksik veri
 * dürüstlüğü"dür — Yuka'nın tek renkli puan modelini KOPYALAMAZ: burada tek bir "genel puan
 * rengi" yoktur; her yüzey kendi anlamını (alerjen/karar/kanıt/skor) ayrı ikon+metinle taşır.
 * Renk hiçbir yerde TEK başına anlam taşımaz (erişilebilirlik ilkesi).
 */

export const color = {
  // Yüzeyler
  surface: '#FFFFFF',
  surfaceMuted: '#F7F7F5',
  surfaceSunken: '#F1F0EC',
  border: '#DEDBD3',
  borderStrong: '#B9B4A6',

  // Metin
  ink: '#1C1A16',
  inkMuted: '#5B564C',
  inkFaint: '#8C8676',

  // Marka vurgusu (RafSkoru karakteri: sıcak toprak/amber — Yuka'nın kırmızı/yeşil/turuncu trafik ışığından kasıtlı olarak uzak)
  brand: '#7A4A1E',
  brandMuted: '#EFE4D5',

  // Alerjen kapısı — dört durum, renk ASLA tek başına anlam taşımaz (ikon+başlık+metin birlikte)
  allergenDeclared: '#8A2E1F', // "Beyana göre içerir"
  allergenDeclaredSurface: '#FBEAE6',
  allergenDeclaredBorder: '#E7B8AC',
  allergenTrace: '#8A5A12', // "İçerebilir"
  allergenTraceSurface: '#FBF0DC',
  allergenTraceBorder: '#E9CB93',
  allergenNotListed: '#3D3A33', // "Belirtilmemiş" — nötr, olumlu değil
  allergenNotListedSurface: '#F1F0EC',
  allergenNotListedBorder: '#CFCABC',
  allergenUnknown: '#3D3A33', // "Veri yok / doğrulanmamış" — nötr, olumlu değil
  allergenUnknownSurface: '#F1F0EC',
  allergenUnknownBorder: '#CFCABC',

  // Karar özeti tonları (olumlu iddia yok; yalnız bilgi yoğunluğu/eksiklik iletir)
  decisionCalm: '#3D5A3D',
  decisionCalmSurface: '#EAF1E7',
  decisionCaution: '#8A5A12',
  decisionCautionSurface: '#FBF0DC',
  decisionUnknown: '#5B564C',
  decisionUnknownSurface: '#F1F0EC',

  // Kanıt / veri güveni şeridi
  trustOk: '#3D5A3D',
  trustPartial: '#8A5A12',
  trustMissing: '#8C8676',
  trustConflict: '#8A2E1F',

  // Odak/basma
  focusRing: '#1C1A16',
  pressedOverlay: 'rgba(28,26,22,0.06)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.4 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '700' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
} as const;

/** Dokunma alanı en az 48 pt (consumer-ux erişilebilirlik kuralı). */
export const MIN_TOUCH_TARGET = 48;

/** Geliştirme önizlemesi/aday veri etiketi — her yerde AYNI metin (tutarlılık). */
export const DEV_PREVIEW_LABEL = 'GELİŞTİRME ÖNİZLEMESİ — gerçek veri değil';
