/**
 * RafSkoru — Etiket okuma deposu yol yapılandırması
 * apps/backend/src/labelStore/config.ts
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** apps/backend/data/label-store/ — .gitignore'da, repoya girmez. */
export function getLabelStoreDataDir(): string {
  return resolve(fileURLToPath(new URL('.', import.meta.url)), '../../data/label-store');
}

export function getLabelStoreDbPath(): string {
  return resolve(getLabelStoreDataDir(), 'label-store.db');
}
