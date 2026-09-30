/**
 * RafSkoru — Intake fotoğraf depolama
 * apps/backend/src/intake/photoStorage.ts
 *
 * Dosya adı submissionId+slot'tan türetilir (rastgele/istemci kaynaklı
 * bir ad kullanılmaz) — path traversal riski yoktur. Fotoğraflar
 * apps/backend/data/intake/photos/ altında saklanır (repoya girmez).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import type { IntakeImageType } from './photoValidation.js';

function extensionFor(type: IntakeImageType): string {
  return type === 'jpeg' ? 'jpg' : 'png';
}

export function savePhoto(
  photosDir: string,
  submissionId: string,
  slot: string,
  buffer: Buffer,
  type: IntakeImageType,
): string {
  if (!existsSync(photosDir)) mkdirSync(photosDir, { recursive: true });

  const fileName = `${submissionId}-${slot}.${extensionFor(type)}`;
  const filePath = `${photosDir}/${fileName}`;
  writeFileSync(filePath, buffer);
  return fileName;
}
