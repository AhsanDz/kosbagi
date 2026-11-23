// Antrean job on-chain untuk admin (P4): daftar job outbox dengan status pencatatannya, Coba lagi
// untuk job yang gagal, dan tanda "sudah ditangani" untuk job yang gagal permanen.
//
// Coba lagi tidak mengirim transaksi sendiri: baris outbox dikembalikan ke PENDING dan satu baris
// outbox_job_retries ditulis, lalu dispatcher memasukkannya lagi ke antrean dengan id job baru.
// Processor jalur 3 memeriksa status on-chain dulu sebelum mengirim, jadi transaksi yang ternyata
// sudah masuk blok diakui RECORDED, bukan dikirim ulang.
//
// Tandai ditangani dipakai untuk job yang akan gagal lagi setiap dicoba (mis. data di kontrak sudah
// ada lewat referensi lain). Job itu tidak dicoba lagi, tidak dihitung sebagai job gagal, dan tidak
// lagi menghalangi Tutup periode. Siapa, kapan, dan catatannya disimpan di outbox_job_resolutions.
import type { OutboxJob, OutboxJobType, Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { type AdminJobStatus, type JobState, loadJobStates } from '../../lib/job-status.js';
import { prisma } from '../../lib/prisma.js';
import { jobPayloadSchemas } from '../../queue/jobs.js';

export interface JobResolutionDto {
  resolvedAt: Date;
  resolvedBy: { name: string };
  note: string;
}

export interface AdminJobDto {
  id: string;
  type: OutboxJobType;
  /** order_id untuk sewa dan pembelian, hash nota untuk biaya, periode untuk tutup periode, alamat dompet untuk whitelist. */
  reference: string;
  createdAt: Date;
  /** Percobaan worker terakhir; 0 selama job menunggu dikerjakan. */
  attempts: number;
  status: AdminJobStatus;
  txHash: string | null;
  lastError: string | null;
  /** Tanda "sudah ditangani" dari admin, atau null. */
  resolution: JobResolutionDto | null;
}

export type JobView = 'open' | 'all';

const OPEN_STATUSES = new Set<AdminJobStatus>(['QUEUED', 'PENDING', 'FAILED']);

/** Teks referensi job. Isi outbox selalu lolos skema saat ditulis; baris rusak memakai dedupeKey. */
export function jobReference(job: Pick<OutboxJob, 'type' | 'payload' | 'dedupeKey'>, orderId: string | null): string {
  switch (job.type) {
    case 'RECORD_RENT':
    case 'TRANSFER_TOKENS':
      return orderId ?? job.dedupeKey;
    case 'RECORD_EXPENSE': {
      const parsed = jobPayloadSchemas.RECORD_EXPENSE.safeParse(job.payload);
      return parsed.success ? parsed.data.receiptHash : job.dedupeKey;
    }
    case 'CLOSE_PERIOD': {
      const parsed = jobPayloadSchemas.CLOSE_PERIOD.safeParse(job.payload);
      return parsed.success ? parsed.data.period : job.dedupeKey;
    }
    case 'WHITELIST_KYC': {
      const parsed = jobPayloadSchemas.WHITELIST_KYC.safeParse(job.payload);
      return parsed.success ? parsed.data.walletAddress : job.dedupeKey;
    }
  }
}

const adminJobInclude = {
  payment: { select: { orderId: true } },
  resolution: { include: { resolvedBy: { select: { name: true } } } },
} satisfies Prisma.OutboxJobInclude;

type AdminJobRow = Prisma.OutboxJobGetPayload<{ include: typeof adminJobInclude }>;

export function toAdminJobDto(job: AdminJobRow, state: JobState): AdminJobDto {
  return {
    id: job.id,
    type: job.type,
    reference: jobReference(job, job.payment?.orderId ?? null),
    createdAt: job.createdAt,
    attempts: state.attempts,
    status: state.status,
    txHash: state.txHash,
    lastError: state.lastError,
    resolution: job.resolution
      ? { resolvedAt: job.resolution.resolvedAt, resolvedBy: { name: job.resolution.resolvedBy.name }, note: job.resolution.note }
      : null,
  };
}

/** Batas baris yang dibaca; antrean prototipe jauh di bawah angka ini. */
const MAX_JOBS = 500;

/** Semua job, terbaru lebih dulu. */
export async function loadAdminJobs(): Promise<AdminJobDto[]> {
  const jobs = await prisma.outboxJob.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_JOBS, include: adminJobInclude });
  const states = await loadJobStates(prisma, jobs.map((job) => job.id));
  return jobs.map((job) => toAdminJobDto(job, states.get(job.id) as JobState));
}

/** Tab "Menunggu atau gagal": QUEUED, PENDING, dan FAILED yang belum ditangani. */
export function filterJobs(jobs: readonly AdminJobDto[], view: JobView): AdminJobDto[] {
  return view === 'all' ? [...jobs] : jobs.filter((job) => OPEN_STATUSES.has(job.status) && !job.resolution);
}

function jobNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Job tidak ditemukan.');
}

function jobNotFailed(status: AdminJobStatus | undefined): AppError {
  return new AppError(409, 'JOB_NOT_FAILED', 'Hanya job yang gagal yang bisa diproses.', { status });
}

/**
 * Menjalankan `work` di bawah kunci per job, supaya Coba lagi dan Tandai ditangani untuk job yang
 * sama tidak pernah berjalan bersamaan.
 */
async function withJobLock(id: string, work: (tx: Prisma.TransactionClient, state: JobState) => Promise<void>): Promise<AdminJobDto> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`outbox-retry:${id}`}, 0))`;
    const job = await tx.outboxJob.findUnique({ where: { id }, select: { id: true } });
    if (!job) throw jobNotFound();
    await work(tx, (await loadJobStates(tx, [id])).get(id) as JobState);
  });

  const job = await prisma.outboxJob.findUniqueOrThrow({ where: { id }, include: adminJobInclude });
  return toAdminJobDto(job, (await loadJobStates(prisma, [id])).get(id) as JobState);
}

/** POST /admin/jobs/:id/retry. Hanya job FAILED yang belum ditangani. */
export function retryJob(id: string, adminId: string): Promise<AdminJobDto> {
  return withJobLock(id, async (tx, state) => {
    if (state.resolved) {
      throw new AppError(409, 'JOB_RESOLVED', 'Job ini sudah ditandai ditangani, jadi tidak dicoba lagi.');
    }
    if (state.status !== 'FAILED') throw jobNotFailed(state.status);

    // requestedAt diisi jam aplikasi, sama dengan updatedAt transaksi chain yang ditulis worker.
    await tx.outboxJobRetry.create({ data: { outboxJobId: id, requestedById: adminId, requestedAt: new Date() } });
    await tx.outboxJob.update({
      where: { id },
      data: { status: 'PENDING', attempts: 0, lastError: null, dispatchedAt: null },
    });
  });
}

/** POST /admin/jobs/:id/resolve. Hanya job FAILED yang belum ditangani. */
export function resolveJob(id: string, adminId: string, note: string): Promise<AdminJobDto> {
  return withJobLock(id, async (tx, state) => {
    if (state.status !== 'FAILED') throw jobNotFailed(state.status);
    if (state.resolved) {
      throw new AppError(409, 'JOB_ALREADY_RESOLVED', 'Job ini sudah ditandai ditangani.');
    }
    await tx.outboxJobResolution.create({ data: { outboxJobId: id, resolvedById: adminId, note, resolvedAt: new Date() } });
  });
}
