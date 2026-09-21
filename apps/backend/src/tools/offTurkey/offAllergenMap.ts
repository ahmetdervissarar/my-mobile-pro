// RafSkoru — OFF Alerjen Taksonomi Eşlemesi (paylaşılan)
// src/tools/offTurkey/offAllergenMap.ts
//
// normalize.ts (içe aktarma) VE catalog.ts (katalog) BU dosyadan aynı
// tabloyu kullanır — tek kaynak. Üç kova:
//   A) modeledMap     — mobil profil anahtarına (AllergenKey) eşlenen etiketler
//   B) recognizedUnmodeled — AB/TR zorunlu 14 alerjenden ama profilde
//      modellenmemiş (celery, mustard, sulphites, lupin) — "tanınmıyor"
//      SAYILMAZ, yalnız eşleştirilemez; partial TETİKLEMEZ.
//   C) her ikisine de girmeyen her şey — gerçekten tanınmayan (rawUnmapped),
//      partial TETİKLER.
//
// Doğrulama: bucket A ve B etiketleri openfoodfacts-server
// taxonomies/allergens.txt dosyasından (2026-09-21, salt okuma) doğrulandı.
// Doğrulanan bulgu: OFF'ta tek tek fındık/badem/ceviz/kaju/antep fıstığı
// için AYRI kanonik etiket YOKTUR — hepsi yalnızca "en:nuts" için eş
// anlamlı (synonym) metinlerdir; taksonomi hiçbir zaman "en:hazelnuts" gibi
// bir kanonik id üretmez. Aşağıdaki 'en:hazelnuts' girdisi bu yüzden GERÇEK
// bir OFF etiketi DEĞİLDİR — yalnızca bildirilen hata senaryosunu savunmacı
// biçimde karşılamak için eklendi; zararsızdır (gerçek veride hiç
// görülmeyebilir) ama "emin olduğum" bir etiket olarak sunmuyorum.
import type { AllergenKey } from './allergenKey.js';

export const OFF_ALLERGEN_TO_PROFILE_KEY: Record<string, AllergenKey> = {
  'en:eggs': 'egg',
  'en:milk': 'milk',
  'en:gluten': 'gluten_wheat',
  'en:soybeans': 'soy',
  'en:peanuts': 'peanut',
  'en:nuts': 'tree_nuts',
  'en:sesame-seeds': 'sesame',
  'en:fish': 'fish',
  'en:crustaceans': 'shellfish',
  'en:molluscs': 'shellfish',
  // Doğrulanmadı / gerçek OFF kanonik etiketi değil — yalnız savunmacı, bkz. dosya başı not.
  'en:hazelnuts': 'tree_nuts',
};

/**
 * AB/TR gıda kodeksi zorunlu 14 alerjenden, RafSkoru profilinde henüz
 * modellenmemiş dördü. OFF taxonomies/allergens.txt'te doğrulanan kanonik
 * etiketler (2026-09-21).
 */
export const RECOGNIZED_UNMODELED_ALLERGEN_LABELS: Record<string, string> = {
  'en:celery': 'kereviz',
  'en:mustard': 'hardal',
  'en:sulphur-dioxide-and-sulphites': 'sülfür dioksit ve sülfitler',
  'en:lupin': 'acı bakla (lupin)',
};

export interface AllergenTagClassification {
  /** Bucket A: profil anahtarına eşlenen (tekrarsız). */
  mapped: AllergenKey[];
  /** Bucket B: tanınan ama profilde modellenmemiş ham etiketler (tekrarsız). */
  recognizedUnmodeled: string[];
  /** Bucket C: ne A ne B — gerçekten tanınmayan ham etiketler (tekrarsız). */
  unmapped: string[];
}

export function classifyAllergenTags(tags: string[]): AllergenTagClassification {
  const mapped = new Set<AllergenKey>();
  const recognizedUnmodeled = new Set<string>();
  const unmapped = new Set<string>();

  for (const tag of tags) {
    const profileKey = OFF_ALLERGEN_TO_PROFILE_KEY[tag];
    if (profileKey) {
      mapped.add(profileKey);
      continue;
    }

    if (tag in RECOGNIZED_UNMODELED_ALLERGEN_LABELS) {
      recognizedUnmodeled.add(tag);
      continue;
    }

    unmapped.add(tag);
  }

  return {
    mapped: [...mapped],
    recognizedUnmodeled: [...recognizedUnmodeled],
    unmapped: [...unmapped],
  };
}
