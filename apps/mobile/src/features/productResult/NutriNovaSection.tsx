import { View } from 'react-native';

import { NovaBadge } from '../../ui/NovaBadge';
import { NutriScoreBadge } from '../../ui/NutriScoreBadge';
import { spacing } from '../../ui/theme';

export interface NutriNovaSectionProps {
  nutriScoreGrade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  novaGroup: 1 | 2 | 3 | 4 | null;
}

export function NutriNovaSection({ nutriScoreGrade, novaGroup }: NutriNovaSectionProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
      <NutriScoreBadge grade={nutriScoreGrade} />
      <NovaBadge group={novaGroup} />
    </View>
  );
}
