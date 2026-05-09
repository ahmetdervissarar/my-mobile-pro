import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ProductResultScreen() {
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ürün Sonucu</Text>
      <Text style={styles.label}>Okutulan Barkod:</Text>
      <Text style={styles.barcode}>{barcode ?? '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  barcode: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
});
