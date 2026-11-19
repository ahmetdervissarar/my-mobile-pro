/**
 * RafSkoru — Etiket onay ekranı uç noktaları (ADR-009 §3, İş 1.5a)
 * apps/backend/src/labelStore/reviewRoutes.ts
 *
 * /api/label-review altında, yalnız yönetici anahtarıyla (INTAKE_ADMIN_KEY,
 * x-intake-admin-key başlığı) çalışır. Uygulama kullanıcıları bu uçlara
 * erişmez. Onay yalnız bir insanın isteğiyle verilir; bu router kendiliğinden
 * hiçbir adayı onaylamaz veya reddetmez.
 *
 * Fotoğraflar adayın kendi fotoğraf listesinden SIRA NUMARASIYLA sunulur;
 * istemciden serbest dosya yolu kabul edilmez. Günlüğe alan değeri yazılmaz.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';

import express, { Router, type Response } from 'express';

import { getCatalog } from '../catalog/catalog.js';
import { requireAdminAuth } from '../intake/auth.js';
import { getLabelStoreDataDir } from './config.js';
import {
  approveCandidate,
  getCandidate,
  getCurrentVerified,
  isLabelStoreDbReady,
  LabelCandidateNotFoundError,
  LabelStoreStateError,
  LabelStoreValidationError,
  listCandidatesByStatus,
  rejectCandidate,
} from './db.js';
import {
  LABEL_REJECT_REASONS,
  LABEL_REVIEW_PRODUCT_KINDS,
  labelReviewFlags,
  parseApproveRequest,
  parseRejectRequest,
} from './review.js';
import type { LabelCandidate, LabelCandidateStatus } from './types.js';

const LIST_STATUSES: Record<string, LabelCandidateStatus[]> = {
  pending: ['agreed', 'disagreed'],
  agreed: ['agreed'],
  disagreed: ['disagreed'],
  approved: ['approved'],
  rejected: ['rejected'],
};

const PHOTO_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export interface CreateLabelReviewRouterOptions {
  /**
   * Fotoğraf göstergelerinin (photos[].ref) göreli olduğu kök dizin.
   * Varsayılan: apps/backend/data/ (ref ör. "label-store/off/..." veya
   * "intake/photos/..."). Yalnız testler değiştirir.
   */
  photoRootDir?: string;
}

function productNameOf(candidate: LabelCandidate): string | null {
  return candidate.extractRead?.fields.productName ?? candidate.verifyRead?.fields.productName ?? null;
}

function brandOf(candidate: LabelCandidate): string | null {
  return candidate.extractRead?.fields.brand ?? candidate.verifyRead?.fields.brand ?? null;
}

function sendError(res: Response, err: unknown): void {
  if (err instanceof LabelCandidateNotFoundError) {
    res.status(404).json({ ok: false, error: 'candidate_not_found' });
    return;
  }
  if (err instanceof LabelStoreStateError) {
    res.status(409).json({ ok: false, error: 'invalid_state', message: err.message });
    return;
  }
  if (err instanceof LabelStoreValidationError) {
    res.status(400).json({ ok: false, error: 'validation', message: err.message });
    return;
  }
  // Ayrıntı (alan değeri içerebilir) günlüğe yazılmaz; yalnız hata türü.
  console.error(`[label-review] beklenmeyen hata: ${(err as Error)?.name ?? 'Error'}`);
  res.status(500).json({ ok: false, error: 'internal_error' });
}

