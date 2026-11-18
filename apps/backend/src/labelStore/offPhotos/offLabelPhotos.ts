/**
 * RafSkoru — OFF etiket fotoğrafı seçimi (ADR-009 §8, İş 1.4c)
 * apps/backend/src/labelStore/offPhotos/offLabelPhotos.ts
 *
 * Saf fonksiyonlar: ağ çağrısı YAPMAZ. Ağ işi fetchOffLabelPhotosCli.ts'tedir.
 *
 * OFF belgeleri (2026-11-18 okundu) ve gerçek yanıt (aynı gün, tek istekle):
 *   - seçili fotoğraflar gönüllülerce kırpılmış/döndürülmüş hâllerdir — okumaya
 *     en uygun olanlar bunlardır
 *   - `selected_images` alanı her zaman bütün seçili fotoğrafları içermiyor
 *     (gerçek yanıtta yalnız ön yüz vardı); seçili fotoğrafın asıl kaydı
 *     `images["<bölüm>_<dil>"]` altındadır: { imgid, rev, sizes }
 *   - adres: images.openfoodfacts.org/images/products/<klasör>/<bölüm>_<dil>.<rev>.full.jpg;
 *     klasör, 13 haneye sıfırla tamamlanmış barkodun 3/3/3/kalan bölünmesidir
 *   - dosya adı `<ad>.<rev>.<boyut>.jpg` (boyut: 100 | 200 | 400 | full)
 *   - küçük puntolu metin için 400 piksel yetersizdir; `full` kullanılır
 *   - fotoğraflar CC BY-SA lisanslıdır; atıf her kayıtta saklanır
 */
import type { LabelPhotoSlot } from '../types.js';

export const OFF_SEARCH_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/search';

/** Toplu okumada istenen bölümler. Ön yüz, ad katalogda yoksa ayrıca istenebilir (şimdilik yok). */
export const OFF_LABEL_SLOTS: readonly LabelPhotoSlot[] = ['ingredients', 'nutrition'];

export interface OffSelectedPhoto {
  slot: LabelPhotoSlot;
  /** Fotoğrafın dili (ör. "tr"). */
  lang: string;
  /** Tam boy, seçili (kırpılmış) fotoğrafın adresi. */
  url: string;
  /** Fotoğrafın OFF'a yüklendiği an (ISO); bilinmiyorsa null. */
  uploadedAt: string | null;
}

export interface OffSearchProduct {
  code?: unknown;
  product_name?: unknown;
  brands?: unknown;
  last_modified_t?: unknown;
  selected_images?: unknown;
  images?: unknown;
}

