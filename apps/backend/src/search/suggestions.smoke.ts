import assert from 'node:assert/strict';

import { foldSearchText, suggestByProductGroup, suggestSearch } from './suggestions.js';

assert.equal(foldSearchText('SÜT'), 'sut');
assert.equal(foldSearchText('İçecek'), 'ıcecek');

const riceSuggestions = suggestSearch('pir');
assert.equal(riceSuggestions.query, 'pir');
assert.ok(riceSuggestions.suggestions.length > 0);
assert.deepEqual(riceSuggestions.suggestions[0], {
  type: 'product_group',
  productGroupKey: 'rice',
  label: 'Pirinç',
  coverage: 'covered',
  source: 'product_group_registry',
});

const milkSuggestions = suggestSearch('sut');
assert.ok(
  milkSuggestions.suggestions.some(
    (suggestion) => suggestion.type === 'product_group' && suggestion.productGroupKey === 'milk',
  ),
);

const shortSuggestions = suggestSearch('p');
assert.deepEqual(shortSuggestions, {
  query: 'p',
  suggestions: [],
});

const limitedSuggestions = suggestSearch('ma', { limit: 1 });
assert.ok(limitedSuggestions.suggestions.length <= 1);

// P1-6: boş groupKey → boş sonuç (katalog fixture gerektiren asıl senaryo
// searchRoutes.smoke.ts'te, gerçek bir yüklü katalogla test edilir).
const emptyGroupBrowse = suggestByProductGroup('');
assert.deepEqual(emptyGroupBrowse, { productGroupKey: '', suggestions: [] });

const unknownGroupBrowse = suggestByProductGroup('this_group_does_not_exist');
assert.deepEqual(unknownGroupBrowse, { productGroupKey: 'this_group_does_not_exist', suggestions: [] });

console.log('SEARCH_SUGGESTIONS_SMOKE_OK');
