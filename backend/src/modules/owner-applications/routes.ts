// Modul owner-applications: form pengajuan kos dari halaman publik /pemilik.
import { Router } from 'express';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { prisma } from '../../lib/prisma.js';
import { wibYear } from '../../lib/wib.js';
import { validationError } from '../../middleware/error-handler.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';
import { formatApplicationNumber, ownerApplicationSchema } from './schema.js';

const applicationLimiter = createRateLimiter({ limit: 10 });

const router = Router();

router.post('/', applicationLimiter, async (req, res) => {
  const parsed = ownerApplicationSchema.safeParse(req.body);
  if (!parsed.success) throw validationError(parsed.error, 422);

  const { consent: _consent, ...fields } = parsed.data;
  const year = wibYear(new Date());

  // Kunci per tahun, supaya dua pengajuan bersamaan tidak mendapat nomor yang sama.
  const application = await withAdvisoryLock(`owner-application:${year}`, async (tx) => {
    const { _max } = await tx.ownerApplication.aggregate({ where: { year }, _max: { sequence: true } });
    const sequence = (_max.sequence ?? 0) + 1;
    return tx.ownerApplication.create({
      data: { ...fields, year, sequence, applicationNumber: formatApplicationNumber(year, sequence) },
    });
  });

  res.status(201).json({
    data: {
      applicationNumber: application.applicationNumber,
      status: application.status,
      submittedAt: application.submittedAt,
    },
  });
});

export default router;
