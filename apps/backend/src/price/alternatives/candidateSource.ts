import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AlternativeCandidate } from './types.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultSeedPath = resolve(moduleDir, '../../../data/seed-candidates.json');

export function loadSeedAlternativeCandidates(
  seedPath: string = defaultSeedPath,
): AlternativeCandidate[] {
  const raw = readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('seed-candidates.json must contain an array.');
  }

  return parsed as AlternativeCandidate[];
}
