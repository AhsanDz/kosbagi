// Modul periods (ADMIN): status dan struk satu periode, tutup periode, dan distribusi bagi hasil.
// Properti bawaan adalah properti pertama; ?property=SMR01 memilih properti lain.
import { Router } from 'express';
import { z } from '../../lib/zod.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { createUserRateLimiter } from '../../middleware/rate-limit.js';
import { chainAccess } from './chain.js';
import { loadPeriodView, requestClose, runDistribution } from './service.js';
import { periodSchema, resolveProperty } from './state.js';

// Tutup periode dan distribusi jarang ditekan; batas ini hanya menahan klik beruntun.
const actionLimiter = createUserRateLimiter({ limit: 10 });

const paramsSchema = z.object({ period: periodSchema });
const querySchema = z.object({ property: z.string().trim().min(1).max(20).optional() });

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/:period', async (req, res) => {
  const { period } = paramsSchema.parse(req.params);
  const property = await resolveProperty(querySchema.parse(req.query).property);
  res.json({ data: await loadPeriodView(property, period, () => chainAccess.reader()) });
});

router.post('/:period/close', actionLimiter, async (req, res) => {
  const { period } = paramsSchema.parse(req.params);
  const property = await resolveProperty(querySchema.parse(req.query).property);
  await requestClose(property, period, currentUser(req).id);
  res.status(202).json({ data: await loadPeriodView(property, period, () => chainAccess.reader()) });
});

router.post('/:period/distribute', actionLimiter, async (req, res) => {
  const { period } = paramsSchema.parse(req.params);
  const property = await resolveProperty(querySchema.parse(req.query).property);
  const distribution = await runDistribution(property, period, currentUser(req).id, () => chainAccess.reader());
  res.json({ data: { distribution } });
});

export default router;
