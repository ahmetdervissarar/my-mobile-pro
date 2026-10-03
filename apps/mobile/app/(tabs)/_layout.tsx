import { router, Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { useCartItemCount } from '../../src/state/cartStore';
import { clearUnsavedProfileChanges, interceptIfDirty } from '../../src/userProfile/unsavedProfileChangesGuard';
import { MIN_TOUCH_TARGET, radii, useTheme } from '../../src/ui/theme';

/**
 * Cihaz testi (feat/catalog-alternatives), madde 3: profil alt ekranları
 * (alerjen/kronik/sağlık tercihi) bu Tabs navigatörünün href:null gizli
 * sekmeleri — sekme çubuğundan başka bir sekmeye dokunmak React
 * Navigation'da ekranı KALDIRMAZ, yalnız odağı değiştirir, bu yüzden o
 * ekranların kendi 'beforeRemove' tabanlı uyarısı hiç tetiklenmezdi. Bu
 * yardımcı, her "gerçek" sekmenin tabPress'ini keserek aynı uyarıyı burada
 * da gösterir; onaylanırsa hedef sekmeye NAVİGE EDER (varsayılan tabPress
 * davranışının yaptığını elle tekrarlar).
 */
function createUnsavedProfileGuardListeners(onProceed: () => void) {
  return {
    tabPress: (event: { preventDefault: () => void }) => {
      const intercepted = interceptIfDirty(() => {
        clearUnsavedProfileChanges();
        onProceed();
      });
      if (intercepted) event.preventDefault();
    },
  };
}

function TabGlyph({ glyph, focused }: { glyph: string; focused: boolean }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 20, color: focused ? colors.pine : colors.muted }}>{glyph}</Text>;
}

function CartBadge({ count }: { count: number }) {
  const { colors } = useTheme();

  if (count <= 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: -4,
        right: -10,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 3,
        backgroundColor: colors.citrus,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#1B1B1B' }}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const cartCount = useCartItemCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: MIN_TOUCH_TARGET + 24,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana sayfa',
          tabBarAccessibilityLabel: 'Ana sayfa',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="⌂" focused={focused} />,
        }}
        listeners={createUnsavedProfileGuardListeners(() => router.navigate('/'))}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Ara',
          tabBarAccessibilityLabel: 'Ürün ara',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="⌕" focused={focused} />,
        }}
        listeners={createUnsavedProfileGuardListeners(() => router.navigate('/search'))}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Okut',
          tabBarAccessibilityLabel: 'Barkod okut',
          tabBarIcon: () => (
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: radii.pill,
                backgroundColor: colors.pine,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 20, color: colors.citrus }}>▣</Text>
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            const intercepted = interceptIfDirty(() => {
              clearUnsavedProfileChanges();
              router.push('/barcode-scan');
            });
            if (!intercepted) router.push('/barcode-scan');
          },
        }}
      />
      <Tabs.Screen
        name="basket"
        options={{
          title: 'Sepet',
          tabBarAccessibilityLabel: `Sepet, ${cartCount} ürün`,
          tabBarIcon: ({ focused }) => (
            <View>
              <TabGlyph glyph="▤" focused={focused} />
              <CartBadge count={cartCount} />
            </View>
          ),
        }}
        listeners={createUnsavedProfileGuardListeners(() => router.navigate('/basket'))}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarAccessibilityLabel: 'Profilim',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="◍" focused={focused} />,
        }}
        listeners={createUnsavedProfileGuardListeners(() => router.navigate('/profile'))}
      />
      <Tabs.Screen
        name="product-result"
        options={{
          // href:null: sekme çubuğunda görünmez ama AYNI Tabs navigatörünün
          // parçası kalır — bu yüzden ürün sayfasına gidildiğinde alt sekme
          // çubuğu (kök Stack'in üstüne push edilen bir ekranın aksine)
          // görünür kalır (bkz. görev bulgusu, madde 2).
          href: null,
          title: 'Ürün',
        }}
      />
      {/* Madde 2 (cihaz testi 1 Ekim): aşağıdaki 8 ekran de aynı href:null
          deseniyle Tabs navigatörüne taşındı — alt sekme çubuğu artık bu
          ekranlarda da görünür kalır. */}
      <Tabs.Screen name="barcode-scan" options={{ href: null, title: 'Barkod okut' }} />
      <Tabs.Screen name="photo-search" options={{ href: null, title: 'Fotoğrafla ara' }} />
      <Tabs.Screen name="basket-result" options={{ href: null, title: 'Sepet sonucu' }} />
      <Tabs.Screen name="product-contribution" options={{ href: null, title: 'Ürün katkısı' }} />
      <Tabs.Screen name="product-group" options={{ href: null, title: 'Ürün grubu' }} />
      <Tabs.Screen name="profile-allergens" options={{ href: null, title: 'Alerjen profilim' }} />
      <Tabs.Screen name="profile-chronic" options={{ href: null, title: 'Kronik hassasiyet' }} />
      <Tabs.Screen name="profile-health-preferences" options={{ href: null, title: 'Sağlık tercihleri' }} />
    </Tabs>
  );
}
