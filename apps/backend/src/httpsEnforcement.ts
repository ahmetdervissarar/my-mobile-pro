/**
 * RafSkoru — production'da HTTPS zorunluluğu
 * apps/backend/src/httpsEnforcement.ts
 *
 * Intake modülü gönüllü anahtarı (kimlik doğrulama başlığı) ve ürün
 * fotoğraflarını taşır — düz HTTP üzerinden bunlar şifresiz dolaşır
 * (bkz. görev onayı, madde 4c). Backend genelde bir ters vekil (nginx/
 * Caddy) arkasında TLS sonlandırılmış olarak çalışır; bu yüzden gerçek
 * bağlantının güvenliği `req.secure` (doğrudan TLS) YA DA vekilin
 * ilettiği `X-Forwarded-Proto: https` başlığıyla belirlenir — ikisi de
 * yoksa istek reddedilir.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function isSecureRequest(req: Request): boolean {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

/** index.ts bunu yalnız NODE_ENV === 'production' iken takar — yerel/dev HTTP kalabilir. */
export function createHttpsEnforcementMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isSecureRequest(req)) {
      next();
      return;
    }

    res.status(403).json({ ok: false, error: 'https_required' });
  };
}
