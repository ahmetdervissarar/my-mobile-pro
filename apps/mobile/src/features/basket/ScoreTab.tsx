import { router } from 'expo-router';
import { Text, View } from 'react-native';

import type { BasketProfile } from '../../api/basketClient';
import type { CartItem } from '../../state/cartStore';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { EmptyState } from '../../ui/EmptyState';
import { getScorePillLabel } from '../../ui/scoreVerdict';
import { spacing, useTheme } from '../../ui/theme';
import { BasketItemRow } from './BasketItemRow';
import { summarizeBasketAllergenStatus } from './helpers';

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
  // D2: profil boşken beyan edilmiş alerjen varsa da (gerçek bir profil
  // çakışması olmasa dahi) hüküm kelimesi bastırılır.
  const suppressVerdict = allergenSummary.suppressVerdict;
  const headlineColor =
    allergenSummary.tone === 'danger' ? colors.danger : allergenSummary.tone === 'warning' ? colors.warn : colors.ink;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Özet (katmanlı sadeleştirme, onaylı plan): en üstte tek satır
          durum, altında puan sönük ve küçük. Açıklama metni yok. */}
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: headlineColor }}>{allergenSummary.headline}</Text>
        <Text style={{ fontSize: 12.5, color: colors.muted }}>
          {getScorePillLabel({ score: basketProfile.basketRafSkoru, allergenPriority: suppressVerdict })}
        </Text>
      </View>

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
