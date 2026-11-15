/**
 * RafSkoru — Nutri-Score rozeti metinleri
 * src/ui/nutriScoreBadgeLabel.smoke.ts
 *
 * Korunan kurallar: notun kaynağı erişilebilirlik etiketinde söylenir;
 * onaylı etiket değerlerinden hesaplanan not "hesaplanmış" diye anılır ve
 * Open Food Facts verisi gibi görünmez; not yoksa kaynak eki eklenmez.
 */
import assert from 'node:assert/strict';

import { getNutriScoreBadgeLabels } from './nutriScoreBadgeLabel';

assert.deepEqual(getNutriScoreBadgeLabels({ grade: 'B', source: 'off' }), {
  baseLabel: 'Nutri-Score B',
  label: 'Nutri-Score B (Open Food Facts verisi)',
});
assert.equal(getNutriScoreBadgeLabels({ grade: 'C', source: 'rafskoru_computed' }).label, 'Nutri-Score C (hesaplanmış)');

const fromLabel = getNutriScoreBadgeLabels({ grade: 'E', source: 'rafskoru_label', status: 'computed' });
assert.equal(fromLabel.baseLabel, 'Nutri-Score E', 'görünen kısa metin değişmemeli');
assert.equal(fromLabel.label, 'Nutri-Score E (onaylı etiket değerlerinden hesaplanmış)');
assert.ok(!fromLabel.label.includes('Open Food Facts'), 'etiket notu OFF verisi gibi görünmemeli');

assert.equal(getNutriScoreBadgeLabels({ grade: null, source: 'rafskoru_label' }).label, 'Nutri-Score: veri yok');
assert.equal(getNutriScoreBadgeLabels({ grade: 'A', source: null }).label, 'Nutri-Score A');
assert.equal(getNutriScoreBadgeLabels({ grade: 'A' }).label, 'Nutri-Score A');
assert.equal(
  getNutriScoreBadgeLabels({ grade: null, status: 'not_applicable', source: 'off' }).label,
  'Nutri-Score: Uygulanamaz',
);
assert.equal(
  getNutriScoreBadgeLabels({ grade: 'B', source: 'bilinmeyen_kaynak' as never }).label,
  'Nutri-Score B',
  'tanınmayan kaynak bilinen bir kaynağın adını almamalı',
);

console.log('NUTRISCORE_BADGE_LABEL_SMOKE_OK');
