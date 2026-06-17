import {
  BETA_DISCLAIMER,
  makeUnavailableResult,
  type IPriceProvider,
  type PriceQuery,
  type PriceResult,
} from './types.js';
import { BetaReferencePriceProvider } from './providers/betaReferencePriceProvider.js';
import { LastKnownPriceProvider } from './providers/lastKnownPriceProvider.js';
import { ManualBetaPriceProvider } from './providers/manualBetaPriceProvider.js';
import { enrichOffers, pickBestOffer } from './enrich/index.js';
import { calculateSustainabilityScore } from './sustainability/index.js';
import { calculateRafScore } from './rafScore/index.js';
import { resolveDataConfidence } from './confidence/index.js';
import { calculatePriceScore } from './priceScore/index.js';
import { calculateHealthScore, type HealthScoreInput } from './healthScore/index.js';
import {
  calculateContentScore,
  type ContentScoreInput,
} from './contentScore/index.js';
import {
  fetchOpenFoodFactsProductFactsByBarcode,
  productFactsToContentScoreInput,
  productFactsToHealthScoreInput,
  productFactsToSustainabilityInput,
  type ProductFacts,
} from './productFacts/index.js';
import { inferProductGroupKey, logAlternativeSuppression, resolveProductGroup } from './productGroups/index.js';


export interface PriceProviderServiceOptions {
  manualBeta?: ManualBetaPriceProvider;
  lastKnown?: LastKnownPriceProvider;
  betaReference?: BetaReferencePriceProvider;
  extras?: IPriceProvider[];
}

export interface PriceResolveResponse {
  result: PriceResult;
  disclaimer: string;
  triedProviders: string[];
}

async function tryFetchProductFacts(query: PriceQuery): Promise<ProductFacts | null> {
  const barcode = query.barcode?.trim();

  if (!barcode) {
    return null;
  }

  try {
    const facts = await fetchOpenFoodFactsProductFactsByBarcode(barcode);

    return facts?.isComplete ? facts : null;
  } catch {
    return null;
  }
}

