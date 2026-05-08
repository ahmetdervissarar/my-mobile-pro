import { Text, TextInput, View } from 'react-native';

export default function SearchScreen() {
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
    </View>
  );
}
