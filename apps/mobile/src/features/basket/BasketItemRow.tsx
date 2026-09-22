import { Pressable, Text, View } from 'react-native';

import type { BasketProfileItem } from '../../api/basketClient';
import { getCatalogAllergenChipStatus } from '../../riskEngine/catalogAllergenChip';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { AllergenChip } from '../../ui/AllergenChip';
import { NovaBadge } from '../../ui/NovaBadge';
import { NutriScoreBadge } from '../../ui/NutriScoreBadge';
import { ScorePill } from '../../ui/ScorePill';
import { Stepper } from '../../ui/Stepper';
import { radii, spacing, useTheme } from '../../ui/theme';

export interface BasketItemRowProps {
  item: BasketProfileItem;
  quantityAmount: number;
  userProfile: UserSensitivityProfile;
  onQuantityChange: (nextAmount: number) => void;
  onRemove: () => void;
  /** Doluysa kart tıklanabilir olur ve ürün sayfasına götürür (yalnız GTIN'i bilinen 'product' tipi öğeler). */
  onPress?: () => void;
}

/**
 * Sepet ürün satırı. productId katalogda bulunursa Nutri-Score/NOVA/alerjen
 * gerçek veriyle gösterilir; bulunamazsa (veya öğe bir ürün grubuysa)
 * "veri yok" kalır — asla tahmin edilmez.
 */
export function BasketItemRow({ item, quantityAmount, userProfile, onQuantityChange, onRemove, onPress }: BasketItemRowProps) {
  const { colors } = useTheme();
  const allergenChip = getCatalogAllergenChipStatus(item.allergenData, userProfile);
  const isGroupEstimate = item.scoreSource === 'group_estimate';
  const allergenNote = allergenChip.note;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${item.label} ürün sayfasını aç` : undefined}
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
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <ScorePill score={item.score} />
          {isGroupEstimate ? (
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>grup tahmini</Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <NutriScoreBadge grade={item.nutriScore?.grade ?? null} source={item.nutriScore?.source} status={item.nutriScore?.status} />
        <NovaBadge group={item.nova?.group ?? null} />
        <AllergenChip status={allergenChip.status} />
      </View>

      {allergenNote ? (
        <Text style={{ fontSize: 11, color: colors.muted }}>{allergenNote}</Text>
      ) : null}

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
    </Pressable>
  );
}
