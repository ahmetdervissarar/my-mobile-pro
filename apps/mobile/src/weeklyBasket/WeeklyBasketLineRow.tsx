/**
 * RafSkoru — Haftalık sepet: 5–8) Ürün satırı, miktar +/-, sil, incele, alternatifler.
 * src/weeklyBasket/WeeklyBasketLineRow.tsx
 *
 * Satırın ana bloğuna dokununca ürün sonucuna dönülür (`onOpenProduct`); miktar/sil düğmeleri
 * AYRI dokunma alanlarıdır (iç içe Pressable yok). Silme her zaman onay ister (çağıran taraf,
 * `app/weekly-basket.tsx`, `Alert.alert` ile sorar). Renk tek başına anlam taşımaz.
 */

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AllergenGateTone } from '../consumerUx/types';
import { MIN_TOUCH_TARGET, color, radius, spacing, typography } from '../consumerUx/tokens';
import type { WeeklyBasketLineView } from './basketViewModel';

const TONE_BADGE: Record<AllergenGateTone, { icon: string; ink: string }> = {
  declared: { icon: '!', ink: color.allergenDeclared },
  trace: { icon: '~', ink: color.allergenTrace },
  not_listed: { icon: '–', ink: color.allergenNotListed },
  unknown: { icon: '?', ink: color.allergenUnknown },
};

export interface WeeklyBasketLineRowProps {
  view: WeeklyBasketLineView;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onOpenProduct: () => void;
  onOpenAlternatives: () => void;
}

export function WeeklyBasketLineRow({ view, onIncrement, onDecrement, onRemove, onOpenProduct, onOpenAlternatives }: WeeklyBasketLineRowProps) {
  const tone = TONE_BADGE[view.allergenTone];

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpenProduct}
        style={styles.mainBlock}
        accessibilityRole="button"
        accessibilityLabel={`${view.productName}. Miktar ${view.quantity}. ${view.allergenSummaryText} ${view.dataStatusLabel}.`}
        accessibilityHint="Ürün sonucuna döner"
      >
        {view.imageUrl ? (
          <Image source={{ uri: view.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>▦</Text>
          </View>
        )}
        <View style={styles.textBlock}>
          <Text style={styles.name} allowFontScaling numberOfLines={2}>
            {view.productName}
          </Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.badgeIcon, { color: tone.ink }]} accessibilityElementsHidden importantForAccessibility="no">
              {tone.icon}
            </Text>
            <Text style={[styles.badgeText, { color: tone.ink }]} allowFontScaling numberOfLines={1}>
              {view.allergenSummaryText}
            </Text>
          </View>
          <Text style={styles.dataStatus} allowFontScaling>
            {view.dataStatusLabel}
          </Text>
        </View>
      </Pressable>

      <View style={styles.controlsRow}>
        <View style={styles.stepper}>
          <Pressable
            onPress={onDecrement}
            disabled={!view.canDecrement}
            style={[styles.stepButton, !view.canDecrement ? styles.stepButtonDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel="Miktarı azalt"
            accessibilityState={{ disabled: !view.canDecrement }}
          >
            <Text style={styles.stepButtonText}>–</Text>
          </Pressable>
          <Text style={styles.quantityText} allowFontScaling accessibilityLabel={`Miktar: ${view.quantity}`}>
            {view.quantity}
          </Text>
          <Pressable onPress={onIncrement} style={styles.stepButton} accessibilityRole="button" accessibilityLabel="Miktarı artır">
            <Text style={styles.stepButtonText}>+</Text>
          </Pressable>
        </View>

        <Pressable onPress={onRemove} style={styles.removeButton} accessibilityRole="button" accessibilityLabel="Ürünü sepetten sil" accessibilityHint="Onay istenir">
          <Text style={styles.removeButtonText} allowFontScaling>
            Sil
          </Text>
        </Pressable>
      </View>

      <View style={styles.linkRow}>
        <Pressable onPress={onOpenProduct} accessibilityRole="link" accessibilityLabel="Ürünü incele" style={styles.linkButton}>
          <Text style={styles.linkText} allowFontScaling>
            Ürünü incele
          </Text>
        </Pressable>
        {view.canViewAlternatives ? (
          <Pressable onPress={onOpenAlternatives} accessibilityRole="link" accessibilityLabel="Aynı gruptan seçenekler" style={styles.linkButton}>
            <Text style={styles.linkText} allowFontScaling>
              Aynı gruptan seçenekler
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: spacing.sm, gap: spacing.xs },
  mainBlock: { flexDirection: 'row', gap: spacing.xs, minHeight: MIN_TOUCH_TARGET },
  image: { width: 56, height: 56, borderRadius: radius.sm },
  imagePlaceholder: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: color.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: 20, color: color.inkFaint },
  textBlock: { flex: 1, gap: 2, justifyContent: 'center' },
  name: { ...typography.bodyStrong, color: color.ink },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeIcon: { fontSize: 14, fontWeight: '800' },
  badgeText: { ...typography.caption, flexShrink: 1 },
  dataStatus: { ...typography.caption, color: color.inkMuted },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepButton: { minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  stepButtonDisabled: { opacity: 0.4 },
  stepButtonText: { ...typography.title, color: color.ink },
  quantityText: { ...typography.bodyStrong, color: color.ink, minWidth: 24, textAlign: 'center' },
  removeButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  removeButtonText: { ...typography.bodyStrong, color: color.allergenDeclared },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  linkButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  linkText: { ...typography.caption, color: color.brand, fontWeight: '700', textDecorationLine: 'underline' },
});
