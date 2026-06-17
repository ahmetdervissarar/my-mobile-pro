import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getFallbackProductSummary } from '../src/services/productService';
import type { ProductSearchInput } from '../src/services/productService';
import { getUserLocationForPricing } from '../src/services/locationService';
import { fetchMarketPrices } from '../src/services/marketPriceService';
import { evaluateProductRisks } from '../src/riskEngine/riskEngine';

import type { ProductRiskResult, RiskLevel } from '../src/riskEngine/riskEngine';
import { loadUserSensitivityProfile } from '../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import { PriceClient, formatPriceForDisplay, priceStatusLabel } from '../src/price/priceClient';
import type { AlternativeCategoryKey, AlternativeRecommendation, EnrichedMarketOffer, PriceResolveResponse, ProductFacts } from '../src/price/types';
import type { ProductResult, TrafficLightNutrition } from '../src/types/product';
import {
  getRafScoreConfidenceText,
  getRafScoreDisplayValue,
  getRafScoreStatusText,
} from '../src/price/rafScoreDisplay';
import {
  getPriceScoreConfidenceText,
  getPriceScoreDisplayValue,
  getPriceScoreStatusText,
} from '../src/price/priceScoreDisplay';
import {
  getHealthScoreConfidenceText,
  getHealthScoreDisplayValue,
  getHealthScoreGradeText,
  getHealthScoreStatusText,
} from '../src/price/healthScoreDisplay';
import {
  getContentScoreConfidenceText,
  getContentScoreDisplayValue,
  getContentScoreStatusText,
} from '../src/price/contentScoreDisplay';

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

function normalizeProductFactsTrafficLightLevel(
  level: 'low' | 'medium' | 'high' | null | undefined,
): 'low' | 'medium' | 'high' | 'unknown' {
  return level ?? 'unknown';
}

function productFactsToRiskTrafficLight(
  productFacts: ProductFacts,
): TrafficLightNutrition | null {
  const trafficLight = productFacts.trafficLight;

  if (!trafficLight) {
    return null;
  }

  return {
    fat: {
      value: null,
      unit: null,
      level: normalizeProductFactsTrafficLightLevel(trafficLight.fat),
    },
    saturatedFat: {
      value: null,
      unit: null,
      level: normalizeProductFactsTrafficLightLevel(trafficLight.saturatedFat),
    },
    sugars: {
      value: null,
      unit: null,
      level: normalizeProductFactsTrafficLightLevel(trafficLight.sugar),
    },
    salt: {
      value: null,
      unit: null,
      level: normalizeProductFactsTrafficLightLevel(trafficLight.salt),
    },
  };
}

const productFactsMissingFieldLabels: Record<string, string> = {
  productName: 'ürün adı',
  imageUrl: 'ürün görseli',
  ingredientsText: 'içindekiler',
  allergens: 'alerjen bilgisi',
  nutrition: 'besin değerleri',
  nutriScoreGrade: 'Nutri-Score',
  novaGroup: 'NOVA grubu',
  trafficLight: 'Traffic Light',
};

function getProductFactsConfidenceLabel(confidence: ProductFacts['confidence']): string {
  if (confidence === 'high') return 'Yüksek';
  if (confidence === 'medium') return 'Orta';
  return 'Düşük';
}

function formatProductFactsMissingFields(productFacts: ProductFacts | null): string | null {
  const missingFields = productFacts?.missingFields ?? [];

  if (missingFields.length === 0) {
    return null;
  }

  const labels = missingFields.map((field) => productFactsMissingFieldLabels[field] ?? field);
  const visibleLabels = labels.slice(0, 4);
  const remainingCount = labels.length - visibleLabels.length;

  return remainingCount > 0
    ? visibleLabels.join(', ') + ' +' + remainingCount + ' alan'
    : visibleLabels.join(', ');
}
function createBarcodePendingResult(barcode: string | undefined): ProductResult {
  return {
    id: barcode ? `barcode-pending-${barcode}` : 'barcode-pending',
    name: '',
    barcode: barcode ?? '',
    searchSource: 'barcode',
    healthScore: 0,
    priceText: '',
    imageUrl: null,
    warnings: [],
    allergens: [],
    additives: [],
    ingredients: null,
    nutriScore: null,
    novaGroup: null,
    trafficLight: null,
    analysisStatus: 'ready',
    analysisMessage: null,
  };
}

