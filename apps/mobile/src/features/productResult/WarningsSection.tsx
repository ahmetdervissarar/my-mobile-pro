import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { RiskLevel, RiskWarning } from '../../riskEngine/riskEngine';
import { EmptyState } from '../../ui/EmptyState';
import { radii, spacing, useTheme } from '../../ui/theme';
import { riskLevelLabel } from './helpers';

export interface WarningsSectionProps {
  warnings: RiskWarning[];
}

function getRiskLevelColor(level: RiskLevel, colors: ReturnType<typeof useTheme>['colors']): string {
  if (level === 'high') return colors.danger;
  if (level === 'medium') return colors.warn;
  if (level === 'low') return colors.leaf;
  return colors.muted;
}

function getRiskCardBg(level: RiskLevel, colors: ReturnType<typeof useTheme>['colors']): string {
  if (level === 'high') return colors.dangerBg;
  if (level === 'medium') return colors.warnBg;
  if (level === 'low') return colors.soft;
  return colors.infoBg;
}

function WarningCard({ warning }: { warning: RiskWarning }) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View
      style={{
        borderRadius: radii.md,
        backgroundColor: getRiskCardBg(warning.level, colors),
        padding: spacing.md,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{warning.title}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: getRiskLevelColor(warning.level, colors) }}>
        {riskLevelLabel[warning.level]}
      </Text>

      <Pressable
        onPress={() => setIsExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Detayları gizle' : 'Detayları göster'}
      >
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.pine2, marginTop: 2 }}>
          {isExpanded ? 'Detayları gizle' : 'Detayları göster'}
        </Text>
      </Pressable>

      {isExpanded ? (
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>{warning.message}</Text>
      ) : null}
    </View>
  );
}

/** "Dikkat edilecekler" — kritik profil-alerjen eşleşmeleri hariç tüm riskEngine uyarıları. */
export function WarningsSection({ warnings }: WarningsSectionProps) {
  if (warnings.length === 0) {
    return (
      <EmptyState
        title="Dikkat edilecekler"
        message="Bu ürün için ek bir dikkat uyarısı üretilmedi. Bu, ürünün risksiz olduğu anlamına gelmez; etiket bilgisi esastır."
      />
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {warnings.map((warning) => (
        <WarningCard key={warning.code} warning={warning} />
      ))}
    </View>
  );
}
