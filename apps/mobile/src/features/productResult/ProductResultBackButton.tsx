/**
 * RafSkoru — Ürün Sayfası Geri Düğmesi
 * src/features/productResult/ProductResultBackButton.tsx
 *
 * Cihaz testi 1 Ekim, madde 6: ürün sayfasında geri dönüş yoktu. Expo
 * Router'ın birleşik gezinme geçmişi sayesinde router.back() geldiği
 * ekrana (arama/sepet/ana sayfa) döner; geçmiş yoksa (ör. derin bağlantı)
 * ana sayfaya düşer.
 */
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { spacing, useTheme } from '../../ui/theme';

export function ProductResultBackButton() {
  const { colors } = useTheme();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Geri dön"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' }}
    >
      <Text style={{ fontSize: 20, color: colors.ink }}>←</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Geri</Text>
    </Pressable>
  );
}
