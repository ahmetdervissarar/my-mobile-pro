/**
 * RafSkoru — Sabit Üst Başlık Çubuğu
 * src/ui/FixedHeaderBar.tsx
 *
 * Cihaz testi 1 Ekim, madde 3: ürün sayfasında geri düğmesi içerikle
 * birlikte kaydırılıp kayboluyordu. Bu bileşen ScrollView'in DIŞINDA,
 * sabit bir üst çubuk olarak render edilir — solda geri oku, ortada tek
 * satıra kısaltılmış başlık, safe area'ya saygılı. Ürün sayfası, kategori
 * (product-group) ve katkı (product-contribution) ekranlarında kullanılır.
 */
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from './theme';

export interface FixedHeaderBarProps {
  title: string;
}

export function FixedHeaderBar({ title }: FixedHeaderBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: Math.max(insets.top, spacing.md),
        paddingBottom: spacing.sm,
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="Geri dön"
        hitSlop={8}
      >
        <Text style={{ fontSize: 20, color: colors.ink }}>←</Text>
      </Pressable>
      <Text
        style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
    </View>
  );
}
