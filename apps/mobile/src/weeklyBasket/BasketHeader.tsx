/**
 * RafSkoru — Haftalık sepet: 1+2) Başlık + ürün/adet bilgisi + eski hafta uyarısı.
 * src/weeklyBasket/BasketHeader.tsx
 *
 * Market seçimi, mesafe, "en ucuz market" veya tahmini toplam GÖSTERMEZ (Aşama 9 kapsam dışı).
 * Sepet ÖNCEKİ bir haftaya aitse ("isCurrentWeek: false") bunu açıkça yazar ve "Yeni haftaya
 * başla" düğmesini gösterir; bu düğme yalnız kullanıcının AÇIK onayından sonra (çağıran tarafın
 * `Alert.alert` sorusu) eski kaydın YERİNE yeni, boş bir sepet oluşturur — arşiv oluşturmaz,
 * eski kaydı sessizce silmez.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, color, radius, spacing, typography } from '../consumerUx/tokens';
import type { WeeklyBasketView } from './basketViewModel';

export function BasketHeader({
  view,
  onClearBasket,
  onStartNewWeek,
}: {
  view: WeeklyBasketView;
  onClearBasket: () => void;
  onStartNewWeek: () => void;
}) {
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

      {!view.isCurrentWeek ? (
        <View style={styles.oldWeekBlock} accessible accessibilityLabel={`Bu sepet önceki haftaya ait: ${view.weekRangeText ?? ''}`}>
          <Text style={styles.oldWeekText} allowFontScaling>
            Bu sepet önceki haftaya ait{view.weekRangeText ? `: ${view.weekRangeText}` : ''}.
          </Text>
          <Pressable
            onPress={onStartNewWeek}
            style={styles.newWeekButton}
            accessibilityRole="button"
            accessibilityLabel="Yeni haftaya başla"
            accessibilityHint="Onay istenir; eski sepetin yerine yeni, boş bir sepet oluşturur"
          >
            <Text style={styles.newWeekButtonText} allowFontScaling>
              Yeni haftaya başla
            </Text>
          </Pressable>
        </View>
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
  oldWeekBlock: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.decisionCautionSurface,
    backgroundColor: color.decisionCautionSurface,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  oldWeekText: { ...typography.bodyStrong, color: color.decisionCaution },
  newWeekButton: { minHeight: MIN_TOUCH_TARGET, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: color.ink },
  newWeekButtonText: { ...typography.bodyStrong, color: color.surface },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  summary: { ...typography.bodyStrong, color: color.ink },
  clearButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.xs, borderRadius: radius.sm },
  clearButtonText: { ...typography.caption, color: color.allergenDeclared, fontWeight: '700' },
});
