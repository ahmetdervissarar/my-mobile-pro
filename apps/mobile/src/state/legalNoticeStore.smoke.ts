/**
 * RafSkoru — legalNoticeStore sözleşmesi (İş 2, feat/ui-clarity)
 * src/state/legalNoticeStore.smoke.ts
 */
import assert from 'node:assert/strict';

import {
  __resetLegalNoticeForTesting,
  __setLegalNoticeStorageAdapterForTesting,
  getHasSeenLegalNoticeSnapshot,
  markLegalNoticeSeen,
} from './legalNoticeStore';

async function main(): Promise<void> {
  // Modül yüklenirken otomatik tetiklenen hydrate() GERÇEK AsyncStorage'a
  // karşı çalışır (bu RN'siz test ortamında başarısız olur, hasSeenLegalNotice
  // false'a düşer). O çağrının tamamlanmasını BEKLEMEDEN testler başlarsa,
  // gecikmeli tamamlanması test ortasında (__resetLegalNoticeForTesting'in
  // ayarladığı) durumu sessizce ezebilir — bu yüzden önce bir tur beklenir.
  await new Promise((resolve) => setTimeout(resolve, 50));

  // ── İlk açılış: hiçbir şey okunmadıysa (veya '1' değilse) GÖRÜLMEDİ ─────
  {
    __resetLegalNoticeForTesting(false);
    assert.equal(getHasSeenLegalNoticeSnapshot(), false);
  }

  // ── "Anladım" → bellek hemen güncellenir, kalıcı kayıt da yazılır ───────
  {
    __resetLegalNoticeForTesting(false);
    const savedValues: string[] = [];
    __setLegalNoticeStorageAdapterForTesting({
      getItem: async () => null,
      setItem: async (_key, value) => {
        savedValues.push(value);
      },
    });

    await markLegalNoticeSeen();

    assert.equal(getHasSeenLegalNoticeSnapshot(), true);
    assert.deepEqual(savedValues, ['1']);
  }

  // ── Kalıcı kayıt başarısız olsa da bellek yine GÖRÜLDÜ kalır (bu
  // oturumda modal tekrar açılmaz) — hata kullanıcıyı rahatsız etmez ──────
  {
    __resetLegalNoticeForTesting(false);
    __setLegalNoticeStorageAdapterForTesting({
      getItem: async () => null,
      setItem: async () => {
        throw new Error('disk yazılamadı (simülasyon)');
      },
    });

    await markLegalNoticeSeen();

    assert.equal(getHasSeenLegalNoticeSnapshot(), true, 'kalıcı kayıt başarısız olsa da bellek GÖRÜLDÜ kalmalı');
  }

  console.log('LEGAL_NOTICE_STORE_SMOKE_OK');
}

void main();
