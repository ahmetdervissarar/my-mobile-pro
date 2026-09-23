/**
 * RafSkoru — Küçük Puan Rozeti
 * src/ui/ScorePill.tsx
 *
 * Liste satırlarında (arama, sepet) tam halka yerine kullanılan kompakt gösterim.
 */

import { Text, View } from 'react-native';

import { getScorePillLabel } from './scoreVerdict';
import { getScoreBand, radii, spacing, useTheme } from './theme';

export interface ScorePillProps {
  score: number | null;
  /** Profille çakışan alerjen varsa true — hüküm kelimesi bastırılır (bkz. P2 invariant). */
  allergenPriority?: boolean;
  /** Grup tahmini puan — hüküm kelimesi bastırılır, yalnız "Tahmini: N" gösterilir. */
  isEstimate?: boolean;
}

export function ScorePill({ score, allergenPriority = false, isEstimate = false }: ScorePillProps) {
  const { colors } = useTheme();
  const suppressVerdict = allergenPriority || isEstimate;
  const band = suppressVerdict ? null : getScoreBand(score);
  const color = suppressVerdict ? colors.muted : band ? colors[band.colorToken] : colors.muted;
  const label = getScorePillLabel({ score, allergenPriority, isEstimate });

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
        allergenPriority
          ? 'RafSkoru: alerjen uyarısı öncelikli'
          : isEstimate
            ? `RafSkoru tahmini ${score === null ? 'veri yok' : Math.round(score)}`
            : score === null
              ? 'RafSkoru: veri yok'
              : `RafSkoru ${Math.round(score)}, ${band?.label ?? ''}`
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
      <Text style={{ fontSize: 12, fontWeight: '700', color: suppressVerdict ? colors.muted : colors.ink }}>
        {label}
      </Text>
    </View>
  );
}
