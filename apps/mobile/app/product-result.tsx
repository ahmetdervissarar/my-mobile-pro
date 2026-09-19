import { getBetaFeedbackLabel, submitBetaFeedback, type BetaFeedbackType } from '../src/api/betaFeedbackClient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getFallbackProductSummary } from '../src/services/productService';
import type { ProductSearchInput } from '../src/services/productService';
import { getUserLocationForPricing } from '../src/services/locationService';
import { evaluateProductRisks } from '../src/riskEngine/riskEngine';
import { isConsumerUxV2Enabled, isLocalProductRecoveryEnabled } from '../src/localProduct/featureFlag';
import { ProductDataStateCard } from '../src/localProduct/ProductDataStateCard';
import { loadLatestContributionDraft } from '../src/localProduct/contributionDraftStorage';
import { deriveProductDataView, evaluateRecoveryRisk, toAllergenDeclaration } from '../src/localProduct/productDataState';
import { loadLatestReviewedRecord } from '../src/localProduct/resolution/reviewStorage';
import type { LocallyReviewedRecord } from '../src/localProduct/resolution/types';
import { ConsumerDecisionScreen } from '../src/consumerUx/ConsumerDecisionScreen';
import { projectConsumerDecisionViewModel } from '../src/consumerUx/decisionViewModel';
import { useProductFactsSnapshotWriter } from '../src/localProduct/productFactsSnapshot';
import { CRITICAL_ALLERGEN_CODES } from '../src/localProduct/criticalAllergenCodes';
import { isAlternativeCandidateSafeForAllergyProfile } from '../src/localProduct/alternativeAllergenFilter';
import type { ContributionDraft, ProductFactsWire } from '../src/localProduct/types';

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
import { getRafScoreExplanationItems } from '../src/price/rafScoreExplanation';
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

const priceClient = new PriceClient();

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




type AllergenNoticeTone = 'warning' | 'info';

function formatAllergenTagList(items: string[]): string {
  return items
    .map((item) => item.replace(/^en:/, '').replace(/-/g, ' '))
    .filter(Boolean)
    .join(', ');
}

function getAllergenNotice(productFacts: PriceResolveResponse['result']['productFacts'] | null | undefined): {
  title: string;
  message: string;
  meta: string | null;
  tone: AllergenNoticeTone;
} {
  const allergenInfo = productFacts?.allergenInfo;

  if (!allergenInfo || allergenInfo.dataStatus === 'unknown') {
    return {
      title: 'Alerjen verisi eksik',
      message: 'Bu ürün için alerjen verisi eksik. Etiketi mutlaka kontrol edin.',
      meta: null,
      tone: 'warning',
    };
  }

  const declaredAllergens = allergenInfo.declaredAllergens ?? [];
  const traceAllergens = allergenInfo.traceAllergens ?? [];

  const metaParts = [
    declaredAllergens.length > 0
      ? `Beyan edilen alerjenler: ${formatAllergenTagList(declaredAllergens)}`
      : null,
    traceAllergens.length > 0
      ? `Eser miktarda içerebilir: ${formatAllergenTagList(traceAllergens)}`
      : null,
  ].filter(Boolean);

  return {
    title: 'Alerjen bilgisi mevcut',
    message: 'Bu üründe yapılandırılmış alerjen bilgisi bulundu. Profil eşleşmesi sonraki aşamada değerlendirilecek; etiket bilgisi esastır.',
    meta: metaParts.length > 0 ? metaParts.join(' · ') : null,
    tone: 'info',
  };
}

