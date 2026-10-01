import { Text, View } from 'react-native';

import { radii, spacing, useTheme } from '../../ui/theme';

export interface PositivesSectionProps {
  items: string[];
}

/**
 * "Dikkat edilecekler" bölümünün olumlu yönler listesi — yalnızca backend'in
 * severity='positive' işaretlediği rafScore gerekçelerini gösterir (bkz.
 * rafScoreExplanation.ts). Skor mantığı üretmez. Boşsa HİÇBİR ŞEY döndürmez
 * (bkz. WarningsSection'daki aynı gerekçe).
 */
export function PositivesSection({ items }: PositivesSectionProps) {
  const { colors } = useTheme();

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        borderRadius: radii.md,
        backgroundColor: colors.soft,
        padding: spacing.md,
        gap: 6,
      }}
    >
      {items.map((item) => (
        <Text key={item} style={{ fontSize: 13.5, color: colors.ink, lineHeight: 19 }}>
          • {item}
        </Text>
      ))}
    </View>
  );
}
