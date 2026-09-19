/**
 * RafSkoru — Tüketici karar akışı V2: 5) Ayrı skor/değerlendirme boyutları.
 * src/consumerUx/ScoreDimensionCard.tsx
 *
 * Kullanılamayan boyut SIFIR PUAN göstermez; "Bu boyut için veri yetersiz" yazar
 * (view-model bunu zaten `scoreText: null` ile işaretler).
 */

import { StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from './tokens';
import type { ScoreDimensionView } from './types';

export function ScoreDimensionCard({ view }: { view: ScoreDimensionView }) {
  return (
    <View
      style={[styles.card, !view.isAvailable ? styles.cardUnavailable : null]}
      accessible
      accessibilityLabel={`${view.label}: ${view.scoreText ?? 'Bu boyut için veri yetersiz'}. ${view.statusText}`}
    >
      <Text style={styles.label} allowFontScaling>
        {view.label}
      </Text>
      {view.isAvailable && view.scoreText ? (
        <Text style={styles.scoreValue} allowFontScaling>
          {view.scoreText}
        </Text>
      ) : (
        <Text style={styles.unavailableText} allowFontScaling>
          Bu boyut için veri yetersiz
        </Text>
      )}
      <Text style={styles.statusText} allowFontScaling>
        {view.statusText}
      </Text>
      {view.confidenceText ? (
        <Text style={styles.confidenceText} allowFontScaling>
          {view.confidenceText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 150,
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  cardUnavailable: { backgroundColor: color.surfaceMuted, borderStyle: 'dashed' },
  label: { ...typography.captionStrong, color: color.inkMuted, textTransform: 'uppercase', fontSize: 11 },
  scoreValue: { ...typography.title, color: color.ink },
  unavailableText: { ...typography.bodyStrong, color: color.inkFaint },
  statusText: { ...typography.caption, color: color.inkMuted },
  confidenceText: { ...typography.caption, color: color.inkFaint },
});
