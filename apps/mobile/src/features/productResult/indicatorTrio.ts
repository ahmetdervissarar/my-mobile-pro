/**
 * RafSkoru — Üç Küçük Gösterge: RafSkoru · Nutri-Score · İşlenmişlik (NOVA)
 * src/features/productResult/indicatorTrio.ts
 *
 * Katmanlı sadeleştirme (onaylı plan, madde 3): puan yoksa büyük halka
 * DEĞİL, kutuda "—" + "Veri yetersiz". Profil çakışması varsa RafSkoru
 * kutusunda hüküm kelimesi yerine "Alerjen uyarısı öncelikli".
 * scoreBand.ts gibi RN'siz tutulur (src/ui/theme.ts react-native içe aktarır)
 * — böylece plain Node/tsx altında test edilebilir.
 */
import { getScoreBand } from '../../ui/scoreBand';

export type IndicatorColorToken = 'leaf' | 'pine2' | 'warn' | 'danger' | 'muted';

export interface IndicatorConfig {
  label: string;
  value: string;
  colorToken: IndicatorColorToken;
  statusText: string;
}

export function getRafScoreIndicator(score: number | null, allergenPriority: boolean): IndicatorConfig {
  if (allergenPriority) {
    return { label: 'RafSkoru', value: '—', colorToken: 'muted', statusText: 'Alerjen uyarısı öncelikli' };
  }
  if (score === null) {
    return { label: 'RafSkoru', value: '—', colorToken: 'muted', statusText: 'Veri yetersiz' };
  }

  const band = getScoreBand(score);
  return {
    label: 'RafSkoru',
    value: String(Math.round(score)),
    colorToken: band?.colorToken ?? 'muted',
    statusText: band?.label ?? 'Veri yetersiz',
  };
}

type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

const NUTRI_SCORE_COLOR_TOKEN: Record<NutriScoreGrade, IndicatorColorToken> = {
  A: 'leaf',
  B: 'leaf',
  C: 'warn',
  D: 'warn',
  E: 'danger',
};

export function getNutriScoreIndicator(grade: NutriScoreGrade | null): IndicatorConfig {
  if (!grade) {
    return { label: 'Nutri-Score', value: '—', colorToken: 'muted', statusText: 'Veri yetersiz' };
  }

  return {
    label: 'Nutri-Score',
    value: grade,
    colorToken: NUTRI_SCORE_COLOR_TOKEN[grade],
    statusText: `Nutri-Score ${grade}`,
  };
}

type NovaGroup = 1 | 2 | 3 | 4;

const NOVA_COLOR_TOKEN: Record<NovaGroup, IndicatorColorToken> = {
  1: 'leaf',
  2: 'leaf',
  3: 'warn',
  4: 'danger',
};

const NOVA_STATUS_TEXT: Record<NovaGroup, string> = {
  1: 'Az işlenmiş',
  2: 'İşlenmiş malzeme',
  3: 'İşlenmiş gıda',
  4: 'Ultra işlenmiş',
};

export function getNovaIndicator(group: NovaGroup | null): IndicatorConfig {
  if (!group) {
    return { label: 'İşlenmişlik', value: '—', colorToken: 'muted', statusText: 'Veri yetersiz' };
  }

  return {
    label: 'İşlenmişlik',
    value: String(group),
    colorToken: NOVA_COLOR_TOKEN[group],
    statusText: NOVA_STATUS_TEXT[group],
  };
}
