import { Text, View } from 'react-native';

import type { BasketProfile } from '../../api/basketClient';
import type { CartItem } from '../../state/cartStore';
import { EmptyState } from '../../ui/EmptyState';
import { ScoreRing } from '../../ui/ScoreRing';
import { radii, spacing, useTheme } from '../../ui/theme';
import { BasketItemRow } from './BasketItemRow';
import { countCriticalAllergenItems, formatCoverage } from './helpers';

export interface ScoreTabProps {
  basketProfile: BasketProfile | null;
  cartItems: CartItem[];
  onQuantityChange: (key: string, nextAmount: number) => void;
  onRemove: (key: string) => void;
}

export function ScoreTab({ basketProfile, cartItems, onQuantityChange, onRemove }: ScoreTabProps) {
  const { colors } = useTheme();

  if (!basketProfile) {
    return <EmptyState title="Sepet skoru hesaplanıyor..." />;
  }

  const criticalCount = countCriticalAllergenItems(basketProfile.perItem);

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
          backgroundColor: criticalCount > 0 ? colors.dangerBg : colors.soft,
          padding: spacing.md,
          gap: 4,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: criticalCount > 0 ? colors.danger : colors.ink }}>
          {criticalCount > 0
            ? `${criticalCount} üründe profilinizle çakışan alerjen uyarısı var`
            : 'Alerji uyarılı ürün tespit edilmedi'}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
          Bu sayı yalnızca mevcut ürün verisinden hesaplanır; veri eksikse 0 görünebilir ve bu "alerjen yok"
          anlamına gelmez. Her ürünün kendi sayfasındaki alerji bandı esastır.
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
              onQuantityChange={(nextAmount) => onQuantityChange(cartItem.key, nextAmount)}
              onRemove={() => onRemove(cartItem.key)}
            />
          );
        })}
      </View>
    </View>
  );
}