export function createLabelReviewRouter(options: CreateLabelReviewRouterOptions = {}): Router {
  const router = Router();
  const photoRootDir = resolve(options.photoRootDir ?? dirname(getLabelStoreDataDir()));

  router.use(requireAdminAuth);
  router.use(express.json({ limit: '200kb' }));
  router.use((_req, res, next) => {
    if (!isLabelStoreDbReady()) {
      res.status(503).json({ ok: false, error: 'label_store_unavailable' });
      return;
    }
    next();
  });

  router.get('/meta', (_req, res) => {
    res.json({ ok: true, productKinds: LABEL_REVIEW_PRODUCT_KINDS, rejectReasons: LABEL_REJECT_REASONS });
  });

  router.get('/candidates', (req, res) => {
    const statusKey = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const statuses = LIST_STATUSES[statusKey];
    if (!statuses) {
      res.status(400).json({ ok: false, error: 'invalid_status' });
      return;
    }

    const catalog = getCatalog();
    const candidates = statuses
      .flatMap((status) => listCandidatesByStatus(status, 500))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((candidate) => ({
        id: candidate.id,
        barcode: candidate.barcode,
        status: candidate.status,
        photoSource: candidate.photoSource,
        observedAt: candidate.observedAt,
        createdAt: candidate.createdAt,
        productName: productNameOf(candidate),
        brand: brandOf(candidate),
        differingFields: candidate.differingFields ?? [],
        flagCodes: labelReviewFlags(candidate).map((flag) => flag.code),
        inOffCatalog: catalog.byId.has(candidate.barcode),
        decidedBy: candidate.decidedBy,
        decidedAt: candidate.decidedAt,
        rejectionReason: candidate.rejectionReason,
      }));

    res.json({ ok: true, candidates });
  });

  router.get('/candidates/:id', (req, res) => {
    try {
      const candidate = getCandidate(String(req.params.id));
      if (!candidate) throw new LabelCandidateNotFoundError(String(req.params.id));

      const offProduct = getCatalog().byId.get(candidate.barcode) ?? null;
      const current = getCurrentVerified(candidate.barcode);

      res.json({
        ok: true,
        candidate,
        flags: labelReviewFlags(candidate),
        photos: candidate.photos.map((photo, index) => ({
          index,
          slot: photo.slot,
          attribution: photo.attribution,
        })),
        offCatalog: offProduct ? { name: offProduct.name, brand: offProduct.brand } : null,
        currentVerified: current
          ? { version: current.version, approvedAt: current.approvedAt, approvedBy: current.approvedBy, candidateId: current.candidateId }
          : null,
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/candidates/:id/photos/:index', (req, res) => {
    const candidate = getCandidate(String(req.params.id));
    if (!candidate) {
      res.status(404).json({ ok: false, error: 'candidate_not_found' });
      return;
    }

    const index = Number(req.params.index);
    const photo = Number.isInteger(index) ? candidate.photos[index] : undefined;
    if (!photo) {
      res.status(404).json({ ok: false, error: 'photo_not_found' });
      return;
    }

    // Gösterge yalnız kök dizinin İÇİNDE bir resim dosyasına çözülebilir.
    const filePath = resolve(photoRootDir, photo.ref);
    const contentType = PHOTO_CONTENT_TYPES[extname(filePath).toLowerCase()];
    if (!filePath.startsWith(photoRootDir + sep) || !contentType) {
      res.status(400).json({ ok: false, error: 'invalid_photo_ref' });
      return;
    }
    if (!existsSync(filePath)) {
      res.status(404).json({ ok: false, error: 'photo_file_missing' });
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(readFileSync(filePath));
  });

  router.post('/candidates/:id/approve', (req, res) => {
    try {
      const candidate = getCandidate(String(req.params.id));
      if (!candidate) throw new LabelCandidateNotFoundError(String(req.params.id));

      const parsed = parseApproveRequest(req.body, candidate);
      const verified = approveCandidate(candidate.id, parsed);
      console.log(`[label-review] onaylandı sürüm=${verified.version}`);
      res.json({ ok: true, verified });
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post('/candidates/:id/reject', (req, res) => {
    try {
      const parsed = parseRejectRequest(req.body);
      const rejected = rejectCandidate(String(req.params.id), parsed);
      console.log('[label-review] reddedildi');
      res.json({ ok: true, candidate: rejected });
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}
