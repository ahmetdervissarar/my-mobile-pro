import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getMockProductResult } from '../src/services/productService';

export default function ProductResultScreen() {
  const { barcode, productName, searchType } = useLocalSearchParams<{
    barcode?: string;
    productName?: string;
    searchType?: string;
  }>();
  const router = useRouter();

  const result = useMemo(
    () =>
      getMockProductResult({
        barcode,
        productName,
        photoSource: searchType === 'photo' ? 'camera' : undefined,
      }),
    [barcode, productName, searchType],
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Ürün Sonucu</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Ürün adı</Text>
          <Text style={styles.value}>{result.productName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Barkod numarası</Text>
          <Text style={styles.value}>{result.barcode}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Arama kaynağı</Text>
          <Text style={styles.value}>{result.source}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Sağlık skoru</Text>
          <Text style={styles.value}>{result.healthScore}/100</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Fiyat bilgisi</Text>
          <Text style={styles.value}>
            {result.price.amount > 0 ? `${result.price.amount.toFixed(2)} ${result.price.currency}` : result.price.note}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Uyarılar</Text>
          <Text style={styles.value}>{result.warnings.join(', ')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/barcode-scan')}>
          <Text style={styles.primaryButtonText}>Yeni barkod okut</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/search')}>
          <Text style={styles.secondaryButtonText}>Yeni ürün ara</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/photo-search')}>
          <Text style={styles.secondaryButtonText}>Yeni fotoğraf çek</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
          <Text style={styles.secondaryButtonText}>Ana sayfaya dön</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  row: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
  },
  value: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  actions: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
});
