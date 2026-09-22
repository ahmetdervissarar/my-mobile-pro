import { Pressable, Text, View } from 'react-native';

import type { BasketProfileItem } from '../../api/basketClient';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel } from '../../riskEngine/catalogAllergenChip';
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
  const evaluation = evaluateCatalogAllergenDataForProfile(item.allergenData, userProfile);
  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);
  const isGroupEstimate = item.scoreSource === 'group_estimate';
  const allergenNote = evaluation.note;
  const isAllergenConflict = displayInfo?.isConflict ?? false;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${item.label} ürün sayfasını aç` : undefined}
      style={{
        borderRadius: radii.lg,
        borderWidth: isAllergenConflict ? 2 : 1,
        borderColor: isAllergenConflict ? colors.danger : colors.line,
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

      {isAllergenConflict ? (
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.danger }}>Profilinizle çakışıyor</Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <NutriScoreBadge grade={item.nutriScore?.grade ?? null} source={item.nutriScore?.source} status={item.nutriScore?.status} />
        <NovaBadge group={item.nova?.group ?? null} />
        <AllergenChip status={evaluation.status} displayInfo={displayInfo} />
      </View>

      {displayInfo && displayInfo.otherLabels.length > 0 ? (
        <Text style={{ fontSize: 11, color: colors.muted }}>Ayrıca: {displayInfo.otherLabels.join(', ')}</Text>
      ) : null}

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
