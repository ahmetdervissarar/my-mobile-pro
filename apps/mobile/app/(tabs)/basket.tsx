import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { evaluateBasket, type BasketEvaluateResponse } from '../../src/api/basketClient';
import { PriceTab } from '../../src/features/basket/PriceTab';
import { ScoreTab } from '../../src/features/basket/ScoreTab';
import {
  cartItemToBasketItem,
  clearCart,
  removeFromCart,
  retryCartHydration,
  setCartItemQuantity,
  useCart,
  useCartHydrateError,
} from '../../src/state/cartStore';
import {
  loadUserSensitivityProfile,
  subscribeToUserSensitivityProfileChanges,
} from '../../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile, type UserSensitivityProfile } from '../../src/userProfile/userProfileTypes';
import { EmptyState } from '../../src/ui/EmptyState';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { SegmentedControl } from '../../src/ui/SegmentedControl';
import { spacing, useTheme } from '../../src/ui/theme';
import { Toast } from '../../src/ui/Toast';

type BasketTabKey = 'score' | 'price';

const TAB_OPTIONS: { key: BasketTabKey; label: string }[] = [
  { key: 'score', label: 'Puana göre' },
  { key: 'price', label: 'Fiyata göre' },
];

export default function BasketScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cartItems = useCart();
  const cartHydrateError = useCartHydrateError();
  const [activeTab, setActiveTab] = useState<BasketTabKey>('score');
  const [evaluation, setEvaluation] = useState<BasketEvaluateResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(emptyUserSensitivityProfile);
  const [cartActionErrorVisible, setCartActionErrorVisible] = useState(false);

  // P0-2: sepet kaydı (miktar değişikliği/çıkarma) başarısız olursa sessizce
  // geçilmez — kullanıcıya ayrı bir toast ile bildirilir. Değerlendirme
  // ağ hatası (errorMessage) ile karıştırılmaz, farklı bir başarısızlık türüdür.
  const handleQuantityChange = (key: string, amount: number) => {
    void setCartItemQuantity(key, amount).then((ok) => {
      if (!ok) setCartActionErrorVisible(true);
    });
  };

  const handleRemove = (key: string) => {
    void removeFromCart(key).then((ok) => {
      if (!ok) setCartActionErrorVisible(true);
    });
  };

  const handleClearCart = () => {
    Alert.alert('Sepet temizlensin mi?', 'Sepetteki tüm ürünler kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: () => {
          void clearCart().then((ok) => {
            if (!ok) setCartActionErrorVisible(true);
          });
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void loadUserSensitivityProfile()
        .then((profile) => {
          if (isActive) setUserProfile(profile);
        })
        .catch(() => {
          if (isActive) setUserProfile(emptyUserSensitivityProfile);
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => subscribeToUserSensitivityProfileChanges(setUserProfile), []);

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
          if (!isCancelled) setErrorMessage('Bağlantı kurulamadı, tekrar deneyin');
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
    // P7 (görev onayı): cihazdaki sepet kaydı okunamadıysa bu "sepetin boş"
    // DEĞİL — kullanıcıya gerçek durumu göster, yanlışlıkla sepetin
    // boşaldığını düşünmesin.
    if (cartHydrateError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            padding: spacing.xl,
            paddingTop: Math.max(insets.top, spacing.xl),
          }}
        >
          <EmptyState
            title="Sepetin okunamadı"
            message="Cihazdaki sepet verisi okunamadı. Sepetin boş olmayabilir — tekrar dene."
            action={<PrimaryButton label="Tekrar dene" onPress={() => void retryCartHydration()} />}
          />
        </View>
      );
    }

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          padding: spacing.xl,
          paddingTop: Math.max(insets.top, spacing.xl),
        }}
      >
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
      contentContainerStyle={{
        padding: spacing.xl,
        paddingTop: Math.max(insets.top, spacing.xl),
        gap: spacing.lg,
        paddingBottom: spacing.xxxl,
      }}
    >
      <SegmentedControl options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />

      {isEvaluating && !evaluation ? <EmptyState title="Sepet değerlendiriliyor..." /> : null}
      {errorMessage ? <EmptyState title="Sepet değerlendirilemedi" message={errorMessage} /> : null}

      {activeTab === 'score' ? (
        <ScoreTab
          basketProfile={evaluation?.basketProfile ?? null}
          cartItems={cartItems}
          userProfile={userProfile}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
        />
      ) : (
        <PriceTab marketEvaluations={evaluation?.marketEvaluations ?? null} />
      )}

      <PrimaryButton label="Sepeti temizle" variant="ghost" onPress={handleClearCart} />

      <Toast
        message="Sepete kaydedilemedi, tekrar deneyin"
        visible={cartActionErrorVisible}
        onHide={() => setCartActionErrorVisible(false)}
      />
    </ScrollView>
  );
}
