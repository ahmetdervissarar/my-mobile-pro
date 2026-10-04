/**
 * RafSkoru — TesseractEngine kablo testi (AŞAMA 1, feat/ocr-pipeline)
 * apps/backend/src/ocr/tesseractEngine.smoke.ts
 *
 * Gerçek etiket fotoğrafı henüz yok (görev onayı, yanıt b: "fixture
 * metinlerle ilerlet"). Bu test METİN DOĞRULUĞUNU iddia ETMEZ — yalnız:
 *   1) worker gerçekten kurulabiliyor mu (yerel `langPath`, AĞ ÇAĞRISI YOK —
 *      bu kum havuzunda cdn.jsdelivr.net engelli; başarı, yerel veri
 *      kullanıldığının kanıtıdır),
 *   2) recognize() çağrısı sözleşmedeki alanları (text/confidence/engine/
 *      durationMs/memoryDeltaBytes) gerçekten dolduruyor mu,
 *   3) ilk açılış (worker kurulumu) ve bir recognize() çağrısının gerçek
 *      süresini RAPORLAR (görev onayı ek 1 — performans ölçümü).
 * Test görüntüsü düz bir PNG'dir (zlib ile el yapımı, yeni paket YOK) —
 * gerçek bir etiket fotoğrafı DEĞİLDİR, isabet ölçümü bu testin kapsamı
 * dışıdır (gerçek fotoğraf geldiğinde ayrıca ölçülecek).
 */
import assert from 'node:assert/strict';
import zlib from 'node:zlib';

import { tesseractEngine } from './tesseractEngine.js';

function crc32(buffer: Buffer): number {
  return zlib.crc32(buffer);
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

/** Düz beyaz bir PNG üretir — gerçek metin İÇERMEZ, yalnız boru hattını (decode → OCR) test eder. */
function createBlankTestPng(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 0; // color type: grayscale
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk('IHDR', ihdrData);

  const rawRow = Buffer.alloc(1 + width, 0xff); // filter byte 0 + white pixels
  rawRow[0] = 0;
  const raw = Buffer.concat(Array.from({ length: height }, () => rawRow));
  const idat = chunk('IDAT', zlib.deflateSync(raw));

  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

async function main() {
  const testImage = createBlankTestPng(200, 80);

  const firstCallStartedAt = Date.now();
  const result = await tesseractEngine.recognize({ buffer: testImage, mimeType: 'image/png' });
  const firstCallDurationMs = Date.now() - firstCallStartedAt;

  assert.equal(result.engine, 'tesseract');
  assert.equal(typeof result.text, 'string');
  assert.equal(typeof result.confidence, 'number');
  assert.equal(typeof result.durationMs, 'number');
  assert.equal(typeof result.memoryDeltaBytes, 'number');
  assert.ok(result.durationMs > 0, 'durationMs ölçülmeli (> 0)');

  // İkinci çağrı: worker ZATEN kurulu (singleton) — ilk çağrıdan belirgin
  // şekilde hızlı olmalı (dil verisi tekrar okunmaz, WASM yeniden kurulmaz).
  const secondCallStartedAt = Date.now();
  const secondResult = await tesseractEngine.recognize({ buffer: testImage, mimeType: 'image/png' });
  const secondCallDurationMs = Date.now() - secondCallStartedAt;

  assert.ok(
    secondCallDurationMs < firstCallDurationMs,
    `ikinci çağrı (${secondCallDurationMs}ms) ilk çağrıdan (${firstCallDurationMs}ms) hızlı olmalı (worker yeniden kurulmuyor)`,
  );

  console.log(
    `TESSERACT_ENGINE_SMOKE_OK — ilk çağrı (worker kurulumu DAHİL): ${firstCallDurationMs}ms, ` +
      `ikinci çağrı (worker hazır): ${secondCallDurationMs}ms, ` +
      `bellek farkı (ilk çağrı, yaklaşık): ${Math.round(result.memoryDeltaBytes / 1024 / 1024)}MB`,
  );

  void secondResult;
  process.exit(0);
}

void main();
