import type { Store } from './storeTypes.js';
import type { StoreLocator, StoreLocatorQuery } from './storeLocator.js';

export class NullStoreLocator implements StoreLocator {
  readonly name = 'null';

  async findNearby(_query: StoreLocatorQuery): Promise<Store[]> {
    return [];
  }
}
