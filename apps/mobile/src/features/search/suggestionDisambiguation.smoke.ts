/**
 * RafSkoru — Arama: aynı marka+boyuttaki kayıtları ayırt etme testi (D4)
 * src/features/search/suggestionDisambiguation.smoke.ts
 */
import assert from 'node:assert/strict';

import type { ProductSearchSuggestion } from '../../api/productSuggestionClient';
import { getDuplicateBarcodeSuffixes } from './suggestionDisambiguation';

function product(overrides: Partial<ProductSearchSuggestion> & { productId: string; label: string }): ProductSearchSuggestion {
  return {
    type: 'product',
    productGroupKey: 'milk',
    source: 'product_index',
    brand: 'Dost',
    packageSize: { amount: 1000, unit: 'ml' },
    ...overrides,
  };
}

// ── Aynı marka+boyutta iki FARKLI GTIN → ikisi de ayırt edici alır ────────
{
  const generic = product({ productId: '8695077092021', label: 'Süt' });
  const descriptive = product({ productId: '8695077102010', label: '%3.1 Yağlı Süt' });

  const suffixes = getDuplicateBarcodeSuffixes([generic, descriptive]);

  assert.equal(suffixes.size, 2, 'iki kayıt da (hiçbiri gizlenmeden) ayırt edici almalı');
  assert.equal(suffixes.get('8695077092021'), '… 2021');
  assert.equal(suffixes.get('8695077102010'), '… 2010');
}

// ── Tek kayıt varsa ayırt ediciye gerek yok ───────────────────────────────
{
  const onlyOne = product({ productId: '8695077092021', label: 'Süt' });
  const suffixes = getDuplicateBarcodeSuffixes([onlyOne]);
  assert.equal(suffixes.size, 0, 'tek kayıt varken ayırt edici eklenmemeli');
}

// ── Farklı marka veya boyut → ayırt ediciye gerek yok ─────────────────────
{
  const dost = product({ productId: '8695077092021', label: 'Süt', brand: 'Dost' });
  const other = product({ productId: '8690504000068', label: 'Süt', brand: 'Sütaş' });
  const suffixes = getDuplicateBarcodeSuffixes([dost, other]);
  assert.equal(suffixes.size, 0, 'farklı markalar aynı grupta olsa da ayırt edici gerektirmez');
}

console.log('SUGGESTION_DISAMBIGUATION_SMOKE_OK');
