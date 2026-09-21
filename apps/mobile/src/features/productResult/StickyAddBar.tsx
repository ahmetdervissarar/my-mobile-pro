import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addToCart } from '../../state/cartStore';
import { PrimaryButton } from '../../ui/PrimaryButton';
import { spacing, useTheme } from '../../ui/theme';
import { Toast } from '../../ui/Toast';

export interface StickyAddBarCartInput {
  type: 'product' | 'product_group';
  productId?: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: { amount: number; unit: string };
  imageUrl?: string | null;
}

export interface StickyAddBarProps {
  cartInput: StickyAddBarCartInput | null;
}

/** Altta sabit "Sepete ekle" çubuğu. Ürün grubu çözülemiyorsa devre dışı kalır. */
export function StickyAddBar({ cartInput }: StickyAddBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isToastVisible, setIsToastVisible] = useState(false);

  const handleAdd = () => {
    if (!cartInput) return;
    addToCart(cartInput);
    setIsToastVisible(true);
  };

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.line,
        backgroundColor: colors.bg,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: Math.max(insets.bottom, spacing.md),
      }}
    >
      {!cartInput ? (
        <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: spacing.xs }}>
          Bu ürün için sepete ekleme henüz desteklenmiyor.
        </Text>
      ) : null}

      <PrimaryButton
        label="Sepete ekle"
        variant="citrus"
        disabled={!cartInput}
        onPress={handleAdd}
        accessibilityLabel="Ürünü sepete ekle"
      />

      <Toast message="Sepete eklendi" visible={isToastVisible} onHide={() => setIsToastVisible(false)} />
    </View>
  );
}
