/**
 * RafSkoru — Nutri-Score Rozeti
 * src/ui/NutriScoreBadge.tsx
 */

import { Text, View } from 'react-native';

import { radii, spacing, useTheme } from './theme';

const GRADES = ['A', 'B', 'C', 'D', 'E'] as const;
type Grade = (typeof GRADES)[number];

const GRADE_COLORS: Record<Grade, string> = {
  A: '#2E9E5B',
  B: '#8BC34A',
  C: '#F5B700',
  D: '#F08C00',
  E: '#B42318',
};

export interface NutriScoreBadgeProps {
  grade: Grade | null;
  /** 'off' ise erişilebilirlik etiketine "Open Food Facts verisi", 'rafskoru_computed' ise "(hesaplanmış)" eklenir. */
  source?: 'rafskoru_computed' | 'off' | null;
  /** 'not_applicable' ise OFF bu ürün için Nutri-Score'un uygulanamaz olduğunu belirtmiştir. */
  status?: 'computed' | 'off' | 'insufficient_data' | 'not_applicable' | null;
}

export function NutriScoreBadge({ grade, source, status }: NutriScoreBadgeProps) {
  const { colors } = useTheme();

  const baseLabel =
    status === 'not_applicable' ? 'Nutri-Score: Uygulanamaz' : grade ? `Nutri-Score ${grade}` : 'Nutri-Score: veri yok';
  const qualifier =
    source === 'off' && grade ? ' (Open Food Facts verisi)' : source === 'rafskoru_computed' && grade ? ' (hesaplanmış)' : '';
  const label = `${baseLabel}${qualifier}`;

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
      accessibilityLabel={label}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: radii.sm,
          padding: 1,
          backgroundColor: colors.soft,
        }}
      >
        {GRADES.map((letter) => {
          const isActive = grade === letter;
          return (
            <Text
              key={letter}
              style={{
                fontSize: isActive ? 13 : 10,
                fontWeight: '800',
                width: isActive ? 22 : 14,
                height: isActive ? 24 : 18,
                lineHeight: isActive ? 24 : 18,
                textAlign: 'center',
                borderRadius: isActive ? 6 : 4,
                marginHorizontal: 0.5,
                color: '#fff',
                backgroundColor: GRADE_COLORS[letter],
                opacity: isActive ? 1 : 0.35,
                overflow: 'hidden',
              }}
            >
              {letter}
            </Text>
          );
        })}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>{baseLabel}</Text>
    </View>
  );
}
