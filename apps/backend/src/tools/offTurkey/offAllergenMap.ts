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

/**
 * Türkçe/yanlış-önekli alerjen etiketi eş anlamlıları — TAM EŞLEŞME kuralıyla
 * uygulanır (alt dizi/"içinde geçiyor" eşleşmesi YOK). Her anahtar, ham OFF
 * etiketinin dil öneki atılmış + Türkçe karakter/harf normalize edilmiş
 * (normalizeTrTag) hâlidir.
 *
 * ÖNEMLİ: Bu tablo OFF'un resmî allergens.txt taksonomisinden TÜRETİLMEMİŞTİR.
 * Doğrulandı (2026-09-22, raw.githubusercontent.com/openfoodfacts/
 * openfoodfacts-server/main/taxonomies/allergens.txt) — taksonomide HİÇ
 * `tr:` (Türkçe) dil bloğu yok (0 satır). Bu yüzden her satır yalnızca
 * TR-TR OFF içe aktarma verisinde GÖZLEMLENEN ham etiketlere dayanır (kaynak
 * yorumlarında "TR verisinde gözlendi, n=…" olarak belirtilir); resmî bir
 * TGK Etiketleme Yönetmeliği kaynağı bu oturumda taze doğrulanmadığı için
 * kullanılmadı. "Belirsiz vaka, temkinli yön" notu taşıyan satırlar, birden
 * fazla anlama gelebilecek Türkçe terimlerin EN GÜVENLİ (en geniş) yöne
 * eşlendiğini belirtir.
 */
export interface TrAllergenSynonymRule {
  /** Bucket A: eşlenecek profil anahtar(lar)ı. */
  mapped?: AllergenKey[];
  /** Bucket B: eşlenecek kanonik OFF etiketi (ör. 'en:sulphur-dioxide-and-sulphites'). */
  recognizedUnmodeledCanonicalTag?: string;
  /** Kaynak ve gerekçe notu — kod incelemesi ve ADR için. */
  note: string;
}

export const TR_ALLERGEN_SYNONYMS: Record<string, TrAllergenSynonymRule> = {
  'sut': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=26' },
  'sutu': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=26' },
  'sut urunu': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=18' },
  'peyniralti suyu tozu': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=17' },
  'inek sutu': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=16' },
  'yulaf': {
    mapped: ['gluten_wheat'],
    note: 'TR verisinde gözlendi, n=14 — belirsiz vaka, temkinli yön (yulaf AB/TR mevzuatında "gluten içeren tahıllar" kapsamında sayılır)',
  },
  'sodyum metabisulfit': {
    recognizedUnmodeledCanonicalTag: 'en:sulphur-dioxide-and-sulphites',
    note: 'TR verisinde gözlendi, n=10 — belirsiz vaka, temkinli yön (sülfit bileşiği, kova B)',
  },
  'yumurta': { mapped: ['egg'], note: 'TR verisinde gözlendi, n=9' },
  'findik': { mapped: ['tree_nuts'], note: 'TR verisinde gözlendi, n=9' },
  'sut proteini': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=15 (tr: n=9 + en: n=6, aynı normalize forma düşer)' },
  'susam': { mapped: ['sesame'], note: 'TR verisinde gözlendi, n=8' },
  'pastorize inek sutu': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=8' },
  'badem': { mapped: ['tree_nuts'], note: 'TR verisinde gözlendi, n=7' },
  'fistik': {
    mapped: ['peanut', 'tree_nuts'],
    note: 'TR verisinde gözlendi, n=7 — belirsiz vaka, temkinli yön (Türkçede "fıstık" yer fıstığı VEYA Antep fıstığı/ağaç yemişi anlamına gelebilir; ikisi de işaretlenir)',
  },
  'whey proteini konsantresi': { mapped: ['milk'], note: 'TR verisinde gözlendi, n=6' },
  'laktoz': {
    mapped: ['milk'],
    note:
      'TR verisinde gözlendi, n=6 — belirsiz vaka, temkinli yön. BİLİNEN SINIR: AllergenKey tipi ayrı bir ' +
      '"lactose" değeri desteklemiyor (yalnız egg/milk/gluten_wheat/soy/peanut/tree_nuts/sesame/fish/shellfish); ' +
      'bu yüzden yalnızca milk\'e eşlenir, laktoza özgü ayrı bir işaret üretilmez (bkz. ADR-004).',
  },
};

/** Dil önekini atar, Türkçe karakterleri sadeleştirir, küçük harfe çevirir. */
function normalizeTrTag(tag: string): string {
  const withoutPrefix = tag.replace(/^[a-z]{2,3}:/, '');
  return withoutPrefix
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

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

    const synonym = TR_ALLERGEN_SYNONYMS[normalizeTrTag(tag)];
    if (synonym) {
      synonym.mapped?.forEach((key) => mapped.add(key));
      if (synonym.recognizedUnmodeledCanonicalTag) {
        recognizedUnmodeled.add(synonym.recognizedUnmodeledCanonicalTag);
      }
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
