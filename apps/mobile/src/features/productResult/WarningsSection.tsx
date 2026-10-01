import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getWarningColorKind, type RiskWarning } from '../../riskEngine/riskEngine';
import { radii, spacing, useTheme } from '../../ui/theme';
import { riskLevelLabel } from './helpers';

export interface WarningsSectionProps {
  warnings: RiskWarning[];
}

/**
 * D5: renk `level`'dan değil `getWarningColorKind`'den gelir — kırmızı
 * yalnız gerçek profil-alerjen çakışmasına (profile_conflict) ayrılır.
 * `level` metni (riskLevelLabel) hâlâ ham şiddeti gösterir; MISSING_ALLERGEN_INFO
 * "Yüksek" yazmaya devam eder ama sarı gösterilir (fail-closed ilkesi).
 */
function getRiskCardColors(
  warning: RiskWarning,
  colors: ReturnType<typeof useTheme>['colors'],
): { fg: string; bg: string } {
  const kind = getWarningColorKind(warning.code);

  if (kind === 'profile_conflict') return { fg: colors.danger, bg: colors.dangerBg };
  if (kind === 'missing_allergen_data') return { fg: colors.caution, bg: colors.cautionBg };

  if (warning.level === 'low') return { fg: colors.leaf, bg: colors.soft };
  if (warning.level === 'medium') return { fg: colors.warn, bg: colors.warnBg };
  return { fg: colors.muted, bg: colors.infoBg };
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
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{warning.title}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: fg }}>{riskLevelLabel[warning.level]}</Text>

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
