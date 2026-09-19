/**
 * RafSkoru — `rn-mlkit-ocr` sonucunu `OcrRunResult`'a eşleyen saf mantık (Aşama 7, ADR-006).
 * src/localProduct/ocr/mapMlkitResult.ts
 *
 * `rn-mlkit-ocr` paketini İÇE AKTARMAZ (I/O yok); yalnız yapısal veriyle çalışır. Bu ayrım,
 * eşleme mantığının native modül/Expo Go olmadan (düz Node, `runOcrEngineScenarios.ts`) test
 * edilebilmesini sağlar — `mlKitOcrEngine.ts` bu dosyayı kullanır, tersi değil.
 */

export interface MlkitFrameLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MlkitLineLike {
  text: string;
  frame?: MlkitFrameLike | null;
}

export interface MlkitBlockLike {
  text: string;
  frame?: MlkitFrameLike | null;
  lines?: readonly MlkitLineLike[];
}

export interface MlkitResultLike {
  text?: string;
  blocks?: readonly MlkitBlockLike[];
}

import type { OcrBlock, OcrLine, OcrRunResult, OcrRunStatus } from './types';

export function mapMlkitBlocks(blocks: readonly MlkitBlockLike[] | undefined): OcrBlock[] {
  if (!blocks) return [];
  return blocks.map((block) => ({
    text: block.text,
    frame: block.frame ?? null,
    lines: (block.lines ?? []).map((line): OcrLine => ({ text: line.text, frame: line.frame ?? null })),
  }));
}

export interface MapMlkitResultBase {
  field: OcrRunResult['field'];
  photoEvidenceId: string;
  capturedAt: string;
  engineVersion: string;
  recognizedAt: string;
}

export function mapMlkitResult(result: MlkitResultLike | null | undefined, base: MapMlkitResultBase): OcrRunResult {
  const rawText = (result?.text ?? '').trim();
  const status: OcrRunStatus = rawText ? 'candidate' : 'no_text';
  return {
    field: base.field,
    status,
    rawText: rawText || null,
    blocks: mapMlkitBlocks(result?.blocks),
    engine: 'mlkit_latin',
    engineVersion: base.engineVersion,
    photoEvidenceId: base.photoEvidenceId,
    capturedAt: base.capturedAt,
    recognizedAt: base.recognizedAt,
    source: 'user_ocr',
    verificationLevel: 'unverified',
    confidence: 'low',
    errorMessage: null,
  };
}

export function mapMlkitFailure(base: MapMlkitResultBase, errorMessage: string): OcrRunResult {
  return {
    field: base.field,
    status: 'failed',
    rawText: null,
    blocks: [],
    engine: 'mlkit_latin',
    engineVersion: base.engineVersion,
    photoEvidenceId: base.photoEvidenceId,
    capturedAt: base.capturedAt,
    recognizedAt: base.recognizedAt,
    source: 'user_ocr',
    verificationLevel: 'unverified',
    confidence: 'low',
    errorMessage,
  };
}
