/**
 * RafSkoru — Intake yol/ortam yapılandırması
 * apps/backend/src/intake/config.ts
 *
 * index.ts ve routes.ts'in AYNI dizin/dosya yollarını kullanmasını sağlar
 * (tek kaynak) — böylece ikisi arasında yol uyuşmazlığı riski olmaz.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** apps/backend/data/intake/ — .gitignore'da, repoya asla girmez. */
export function getIntakeDataDir(): string {
  return resolve(fileURLToPath(new URL('.', import.meta.url)), '../../data/intake');
}

export function getIntakeDbPath(): string {
  return resolve(getIntakeDataDir(), 'intake.db');
}

export function getIntakeVolunteersFilePath(): string {
  return resolve(getIntakeDataDir(), 'volunteers.json');
}

export function getIntakePhotosDir(): string {
  return resolve(getIntakeDataDir(), 'photos');
}
