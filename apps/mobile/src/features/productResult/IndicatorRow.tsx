import { View } from 'react-native';

import { IndicatorBox } from '../../ui/IndicatorBox';
import { spacing } from '../../ui/theme';
import { getNovaIndicator, getNutriScoreIndicator, getRafScoreIndicator } from './indicatorTrio';

export interface IndicatorRowProps {
  rafScore: number | null;
  nutriScoreGrade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  novaGroup: 1 | 2 | 3 | 4 | null;
  /** Profille çakışan alerjen varsa true — RafSkoru kutusunda hüküm kelimesi bastırılır. */
  allergenPriority: boolean;
}

/** Üç küçük gösterge: RafSkoru · Nutri-Score · İşlenmişlik (NOVA), yan yana. */
export function IndicatorRow({ rafScore, nutriScoreGrade, novaGroup, allergenPriority }: IndicatorRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <IndicatorBox {...getRafScoreIndicator(rafScore, allergenPriority)} />
      <IndicatorBox {...getNutriScoreIndicator(nutriScoreGrade)} />
      <IndicatorBox {...getNovaIndicator(novaGroup)} />
    </View>
  );
}
