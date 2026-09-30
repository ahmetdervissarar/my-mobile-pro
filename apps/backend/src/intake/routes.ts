/**
 * RafSkoru — Intake uç noktaları
 * apps/backend/src/intake/routes.ts
 *
 * Bu router yalnızca db.ts/volunteers.ts'in dışa açtığı fonksiyonları
 * çağırır — hiçbir yerde doğrudan SQL yazmaz (bkz. db.ts başlık yorumu).
 */
import express, { Router } from 'express';

import { requireVolunteerAuth } from './auth.js';
import { getIntakePhotosDir, getIntakeVolunteersFilePath } from './config.js';
import {
  INTAKE_CATEGORIES,
  INTAKE_CITIES,
  INTAKE_MARKET_CHAINS,
  INTAKE_PHOTO_SLOTS,
  isKnownCategory,
  isKnownCity,
  isKnownMarketChain,
} from './constants.js';
import { createSubmission, DuplicateBarcodeError, getSubmissionById, markSlotReceived } from './db.js';
import { evaluateBarcodeLookup, type IntakePhotoSlot } from './lookup.js';
import { savePhoto } from './photoStorage.js';
import { validatePhotoUpload } from './photoValidation.js';
import { createRateLimiter, keyByVolunteerOrIp } from './rateLimit.js';
import { verifyVolunteer } from './volunteers.js';

const PHOTO_SLOTS: IntakePhotoSlot[] = ['front', 'ingredients', 'nutrition'];

