/**
 * RafSkoru — Küçük Puan Rozeti
 * src/ui/ScorePill.tsx
 *
 * Liste satırlarında (arama, sepet) tam halka yerine kullanılan kompakt gösterim.
 */

import { Text, View } from 'react-native';

import { getScoreBand, radii, spacing, useTheme } from './theme';

export interface ScorePillProps {
  score: number | null;
}

export function ScorePill({ score }: ScorePillProps) {
  const { colors } = useTheme();
  const band = getScoreBand(score);
  const color = band ? colors[band.colorToken] : colors.muted;
  const label = score === null ? 'Puan: Veri yok' : `Puan: ${Math.round(score)} · ${band?.label ?? ''}`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        borderRadius: radii.pill,
        paddingVertical: 3,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.soft,
      }}
      accessibilityLabel={
        score === null ? 'RafSkoru: veri yok' : `RafSkoru ${Math.round(score)}, ${band?.label ?? ''}`
      }
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{label}</Text>
    </View>
  );
}
