import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMockProductResult, getProductResult } from '../src/services/productService';
import { getUserLocationForPricing } from '../src/services/locationService';
import { fetchMarketPrices } from '../src/services/marketPriceService';
import { evaluateProductRisks } from '../src/riskEngine/riskEngine';
import {
  formatNutritionValue,
  getTrafficLightLevelLabel,
  getTrafficLightNutrientLabel,
} from '../src/nutrition/trafficLight';
import type { ProductRiskResult, RiskLevel } from '../src/riskEngine/riskEngine';
import { loadUserSensitivityProfile } from '../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import { PriceClient, formatPriceForDisplay, priceStatusLabel } from '../src/price/priceClient';
import type { EnrichedMarketOffer, PriceResolveResponse } from '../src/price/types';

const priceClient = new PriceClient({
  baseUrl: process.env.EXPO_PUBLIC_PRICE_API_URL ?? 'http://localhost:3001',
});

function formatOfferStoreLabel(offer: EnrichedMarketOffer): string {
  const branchName = offer.store?.branchName?.trim();

  if (
    branchName &&
    branchName.toLocaleLowerCase('tr-TR') !== offer.displayName.toLocaleLowerCase('tr-TR')
  ) {
    return `${offer.displayName} · ${branchName}`;
  }

  return offer.displayName;
}

function formatOfferDistanceLabel(offer: EnrichedMarketOffer): string {
  return offer.distance?.distanceText ?? 'Mesafe bilgisi yok';
}

