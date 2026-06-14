import { distanceMeters, distanceText } from '../geo/distance.js';
import { normalizeMarketName } from '../normalize/marketName.js';
import type { StoreLocator } from '../stores/storeLocator.js';
import type {
  EnrichedMarketOffer,
  PriceAvailability,
  PriceFreshnessLabel,
  PriceMatchType,
  Store,
} from '../stores/storeTypes.js';
import { getDefaultStoreLocator } from './storeLocatorRegistry.js';

export interface RawOfferInput {
  marketName: string | null | undefined;
  price: number;
  currency?: string;
  source?: string;
  unitPrice?: number;
  unit?: string;
  productName?: string;
  barcode?: string;
  productUrl?: string;
  imageUrl?: string | null;
  availability?: PriceAvailability;
  observedAt?: string;
  freshnessLabel?: PriceFreshnessLabel;
  confidence?: number;
  matchType?: PriceMatchType;
  note?: string;
}

export interface EnrichContext {
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface EnrichDeps {
  storeLocator?: StoreLocator;
  maxStoresPerChain?: number;
}

export async function enrichOffers(
  rawOffers: ReadonlyArray<RawOfferInput>,
  context: EnrichContext,
  deps: EnrichDeps = {},
): Promise<EnrichedMarketOffer[]> {
  const locator = deps.storeLocator ?? getDefaultStoreLocator();
  const maxStores = deps.maxStoresPerChain ?? 1;

  const enriched = await Promise.all(
    rawOffers.map(async (raw): Promise<EnrichedMarketOffer | null> => {
      if (typeof raw.price !== 'number' || !Number.isFinite(raw.price)) {
        return null;
      }

      const { chainCode, displayName } = normalizeMarketName(raw.marketName);

      if (chainCode === 'UNKNOWN') {
        return null;
      }

      const base: EnrichedMarketOffer = {
        source: raw.source,
        marketName: raw.marketName ?? displayName,
        chainCode,
        displayName,
        price: raw.price,
        currency: 'TRY',
        unitPrice: raw.unitPrice,
        unit: raw.unit,
        productName: raw.productName,
        barcode: raw.barcode,
        productUrl: raw.productUrl,
        imageUrl: raw.imageUrl,
        availability: raw.availability,
        observedAt: raw.observedAt,
        freshnessLabel: raw.freshnessLabel,
        confidence: raw.confidence,
        matchType: raw.matchType,
        note: raw.note,
      };

      if (!context.location) {
        return base;
      }

      let stores: Store[] = [];

      try {
        stores = await locator.findNearby({
          chainCode,
          latitude: context.location.latitude,
          longitude: context.location.longitude,
          maxResults: maxStores,
        });
      } catch {
        return base;
      }

      const nearest = stores[0];

      if (!nearest) {
        return base;
      }

      const meters = distanceMeters(context.location, {
        latitude: nearest.latitude,
        longitude: nearest.longitude,
      });

      const readableDistance = distanceText(meters);

      return {
        ...base,
        store: nearest,
        distance: {
          distanceMeters: meters,
          distanceText: readableDistance,
        },
        distanceMeters: meters,
        distanceText: readableDistance,
      };
    }),
  );

  return enriched.filter((offer): offer is EnrichedMarketOffer => offer !== null);
}

export function pickBestOffer(
  offers: ReadonlyArray<EnrichedMarketOffer>,
): EnrichedMarketOffer | undefined {
  if (offers.length === 0) {
    return undefined;
  }

  return [...offers].sort((first, second) => {
    if (first.price !== second.price) {
      return first.price - second.price;
    }

    const firstDistance = first.distance?.distanceMeters ?? Number.POSITIVE_INFINITY;
    const secondDistance = second.distance?.distanceMeters ?? Number.POSITIVE_INFINITY;

    return firstDistance - secondDistance;
  })[0];
}
