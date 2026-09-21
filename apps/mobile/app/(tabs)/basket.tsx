import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { evaluateBasket, type BasketEvaluateResponse } from '../../src/api/basketClient';
import { PriceTab } from '../../src/features/basket/PriceTab';
import { ScoreTab } from '../../src/features/basket/ScoreTab';
import {
  cartItemToBasketItem,
  clearCart,
  removeFromCart,
  setCartItemQuantity,
  useCart,
} from '../../src/state/cartStore';
import { loadUserSensitivityProfile } from '../../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile, type UserSensitivityProfile } from '../../src/userProfile/userProfileTypes';
import { EmptyState } from '../../src/ui/EmptyState';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { SegmentedControl } from '../../src/ui/SegmentedControl';
import { spacing, useTheme } from '../../src/ui/theme';

type BasketTabKey = 'score' | 'price';

const TAB_OPTIONS: { key: BasketTabKey; label: string }[] = [
  { key: 'score', label: 'Puana göre' },
  { key: 'price', label: 'Fiyata göre' },
];

export default function BasketScreen() {
  const { colors } = useTheme();
  const cartItems = useCart();
  const [activeTab, setActiveTab] = useState<BasketTabKey>('score');
  const [evaluation, setEvaluation] = useState<BasketEvaluateResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(emptyUserSensitivityProfile);

  useEffect(() => {
    void loadUserSensitivityProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(emptyUserSensitivityProfile));
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) {
      setEvaluation(null);
      return;
    }

    let isCancelled = false;
    setIsEvaluating(true);
    setErrorMessage(null);

    const timeout = setTimeout(() => {
      void evaluateBasket({ items: cartItems.map(cartItemToBasketItem) })
        .then((response) => {
          if (!isCancelled) setEvaluation(response);
        })
        .catch(() => {
          if (!isCancelled) setErrorMessage('Sepet değerlendirmesi şu anda tamamlanamadı.');
        })
        .finally(() => {
          if (!isCancelled) setIsEvaluating(false);
        });
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [cartItems]);

  if (cartItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.xl }}>
        <EmptyState
          title="Sepetin boş"
          message="Ara sekmesinden veya bir ürün sayfasından sepete ürün ekleyebilirsin."
          action={<PrimaryButton label="Ürün ara" onPress={() => router.push('/search')} />}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <SegmentedControl options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />

      {isEvaluating && !evaluation ? <EmptyState title="Sepet değerlendiriliyor..." /> : null}
      {errorMessage ? <EmptyState title="Sepet değerlendirilemedi" message={errorMessage} /> : null}

      {activeTab === 'score' ? (
        <ScoreTab
          basketProfile={evaluation?.basketProfile ?? null}
          cartItems={cartItems}
          userProfile={userProfile}
          onQuantityChange={setCartItemQuantity}
          onRemove={removeFromCart}
        />
      ) : (
        <PriceTab marketEvaluations={evaluation?.marketEvaluations ?? null} />
      )}

      <PrimaryButton label="Sepeti temizle" variant="ghost" onPress={clearCart} />
    </ScrollView>
  );
}