function isSameOffer(first: EnrichedMarketOffer, second: EnrichedMarketOffer): boolean {
  return (
    first.chainCode === second.chainCode &&
    first.displayName === second.displayName &&
    first.price === second.price &&
    first.currency === second.currency &&
    first.store?.branchName === second.store?.branchName &&
    first.distance?.distanceText === second.distance?.distanceText
  );
}

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
  const [isSustainabilityOpen, setIsSustainabilityOpen] = useState(false);
  const [isRiskOpen, setIsRiskOpen] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(new Set());
  const [isIngredientsVisible, setIsIngredientsVisible] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [marketPriceStatus, setMarketPriceStatus] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(
    emptyUserSensitivityProfile,
  );
  const [priceResolution, setPriceResolution] = useState<PriceResolveResponse | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    void loadUserSensitivityProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(emptyUserSensitivityProfile));
  }, []);

  /**
   * analysisStatus === 'ready' ise riskEngine normal çalışır.
   * Diğer durumlarda evaluateProductRisks çağrılmaz; bunun yerine tek bir
   * güvenli FOOD_ANALYSIS_UNAVAILABLE uyarısı döner.
   */
  const riskResult: ProductRiskResult = useMemo(() => {
    if (result.analysisStatus !== 'ready') {
      return {
        overallRisk: 'unknown',
        warnings: [
          {
            code: 'FOOD_ANALYSIS_UNAVAILABLE',
            title: 'Gıda analizi yapılamadı',
            message:
              result.analysisMessage ?? 'Bu ürün için yeterli gıda verisi bulunamadı.',
            level: 'unknown',
          },
        ],
        isEvaluated: false,
      };
    }

    return evaluateProductRisks({
      name: result.name ?? null,
      ingredients: result.ingredients ?? null,
      allergens: result.allergens ?? [],
      additives: result.additives ?? [],
      novaGroup: result.novaGroup ?? null,
      trafficLight: result.trafficLight ?? null,
      nutriScore: result.nutriScore ?? null,
      userProfile,
    });
  }, [result, userProfile]);

  useEffect(() => {
    setResult(getMockProductResult(normalizedInput));
    setIsBasicInfoOpen(true);
    setIsHealthOpen(false);
    setIsContentOpen(false);
    setIsPriceOpen(false);
    setIsSustainabilityOpen(false);
    setIsRiskOpen(false);
    setExpandedWarnings(new Set());
    setIsIngredientsVisible(false);
    setLocationStatus(null);
    setMarketPriceStatus(null);

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

  // PriceClient ile fiyat sorgusu. Mevcut fiyat akışını bozmadan paralel olarak çalışır.
  // Sonuç yoksa veya hata olursa eski result.priceText fallback olarak gösterilmeye devam eder.
  useEffect(() => {
    setPriceResolution(null);
    setPriceError(null);

    if (!normalizedInput.barcode && !normalizedInput.productName) {
      return;
    }

    let isMounted = true;
    setIsPriceLoading(true);

    getUserLocationForPricing()
      .catch(() => null)
      .then((location) => {
        if (!isMounted) return undefined;

        return priceClient.resolve({
          barcode: normalizedInput.barcode,
          productName: normalizedInput.productName,
          location: location ?? undefined,
        });
      })
      .then((response) => {
        if (isMounted && response) setPriceResolution(response);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setPriceError((err as Error)?.message ?? 'Fiyat alınamadı');
        }
      })
      .finally(() => {
        if (isMounted) setIsPriceLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedInput]);

  // Uyarı varsa RafSkoru bölümünü otomatik aç; yoksa elle kapatılmış hali koru.
  useEffect(() => {
    if (riskResult.warnings.length > 0) {
      setIsRiskOpen(true);
    }
  }, [riskResult.warnings.length]);

  const handleFindPricesByLocation = async () => {
    setIsLocationLoading(true);
    setLocationStatus(null);
    setMarketPriceStatus(null);

    try {
      const location = await getUserLocationForPricing();

      if (!location) {
        setLocationStatus('Konum izni verilmedi');
        return;
      }

      setLocationStatus('Konum alındı');

      const marketPrices = await fetchMarketPrices(
        {
          productName: result.name,
          barcode: result.barcode !== 'Bilinmiyor' ? result.barcode : undefined,
        },
        location,
      );

      if (marketPrices.prices.length === 0) {
        setMarketPriceStatus('Yakındaki market fiyatı bulunamadı');
      } else {
        const firstPrice = marketPrices.prices[0];
        setMarketPriceStatus(`${firstPrice.marketName}: ${firstPrice.price} ${firstPrice.currency}`);
      }
    } catch {
      setLocationStatus('Konum alınamadı');
      setMarketPriceStatus('Market fiyatı sorgulanamadı');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const CRITICAL_ALLERGEN_CODES = [
    'PROFILE_PEANUT_ALLERGEN_MATCH',
    'PROFILE_SOY_ALLERGEN_MATCH',
    'PROFILE_GLUTEN_ALLERGEN_MATCH',
    'PROFILE_MILK_ALLERGEN_MATCH',
    'PROFILE_LACTOSE_ALLERGEN_MATCH',
    'PROFILE_TREE_NUTS_ALLERGEN_MATCH',
    'PROFILE_SESAME_ALLERGEN_MATCH',
    'PROFILE_FISH_ALLERGEN_MATCH',
    'PROFILE_SHELLFISH_ALLERGEN_MATCH',
  ];
  const criticalProfileWarnings = riskResult.warnings.filter((w) =>
    CRITICAL_ALLERGEN_CODES.includes(w.code),
  );

  const displayProductName = priceResolution?.result.productName?.trim() || result.name;
  const displayBarcode = priceResolution?.result.barcode?.trim() || result.barcode;
  const displayImageUrl = result.imageUrl ?? priceResolution?.result.imageUrl ?? null;

  const priceResult = priceResolution?.result ?? null;
  const sustainability = priceResult?.sustainability ?? null;
  const priceDisclaimer =
    priceResolution?.disclaimer ?? 'Fiyat bilgisi sağlayıcı kaynaklara göre gösterilir.';
  const bestOffer = priceResult?.bestOffer ?? null;
  const offerOptions = priceResult?.offers ?? [];
  const otherOffers = bestOffer
    ? offerOptions.filter((offer) => !isSameOffer(offer, bestOffer)).slice(0, 5)
    : offerOptions.slice(1, 6);
  const fallbackMarketPrices = priceResult?.marketPrices ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Ürün Sonucu</Text>

        <View style={styles.productHero}>
          {displayImageUrl ? (
            <Image
              source={{ uri: displayImageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.helperText}>Ürün görseli bulunamadı</Text>
            </View>
          )}

          <View style={styles.productHeroInfo}>
            <Text style={styles.productName}>{displayProductName}</Text>
            <Text style={styles.productBarcode}>Barkod: {displayBarcode}</Text>
          </View>
        </View>

        <View style={styles.rafScoreCard}>
          <Text style={styles.rafScoreLabel}>RAF SKORU</Text>
          <Text style={styles.rafScoreValue}>{result.healthScore}/100</Text>
          <Text style={styles.rafScoreCaption}>
            Fiyat, sağlık profili ve ürün içeriği birlikte değerlendirilir.
          </Text>
        </View>

        {criticalProfileWarnings.length > 0 ? (
          <View style={styles.criticalAlertCard}>
            <Text style={styles.criticalAlertHeader}>
              Profilinizle çakışan kritik alerjen uyarısı
            </Text>
            {criticalProfileWarnings.map((warning) => (
              <View key={warning.code} style={styles.criticalAlertItem}>
                <Text style={styles.criticalAlertItemTitle}>{warning.title}</Text>
                <Text style={styles.criticalAlertMessage}>{warning.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsPriceOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>Fiyat Skoru</Text>
          <Text style={styles.sectionToggle}>{isPriceOpen ? '−' : '+'}</Text>
        </Pressable>

        {isPriceOpen ? (
          <View style={styles.row}>
            {isPriceLoading ? (
              <Text style={styles.helperText}>Fiyat sorgulanıyor...</Text>
            ) : priceResult && priceResult.price !== null ? (
              <>
                {bestOffer ? (
                  <>
                    <Text style={styles.label}>En uygun fiyat</Text>
                    <View style={styles.bestOfferCard}>
                      <View style={styles.offerHeaderRow}>
                        <Text style={styles.offerMarketName}>
                          {formatOfferStoreLabel(bestOffer)}
                        </Text>
                        <Text style={styles.offerPrice}>
                          {formatPriceForDisplay(bestOffer.price, bestOffer.currency)}
                        </Text>
                      </View>
                      <Text style={styles.offerDistance}>
                        {formatOfferDistanceLabel(bestOffer)}
                      </Text>
                    </View>

                    {otherOffers.length > 0 ? (
                      <>
                        <Text style={styles.label}>Diğer marketler</Text>
                        {otherOffers.map((offer, index) => (
                          <View
                            key={`${offer.chainCode}-${offer.displayName}-${offer.price}-${index}`}
                            style={styles.offerCard}
                          >
                            <View style={styles.offerHeaderRow}>
                              <Text style={styles.offerMarketName}>
                                {formatOfferStoreLabel(offer)}
                              </Text>
                              <Text style={styles.offerPrice}>
                                {formatPriceForDisplay(offer.price, offer.currency)}
                              </Text>
                            </View>
                            <Text style={styles.offerDistance}>
                              {formatOfferDistanceLabel(offer)}
                            </Text>
                          </View>
                        ))}
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>En uygun fiyat</Text>
                    <Text style={styles.value}>{priceResult.marketName}</Text>
                    <Text style={styles.value}>
                      {formatPriceForDisplay(priceResult.price, priceResult.currency)}
                    </Text>

                    {fallbackMarketPrices.length > 1 ? (
                      <>
                        <Text style={styles.label}>Diğer fiyat seçenekleri</Text>
                        {fallbackMarketPrices.slice(1, 6).map((marketOption, index) => (
                          <Text
                            key={`${marketOption.marketName}-${marketOption.price}-${index}`}
                            style={styles.helperText}
                          >
                            {marketOption.marketName} ·{' '}
                            {formatPriceForDisplay(marketOption.price, marketOption.currency)}
                          </Text>
                        ))}
                      </>
                    ) : null}
                  </>
                )}

                <Text style={styles.helperText}>
                  {priceStatusLabel(priceResult.status)}
                  {priceResult.updatedAt ? ` · Güncelleme: ${priceResult.updatedAt}` : ''}
                </Text>

                {priceResult.note ? <Text style={styles.helperText}>{priceResult.note}</Text> : null}
                <Text style={styles.helperText}>{priceDisclaimer}</Text>
              </>
            ) : (
              <Text style={styles.value}>{result.priceText}</Text>
            )}

            {priceError ? <Text style={styles.helperText}>{priceError}</Text> : null}
          </View>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsSustainabilityOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>Sürdürülebilirlik Skoru</Text>
          <Text style={styles.sectionToggle}>{isSustainabilityOpen ? '−' : '+'}</Text>
        </Pressable>

        {isSustainabilityOpen ? (
          <View style={styles.row}>
            {sustainability ? (
              <>
                <View style={styles.sustainabilitySummaryCard}>
                  <View style={styles.sustainabilityHeaderRow}>
                    <Text style={styles.sustainabilityGrade}>{sustainability.grade}</Text>

                    <View style={styles.sustainabilityInfo}>
                      <Text style={styles.value}>{sustainability.score}/100</Text>
                      <Text style={styles.helperText}>{sustainability.label}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.label}>Güven düzeyi</Text>
                <Text style={styles.value}>
                  {getSustainabilityConfidenceLabel(sustainability.confidence)}
                </Text>

                <Text style={styles.label}>Kategori</Text>
                <Text style={styles.value}>
                  {getSustainabilityCategoryLabel(sustainability.categoryKey)}
                </Text>

                {sustainability.explanations.length > 0 ? (
                  <>
                    <Text style={styles.label}>Açıklama</Text>
                    {sustainability.explanations.slice(0, 3).map((explanation, index) => (
                      <Text key={`${explanation}-${index}`} style={styles.helperText}>
                        • {explanation}
                      </Text>
                    ))}
                  </>
                ) : null}

                <Text style={styles.helperText}>{sustainability.disclaimer}</Text>
              </>
            ) : (
              <Text style={styles.helperText}>
                Bu ürün için sürdürülebilirlik skoru henüz hesaplanamadı.
              </Text>
            )}
          </View>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsHealthOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>Sağlık Skoru</Text>
          <Text style={styles.sectionToggle}>{isHealthOpen ? '−' : '+'}</Text>
        </Pressable>

        {isHealthOpen ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Sağlık skoru</Text>
              <Text style={styles.value}>
                {result.analysisStatus === 'ready'
                  ? `${result.healthScore}/100`
                  : 'Değerlendirilemedi'}
              </Text>
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

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsContentOpen((current) => !current)}
        >
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
              <Pressable
                style={styles.inlineButton}
                onPress={() => setIsIngredientsVisible((current) => !current)}
              >
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

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsBasicInfoOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>Ürün detayları</Text>
          <Text style={styles.sectionToggle}>{isBasicInfoOpen ? '−' : '+'}</Text>
        </Pressable>

        {isBasicInfoOpen ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Ürün adı</Text>
              <Text style={styles.value}>{displayProductName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Barkod numarası</Text>
              <Text style={styles.value}>{displayBarcode}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Arama kaynağı</Text>
              <Text style={styles.value}>
                {sourceLabelMap[result.searchSource] ?? result.searchSource}
              </Text>
            </View>
          </>
        ) : null}

        {result.trafficLight ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Traffic Light Besin Etiketi</Text>
            </View>

            {result.analysisStatus !== 'ready' ? (
              <View style={styles.row}>
                <Text style={styles.helperText}>
                  Bu ürün için Traffic Light besin etiketi hesaplanamadı.
                </Text>
              </View>
            ) : (
              (['fat', 'saturatedFat', 'sugars', 'salt'] as const).map((nutrient) => {
                const item = result.trafficLight?.[nutrient];

                if (!item) return null;

                return (
                  <View key={nutrient} style={styles.row}>
                    <Text style={styles.label}>{getTrafficLightNutrientLabel(nutrient)}</Text>
                    <Text style={styles.value}>{formatNutritionValue(item)}</Text>
                    <Text style={[styles.helperText, getTrafficLightLevelTextStyle(item.level)]}>
                      {getTrafficLightLevelLabel(item.level)}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsRiskOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>
            RafSkoru Uyarıları ({riskResult.warnings.length})
          </Text>
          <Text style={styles.sectionToggle}>{isRiskOpen ? '−' : '+'}</Text>
        </Pressable>

        {isRiskOpen ? (
          riskResult.warnings.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.value}>Bu ürün için belirgin bir risk uyarısı oluşturulmadı.</Text>
            </View>
          ) : (
            riskResult.warnings.map((warning) => {
              const isExpanded = expandedWarnings.has(warning.code);
              const toggleDetail = () =>
                setExpandedWarnings((prev) => {
                  const next = new Set(prev);
                  if (isExpanded) next.delete(warning.code);
                  else next.add(warning.code);
                  return next;
                });

              return (
                <View
                  key={warning.code}
                  style={[styles.riskWarningCard, getRiskWarningCardStyle(warning.level)]}
                >
                  <Text style={styles.warningTitle}>{warning.title}</Text>
                  <Text style={[styles.helperText, getRiskLevelTextStyle(warning.level)]}>
                    {riskLevelLabel[warning.level]}
                  </Text>
                  <Pressable style={styles.warningDetailButton} onPress={toggleDetail}>
                    <Text style={styles.warningDetailButtonText}>
                      {isExpanded ? 'Detayları gizle' : 'Detayları göster'}
                    </Text>
                  </Pressable>
                  {isExpanded ? (
                    <Text style={styles.helperText}>{warning.message}</Text>
                  ) : null}
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

function getSustainabilityConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
  if (confidence === 'high') return 'Yüksek';
  if (confidence === 'medium') return 'Orta';
  return 'Düşük';
}

function getSustainabilityCategoryLabel(categoryKey: string): string {
  const labels: Record<string, string> = {
    plant_based: 'Bitkisel ürün',
    staple_food: 'Temel gıda',
    beverages: 'İçecek',
    breakfast: 'Kahvaltılık',
    baby_food: 'Bebek gıdası',
    dairy: 'Süt ürünü',
    sauces_condiments: 'Sos / çeşni',
    snacks: 'Atıştırmalık',
    sweets_chocolate: 'Tatlı / çikolata',
    frozen_ready: 'Dondurulmuş / hazır gıda',
    meat: 'Et ürünü',
    unknown: 'Bilinmeyen kategori',
  };

  return labels[categoryKey] ?? 'Bilinmeyen kategori';
}

const riskLevelLabel: Record<RiskLevel, string> = {
  low: 'Düşük risk',
  medium: 'Orta risk',
  high: 'Yüksek risk',
  unknown: 'Bilinmiyor',
};

function getRiskLevelTextStyle(level: RiskLevel) {
  const color =
    level === 'high'
      ? '#DC2626'
      : level === 'medium'
        ? '#D97706'
        : level === 'unknown'
          ? '#6B7280'
          : '#16A34A';

  return { fontSize: 12, fontWeight: '500' as const, color };
}

function getRiskWarningCardStyle(level: RiskLevel) {
  if (level === 'high') return { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' };
  if (level === 'medium') return { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' };
  if (level === 'low') return { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' };
  return { backgroundColor: '#F9FAFB', borderColor: '#D1D5DB' };
}

function getTrafficLightLevelTextStyle(level: 'low' | 'medium' | 'high' | 'unknown') {
  const color =
    level === 'high'
      ? '#DC2626'
      : level === 'medium'
        ? '#D97706'
        : level === 'low'
          ? '#16A34A'
          : '#6B7280';

  return { fontSize: 12, fontWeight: '600' as const, color };
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
  productHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  productImagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
  },
  productHeroInfo: {
    flex: 1,
    gap: 6,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  productBarcode: {
    fontSize: 12,
    color: '#6B7280',
  },
  rafScoreCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  rafScoreLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.8,
  },
  rafScoreValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#065F46',
  },
  rafScoreCaption: {
    fontSize: 12,
    color: '#047857',
  },
  sustainabilitySummaryCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  sustainabilityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sustainabilityGrade: {
    width: 48,
    height: 48,
    borderRadius: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  sustainabilityInfo: {
    flex: 1,
    gap: 4,
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
  riskWarningCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  warningDetailButton: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  warningDetailButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
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
  bestOfferCard: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  offerCard: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  offerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  offerMarketName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  offerPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  offerDistance: {
    fontSize: 12,
    color: '#047857',
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
  criticalAlertCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  criticalAlertHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  criticalAlertItem: {
    gap: 4,
  },
  criticalAlertItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F1D1D',
  },
  criticalAlertMessage: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },
});