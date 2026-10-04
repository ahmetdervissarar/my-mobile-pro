/**
 * RafSkoru — Yasal Bildirim Görülme Durumu (cihaz içi)
 * src/state/legalNoticeStore.ts
 *
 * İş 2 (feat/ui-clarity, görev onayı): "Kapalı beta" ve "gizlilik" metni
 * artık her ürün sayfasında DEĞİL, uygulama ilk açılışında bir kez
 * gösterilir. Bu modül yalnız "görüldü mü" bayrağını tutar — metnin
 * KENDİSİ LegalNoticeModal'da, cartStore.ts'teki adapter-injection
 * deseniyle (RN'siz test edilebilir) tutarlı.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'rafskoru:legalNoticeSeen';

let hasSeenLegalNotice = false;
let isHydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

interface LegalNoticeStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Üretimde her zaman gerçek AsyncStorage; testler bunu değiştirir (cartStore.ts'teki desenle aynı). */
let storageAdapter: LegalNoticeStorageAdapter = AsyncStorage;

/** Yalnız testler için — üretim kodu bunu hiç çağırmaz. */
export function __setLegalNoticeStorageAdapterForTesting(adapter: LegalNoticeStorageAdapter): void {
  storageAdapter = adapter;
}

/** Yalnız testler için — modül durumunu sıfırlar. */
export function __resetLegalNoticeForTesting(seen = false): void {
  hasSeenLegalNotice = seen;
  isHydrated = true;
}

async function hydrate(): Promise<void> {
  try {
    const raw = await storageAdapter.getItem(STORAGE_KEY);
    hasSeenLegalNotice = raw === '1';
  } catch {
    // Okunamazsa güvenli taraf: GÖRÜLMEDİ kabul edilir — modal bir kez daha
    // gösterilir. Okuma hatası asla "görüldü" anlamına gelmemeli; aksi halde
    // kullanıcı bu bilgiyi hiç görmeden kaybedebilir.
    hasSeenLegalNotice = false;
  } finally {
    isHydrated = true;
    emit();
  }
}

void hydrate();

export function getHasSeenLegalNoticeSnapshot(): boolean {
  return hasSeenLegalNotice;
}

export function isLegalNoticeHydrated(): boolean {
  return isHydrated;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHasSeenLegalNotice(): boolean {
  return useSyncExternalStore(subscribe, getHasSeenLegalNoticeSnapshot, getHasSeenLegalNoticeSnapshot);
}

export function useIsLegalNoticeHydrated(): boolean {
  return useSyncExternalStore(subscribe, isLegalNoticeHydrated, isLegalNoticeHydrated);
}

/**
 * Kullanıcı "Anladım"a bastığında çağrılır. Bellek hemen güncellenir (bu
 * oturumda modal tekrar açılmaz); kalıcı kayıt başarısız olursa yalnızca
 * bir SONRAKİ açılışta modal tekrar görünür — veri kaybı yok, en fazla bir
 * kez daha gösterilir.
 */
export async function markLegalNoticeSeen(): Promise<void> {
  hasSeenLegalNotice = true;
  emit();

  try {
    await storageAdapter.setItem(STORAGE_KEY, '1');
  } catch {
    // Kasıtlı: kalıcı kayıt başarısız olsa da kullanıcıyı hata ile rahatsız
    // etmeyiz — bu metin bir güvenlik kapısı değil, bilgilendirmedir.
  }
}
