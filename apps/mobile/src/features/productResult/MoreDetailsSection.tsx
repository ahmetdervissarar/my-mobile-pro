import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { HealthScoreResult, SustainabilityResult } from '../../price/types';
import {
  getHealthScoreConfidenceText,
  getHealthScoreDisplayValue,
  getHealthScoreGradeText,
  getHealthScoreStatusText,
} from '../../price/healthScoreDisplay';
import { radii, spacing, useTheme } from '../../ui/theme';
import { getSustainabilityCategoryLabel, getSustainabilityConfidenceLabel } from './helpers';

export interface MoreDetailsSectionProps {
  healthScore: HealthScoreResult | null;
  sustainability: SustainabilityResult | null;
  productName: string;
  barcode: string;
  searchSourceLabel: string;
}

function AccordionRow({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${title} ayrıntısını aç veya kapat`}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 16, color: colors.muted }}>{isOpen ? '−' : '+'}</Text>
      </Pressable>

      {isOpen ? <View style={{ marginTop: spacing.sm, gap: 4 }}>{children}</View> : null}
    </View>
  );
}

/**
 * "Daha fazla ayrıntı" — sağlık/sürdürülebilirlik alt skorları ve ürün temel
 * bilgileri. Prototipte ayrı ekran öğesi olarak tanımlanmamıştır; mevcut
 * bilginin kaybolmaması için tek bir katlanır bölümde toplanmıştır
 * (bkz. görev raporu — "Prototipten sapmalar").
 */
export function MoreDetailsSection({
  healthScore,
  sustainability,
  productName,
  barcode,
  searchSourceLabel,
}: MoreDetailsSectionProps) {
  const { colors } = useTheme();
  const [openSection, setOpenSection] = useState<'health' | 'sustainability' | 'basic' | null>(null);

  const toggle = (key: 'health' | 'sustainability' | 'basic') =>
    setOpenSection((current) => (current === key ? null : key));

  return (
    <View
      style={{
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted }}>Daha fazla ayrıntı</Text>

      <AccordionRow title="Sağlık Skoru" isOpen={openSection === 'health'} onToggle={() => toggle('health')}>
        <Text style={{ fontSize: 13, color: colors.ink }}>{getHealthScoreDisplayValue(healthScore)}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{getHealthScoreStatusText(healthScore)}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{getHealthScoreGradeText(healthScore)}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{getHealthScoreConfidenceText(healthScore)}</Text>
      </AccordionRow>

      <AccordionRow
        title="Sürdürülebilirlik Skoru"
        isOpen={openSection === 'sustainability'}
        onToggle={() => toggle('sustainability')}
      >
        {sustainability ? (
          <>
            <Text style={{ fontSize: 13, color: colors.ink }}>
              {sustainability.grade} · {sustainability.score}/100 — {sustainability.label}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Güven: {getSustainabilityConfidenceLabel(sustainability.confidence)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Kategori: {getSustainabilityCategoryLabel(sustainability.categoryKey)}
            </Text>
            {sustainability.explanations.slice(0, 3).map((explanation, index) => (
              <Text key={`${explanation}-${index}`} style={{ fontSize: 12, color: colors.muted }}>
                • {explanation}
              </Text>
            ))}
            <Text style={{ fontSize: 11.5, color: colors.muted }}>{sustainability.disclaimer}</Text>
          </>
        ) : (
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Bu ürün için sürdürülebilirlik verisi eksik. RafSkoru mevcut fiyat ve ürün verileriyle kısmi
            gösterilir.
          </Text>
        )}
      </AccordionRow>

      <AccordionRow title="Ürün detayları" isOpen={openSection === 'basic'} onToggle={() => toggle('basic')}>
        <Text style={{ fontSize: 12, color: colors.muted }}>Ürün adı: {productName}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>Barkod numarası: {barcode}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>Arama kaynağı: {searchSourceLabel}</Text>
      </AccordionRow>
    </View>
  );
}
