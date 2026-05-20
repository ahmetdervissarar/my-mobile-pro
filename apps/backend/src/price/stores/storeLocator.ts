import type { MarketChainCode, Store } from './storeTypes.js';

export interface StoreLocatorQuery {
  chainCode: MarketChainCode;
  latitude: number;
  longitude: number;
  maxResults?: number;
  radiusMeters?: number;
}

export interface StoreLocator {
  readonly name: string;
  findNearby(query: StoreLocatorQuery): Promise<Store[]>;
}
