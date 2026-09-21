/**
 * RafSkoru — Puan Halkası
 * src/ui/ScoreRing.tsx
 *
 * react-native-svg kullanmadan, iki yarım daire View'ının döndürülmesiyle
 * (translate → rotate → translate ekseni kaydırma tekniği) çizilir.
 */

import { Text, View } from 'react-native';

import { getScoreBand, spacing, useTheme } from './theme';

export interface ScoreRingProps {
  score: number | null;
  size?: number;
  thickness?: number;
  /** Halka altında/merkezinde gösterilecek küçük etiket (ör. "RafSkoru"). */
  caption?: string;
}

export function ScoreRing({ score, size = 132, thickness = 12, caption }: ScoreRingProps) {
  const { colors } = useTheme();
  const band = getScoreBand(score);
  const activeColor = band ? colors[band.colorToken] : colors.muted;
  const radius = size / 2;
  const percentage = score === null ? 0 : Math.max(0, Math.min(100, score));

  const rightRotation = percentage > 50 ? 180 : (percentage / 50) * 180;
  const leftRotation = percentage > 50 ? ((percentage - 50) / 50) * 180 : 0;

  const halfDiscStyle = {
    width: radius,
    height: size,
    backgroundColor: percentage > 0 ? activeColor : 'transparent',
  } as const;

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="image"
        accessibilityLabel={
          score === null
            ? 'RafSkoru henüz hesaplanmadı'
            : `RafSkoru ${Math.round(score)} üzerinden 100, ${band?.label ?? ''}`
        }
      >
        <View style={{ position: 'absolute', width: size, height: size, flexDirection: 'row' }}>
          <View style={{ width: radius, height: size, overflow: 'hidden' }}>
            <View
              style={[
                halfDiscStyle,
                {
                  borderTopLeftRadius: radius,
                  borderBottomLeftRadius: radius,
                  transform: [
                    { translateX: radius },
                    { rotate: `${leftRotation}deg` },
                    { translateX: -radius },
                  ],
                },
              ]}
            />
          </View>
          <View style={{ width: radius, height: size, overflow: 'hidden' }}>
            <View
              style={[
                halfDiscStyle,
                {
                  borderTopRightRadius: radius,
                  borderBottomRightRadius: radius,
                  transform: [
                    { translateX: -radius },
                    { rotate: `${rightRotation}deg` },
                    { translateX: radius },
                  ],
                },
              ]}
            />
          </View>
        </View>

        <View
          style={{
            width: size - thickness * 2,
            height: size - thickness * 2,
            borderRadius: (size - thickness * 2) / 2,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>
            {score === null ? '—' : Math.round(score)}
          </Text>
          {caption ? (
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>{caption}</Text>
          ) : null}
        </View>
      </View>

      <Text
        style={{ fontSize: 14, fontWeight: '700', color: activeColor }}
        accessibilityElementsHidden
      >
        {band ? band.label : 'Veri yok'}
      </Text>
    </View>
  );
}