function getAllergenNoticeCardStyle(tone: AllergenNoticeTone) {
  if (tone === 'warning') {
    return { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' };
  }

  return { backgroundColor: '#F9FAFB', borderColor: '#D1D5DB' };
}

function getAllergenNoticeTitleStyle(tone: AllergenNoticeTone) {
  if (tone === 'warning') {
    return { color: '#92400E' };
  }

  return { color: '#374151' };
}

function getAllergenNoticeTextStyle(tone: AllergenNoticeTone) {
  if (tone === 'warning') {
    return { color: '#78350F' };
  }

  return { color: '#4B5563' };
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
    imageUrl: photoSource && photoSource !== 'camera' ? photoSource : null,
    warnings: [],
    allergens: [],
    additives: [],
    ingredients: null,
    nutriScore: null,
    novaGroup: null,
    trafficLight: null,
    analysisStatus: 'not_found',
    analysisMessage: 'Ürün bilgileri doğrulanıyor. Sağlık ve alerjen yorumu için güvenilir ürün verisi bekleniyor.',
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
      photoSource: searchType === 'photo' ? photoUri?.trim() || 'camera' : undefined,
    };
  }, [barcode, productName, searchType, photoUri]);

  const [result, setResult] = useState(() => getInitialResult(normalizedInput));
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isContentOpen, setIsContentOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isRafScoreReasonsOpen, setIsRafScoreReasonsOpen] = useState(false);
  const [isSustainabilityOpen, setIsSustainabilityOpen] = useState(false);
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(false);
  const [isSustainabilityDetailsOpen, setIsSustainabilityDetailsOpen] = useState(false);
  const [isHealthDetailsOpen, setIsHealthDetailsOpen] = useState(false);
  const [isContentDetailsOpen, setIsContentDetailsOpen] = useState(false);
  const [isRiskOpen, setIsRiskOpen] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(new Set());
  const [isIngredientsVisible, setIsIngredientsVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(
    emptyUserSensitivityProfile,
  );
  const [priceResolution, setPriceResolution] = useState<PriceResolveResponse | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [alternativeRecommendations, setAlternativeRecommendations] = useState<AlternativeRecommendation[]>([]);
  // Yerel ürün kurtarma dikey dilimi (bayrak arkasında; kapalıyken eski davranış korunur).
  const isLocalRecoveryEnabled = isLocalProductRecoveryEnabled();
  const [contributionDraft, setContributionDraft] = useState<ContributionDraft | null>(null);
  // Tüketici karar akışı V2 (Aşama 8, bayrak arkasında; kapalıyken bu okuma hiç tetiklenmez).
  const isConsumerUxV2 = isConsumerUxV2Enabled();
  const [reviewedRecord, setReviewedRecord] = useState<LocallyReviewedRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isConsumerUxV2) return;
      let isActive = true;
      void loadLatestReviewedRecord(normalizedInput.barcode).then((record) => {
        if (isActive) setReviewedRecord(record);
      });
      return () => {
        isActive = false;
      };
    }, [isConsumerUxV2, normalizedInput.barcode]),
  );

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
  // Bayrak açıkken `beta_inference` ürün verisi olarak gösterilmez ve güvenlik kararına girmez (D3).
  const recoveryProductFacts: ProductFactsWire | null =
    isLocalRecoveryEnabled && backendProductFacts?.dataSource === 'beta_inference' ? null : (backendProductFacts as ProductFactsWire | null);
  // Aşama 6B: inceleme ekranı aynı OFF kaydını cihaz snapshot'ından yeniden kullanır (yalnız bayrak açıkken).
  useProductFactsSnapshotWriter(isLocalRecoveryEnabled ? normalizedInput.barcode : null, recoveryProductFacts);

  const riskResult: ProductRiskResult = useMemo(() => {
    if (isLocalRecoveryEnabled && searchType === 'barcode') {
      // Barkod aramasında tek risk yolu: yalnız OFF kaynaklı, yetersiz olmayan kayıt motora girer.
      // Kısmi OFF kaydı korunur (D2); OFF dışı / beta_inference / kayıt yok → fail-closed
      // "değerlendirilemedi" döner, eski ham `productFacts` yoluna düşülmez (D3).
      return evaluateRecoveryRisk({
        facts: recoveryProductFacts,
        fallbackName: priceResolution?.result.productName ?? result.name ?? null,
        userProfile,
        trafficLight: recoveryProductFacts ? productFactsToRiskTrafficLight(recoveryProductFacts) : null,
      });
    }

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
  }, [backendProductFacts, hasBackendFoodAnalysis, isLocalRecoveryEnabled, priceResolution?.result.productName, recoveryProductFacts, result, searchType, userProfile]);

  // Katkı taslağı (yalnız cihazda): ekran odağa geldiğinde barkoda göre yeniden okunur.
  useFocusEffect(
    useCallback(() => {
      if (!isLocalRecoveryEnabled) return;
      let isActive = true;
      void loadLatestContributionDraft(normalizedInput.barcode).then((draft) => {
        if (isActive) setContributionDraft(draft);
      });
      return () => {
        isActive = false;
      };
    }, [isLocalRecoveryEnabled, normalizedInput.barcode]),
  );

  useEffect(() => {
    setResult(getInitialResult(normalizedInput));
    setIsBasicInfoOpen(false);
    setIsHealthOpen(false);
    setIsContentOpen(false);
    setIsPriceOpen(false);
    setIsRafScoreReasonsOpen(false);
    setIsSustainabilityOpen(false);
    setIsPriceDetailsOpen(false);
    setIsSustainabilityDetailsOpen(false);
    setIsHealthDetailsOpen(false);
    setIsContentDetailsOpen(false);
    setIsRiskOpen(false);
    setExpandedWarnings(new Set());
    setIsIngredientsVisible(false);

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
          setPriceError('Fiyat bilgisi şu anda alınamadı.');
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

    if (
      !currentPriceResult ||
      isExplicitlyAlternativesIneligible(currentPriceResult) ||
      !categoryKey ||
      categoryKey === 'unknown' ||
      !productGroupKey
    ) {
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

  function getTransitionSafeProductGroupKey(input: {
  resolvedProductGroupKey?: string | null;
  productGroupKey?: string | null;
}): string | null {
  return input.resolvedProductGroupKey ?? input.productGroupKey ?? null;
}

function isExplicitlyAlternativesIneligible(input: {
  alternativesEligible?: boolean;
}): boolean {
  return input.alternativesEligible === false;
}

  // CRITICAL_ALLERGEN_CODES tek kaynaktır (src/localProduct/criticalAllergenCodes.ts):
  // ana ürünün kritik kartı ve alternatif aday filtresi AYNI listeyi kullanır (proje sahibi
  // düzeltmesi, 2026-09-18) — ikisi ayrı listeye sahip olursa bir ürün kritik sayılıp aynı
  // alerjenle eşleşen bir alternatif "uygun" gösterilebilirdi.
  const criticalProfileWarnings = riskResult.warnings.filter((w) =>
    (CRITICAL_ALLERGEN_CODES as readonly string[]).includes(w.code),
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
  const currentProductGroupKey = priceResolution?.result
    ? getTransitionSafeProductGroupKey(priceResolution.result)
    : null;

  const visibleAlternativeRecommendations = useMemo(
    () =>
      alternativeRecommendations.filter((recommendation) => {
        const candidateProductGroupKey = getTransitionSafeProductGroupKey(
          recommendation.candidate,
        );

        if (!currentProductGroupKey || !candidateProductGroupKey) {
          return false;
        }

        if (candidateProductGroupKey !== currentProductGroupKey) {
          return false;
        }

        // Declared ("içerir") VE trace ("içerebilir") ayrı alanlarla, aynı kritik kod listesiyle
        // değerlendirilir; ana ürünle aynı fonksiyon (proje sahibi düzeltmesi, 2026-09-18).
        // Alerji profili olan kullanıcı için kanıt eksik/doğrulanmamışsa aday fail-closed
        // gizlenir — bkz. alternativeAllergenFilter.ts (proje sahibi düzeltmesi, dördüncü tur).
        return isAlternativeCandidateSafeForAllergyProfile(
          recommendation.candidate.signals,
          recommendation.candidate.productName,
          userProfile,
        );
      }),
    [alternativeRecommendations, currentProductGroupKey, userProfile],
  );

  const topAlternativeRecommendation = visibleAlternativeRecommendations[0] ?? null;
  const priceResult = priceResolution?.result ?? null;
  const rafScore = priceResult?.rafScore ?? null;
  const priceScore = priceResult?.priceScore ?? null;
  const healthScore = priceResult?.healthScore ?? null;
  const contentScore = priceResult?.contentScore ?? null;
  const sustainability = priceResult?.sustainability ?? null;
  const priceDisclaimer =
    priceResolution?.disclaimer ?? 'Fiyat bilgisi sağlayıcı kaynaklara göre değişebilir. Satın alma öncesinde güncel market fiyatını kontrol ediniz.';
  const priceSourceMetaText = priceResult ? getPriceSourceMetaText(priceResult) : null;
  const priceConfidenceBadge = priceResult ? getPriceConfidenceBadge(priceResult) : null;
  const [submittedFeedbackType, setSubmittedFeedbackType] = useState<BetaFeedbackType | null>(null);
  const [isSubmittingBetaFeedback, setIsSubmittingBetaFeedback] = useState(false);
  const [betaFeedbackError, setBetaFeedbackError] = useState<string | null>(null);

  async function handleBetaFeedbackPress(feedbackType: BetaFeedbackType): Promise<void> {
    if (isSubmittingBetaFeedback) {
      return;
    }

    setIsSubmittingBetaFeedback(true);
    setBetaFeedbackError(null);

    const accepted = await submitBetaFeedback({
      feedbackType,
      barcode: normalizedInput.barcode,
      productName: displayProductName,
      rafScore: typeof rafScore?.score === 'number' ? rafScore.score : undefined,
      productGroupKey: priceResult?.productGroupKey,
      resolvedProductGroupKey: priceResult?.resolvedProductGroupKey,
    });

    setIsSubmittingBetaFeedback(false);

    if (accepted) {
      setSubmittedFeedbackType(feedbackType);
      return;
    }

    setBetaFeedbackError('Geri bildirim şu anda gönderilemedi.');
  }
  const rafScoreExplanationItems = priceResult ? getRafScoreExplanationItems(priceResult) : [];
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
  const allergenNotice = getAllergenNotice(backendProductFacts);
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
  const productDataView = isLocalRecoveryEnabled
    ? deriveProductDataView({
        facts: recoveryProductFacts,
        isLoading: isPriceLoading,
        resolveCompleted: isBackendCompletedResolve,
      })
    : null;
  const showRecoveryCard = Boolean(productDataView && normalizedInput.barcode && searchType === 'barcode');
  const shouldShowAlternativeUnavailableNotice = Boolean(
    !isPriceLoading &&
      priceResult &&
      !isUnknownProduct &&
      !topAlternativeRecommendation,
  );

  // ── Tüketici karar akışı V2 (Aşama 8) ────────────────────────────────────────
  // Bayrak KAPALIYKEN aşağıdaki hesaplama/erken dönüş ATLANIR; mevcut ekran (bu fonksiyonun
  // geri kalanı) birebir korunur. riskEngine/skor/alternatif MANTIĞI burada TEKRAR HESAPLANMAZ —
  // yalnız yukarıda zaten üretilmiş sonuçlar (`riskResult`, `priceResult`, `productDataView`,
  // `visibleAlternativeRecommendations`) saf view-model'e (src/consumerUx) aktarılır.
  if (isConsumerUxV2) {
    const consumerDecisionView = projectConsumerDecisionViewModel({
      isLoading: isBackendBarcodeLoading,
      identity: { name: displayProductName ?? '', barcode: displayBarcode ?? '', imageUrl: displayImageUrl, isLoading: isBackendBarcodeLoading },
      allergenDeclaration: toAllergenDeclaration(recoveryProductFacts),
      riskResult,
      criticalProfileWarnings,
      productDataView,
      reviewedRecord,
      offProductName: recoveryProductFacts?.dataSource === 'off' ? recoveryProductFacts.productName ?? null : null,
      rafScore,
      priceScore,
      healthScore,
      contentScore,
      sustainability,
      visibleAlternatives: visibleAlternativeRecommendations,
    });
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <ConsumerDecisionScreen
          view={consumerDecisionView}
          onAddPackageInfo={() =>
            router.push({ pathname: '/package-capture', params: { barcode: normalizedInput.barcode ?? '', productName: displayProductName ?? '' } })
          }
          onSearchByName={() => router.push({ pathname: '/search', params: { initialQuery: normalizedInput.productName ?? '' } })}
          onPhotoSearch={() => router.push('/photo-search')}
          onOpenBasket={() => router.push('/basket')}
        />
      </ScrollView>
    );
  }

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
              <Text style={styles.productImagePlaceholderIcon}>▦</Text>
              <Text style={styles.productImagePlaceholderTitle}>Görsel yok</Text>
              <Text style={styles.productImagePlaceholderText}>Ürün verisi bekleniyor</Text>
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
              Fotoğraf sonucu henüz kesin ürün tanıma değildir. Sağlık, alerjen ve fiyat yorumu için barkod okutmanız önerilir.
            </Text>
          </View>
        ) : null}

        {showRecoveryCard && productDataView ? (
          <ProductDataStateCard
            view={productDataView}
            draft={contributionDraft}
            profileAllergens={userProfile.allergens}
            onAddPackageInfo={() =>
              router.push({
                pathname: '/package-capture',
                params: { barcode: normalizedInput.barcode ?? '', productName: displayProductName ?? '' },
              })
            }
            onSearchByName={() =>
              router.push({ pathname: '/search', params: { initialQuery: normalizedInput.productName ?? '' } })
            }
            onPhotoSearch={() => router.push('/photo-search')}
            onReviewDraft={() => router.push({ pathname: '/package-review', params: { gtin: normalizedInput.barcode ?? '' } })}
          />
        ) : null}

        {shouldShowProductFactsNotice && !showRecoveryCard ? (
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
        {isUnknownProduct && !showRecoveryCard ? (
          <View style={styles.productFactsNoticeCard}>
            <Text style={styles.productFactsNoticeTitle}>Ürün bulunamadı</Text>
            <Text style={styles.productFactsNoticeText}>
              Bu barkod için ürün verisi ve fiyat bulunamadı. RafSkoru hesaplanamıyor. Aşağıdaki seçeneklerden biriyle devam edebilirsin.
            </Text>

            <View style={{ marginTop: 10, gap: 8 }}>
              <Pressable
                style={styles.inlineButton}
                onPress={() =>
                  router.push({
                    pathname: '/search',
                    params: {
                      initialQuery: normalizedInput.productName ?? '',
                    },
                  })
                }
              >
                <Text style={styles.inlineButtonText}>Ürün adını yazarak ara</Text>
              </Pressable>

              <Pressable
                style={styles.inlineButton}
                onPress={() => router.push('/photo-search')}
              >
                <Text style={styles.inlineButtonText}>Ürün fotoğrafı ile dene</Text>
              </Pressable>

              <Pressable
                style={styles.inlineButton}
                disabled={isSubmittingBetaFeedback}
                onPress={() => void handleBetaFeedbackPress('product_contribution')}
              >
                <Text style={styles.inlineButtonText}>
                  Ürünü beta verisine katkı olarak gönder
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.compactBetaNoticeCard}>
          <Text style={styles.compactBetaNoticeText}>
            Kapalı beta: fiyat ve skorlar yardımcı göstergedir; güncel market fiyatı ve ürün etiketi esas alınmalıdır.
          </Text>
          <Text style={styles.compactBetaNoticeText}>
            Gizlilik: profil tercihleri cihazda tutulur; konum yalnızca yakın market ve fiyat sorgusu için kullanılır.
          </Text>
        </View>

        <View style={styles.rafScoreCard}>
          <Text style={styles.rafScoreLabel}>RAF SKORU</Text>
          <Text style={styles.rafScoreValue}>{getRafScoreDisplayValue(rafScore)}</Text>
          <Text style={styles.rafScoreCaption}>{getRafScoreStatusText(rafScore)}</Text>
          <Text style={styles.rafScoreCaption}>{getRafScoreConfidenceText(rafScore)}</Text>
        </View>

        {isPriceLoading ? (
          <View style={styles.bestPriceSummaryCard}>
            <Text style={styles.bestPriceSummaryLabel}>EN İYİ FİYAT</Text>
            <Text style={styles.bestPriceSummaryMeta}>Fiyatlar sorgulanıyor...</Text>
          </View>
        ) : priceResult && priceResult.price !== null ? (
          <View style={styles.bestPriceSummaryCard}>
            <View style={styles.bestPriceSummaryHeaderRow}>
              <Text style={styles.bestPriceSummaryLabel}>EN İYİ FİYAT</Text>
              {priceConfidenceBadge ? (
                <View
                  style={[
                    styles.priceConfidenceBadge,
                    getPriceConfidenceBadgeStyle(priceConfidenceBadge.tone),
                  ]}
                >
                  <Text
                    style={[
                      styles.priceConfidenceBadgeText,
                      getPriceConfidenceBadgeTextStyle(priceConfidenceBadge.tone),
                    ]}
                  >
                    {priceConfidenceBadge.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.bestPriceSummaryRow}>
              <Text style={styles.bestPriceSummaryMarket}>
                {bestOffer ? formatOfferStoreLabel(bestOffer) : priceResult.marketName}
              </Text>
              <Text style={styles.bestPriceSummaryPrice}>
                {formatPriceForDisplay(
                  bestOffer?.price ?? priceResult.price,
                  bestOffer?.currency ?? priceResult.currency,
                )}
              </Text>
            </View>
            {bestOffer ? (
              <Text style={styles.bestPriceSummaryMeta}>
                {formatOfferDistanceLabel(bestOffer)}
              </Text>
            ) : null}
            {priceSourceMetaText ? (
              <Text style={styles.bestPriceSummaryMeta}>{priceSourceMetaText}</Text>
            ) : null}
          </View>
        ) : priceResult ? (
          <View style={styles.bestPriceSummaryCard}>
            <View style={styles.bestPriceSummaryHeaderRow}>
              <Text style={styles.bestPriceSummaryLabel}>EN İYİ FİYAT</Text>
              {priceConfidenceBadge ? (
                <View
                  style={[
                    styles.priceConfidenceBadge,
                    getPriceConfidenceBadgeStyle(priceConfidenceBadge.tone),
                  ]}
                >
                  <Text
                    style={[
                      styles.priceConfidenceBadgeText,
                      getPriceConfidenceBadgeTextStyle(priceConfidenceBadge.tone),
                    ]}
                  >
                    {priceConfidenceBadge.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.bestPriceSummaryMeta}>
              Bu ürün için fiyat verisi bulunamadı.
            </Text>
          </View>
        ) : null}

        {rafScoreExplanationItems.length > 0 ? (
          <View style={styles.productFactsNoticeCard}>
            <Pressable
              style={styles.reasonAccordionHeader}
              onPress={() => setIsRafScoreReasonsOpen((current) => !current)}
            >
              <Text style={styles.productFactsNoticeTitle}>Neden bu skor?</Text>
              <Text style={styles.reasonAccordionToggle}>
                {isRafScoreReasonsOpen ? '-' : '+'}
              </Text>
            </Pressable>

            <Text style={styles.productFactsNoticeText}>
              Skoru etkileyen başlıca nedenler backend değerlendirmesine göre gösterilir.
            </Text>

            {isRafScoreReasonsOpen ? (
              <View style={styles.reasonList}>
                {rafScoreExplanationItems.map((item) => (
                  <Text key={item} style={styles.productFactsNoticeText}>
                    • {item}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

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
        ) : shouldShowAlternativeUnavailableNotice ? (
          <View style={styles.productFactsNoticeCard}>
            <Text style={styles.productFactsNoticeTitle}>Alternatif önerisi yok</Text>
            <Text style={styles.productFactsNoticeText}>
              Bu ürün grubunda güvenle karşılaştırılabilen daha iyi bir alternatif bulunamadı. Yanlış yönlendirmemek için alternatif önerisi gösterilmiyor.
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

                {priceSourceMetaText ? (
                  <Text style={styles.helperText}>{priceSourceMetaText}</Text>
                ) : null}

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

                {priceSourceMetaText ? (
                  <Text style={styles.helperText}>{priceSourceMetaText}</Text>
                ) : null}

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
              <Text style={styles.helperText}>
                {result.priceText?.trim() || 'Fiyat bilgisi henüz hazır değil.'}
              </Text>
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
                Bu ürün için sürdürülebilirlik verisi eksik. RafSkoru mevcut fiyat ve ürün verileriyle kısmi gösterilir.
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

                <View
                  style={[
                    styles.allergenNoticeCard,
                    getAllergenNoticeCardStyle(allergenNotice.tone),
                  ]}
                >
                  <Text
                    style={[
                      styles.allergenNoticeTitle,
                      getAllergenNoticeTitleStyle(allergenNotice.tone),
                    ]}
                  >
                    {allergenNotice.title}
                  </Text>
                  <Text
                    style={[
                      styles.allergenNoticeText,
                      getAllergenNoticeTextStyle(allergenNotice.tone),
                    ]}
                  >
                    {allergenNotice.message}
                  </Text>
                  {allergenNotice.meta ? (
                    <Text
                      style={[
                        styles.allergenNoticeMeta,
                        getAllergenNoticeTextStyle(allergenNotice.tone),
                      ]}
                    >
                      {allergenNotice.meta}
                    </Text>
                  ) : null}
                </View>

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
        <View style={styles.productFactsNoticeCard}>
          <Text style={styles.productFactsNoticeTitle}>Beta geri bildirimi</Text>
          <Text style={styles.productFactsNoticeText}>
            Bu sonuçta hatalı gördüğünüz alanı işaretleyin. Geri bildirimler kapalı beta iyileştirmesi için kullanılır.
          </Text>

          <View style={styles.betaFeedbackActions}>
            {(['wrong_product', 'wrong_price', 'wrong_score', 'missing_alternative'] as BetaFeedbackType[]).map(
              (feedbackType) => (
                <Pressable
                  key={feedbackType}
                  style={[
                    styles.betaFeedbackButton,
                    submittedFeedbackType === feedbackType ? styles.betaFeedbackButtonSelected : null,
                  ]}
                  onPress={() => {
                    void handleBetaFeedbackPress(feedbackType);
                  }}
                  disabled={isSubmittingBetaFeedback}
                >
                  <Text style={styles.betaFeedbackButtonText}>
                    {submittedFeedbackType === feedbackType ? '✓ ' : ''}
                    {getBetaFeedbackLabel(feedbackType)}
                  </Text>
                </Pressable>
              ),
            )}
          </View>

          {submittedFeedbackType ? (
            <Text style={styles.betaFeedbackStatusText}>
              Geri bildiriminiz alındı: {getBetaFeedbackLabel(submittedFeedbackType)}
            </Text>
          ) : null}

          {betaFeedbackError ? (
            <Text style={styles.betaFeedbackErrorText}>{betaFeedbackError}</Text>
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

function getPriceSourceLabel(source: PriceResolveResponse['result']['source']): string {
  if (source === 'manual_beta') return 'Beta manuel veri';
  if (source === 'beta_reference') return 'Beta referans veri';
  if (source === 'last_known') return 'Son bilinen fiyat';
  if (source === 'retailer_scraper') return 'Market kaynaklı veri';
  if (source === 'online_test_seed') return 'Beta fiyat verisi';
  return 'Fiyat kaynağı yok';
}

function getPriceSourceMetaText(priceResult: PriceResolveResponse['result']): string {
  const sourceText = `Fiyat kaynağı: ${getPriceSourceLabel(priceResult.source)}`;
  const confidenceText = priceResult.overallConfidence
    ? `Veri güveni: ${getDataConfidenceLabel(priceResult.overallConfidence.level)}`
    : null;

  return confidenceText ? `${sourceText} · ${confidenceText}` : sourceText;
}


type PriceConfidenceBadgeTone = 'live' | 'recent' | 'beta' | 'missing';

function formatObservedAtRelativeLabel(observedAt: string | null): string {
  if (!observedAt) {
    return 'son güncelleme bilinmiyor';
  }

  const observedDate = new Date(observedAt);

  if (Number.isNaN(observedDate.getTime())) {
    return 'son güncelleme bilinmiyor';
  }

  const now = new Date();
  const observedStart = new Date(
    observedDate.getFullYear(),
    observedDate.getMonth(),
    observedDate.getDate(),
  );
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.max(
    0,
    Math.floor((todayStart.getTime() - observedStart.getTime()) / 86_400_000),
  );

  if (diffDays === 0) return 'bugün';
  if (diffDays === 1) return 'dün';
  return `${diffDays} gün önce`;
}

function getPriceConfidenceBadge(priceResult: PriceResolveResponse['result']): {
  label: string;
  tone: PriceConfidenceBadgeTone;
} {
  const confidence = priceResult.priceConfidence;

  if (!confidence) {
    return priceResult.price === null
      ? { label: 'Fiyat bulunamadı', tone: 'missing' }
      : { label: 'Beta referans fiyat', tone: 'beta' };
  }

  if (confidence.status === 'live' && !confidence.isSynthetic) {
    return { label: 'Canlı fiyat', tone: 'live' };
  }

  if (confidence.status === 'recent') {
    return {
      label: `Son güncelleme: ${formatObservedAtRelativeLabel(confidence.observedAt)}`,
      tone: 'recent',
    };
  }

  if (confidence.status === 'not_found') {
    return { label: 'Fiyat bulunamadı', tone: 'missing' };
  }

  return { label: 'Beta referans fiyat', tone: 'beta' };
}

function getPriceConfidenceBadgeStyle(tone: PriceConfidenceBadgeTone) {
  if (tone === 'live') {
    return { backgroundColor: '#ECFDF5', borderColor: '#86EFAC' };
  }

  if (tone === 'recent') {
    return { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' };
  }

  if (tone === 'missing') {
    return { backgroundColor: '#F9FAFB', borderColor: '#D1D5DB' };
  }

  return { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' };
}

function getPriceConfidenceBadgeTextStyle(tone: PriceConfidenceBadgeTone) {
  if (tone === 'live') {
    return { color: '#166534' };
  }

  if (tone === 'recent') {
    return { color: '#1D4ED8' };
  }

  if (tone === 'missing') {
    return { color: '#4B5563' };
  }

  return { color: '#92400E' };
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    gap: 2,
  },
  productImagePlaceholderIcon: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  productImagePlaceholderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textAlign: 'center',
  },
  productImagePlaceholderText: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
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
  betaFeedbackActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  betaFeedbackButton: {
    borderWidth: 1,
    borderColor: '#BFD8C5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  betaFeedbackButtonSelected: {
    borderColor: '#2DCC71',
    backgroundColor: '#EAF8EF',
  },
  betaFeedbackButtonText: {
    color: '#1F5C39',
    fontSize: 12,
    fontWeight: '700',
  },
  betaFeedbackStatusText: {
    color: '#1F5C39',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  betaFeedbackErrorText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
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
  reasonAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reasonAccordionToggle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400E',
  },
  reasonList: {
    gap: 4,
  },
  allergenNoticeCard: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    gap: 4,
  },
  allergenNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  allergenNoticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  allergenNoticeMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  compactBetaNoticeCard: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactBetaNoticeText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#6B7280',
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
  bestPriceSummaryCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  bestPriceSummaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.7,
  },
  bestPriceSummaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceConfidenceBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceConfidenceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bestPriceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bestPriceSummaryMarket: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  bestPriceSummaryPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E40AF',
  },
  bestPriceSummaryMeta: {
    fontSize: 11,
    lineHeight: 16,
    color: '#2563EB',
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



















