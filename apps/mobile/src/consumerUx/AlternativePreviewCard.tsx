/**
 * RafSkoru — Tüketici karar akışı V2: 7) Aynı gruptan seçenekler.
 * src/consumerUx/AlternativePreviewCard.tsx
 *
 * Başlık birebir "Aynı gruptan seçenekler" (P3: alternatif ≠ "daha sağlıklı"). Liste zaten
 * `isAlternativeCandidateSafeForAllergyProfile` ile fail-closed filtrelenmiş girdi alır; burada
 * hiçbir ek filtre/algoritma YOKTUR — yalnız görüntüler.
 */

import { StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from './tokens';
import type { AlternativesView } from './types';

export function AlternativePreviewCard({ view }: { view: AlternativesView }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} allowFontScaling accessibilityRole="header">
        {view.title}
      </Text>

      {view.items.length === 0 ? (
        <Text style={styles.emptyText} allowFontScaling>
          {view.emptyNotice}
        </Text>
      ) : (
        view.items.map((item) => (
          <View
            key={item.id}
            style={styles.card}
            accessible
            accessibilityLabel={`${item.productName}. ${item.reasonLabel}. ${item.confidenceText}.${item.missingSignalsNote ? ' ' + item.missingSignalsNote : ''}`}
          >
            <Text style={styles.productName} allowFontScaling>
              {item.productName}
            </Text>
            <Text style={styles.reason} allowFontScaling>
              {item.reasonLabel}
            </Text>
            <View style={styles.metaRow}>
              {item.priceDeltaText ? (
                <Text style={styles.metaText} allowFontScaling>
                  {item.priceDeltaText}
                </Text>
              ) : null}
              <Text style={styles.metaText} allowFontScaling>
                {item.confidenceText}
              </Text>
            </View>
            {item.missingSignalsNote ? (
              <Text style={styles.missingNote} allowFontScaling>
                {item.missingSignalsNote}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  title: { ...typography.subtitle, color: color.ink },
  emptyText: { ...typography.caption, color: color.inkMuted },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: spacing.sm, gap: 4 },
  productName: { ...typography.bodyStrong, color: color.ink },
  reason: { ...typography.caption, color: color.inkMuted },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaText: { ...typography.caption, color: color.inkFaint },
  missingNote: { ...typography.caption, color: color.trustPartial },
});
