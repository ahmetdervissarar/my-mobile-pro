/**
 * RafSkoru — Nutri-Score Rozeti
 * src/ui/NutriScoreBadge.tsx
 */

import { Text, View } from 'react-native';

import type { CatalogNutriScoreSource, CatalogNutriScoreStatus } from '../api/catalogTypes';
import { getNutriScoreBadgeLabels } from './nutriScoreBadgeLabel';
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
  /**
   * Notun kaynağı erişilebilirlik etiketinde söylenir: 'off' → "Open Food Facts
   * verisi", 'rafskoru_computed' → "hesaplanmış", 'rafskoru_label' → "onaylı
   * etiket değerlerinden hesaplanmış" (bkz. nutriScoreBadgeLabel.ts).
   */
  source?: CatalogNutriScoreSource;
  /** 'not_applicable' ise OFF bu ürün için Nutri-Score'un uygulanamaz olduğunu belirtmiştir. */
  status?: CatalogNutriScoreStatus | null;
  /** true ise yalnız küçük harf simgesi gösterilir, metin etiketi YOK (ör. arama kartı satır 3). Erişilebilirlik etiketi hep tam metindir. */
  compact?: boolean;
}

export function NutriScoreBadge({ grade, source, status, compact = false }: NutriScoreBadgeProps) {
  const { colors } = useTheme();

  const { baseLabel, label } = getNutriScoreBadgeLabels({ grade, source, status });

  if (compact) {
    return (
      <View
        accessibilityLabel={label}
        style={{
          width: 22,
          height: 24,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: grade ? GRADE_COLORS[grade] : colors.soft,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '800', color: grade ? '#fff' : colors.muted }}>{grade ?? '—'}</Text>
      </View>
    );
  }

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
