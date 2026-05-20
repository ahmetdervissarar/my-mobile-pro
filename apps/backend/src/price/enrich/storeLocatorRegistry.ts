import { NullStoreLocator } from '../stores/nullStoreLocator.js';
import type { StoreLocator } from '../stores/storeLocator.js';
import { seedStores } from '../stores/data/seedStores.js';
import { StaticStoreLocator } from '../stores/staticStoreLocator.js';
import { GooglePlacesStoreLocator } from '../stores/googlePlacesStoreLocator.js';

function createDefaultStoreLocator(): StoreLocator {
  const kind = process.env.STORE_LOCATOR_KIND ?? 'static';

  if (kind === 'null') {
    return new NullStoreLocator();
  }

  if (kind === 'google') {
    return new GooglePlacesStoreLocator();
  }

  return new StaticStoreLocator(seedStores);
}

let currentStoreLocator: StoreLocator = createDefaultStoreLocator();

export function getDefaultStoreLocator(): StoreLocator {
  return currentStoreLocator;
}

export function setStoreLocator(locator: StoreLocator): void {
  currentStoreLocator = locator;
}
