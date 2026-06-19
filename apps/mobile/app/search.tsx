import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { fetchSearchSuggestions, type SearchSuggestion } from '../src/api/productSuggestionClient';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialQuery?: string | string[] }>();
  const initialQueryParam = params.initialQuery;
  const initialQuery = Array.isArray(initialQueryParam)
    ? initialQueryParam[0] ?? ''
    : initialQueryParam ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

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

  const openTextSearch = (productName: string) => {
    const trimmedProductName = productName.trim();

    if (!trimmedProductName) {
      return;
    }

    router.push({
      pathname: '/product-result',
      params: { productName: trimmedProductName },
    });
  };

  const handleSearch = () => {
    openTextSearch(query);
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'product') {
      router.push({
        pathname: '/product-result',
        params: { productId: suggestion.productId },
      });
      return;
    }

    router.push({
      pathname: '/product-group',
      params: {
        productGroupKey: suggestion.productGroupKey,
        label: suggestion.label,
      },
    });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: 32,
      }}
    >
      <Text
        style={{
          marginBottom: 20,
          fontSize: 32,
          fontWeight: '700',
          color: '#111827',
        }}
      >
        Ürün Ara
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Ürün adı yazın"
        placeholderTextColor="#9CA3AF"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: '#111827',
        }}
      />

      {isSuggesting ? (
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
            marginTop: 8,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((suggestion) => (
            <Pressable
              key={`${suggestion.type}:${
                suggestion.type === 'product' ? suggestion.productId : suggestion.productGroupKey
              }`}
              onPress={() => handleSuggestionPress(suggestion)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: '#111827',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  {suggestion.label}
                </Text>

                <Text
                  style={{
                    borderRadius: 999,
                    backgroundColor: suggestion.type === 'product' ? '#DCFCE7' : '#EEF2FF',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    color: suggestion.type === 'product' ? '#166534' : '#3730A3',
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {suggestion.type === 'product' ? 'Ürün' : 'Kategori'}
                </Text>
              </View>

              <Text
                style={{
                  marginTop: 4,
                  color: '#6B7280',
                  fontSize: 12,
                }}
              >
                {suggestion.type === 'product'
                  ? [
                      suggestion.brand,
                      suggestion.packageSize
                        ? `${suggestion.packageSize.amount} ${suggestion.packageSize.unit}`
                        : undefined,
                    ]
                      .filter(Boolean)
                      .join(' • ') || 'Ürün önerisi'
                  : 'Ürün grubu önerisi — seçim arama kutusuna eklenir'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={handleSearch}
        style={{
          marginTop: 12,
          backgroundColor: '#111827',
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: 'center',
          opacity: query.trim() ? 1 : 0.7,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          Ara
        </Text>
      </Pressable>
    </View>
  );
}
