import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getMockProductResult, getProductResult } from '../src/services/productService';

export default function ProductResultScreen() {
  const { barcode, productName, searchType } = useLocalSearchParams<{
    barcode?: string;
    productName?: string;
    searchType?: string;
  }>();
  const router = useRouter();

  const sourceLabelMap: Record<string, string> = {
    barcode: 'Barkod',
    search: 'Ürün arama',
    name: 'Ürün arama',
    photo: 'Fotoğrafla arama',
  };

  const normalizedInput = useMemo(() => {
    const normalizedBarcode = barcode?.trim();

    if (normalizedBarcode) {
      return {
        barcode: normalizedBarcode,
        productName: undefined,
        photoSource: undefined,
      };
    }

    return {
      barcode: undefined,
      productName: productName?.trim(),
      photoSource: searchType === 'photo' ? 'camera' : undefined,
    };
  }, [barcode, productName, searchType]);

  const [result, setResult] = useState(() => getMockProductResult(normalizedInput));

  useEffect(() => {
    setResult(getMockProductResult(normalizedInput));

    let isMounted = true;

    void getProductResult(normalizedInput).then((nextResult) => {
      if (isMounted) {
        setResult(nextResult);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [normalizedInput]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Ürün Sonucu</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Ürün adı</Text>
          <Text style={styles.value}>{result.name}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Barkod numarası</Text>
          <Text style={styles.value}>{result.barcode}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Arama kaynağı</Text>
          <Text style={styles.value}>{sourceLabelMap[result.searchSource] ?? result.searchSource}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Sağlık skoru</Text>
          <Text style={styles.value}>{result.healthScore}/100</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Fiyat bilgisi</Text>
          <Text style={styles.value}>{result.priceText}</Text>
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
