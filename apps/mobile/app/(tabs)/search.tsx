import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchSearchSuggestions, type SearchSuggestion } from '../../src/api/productSuggestionClient';
import { SearchResultRow } from '../../src/features/search/SearchResultRow';
import { getSearchCardMetaLine } from '../../src/features/search/searchCardPresentation';
import { getDuplicateBarcodeSuffixes } from '../../src/features/search/suggestionDisambiguation';
import { getAllergenBannerDataFromCatalog, type AllergenBannerData } from '../../src/features/productResult/helpers';
import { addToCart, getCartItemKey, removeFromCart, suggestionToCartInput, useCart } from '../../src/state/cartStore';
import { getProductDisplayName } from '../../src/ui/productDisplayName';
import {
  loadUserSensitivityProfile,
  subscribeToUserSensitivityProfileChanges,
} from '../../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile, type UserSensitivityProfile } from '../../src/userProfile/userProfileTypes';
import { EmptyState } from '../../src/ui/EmptyState';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../../src/ui/theme';
import { Toast } from '../../src/ui/Toast';

const EMPTY_ALLERGEN_BANNER_DATA: AllergenBannerData = {
  status: 'unknown_or_unverified',
  declaredList: [],
  traceList: [],
  criticalMatches: [],
  displayInfo: null,
  perKey: [],
};

function getSuggestionKey(suggestion: SearchSuggestion): string {
  return suggestion.type === 'product'
    ? `product:${suggestion.productId}`
    : `product_group:${suggestion.productGroupKey}`;
}

