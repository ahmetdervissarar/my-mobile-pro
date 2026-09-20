/**
 * RafSkoru — Tüketici karar akışı V2 geliştirme önizlemesi galerisi (Aşama 8).
 * src/consumerUx/DevStateGallery.tsx
 *
 * Yalnız `__DEV__ === true` VE `EXPO_PUBLIC_CONSUMER_UX_V2==='1'` iken erişilebilir
 * (`isDevStateGalleryEnabled`). Yeni bağımlılık eklemez. Fixture verisi açıkça
 * "GELİŞTİRME ÖNİZLEMESİ" etiketlidir ve üretim ekranına hiçbir zaman karışmaz.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { isConsumerUxV2Enabled } from '../localProduct/featureFlag';
import { WeeklyBasketScreen } from '../weeklyBasket/WeeklyBasketScreen';
import { DEV_WEEKLY_BASKET_FIXTURES } from '../weeklyBasket/basketDevFixtures';
import { ConsumerDecisionScreen } from './ConsumerDecisionScreen';
import { DEV_CONSUMER_DECISION_FIXTURES } from './devFixtures';
import { color, spacing, typography } from './tokens';

declare const __DEV__: boolean | undefined;

export function isDevStateGalleryEnabled(): boolean {
  const isDevBuild = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return isDevBuild && isConsumerUxV2Enabled();
}

const NOOP = () => {};

export function DevStateGallery() {
  if (!isDevStateGalleryEnabled()) return null;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle} accessibilityRole="header">
        Durum galerisi — GELİŞTİRME ÖNİZLEMESİ
      </Text>
      {DEV_CONSUMER_DECISION_FIXTURES.map((entry) => (
        <View key={entry.key} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          <ConsumerDecisionScreen
            view={entry.view}
            onAddPackageInfo={NOOP}
            onSearchByName={NOOP}
            onPhotoSearch={NOOP}
            onAddToBasket={NOOP}
            onOpenBasket={NOOP}
            basketFeedback={null}
          />
        </View>
      ))}

      <Text style={styles.pageTitle} accessibilityRole="header">
        Sepet durumları — GELİŞTİRME ÖNİZLEMESİ
      </Text>
      {DEV_WEEKLY_BASKET_FIXTURES.map((entry) => (
        <View key={entry.key} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          <WeeklyBasketScreen
            view={entry.view}
            onIncrement={NOOP}
            onDecrement={NOOP}
            onRemove={NOOP}
            onClearBasket={NOOP}
            onOpenProduct={NOOP}
            onOpenAlternatives={NOOP}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface },
  content: { padding: spacing.md, gap: spacing.xl, paddingBottom: 60 },
  pageTitle: { ...typography.title, color: color.ink },
  entry: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: color.border, paddingTop: spacing.md },
  entryTitle: { ...typography.captionStrong, color: color.inkMuted, textTransform: 'uppercase' },
});
