import { distanceMeters } from '../geo/distance.js';
import type { StoreLocator, StoreLocatorQuery } from './storeLocator.js';
import type { Store } from './storeTypes.js';

const DEFAULT_RADIUS_METERS = 25_000;
const DEFAULT_MAX_RESULTS = 1;

export class StaticStoreLocator implements StoreLocator {
  readonly name = 'static';

  constructor(private readonly stores: ReadonlyArray<Store>) {}

  async findNearby(query: StoreLocatorQuery): Promise<Store[]> {
    const maxResults = query.maxResults ?? DEFAULT_MAX_RESULTS;
    const radiusMeters = query.radiusMeters ?? DEFAULT_RADIUS_METERS;

    return this.stores
      .filter((store) => store.chainCode === query.chainCode)
      .map((store) => ({
        store,
        meters: distanceMeters(
          { latitude: query.latitude, longitude: query.longitude },
          { latitude: store.latitude, longitude: store.longitude },
        ),
      }))
      .filter((candidate) => candidate.meters <= radiusMeters)
      .sort((first, second) => first.meters - second.meters)
      .slice(0, maxResults)
      .map((candidate) => candidate.store);
  }
}
