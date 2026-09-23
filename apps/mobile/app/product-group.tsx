import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchProductsByGroup, type ProductSearchSuggestion } from '../src/api/productSuggestionClient';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel } from '../src/riskEngine/catalogAllergenChip';
import { loadUserSensitivityProfile } from '../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile, type UserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import { EmptyState } from '../src/ui/EmptyState';
import { NovaBadge } from '../src/ui/NovaBadge';
import { NutriScoreBadge } from '../src/ui/NutriScoreBadge';
import { ProductRow } from '../src/ui/ProductRow';
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

  const productGroupKey = getSingleParam(params.productGroupKey);
  const label = getSingleParam(params.label) || 'Kategori';

  const [products, setProducts] = useState<ProductSearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(emptyUserSensitivityProfile);

  useEffect(() => {
    void loadUserSensitivityProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(emptyUserSensitivityProfile));
  }, []);

  useEffect(() => {
    if (!productGroupKey) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchProductsByGroup(productGroupKey)
      .then((nextProducts) => {
        if (isActive) setProducts(nextProducts);
      })
      .catch(() => {
        if (isActive) {
          setProducts([]);
          setErrorMessage('Bağlantı kurulamadı, tekrar deneyin');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [productGroupKey]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: Math.max(insets.top, spacing.xxxl),
        paddingBottom: spacing.xxxl,
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

      {isLoading ? (
        <Text style={{ marginTop: spacing.xxl, fontSize: 12.5, color: colors.muted }}>Ürünler yükleniyor...</Text>
      ) : errorMessage ? (
        <View style={{ marginTop: spacing.xxl }}>
          <EmptyState title={errorMessage} />
        </View>
      ) : products.length > 0 ? (
        <View style={{ marginTop: spacing.xxl, gap: spacing.sm }}>
          {products.map((product) => {
            const evaluation = evaluateCatalogAllergenDataForProfile(product.allergenData, userProfile);
            const allergenDisplayInfo = getAllergenDisplayLevel(evaluation.perKey);

            return (
              <ProductRow
                key={product.productId}
                imageUrl={product.imageUrl}
                name={product.label}
                meta={[product.brand, product.packageSize ? `${product.packageSize.amount} ${product.packageSize.unit}` : undefined]
                  .filter(Boolean)
                  .join(' · ') || null}
                score={null}
                allergenStatus={evaluation.status}
                allergenDisplayInfo={allergenDisplayInfo}
                allergenNote={evaluation.note}
                extraBadges={
                  <>
                    <NutriScoreBadge grade={product.nutriScore?.grade ?? null} source={product.nutriScore?.source} status={product.nutriScore?.status} />
                    <NovaBadge group={product.nova?.group ?? null} />
                  </>
                }
                onPress={() => router.push({ pathname: '/product-result', params: { barcode: product.productId } })}
              />
            );
          })}
        </View>
      ) : (
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
      )}

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
    </ScrollView>
  );
}
