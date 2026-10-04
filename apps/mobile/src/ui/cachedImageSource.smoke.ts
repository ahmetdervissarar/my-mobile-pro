// cachedImageSource — saf TS, react-native importu yok (yalnız tip importu,
// çalışma zamanında kullanılmaz).
import assert from 'node:assert/strict';

import { cachedImageSource } from './cachedImageSource';

const result = cachedImageSource('https://example.com/urun.jpg');
assert.equal(result.uri, 'https://example.com/urun.jpg');
assert.equal(result.cache, 'force-cache');

console.log('CACHED_IMAGE_SOURCE_SMOKE_OK');
