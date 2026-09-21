import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  evaluateBasket,
  type BasketEvaluateResponse,
  type BasketItem,
  type BasketItemQuantity,
} from '../../src/api/basketClient';
import {
  fetchSearchSuggestions,
  type SearchSuggestion,
} from '../../src/api/productSuggestionClient';

function getBasketItemKey(item: BasketItem): string {
  return item.type === 'product'
    ? `product:${item.productId}`
    : `product_group:${item.productGroupKey}`;
}

function getSuggestionKey(suggestion: SearchSuggestion): string {
  return suggestion.type === 'product'
    ? `product:${suggestion.productId}`
    : `product_group:${suggestion.productGroupKey}`;
}

function getDefaultQuantity(productGroupKey: string): BasketItemQuantity {
  if (productGroupKey === 'milk' || productGroupKey === 'lactose_free_milk') {
    return { amount: 1, unit: 'liter' };
  }

  if (
    productGroupKey === 'rice' ||
    productGroupKey === 'bulgur' ||
    productGroupKey === 'pasta' ||
    productGroupKey === 'flour' ||
    productGroupKey === 'sugar'
  ) {
    return { amount: 1, unit: 'kilogram' };
  }

  return { amount: 1, unit: 'piece' };
}

function suggestionToBasketItem(suggestion: SearchSuggestion): BasketItem {
  if (suggestion.type === 'product') {
    return {
      type: 'product',
      productId: suggestion.productId,
      productGroupKey: suggestion.productGroupKey,
      label: suggestion.label,
      brand: suggestion.brand,
      packageSize: suggestion.packageSize,
      quantity: getDefaultQuantity(suggestion.productGroupKey),
    };
  }

  return {
    type: 'product_group',
    productGroupKey: suggestion.productGroupKey,
    label: suggestion.label,
    quantity: getDefaultQuantity(suggestion.productGroupKey),
  };
}

function getSuggestionBadge(suggestion: SearchSuggestion): string {
  return suggestion.type === 'product' ? 'Ürün' : 'Kategori';
}

export default function BasketScreen() {
  const router = useRouter();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;

    const timeout = setTimeout(() => {
      setIsSearching(true);

      fetchSearchSuggestions(trimmedQuery)
        .then((nextSuggestions) => {
          if (!isCancelled) {
            setSuggestions(nextSuggestions);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  const handleAddSuggestion = (suggestion: SearchSuggestion) => {
    const nextItem = suggestionToBasketItem(suggestion);
    const nextItemKey = getBasketItemKey(nextItem);

    setItems((currentItems) => {
      if (currentItems.some((item) => getBasketItemKey(item) === nextItemKey)) {
        return currentItems;
      }

      return [...currentItems, nextItem];
    });

    setQuery('');
    setSuggestions([]);
    setErrorMessage(null);
  };

  const handleRemoveItem = (itemToRemove: BasketItem) => {
    const keyToRemove = getBasketItemKey(itemToRemove);

    setItems((currentItems) =>
      currentItems.filter((item) => getBasketItemKey(item) !== keyToRemove),
    );
  };

  const handleEvaluate = async () => {
    if (items.length === 0) {
      setErrorMessage('Sepeti tamamlamak için en az bir ürün ekle.');
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result: BasketEvaluateResponse = await evaluateBasket({ items });

      router.push({
        pathname: '/basket-result',
        params: {
          result: JSON.stringify(result),
        },
      });
    } catch {
      setErrorMessage('Sepet değerlendirmesi şu anda tamamlanamadı.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#fff',
      }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          color: '#6B7280',
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Deneysel modül
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: '#111827',
          fontSize: 32,
          fontWeight: '800',
        }}
      >
        Sepet Oluştur
      </Text>

      <Text
        style={{
          marginTop: 10,
          color: '#4B5563',
          fontSize: 14,
          lineHeight: 21,
        }}
      >
        Ürün adı yaz, önerilerden sepete ekle. Şimdilik ürünler kategori
        niyeti olarak tutulur; gerçek ürün verisi geldiğinde aynı yapı markalı
        ürünlere genişleyecek.
      </Text>

      <View
        style={{
          marginTop: 22,
        }}
      >
        <Text
          style={{
            color: '#111827',
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 8,
          }}
        >
          Sepete ürün ekle
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Örn. pirinç, süt, makarna"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            paddingHorizontal: 14,
            paddingVertical: 13,
            color: '#111827',
            fontSize: 15,
            backgroundColor: '#fff',
          }}
        />

        {isSearching ? (
          <Text
            style={{
              marginTop: 8,
              color: '#6B7280',
              fontSize: 12,
            }}
          >
            Öneriler aranıyor...
          </Text>
        ) : null}

        {suggestions.length > 0 ? (
          <View
            style={{
              marginTop: 10,
              gap: 8,
            }}
          >
            {suggestions.map((suggestion) => (
              <Pressable
                key={getSuggestionKey(suggestion)}
                onPress={() => handleAddSuggestion(suggestion)}
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  padding: 13,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: '#111827',
                      fontSize: 15,
                      fontWeight: '700',
                    }}
                  >
                    {suggestion.label}
                  </Text>

                  <Text
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#EEF2FF',
                      color: '#3730A3',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    {getSuggestionBadge(suggestion)}
                  </Text>
                </View>

                <Text
                  style={{
                    marginTop: 4,
                    color: '#6B7280',
                    fontSize: 12,
                  }}
                >
                  Sepete ekle
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 24,
          gap: 10,
        }}
      >
        <Text
          style={{
            color: '#111827',
            fontSize: 14,
            fontWeight: '700',
          }}
        >
          Sepet öğeleri
        </Text>

        {items.length === 0 ? (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 14,
              backgroundColor: '#F9FAFB',
            }}
          >
            <Text
              style={{
                color: '#6B7280',
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              Sepet boş. Yukarıdan en az bir ürün grubu ekle.
            </Text>
          </View>
        ) : null}

        {items.map((item) => (
          <View
            key={getBasketItemKey(item)}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 14,
              backgroundColor: '#F9FAFB',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: '#111827',
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                {item.label}
              </Text>

              <Text
                style={{
                  borderRadius: 999,
                  backgroundColor: '#EEF2FF',
                  color: '#3730A3',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                {item.type === 'product' ? 'Ürün' : 'Kategori'}
              </Text>
            </View>

            <Text
              style={{
                marginTop: 6,
                color: '#6B7280',
                fontSize: 13,
              }}
            >
              {item.quantity.amount} {item.quantity.unit} • {item.productGroupKey}
            </Text>

            <Pressable
              onPress={() => handleRemoveItem(item)}
              style={{
                marginTop: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Text
                style={{
                  color: '#B91C1C',
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                Kaldır
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      {errorMessage ? (
        <Text
          style={{
            marginTop: 14,
            color: '#B91C1C',
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        onPress={handleEvaluate}
        disabled={isEvaluating || items.length === 0}
        style={{
          marginTop: 20,
          borderRadius: 12,
          backgroundColor: '#111827',
          paddingVertical: 14,
          alignItems: 'center',
          opacity: isEvaluating || items.length === 0 ? 0.65 : 1,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          {isEvaluating ? 'Sepet değerlendiriliyor...' : 'Sepeti Tamamla'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
