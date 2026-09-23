import { Text, View } from 'react-native';

import { NovaBadge } from '../../ui/NovaBadge';
import { NutriScoreBadge } from '../../ui/NutriScoreBadge';
import { spacing, useTheme } from '../../ui/theme';

export interface NutriNovaSectionProps {
  nutriScoreGrade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  novaGroup: 1 | 2 | 3 | 4 | null;
  /**
   * true ise, profildeki kronik eşik kurallarından (diyabet/hipertansiyon/
   * kalp-damar) en az biri için gerekli besin verisi eksik demektir. Bu bir
   * uyarı değil, nötr bir bilgi notudur (bkz. riskEngine.ts getChronicNutritionDataGap).
   */
  chronicNutritionDataGap?: boolean;
}

export function NutriNovaSection({ nutriScoreGrade, novaGroup, chronicNutritionDataGap }: NutriNovaSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
        <NutriScoreBadge grade={nutriScoreGrade} />
        <NovaBadge group={novaGroup} />
      </View>
      {chronicNutritionDataGap ? (
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Besin değeri verisi yok — etiketi kontrol edin.
        </Text>
      ) : null}
    </View>
  );
}
