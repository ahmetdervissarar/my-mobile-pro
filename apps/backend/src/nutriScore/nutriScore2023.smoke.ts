import assert from 'node:assert/strict';
import { computeNutriScore2023 as ns } from './nutriScore2023.js';

const g = (r: ReturnType<typeof ns>) => (r.status === 'computed' ? `${r.grade}:${r.score}` : r.status);

// 1) Şekersiz digestive bisküvi (etiketten): 422 kcal, yağ 16, doymuş 1,5, şeker <0,5, lif 7, protein 6, tuz 0,7
//    N = enerji 5 + şeker 0 + doymuş 1 + tuz 3 = 9 ; P = protein 2 + lif 4 = 6 → 3 → C
assert.equal(g(ns({ category: 'general', energyKcal: 422, sugars: 0.4, saturatedFat: 1.5, salt: 0.7, proteins: 6, fiber: 7, fruitsVegLegumesPercent: 0 })), 'C:3');

// 2) Kakaolu fındık kreması: 539 kcal, şeker 56,3, doymuş 10,6, tuz 0,107, protein 6,3, lif 3,4
//    N = 6 + 15 + 10 + 0 = 31 (≥11 → protein sayılmaz); P = lif 1 → 30 → E
const spread = ns({ category: 'general', energyKcal: 539, sugars: 56.3, saturatedFat: 10.6, salt: 0.107, proteins: 6.3, fiber: 3.4, fruitsVegLegumesPercent: 0 });
assert.equal(g(spread), 'E:30');
assert.equal(spread.status === 'computed' && spread.proteinsCounted, false);

// 3) Tereyağı (yağ kategorisi): yağ 82, doymuş 54, şeker 0,6, tuz 0,02, protein 0,7
//    doymuş yağ enerjisi 1998 kJ → 10 ; oran %65,9 → 10 ; N = 20 → E
assert.equal(g(ns({ category: 'fat_oil_nuts_seeds', energyKcal: 740, fat: 82, saturatedFat: 54, sugars: 0.6, salt: 0.02, proteins: 0.7, fiber: 0 })), 'E:20');

// 4) Şekerli gazlı içecek: 42 kcal, şeker 10,6 → enerji 3 + şeker 9 = 12 → E
assert.equal(g(ns({ category: 'beverage', energyKcal: 42, sugars: 10.6, saturatedFat: 0, salt: 0.01, proteins: 0, hasNonNutritiveSweeteners: false })), 'E:12');

// 5) Tatlandırıcılı içecek: 0,4 kcal, şeker 0, tatlandırıcı var → 4 → C
assert.equal(g(ns({ category: 'beverage', energyKcal: 0.4, sugars: 0, saturatedFat: 0, salt: 0.02, proteins: 0, hasNonNutritiveSweeteners: true })), 'C:4');

// 6) Yarım yağlı süt (2023'te içecek sayılır): 46 kcal, şeker 4,8, doymuş 1,0, tuz 0,1, protein 3,4
//    N = 3 + 3 + 0 + 0 = 6 ; P = protein 7 → −1 → B
assert.equal(g(ns({ category: 'beverage', energyKcal: 46, sugars: 4.8, saturatedFat: 1.0, salt: 0.1, proteins: 3.4, hasNonNutritiveSweeteners: false })), 'B:-1');

// 7) Su → A ; kapsam dışı → not_applicable
assert.equal(g(ns({ category: 'water' })), 'A:0');
assert.equal(ns({ category: 'not_applicable' }).status, 'not_applicable');

// 8) Fail-closed: zorunlu besin eksikse hesaplanmaz, eksikler listelenir
const miss = ns({ category: 'general', energyKcal: 300, sugars: 5 });
assert.equal(miss.status, 'insufficient_data');
assert.deepEqual(miss.status === 'insufficient_data' && miss.missing, ['saturatedFat', 'salt', 'proteins']);

// 9) Varsayımlar görünür: lif ve meyve-sebze oranı bilinmiyorsa 0 kabul edilir ve yazılır
const asm = ns({ category: 'general', energyKj: 1000, sugars: 5, saturatedFat: 2, salt: 0.5, proteins: 5 });
assert.deepEqual(asm.status === 'computed' && asm.assumptions, ['fiber_assumed_0', 'fvl_assumed_0']);

// 10) Sodyum → tuz dönüşümü ve kırmızı et protein tavanı
assert.equal(g(ns({ category: 'general', energyKj: 1000, sugars: 5, saturatedFat: 2, sodium: 0.2, proteins: 5, fiber: 0, fruitsVegLegumesPercent: 0 })),
             g(ns({ category: 'general', energyKj: 1000, sugars: 5, saturatedFat: 2, salt: 0.5, proteins: 5, fiber: 0, fruitsVegLegumesPercent: 0 })));
const meat = ns({ category: 'red_meat', energyKcal: 200, sugars: 0, saturatedFat: 4, salt: 0.1, proteins: 20, fiber: 0, fruitsVegLegumesPercent: 0 });
assert.equal(meat.status === 'computed' && meat.components.proteins, 2);

console.log('nutriScore2023 smoke: 10 senaryo geçti');
