/**
 * RafSkoru — Intake uç noktaları
 * apps/backend/src/intake/routes.ts
 *
 * Bu router yalnızca db.ts/volunteers.ts'in dışa açtığı fonksiyonları
 * çağırır — hiçbir yerde doğrudan SQL yazmaz (bkz. db.ts başlık yorumu).
 */
import { Router } from 'express';

import { requireVolunteerAuth } from './auth.js';
import { getIntakeVolunteersFilePath } from './config.js';
import { verifyVolunteer } from './volunteers.js';

export function createIntakeRouter(): Router {
  const router = Router();
  const volunteersFilePath = getIntakeVolunteersFilePath();

  // Girişte anlık geri bildirim için — yazma uç noktaları yine de kendi
  // requireVolunteerAuth kontrolünü ayrıca yapar (bkz. auth.ts).
  router.post('/auth/verify', (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';

    if (!verifyVolunteer(volunteersFilePath, code, key)) {
      res.status(401).json({ ok: false, error: 'invalid_volunteer_credentials' });
      return;
    }

    res.json({ ok: true, volunteerCode: code });
  });

  router.get('/auth/ping', requireVolunteerAuth({ volunteersFilePath }), (req, res) => {
    res.json({ ok: true, volunteerCode: req.intakeVolunteerCode });
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
