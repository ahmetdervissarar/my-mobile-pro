import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        minHeight: 96,
        minWidth: '45%',
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        gap: spacing.md,
        justifyContent: 'flex-start',
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
  const insets = useSafeAreaInsets();
  const cartCount = useCartItemCount();
  const recentlyViewed = useRecentlyViewed();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, paddingTop: Math.max(insets.top, spacing.xl), gap: spacing.xl }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>RafSkoru</Text>
      </View>

      {/* İş 3 (görev onayı): "ana ekran barkod kartı" — TEK eylem rengi (accent). */}
      <Pressable
        onPress={() => router.push('/barcode-scan')}
        accessibilityRole="button"
        accessibilityLabel="Barkod okut"
        style={{
          minHeight: 96,
          borderRadius: radii.xxl,
          backgroundColor: colors.accent,
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
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>▣</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: colors.onAccent }}>Barkod okut</Text>
          <Text style={{ fontSize: 13, color: colors.onAccent, opacity: 0.85, marginTop: 2 }}>
            Ürünü tara, RafSkoru'nu anında gör
          </Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {/* Madde 9 (görev onayı): bu düğme "Fotoğrafla ara" adıyla ürün
            TANIMA beklentisi yaratıyordu — öyle bir tanıma hiç yok. Artık
            dürüstçe etiketlenmiş "paket bilgisini ekle" katkı akışına
            yönlendiriyor (bkz. product-contribution.tsx — kullanıcı fotoğraf
            çeker, ürün manuel olarak katkı/doğrulama kuyruğuna girer). */}
        <GridTile
          title="Paket bilgisi ekle"
          subtitle="Fotoğraflarını katkı olarak gönder"
          onPress={() => router.push('/product-contribution')}
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
        // D3 (device test 30 Eylül): açık marginTop — yalnızca üst ScrollView'in
        // contentContainerStyle gap'ine güvenmek, bu başlığın üstteki karo
        // ızgarasının üstüne binmesine yol açabiliyordu.
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
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