function normalizeTurkish(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('i·', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u');
}

function attachProductGroupKey(
  result: PriceResult,
  query: PriceQuery,
  productFacts?: ProductFacts | null,
): void {
  const productName =
    result.productName?.trim() ||
    productFacts?.productName?.trim() ||
    query.productName?.trim();

  const barcode = result.barcode || productFacts?.barcode || query.barcode;

  const legacyProductGroupKey = inferProductGroupKey(productName, barcode);

  if (legacyProductGroupKey) {
    result.productGroupKey = legacyProductGroupKey;
  }

  const resolution = resolveProductGroup({
    productName,
    barcode,
  });

  result.resolvedProductGroupKey = resolution.productGroupKey;
  result.coarseGroup = resolution.coarseGroup;
  result.groupConfidence = resolution.groupConfidence;
  result.groupSource = resolution.groupSource;
  result.packageSize = resolution.packageSize;
  result.alternativesEligible = resolution.alternativesEligible;

  logAlternativeSuppression({
    productName,
    barcode,
    resolution,
  });
}

function inferBetaHealthInput(productName?: string): HealthScoreInput {
  const normalizedName = normalizeTurkish(productName ?? '');

  if (!normalizedName) {
    return {};
  }

  if (
    normalizedName.includes('kola') ||
    normalizedName.includes('cola') ||
    normalizedName.includes('gazoz')
  ) {
    return {
      productName,
      nutriScoreGrade: 'D',
      novaGroup: 4,
      trafficLight: {
        sugar: 'high',
        salt: 'low',
        saturatedFat: 'low',
        fat: 'low',
      },
    };
  }

  if (
    normalizedName.includes('cikolata') ||
    normalizedName.includes('cips') ||
    normalizedName.includes('chips')
  ) {
    return {
      productName,
      nutriScoreGrade: 'D',
      novaGroup: 4,
      trafficLight: {
        sugar: normalizedName.includes('cikolata') ? 'high' : 'medium',
        salt:
          normalizedName.includes('cips') || normalizedName.includes('chips')
            ? 'high'
            : 'medium',
        saturatedFat: 'high',
        fat: 'high',
      },
    };
  }

  if (
    normalizedName.includes('sut') ||
    normalizedName.includes('yogurt') ||
    normalizedName.includes('peynir')
  ) {
    return {
      productName,
      nutriScoreGrade: 'B',
      novaGroup: 1,
      trafficLight: {
        sugar: 'low',
        salt: normalizedName.includes('peynir') ? 'medium' : 'low',
        saturatedFat: normalizedName.includes('peynir') ? 'medium' : 'low',
        fat: 'medium',
      },
    };
  }

  if (
    normalizedName.includes('makarna') ||
    normalizedName.includes('pirinc') ||
    normalizedName.includes('ekmek')
  ) {
    return {
      productName,
      nutriScoreGrade: 'B',
      novaGroup: 1,
      trafficLight: {
        sugar: 'low',
        salt: 'low',
        saturatedFat: 'low',
        fat: 'low',
      },
    };
  }

  if (
    normalizedName.includes('seker') ||
    normalizedName.includes('kahve') ||
    normalizedName.includes('cay')
  ) {
    return {
      productName,
      nutriScoreGrade: 'C',
      novaGroup: 2,
      trafficLight: {
        sugar: normalizedName.includes('seker') ? 'high' : 'low',
        salt: 'low',
        saturatedFat: 'low',
        fat: 'low',
      },
    };
  }

  return {};
}

function inferBetaContentInput(productName?: string): ContentScoreInput {
  const normalizedName = normalizeTurkish(productName ?? '');

  if (!normalizedName) {
    return {};
  }

  if (
    normalizedName.includes('kola') ||
    normalizedName.includes('cola') ||
    normalizedName.includes('gazoz')
  ) {
    return {
      productName,
      ingredientsText:
        'Su, seker, karbondioksit, asitlik duzenleyici, aroma vericiler, renklendirici.',
      additives: ['asitlik duzenleyici', 'renklendirici', 'aroma verici'],
      additiveRiskLevel: 'medium',
      allergenDataStatus: 'unknown',
      hasPalmOil: false,
      isUltraProcessedHint: true,
    };
  }

  if (
    normalizedName.includes('cikolata') ||
    normalizedName.includes('cips') ||
    normalizedName.includes('chips')
  ) {
    return {
      productName,
      ingredientsText:
        'Seker, bitkisel yag, aroma verici, emulgator, tuz ve islenmis bilesenler.',
      additives: ['aroma verici', 'emulgator'],
      additiveRiskLevel: 'medium',
      allergenDataStatus: 'contains_allergen',
      hasPalmOil: normalizedName.includes('cikolata'),
      isUltraProcessedHint: true,
    };
  }

  if (
    normalizedName.includes('sut') ||
    normalizedName.includes('yogurt') ||
    normalizedName.includes('peynir')
  ) {
    return {
      productName,
      ingredientsText: 'Sut ve sut urunleri.',
      additives: [],
      additiveRiskLevel: 'none',
      allergenDataStatus: 'contains_allergen',
      hasPalmOil: false,
      isUltraProcessedHint: false,
    };
  }

  if (
    normalizedName.includes('makarna') ||
    normalizedName.includes('pirinc') ||
    normalizedName.includes('ekmek')
  ) {
    return {
      productName,
      ingredientsText: normalizedName.includes('makarna')
        ? 'Durum bugdayi irmigi ve su.'
        : 'Temel tahil bilesenleri.',
      additives: [],
      additiveRiskLevel: 'none',
      allergenDataStatus: normalizedName.includes('makarna')
        ? 'contains_allergen'
        : 'clear',
      hasPalmOil: false,
      isUltraProcessedHint: false,
    };
  }

  return {};
}

function attachSustainabilityScore(
  result: PriceResult,
  query: PriceQuery,
  productFacts?: ProductFacts | null,
): void {
  const productFactsInput = productFacts
    ? productFactsToSustainabilityInput(productFacts)
    : {};

  const productName =
    result.productName?.trim() ||
    productFactsInput.productName?.trim() ||
    query.productName?.trim();

  const categoryText =
    result.productName?.trim() ||
    productFactsInput.categoryText?.trim() ||
    query.productName?.trim();

  if (!productName && !categoryText && !productFacts) {
    return;
  }

  result.sustainability = calculateSustainabilityScore({
    ...productFactsInput,
    productName,
    categoryText,
  });
}

function attachHealthScore(
  result: PriceResult,
  query: PriceQuery,
  productFacts?: ProductFacts | null,
): void {
  result.healthScore = calculateHealthScore(
    productFacts
      ? productFactsToHealthScoreInput(productFacts)
      : inferBetaHealthInput(result.productName || query.productName),
  );
}

function attachContentScore(
  result: PriceResult,
  query: PriceQuery,
  productFacts?: ProductFacts | null,
): void {
  result.contentScore = calculateContentScore(
    productFacts
      ? productFactsToContentScoreInput(productFacts)
      : inferBetaContentInput(result.productName || query.productName),
  );
}

function attachProductFactsMetadata(
  result: PriceResult,
  productFacts?: ProductFacts | null,
): void {
  if (!productFacts) {
    return;
  }

  if (!result.productName.trim() && productFacts.productName) {
    result.productName = productFacts.productName;
  }

  if (!result.imageUrl && productFacts.imageUrl) {
    result.imageUrl = productFacts.imageUrl;
  }

  if (!result.barcode && productFacts.barcode) {
    result.barcode = productFacts.barcode;
  }

  result.productFacts = productFacts;
}

function attachPriceScore(result: PriceResult): void {
  const offerPrices =
    result.offers
      ?.map((offer) => offer.price)
      .filter((price) => Number.isFinite(price) && price > 0) ?? [];

  const marketPrices =
    result.marketPrices
      ?.map((marketPrice) => marketPrice.price)
      .filter((price) => Number.isFinite(price) && price > 0) ?? [];

  const comparisonPrices = offerPrices.length > 0 ? offerPrices : marketPrices;

  const lowestPrice =
    comparisonPrices.length > 0 ? Math.min(...comparisonPrices) : null;

  const highestPrice =
    comparisonPrices.length > 0 ? Math.max(...comparisonPrices) : null;

  result.priceScore = calculatePriceScore({
    productPrice: result.bestOffer?.price ?? result.price,
    lowestPrice,
    highestPrice,
    offerCount: comparisonPrices.length,
  });
}


function attachOverallConfidence(result: PriceResult): void {
  result.overallConfidence = resolveDataConfidence(result);
}

function attachRafScore(result: PriceResult): void {
  result.rafScore = calculateRafScore({
    priceScore: result.priceScore?.score ?? null,
    healthScore: result.healthScore?.score ?? null,
    contentScore: result.contentScore?.score ?? null,
    sustainabilityScore: result.sustainability?.score ?? null,
  });
}

export class PriceProviderService {
  private readonly chain: IPriceProvider[];
  private readonly lastKnown: LastKnownPriceProvider;
  public readonly manualBeta: ManualBetaPriceProvider;

  constructor(opts: PriceProviderServiceOptions = {}) {
    const manual = opts.manualBeta ?? new ManualBetaPriceProvider();
    const lastKnown = opts.lastKnown ?? new LastKnownPriceProvider();
    const betaRef = opts.betaReference ?? new BetaReferencePriceProvider();

    this.manualBeta = manual;
    this.lastKnown = lastKnown;

    this.chain = [
      ...(opts.extras ?? []),
      manual,
      lastKnown,
      betaRef,
    ];
  }

  async resolve(query: PriceQuery): Promise<PriceResolveResponse> {
    const resolveStartedAt = Date.now();
    const traceLabel = query.barcode
      ? `barcode=${query.barcode}`
      : `productName=${query.productName ?? 'unknown'}`;

    const shouldLogTiming = process.env.DEBUG_PRICE_RESOLVE === '1';

    if (shouldLogTiming) console.info(`[price-resolve] start ${traceLabel}`);

    const triedProviders: string[] = [];
    const productFactsStartedAt = Date.now();
    const productFacts = await tryFetchProductFacts(query);

    if (shouldLogTiming) console.info(
      `[price-resolve] productFacts ${Date.now() - productFactsStartedAt}ms found=${Boolean(productFacts)}`,
    );
    for (const provider of this.chain) {
      if (!provider.isEnabled()) continue;

      triedProviders.push(provider.name);

      try {
        const providerStartedAt = Date.now();
        const result = await provider.fetch(query);

        if (shouldLogTiming) console.info(
          `[price-resolve] provider ${provider.name} ${Date.now() - providerStartedAt}ms price=${result?.price ?? 'null'}`,
        );

        if (result && result.price !== null) {
          if (provider.name !== 'last_known') {
            this.lastKnown.remember(query, result);
          }

          try {
            const rawOffers: import('./enrich/index.js').RawOfferInput[] = (result.marketPrices ?? []).map((marketPrice) => ({
              marketName: marketPrice.marketName,
              price: marketPrice.price,
              currency: marketPrice.currency,
              source: result.source ?? undefined,
              productName: marketPrice.productName ?? result.productName,
              barcode: result.barcode,
              productUrl: marketPrice.sourceUrl,
              imageUrl: marketPrice.imageUrl ?? result.imageUrl,
              observedAt: marketPrice.updatedAt ?? result.updatedAt,
              freshnessLabel:
                result.status === 'live'
                  ? 'live'
                  : result.status === 'last_known'
                    ? 'recent'
                    : result.status === 'manual_beta' || result.status === 'beta_reference'
                      ? 'reference'
                      : 'stale',
              availability: 'unknown' as const,
              confidence: result.confidence,
              matchType: result.barcode ? ('barcode' as const) : ('fuzzy_name' as const),
            }));

            const offers = await enrichOffers(rawOffers, {
              location: query.location
                ? { latitude: query.location.lat, longitude: query.location.lng }
                : undefined,
            });

            if (offers.length > 0) {
              result.offers = offers;

              const bestOffer = pickBestOffer(offers);

              if (bestOffer) {
                result.bestOffer = bestOffer;
              }
            }
          } catch (err) {
            console.warn(
              '[PriceProviderService] offer enrichment failed:',
              (err as Error).message,
            );
          }

          attachProductFactsMetadata(result, productFacts);
          attachProductGroupKey(result, query, productFacts);
          attachPriceScore(result);
          attachHealthScore(result, query, productFacts);
          attachContentScore(result, query, productFacts);
          attachSustainabilityScore(result, query, productFacts);
          attachRafScore(result);
    attachOverallConfidence(result);

          if (shouldLogTiming) console.info(`[price-resolve] done ${Date.now() - resolveStartedAt}ms source=${result.source ?? 'unknown'}`);

          return {
            result,
            disclaimer: BETA_DISCLAIMER,
            triedProviders,
          };
        }
      } catch (err) {
        console.warn(
          `[PriceProviderService] provider failed: ${provider.name}`,
          (err as Error).message,
        );
      }
    }

    const unavailableResult = makeUnavailableResult(query);
    attachProductFactsMetadata(unavailableResult, productFacts);
    attachProductGroupKey(unavailableResult, query, productFacts);
    attachPriceScore(unavailableResult);
    attachHealthScore(unavailableResult, query, productFacts);
    attachContentScore(unavailableResult, query, productFacts);
    attachSustainabilityScore(unavailableResult, query, productFacts);
    attachRafScore(unavailableResult);
    attachOverallConfidence(unavailableResult);

    if (shouldLogTiming) console.info(`[price-resolve] unavailable ${Date.now() - resolveStartedAt}ms`);

    return {
      result: unavailableResult,
      disclaimer: BETA_DISCLAIMER,
      triedProviders,
    };
  }
}




