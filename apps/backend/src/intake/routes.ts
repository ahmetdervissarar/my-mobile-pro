/**
 * RafSkoru — Intake uç noktaları
 * apps/backend/src/intake/routes.ts
 *
 * Bu router yalnızca db.ts/volunteers.ts'in dışa açtığı fonksiyonları
 * çağırır — hiçbir yerde doğrudan SQL yazmaz (bkz. db.ts başlık yorumu).
 */
import { existsSync, readFileSync } from 'node:fs';

import express, { Router } from 'express';

import { getCatalog } from '../catalog/catalog.js';
import { requireAdminAuth, requireVolunteerAuth } from './auth.js';
import { getIntakePhotosDir, getIntakeVolunteersFilePath } from './config.js';
import {
  INTAKE_CATEGORIES,
  INTAKE_CITIES,
  INTAKE_MARKET_CHAINS,
  INTAKE_PHOTO_SLOTS,
  isKnownCategory,
  isKnownCity,
  isKnownMarketChain,
  isValidLocalMarketName,
  LOCAL_MARKET_CHAIN_KEY,
} from './constants.js';
import { buildCsv } from './csv.js';
import {
  createSubmission,
  DuplicateBarcodeError,
  getAdminStats,
  getAllSubmissionsForExport,
  getPendingSubmissions,
  getRecentSubmissions,
  getSubmissionById,
  getTotalSubmissionCount,
  getVolunteerProgress,
  markSlotReceived,
} from './db.js';
import { evaluateBarcodeLookup, type IntakePhotoSlot } from './lookup.js';
import { savePhoto } from './photoStorage.js';
import { validatePhotoUpload } from './photoValidation.js';
import { createRateLimiter, keyByVolunteerOrIp } from './rateLimit.js';
import { verifyVolunteer } from './volunteers.js';

const PHOTO_SLOTS: IntakePhotoSlot[] = ['front', 'ingredients', 'nutrition'];
/** submissionId (UUID) + '-' + slot + uzantı — istemciden gelen serbest bir yol DEĞİL. */
const PHOTO_FILENAME_PATTERN = /^[0-9a-f-]+-(front|ingredients|nutrition)\.(jpg|png)$/;

export interface CreateIntakeRouterOptions {
  /** Yalnız testler için — production'da her zaman config.ts'in gerçek yolu kullanılır. */
  photosDir?: string;
}

