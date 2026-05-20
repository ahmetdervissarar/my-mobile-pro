import { distanceMeters, distanceText } from '../geo/distance.js';
import { normalizeMarketName } from '../normalize/marketName.js';
import type { StoreLocator } from '../stores/storeLocator.js';
import type { EnrichedMarketOffer, Store } from '../stores/storeTypes.js';
import { getDefaultStoreLocator } from './storeLocatorRegistry.js';

export interface RawOfferInput {
  marketName: string | null | undefined;
  price: number;
  currency?: string;
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
        chainCode,
        displayName,
        price: raw.price,
        currency: 'TRY',
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

      return {
        ...base,
        store: nearest,
        distance: {
          distanceMeters: meters,
          distanceText: distanceText(meters),
        },
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
