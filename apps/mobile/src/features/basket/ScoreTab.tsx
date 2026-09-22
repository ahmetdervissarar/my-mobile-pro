import { router } from 'expo-router';
import { Text, View } from 'react-native';

import type { BasketProfile } from '../../api/basketClient';
import type { CartItem } from '../../state/cartStore';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { EmptyState } from '../../ui/EmptyState';
import { ScoreRing } from '../../ui/ScoreRing';
import { radii, spacing, useTheme } from '../../ui/theme';
import { BasketItemRow } from './BasketItemRow';
import { formatCoverage, summarizeBasketAllergenStatus } from './helpers';

export interface ScoreTabProps {
  basketProfile: BasketProfile | null;
  cartItems: CartItem[];
  userProfile: UserSensitivityProfile;
  onQuantityChange: (key: string, nextAmount: number) => void;
  onRemove: (key: string) => void;
}

export function ScoreTab({ basketProfile, cartItems, userProfile, onQuantityChange, onRemove }: ScoreTabProps) {
  const { colors } = useTheme();

  if (!basketProfile) {
    return <EmptyState title="Sepet skoru hesaplanıyor..." />;
  }

  const allergenSummary = summarizeBasketAllergenStatus(basketProfile.perItem, userProfile);
  const hasConflict = allergenSummary.conflictCount > 0;

  const allergenBand = (
    <View
      style={{
        borderRadius: radii.md,
        backgroundColor:
          allergenSummary.tone === 'danger'
            ? colors.dangerBg
            : allergenSummary.tone === 'warning'
              ? colors.warnBg
              : colors.soft,
        padding: spacing.md,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color:
            allergenSummary.tone === 'danger'
              ? colors.danger
              : allergenSummary.tone === 'warning'
                ? colors.warn
                : colors.ink,
        }}
      >
        {allergenSummary.headline}
      </Text>
      {hasConflict && allergenSummary.noDataCount > 0 ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warn }}>
          {allergenSummary.noDataCount} üründe alerjen verisi yok — etiketi kontrol edin
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
        Bu sayı yalnızca mevcut ürün verisinden (beyan, iz ve içindekiler eşleşmesi) hesaplanır.
      </Text>
    </View>
  );

  const scoreBlock = (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <ScoreRing score={basketProfile.basketRafSkoru} caption="Sepet RafSkoru" allergenPriority={hasConflict} />
      {hasConflict ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textAlign: 'center' }}>
          {allergenSummary.conflictCount} ürün profilinizle çakışıyor; puan bu ürünler için anlamlı değil
        </Text>
      ) : null}
      <Text style={{ fontSize: 13, color: colors.muted }}>
        Kapsam: {formatCoverage(basketProfile.coverage)} · Ürün sayısı: {basketProfile.itemCount}
      </Text>
    </View>
  );

  return (
    <View style={{ gap: spacing.lg }}>
      {hasConflict ? allergenBand : null}

      {scoreBlock}

      {hasConflict ? null : allergenBand}

      <View style={{ gap: spacing.sm }}>
        {basketProfile.perItem.map((item, index) => {
          const cartItem = cartItems[index];
          if (!cartItem) return null;

          const canViewDetails = cartItem.type === 'product' && Boolean(cartItem.productId);

          return (
            <BasketItemRow
              key={cartItem.key}
              item={item}
              quantityAmount={cartItem.quantity.amount}
              userProfile={userProfile}
              onQuantityChange={(nextAmount) => onQuantityChange(cartItem.key, nextAmount)}
              onRemove={() => onRemove(cartItem.key)}
              onPress={
                canViewDetails
                  ? () => router.push({ pathname: '/product-result', params: { barcode: cartItem.productId! } })
                  : undefined
              }
            />
          );
        })}
      </View>
    </View>
  );
}
