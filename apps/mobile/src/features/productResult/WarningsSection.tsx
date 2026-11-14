import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { RiskWarning } from '../../riskEngine/riskEngine';
import { radii, spacing, typography, useTheme } from '../../ui/theme';
import { riskLevelLabel } from './helpers';
import { getRiskCardColors } from './riskCardColors';

export interface WarningsSectionProps {
  warnings: RiskWarning[];
}

function WarningCard({ warning }: { warning: RiskWarning }) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const { fg, bg } = getRiskCardColors(warning, colors);

  return (
    <View
      style={{
        borderRadius: radii.md,
        backgroundColor: bg,
        padding: spacing.md,
        gap: 4,
      }}
    >
      <Text style={{ ...typography.title, color: colors.ink }}>{warning.title}</Text>
      <Text style={{ ...typography.small, color: fg }}>{riskLevelLabel[warning.level]}</Text>

      <Pressable
        onPress={() => setIsExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Detayları gizle' : 'Detayları göster'}
      >
        <Text style={{ ...typography.small, color: colors.accent, marginTop: 2 }}>
          {isExpanded ? 'Detayları gizle' : 'Detayları göster'}
        </Text>
      </Pressable>

      {isExpanded ? (
        <Text style={{ ...typography.body, color: colors.muted, lineHeight: 18 }}>{warning.message}</Text>
      ) : null}
    </View>
  );
}

/**
 * "Dikkat edilecekler" bölümünün uyarı listesi — kritik profil-alerjen
 * eşleşmeleri hariç tüm riskEngine uyarıları. Boşsa HİÇBİR ŞEY döndürmez
 * (katmanlı sadeleştirme: boş durum artık CollapsibleSection başlığındaki
 * "Yok" özetiyle anlatılır, ayrı bir boş-metin kartı üretilmez).
 */
export function WarningsSection({ warnings }: WarningsSectionProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {warnings.map((warning) => (
        <WarningCard key={warning.code} warning={warning} />
      ))}
    </View>
  );
}
