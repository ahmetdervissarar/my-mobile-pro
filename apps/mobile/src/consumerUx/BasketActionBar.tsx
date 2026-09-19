/**
 * RafSkoru — Tüketici karar akışı V2: 8) Sepete ekleme alanı. src/consumerUx/BasketActionBar.tsx
 *
 * MEVCUT sepet akışını (`app/basket.tsx`, `src/api/basketClient.ts`) DEĞİŞTİRMEZ — burada yeni
 * bir sepet mantığı YOK. Yalnız zaten var olan sepet ekranına yönlendiren bir giriş noktasıdır
 * (aynı `router.push` deseni "Ürün adını yazarak ara" için kullanılan desenle aynı).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, color, radius, spacing, typography } from './tokens';
import type { BasketActionView } from './types';

export function BasketActionBar({ view, onPress }: { view: BasketActionView; onPress: () => void }) {
  return (
    <View style={styles.bar}>
      <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel={view.ctaLabel} accessibilityHint="Mevcut sepet ekranını açar" onPress={onPress}>
        <Text style={styles.buttonText} allowFontScaling>
          {view.ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: spacing.xxs },
  button: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm, backgroundColor: color.ink },
  buttonText: { ...typography.bodyStrong, color: color.surface },
});
