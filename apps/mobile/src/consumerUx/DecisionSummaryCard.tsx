/**
 * RafSkoru — Tüketici karar akışı V2: 3) Kısa karar özeti. src/consumerUx/DecisionSummaryCard.tsx
 * Yeni bir karar ÜRETMEZ; yalnız view-model'in ÖZETLEDİĞİ mevcut sonucu tek cümleyle gösterir.
 */

import { StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from './tokens';
import type { DecisionSummaryView } from './types';

const TONE_STYLE: Record<DecisionSummaryView['tone'], { surface: string; ink: string; icon: string }> = {
  calm: { surface: color.decisionCalmSurface, ink: color.decisionCalm, icon: '✓' },
  caution: { surface: color.decisionCautionSurface, ink: color.decisionCaution, icon: '!' },
  unknown: { surface: color.decisionUnknownSurface, ink: color.decisionUnknown, icon: '?' },
};

export function DecisionSummaryCard({ view }: { view: DecisionSummaryView }) {
  const tone = TONE_STYLE[view.tone];
  return (
    <View style={[styles.card, { backgroundColor: tone.surface }]} accessible accessibilityLabel={`${view.headline}. ${view.supportingLine}`}>
      <View style={styles.row}>
        <Text style={[styles.icon, { color: tone.ink }]} accessibilityElementsHidden importantForAccessibility="no">
          {tone.icon}
        </Text>
        <Text style={[styles.headline, { color: tone.ink }]} allowFontScaling>
          {view.headline}
        </Text>
      </View>
      <Text style={styles.supporting} allowFontScaling>
        {view.supportingLine}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: spacing.sm, gap: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  icon: { fontSize: 18, fontWeight: '800', width: 22, textAlign: 'center' },
  headline: { ...typography.bodyStrong, flex: 1 },
  supporting: { ...typography.caption, color: color.inkMuted },
});
