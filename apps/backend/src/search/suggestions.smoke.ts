import assert from 'node:assert/strict';

import { foldSearchText, suggestSearch } from './suggestions.js';

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

console.log('SEARCH_SUGGESTIONS_SMOKE_OK');
