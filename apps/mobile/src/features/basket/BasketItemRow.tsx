import { Pressable, Text, View } from 'react-native';

import type { BasketProfileItem } from '../../api/basketClient';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel } from '../../riskEngine/catalogAllergenChip';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { AllergenChip } from '../../ui/AllergenChip';
import { getProductDisplayName } from '../../ui/productDisplayName';
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
  /** Sepete eklendiği andaki GTIN — adı/markası bilinmeyen üründe barkodu ayrı, küçük/gri göstermek için. */
  productId?: string;
  packageSize?: { amount: number; unit: string } | null;
}

/**
 * Sepet ürün satırı (katmanlı sadeleştirme, onaylı plan): ad, tek rozet
 * (ScorePill — profille çakışma varsa zaten "Alerjen uyarısı öncelikli"
 * gösterir, bkz. P2 invariant), miktar kontrolü, Kaldır. Açıklama metni
 * yok — ayrıntı ürün sayfasında (AllergenDetailSheet). Alerjen KARAR
 * mantığına dokunulmadı; yalnız hangi bilginin kartta göründüğü değişti.
 */
export function BasketItemRow({
  item,
  quantityAmount,
  userProfile,
  onQuantityChange,
  onRemove,
  onPress,
  productId,
  packageSize,
}: BasketItemRowProps) {
  const { colors } = useTheme();
  const evaluation = evaluateCatalogAllergenDataForProfile(item.allergenData, userProfile);
  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);
  const isGroupEstimate = item.scoreSource === 'group_estimate';
  const isAllergenConflict = displayInfo?.isConflict ?? false;
  const displayName = getProductDisplayName({ label: item.label, productId, packageSize });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${displayName.title} ürün sayfasını aç` : undefined}
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
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink }}>{displayName.title}</Text>
        <ScorePill score={item.score} allergenPriority={isAllergenConflict} isEstimate={isGroupEstimate} />
      </View>

      {displayName.unknownNameBarcode ? (
        <Text style={{ fontSize: 11, color: colors.muted }}>{displayName.unknownNameBarcode}</Text>
      ) : null}

      {/* Cihaz testi (feat/catalog-alternatives): çakışma zaten kırmızı
          kenar + ScorePill'in "Alerjen uyarısı öncelikli" ile görünür —
          çakışma YOKSA (beyan/belirtilmemiş/veri yok) de rozetsiz satır
          kalmasın diye ayrı bir AllergenChip eklendi (fail-open'a karşı). */}
      {!isAllergenConflict ? (
        <AllergenChip status={evaluation.status} displayInfo={displayInfo} />
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stepper
          value={quantityAmount}
          onChange={onQuantityChange}
          unitLabel={item.quantity.unit === 'piece' ? 'adet' : item.quantity.unit}
        />

        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`${displayName.title} ürününü sepetten kaldır`}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>Kaldır</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
