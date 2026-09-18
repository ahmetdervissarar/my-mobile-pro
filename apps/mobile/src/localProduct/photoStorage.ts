/**
 * RafSkoru — Ambalaj fotoğraflarının cihazda kalıcılaştırılması (Aşama 6B; onaylı `expo-file-system`).
 * src/localProduct/photoStorage.ts
 *
 * Kamera önbelleğindeki dosya `Paths.document/rafskoru/photos/<taslak-id>/<tür>-<zaman>.<uzantı>` yoluna
 * KOPYALANIR (SDK 54 `File / Directory / Paths` API'si). Galeriye, backend'e, analitiğe veya başka bir
 * servise gönderilmez. Kopyalama başarısızsa çağıran taraf "kaydedildi" göstermez. Dosya yoluna profil,
 * konum veya kullanıcı kimliği yazılmaz (yalnız taslak kimliği = barkod + zaman). Saf modüller
 * (senaryo koşucuları) bu dosyayı içe almaz.
 */

import { Directory, File, Paths } from 'expo-file-system';

import type { CapturedPhoto } from './types';

export const PHOTO_ROOT_SEGMENTS = ['rafskoru', 'photos'] as const;

/** Yol bileşenlerinde yalnız güvenli karakterler; taslak kimliği barkod+ISO zaman içerir. */
function safeSegment(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'draft';
}

export function draftPhotoDirectory(draftId: string): Directory {
  return new Directory(Paths.document, ...PHOTO_ROOT_SEGMENTS, safeSegment(draftId));
}

function extensionOf(uri: string): string {
  const match = uri.match(/\.([A-Za-z0-9]{2,5})(?:\?.*)?$/);
  return match ? `.${match[1].toLowerCase()}` : '.jpg';
}

export interface PersistPhotosResult {
  ok: boolean;
  photos: CapturedPhoto[];
  errorMessage: string | null;
}

/**
 * Tüm fotoğrafları kalıcı klasöre kopyalar. Biri bile kopyalanamazsa `ok=false` döner ve o ana kadar
 * kopyalananlar geri alınır (yarım taslak bırakılmaz). Zaten kalıcı olan fotoğraflar tekrar kopyalanmaz.
 */
export function persistDraftPhotos(draftId: string, photos: readonly CapturedPhoto[]): PersistPhotosResult {
  if (photos.length === 0) return { ok: true, photos: [], errorMessage: null };
  const directory = draftPhotoDirectory(draftId);
  const copied: File[] = [];
  const persisted: CapturedPhoto[] = [];
  try {
    directory.create({ intermediates: true, idempotent: true });
    for (const photo of photos) {
      if (photo.storage === 'persistent' && photo.persistentUri) {
        persisted.push(photo);
        continue;
      }
      const source = new File(photo.localUri);
      if (!source.exists) throw new Error(`SOURCE_MISSING:${photo.kind}`);
      const fileName = `${photo.kind}-${photo.takenAt.replace(/[^0-9]/g, '')}${extensionOf(photo.localUri)}`;
      const target = new File(directory, fileName);
      if (target.exists) target.delete();
      source.copy(target);
      copied.push(target);
      let contentHash: string | null = null;
      try {
        contentHash = target.md5 ?? null;
      } catch {
        contentHash = null;
      }
      persisted.push({ ...photo, localUri: target.uri, persistentUri: target.uri, storage: 'persistent', contentHash });
    }
    return { ok: true, photos: persisted, errorMessage: null };
  } catch {
    for (const file of copied) {
      try {
        if (file.exists) file.delete();
      } catch {
        // geri alma en iyi çaba; hata kullanıcıya zaten bildirilir
      }
    }
    return {
      ok: false,
      photos: [],
      errorMessage: 'Fotoğraflar cihaza kalıcı olarak kopyalanamadı. Depolama alanı dolu olabilir. Taslak kaydedilmedi; tekrar deneyin.',
    };
  }
}

/** Taslağın fotoğraf klasörünü ve içindeki dosyaları siler; klasör yoksa başarılı sayılır. */
export function deleteDraftPhotos(draftId: string): boolean {
  try {
    const directory = draftPhotoDirectory(draftId);
    if (!directory.exists) return true;
    directory.delete();
    return true;
  } catch {
    return false;
  }
}
