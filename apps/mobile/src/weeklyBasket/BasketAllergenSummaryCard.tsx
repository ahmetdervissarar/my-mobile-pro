/**
 * RafSkoru — Haftalık sepet: 3) Sepet alerjen özeti. src/weeklyBasket/BasketAllergenSummaryCard.tsx
 *
 * Dört durum AYRI sayı ve ürün ismiyle gösterilir; hiçbiri birleştirilmez veya olumlu, tek bir
 * güvenlik sonucuna indirgenmez (P5, D1). Bir ürünün uyarısı diğerleriyle DENGELENMEZ (her grup
 * kendi satırında). Renk tek başına anlam taşımaz (ikon + başlık + sayı birlikte).
 */

import { StyleSheet, Text, View } from 'react-native';

import type { AllergenGateTone } from '../consumerUx/types';
import { color, radius, spacing, typography } from '../consumerUx/tokens';
import type { BasketAllergenSummaryView } from './basketViewModel';

const GROUP_META: Record<AllergenGateTone, { icon: string; ink: string }> = {
  declared: { icon: '!', ink: color.allergenDeclared },
  trace: { icon: '~', ink: color.allergenTrace },
  not_listed: { icon: '–', ink: color.allergenNotListed },
  unknown: { icon: '?', ink: color.allergenUnknown },
};

export function BasketAllergenSummaryCard({ view }: { view: BasketAllergenSummaryView }) {
  return (
    <View style={styles.card} accessible accessibilityLabel="Sepet alerjen özeti">
      <Text style={styles.title} accessibilityRole="header" allowFontScaling>
        Sepet alerjen özeti
      </Text>

      {view.groups.map((group) => {
        const meta = GROUP_META[group.key];
        return (
          <View key={group.key} style={styles.groupRow}>
            <Text style={[styles.icon, { color: meta.ink }]} accessibilityElementsHidden importantForAccessibility="no">
              {meta.icon}
            </Text>
            <View style={styles.groupText}>
              <Text style={[styles.groupLabel, { color: meta.ink }]} allowFontScaling>
                {group.label}: {group.count}
              </Text>
              {group.count > 0 ? (
                <Text style={styles.groupNames} allowFontScaling>
                  {group.productNames.join(', ')}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      <Text style={styles.disclaimer} allowFontScaling>
        {view.disclaimer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, padding: spacing.md, gap: spacing.xs },
  title: { ...typography.subtitle, color: color.ink },
  groupRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  icon: { fontSize: 18, fontWeight: '800', width: 22, textAlign: 'center' },
  groupText: { flex: 1, gap: 2 },
  groupLabel: { ...typography.bodyStrong },
  groupNames: { ...typography.caption, color: color.inkMuted },
  disclaimer: { ...typography.caption, color: color.inkFaint, marginTop: spacing.xxs },
});
