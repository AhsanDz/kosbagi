// Modul kyc: pengajuan KYC dummy oleh investor dan peninjauan oleh admin.
//
// Persetujuan adalah satu transaksi DB: pengajuan menjadi APPROVED, dompet kustodian dibuat bila
// belum ada, dan job WHITELIST_KYC ditulis ke outbox. Ketiganya tersimpan bersama atau tidak sama
// sekali, jadi tidak pernah ada investor disetujui tanpa dompet, atau dompet tanpa job whitelist.
// Worker jalur 3 lalu memanggil KosToken.setKycStatus(alamat, true).
import { Router } from 'express';
import type { KycSubmission, User } from '../../generated/prisma/client.js';
import { KycStatus } from '../../generated/prisma/enums.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';
import { isUuid } from '../../lib/uuid.js';
import { noNulCharacter, z } from '../../lib/zod.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { writeWhitelistKycJob } from '../../queue/outbox.js';
import { computeKycChecks, type KycChecks } from './checks.js';
import { custodialWallets, ensureCustodialWallet, loadWallet, loadWalletsForAdmin, type WalletAdminDto } from './wallet.js';

const submissionSchema = z.object({
  fullName: z.string().trim().min(2).max(120).refine(noNulCharacter.check, noNulCharacter.message),
  dummyIdNumber: z
    .string()
    .trim()
    .regex(/^DUMMY-[A-Za-z0-9-]{1,40}$/, 'Nomor identitas harus berawalan DUMMY-. Jangan memakai nomor KTP asli.'),
});

const rejectionSchema = z.object({
  reason: z.string().trim().min(3).max(300).refine(noNulCharacter.check, noNulCharacter.message),
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

interface KycAdminRow {
  submission: KycSubmission & { user: Pick<User, 'id' | 'name' | 'email'> };
  checks: KycChecks;
  wallet: WalletAdminDto | null;
  attempt: number;
}

function toKycAdminDto({ submission, checks, wallet, attempt }: KycAdminRow) {
  return { ...toKycDto(submission), user: submission.user, checks, wallet, attempt };
}

function kycNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Pengajuan KYC tidak ditemukan.');
}

function alreadyReviewed(): AppError {
  return new AppError(409, 'KYC_ALREADY_REVIEWED', 'Pengajuan ini sudah ditinjau.');
}

/** Jumlah pengajuan per status, untuk angka di tab admin. */
async function countByStatus(): Promise<Record<KycStatus, number>> {
  const groups = await prisma.kycSubmission.groupBy({ by: ['status'], _count: { _all: true } });
  const counts: Record<KycStatus, number> = { SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
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
  const userId = currentUser(req).id;
  const [submission, wallet] = await Promise.all([
    prisma.kycSubmission.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    loadWallet(prisma, userId),
  ]);
  res.json({ data: { kyc: submission ? toKycDto(submission) : null, wallet } });
});

router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { status } = listQuerySchema.parse(req.query);
  const [submissions, active, counts] = await Promise.all([
    prisma.kycSubmission.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.kycSubmission.findMany({
      where: { status: { in: ['SUBMITTED', 'APPROVED'] } },
      select: { id: true, userId: true, dummyIdNumber: true },
    }),
    countByStatus(),
  ]);

  const userIds = [...new Set(submissions.map((submission) => submission.userId))];
  const [wallets, history] = await Promise.all([
    loadWalletsForAdmin(prisma, userIds),
    prisma.kycSubmission.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, userId: true },
    }),
  ]);

  // Urutan pengajuan per investor: 1 untuk pengajuan pertama, 2 untuk "Ajukan lagi", dst.
  const attempts = new Map<string, number>();
  const perUser = new Map<string, number>();
  for (const { id, userId } of history) {
    const next = (perUser.get(userId) ?? 0) + 1;
    perUser.set(userId, next);
    attempts.set(id, next);
  }

  const rows = submissions.map((submission) =>
    toKycAdminDto({
      submission,
      checks: computeKycChecks(submission, submission.user.name, active),
      wallet: submission.status === 'APPROVED' ? (wallets.get(submission.userId) ?? null) : null,
      attempt: attempts.get(submission.id) ?? 1,
    }),
  );
  res.json({ data: { submissions: rows, counts } });
});

router.post('/:id/approve', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw kycNotFound();

  // Diperiksa sebelum apa pun berubah: tanpa mnemonic, dompet tidak bisa dibuat.
  const mnemonic = custodialWallets.mnemonic();
  if (!mnemonic) {
    throw new AppError(503, 'CUSTODIAL_WALLET_NOT_CONFIGURED', 'Dompet kustodian belum dikonfigurasi di server.');
  }

  const reviewerId = currentUser(req).id;
  const submission = await prisma.$transaction(async (tx) => {
    // Bersyarat SUBMITTED, jadi dua admin tidak bisa menyetujui pengajuan yang sama.
    const { count } = await tx.kycSubmission.updateMany({
      where: { id, status: 'SUBMITTED' },
      data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date() },
    });
    const approved = await tx.kycSubmission.findUnique({ where: { id } });
    if (!approved) throw kycNotFound();
    if (count === 0) throw alreadyReviewed();

    const wallet = await ensureCustodialWallet(tx, approved.userId, mnemonic);
    await writeWhitelistKycJob(tx, wallet.address);
    return approved;
  });

  res.json({ data: { kyc: toKycDto(submission), wallet: await loadWallet(prisma, submission.userId) } });
});

router.post('/:id/reject', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw kycNotFound();
  const { reason } = rejectionSchema.parse(req.body);

  const { count } = await prisma.kycSubmission.updateMany({
    where: { id, status: 'SUBMITTED' },
    data: { status: 'REJECTED', rejectionReason: reason, reviewedById: currentUser(req).id, reviewedAt: new Date() },
  });
  const submission = await prisma.kycSubmission.findUnique({ where: { id } });
  if (!submission) throw kycNotFound();
  if (count === 0) throw alreadyReviewed();

  res.json({ data: { kyc: toKycDto(submission), wallet: null } });
});

export default router;
