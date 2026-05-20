import { NullStoreLocator } from '../stores/nullStoreLocator.js';
import type { StoreLocator } from '../stores/storeLocator.js';

let currentStoreLocator: StoreLocator = new NullStoreLocator();

export function getDefaultStoreLocator(): StoreLocator {
  return currentStoreLocator;
}

export function setStoreLocator(locator: StoreLocator): void {
  currentStoreLocator = locator;
}
