/**
 * RafSkoru — Haftalık sepet: 3) Sepete eklenirken profilinizle eşleşen kritik uyarılar.
 * src/weeklyBasket/BasketCriticalAllergenCard.tsx
 *
 * Ürünün kendi BEYAN grubundan (bkz. BasketAllergenSummaryCard.tsx) AYRI, bağımsız bir bölümdür:
 * burada yalnız ekleme anında GERÇEKTEN kullanıcı profiliyle eşleşmiş uyarılar (`criticalNotices`)
 * listelenir — bir ürünün alerjen beyanı olması tek başına burada görünmesi için yeterli değildir.
 * Bu bir anlık görüntüdür (snapshot); güncel profille yeniden hesaplanmaz. Kritik uyarı yokken
 * olumlu/güvenli bir sonuç ÜRETİLMEZ.
 */

import { StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from '../consumerUx/tokens';
import type { BasketCriticalAllergenView } from './basketViewModel';

export function BasketCriticalAllergenCard({ view }: { view: BasketCriticalAllergenView }) {
  return (
    <View style={styles.card} accessible accessibilityLabel="Sepete eklenirken profilinizle eşleşen kritik uyarılar">
      <Text style={styles.title} accessibilityRole="header" allowFontScaling>
        Sepete eklenirken profilinizle eşleşen kritik uyarılar
      </Text>

      {view.isEmpty ? (
        <Text style={styles.emptyText} allowFontScaling>
          {view.emptyNotice}
        </Text>
      ) : (
        view.items.map((item) => (
          <View key={item.gtin} style={styles.itemBlock}>
            <Text style={styles.itemName} allowFontScaling>
              {item.productName}
            </Text>
            {item.notices.map((notice) => (
              <View key={notice.code} style={styles.noticeRow}>
                <Text style={styles.noticeTitle} allowFontScaling>
                  {notice.title}
                </Text>
                <Text style={styles.noticeMessage} allowFontScaling>
                  {notice.message}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}

      <Text style={styles.disclaimer} allowFontScaling>
        {view.snapshotDisclaimer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.allergenDeclaredBorder,
    backgroundColor: color.allergenDeclaredSurface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: { ...typography.subtitle, color: color.allergenDeclared },
  emptyText: { ...typography.body, color: color.inkMuted },
  itemBlock: { gap: 2 },
  itemName: { ...typography.bodyStrong, color: color.ink },
  noticeRow: { gap: 1, paddingLeft: spacing.xs },
  noticeTitle: { ...typography.captionStrong, color: color.allergenDeclared },
  noticeMessage: { ...typography.caption, color: color.ink },
  disclaimer: { ...typography.caption, color: color.inkFaint, marginTop: spacing.xxs },
});
