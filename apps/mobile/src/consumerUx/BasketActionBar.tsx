/**
 * RafSkoru — Tüketici karar akışı V2: 8) Sepete ekleme alanı. src/consumerUx/BasketActionBar.tsx
 *
 * "Sepete ekle" GERÇEKTEN ekler (Aşama 9) — çağıran taraf (`product-result.tsx`) zaten hesaplanmış
 * `ConsumerDecisionView`'den bir satır snapshot'ı çıkarır ve `src/weeklyBasket/basketStorage.ts`'e
 * yazar; burada iş mantığı YOKTUR, yalnız sunum + geri bildirim. "Sepete git" haftalık sepet
 * ekranını açar (`app/weekly-basket.tsx`).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, color, radius, spacing, typography } from './tokens';
import type { BasketActionFeedback, BasketActionView } from './types';

export interface BasketActionBarProps {
  view: BasketActionView;
  feedback: BasketActionFeedback | null;
  onAddToBasket: () => void;
  onOpenBasket: () => void;
}

export function BasketActionBar({ view, feedback, onAddToBasket, onOpenBasket }: BasketActionBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.addButton]}
          accessibilityRole="button"
          accessibilityLabel={view.addLabel}
          accessibilityHint="Bu ürünü bu haftanın sepetine ekler"
          onPress={onAddToBasket}
        >
          <Text style={styles.addButtonText} allowFontScaling>
            {view.addLabel}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.openButton]}
          accessibilityRole="button"
          accessibilityLabel={view.openLabel}
          accessibilityHint="Bu haftanın sepetini açar"
          onPress={onOpenBasket}
        >
          <Text style={styles.openButtonText} allowFontScaling>
            {view.openLabel}
          </Text>
        </Pressable>
      </View>

      {feedback ? (
        <Text
          style={[styles.feedbackText, feedback.status === 'error' ? styles.feedbackError : styles.feedbackSuccess]}
          allowFontScaling
          accessibilityLiveRegion="polite"
        >
          {feedback.message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: spacing.xxs, gap: spacing.xxs },
  buttonRow: { flexDirection: 'row', gap: spacing.xs },
  button: { flex: 1, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm },
  addButton: { backgroundColor: color.ink },
  addButtonText: { ...typography.bodyStrong, color: color.surface },
  openButton: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong },
  openButtonText: { ...typography.bodyStrong, color: color.ink },
  feedbackText: { ...typography.caption, fontWeight: '700' },
  feedbackSuccess: { color: color.decisionCalm },
  feedbackError: { color: color.allergenDeclared },
});