export function createIntakeRouter(options: CreateIntakeRouterOptions = {}): Router {
  const router = Router();
  const volunteersFilePath = getIntakeVolunteersFilePath();
  const photosDir = options.photosDir ?? getIntakePhotosDir();
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

    const result = evaluateBarcodeLookup(barcode, req.intakeVolunteerCode!);

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
    const marketChainOtherRaw = typeof req.body?.marketChainOther === 'string' ? req.body.marketChainOther.trim() : '';
    const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
    const clientCreatedAt =
      typeof req.body?.clientCreatedAt === 'string' ? req.body.clientCreatedAt : new Date().toISOString();

    if (!isKnownMarketChain(marketChain) || !isKnownCity(city) || !isKnownCategory(category)) {
      res.status(400).json({ ok: false, error: 'invalid_metadata' });
      return;
    }

    // "yerel" seçilmişse serbest ad ZORUNLU ve kurallara uymalı; başka HİÇBİR
    // kodla birlikte kaydedilmez — bu yüzden diğer zincirlerde alan doluysa da
    // reddedilir (bkz. görev onayı, madde: "başka hiçbir kodla birlikte
    // kaydedilmesin").
    if (marketChain === LOCAL_MARKET_CHAIN_KEY) {
      if (!isValidLocalMarketName(marketChainOtherRaw)) {
        res.status(400).json({ ok: false, error: 'invalid_local_market_name' });
        return;
      }
    } else if (marketChainOtherRaw) {
      res.status(400).json({ ok: false, error: 'invalid_metadata' });
      return;
    }

    const marketChainOther = marketChain === LOCAL_MARKET_CHAIN_KEY ? marketChainOtherRaw : null;

    const lookupResult = evaluateBarcodeLookup(barcode, volunteerCode);

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
        marketChainOther,
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

      // Bir gönüllü başka bir gönüllünün kaydına fotoğraf yükleyemez —
      // volunteerAuth yalnız KİMLİĞİ doğrular, bu kaydın SAHİBİ olduğunu
      // doğrulamaz (bkz. görev onayı, madde 4a).
      if (submission.volunteerCode !== req.intakeVolunteerCode) {
        res.status(403).json({ ok: false, error: 'not_submission_owner' });
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

  router.get('/progress', volunteerAuth, (req, res) => {
    const { today, total } = getVolunteerProgress(req.intakeVolunteerCode!);
    res.json({ ok: true, today, total, totalAll: getTotalSubmissionCount() });
  });

  router.get('/admin/stats', requireAdminAuth, (_req, res) => {
    res.json({ ok: true, stats: getAdminStats() });
  });

  router.get('/admin/pending', requireAdminAuth, (_req, res) => {
    res.json({ ok: true, submissions: getPendingSubmissions() });
  });

  /**
   * Yönetici paneli "son kayıtlar" listesi. Fotoğraf dosya adları
   * diskten çözülür (uzantı, yüklenen görüntü türüne göre değişir —
   * veritabanında saklanmaz, bkz. photoStorage.ts). Katalogda varsa ürün
   * adı eklenir (yeni bir karar üretmez — yalnız mevcut katalog lookup'ı).
   * Fotoğrafların KENDİSİ bu uç noktada DÖNMEZ — yalnız dosya adı; gerçek
   * görüntü hâlâ /admin/photos/:filename üzerinden (aynı admin anahtarıyla)
   * ayrıca çekilir.
   */
  router.get('/admin/recent', requireAdminAuth, (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const catalog = getCatalog();

    const submissions = getRecentSubmissions(limit).map((submission) => {
      const photos = submission.receivedSlots.map((slot) => {
        const jpgPath = `${photosDir}/${submission.id}-${slot}.jpg`;
        const pngPath = `${photosDir}/${submission.id}-${slot}.png`;
        const filename = existsSync(jpgPath)
          ? `${submission.id}-${slot}.jpg`
          : existsSync(pngPath)
            ? `${submission.id}-${slot}.png`
            : null;
        return { slot, filename };
      });

      return {
        id: submission.id,
        barcode: submission.barcode,
        productName: catalog.byId.get(submission.barcode)?.name ?? null,
        volunteerCode: submission.volunteerCode,
        marketChain: submission.marketChain,
        marketChainOther: submission.marketChainOther,
        city: submission.city,
        category: submission.category,
        createdAt: submission.createdAt,
        // Terk edilmiş (barkodu yeniden açılmış) kayıtlar listeden gizlenmez —
        // yalnız bu alanla işaretlenir (bkz. görev onayı, madde 4b).
        abandonedAt: submission.abandonedAt,
        photos,
      };
    });

    res.json({ ok: true, submissions });
  });

  // Dosya adı yalnızca submissionId+slot'tan türetilmiş olabilir (bkz.
  // PHOTO_FILENAME_PATTERN) — istemciden serbest bir yol asla kabul edilmez.
  router.get('/admin/photos/:filename', requireAdminAuth, (req, res) => {
    const filename = String(req.params.filename);

    if (!PHOTO_FILENAME_PATTERN.test(filename)) {
      res.status(400).json({ ok: false, error: 'invalid_filename' });
      return;
    }

    const filePath = `${photosDir}/${filename}`;
    if (!existsSync(filePath)) {
      res.status(404).json({ ok: false, error: 'photo_not_found' });
      return;
    }

    res.setHeader('Content-Type', filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
    res.send(readFileSync(filePath));
  });

  router.get('/admin/export.csv', requireAdminAuth, (_req, res) => {
    const rows = getAllSubmissionsForExport().map((submission) => [
      submission.barcode,
      submission.volunteerCode,
      submission.marketChain,
      submission.marketChainOther ?? '',
      submission.city,
      submission.category,
      submission.status,
      submission.requestedSlots.join('|'),
      submission.receivedSlots.join('|'),
      submission.createdAt,
      submission.clientCreatedAt,
      submission.abandonedAt ?? '',
    ]);
    const csv = buildCsv(
      [
        'barcode',
        'volunteer_code',
        'market_chain',
        'market_chain_other',
        'city',
        'category',
        'status',
        'requested_slots',
        'received_slots',
        'created_at',
        'client_created_at',
        'abandoned_at',
      ],
      rows,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="intake-export.csv"');
    res.send(csv);
  });

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
