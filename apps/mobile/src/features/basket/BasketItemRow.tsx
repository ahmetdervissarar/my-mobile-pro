import { Pressable, Text, View } from 'react-native';

import type { BasketProfileItem } from '../../api/basketClient';
import { AllergenChip } from '../../ui/AllergenChip';
import { NovaBadge } from '../../ui/NovaBadge';
import { NutriScoreBadge } from '../../ui/NutriScoreBadge';
import { ScorePill } from '../../ui/ScorePill';
import { Stepper } from '../../ui/Stepper';
import { radii, spacing, useTheme } from '../../ui/theme';
import { hasCriticalAllergenFlag } from './helpers';

export interface BasketItemRowProps {
  item: BasketProfileItem;
  quantityAmount: number;
  onQuantityChange: (nextAmount: number) => void;
  onRemove: () => void;
}

/**
 * Sepet ürün satırı. Nutri-Score ve NOVA backend sepet sözleşmesinde
 * (BasketProfileItem) henüz yok; bu yüzden her zaman "veri yok" gösterilir
 * (bkz. görev raporu — backend için yapılacaklar).
 */
export function BasketItemRow({ item, quantityAmount, onQuantityChange, onRemove }: BasketItemRowProps) {
  const { colors } = useTheme();
  const allergenStatus = hasCriticalAllergenFlag(item.riskFlags) ? 'declared_contains' : 'unknown_or_unverified';

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink }}>{item.label}</Text>
        <ScorePill score={item.score} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <NutriScoreBadge grade={null} />
        <NovaBadge group={null} />
        <AllergenChip status={allergenStatus} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stepper
          value={quantityAmount}
          onChange={onQuantityChange}
          unitLabel={item.quantity.unit === 'piece' ? 'adet' : item.quantity.unit}
        />

        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`${item.label} ürününü sepetten kaldır`}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>Kaldır</Text>
        </Pressable>
      </View>
    </View>
  );
}
