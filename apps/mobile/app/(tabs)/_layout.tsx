import { router, Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { useCartItemCount } from '../../src/state/cartStore';
import { MIN_TOUCH_TARGET, radii, useTheme } from '../../src/ui/theme';

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
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Ara',
          tabBarAccessibilityLabel: 'Ürün ara',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="⌕" focused={focused} />,
        }}
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
            router.push('/barcode-scan');
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
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarAccessibilityLabel: 'Profilim',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="◍" focused={focused} />,
        }}
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
    </Tabs>
  );
}
