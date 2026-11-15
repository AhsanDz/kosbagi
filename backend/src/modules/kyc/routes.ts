// Modul kyc: pengajuan KYC dummy oleh investor dan peninjauan oleh admin. Tanpa UI di P2.
// Whitelist on-chain setelah disetujui ditambahkan di P3.
import { Router } from 'express';
import type { KycSubmission, Prisma, User } from '../../generated/prisma/client.js';
import { KycStatus } from '../../generated/prisma/enums.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';
import { isUuid } from '../../lib/uuid.js';
import { noNulCharacter, z } from '../../lib/zod.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';

const submissionSchema = z.object({
  fullName: z.string().trim().min(2).max(120).refine(noNulCharacter.check, noNulCharacter.message),
  dummyIdNumber: z
    .string()
    .trim()
    .regex(/^DUMMY-[A-Za-z0-9-]{1,40}$/, 'Nomor identitas harus berawalan DUMMY-. Jangan memakai nomor KTP asli.'),
});

const rejectionSchema = z.object({
  reason: z.string().trim().min(3).max(500).refine(noNulCharacter.check, noNulCharacter.message),
});

const listQuerySchema = z.object({ status: z.enum(KycStatus).optional() });

function toKycDto(submission: KycSubmission) {
  return {
    id: submission.id,
    fullName: submission.fullName,
    dummyIdNumber: submission.dummyIdNumber,
    status: submission.status,
    rejectionReason: submission.rejectionReason,
    submittedAt: submission.createdAt,
    reviewedAt: submission.reviewedAt,
  };
}

function toKycAdminDto(submission: KycSubmission & { user: Pick<User, 'id' | 'name' | 'email'> }) {
  return { ...toKycDto(submission), user: submission.user };
}

/** Peninjauan bersyarat status SUBMITTED, jadi dua admin tidak bisa meninjau pengajuan yang sama. */
async function reviewSubmission(id: string, data: Prisma.KycSubmissionUncheckedUpdateManyInput): Promise<KycSubmission> {
  if (!isUuid(id)) throw new AppError(404, 'NOT_FOUND', 'Pengajuan KYC tidak ditemukan.');

  const { count } = await prisma.kycSubmission.updateMany({ where: { id, status: 'SUBMITTED' }, data });
  const submission = await prisma.kycSubmission.findUnique({ where: { id } });
  if (!submission) throw new AppError(404, 'NOT_FOUND', 'Pengajuan KYC tidak ditemukan.');
  if (count === 0) throw new AppError(409, 'KYC_ALREADY_REVIEWED', 'Pengajuan ini sudah ditinjau.');
  return submission;
}

const router = Router();

router.post('/', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const body = submissionSchema.parse(req.body);
  try {
    const submission = await prisma.kycSubmission.create({ data: { ...body, userId: currentUser(req).id } });
    res.status(201).json({ data: { kyc: toKycDto(submission) } });
  } catch (error) {
    // Index unik parsial: sudah ada pengajuan yang diajukan atau disetujui.
    if (!isUniqueViolation(error)) throw error;
    throw new AppError(409, 'KYC_ALREADY_SUBMITTED', 'Kamu sudah punya pengajuan KYC yang berlaku.');
  }
});

router.get('/me', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const submission = await prisma.kycSubmission.findFirst({
    where: { userId: currentUser(req).id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: { kyc: submission ? toKycDto(submission) : null } });
});

router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { status } = listQuerySchema.parse(req.query);
  const submissions = await prisma.kycSubmission.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ data: { submissions: submissions.map(toKycAdminDto) } });
});

router.post('/:id/approve', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const submission = await reviewSubmission(String(req.params.id), {
    status: 'APPROVED',
    reviewedById: currentUser(req).id,
    reviewedAt: new Date(),
  });
  res.json({ data: { kyc: toKycDto(submission) } });
});

router.post('/:id/reject', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { reason } = rejectionSchema.parse(req.body);
  const submission = await reviewSubmission(String(req.params.id), {
    status: 'REJECTED',
    rejectionReason: reason,
    reviewedById: currentUser(req).id,
    reviewedAt: new Date(),
  });
  res.json({ data: { kyc: toKycDto(submission) } });
});

export default router;
