/**
 * RafSkoru — Tüketici karar akışı V2: 1) Ürün kimliği. src/consumerUx/DecisionHero.tsx
 * Sabit yükseklik yok; dinamik yazıda metin kesilmez (erişilebilirlik ilkesi).
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from './tokens';
import type { ProductIdentityView } from './types';

export function DecisionHero({ identity }: { identity: ProductIdentityView }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${identity.name}. Barkod ${identity.barcode || 'yok'}.`}>
      {identity.imageUrl ? (
        <Image source={{ uri: identity.imageUrl }} style={styles.image} resizeMode="contain" accessibilityLabel="Ürün görseli" />
      ) : (
        <View style={styles.imagePlaceholder} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.imagePlaceholderIcon}>▦</Text>
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={styles.name} allowFontScaling accessibilityRole="header">
          {identity.name}
        </Text>
        {identity.barcode ? (
          <Text style={styles.barcode} allowFontScaling>
            Barkod: {identity.barcode}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  image: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: color.surfaceMuted },
  imagePlaceholder: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: color.surfaceMuted,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: { fontSize: 28, color: color.inkFaint },
  textBlock: { flex: 1, gap: spacing.xxs },
  name: { ...typography.title, color: color.ink },
  barcode: { ...typography.caption, color: color.inkMuted },
});
