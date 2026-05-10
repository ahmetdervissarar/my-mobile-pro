import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMockProductResult, getProductResult } from '../src/services/productService';
import { evaluateProductRisks } from '../src/riskEngine/riskEngine';
import type { ProductRiskResult, RiskLevel } from '../src/riskEngine/riskEngine';
import { getUserLocationForPricing } from '../src/services/locationService';
import { fetchMarketPrices } from '../src/services/marketPriceService';

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
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isContentOpen, setIsContentOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isRiskOpen, setIsRiskOpen] = useState(false);
  const [isIngredientsVisible, setIsIngredientsVisible] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [marketPriceStatus, setMarketPriceStatus] = useState<string | null>(null);
  const [openRiskDetails, setOpenRiskDetails] = useState<Record<string, boolean>>({});

  const riskResult: ProductRiskResult = useMemo(
    () =>
      evaluateProductRisks({
        name: result.name ?? null,
        ingredients: result.ingredients ?? null,
        allergens: result.allergens ?? [],
        additives: result.additives ?? [],
        novaGroup: result.novaGroup ?? null,
      }),
    [result],
  );

  useEffect(() => {
    setResult(getMockProductResult(normalizedInput));
    setIsBasicInfoOpen(true);
    setIsHealthOpen(false);
    setIsContentOpen(false);
    setIsPriceOpen(false);
    setIsRiskOpen(false);
    setIsIngredientsVisible(false);
    setLocationStatus(null);
    setMarketPriceStatus(null);
    setOpenRiskDetails({});

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

  const handleFindPricesByLocation = async () => {
    setIsLocationLoading(true);
    setLocationStatus(null);
    setMarketPriceStatus(null);

    try {
      const location = await getUserLocationForPricing();

      if (!location) {
        setLocationStatus("Konum izni verilmedi");
        return;
      }

      setLocationStatus("Konum al\u0131nd\u0131");

      const marketPrices = await fetchMarketPrices(
        {
          productName: result.name,
          barcode: result.barcode !== 'Bilinmiyor' ? result.barcode : undefined,
        },
        location,
      );

      if (marketPrices.prices.length === 0) {
        setMarketPriceStatus("Yak\u0131ndaki market fiyat\u0131 bulunamad\u0131");
      } else {
        const firstPrice = marketPrices.prices[0];
        setMarketPriceStatus(`${firstPrice.marketName}: ${firstPrice.price} ${firstPrice.currency}`);
      }
    } catch {
      setLocationStatus("Konum al\u0131namad\u0131");
      setMarketPriceStatus("Market fiyat\u0131 sorgulanamad\u0131");
    } finally {
      setIsLocationLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Ürün Sonucu</Text>

        <Pressable style={styles.sectionHeader} onPress={() => setIsBasicInfoOpen((current) => !current)}>
          <Text style={styles.sectionTitle}>Temel bilgiler</Text>
          <Text style={styles.sectionToggle}>{isBasicInfoOpen ? '−' : '+'}</Text>
        </Pressable>

        {isBasicInfoOpen ? (
          <>
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
          </>
        ) : null}

        <Pressable style={styles.sectionHeader} onPress={() => setIsHealthOpen((current) => !current)}>
          <Text style={styles.sectionTitle}>Sağlık değerlendirmesi</Text>
          <Text style={styles.sectionToggle}>{isHealthOpen ? '−' : '+'}</Text>
        </Pressable>

        {isHealthOpen ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Sağlık skoru</Text>
              <Text style={styles.value}>{result.healthScore}/100</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Nutri-Score</Text>
              <Text style={styles.value}>
                {result.nutriScore ? result.nutriScore.toUpperCase() : 'Bilinmiyor'}
              </Text>
              <Text style={styles.helperText}>Besin kalitesini gösterir.</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>NOVA grubu</Text>
              <Text style={styles.value}>
                {result.novaGroup != null ? `Grup ${result.novaGroup}` : 'Bilinmiyor'}
              </Text>
              <Text style={styles.helperText}>Ürünün işlenmişlik düzeyini gösterir.</Text>
            </View>
          </>
        ) : null}

        <Pressable style={styles.sectionHeader} onPress={() => setIsContentOpen((current) => !current)}>
          <Text style={styles.sectionTitle}>İçerik ve alerjenler</Text>
          <Text style={styles.sectionToggle}>{isContentOpen ? '−' : '+'}</Text>
        </Pressable>

        {isContentOpen ? (
          <>
            <Text style={styles.helperText}>
              Alerjen ve katkı bilgileri ürün etiketine göre değişebilir. Son karar için ambalaj üzerindeki bilgileri kontrol edin.
            </Text>

            <View style={styles.row}>
              <Text style={styles.label}>Alerjenler</Text>
              <Text style={styles.value}>
                {result.allergens.length > 0 ? result.allergens.join(', ') : 'Bilinmiyor'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Katkı maddeleri</Text>
              <Text style={styles.value}>
                {result.additives.length > 0 ? result.additives.join(', ') : 'Bilinmiyor'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>İçindekiler</Text>
              <Pressable style={styles.inlineButton} onPress={() => setIsIngredientsVisible((current) => !current)}>
                <Text style={styles.inlineButtonText}>
                  {isIngredientsVisible ? 'İçindekileri gizle' : 'İçindekileri göster'}
                </Text>
              </Pressable>

              {isIngredientsVisible ? (
                <Text style={styles.value}>
                  {result.ingredients?.trim() || 'İçindekiler bilgisi bulunamadı.'}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        <Pressable style={styles.sectionHeader} onPress={() => setIsPriceOpen((current) => !current)}>
          <Text style={styles.sectionTitle}>Fiyat bilgisi</Text>
          <Text style={styles.sectionToggle}>{isPriceOpen ? '−' : '+'}</Text>
        </Pressable>

        {isPriceOpen ? (
          <View style={styles.row}>
            <Text style={styles.label}>Fiyat bilgisi</Text>
            <Text style={styles.value}>{result.priceText}</Text>

            <Pressable style={styles.inlineButton} onPress={handleFindPricesByLocation}>
              <Text style={styles.inlineButtonText}>
                {isLocationLoading ? 'Konum al\u0131n\u0131yor...' : 'Konumla fiyat ara'}
              </Text>
            </Pressable>

            {locationStatus ? <Text style={styles.value}>{locationStatus}</Text> : null}
            {marketPriceStatus ? <Text style={styles.value}>{marketPriceStatus}</Text> : null}
          </View>
        ) : null}

        <Pressable style={styles.sectionHeader} onPress={() => setIsRiskOpen((current) => !current)}>
          <Text style={styles.sectionTitle}>{'RafSkoru Uyar\u0131lar\u0131'}</Text>
          <Text style={styles.sectionToggle}>{isRiskOpen ? '-' : '+'}</Text>
        </Pressable>

        {isRiskOpen ? (
          riskResult.warnings.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.value}>{'Bu \u00fcr\u00fcn i\u00e7in belirgin bir risk uyar\u0131s\u0131 olu\u015fturulmad\u0131.'}</Text>
            </View>
          ) : (
            riskResult.warnings.map((warning) => {
              const isDetailOpen = Boolean(openRiskDetails[warning.code]);

              return (
                <View key={warning.code} style={[styles.row, styles.riskRow]}>
                  <Text style={styles.value}>{warning.title}</Text>
                  <Text style={[styles.helperText, getRiskLevelTextStyle(warning.level)]}>
                    {riskLevelLabel[warning.level]}
                  </Text>

                  <Pressable
                    style={styles.inlineButton}
                    onPress={() =>
                      setOpenRiskDetails((current) => ({
                        ...current,
                        [warning.code]: !current[warning.code],
                      }))
                    }
                  >
                    <Text style={styles.inlineButtonText}>
                      {isDetailOpen ? 'Detaylar? gizle' : 'Detaylar? g?ster'}
                    </Text>
                  </Pressable>

                  {isDetailOpen ? <Text style={styles.helperText}>{warning.message}</Text> : null}
                </View>
              );
            })
          )
        ) : null}
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
    </ScrollView>
  );
}

const riskLevelLabel: Record<RiskLevel, string> = {
  low: 'D\u00fc\u015f\u00fck risk',
  medium: 'Orta risk',
  high: 'Y\u00fcksek risk',
  unknown: 'Bilinmiyor',
};

function getRiskLevelTextStyle(level: RiskLevel) {
  const color =
    level === 'high'
      ? '#DC2626'
      : level === 'medium'
        ? '#D97706'
        : '#16A34A';

  return { fontSize: 12, fontWeight: '500' as const, color };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionToggle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  row: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  riskRow: {
    paddingTop: 4,
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
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
  inlineButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  inlineButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
});