/** Türkiye'de içindekiler fotoğrafı seçili ama içindekiler metni tamamlanmamış ürünler. */
export function buildOffLabelSearchUrl(pageSize: number, page = 1): string {
  const params = new URLSearchParams({
    countries_tags_en: 'turkey',
    states_tags: 'en:ingredients-to-be-completed,en:ingredients-photo-selected',
    fields: 'code,product_name,brands,last_modified_t,selected_images,images',
    page_size: String(pageSize),
    page: String(page),
    sort_by: 'code',
  });
  return `${OFF_SEARCH_ENDPOINT}?${params.toString()}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Seçili fotoğrafın 400 piksel ya da başka bir boyuttaki adresinden tam boy
 * adresini üretir. Beklenen biçime uymayan adres için null döner (tahmin yok).
 */
export function toFullSizeUrl(url: string): string | null {
  const match = /^(https:\/\/images\.openfoodfacts\.org\/images\/products\/[0-9/]+\/[a-z]+_[a-z]{2,3}\.\d+)\.(?:100|200|400|full)\.jpg$/.exec(url);
  return match ? `${match[1]}.full.jpg` : null;
}

/** Barkodun OFF görsel klasörü (OFF belgesindeki kural); 8 hane ve altı bölünmez. */
export function offImageFolder(barcode: string): string | null {
  if (!/^[0-9]+$/.test(barcode)) return null;
  if (barcode.length <= 8) return barcode;
  const padded = barcode.padStart(13, '0');
  const match = /^(...)(...)(...)(.*)$/.exec(padded);
  return match ? `${match[1]}/${match[2]}/${match[3]}/${match[4]}` : null;
}

function uploadedAtFor(images: unknown, slot: LabelPhotoSlot, lang: string): string | null {
  if (!isPlainObject(images)) return null;
  const selected = images[`${slot}_${lang}`];
  if (!isPlainObject(selected)) return null;
  const imgid = selected.imgid;
  if (typeof imgid !== 'string' && typeof imgid !== 'number') return null;
  const raw = images[String(imgid)];
  if (!isPlainObject(raw) || typeof raw.uploaded_t !== 'number' || raw.uploaded_t <= 0) return null;
  return new Date(raw.uploaded_t * 1000).toISOString();
}

/**
 * Bir ürünün seçili içindekiler/besin tablosu fotoğrafları. Önce
 * `images["<bölüm>_<dil>"]` kaydı (rev ve tam boy bilgisiyle), yoksa
 * `selected_images` adresi kullanılır. Türkçe fotoğraf varsa o seçilir; yoksa
 * ilk dil. Tam boyu olmayan veya adresi kurulamayan fotoğraf atlanır.
 */
export function extractSelectedPhotos(product: OffSearchProduct): OffSelectedPhoto[] {
  const barcode = typeof product.code === 'string' ? product.code : '';
  const folder = offImageFolder(barcode);
  const images = isPlainObject(product.images) ? product.images : {};
  const selected = isPlainObject(product.selected_images) ? product.selected_images : {};

  const photos: OffSelectedPhoto[] = [];
  for (const slot of OFF_LABEL_SLOTS) {
    const fromImages = Object.keys(images)
      .map((key) => new RegExp(`^${slot}_([a-z]{2,3})$`).exec(key)?.[1])
      .filter((lang): lang is string => Boolean(lang));
    const lang = fromImages.includes('tr') ? 'tr' : fromImages[0];

    if (lang && folder) {
      const record = images[`${slot}_${lang}`];
      const rev = isPlainObject(record) ? record.rev : undefined;
      const hasFull = isPlainObject(record) && isPlainObject(record.sizes) && isPlainObject(record.sizes.full);
      if ((typeof rev === 'string' || typeof rev === 'number') && /^[0-9]+$/.test(String(rev)) && hasFull) {
        photos.push({
          slot,
          lang,
          url: `https://images.openfoodfacts.org/images/products/${folder}/${slot}_${lang}.${rev}.full.jpg`,
          uploadedAt: uploadedAtFor(images, slot, lang),
        });
        continue;
      }
    }

    // Yedek: selected_images adresi.
    const entry = selected[slot];
    const display = isPlainObject(entry) && isPlainObject(entry.display) ? entry.display : null;
    if (!display) continue;
    const langs = Object.keys(display).filter((key) => typeof display[key] === 'string');
    const displayLang = langs.includes('tr') ? 'tr' : langs[0];
    if (!displayLang) continue;
    const url = toFullSizeUrl(display[displayLang] as string);
    if (!url) continue;
    photos.push({ slot, lang: displayLang, url, uploadedAt: uploadedAtFor(images, slot, displayLang) });
  }
  return photos;
}

/** Kaydın gözlem zamanı: fotoğrafların en yenisinin yüklenme anı; yoksa ürünün son değişikliği. */
export function observedAtFor(photos: OffSelectedPhoto[], lastModifiedT: unknown): string | null {
  const uploaded = photos
    .map((photo) => photo.uploadedAt)
    .filter((value): value is string => value !== null)
    .sort();
  if (uploaded.length > 0) return uploaded[uploaded.length - 1]!;
  return typeof lastModifiedT === 'number' && lastModifiedT > 0 ? new Date(lastModifiedT * 1000).toISOString() : null;
}

export function offProductUrl(barcode: string): string {
  return `https://world.openfoodfacts.org/product/${barcode}`;
}

/** Fotoğraf kaydında saklanan atıf metni (CC BY-SA). */
export function offPhotoAttribution(barcode: string): string {
  return `Open Food Facts katkıcıları — CC BY-SA — ${offProductUrl(barcode)}`;
}

/** İndirilen fotoğrafın yerel dosya adı (barkod klasörü içinde). */
export function localPhotoFileName(photo: OffSelectedPhoto): string {
  const rev = /\.(\d+)\.full\.jpg$/.exec(photo.url)?.[1] ?? '0';
  return `${photo.slot}-${photo.lang}.${rev}.jpg`;
}

/** OFF isteklerinin kimliği. İletişim adresi zorunludur; kişisel adres yerine projeye ait adres kullanılır. */
export function buildOffUserAgent(contact: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    throw new Error('Geçerli bir iletişim e-postası verilmeli (--contact=...).');
  }
  return `RafSkoru/0.3 (etiket okuma pilotu; ${contact})`;
}
