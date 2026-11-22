// Status job blockchain dengan memperhitungkan tombol Coba lagi admin (P4). Worker jalur 3 menulis
// hasil setiap percobaan di ChainTransaction; baris terbaru yang dibaca. Setelah admin menekan Coba
// lagi (baris baru di outbox_job_retries), transaksi terbaru masih FAILED sampai worker mengerjakan
// job itu lagi, jadi selama itu job dibaca QUEUED (admin) atau PENDING (pengelola dan investor).
//
// lib/chain-status.ts (P3) tetap dipakai apa adanya oleh kode lama dan jalur lain; file ini untuk
// tampilan P4.
import type { ChainTransaction, Prisma } from '../generated/prisma/client.js';

/** Status job di antrean admin. QUEUED: belum dikerjakan worker, termasuk setelah Coba lagi. */
export type AdminJobStatus = 'QUEUED' | 'PENDING' | 'RECORDED' | 'FAILED';

/** Status yang dilihat pengelola. Pengelola melihat Gagal, tetapi tidak membedakan QUEUED. */
export type ManagerChainStatus = 'PENDING' | 'RECORDED' | 'FAILED';

/** Status yang dilihat investor. Investor tidak pernah melihat Gagal (keputusan desain P4). */
export type InvestorChainStatus = 'PENDING' | 'RECORDED';

type LatestTransaction = Pick<ChainTransaction, 'status' | 'txHash' | 'blockNumber' | 'attempts' | 'lastError' | 'updatedAt'>;

export interface JobWithLatestTransaction {
  /** Hanya baris terbaru, lewat latestTransactionInclude. */
  chainTransactions: LatestTransaction[];
  /** Hanya Coba lagi terbaru, lewat latestTransactionInclude. */
  retries: Array<{ requestedAt: Date }>;
  /** Tanda "sudah ditangani" dari admin, bila ada. */
  resolution?: { id: string } | null;
}

export interface JobState {
  status: AdminJobStatus;
  txHash: string | null;
  blockNumber: number | null;
  /** Percobaan worker yang tercatat; 0 selama job menunggu dikerjakan. */
  attempts: number;
  /** Pesan galat terakhir dari worker. Hanya untuk admin dan hanya bila masih relevan. */
  lastError: string | null;
  /** Kapan worker terakhir menulis hasil job ini; untuk RECORDED berarti waktu tercatat. */
  updatedAt: Date | null;
  /**
   * Admin sudah menandai job gagal ini "sudah ditangani". Statusnya tetap FAILED, tetapi tidak lagi
   * menghalangi Tutup periode, tidak dihitung sebagai job gagal, dan tidak bisa dicoba lagi.
   */
  resolved: boolean;
}

/** Status job dari baris outbox dan transaksi chain terbarunya. */
export function jobState(job: JobWithLatestTransaction | null | undefined): JobState {
  const latest = job?.chainTransactions[0];
  const resolved = Boolean(job?.resolution);
  if (!latest) return { status: 'QUEUED', txHash: null, blockNumber: null, attempts: 0, lastError: null, updatedAt: null, resolved };

  const blockNumber = latest.blockNumber == null ? null : Number(latest.blockNumber);
  // Coba lagi setelah hasil terakhir worker: hasil lama sudah tidak berlaku.
  const retriedAt = job?.retries[0]?.requestedAt;
  if (latest.status === 'FAILED' && retriedAt && retriedAt > latest.updatedAt) {
    return { status: 'QUEUED', txHash: latest.txHash, blockNumber, attempts: 0, lastError: null, updatedAt: latest.updatedAt, resolved };
  }
  return {
    status: latest.status,
    txHash: latest.txHash,
    blockNumber,
    attempts: latest.attempts,
    lastError: latest.status === 'RECORDED' ? null : latest.lastError,
    updatedAt: latest.updatedAt,
    resolved,
  };
}

/** Job gagal yang belum ditangani admin: dihitung sebagai job gagal dan menghalangi Tutup periode. */
export function isOpenFailure(state: Pick<JobState, 'status' | 'resolved'>): boolean {
  return state.status === 'FAILED' && !state.resolved;
}

/** Untuk pengelola: QUEUED dibaca Menunggu pencatatan. */
export function managerChainStatus(status: AdminJobStatus): ManagerChainStatus {
  return status === 'QUEUED' ? 'PENDING' : status;
}

/** Untuk investor: hanya Tercatat atau Menunggu pencatatan. */
export function investorChainStatus(status: AdminJobStatus | ManagerChainStatus): InvestorChainStatus {
  return status === 'RECORDED' ? 'RECORDED' : 'PENDING';
}

/**
 * `include` OutboxJob untuk jobState: transaksi chain terbaru (urutan sama dengan worker) dan Coba
 * lagi terbaru.
 */
export const latestTransactionInclude = {
  chainTransactions: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
  retries: { orderBy: { requestedAt: 'desc' }, take: 1, select: { requestedAt: true } },
  resolution: { select: { id: true } },
} satisfies Prisma.OutboxJobInclude;

type JobStateDb = Pick<Prisma.TransactionClient, 'chainTransaction' | 'outboxJobRetry' | 'outboxJobResolution'>;

/**
 * Status banyak job sekaligus dengan tiga query berurutan, tanpa `include`, jadi aman dipakai di
 * dalam transaksi (satu koneksi tidak boleh menjalankan dua query sekaligus). Job yang belum punya
 * transaksi chain terbaca QUEUED.
 */
export async function loadJobStates(db: JobStateDb, outboxJobIds: readonly string[]): Promise<Map<string, JobState>> {
  const ids = [...new Set(outboxJobIds)];
  if (ids.length === 0) return new Map();

  const transactions = await db.chainTransaction.findMany({
    where: { outboxJobId: { in: ids } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { outboxJobId: true, status: true, txHash: true, blockNumber: true, attempts: true, lastError: true, updatedAt: true },
  });
  const retries = await db.outboxJobRetry.findMany({
    where: { outboxJobId: { in: ids } },
    orderBy: { requestedAt: 'asc' },
    select: { outboxJobId: true, requestedAt: true },
  });

  const resolutions = await db.outboxJobResolution.findMany({
    where: { outboxJobId: { in: ids } },
    select: { id: true, outboxJobId: true },
  });

  // Urutan naik, jadi baris yang terakhir ditulis ke peta adalah yang terbaru.
  const latestTransaction = new Map(transactions.map((row) => [row.outboxJobId, row]));
  const latestRetry = new Map(retries.map((row) => [row.outboxJobId, row]));
  const resolutionOf = new Map(resolutions.map((row) => [row.outboxJobId, row]));
  return new Map(
    ids.map((id) => {
      const transaction = latestTransaction.get(id);
      const retry = latestRetry.get(id);
      return [
        id,
        jobState({
          chainTransactions: transaction ? [transaction] : [],
          retries: retry ? [retry] : [],
          resolution: resolutionOf.get(id) ?? null,
        }),
      ];
    }),
  );
}
