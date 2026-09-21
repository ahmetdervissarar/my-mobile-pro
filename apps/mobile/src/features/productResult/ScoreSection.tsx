import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { RafScoreResult } from '../../price/types';
import { getRafScoreConfidenceText, getRafScoreStatusText } from '../../price/rafScoreDisplay';
import { ScoreRing } from '../../ui/ScoreRing';
import { radii, spacing, useTheme } from '../../ui/theme';

export interface ScoreSectionProps {
  rafScore: RafScoreResult | null;
  explanationItems: string[];
}

/** Puan halkası + "Nasıl hesaplandı?" açılır ayrıntı. */
export function ScoreSection({ rafScore, explanationItems }: ScoreSectionProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <ScoreRing score={rafScore?.score ?? null} caption="RafSkoru" />

      <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
        {getRafScoreStatusText(rafScore)}
      </Text>
      <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
        {getRafScoreConfidenceText(rafScore)}
      </Text>

      {explanationItems.length > 0 ? (
        <View
          style={{
            width: '100%',
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            padding: spacing.md,
            marginTop: spacing.xs,
          }}
        >
          <Pressable
            onPress={() => setIsOpen((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel="Nasıl hesaplandı? ayrıntısını aç veya kapat"
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.pine2 }}>Nasıl hesaplandı?</Text>
            <Text style={{ fontSize: 16, color: colors.pine2 }}>{isOpen ? '−' : '+'}</Text>
          </Pressable>

          {isOpen ? (
            <View style={{ marginTop: spacing.sm, gap: 6 }}>
              {explanationItems.map((item) => (
                <Text key={item} style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
                  • {item}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