export function createIntakeRouter(): Router {
  const router = Router();
  const volunteersFilePath = getIntakeVolunteersFilePath();
  const photosDir = getIntakePhotosDir();
  const volunteerAuth = requireVolunteerAuth({ volunteersFilePath });

  // Giriş denemesi kaba kuvvetine karşı IP başına sınır (henüz kimlik
  // doğrulanmadığı için gönüllü koduna göre anahtarlanamaz).
  const authRateLimit = createRateLimiter({ windowMs: 60_000, max: 10, keyFor: (req) => req.ip ?? 'unknown' });
  // Yazma uç noktaları: gönüllü başına dakikada 30 istek — 200-400
  // ürün/gün · 10-15 gönüllü ölçeğinde bolca pay bırakır, yalnızca
  // döngü hatası/kötüye kullanımı durdurur (bkz. görev onayı, madde 2).
  const writeRateLimit = createRateLimiter({ windowMs: 60_000, max: 30, keyFor: keyByVolunteerOrIp });

  router.get('/meta', (_req, res) => {
    res.json({
      ok: true,
      marketChains: INTAKE_MARKET_CHAINS,
      cities: INTAKE_CITIES,
      categories: INTAKE_CATEGORIES,
      photoSlots: INTAKE_PHOTO_SLOTS,
    });
  });

  // Girişte anlık geri bildirim için — yazma uç noktaları yine de kendi
  // requireVolunteerAuth kontrolünü ayrıca yapar (bkz. auth.ts).
  router.post('/auth/verify', authRateLimit, (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';

    if (!verifyVolunteer(volunteersFilePath, code, key)) {
      res.status(401).json({ ok: false, error: 'invalid_volunteer_credentials' });
      return;
    }

    res.json({ ok: true, volunteerCode: code });
  });

  router.get('/auth/ping', volunteerAuth, (req, res) => {
    res.json({ ok: true, volunteerCode: req.intakeVolunteerCode });
  });

  router.get('/lookup', volunteerAuth, (req, res) => {
    const barcode = typeof req.query.barcode === 'string' ? req.query.barcode.trim() : '';

    if (!barcode) {
      res.status(400).json({ ok: false, error: 'missing_barcode' });
      return;
    }

    const result = evaluateBarcodeLookup(barcode);

    if (result.status === 'invalid_gtin') {
      res.status(400).json({ ok: false, error: 'invalid_gtin' });
      return;
    }

    res.json({ ok: true, ...result });
  });

  router.post('/submissions', volunteerAuth, writeRateLimit, (req, res) => {
    const volunteerCode = req.intakeVolunteerCode!;
    const barcode = typeof req.body?.barcode === 'string' ? req.body.barcode.trim() : '';
    const marketChain = typeof req.body?.marketChain === 'string' ? req.body.marketChain.trim() : '';
    const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
    const clientCreatedAt =
      typeof req.body?.clientCreatedAt === 'string' ? req.body.clientCreatedAt : new Date().toISOString();

    if (!isKnownMarketChain(marketChain) || !isKnownCity(city) || !isKnownCategory(category)) {
      res.status(400).json({ ok: false, error: 'invalid_metadata' });
      return;
    }

    const lookupResult = evaluateBarcodeLookup(barcode);

    if (lookupResult.status === 'invalid_gtin') {
      res.status(400).json({ ok: false, error: 'invalid_gtin' });
      return;
    }

    if (lookupResult.status === 'duplicate') {
      res.status(409).json({
        ok: false,
        error: 'duplicate_barcode',
        collectedAt: lookupResult.collectedAt,
        volunteerCode: lookupResult.volunteerCode,
      });
      return;
    }

    if (lookupResult.status === 'complete') {
      res.status(409).json({ ok: false, error: 'already_complete' });
      return;
    }

    try {
      const submission = createSubmission({
        barcode,
        volunteerCode,
        marketChain,
        city,
        category,
        status: lookupResult.status,
        requestedSlots: lookupResult.neededSlots,
        clientCreatedAt,
      });

      res.status(201).json({ ok: true, submissionId: submission.id, requestedSlots: submission.requestedSlots });
    } catch (err) {
      // Yarış durumu: iki gönüllü aynı barkodu ~aynı anda gönderdi — barkod
      // UNIQUE kısıtlaması ikinci INSERT'i burada yakalar (bkz. db.ts).
      if (err instanceof DuplicateBarcodeError) {
        res.status(409).json({ ok: false, error: 'duplicate_barcode' });
        return;
      }
      throw err;
    }
  });

  router.put(
    '/submissions/:id/photos/:slot',
    volunteerAuth,
    writeRateLimit,
    express.raw({ type: () => true, limit: '8mb' }),
    (req, res) => {
      const id = String(req.params.id);
      const slot = String(req.params.slot);

      if (!PHOTO_SLOTS.includes(slot as IntakePhotoSlot)) {
        res.status(400).json({ ok: false, error: 'invalid_slot' });
        return;
      }

      const submission = getSubmissionById(id);
      if (!submission) {
        res.status(404).json({ ok: false, error: 'submission_not_found' });
        return;
      }

      if (!submission.requestedSlots.includes(slot)) {
        res.status(400).json({ ok: false, error: 'slot_not_requested' });
        return;
      }

      const buffer = req.body;
      if (!Buffer.isBuffer(buffer)) {
        res.status(400).json({ ok: false, error: 'invalid_body' });
        return;
      }

      // Content-Type başlığına GÜVENİLMEZ — kabul kararı yalnızca magic
      // bytes'a dayanır (bkz. photoValidation.ts, görev onayı madde 2).
      const validation = validatePhotoUpload(buffer);
      if (!validation.ok) {
        res.status(400).json({ ok: false, error: validation.error });
        return;
      }

      savePhoto(photosDir, id, slot, buffer, validation.type);
      const updated = markSlotReceived(id, slot);

      res.json({ ok: true, receivedSlots: updated?.receivedSlots ?? [] });
    },
  );

  return router;
}

/** initIntakeDb() başarısız olduğunda index.ts bunu /api/intake/* için kullanır. */
export function createIntakeUnavailableRouter(reason: string): Router {
  const router = Router();
  router.use((_req, res) => {
    res.status(503).json({ ok: false, error: 'intake_unavailable', message: reason });
  });
  return router;
}