function createNeutralPendingResult(input: ProductSearchInput): ProductResult {
  const productName = input.productName?.trim();
  const photoSource = input.photoSource?.trim();

  return {
    id: productName ? `name-pending-${productName}` : 'photo-pending',
    name: productName || (photoSource ? 'Fotoğraftan ürün analizi bekleniyor' : 'Ürün analizi bekleniyor'),
    barcode: '',
    searchSource: photoSource ? 'photo' : 'name',
    healthScore: 0,
    priceText: '',
    imageUrl: photoSource ?? null,
    warnings: [],
    allergens: [],
    additives: [],
    ingredients: null,
    nutriScore: null,
    novaGroup: null,
    trafficLight: null,
    analysisStatus: 'ready',
    analysisMessage: 'Ürün bilgileri doğrulanıyor.',
  };
}

function getInitialResult(input: ProductSearchInput): ProductResult {
  const barcode = input.barcode?.trim();

  if (barcode) {
    return createBarcodePendingResult(barcode);
  }

  return createNeutralPendingResult(input);
}

export default function ProductResultScreen() {
  const { barcode, productName, searchType, photoUri } = useLocalSearchParams<{
    barcode?: string;
    productName?: string;
    searchType?: string;
    photoUri?: string;
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

  const [result, setResult] = useState(() => getInitialResult(normalizedInput));
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(true);
  const [isContentOpen, setIsContentOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isSustainabilityOpen, setIsSustainabilityOpen] = useState(true);
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(false);
  const [isSustainabilityDetailsOpen, setIsSustainabilityDetailsOpen] = useState(false);
  const [isHealthDetailsOpen, setIsHealthDetailsOpen] = useState(false);
  const [isContentDetailsOpen, setIsContentDetailsOpen] = useState(false);
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
  const [alternativeRecommendations, setAlternativeRecommendations] = useState<AlternativeRecommendation[]>([]);

  useEffect(() => {
    void loadUserSensitivityProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(emptyUserSensitivityProfile));
  }, []);

  const hasBackendFoodAnalysis =
    priceResolution?.result.healthScore?.status === 'ready' ||
    priceResolution?.result.healthScore?.status === 'partial' ||
    priceResolution?.result.contentScore?.status === 'ready' ||
    priceResolution?.result.contentScore?.status === 'partial' ||
    priceResolution?.result.rafScore?.status === 'ready';
  const backendProductFacts = priceResolution?.result.productFacts ?? null;

  const riskResult: ProductRiskResult = useMemo(() => {
    if (backendProductFacts?.isComplete) {
      return evaluateProductRisks({
        name:
          backendProductFacts.productName ??
          priceResolution?.result.productName ??
          result.name ??
          null,
        ingredients: backendProductFacts.ingredientsText ?? null,
        allergens: backendProductFacts.allergens ?? [],
        additives: backendProductFacts.additives ?? [],
        novaGroup: backendProductFacts.novaGroup ?? null,
        trafficLight: productFactsToRiskTrafficLight(backendProductFacts),
        nutriScore: backendProductFacts.nutriScoreGrade ?? null,
        userProfile,
      });
    }

    if (hasBackendFoodAnalysis) {
      return {
        overallRisk: 'unknown',
        warnings: [],
        isEvaluated: true,
      };
    }

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
  }, [backendProductFacts, hasBackendFoodAnalysis, priceResolution?.result.productName, result, userProfile]);

  useEffect(() => {
    setResult(getInitialResult(normalizedInput));
    setIsBasicInfoOpen(false);
    setIsHealthOpen(true);
    setIsContentOpen(true);
    setIsPriceOpen(true);
    setIsSustainabilityOpen(true);
    setIsPriceDetailsOpen(false);
    setIsSustainabilityDetailsOpen(false);
    setIsHealthDetailsOpen(false);
    setIsContentDetailsOpen(false);
    setIsRiskOpen(false);
    setExpandedWarnings(new Set());
    setIsIngredientsVisible(false);
    setLocationStatus(null);
    setMarketPriceStatus(null);

    let isMounted = true;

    if (searchType !== 'barcode') {
      void getFallbackProductSummary(normalizedInput).then((nextResult) => {
        if (isMounted) {
          setResult(nextResult);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [normalizedInput]);

  useEffect(() => {
    setPriceResolution(null);
    setPriceError(null);

    if (!normalizedInput.barcode && !normalizedInput.productName) {
      return;
    }

    let isMounted = true;
    let latestAppliedRequest = 0;
    const resolveStartedAt = Date.now();
    const traceLabel = normalizedInput.barcode
      ? `barcode=${normalizedInput.barcode}`
      : `productName=${normalizedInput.productName ?? 'unknown'}`;

    const shouldLogTiming = process.env.EXPO_PUBLIC_DEBUG_PRICE_RESOLVE === '1';

    if (shouldLogTiming) console.info(`[mobile-price-resolve] start ${traceLabel}`);
    setIsPriceLoading(true);

    const applyPriceResolution = (requestOrder: number, response: PriceResolveResponse): void => {
      if (!isMounted || requestOrder < latestAppliedRequest) {
        return;
      }

      latestAppliedRequest = requestOrder;
      setPriceResolution(response);
    };

    const initialBackendStartedAt = Date.now();

    void priceClient
      .resolve({
        barcode: normalizedInput.barcode,
        productName: normalizedInput.productName,
      })
      .then((response) => {
        if (shouldLogTiming) console.info(
          `[mobile-price-resolve] initial backend ${Date.now() - initialBackendStartedAt}ms total=${Date.now() - resolveStartedAt}ms`,
        );
        applyPriceResolution(1, response);
      })
      .catch((err: unknown) => {
        if (shouldLogTiming) console.info(
          `[mobile-price-resolve] initial error ${Date.now() - resolveStartedAt}ms message=${(err as Error)?.message ?? 'unknown'}`,
        );

        if (isMounted) {
          setPriceError((err as Error)?.message ?? 'Fiyat alınamadı');
        }
      })
      .finally(() => {
        if (shouldLogTiming) console.info(`[mobile-price-resolve] initial finish ${Date.now() - resolveStartedAt}ms`);

        if (isMounted) setIsPriceLoading(false);
      });

    const locationStartedAt = Date.now();

    getUserLocationForPricing()
      .catch(() => null)
      .then((location) => {
        if (shouldLogTiming) console.info(
          `[mobile-price-resolve] location ${Date.now() - locationStartedAt}ms found=${Boolean(location)}`,
        );

        if (!isMounted || !location) {
          return undefined;
        }

        const refinedBackendStartedAt = Date.now();

        return priceClient
          .resolve({
            barcode: normalizedInput.barcode,
            productName: normalizedInput.productName,
            location,
          })
          .then((response) => {
            if (shouldLogTiming) console.info(
              `[mobile-price-resolve] refined backend ${Date.now() - refinedBackendStartedAt}ms total=${Date.now() - resolveStartedAt}ms`,
            );

            applyPriceResolution(2, response);
          });
      })
      .catch((err: unknown) => {
        if (shouldLogTiming) console.info(
          `[mobile-price-resolve] refined error ${Date.now() - resolveStartedAt}ms message=${(err as Error)?.message ?? 'unknown'}`,
        );
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedInput]);

  useEffect(() => {
    let isMounted = true;
    const currentPriceResult = priceResolution?.result ?? null;
    const categoryKey = currentPriceResult?.sustainability?.categoryKey;
    const productGroupKey = currentPriceResult?.productGroupKey;

    if (!currentPriceResult || !categoryKey || categoryKey === 'unknown' || !productGroupKey) {
      setAlternativeRecommendations([]);
      return () => {
        isMounted = false;
      };
    }

    void priceClient
      .fetchAlternatives({
        barcode: currentPriceResult.barcode,
        productName: currentPriceResult.productName,
        categoryKey: categoryKey as AlternativeCategoryKey,
        productGroupKey,
        price: currentPriceResult.price,
        rafScore: currentPriceResult.rafScore?.score ?? null,
        healthScore: currentPriceResult.healthScore?.score ?? null,
        contentScore: currentPriceResult.contentScore?.score ?? null,
        sustainabilityScore: currentPriceResult.sustainability?.score ?? null,
        limit: 2,
      })
      .then((response) => {
        if (!isMounted) return;
        setAlternativeRecommendations(response.recommendations);
      })
      .catch(() => {
        if (!isMounted) return;
        setAlternativeRecommendations([]);
      });

    return () => {
      isMounted = false;
    };
  }, [priceResolution]);
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

  const isBackendBarcodeLoading = Boolean(normalizedInput.barcode && isPriceLoading && !priceResolution);
  const displayProductName = isBackendBarcodeLoading
    ? 'Ürün bilgisi alınıyor...'
    : priceResolution?.result.productName?.trim() || result.name;
  const displayBarcode = priceResolution?.result.barcode?.trim() || result.barcode;
  const capturedPhotoUri = searchType === 'photo' ? photoUri?.trim() : undefined;
  const displayImageUrl = isBackendBarcodeLoading
    ? null
    : priceResolution?.result.imageUrl ?? result.imageUrl ?? capturedPhotoUri ?? null;

  const visibleAlternativeRecommendations = useMemo(
    () =>
      alternativeRecommendations.filter((recommendation) => {
        const candidateSignals = recommendation.candidate.signals;
        const candidateRisk = evaluateProductRisks({
          name: recommendation.candidate.productName,
          allergens: candidateSignals?.allergens ?? [],
          additives: candidateSignals?.additives ?? [],
          hasAdditives: (candidateSignals?.additives ?? []).length > 0,
          novaGroup: candidateSignals?.novaGroup ?? null,
          nutriScore: candidateSignals?.nutriScoreGrade ?? null,
          userProfile,
        });

        return !candidateRisk.warnings.some((warning) =>
          CRITICAL_ALLERGEN_CODES.includes(warning.code),
        );
      }),
    [alternativeRecommendations, userProfile],
  );

  const topAlternativeRecommendation = visibleAlternativeRecommendations[0] ?? null;
  const priceResult = priceResolution?.result ?? null;
  const rafScore = priceResult?.rafScore ?? null;
  const priceScore = priceResult?.priceScore ?? null;
  const healthScore = priceResult?.healthScore ?? null;
  const contentScore = priceResult?.contentScore ?? null;
  const sustainability = priceResult?.sustainability ?? null;
  const priceDisclaimer =
    priceResolution?.disclaimer ?? 'Fiyat bilgisi sağlayıcı kaynaklara göre gösterilir.';
  const bestOffer = priceResult?.bestOffer ?? null;
  const offerOptions = priceResult?.offers ?? [];
  const otherOffers = bestOffer
    ? offerOptions.filter((offer) => !isSameOffer(offer, bestOffer)).slice(0, 5)
    : offerOptions.slice(1, 6);
  const fallbackMarketPrices = priceResult?.marketPrices ?? [];
  const displayAllergens = backendProductFacts ? (backendProductFacts.allergens ?? []) : result.allergens;
  const displayAdditives = backendProductFacts ? (backendProductFacts.additives ?? []) : result.additives;
  const displayIngredients = backendProductFacts?.ingredientsText ?? result.ingredients;
  const productFactsSourceText = backendProductFacts
    ? `Ürün analiz verisi: ${backendProductFacts.dataSource === 'off' ? 'Open Food Facts' : 'Beta çıkarım'}${backendProductFacts.isComplete ? '' : ' (kısmi veri)'}`
    : null;

  const productFactsMissingText = formatProductFactsMissingFields(backendProductFacts);
  const shouldShowProductFactsNotice = Boolean(
    backendProductFacts && (backendProductFacts.verificationNeeded || productFactsMissingText),
  );
  const productFactsVerificationReason =
    backendProductFacts?.verificationReason?.trim() ||
    'Bu ürün için ürün analiz verisi eksik. Skorlar kısmi veriyle yorumlanmalıdır.';

  const isBackendCompletedResolve = Boolean(priceResolution && priceResolution.triedProviders.length > 0);
  const isUnknownProduct =
    !isPriceLoading &&
    Boolean(normalizedInput.barcode) &&
    priceResolution !== null &&
    isBackendCompletedResolve &&
    !backendProductFacts &&
    priceResult?.rafScore?.status === 'unavailable' &&
    (priceResult?.price ?? null) === null;
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

        {searchType === 'photo' ? (
          <View style={styles.photoBetaNoticeCard}>
            <Text style={styles.photoBetaNoticeTitle}>
              Fotoğrafla arama beta aşamasındadır
            </Text>
            <Text style={styles.photoBetaNoticeText}>
              Kesin ürün sonucu için barkod okutmanız önerilir.
            </Text>
          </View>
        ) : null}

        {shouldShowProductFactsNotice ? (
          <View style={styles.productFactsNoticeCard}>
            <Text style={styles.productFactsNoticeTitle}>Ürün verisi eksik</Text>
            <Text style={styles.productFactsNoticeText}>
              {productFactsVerificationReason}
            </Text>

            {productFactsMissingText ? (
              <Text style={styles.productFactsNoticeMeta}>
                Eksik alanlar: {productFactsMissingText}
              </Text>
            ) : null}

            {backendProductFacts?.confidence ? (
              <Text style={styles.productFactsNoticeMeta}>
                Veri güveni: {getProductFactsConfidenceLabel(backendProductFacts.confidence)}
              </Text>
            ) : null}
          </View>
        ) : null}
        {isUnknownProduct ? (
          <View style={styles.productFactsNoticeCard}>
            <Text style={styles.productFactsNoticeTitle}>Ürün bulunamadı</Text>
            <Text style={styles.productFactsNoticeText}>
              Bu barkod için ürün verisi ve fiyat bulunamadı. RafSkoru hesaplanamıyor. Lütfen barkodu kontrol edin veya ürünü ada göre aratın.
            </Text>
          </View>
        ) : null}

        <View style={styles.rafScoreCard}>
          <Text style={styles.rafScoreLabel}>RAF SKORU</Text>
          <Text style={styles.rafScoreValue}>{getRafScoreDisplayValue(rafScore)}</Text>
          <Text style={styles.rafScoreCaption}>{getRafScoreStatusText(rafScore)}</Text>
          <Text style={styles.rafScoreCaption}>{getRafScoreConfidenceText(rafScore)}</Text>
        </View>

        {topAlternativeRecommendation ? (
          <View style={styles.alternativeCard}>
            <Text style={styles.alternativeLabel}>
              {topAlternativeRecommendation.reasonLabel}
            </Text>
            <Text style={styles.alternativeProductName}>
              {topAlternativeRecommendation.candidate.productName}
            </Text>
            <Text style={styles.alternativePrice}>
              {formatPriceForDisplay(
                topAlternativeRecommendation.candidate.price,
                topAlternativeRecommendation.candidate.currency,
              )}{' '}
              · {topAlternativeRecommendation.candidate.marketName}
            </Text>

            {topAlternativeRecommendation.reasons.slice(0, 4).map((reason) => (
              <Text key={reason} style={styles.alternativeReason}>
                • {reason}
              </Text>
            ))}

            <Text style={styles.helperText}>
              Veri güveni: {getDataConfidenceLabel(topAlternativeRecommendation.confidenceLevel)}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsPriceOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>Fiyat Skoru</Text>
          <Text style={styles.sectionToggle}>{isPriceOpen ? '-' : '+'}</Text>
        </Pressable>

        {isPriceOpen ? (
          <View style={styles.row}>
            {isPriceLoading ? (
              <Text style={styles.helperText}>Fiyat sorgulanıyor...</Text>
            ) : priceResult && priceResult.price !== null ? (
              <>
                <View style={styles.scoreSummaryCard}>
                  <Text style={styles.scoreSummaryLabel}>Fiyat Skoru</Text>
                  <Text style={styles.scoreSummaryValue}>{getPriceScoreDisplayValue(priceScore)}</Text>
                  <Text style={styles.helperText}>{getPriceScoreStatusText(priceScore)}</Text>
                </View>

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
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>En uygun fiyat</Text>
                    <Text style={styles.value}>{priceResult.marketName}</Text>
                    <Text style={styles.value}>
                      {formatPriceForDisplay(priceResult.price, priceResult.currency)}
                    </Text>
                  </>
                )}

                <Pressable
                  style={styles.inlineButton}
                  onPress={() => setIsPriceDetailsOpen((current) => !current)}
                >
                  <Text style={styles.inlineButtonText}>
                    {isPriceDetailsOpen ? 'Detayları gizle' : 'Detayları göster'}
                  </Text>
                </Pressable>

                {isPriceDetailsOpen ? (
                  <>
                    <Text style={styles.helperText}>{getPriceScoreConfidenceText(priceScore)}</Text>

                    {priceScore?.explanations?.length ? (
                      <Text style={styles.helperText}>{priceScore.explanations[0]}</Text>
                    ) : null}

                    {bestOffer && otherOffers.length > 0 ? (
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

                    {!bestOffer && fallbackMarketPrices.length > 1 ? (
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

                    <Text style={styles.helperText}>
                      {priceStatusLabel(priceResult.status)}
                      {priceResult.updatedAt ? ` · Güncelleme: ${priceResult.updatedAt}` : ''}
                    </Text>

                    {priceResult.note ? (
                      <Text style={styles.helperText}>{priceResult.note}</Text>
                    ) : null}

                    <Text style={styles.helperText}>{priceDisclaimer}</Text>
                  </>
                ) : null}
              </>
            ) : priceResult ? (
              <>
                <View style={styles.scoreSummaryCard}>
                  <Text style={styles.scoreSummaryLabel}>Fiyat Skoru</Text>
                  <Text style={styles.scoreSummaryValue}>{getPriceScoreDisplayValue(priceScore)}</Text>
                  <Text style={styles.helperText}>{getPriceScoreStatusText(priceScore)}</Text>
                </View>

                {priceResult.note ? (
                  <Text style={styles.helperText}>{priceResult.note}</Text>
                ) : (
                  <Text style={styles.helperText}>
                    Bu ürün için güncel fiyat verisi bulunamadı.
                  </Text>
                )}

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
          <Text style={styles.sectionToggle}>{isSustainabilityOpen ? '-' : '+'}</Text>
        </Pressable>

        {isSustainabilityOpen ? (
          <View style={styles.row}>
            {sustainability ? (
              <>
                <View style={styles.sustainabilitySummaryCard}>
                  <Text style={styles.sustainabilitySummaryLabel}>Sürdürülebilirlik Skoru</Text>

                  <View style={styles.sustainabilityHeaderRow}>
                    <Text style={styles.sustainabilityGrade}>{sustainability.grade}</Text>

                    <View style={styles.sustainabilityInfo}>
                      <Text style={styles.scoreSummaryValue}>{sustainability.score}/100</Text>
                      <Text style={styles.helperText}>{sustainability.label}</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={styles.inlineButton}
                  onPress={() => setIsSustainabilityDetailsOpen((current) => !current)}
                >
                  <Text style={styles.inlineButtonText}>
                    {isSustainabilityDetailsOpen ? 'Detayları gizle' : 'Detayları göster'}
                  </Text>
                </Pressable>

                {isSustainabilityDetailsOpen ? (
                  <>
                    <Text style={styles.label}>Güven</Text>
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
                ) : null}
              </>
            ) : (
              <Text style={styles.helperText}>
                Bu ürün için sürdürülebilirlik verisi bulunamadı. Skor hesaplanamadı.
              </Text>
            )}
          </View>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsHealthOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>Sağlık Skoru</Text>
          <Text style={styles.sectionToggle}>{isHealthOpen ? '-' : '+'}</Text>
        </Pressable>

        {isHealthOpen ? (
          <View style={styles.row}>
            <View style={styles.scoreSummaryCard}>
              <Text style={styles.scoreSummaryLabel}>Sağlık Skoru</Text>
              <Text style={styles.scoreSummaryValue}>{getHealthScoreDisplayValue(healthScore)}</Text>
              <Text style={styles.helperText}>{getHealthScoreStatusText(healthScore)}</Text>
            </View>

            <Pressable
              style={styles.inlineButton}
              onPress={() => setIsHealthDetailsOpen((current) => !current)}
            >
              <Text style={styles.inlineButtonText}>
                {isHealthDetailsOpen ? 'Detayları gizle' : 'Detayları göster'}
              </Text>
            </Pressable>

            {isHealthDetailsOpen ? (
              <>
                <Text style={styles.helperText}>{getHealthScoreGradeText(healthScore)}</Text>
                <Text style={styles.helperText}>{getHealthScoreConfidenceText(healthScore)}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsContentOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>İçerik ve alerjenler</Text>
          <Text style={styles.sectionToggle}>{isContentOpen ? '-' : '+'}</Text>
        </Pressable>

        {isContentOpen ? (
          <View style={styles.row}>
            <View style={styles.scoreSummaryCard}>
              <Text style={styles.scoreSummaryLabel}>İçerik/Alerjen Skoru</Text>
              <Text style={styles.scoreSummaryValue}>{getContentScoreDisplayValue(contentScore)}</Text>
              <Text style={styles.helperText}>{getContentScoreStatusText(contentScore)}</Text>
            </View>

            <Pressable
              style={styles.inlineButton}
              onPress={() => setIsContentDetailsOpen((current) => !current)}
            >
              <Text style={styles.inlineButtonText}>
                {isContentDetailsOpen ? 'Detayları gizle' : 'Detayları göster'}
              </Text>
            </Pressable>

            {isContentDetailsOpen ? (
              <>
                <Text style={styles.helperText}>{getContentScoreConfidenceText(contentScore)}</Text>

                {productFactsSourceText ? (
                  <Text style={styles.helperText}>{productFactsSourceText}</Text>
                ) : null}

                <Text style={styles.helperText}>
                  Alerjen ve katkı bilgileri ürün etiketine göre değişebilir. Son karar için ambalaj üzerindeki bilgileri kontrol edin.
                </Text>

                <Text style={styles.label}>Alerjenler</Text>
                <Text style={styles.value}>
                  {displayAllergens.length > 0 ? displayAllergens.join(', ') : 'Bilinmiyor'}
                </Text>

                <Text style={styles.label}>Katkı maddeleri</Text>
                <Text style={styles.value}>
                  {displayAdditives.length > 0 ? displayAdditives.join(', ') : 'Bilinmiyor'}
                </Text>

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
                    {displayIngredients?.trim() || 'İçindekiler bilgisi bulunamadı.'}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={styles.sectionHeader}
          onPress={() => setIsBasicInfoOpen((current) => !current)}
        >
          <Text style={styles.sectionTitle}>Ürün detayları</Text>
          <Text style={styles.sectionToggle}>{isBasicInfoOpen ? '-' : '+'}</Text>
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


        {riskResult.warnings.length > 0 ? (
          <>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => setIsRiskOpen((current) => !current)}
            >
              <Text style={styles.sectionTitle}>
                RafSkoru Uyarıları ({riskResult.warnings.length})
              </Text>
              <Text style={styles.sectionToggle}>{isRiskOpen ? '-' : '+'}</Text>
            </Pressable>

            {isRiskOpen
              ? riskResult.warnings.map((warning) => {
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
              : null}
          </>
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

function getDataConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
  if (confidence === 'high') return 'Yüksek';
  if (confidence === 'medium') return 'Orta';
  return 'Düşük';
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
  productFactsNoticeCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 6,
  },
  productFactsNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  productFactsNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#78350F',
  },
  productFactsNoticeMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: '#92400E',
  },
  alternativeCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 6,
  },
  alternativeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  alternativeProductName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7C2D12',
  },
  alternativePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3412',
  },
  alternativeReason: {
    fontSize: 12,
    color: '#9A3412',
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
  sustainabilitySummaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
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
  scoreSummaryCard: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
  },
  scoreSummaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  scoreSummaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
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
  photoBetaNoticeCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  photoBetaNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  photoBetaNoticeText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
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



















