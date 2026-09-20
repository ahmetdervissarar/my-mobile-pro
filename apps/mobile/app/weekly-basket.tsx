/**
 * RafSkoru — Haftalık sepet ekranı rotası (Aşama 9). app/weekly-basket.tsx
 *
 * Yalnız `EXPO_PUBLIC_CONSUMER_UX_V2` açıkken erişilebilir. I/O ve kalıcılık BURADADIR;
 * `WeeklyBasketScreen` ve `src/weeklyBasket/*` view-model dosyaları saf kalır. Silme, "Sepeti
 * temizle" VE "Yeni haftaya başla" her zaman `Alert.alert` ile onay ister (geri alınamaz işlem).
 * Okuma hatasında "Sepetiniz boş" gösterilmez (D1); hata görünür kalır, eski kayıt otomatik
 * silinmez.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isConsumerUxV2Enabled } from '../src/localProduct/featureFlag';
import { WeeklyBasketScreen } from '../src/weeklyBasket/WeeklyBasketScreen';
import { buildWeeklyBasketView } from '../src/weeklyBasket/basketViewModel';
import {
  clearWeeklyBasket,
  loadWeeklyBasket,
  removeBasketLine,
  startNewWeeklyBasket,
  updateBasketLineQuantity,
} from '../src/weeklyBasket/basketStorage';
import type { WeeklyBasketRecord } from '../src/weeklyBasket/types';
import { color, spacing, typography } from '../src/consumerUx/tokens';

export default function WeeklyBasketRoute() {
  const router = useRouter();
  const isEnabled = isConsumerUxV2Enabled();
  const [basket, setBasket] = useState<WeeklyBasketRecord | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);

  const reload = useCallback(() => {
    if (!isEnabled) return;
    let isActive = true;
    void loadWeeklyBasket().then((result) => {
      if (!isActive) return;
      if (result.ok) {
        setBasket(result.basket);
        setHasLoadError(false);
        setPersistenceError(null);
      } else {
        setBasket(null);
        setHasLoadError(true);
        setPersistenceError(result.errorMessage);
      }
    });
    return () => {
      isActive = false;
    };
  }, [isEnabled]);

  useFocusEffect(reload);

  if (!isEnabled) {
    return (
      <View style={styles.disabledContainer}>
        <Text style={styles.disabledText} allowFontScaling>
          Bu ekran bu sürümde kapalı.
        </Text>
      </View>
    );
  }

  const openProduct = (gtin: string) => {
    router.push({ pathname: '/product-result', params: { barcode: gtin, searchType: 'barcode' } });
  };

  const handleIncrement = async (gtin: string) => {
    const current = basket?.lines.find((l) => l.gtin === gtin);
    if (!current) return;
    const result = await updateBasketLineQuantity(gtin, current.quantity + 1);
    if (result.ok) {
      setBasket(result.basket);
      setHasLoadError(false);
      setPersistenceError(null);
    } else {
      setPersistenceError(result.errorMessage);
    }
  };

  const handleDecrement = async (gtin: string) => {
    const current = basket?.lines.find((l) => l.gtin === gtin);
    if (!current || current.quantity <= 1) return;
    const result = await updateBasketLineQuantity(gtin, current.quantity - 1);
    if (result.ok) {
      setBasket(result.basket);
      setHasLoadError(false);
      setPersistenceError(null);
    } else {
      setPersistenceError(result.errorMessage);
    }
  };

  const removeLine = (gtin: string) => {
    Alert.alert('Ürünü sepetten sil', 'Bu ürünü sepetten silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void removeBasketLine(gtin).then((result) => {
            if (result.ok) {
              setBasket(result.basket);
              setHasLoadError(false);
              setPersistenceError(null);
            } else {
              setPersistenceError(result.errorMessage);
            }
          });
        },
      },
    ]);
  };

  const clearBasket = () => {
    Alert.alert('Sepeti temizle', 'Sepetteki tüm ürünler silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sepeti temizle',
        style: 'destructive',
        onPress: () => {
          void clearWeeklyBasket().then((result) => {
            if (result.ok) {
              setBasket(result.basket);
              setHasLoadError(false);
              setPersistenceError(null);
            } else {
              setPersistenceError(result.errorMessage);
            }
          });
        },
      },
    ]);
  };

  const startNewWeek = () => {
    Alert.alert(
      'Yeni haftaya başla',
      'Önceki haftaya ait sepetin yerine yeni, boş bir sepet oluşturulacak. Emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Yeni haftaya başla',
          style: 'destructive',
          onPress: () => {
            void startNewWeeklyBasket().then((result) => {
              if (result.ok) {
                setBasket(result.basket);
                setHasLoadError(false);
                setPersistenceError(null);
              } else {
                setPersistenceError(result.errorMessage);
              }
            });
          },
        },
      ],
    );
  };

  const view = buildWeeklyBasketView(basket, { persistenceError, hasLoadError });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <WeeklyBasketScreen
        view={view}
        onIncrement={(gtin) => void handleIncrement(gtin)}
        onDecrement={(gtin) => void handleDecrement(gtin)}
        onRemove={removeLine}
        onClearBasket={clearBasket}
        onStartNewWeek={startNewWeek}
        onOpenProduct={openProduct}
        onOpenAlternatives={openProduct}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface },
  content: { padding: spacing.md, paddingBottom: 60 },
  disabledContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: color.surface },
  disabledText: { ...typography.body, color: color.inkMuted, textAlign: 'center' },
});
