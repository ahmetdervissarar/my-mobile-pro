/**
 * RafSkoru — OCR sınırı senaryo kontrolü (Aşama 7, ADR-006; geliştirici terminali, RN runtime'a girmez).
 * src/localProduct/runOcrEngineScenarios.ts
 *
 * Yalnız native paket importu OLMAYAN saf dosyaları test eder (`ocrEngine.ts::getOcrCapability`/
 * `photoOcrEvidenceId`, `mapMlkitResult.ts`, `UnavailableOcrEngine`). `mlKitOcrEngine.ts` gerçek
 * `rn-mlkit-ocr`'ı içe aktardığı için (yalnız RN/Metro ortamında çözülür) bu koşucuya DAHIL
 * EDİLMEZ — onun tek işi (native çağrı + hata yakalama) zaten `mapMlkitResult.ts`'e devredilmiştir.
 *
 * Çalıştırma (yeni bağımlılık gerektirmez):
 *   cd apps/mobile
 *   npx tsc src/localProduct/runOcrEngineScenarios.ts --outDir /tmp/rafskoru-ocr \
 *     --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --strict
 *   node /tmp/rafskoru-ocr/localProduct/runOcrEngineScenarios.js
 */

declare const process: { env: Record<string, string | undefined>; exitCode?: number };

import { getOcrCapability, photoOcrEvidenceId } from './ocr/ocrEngine';
import { mapMlkitFailure, mapMlkitResult } from './ocr/mapMlkitResult';
import { UnavailableOcrEngine } from './ocr/unavailableOcrEngine';
import type { CapturedPhoto } from './types';

type Check = { name: string; run: () => Promise<void> | void };
const checks: Check[] = [];
function scenario(name: string, run: () => Promise<void> | void): void {
  checks.push({ name, run });
}
function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

const FORBIDDEN_CLAIMS = ['güvenli alternatif', 'alerjen içermez', 'ürün güvenlidir', 'garanti eder', 'sorun yok', 'ürün temiz'];
function assertNoForbiddenClaims(texts: (string | null)[]): void {
  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const claim of FORBIDDEN_CLAIMS) assert(!lower.includes(claim), `olumlu iddia bulundu: "${claim}" → "${text}"`);
  }
}

function samplePhoto(overrides: Partial<CapturedPhoto> = {}): CapturedPhoto {
  return {
    kind: 'ingredients',
    localUri: 'file:///tmp/fake-ingredients.jpg',
    takenAt: '2026-09-19T10:00:00.000Z',
    storage: 'cache',
    persistentUri: null,
    contentHash: null,
    ...overrides,
  };
}

// ── Bayrak/kapasite dalları ──────────────────────────────────────────────────

scenario('bayrak kapalı → flag_disabled (native modül hiç kontrol edilmeden)', () => {
  delete process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY;
  delete process.env.EXPO_PUBLIC_LOCAL_OCR;
  const cap = getOcrCapability();
  assert(cap.available === false, 'kapasite kapalı olmalı');
  assert(cap.reason === 'flag_disabled', `flag_disabled bekleniyor, ${cap.reason}`);
});

scenario('ana akış açık ama OCR bayrağı kapalı → flag_disabled', () => {
  process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY = '1';
  delete process.env.EXPO_PUBLIC_LOCAL_OCR;
  const cap = getOcrCapability();
  assert(cap.reason === 'flag_disabled', `flag_disabled bekleniyor (ana bayrak var, OCR yok), ${cap.reason}`);
  delete process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY;
});

scenario('OCR bayrağı açık ama ana akış kapalı → flag_disabled (D bayrağı bağımlılığı)', () => {
  delete process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY;
  process.env.EXPO_PUBLIC_LOCAL_OCR = '1';
  const cap = getOcrCapability();
  assert(cap.reason === 'flag_disabled', `flag_disabled bekleniyor (OCR bayrağı ana bayrağa bağımlı olmalı), ${cap.reason}`);
  delete process.env.EXPO_PUBLIC_LOCAL_OCR;
});

scenario('her iki bayrak açık, düz Node ortamında native modül yok → native_module_missing, HATA FIRLATMAZ', () => {
  process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY = '1';
  process.env.EXPO_PUBLIC_LOCAL_OCR = '1';
  const cap = getOcrCapability();
  assert(cap.available === false, 'düz Node ortamında react-native paketi native modül sağlamaz');
  assert(cap.reason === 'native_module_missing', `native_module_missing bekleniyor, ${cap.reason}`);
  delete process.env.EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY;
  delete process.env.EXPO_PUBLIC_LOCAL_OCR;
});

// ── photoOcrEvidenceId ───────────────────────────────────────────────────────

