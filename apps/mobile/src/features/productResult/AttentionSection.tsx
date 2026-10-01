import { Text, View } from 'react-native';

import type { RiskWarning } from '../../riskEngine/riskEngine';
import { spacing, useTheme } from '../../ui/theme';
import { PositivesSection } from './PositivesSection';
import { WarningsSection } from './WarningsSection';

export interface AttentionSectionProps {
  warnings: RiskWarning[];
  positiveItems: string[];
  additives: string[];
}

/**
 * "Dikkat edilecekler" — eski Warnings + Positives bölümleri burada
 * birleşir (bkz. onaylı plan, madde 3). İkisi de boşsa hiçbir şey
 * göstermez; bu durum CollapsibleSection başlığındaki "Yok" özetiyle
 * zaten anlatılır.
 */
export function AttentionSection({ warnings, positiveItems, additives }: AttentionSectionProps) {
  const { colors } = useTheme();

  if (warnings.length === 0 && positiveItems.length === 0 && additives.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: colors.muted }}>
        Bu ürün için ek bir dikkat uyarısı veya öne çıkan olumlu gerekçe üretilmedi.
      </Text>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <WarningsSection warnings={warnings} />
      <PositivesSection items={positiveItems} />
      {additives.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>KATKI MADDELERİ</Text>
          <Text style={{ fontSize: 13, color: colors.ink }}>{additives.join(', ')}</Text>
        </View>
      ) : null}
    </View>
  );
}
