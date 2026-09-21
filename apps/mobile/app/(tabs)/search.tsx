import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { fetchSearchSuggestions, type SearchSuggestion } from '../../src/api/productSuggestionClient';
import { addToCart, getCartItemKey, suggestionToCartInput, useCart } from '../../src/state/cartStore';
import { EmptyState } from '../../src/ui/EmptyState';
import { ProductRow } from '../../src/ui/ProductRow';
import { SegmentedControl } from '../../src/ui/SegmentedControl';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../../src/ui/theme';

type SortKey = 'score' | 'price' | 'unitPrice';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'En yüksek puan' },
  { key: 'price', label: 'En düşük fiyat' },
  { key: 'unitPrice', label: 'Litre/kg fiyatı' },
];

function getSuggestionKey(suggestion: SearchSuggestion): string {
  return suggestion.type === 'product'
    ? `product:${suggestion.productId}`
    : `product_group:${suggestion.productGroupKey}`;
}

function getSuggestionMeta(suggestion: SearchSuggestion): string | null {
  if (suggestion.type !== 'product') {
    return 'Ürün grubu';
  }

  return (
    [suggestion.brand, suggestion.packageSize ? `${suggestion.packageSize.amount} ${suggestion.packageSize.unit}` : undefined]
      .filter(Boolean)
      .join(' · ') || null
  );
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ initialQuery?: string | string[] }>();
  const initialQueryParam = params.initialQuery;
  const initialQuery = Array.isArray(initialQueryParam) ? initialQueryParam[0] ?? '' : initialQueryParam ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const cartItems = useCart();

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    let isActive = true;
    setIsSuggesting(true);

    const timeout = setTimeout(() => {
      fetchSearchSuggestions(trimmedQuery)
        .then((nextSuggestions) => {
          if (isActive) {
            setSuggestions(nextSuggestions);
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

  // Sıralama seçenekleri bilinçli olarak korunur (bkz. görev raporu):
  // /api/search/suggest puan veya fiyat alanı döndürmüyor, bu yüzden
  // sıralama şu an sabit kalır (tahmini bir değerle doldurulmaz).
  const sortedSuggestions = useMemo(() => suggestions, [suggestions]);

  const openProduct = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'product') {
      router.push({ pathname: '/product-result', params: { productId: suggestion.productId } });
      return;
    }

    router.push({
      pathname: '/product-group',
      params: { productGroupKey: suggestion.productGroupKey, label: suggestion.label },
    });
  };

  const handleAddToCart = (suggestion: SearchSuggestion) => {
    addToCart(suggestionToCartInput(suggestion));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>Ürün Ara</Text>

        <TextInput
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
            fontSize: 16,
            color: colors.ink,
            backgroundColor: colors.surface,
          }}
        />

        {suggestions.length > 0 ? (
          <SegmentedControl options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
        ) : null}

        {isSuggesting ? <Text style={{ fontSize: 12.5, color: colors.muted }}>Öneriler aranıyor...</Text> : null}

        {!isSuggesting && query.trim().length >= 2 && sortedSuggestions.length === 0 ? (
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
          {sortedSuggestions.map((suggestion) => {
            const key = getSuggestionKey(suggestion);
            const isAdded = cartItems.some((item) => item.key === getCartItemKey(suggestionToCartInput(suggestion)));

            return (
              <ProductRow
                key={key}
                name={suggestion.label}
                meta={getSuggestionMeta(suggestion)}
                score={null}
                allergenStatus="unknown_or_unverified"
                onPress={() => openProduct(suggestion)}
                trailing={
                  <Pressable
                    onPress={() => handleAddToCart(suggestion)}
                    accessibilityRole="button"
                    accessibilityLabel={isAdded ? 'Sepete eklendi' : 'Sepete ekle'}
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

        {sortedSuggestions.length > 0 ? (
          <Text style={{ fontSize: 11.5, color: colors.muted }}>
            Puan ve fiyat verisi arama sonuçlarında henüz yok; bu alanlar "Veri yok" olarak gösterilir.
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
    </View>
  );
}
