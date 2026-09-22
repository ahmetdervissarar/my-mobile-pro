import { submitBetaFeedback, type BetaFeedbackType } from '../src/api/betaFeedbackClient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { getFallbackProductSummary } from '../src/services/productService';
import type { ProductSearchInput } from '../src/services/productService';
import { getUserLocationForPricing } from '../src/services/locationService';
import { evaluateProductRisks } from '../src/riskEngine/riskEngine';
import type { ProductRiskResult } from '../src/riskEngine/riskEngine';
import { loadUserSensitivityProfile } from '../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import { PriceClient } from '../src/price/priceClient';
import type {
  AlternativeCategoryKey,
  AlternativeRecommendation,
  PriceResolveResponse,
} from '../src/price/types';
import { getRafScoreExplanationItems, getRafScorePositiveItems } from '../src/price/rafScoreExplanation';
import { recordRecentlyViewed } from '../src/state/recentlyViewedStore';
import { spacing, useTheme } from '../src/ui/theme';

import { AllergenSection } from '../src/features/productResult/AllergenSection';
import { AllergensDetailSection } from '../src/features/productResult/AllergensDetailSection';
import { AlternativesSection } from '../src/features/productResult/AlternativesSection';
import { DataQualityNotice } from '../src/features/productResult/DataQualityNotice';
import { FooterSection } from '../src/features/productResult/FooterSection';
import {
  CRITICAL_ALLERGEN_CODES,
  formatProductFactsMissingFields,
  getAllergenBannerData,
  getAllergenBannerDataFromCatalog,
  getInitialResult,
  getTransitionSafeProductGroupKey,
  isExplicitlyAlternativesIneligible,
  productFactsToRiskTrafficLight,
} from '../src/features/productResult/helpers';
import { MoreDetailsSection } from '../src/features/productResult/MoreDetailsSection';
import { NutriNovaSection } from '../src/features/productResult/NutriNovaSection';
import { PositivesSection } from '../src/features/productResult/PositivesSection';
import { PriceSection } from '../src/features/productResult/PriceSection';
import { ProductHero } from '../src/features/productResult/ProductHero';
import { ScoreSection } from '../src/features/productResult/ScoreSection';
import { StickyAddBar } from '../src/features/productResult/StickyAddBar';
import { UnknownProductNotice } from '../src/features/productResult/UnknownProductNotice';
import { WarningsSection } from '../src/features/productResult/WarningsSection';

const priceClient = new PriceClient();

const sourceLabelMap: Record<string, string> = {
  barcode: 'Barkod',
  search: 'Ürün arama',
  name: 'Ürün arama',
  photo: 'Fotoğrafla arama',
};

