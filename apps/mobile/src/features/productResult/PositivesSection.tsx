import { Text, View } from 'react-native';

import { EmptyState } from '../../ui/EmptyState';
import { radii, spacing, useTheme } from '../../ui/theme';

export interface PositivesSectionProps {
  items: string[];
}

/**
 * "Olumlu yönler" — yalnızca backend'in severity='positive' işaretlediği
 * rafScore gerekçelerini gösterir (bkz. rafScoreExplanation.ts). Skor
 * mantığı üretmez; hiçbir alan tahminle doldurulmaz.
 */
export function PositivesSection({ items }: PositivesSectionProps) {
  const { colors } = useTheme();

  if (items.length === 0) {
    return (
      <EmptyState
        title="Olumlu yönler"
        message="Bu ürün için öne çıkan bir olumlu gerekçe bulunamadı."
      />
    );
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