scenario('photoOcrEvidenceId: contentHash varsa öncelikli, kararlı', () => {
  const withHash = samplePhoto({ contentHash: 'abc123' });
  const id1 = photoOcrEvidenceId(withHash);
  const id2 = photoOcrEvidenceId(withHash);
  assert(id1 === id2, 'aynı fotoğraf için kararlı kimlik üretilmeli');
  assert(id1 === 'photo-hash:abc123', `hash tabanlı kimlik bekleniyor, ${id1}`);
});

scenario('photoOcrEvidenceId: hash yoksa tür+çekim zamanına düşer (draft henüz kaydedilmemiş olabilir)', () => {
  const noHash = samplePhoto({ contentHash: null, kind: 'allergen', takenAt: '2026-09-19T11:00:00.000Z' });
  const id = photoOcrEvidenceId(noHash);
  assert(id === 'photo:allergen:2026-09-19T11:00:00.000Z', `beklenmeyen kimlik: ${id}`);
});

// ── mapMlkitResult / mapMlkitFailure (saf eşleme; native import yok) ─────────

const base = { field: 'ingredientsText' as const, photoEvidenceId: 'photo:ingredients:t', capturedAt: 't0', engineVersion: '0.3.1', recognizedAt: 't1' };

scenario('mapMlkitResult: metin bulunduğunda status=candidate, alanlar user_ocr/low/unverified', () => {
  const r = mapMlkitResult({ text: '  Buğday unu, şeker  ', blocks: [{ text: 'Buğday unu, şeker', frame: { x: 0, y: 0, width: 10, height: 10 }, lines: [{ text: 'Buğday unu, şeker' }] }] }, base);
  assert(r.status === 'candidate', `candidate bekleniyor, ${r.status}`);
  assert(r.rawText === 'Buğday unu, şeker', `trim edilmiş metin bekleniyor, "${r.rawText}"`);
  assert(r.source === 'user_ocr', 'source user_ocr olmalı');
  assert(r.verificationLevel === 'unverified', 'verificationLevel unverified olmalı');
  assert(r.confidence === 'low', 'confidence low olmalı (OCR sayısal güveni ürün güveni olarak KULLANILMAZ)');
  assert(r.engine === 'mlkit_latin', 'engine mlkit_latin olmalı');
  assert(r.blocks.length === 1 && r.blocks[0].lines.length === 1, 'blok/satır yapısı korunmalı');
  assertNoForbiddenClaims([r.rawText, r.errorMessage]);
});

scenario('mapMlkitResult: boş metin → status=no_text, rawText=null (metin yok ≠ ürün güvenli)', () => {
  const r = mapMlkitResult({ text: '   ', blocks: [] }, base);
  assert(r.status === 'no_text', `no_text bekleniyor, ${r.status}`);
  assert(r.rawText === null, 'boş metinde rawText null olmalı');
});

scenario('mapMlkitResult: sonuç null/undefined → çökmez, no_text döner', () => {
  const r = mapMlkitResult(null, base);
  assert(r.status === 'no_text', `null sonuçta no_text bekleniyor, ${r.status}`);
  assert(r.blocks.length === 0, 'blok listesi boş olmalı');
});

scenario('mapMlkitFailure: status=failed, kullanıcıya güvenli Türkçe mesaj, yığın izi yok', () => {
  const r = mapMlkitFailure(base, 'Okuma başarısız — yeniden deneyin veya elle yazın.');
  assert(r.status === 'failed', `failed bekleniyor, ${r.status}`);
  assert(r.rawText === null, 'başarısızlıkta rawText null olmalı');
  assert(r.errorMessage === 'Okuma başarısız — yeniden deneyin veya elle yazın.', 'kullanıcı mesajı korunmalı');
  assertNoForbiddenClaims([r.errorMessage]);
});

// ── UnavailableOcrEngine ─────────────────────────────────────────────────────

scenario('UnavailableOcrEngine: her zaman failed + yönlendirici mesaj, asla çökmez', async () => {
  const engine = new UnavailableOcrEngine();
  const r = await engine.recognize({ photo: samplePhoto(), field: 'allergenDeclaration' });
  assert(r.status === 'failed', `failed bekleniyor, ${r.status}`);
  assert(r.engine === 'unavailable', 'engine unavailable olmalı');
  assert(r.errorMessage === 'OCR bu cihazda kullanılamıyor — elle yazabilirsiniz.', `beklenmeyen mesaj: ${r.errorMessage}`);
  assert(r.source === 'user_ocr' && r.verificationLevel === 'unverified' && r.confidence === 'low', 'provenance alanları sabit kalmalı');
});

// ── Koşucu ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let failed = 0;
  for (const check of checks) {
    try {
      await check.run();
      console.log(`OK   ${check.name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${check.name}`);
      console.error(`     ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n${checks.length - failed}/${checks.length} senaryo geçti.`);
  if (failed > 0) process.exitCode = 1;
}

void main();
