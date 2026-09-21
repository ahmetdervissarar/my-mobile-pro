// RafSkoru — Mobil Profil Alerjen Anahtarı
// src/tools/offTurkey/allergenKey.ts
//
// normalize.ts'den ayrı bir dosyaya taşındı ki offAllergenMap.ts ve
// normalize.ts aynı tipi dairesel bağımlılık olmadan paylaşabilsin.
// normalize.ts bu tipi geriye dönük uyumluluk için yeniden dışa aktarır.
export type AllergenKey =
  | 'egg' | 'milk' | 'gluten_wheat' | 'soy' | 'peanut'
  | 'tree_nuts' | 'sesame' | 'fish' | 'shellfish';
