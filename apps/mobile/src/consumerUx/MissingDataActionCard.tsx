/**
 * RafSkoru — Tüketici karar akışı V2: 6) Eksik veri tamamlama çağrısı.
 * src/consumerUx/MissingDataActionCard.tsx
 *
 * Mevcut "Paket bilgisini ekle" akışına yönlendirir (`ProductDataStateCard.tsx` ile aynı
 * hedefler); yeni bir veri yolu İCAT ETMEZ. Dokunma alanı ≥48 pt.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, color, radius, spacing, typography } from './tokens';
import type { MissingDataActionView } from './types';

export interface MissingDataActionCardProps {
  view: MissingDataActionView;
  onAddPackageInfo: () => void;
  onSearchByName: () => void;
  onPhotoSearch: () => void;
}

export function MissingDataActionCard({ view, onAddPackageInfo, onSearchByName, onPhotoSearch }: MissingDataActionCardProps) {
  if (!view.visible) return null;
  return (
    <View style={styles.card} accessible={false}>
      <Text style={styles.headline} allowFontScaling accessibilityRole="header">
        {view.headline}
      </Text>
      <Text style={styles.body} allowFontScaling>
        {view.body}
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} accessibilityRole="button" accessibilityLabel="Paket bilgisini ekle" onPress={onAddPackageInfo}>
          <Text style={styles.primaryButtonText}>＋ Paket bilgisini ekle</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Ürün adını yazarak ara" onPress={onSearchByName}>
          <Text style={styles.secondaryButtonText}>Ürün adını yazarak ara</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Ürün fotoğrafı ile dene" onPress={onPhotoSearch}>
          <Text style={styles.secondaryButtonText}>Ürün fotoğrafı ile dene</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.brandMuted, padding: spacing.sm, gap: spacing.xs },
  headline: { ...typography.bodyStrong, color: color.ink },
  body: { ...typography.caption, color: color.inkMuted },
  actions: { gap: spacing.xs, marginTop: spacing.xxs },
  primaryButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: color.brand },
  primaryButtonText: { ...typography.bodyStrong, color: color.surface, textAlign: 'center' },
  secondaryButton: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: color.borderStrong, backgroundColor: color.surface },
  secondaryButtonText: { ...typography.bodyStrong, color: color.ink, textAlign: 'center' },
});
