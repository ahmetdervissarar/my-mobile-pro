import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { fetchProductsByGroup, type ProductSearchSuggestion } from '../../src/api/productSuggestionClient';
import { isRafScorePriceless } from '../../src/price/rafScorePriceless';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel } from '../../src/riskEngine/catalogAllergenChip';
import {
  loadUserSensitivityProfile,
  subscribeToUserSensitivityProfileChanges,
} from '../../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile, type UserSensitivityProfile } from '../../src/userProfile/userProfileTypes';
import { EmptyState } from '../../src/ui/EmptyState';
import { NovaBadge } from '../../src/ui/NovaBadge';
import { NutriScoreBadge } from '../../src/ui/NutriScoreBadge';
import { getProductDisplayName } from '../../src/ui/productDisplayName';
import { ProductRow } from '../../src/ui/ProductRow';
import { FixedHeaderBar } from '../../src/ui/FixedHeaderBar';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../../src/ui/theme';

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function ProductGroupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FixedHeaderBar title={label} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
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
            const displayName = getProductDisplayName({
              label: product.label,
              productId: product.productId,
              packageSize: product.packageSize,
            });
            const meta = displayName.unknownNameBarcode
              ? displayName.unknownNameBarcode
              : [product.brand, product.packageSize ? `${product.packageSize.amount} ${product.packageSize.unit}` : undefined]
                  .filter(Boolean)
                  .join(' · ') || null;

            return (
              <ProductRow
                key={product.productId}
                imageUrl={product.imageUrl}
                name={displayName.title}
                meta={meta}
                score={product.rafScore?.score ?? null}
                isScorePriceless={isRafScorePriceless(product.rafScore)}
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
    </View>
  );
}
