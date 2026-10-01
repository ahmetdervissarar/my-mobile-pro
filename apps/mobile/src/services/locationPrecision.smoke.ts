/**
 * RafSkoru — konum kabalaştırma sözleşmesi (P1-7, feat/v2-catalog)
 * src/services/locationPrecision.smoke.ts
 *
 * roundToCoarseGrid'in kesin koordinatı ~1 km'lik bir kareye indirdiğini
 * kilitler (locationService.ts'in kendisi expo-location/react-native'e
 * bağımlı olduğundan plain tsx altında test edilemiyor — bkz. dosya başı
 * yorumu).
 */
import assert from 'node:assert/strict';

import { roundToCoarseGrid } from './locationPrecision';

// İstanbul, Kadıköy civarı — kesin bir konum
const preciseLatitude = 40.987654;
const preciseLongitude = 29.123456;

const roundedLatitude = roundToCoarseGrid(preciseLatitude);
const roundedLongitude = roundToCoarseGrid(preciseLongitude);

assert.notEqual(roundedLatitude, preciseLatitude, 'kesin enlem hiç değişmeden geçmemeli');
assert.notEqual(roundedLongitude, preciseLongitude, 'kesin boylam hiç değişmeden geçmemeli');
assert.equal(roundedLatitude, 40.99, 'enlem ~1 km kareye (2 ondalık) yuvarlanmalı');
assert.equal(roundedLongitude, 29.12, 'boylam ~1 km kareye (2 ondalık) yuvarlanmalı');

// Farklı ama yakın (aynı ~1 km karede) iki koordinat aynı yuvarlanmış değere düşmeli.
const nearbyLatitude = 40.98701;
assert.equal(
  roundToCoarseGrid(nearbyLatitude),
  roundedLatitude,
  'aynı ~1 km karedeki yakın koordinatlar aynı yuvarlanmış değeri vermeli',
);

// Yuvarlama deterministik olmalı — aynı girdi her zaman aynı çıktıyı vermeli.
assert.equal(roundToCoarseGrid(preciseLatitude), roundToCoarseGrid(preciseLatitude));

console.log('LOCATION_PRECISION_SMOKE_OK');