/** Arama/sepetle AYNI birleştirme çekirdeğini kullanır — yeni bir karar üretmez (bkz. onaylı plan, madde 8). */
function getSuggestionAllergenBannerData(
  suggestion: SearchSuggestion,
  userProfile: UserSensitivityProfile,
): AllergenBannerData {
  if (suggestion.type !== 'product' || !suggestion.allergenData) {
    return EMPTY_ALLERGEN_BANNER_DATA;
  }

  return getAllergenBannerDataFromCatalog({
    catalogAllergenData: suggestion.allergenData,
    userProfile,
    riskWarnings: [],
  });
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ initialQuery?: string | string[] }>();
  const initialQueryParam = params.initialQuery;
  const initialQuery = Array.isArray(initialQueryParam) ? initialQueryParam[0] ?? '' : initialQueryParam ?? '';

  const [query, setQuery] = useState(initialQuery);
  const searchInputRef = useRef<TextInput>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(emptyUserSensitivityProfile);
  const [cartActionErrorVisible, setCartActionErrorVisible] = useState(false);
  const cartItems = useCart();
  const duplicateBarcodeSuffixes = useMemo(() => getDuplicateBarcodeSuffixes(suggestions), [suggestions]);

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
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setIsSuggesting(false);
      setSearchErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsSuggesting(true);
    setSearchErrorMessage(null);

    const timeout = setTimeout(() => {
      fetchSearchSuggestions(trimmedQuery)
        .then((nextSuggestions) => {
          if (isActive) {
            setSuggestions(nextSuggestions);
          }
        })
        .catch(() => {
          if (isActive) {
            setSuggestions([]);
            setSearchErrorMessage('Bağlantı kurulamadı, tekrar deneyin');
          }
        })
        .finally(() => {
          if (isActive) {
            setIsSuggesting(false);
          }
        });
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const openProduct = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'product') {
      router.push({ pathname: '/product-result', params: { barcode: suggestion.productId } });
      return;
    }

    router.push({
      pathname: '/product-group',
      params: { productGroupKey: suggestion.productGroupKey, label: suggestion.label },
    });
  };

  const handleToggleCart = async (suggestion: SearchSuggestion) => {
    const cartInput = suggestionToCartInput(suggestion);
    const ok = cartItems.some((item) => item.key === getCartItemKey(cartInput))
      ? await removeFromCart(getCartItemKey(cartInput))
      : await addToCart(cartInput);

    if (!ok) {
      setCartActionErrorVisible(true);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          // Madde 8 (cihaz testi 1 Ekim): başlık durum çubuğunun altında kalıyordu.
          // Kod, çalışan diğer ekranlarla (ana sayfa, sepet) birebir aynı safe-area
          // deseni kullanıyor; cihazda görsel doğrulama yapılamadığından kesin kök
          // neden bulunamadı. Savunmacı önlem: bu ekrana özel ek üst boşluk.
          paddingTop: Math.max(insets.top, spacing.xl) + spacing.md,
          gap: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>Ürün Ara</Text>

        <View style={{ position: 'relative', justifyContent: 'center' }}>
          <TextInput
            ref={searchInputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Ürün adı yazın"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Ürün adı ara"
            style={{
              minHeight: MIN_TOUCH_TARGET,
              borderWidth: 2,
              borderColor: colors.pine2,
              borderRadius: radii.lg,
              paddingHorizontal: spacing.lg,
              paddingRight: MIN_TOUCH_TARGET + spacing.sm,
              fontSize: 16,
              color: colors.ink,
              backgroundColor: colors.surface,
            }}
          />

          {query.length > 0 ? (
            <Pressable
              onPress={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              accessibilityRole="button"
              accessibilityLabel="Aramayı temizle"
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: MIN_TOUCH_TARGET,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: colors.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.muted }}>✕</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        {isSuggesting ? <Text style={{ fontSize: 12.5, color: colors.muted }}>Öneriler aranıyor...</Text> : null}

        {!isSuggesting && searchErrorMessage ? (
          <EmptyState title="Bağlantı kurulamadı, tekrar deneyin" />
        ) : !isSuggesting && query.trim().length >= 2 && suggestions.length === 0 ? (
          <EmptyState
            title="Sonuç bulunamadı"
            message="Farklı bir ürün adıyla tekrar deneyin veya bu ürünü kayıtlı olmayan ürün olarak ekleyin."
            action={
              <Pressable
                onPress={() => router.push({ pathname: '/product-contribution', params: { productName: query.trim() } })}
                accessibilityRole="button"
                accessibilityLabel="Kayıtlı olmayan ürünü ekle"
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.pine2 }}>
                  Kayıtlı olmayan ürünü ekle
                </Text>
              </Pressable>
            }
          />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          {suggestions.map((suggestion) => {
            const key = getSuggestionKey(suggestion);
            const isAdded = cartItems.some((item) => item.key === getCartItemKey(suggestionToCartInput(suggestion)));
            const allergenBannerData = getSuggestionAllergenBannerData(suggestion, userProfile);
            const displayName =
              suggestion.type === 'product'
                ? getProductDisplayName({
                    label: suggestion.label,
                    productId: suggestion.productId,
                    packageSize: suggestion.packageSize,
                  })
                : { title: suggestion.label, unknownNameBarcode: null };
            const metaLine = displayName.unknownNameBarcode
              ? displayName.unknownNameBarcode
              : suggestion.type === 'product'
                ? getSearchCardMetaLine({
                    brand: suggestion.brand,
                    packageSize: suggestion.packageSize,
                  })
                : 'Ürün grubu';
            const duplicateBarcodeSuffix =
              suggestion.type === 'product' && !displayName.unknownNameBarcode
                ? duplicateBarcodeSuffixes.get(suggestion.productId)
                : undefined;

            return (
              <SearchResultRow
                key={key}
                imageUrl={suggestion.type === 'product' ? suggestion.imageUrl : undefined}
                name={displayName.title}
                metaLine={metaLine}
                duplicateBarcodeSuffix={duplicateBarcodeSuffix}
                allergenData={allergenBannerData}
                rafScore={suggestion.type === 'product' ? suggestion.rafScore : undefined}
                nutriScoreGrade={suggestion.type === 'product' ? suggestion.nutriScore?.grade ?? null : null}
                novaGroup={suggestion.type === 'product' ? suggestion.nova?.group ?? null : null}
                showNutriNova={suggestion.type === 'product'}
                onPress={() => openProduct(suggestion)}
                trailing={
                  <Pressable
                    onPress={() => void handleToggleCart(suggestion)}
                    accessibilityRole="button"
                    accessibilityLabel={isAdded ? 'Sepetten çıkar' : 'Sepete ekle'}
                    style={{
                      width: MIN_TOUCH_TARGET,
                      height: MIN_TOUCH_TARGET,
                      borderRadius: radii.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isAdded ? colors.leaf : colors.pine,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{isAdded ? '✓' : '+'}</Text>
                  </Pressable>
                }
              />
            );
          })}
        </View>

        {suggestions.length > 0 ? (
          <Text style={{ fontSize: 11.5, color: colors.muted }}>
            Ayrıntılı alerjen bilgisi ve puanın boyut dökümü ürün sayfasında; aramada fiyat henüz yok.
          </Text>
        ) : null}
      </ScrollView>

      {cartItems.length > 0 ? (
        <Pressable
          onPress={() => router.push('/basket')}
          accessibilityRole="button"
          accessibilityLabel={`Sepet, ${cartItems.length} ürün, sepete git`}
          style={{
            position: 'absolute',
            left: spacing.xl,
            right: spacing.xl,
            bottom: spacing.xl,
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: radii.lg,
            backgroundColor: colors.citrus,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1B1B1B' }}>
            Sepet · {cartItems.length} ürün
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1B1B1B' }}>Sepete git</Text>
        </Pressable>
      ) : null}

      <Toast
        message="Sepete kaydedilemedi, tekrar deneyin"
        visible={cartActionErrorVisible}
        onHide={() => setCartActionErrorVisible(false)}
      />
    </View>
  );
}
