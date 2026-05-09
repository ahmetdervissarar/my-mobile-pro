import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    router.push({
      pathname: '/product-result',
      params: { productName: trimmedQuery },
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
