/**
 * RafSkoru — Intake oran sınırlama
 * apps/backend/src/intake/rateLimit.ts
 *
 * Paketsiz, bellek-içi sabit pencere sayaç (bkz. görev onayı — yeni paket
 * eklenmedi). 10-15 gönüllü, günde birkaç yüz istek ölçeğinde bu yeterli;
 * amaç kötüye kullanım/döngü hatasını durdurmak, gerçek kullanımı
 * kısıtlamak değil.
 */
import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  windowStartedAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** İstek başına anahtar — ör. gönüllü kodu (auth sonrası) veya IP (auth öncesi). */
  keyFor: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = options.keyFor(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStartedAt >= options.windowMs) {
      buckets.set(key, { count: 1, windowStartedAt: now });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return;
    }

    bucket.count += 1;
    next();
  };
}

/** Yalnız testler için — pencere sayaçlarını paylaşan üretim limiter'ları etkilemez (her createRateLimiter kendi Map'ini tutar). */
export function keyByVolunteerOrIp(req: Request): string {
  return req.intakeVolunteerCode ?? req.ip ?? 'unknown';
}
