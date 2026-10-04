import { Text, View } from 'react-native';

import { radii, spacing, typography, useTheme } from '../../ui/theme';

export interface PositivesSectionProps {
  items: string[];
}

/**
 * "Dikkat edilecekler" bölümünün olumlu yönler listesi — yalnızca backend'in
 * severity='positive' işaretlediği rafScore gerekçelerini gösterir (bkz.
 * rafScoreExplanation.ts). Skor mantığı üretmez. Boşsa HİÇBİR ŞEY döndürmez
 * (bkz. WarningsSection'daki aynı gerekçe).
 *
 * İş 3 (feat/ui-clarity, görev onayı): madde başındaki ✓ `leaf` (yeşil) —
 * "yeşil yalnız doğrulanmış olumlu durum" kuralı; metin gövdesi okunabilirlik
 * için `ink` kalır, yalnız işaretçi renklendirildi.
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
        <Text key={item} style={{ ...typography.body, color: colors.ink, lineHeight: 19 }}>
          <Text style={{ color: colors.leaf, fontWeight: '800' }}>✓ </Text>
          {item}
        </Text>
      ))}
    </View>
  );
}
