// productDisplayName — saf TS, react-native importu yok.
// Çalıştırma: cd apps/backend && npx tsx ../mobile/src/ui/productDisplayName.smoke.ts
import assert from 'node:assert/strict';

import { getProductDisplayName } from './productDisplayName';

// 1) Ad biliniyorsa (label productId'den farklı) olduğu gibi gösterilir,
// barkod alt satırı YOK.
{
  const result = getProductDisplayName({ label: 'Tam Yağlı Süt', productId: '8690000000031' });
  assert.equal(result.title, 'Tam Yağlı Süt');
  assert.equal(result.unknownNameBarcode, null);
}

// 2) Ad VE marka yoksa (backend label'ı productId'ye düşürmüştü) başlık
// "Adı bilinmeyen ürün" + miktar olur; barkod artık ayrı, küçük/gri alanda.
{
  const result = getProductDisplayName({
    label: '8690000000031',
    productId: '8690000000031',
    packageSize: { amount: 1, unit: 'L' },
  });
  assert.equal(result.title, 'Adı bilinmeyen ürün · 1 L');
  assert.equal(result.unknownNameBarcode, '8690000000031');
}

// 3) Miktar da yoksa yalnız "Adı bilinmeyen ürün" (iki nokta üst üste ekli
// boş miktar YAZILMAZ).
{
  const result = getProductDisplayName({ label: '8690000000031', productId: '8690000000031' });
  assert.equal(result.title, 'Adı bilinmeyen ürün');
  assert.equal(result.unknownNameBarcode, '8690000000031');
}

// 4) productId hiç verilmemişse (ör. ürün grubu önerisi) hiçbir koşulda
// "ad bilinmiyor" sayılmaz — label ne olursa olsun olduğu gibi gösterilir.
{
  const result = getProductDisplayName({ label: 'Süt', productId: undefined });
  assert.equal(result.title, 'Süt');
  assert.equal(result.unknownNameBarcode, null);
}

console.log('PRODUCT_DISPLAY_NAME_SMOKE_OK');
