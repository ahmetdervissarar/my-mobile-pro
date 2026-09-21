/**
 * RafSkoru — Ürün Satırı
 * src/ui/ProductRow.tsx
 *
 * Arama, sepet ve "Son baktıkların" listelerinde ortak ürün satırı.
 * Puan, alerjen durumu veya fiyat verisi yoksa alan boş bırakılır /
 * "veri yok" gösterilir; asla tahmini bir değerle doldurulmaz.
 */

import type { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import type { AllergenBannerStatus } from './AllergenBanner';
import { AllergenChip } from './AllergenChip';
import { ScorePill } from './ScorePill';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from './theme';

export interface ProductRowProps {
  imageUrl?: string | null;
  name: string;
  meta?: string | null;
  score?: number | null;
  allergenStatus?: AllergenBannerStatus | null;
  priceText?: string | null;
  onPress?: () => void;
  trailing?: ReactNode;
  /** Nutri-Score/NOVA rozeti gibi ek göstergeler için satır altına eklenen alan. */
  extraBadges?: ReactNode;
  accessibilityLabel?: string;
}

export function ProductRow({
  imageUrl,
  name,
  meta,
  score,
  allergenStatus,
  priceText,
  onPress,
  trailing,
  extraBadges,
  accessibilityLabel,
}: ProductRowProps) {
  const { colors } = useTheme();

  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? name}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.lg,
        padding: spacing.md,
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 52, height: 52, borderRadius: radii.md, backgroundColor: colors.soft }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radii.md,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 18 }}>▦</Text>
        </View>
      )}

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }} numberOfLines={2}>
          {name}
        </Text>

        {meta ? (
          <Text style={{ fontSize: 12.5, color: colors.muted }} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
          {score !== undefined ? <ScorePill score={score} /> : null}
          {allergenStatus ? <AllergenChip status={allergenStatus} /> : null}
        </View>

        {extraBadges ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
            {extraBadges}
          </View>
        ) : null}

        {priceText ? (
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{priceText}</Text>
        ) : null}
      </View>

      {trailing}
    </Container>
  );
}
