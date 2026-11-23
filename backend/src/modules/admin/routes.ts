// Modul admin (P4, ADMIN): ringkasan periode berjalan dan hal yang perlu perhatian, serta antrean
// job on-chain dengan Coba lagi. Ringkasan rekonsiliasi milik modul reconciliation (jalur 1).
import { Router } from 'express';
import { AppError } from '../../lib/errors.js';
import { isOpenFailure, loadJobStates } from '../../lib/job-status.js';
import { prisma } from '../../lib/prisma.js';
import { isUuid } from '../../lib/uuid.js';
import { noNulCharacter, z } from '../../lib/zod.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { createUserRateLimiter } from '../../middleware/rate-limit.js';
import { recordedTotals } from '../periods/receipt.js';
import { loadExpenseRecords, loadRentRecords } from '../periods/records.js';
import { loadPeriodStatus } from '../periods/service.js';
import { currentPeriodOf, resolveProperty } from '../periods/state.js';
import { filterJobs, loadAdminJobs, resolveJob, retryJob } from './jobs.js';

const retryLimiter = createUserRateLimiter({ limit: 30 });

const jobsQuerySchema = z.object({ view: z.enum(['open', 'all']).default('open') });
const resolveSchema = z.object({
  note: z.string().trim().min(5).max(300).refine(noNulCharacter.check, noNulCharacter.message),
});
const summaryQuerySchema = z.object({ property: z.string().trim().min(1).max(20).optional() });

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/summary', async (req, res) => {
  const property = await resolveProperty(summaryQuerySchema.parse(req.query).property);
  const period = await currentPeriodOf(property.id);

  let currentPeriod = null;
  if (period) {
    const { rents } = await loadRentRecords(prisma, property.id, period);
    const expenses = await loadExpenseRecords(prisma, property.id, period);
    const totals = recordedTotals(rents, expenses);
    currentPeriod = {
      period,
      status: await loadPeriodStatus(property.id, period),
      roomsRecorded: totals.roomsRecorded,
      roomsTotal: totals.roomsTotal,
      // Biaya yang sudah tercatat on-chain.
      expensesIdr: Number(totals.expensesIdr),
    };
  }

  const [kycSubmitted, anomaliesOpen, refundsPending, jobs] = await Promise.all([
    prisma.kycSubmission.count({ where: { status: 'SUBMITTED' } }),
    // Anomali belum punya status selesai di prototipe, jadi semuanya dihitung terbuka.
    prisma.paymentAnomaly.count(),
    // Sewa yang terbayar setelah periodenya ditutup: dananya perlu dikembalikan.
    prisma.payment.count({ where: { status: 'PAID_AFTER_CLOSE' } }),
    prisma.outboxJob.findMany({ select: { id: true } }),
  ]);
  const states = [...(await loadJobStates(prisma, jobs.map((job) => job.id))).values()];

  res.json({
    data: {
      currentPeriod,
      attention: {
        kycSubmitted,
        // Job gagal yang sudah ditandai ditangani tidak dihitung.
        jobsFailed: states.filter(isOpenFailure).length,
        jobsPending: states.filter((state) => state.status === 'QUEUED' || state.status === 'PENDING').length,
        anomaliesOpen,
        refundsPending,
      },
    },
  });
});

router.get('/jobs', async (req, res) => {
  const { view } = jobsQuerySchema.parse(req.query);
  const jobs = await loadAdminJobs();
  const open = filterJobs(jobs, 'open');
  res.json({ data: { jobs: view === 'all' ? jobs : open, counts: { open: open.length, all: jobs.length } } });
});

router.post('/jobs/:id/retry', retryLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new AppError(404, 'NOT_FOUND', 'Job tidak ditemukan.');
  const job = await retryJob(id, currentUser(req).id);
  res.status(202).json({ data: { job } });
});

router.post('/jobs/:id/resolve', retryLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new AppError(404, 'NOT_FOUND', 'Job tidak ditemukan.');
  const { note } = resolveSchema.parse(req.body ?? {});
  const job = await resolveJob(id, currentUser(req).id, note);
  res.json({ data: { job } });
});

export default router;
