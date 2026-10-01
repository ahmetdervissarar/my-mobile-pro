/**
 * Cihaz testi 1 Ekim, madde 1: alerjen ayrıntı panelinde süt ve laktoz
 * AYRI satırlardır — laktoz satırı "Süt" olarak mirror EDİLMEZ, "Laktoz" +
 * "süt beyanı nedeniyle" notuyla gösterilir. Diğer anahtarlar/seviyeler
 * (no_data, not_listed, milk'in kendisi) displayLabelForKey'in normal
 * (mirror'suz) çıktısını korur.
 */
import assert from 'node:assert/strict';

import { getDetailRowLabel } from './allergenDetailRow';

assert.deepEqual(getDetailRowLabel('lactose', 'declared'), { label: 'Laktoz', note: 'süt beyanı nedeniyle' });
assert.deepEqual(getDetailRowLabel('lactose', 'trace'), { label: 'Laktoz', note: 'süt beyanı nedeniyle' });

// no_data/not_listed seviyelerinde mirror riski yok (bir "içerir" iddiası
// değil) — displayLabelForKey zaten "Laktoz" döner, override gerekmez.
assert.deepEqual(getDetailRowLabel('lactose', 'no_data'), { label: 'Laktoz', note: null });
assert.deepEqual(getDetailRowLabel('lactose', 'not_listed'), { label: 'Laktoz', note: null });

// milk kendisi her zaman "Süt", not yok.
assert.deepEqual(getDetailRowLabel('milk', 'declared'), { label: 'Süt', note: null });

console.log('ALLERGEN_DETAIL_ROW_SMOKE_OK');