export default function ProductResultScreen() {
  const { barcode, productId, productName, searchType, photoUri } = useLocalSearchParams<{
    barcode?: string;
    /** Geriye uyumluluk: eski çağıranlar (arama önerisi) GTIN'i 'productId' olarak gönderiyor olabilir. */
    productId?: string;
    productName?: string;
    searchType?: string;
    photoUri?: string;
  }>();

  const { colors } = useTheme();

  const normalizedInput = useMemo(() => {
    const normalizedBarcode = (barcode ?? productId)?.trim();

    if (normalizedBarcode) {
      return { barcode: normalizedBarcode, productName: undefined, photoSource: undefined };
    }

    return {
      barcode: undefined,
      productName: productName?.trim(),
      photoSource: searchType === 'photo' ? photoUri?.trim() || 'camera' : undefined,
    };
  }, [barcode, productId, productName, searchType, photoUri]);

  const [result, setResult] = useState(() => getInitialResult(normalizedInput));
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(emptyUserSensitivityProfile);
  const [priceResolution, setPriceResolution] = useState<PriceResolveResponse | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [alternativeRecommendations, setAlternativeRecommendations] = useState<AlternativeRecommendation[]>([]);
  const [submittedFeedbackType, setSubmittedFeedbackType] = useState<BetaFeedbackType | null>(null);
  const [isSubmittingBetaFeedback, setIsSubmittingBetaFeedback] = useState(false);
  const [betaFeedbackError, setBetaFeedbackError] = useState<string | null>(null);

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
        name: backendProductFacts.productName ?? priceResolution?.result.productName ?? result.name ?? null,
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
      return { overallRisk: 'unknown', warnings: [], isEvaluated: true };
    }

    if (result.analysisStatus !== 'ready') {
      return {
        overallRisk: 'unknown',
        warnings: [
          {
            code: 'FOOD_ANALYSIS_UNAVAILABLE',
            title: 'Gıda analizi yapılamadı',
            message: result.analysisMessage ?? 'Bu ürün için yeterli gıda verisi bulunamadı.',
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
      .resolve({ barcode: normalizedInput.barcode, productName: normalizedInput.productName })
      .then((response) => {
        if (shouldLogTiming)
          console.info(
            `[mobile-price-resolve] initial backend ${Date.now() - initialBackendStartedAt}ms total=${Date.now() - resolveStartedAt}ms`,
          );
        applyPriceResolution(1, response);
      })
      .catch((err: unknown) => {
        if (shouldLogTiming)
          console.info(
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
        if (shouldLogTiming)
          console.info(`[mobile-price-resolve] location ${Date.now() - locationStartedAt}ms found=${Boolean(location)}`);

        if (!isMounted || !location) {
          return undefined;
        }

        const refinedBackendStartedAt = Date.now();

        return priceClient
          .resolve({ barcode: normalizedInput.barcode, productName: normalizedInput.productName, location })
          .then((response) => {
            if (shouldLogTiming)
              console.info(
                `[mobile-price-resolve] refined backend ${Date.now() - refinedBackendStartedAt}ms total=${Date.now() - resolveStartedAt}ms`,
              );

            applyPriceResolution(2, response);
          });
      })
      .catch((err: unknown) => {
        if (shouldLogTiming)
          console.info(
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

  const criticalProfileWarnings = riskResult.warnings.filter((w) => CRITICAL_ALLERGEN_CODES.includes(w.code));
  const nonCriticalWarnings = riskResult.warnings.filter((w) => !CRITICAL_ALLERGEN_CODES.includes(w.code));

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
        const candidateProductGroupKey = getTransitionSafeProductGroupKey(recommendation.candidate);

        if (!currentProductGroupKey || !candidateProductGroupKey) {
          return false;
        }

        if (candidateProductGroupKey !== currentProductGroupKey) {
          return false;
        }

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

        return !candidateRisk.warnings.some((warning) => CRITICAL_ALLERGEN_CODES.includes(warning.code));
      }),
    [alternativeRecommendations, currentProductGroupKey, userProfile],
  );

  const topAlternativeRecommendation = visibleAlternativeRecommendations[0] ?? null;
  const priceResult = priceResolution?.result ?? null;
  const rafScore = priceResult?.rafScore ?? null;
  const healthScore = priceResult?.healthScore ?? null;
  const sustainability = priceResult?.sustainability ?? null;
  const priceDisclaimer =
    priceResolution?.disclaimer ??
    'Fiyat bilgisi sağlayıcı kaynaklara göre değişebilir. Satın alma öncesinde güncel market fiyatını kontrol ediniz.';

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
  const rafScorePositiveItems = priceResult ? getRafScorePositiveItems(priceResult) : [];
  const displayAllergens = backendProductFacts ? backendProductFacts.allergens ?? [] : result.allergens;
  const displayAdditives = backendProductFacts ? backendProductFacts.additives ?? [] : result.additives;
  const displayIngredients = backendProductFacts?.ingredientsText ?? result.ingredients;
  const productFactsSourceText = backendProductFacts
    ? `Ürün analiz verisi: ${backendProductFacts.dataSource === 'off' ? 'Open Food Facts (ODbL)' : 'Beta çıkarım'}${backendProductFacts.isComplete ? '' : ' (kısmi veri)'}`
    : null;
  const productFactsMissingText = formatProductFactsMissingFields(backendProductFacts);

  const isBackendCompletedResolve = Boolean(priceResolution && priceResolution.triedProviders.length > 0);
  // Barkod da, ürün adı da, fotoğraf kaynağı da yoksa — ekranın araştıracağı hiçbir
  // kimlik sinyali yok demektir (ör. bir çağıran GTIN'i hiç geçirmediyse). Bu durumda
  // "Bilinmiyor" dolu boş bir sayfa yerine doğrudan bilinmeyen-ürün bildirimini göster.
  const hasNoIdentitySignal =
    !normalizedInput.barcode && !normalizedInput.productName && !normalizedInput.photoSource;
  const isUnknownProduct =
    (!isPriceLoading &&
      Boolean(normalizedInput.barcode) &&
      priceResolution !== null &&
      isBackendCompletedResolve &&
      !backendProductFacts &&
      priceResult?.rafScore?.status === 'unavailable' &&
      (priceResult?.price ?? null) === null) ||
    (!isPriceLoading && hasNoIdentitySignal);
  const shouldShowAlternativeUnavailableNotice = Boolean(
    !isPriceLoading && priceResult && !isUnknownProduct && !topAlternativeRecommendation,
  );

  // Ürün yerel OFF-TR katalogundan geldiyse (catalogAllergenData dolu), banner
  // arama/sepetle AYNI birleştirme çekirdeğini kullanır (getCatalogAllergenChipStatus'u
  // DOĞRUDAN ÇAĞIRMAZ — bkz. getAllergenBannerDataFromCatalog). Değilse (canlı OFF veya
  // OCR/beta çıkarım kaynaklı) eski, profil-farkında olmayan yola düşer.
  const allergenBannerData = backendProductFacts?.catalogAllergenData
    ? getAllergenBannerDataFromCatalog({
        catalogAllergenData: backendProductFacts.catalogAllergenData,
        userProfile,
        riskWarnings: riskResult.warnings,
      })
    : getAllergenBannerData({
        productFacts: backendProductFacts,
        riskWarnings: riskResult.warnings,
      });

  // P2 invariant: skor bandı, profille çakışan alerjenin ÜSTÜNDE bir hüküm kelimesi göstermez.
  const isAllergenConflict =
    allergenBannerData.criticalMatches.length > 0 || (allergenBannerData.displayInfo?.isConflict ?? false);

  const resolvedGroupKeyForCart = priceResult ? getTransitionSafeProductGroupKey(priceResult) : null;
  const cartInput =
    resolvedGroupKeyForCart && !isUnknownProduct
      ? {
          type: 'product' as const,
          productId: displayBarcode || normalizedInput.barcode,
          productGroupKey: resolvedGroupKeyForCart,
          label: displayProductName,
          imageUrl: displayImageUrl,
        }
      : null;

  useEffect(() => {
    if (isPriceLoading || isUnknownProduct || !priceResult) return;

    const viewedName = priceResult.productName?.trim() || result.name;
    if (!viewedName) return;

    recordRecentlyViewed({
      barcode: normalizedInput.barcode,
      productName: viewedName,
      imageUrl: displayImageUrl,
      score: rafScore?.score ?? null,
    });
  }, [isPriceLoading, isUnknownProduct, priceResult, displayImageUrl, rafScore, normalizedInput.barcode, result.name]);

  if (isUnknownProduct) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
      >
        <ProductHero
          name={displayProductName}
          barcode={displayBarcode}
          imageUrl={displayImageUrl}
          isPhotoSearch={searchType === 'photo'}
        />
        <UnknownProductNotice
          initialQuery={normalizedInput.productName ?? ''}
          isSubmittingBetaFeedback={isSubmittingBetaFeedback}
          onContributeProduct={() => void handleBetaFeedbackPress('product_contribution')}
        />
        <FooterSection
          submittedFeedbackType={submittedFeedbackType}
          isSubmittingBetaFeedback={isSubmittingBetaFeedback}
          betaFeedbackError={betaFeedbackError}
          onBetaFeedbackPress={(type) => void handleBetaFeedbackPress(type)}
        />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xl }}>
        <AllergenSection data={allergenBannerData} />

        <ProductHero
          name={displayProductName}
          barcode={displayBarcode}
          imageUrl={displayImageUrl}
          isPhotoSearch={searchType === 'photo'}
        />

        <DataQualityNotice productFacts={backendProductFacts} />

        <ScoreSection
          rafScore={rafScore}
          explanationItems={rafScoreExplanationItems}
          allergenPriority={isAllergenConflict}
        />

        <NutriNovaSection
          nutriScoreGrade={backendProductFacts?.nutriScoreGrade ?? (result.nutriScore as 'A' | 'B' | 'C' | 'D' | 'E' | null) ?? null}
          novaGroup={backendProductFacts?.novaGroup ?? (result.novaGroup as 1 | 2 | 3 | 4 | null) ?? null}
        />

        <WarningsSection warnings={nonCriticalWarnings} />

        <PositivesSection items={rafScorePositiveItems} />

        <AllergensDetailSection
          allergens={displayAllergens}
          additives={displayAdditives}
          ingredients={displayIngredients}
          sourceText={productFactsMissingText ? `${productFactsSourceText ?? ''} · Eksik alanlar: ${productFactsMissingText}` : productFactsSourceText}
        />

        <PriceSection
          isPriceLoading={isPriceLoading}
          priceResult={priceResult}
          priceDisclaimer={priceDisclaimer}
          priceError={priceError}
          fallbackPriceText={result.priceText}
        />

        <AlternativesSection
          topRecommendation={topAlternativeRecommendation}
          shouldShowUnavailableNotice={shouldShowAlternativeUnavailableNotice}
        />

        <MoreDetailsSection
          healthScore={healthScore}
          sustainability={sustainability}
          productName={displayProductName}
          barcode={displayBarcode}
          searchSourceLabel={sourceLabelMap[result.searchSource] ?? result.searchSource}
        />

        <FooterSection
          submittedFeedbackType={submittedFeedbackType}
          isSubmittingBetaFeedback={isSubmittingBetaFeedback}
          betaFeedbackError={betaFeedbackError}
          onBetaFeedbackPress={(type) => void handleBetaFeedbackPress(type)}
        />
      </ScrollView>

      <StickyAddBar cartInput={cartInput} />
    </View>
  );
}
