/**
 * RafSkoru — Intake kimlik doğrulama
 * apps/backend/src/intake/auth.ts
 *
 * İki ayrı anahtar sınıfı (bkz. görev onayı, madde 3):
 *   - Gönüllü: kod + gönüllü başına anahtar (volunteers.ts, tek kişi
 *     kapatılabilir).
 *   - Yönetici: tek INTAKE_ADMIN_KEY ortam değişkeni, gönüllülerden ayrı.
 * Her iki yol da yalnızca özel HTTP başlıklarını okur (gövdeyi değil) —
 * böylece GET uç noktaları (lookup, progress) da kimlik doğrulayabilir ve
 * hiçbir yerde req.body/headers toptan loglanmaz. Başarısız denemelerde
 * DENENEN anahtar asla loglanmaz, yalnızca kod (gönüllü) veya "admin"
 * etiketi.
 */
import type { NextFunction, Request, Response } from 'express';

import { verifyVolunteer } from './volunteers.js';

export const VOLUNTEER_CODE_HEADER = 'x-intake-volunteer-code';
export const VOLUNTEER_KEY_HEADER = 'x-intake-volunteer-key';
export const ADMIN_KEY_HEADER = 'x-intake-admin-key';

export interface IntakeAuthContext {
  volunteersFilePath: string;
}

function headerValue(req: Request, name: string): string {
  const value = req.header(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function requireVolunteerAuth(context: IntakeAuthContext) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const code = headerValue(req, VOLUNTEER_CODE_HEADER);
    const key = headerValue(req, VOLUNTEER_KEY_HEADER);

    if (!verifyVolunteer(context.volunteersFilePath, code, key)) {
      console.warn(`[intake] gönüllü kimlik doğrulama reddedildi (kod: ${code || '(boş)'})`);
      res.status(401).json({ ok: false, error: 'invalid_volunteer_credentials' });
      return;
    }

    req.intakeVolunteerCode = code;
    next();
  };
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const provided = headerValue(req, ADMIN_KEY_HEADER);
  const expected = process.env.INTAKE_ADMIN_KEY?.trim();

  if (!expected) {
    console.warn('[intake] INTAKE_ADMIN_KEY tanımlı değil — panel uç noktaları kapalı.');
    res.status(503).json({ ok: false, error: 'admin_key_not_configured' });
    return;
  }

  if (!provided || provided !== expected) {
    console.warn('[intake] yönetici kimlik doğrulama reddedildi');
    res.status(401).json({ ok: false, error: 'invalid_admin_key' });
    return;
  }

  next();
}

declare global {
  namespace Express {
    interface Request {
      intakeVolunteerCode?: string;
    }
  }
}
