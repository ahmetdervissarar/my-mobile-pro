import { submitBetaFeedback, type BetaFeedbackType } from '../../src/api/betaFeedbackClient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFallbackProductSummary } from '../../src/services/productService';
import type { ProductSearchInput } from '../../src/services/productService';
import { evaluateProductRisks } from '../../src/riskEngine/riskEngine';
import type { ProductRiskResult } from '../../src/riskEngine/riskEngine';
import { loadUserSensitivityProfile } from '../../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile } from '../../src/userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../../src/userProfile/userProfileTypes';
import { PriceClient } from '../../src/price/priceClient';
import type { CatalogAlternativesResponse, PriceResolveResponse } from '../../src/price/types';
import { buildAlternativeSections } from '../../src/features/alternatives/buildAlternativeSections';
import { getRafScoreComponentBreakdownText, getRafScoreExplanationItems, getRafScorePositiveItems } from '../../src/price/rafScoreExplanation';
import { isRafScorePriceless as isPriceless } from '../../src/price/rafScorePriceless';
import { recordRecentlyViewed } from '../../src/state/recentlyViewedStore';
import { CollapsibleSection } from '../../src/ui/CollapsibleSection';
import { spacing, useTheme } from '../../src/ui/theme';

import { AllergenDetailSheet } from '../../src/features/productResult/AllergenDetailSheet';
import { AllergenStatusRow } from '../../src/features/productResult/AllergenStatusRow';
import { AlternativesSection } from '../../src/features/productResult/AlternativesSection';
import { AttentionSection } from '../../src/features/productResult/AttentionSection';
import { DataSourceSection } from '../../src/features/productResult/DataSourceSection';
import { FooterSection } from '../../src/features/productResult/FooterSection';
import {
  CRITICAL_ALLERGEN_CODES,
  formatObservedAtRelativeLabel,
  formatProductFactsMissingFields,
  getAllergenBannerData,
  getAllergenBannerDataFromCatalog,
  getInitialResult,
  getProductFactsConfidenceLabel,
  getTransitionSafeProductGroupKey,
  productFactsToRiskTrafficLight,
} from '../../src/features/productResult/helpers';
import { IndicatorRow } from '../../src/features/productResult/IndicatorRow';
import { NutritionSection } from '../../src/features/productResult/NutritionSection';
import { PriceSection } from '../../src/features/productResult/PriceSection';
import { ProductHero } from '../../src/features/productResult/ProductHero';
import { FixedHeaderBar } from '../../src/ui/FixedHeaderBar';
import {
  getAlternativesSummary,
  getAttentionSummary,
  getDataSourceSummary,
  getIngredientsSummary,
  getNutritionSummary,
  getPriceSummary,
} from '../../src/features/productResult/sectionSummaries';
import { StickyAddBar } from '../../src/features/productResult/StickyAddBar';
import { UnknownProductNotice } from '../../src/features/productResult/UnknownProductNotice';

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
  const insets = useSafeAreaInsets();

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
  const [catalogAlternatives, setCatalogAlternatives] = useState<CatalogAlternativesResponse>({
    currentProduct: null,
    candidates: [],
  });
  const [submittedFeedbackType, setSubmittedFeedbackType] = useState<BetaFeedbackType | null>(null);
  const [isSubmittingBetaFeedback, setIsSubmittingBetaFeedback] = useState(false);
  const [betaFeedbackError, setBetaFeedbackError] = useState<string | null>(null);
  const [isAllergenSheetVisible, setIsAllergenSheetVisible] = useState(false);

  useEffect(() => {
    void loadUserSensitivityProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(emptyUserSensitivityProfile));
  }, []);

  const backendProductFacts = priceResolution?.result.productFacts ?? null;

  const riskResult: ProductRiskResult = useMemo(() => {
    // isComplete yalnız "kısmi veri" etiketini belirler — risk motorunu
    // ÇALIŞTIRIP ÇALIŞTIRMAYACAĞINI belirlemez. backendProductFacts varsa
    // (canlı OFF dahil), eksik alanlar null geçilir; evaluateProductRisks
    // zaten tüm alanları opsiyonel kabul edip elindeki veriyle değerlendirir
    // (bkz. P0 bulgusu: isComplete=false + kısmi veri → önceden risk motoru
    // hiç çalışmıyordu).
    if (backendProductFacts) {
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
  }, [backendProductFacts, priceResolution?.result.productName, result, userProfile]);

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

    // P1-7: konum artık ürün ekranı açılışında OTOMATİK istenmiyor — mağaza/
    // mesafe özelliği ertelendi (bkz. ADR-006; backend seedStores şu an boş,
    // bu yüzden konum zaten mesafe hesaplamasında kullanılamıyordu). İzin,
    // yalnızca kullanıcı ileride eklenecek bir "yakın mağaza" eylemini
    // açıkça tetiklediğinde getUserLocationForPricing() üzerinden istenecek.

    return () => {
      isMounted = false;
    };
  }, [normalizedInput]);

  useEffect(() => {
    let isMounted = true;
    const barcode = priceResolution?.result.barcode;

    if (!barcode) {
      setCatalogAlternatives({ currentProduct: null, candidates: [] });
      return () => {
        isMounted = false;
      };
    }

    void priceClient
      .fetchCatalogAlternatives({ barcode, limit: 20 })
      .then((response) => {
        if (!isMounted) return;
        setCatalogAlternatives(response);
      })
      .catch(() => {
        if (!isMounted) return;
        setCatalogAlternatives({ currentProduct: null, candidates: [] });
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

  // Alternatifler: profil eleme BURADA yapılır (profil cihazdan çıkmaz) —
  // backend yalnız aynı grup içindeki, mevcut üründen düşük puanlı olmayan
  // ham adayları döner (bkz. price/alternatives/catalogAlternatives.ts).
  const alternativeSections = useMemo(
    () =>
      buildAlternativeSections({
        currentHasConflict: isAllergenConflict,
        currentScore: catalogAlternatives.currentProduct?.rafScore.score ?? null,
        currentScoreCoverageKey: catalogAlternatives.currentProduct?.scoreCoverageKey ?? '',
        candidates: catalogAlternatives.candidates,
        userProfile,
      }),
    [catalogAlternatives, isAllergenConflict, userProfile],
  );

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

  // Katmanlı sadeleştirme: katlanır bölümlerin içeriği ve başlıktaki özetleri.
  const trafficLight = backendProductFacts
    ? productFactsToRiskTrafficLight(backendProductFacts)
    : result.trafficLight ?? null;
  const hasAnyKnownTrafficLightLevel = Boolean(
    trafficLight &&
      (trafficLight.fat.level !== 'unknown' ||
        trafficLight.saturatedFat.level !== 'unknown' ||
        trafficLight.sugars.level !== 'unknown' ||
        trafficLight.salt.level !== 'unknown'),
  );
  const dataSourceConfidenceLabel = backendProductFacts?.confidence
    ? getProductFactsConfidenceLabel(backendProductFacts.confidence)
    : null;
  const hasPrice = Boolean(priceResult?.price ?? null);
  // Fiyatsız değerlendirme (onaylı KARAR): fiyat bileşeni eksik ama puan
  // yine de hesaplandıysa (bkz. backend renormalizasyonu). Arama/kategori
  // listeleriyle AYNI paylaşılan kuralı kullanır (bkz. madde 4).
  const isRafScorePriceless = isPriceless(rafScore);
  const observedAtLabel = backendProductFacts?.observedAt
    ? formatObservedAtRelativeLabel(backendProductFacts.observedAt)
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
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <FixedHeaderBar title={displayProductName} />
        <ScrollView
          style={{ flex: 1 }}
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
      </View>
    );
  }

  const nutriScoreGrade =
    backendProductFacts?.nutriScoreGrade ?? (result.nutriScore as 'A' | 'B' | 'C' | 'D' | 'E' | null) ?? null;
  const novaGroup = backendProductFacts?.novaGroup ?? (result.novaGroup as 1 | 2 | 3 | 4 | null) ?? null;
  const dataSourceSourceText = productFactsMissingText
    ? `${productFactsSourceText ?? ''} · Eksik alanlar: ${productFactsMissingText}`
    : productFactsSourceText;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FixedHeaderBar title={displayProductName} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.lg,
          paddingBottom: spacing.xl,
        }}
      >
        {/* 1. Ürün kimliği önce — kullanıcı önce hangi üründe olduğunu görsün. */}
        <ProductHero
          name={displayProductName}
          barcode={displayBarcode}
          imageUrl={displayImageUrl}
          isPhotoSearch={searchType === 'photo'}
        />

        {/* 2. Alerjen durumu — tek satır, her zaman görünür, dokununca ayrıntı paneli açılır. */}
        <AllergenStatusRow data={allergenBannerData} onPress={() => setIsAllergenSheetVisible(true)} />

        {/* 3. Üç küçük gösterge. */}
        <IndicatorRow
          rafScore={rafScore?.score ?? null}
          nutriScoreGrade={nutriScoreGrade}
          novaGroup={novaGroup}
          allergenPriority={isAllergenConflict}
          isPriceless={isRafScorePriceless}
          onRafScorePress={() => {
            const breakdownText = getRafScoreComponentBreakdownText(rafScore);
            if (breakdownText) {
              Alert.alert('Fiyatsız değerlendirme', breakdownText);
            }
          }}
        />

        {/* 4. Katlanmış bölümler — hepsi kapalı başlar. */}
        <View style={{ gap: spacing.sm }}>
          <CollapsibleSection title="İçindekiler" summary={getIngredientsSummary(displayIngredients)}>
            <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 18 }}>
              {displayIngredients?.trim() || 'İçindekiler bilgisi bulunamadı.'}
            </Text>
          </CollapsibleSection>

          <CollapsibleSection
            title="Besin değerleri"
            summary={getNutritionSummary(hasAnyKnownTrafficLightLevel)}
          >
            <NutritionSection trafficLight={trafficLight} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Dikkat edilecekler"
            summary={getAttentionSummary(nonCriticalWarnings.length)}
          >
            <AttentionSection
              warnings={nonCriticalWarnings}
              positiveItems={rafScorePositiveItems}
              additives={displayAdditives}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Veri kaynağı ve güven"
            summary={getDataSourceSummary(dataSourceConfidenceLabel, Boolean(productFactsMissingText))}
          >
            <DataSourceSection
              productFacts={backendProductFacts}
              explanationItems={rafScoreExplanationItems}
              rafScore={rafScore}
              healthScore={healthScore}
              sustainability={sustainability}
              productName={displayProductName}
              barcode={displayBarcode}
              searchSourceLabel={sourceLabelMap[result.searchSource] ?? result.searchSource}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Fiyat" summary={getPriceSummary(hasPrice, isPriceLoading)}>
            <PriceSection
              isPriceLoading={isPriceLoading}
              priceResult={priceResult}
              priceDisclaimer={priceDisclaimer}
              priceError={priceError}
              fallbackPriceText={result.priceText}
            />
          </CollapsibleSection>

          {alternativeSections.totalCount > 0 ? (
            <CollapsibleSection title="Alternatifler" summary={getAlternativesSummary(alternativeSections.totalCount)}>
              <AlternativesSection sections={alternativeSections.sections} userProfile={userProfile} />
            </CollapsibleSection>
          ) : null}
        </View>

        <FooterSection
          submittedFeedbackType={submittedFeedbackType}
          isSubmittingBetaFeedback={isSubmittingBetaFeedback}
          betaFeedbackError={betaFeedbackError}
          onBetaFeedbackPress={(type) => void handleBetaFeedbackPress(type)}
        />
      </ScrollView>

      <StickyAddBar cartInput={cartInput} />

      <AllergenDetailSheet
        visible={isAllergenSheetVisible}
        onClose={() => setIsAllergenSheetVisible(false)}
        data={allergenBannerData}
        sourceText={dataSourceSourceText}
        observedAtLabel={observedAtLabel}
      />
    </View>
  );
}
