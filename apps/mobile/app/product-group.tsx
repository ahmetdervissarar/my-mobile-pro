import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../src/ui/theme';

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function ProductGroupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    productGroupKey?: string;
    label?: string;
  }>();

  const label = getSingleParam(params.label) || 'Kategori';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: spacing.xl,
        paddingTop: Math.max(insets.top, spacing.xxxl),
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Kategori
      </Text>

      <Text
        style={{
          marginTop: spacing.sm,
          color: colors.ink,
          fontSize: 32,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>

      <View
        style={{
          marginTop: spacing.xxl,
          borderRadius: radii.xl,
          backgroundColor: colors.surface,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Text
          style={{
            color: colors.ink,
            fontSize: 17,
            fontWeight: '700',
          }}
        >
          Bu kategori için henüz ürün verisi yok
        </Text>

        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.muted,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          Gerçek ürün verisi eklendiğinde bu sayfada aynı kategorideki markalı ürünler, fiyatlar ve karşılaştırılabilir seçenekler listelenecek.
        </Text>
      </View>

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Aramaya dön"
        style={{
          marginTop: spacing.xl,
          minHeight: MIN_TOUCH_TARGET,
          borderRadius: radii.md,
          backgroundColor: colors.pine,
          paddingVertical: spacing.md,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          Aramaya dön
        </Text>
      </Pressable>
    </View>
  );
}
