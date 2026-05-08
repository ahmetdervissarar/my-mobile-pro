import { Text, View } from 'react-native';

export default function PhotoSearchScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 24,
      }}
    >
      <Text style={{ fontSize: 32, fontWeight: '700', color: '#111827' }}>Fotoğrafla Ara</Text>
    </View>
  );
}
