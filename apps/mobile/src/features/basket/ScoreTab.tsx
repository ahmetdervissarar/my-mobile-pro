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

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <ScoreRing score={basketProfile.basketRafSkoru} caption="Sepet RafSkoru" />
        <Text style={{ fontSize: 13, color: colors.muted }}>
          Kapsam: {formatCoverage(basketProfile.coverage)} · Ürün sayısı: {basketProfile.itemCount}
        </Text>
      </View>

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
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
          Bu sayı yalnızca mevcut ürün verisinden (beyan, iz ve içindekiler eşleşmesi) hesaplanır. Her ürünün
          kendi kartındaki alerji rozeti esastır.
        </Text>
      </View>

      <EmptyState
        title="Daha iyi RafSkoru'lu sepet"
        message="Bu öneri, aynı ürün grubundan ve profille çakışmayan adayları karşılaştıran ayrı bir backend uç noktası gerektirir; henüz eklenmedi. Grubunda en yüksek puanlı markalar listesi de aynı nedenle şu an gösterilmiyor."
      />

      <View style={{ gap: spacing.sm }}>
        {basketProfile.perItem.map((item, index) => {
          const cartItem = cartItems[index];
          if (!cartItem) return null;

          return (
            <BasketItemRow
              key={cartItem.key}
              item={item}
              quantityAmount={cartItem.quantity.amount}
              userProfile={userProfile}
              onQuantityChange={(nextAmount) => onQuantityChange(cartItem.key, nextAmount)}
              onRemove={() => onRemove(cartItem.key)}
            />
          );
        })}
      </View>
    </View>
  );
}
