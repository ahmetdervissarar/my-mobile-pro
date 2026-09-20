/**
 * RafSkoru — Haftalık sepet: 1+2) Başlık + ürün/adet bilgisi. src/weeklyBasket/BasketHeader.tsx
 * Market seçimi, mesafe, "en ucuz market" veya tahmini toplam GÖSTERMEZ (Aşama 9 kapsam dışı).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, color, radius, spacing, typography } from '../consumerUx/tokens';
import type { WeeklyBasketView } from './basketViewModel';

export function BasketHeader({ view, onClearBasket }: { view: WeeklyBasketView; onClearBasket: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header" allowFontScaling>
        {view.weekLabel}
      </Text>
      {view.weekRangeText ? (
        <Text style={styles.range} allowFontScaling>
          {view.weekRangeText}
        </Text>
      ) : null}
      {!view.isEmpty ? (
        <View style={styles.row}>
          <Text style={styles.summary} allowFontScaling>
            {view.itemCount} ürün · {view.totalQuantity} adet
          </Text>
          <Pressable
            onPress={onClearBasket}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Sepeti temizle"
            accessibilityHint="Onay istenir"
          >
            <Text style={styles.clearButtonText} allowFontScaling>
              Sepeti temizle
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xxs },
  title: { ...typography.title, color: color.ink },
  range: { ...typography.caption, color: color.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  summary: { ...typography.bodyStrong, color: color.ink },
  clearButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.xs, borderRadius: radius.sm },
  clearButtonText: { ...typography.caption, color: color.allergenDeclared, fontWeight: '700' },
});
