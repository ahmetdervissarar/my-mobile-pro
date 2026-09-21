import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useCartItemCount } from '../../src/state/cartStore';
import { useRecentlyViewed } from '../../src/state/recentlyViewedStore';
import { ProductRow } from '../../src/ui/ProductRow';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../../src/ui/theme';

function GridTile({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={{
        flex: 1,
        minHeight: 118,
        minWidth: '45%',
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.md,
          backgroundColor: colors.soft,
        }}
      />
      <View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: 2 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const cartCount = useCartItemCount();
  const recentlyViewed = useRecentlyViewed();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.citrus }} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>RafSkoru</Text>
      </View>

      <Pressable
        onPress={() => router.push('/barcode-scan')}
        accessibilityRole="button"
        accessibilityLabel="Barkod okut"
        style={{
          minHeight: 96,
          borderRadius: radii.xxl,
          backgroundColor: colors.pine,
          padding: spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.lg,
            backgroundColor: colors.citrus,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>▣</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: '#fff' }}>Barkod okut</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
            Ürünü tara, RafSkoru'nu anında gör
          </Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <GridTile
          title="Fotoğrafla tanı"
          subtitle="Barkod okunamıyorsa"
          onPress={() => router.push('/photo-search')}
        />
        <GridTile title="İsimle ara" subtitle="Ürün adını yaz" onPress={() => router.push('/search')} />
        <GridTile
          title={cartCount > 0 ? 'Sepetim' : 'Sepet oluştur'}
          subtitle={cartCount > 0 ? `${cartCount} ürün` : 'Market karşılaştır'}
          onPress={() => router.push('/basket')}
        />
        <GridTile
          title="Alerji profilim"
          subtitle="Hassasiyetlerini seç"
          onPress={() => router.push('/profile-allergens')}
        />
      </View>

      {recentlyViewed.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Son baktıkların</Text>
          <View style={{ gap: spacing.sm }}>
            {recentlyViewed.slice(0, 6).map((entry) => (
              <ProductRow
                key={entry.key}
                imageUrl={entry.imageUrl}
                name={entry.productName}
                score={entry.score}
                onPress={() =>
                  router.push(
                    entry.barcode
                      ? { pathname: '/product-result', params: { barcode: entry.barcode } }
                      : { pathname: '/product-result', params: { productName: entry.productName } },
                  )
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ minHeight: MIN_TOUCH_TARGET }} />
    </ScrollView>
  );
}
