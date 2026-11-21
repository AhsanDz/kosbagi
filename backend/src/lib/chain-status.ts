// Status pencatatan job blockchain untuk layar: tagihan sewa (recordRent), dompet investor
// (setKycStatus), dan pesanan token (transferFromTreasury). Worker jalur 3 menulis hasilnya di
// ChainTransaction; satu job bisa punya beberapa baris bila dicoba ulang, dan yang dibaca adalah
// baris terbaru.
import type { ChainTransaction, Prisma } from '../generated/prisma/client.js';

export type ChainJobStatus = 'PENDING' | 'RECORDED' | 'FAILED';

export interface ChainJobDto {
  status: ChainJobStatus;
  txHash: string | null;
  blockNumber: number | null;
}

/** Untuk respons admin saja: ditambah pesan galat terakhir dari worker. */
export interface ChainJobAdminDto extends ChainJobDto {
  /** Pesan galat percobaan terakhir, sudah disaring worker jalur 3. Null bila tidak ada. */
  lastError: string | null;
}

/** `include` untuk OutboxJob: hanya transaksi chain terbaru. */
export const latestChainTransaction = {
  chainTransactions: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.OutboxJobInclude;

type ChainFields = Pick<ChainTransaction, 'status' | 'txHash' | 'blockNumber'>;
type ChainFieldsWithError = ChainFields & Pick<ChainTransaction, 'lastError'>;

/**
 * Status job. Selama worker belum mengirim apa pun, termasuk bila baris outbox belum ada,
 * statusnya PENDING: "Menunggu pencatatan".
 */
export function toChainJobDto(job: { chainTransactions: ChainFields[] } | null | undefined): ChainJobDto {
  const transaction = job?.chainTransactions[0];
  return {
    status: transaction?.status ?? 'PENDING',
    txHash: transaction?.txHash ?? null,
    blockNumber: transaction?.blockNumber == null ? null : Number(transaction.blockNumber),
  };
}

/** Seperti toChainJobDto, ditambah `lastError`. Hanya untuk respons peran ADMIN. */
export function toChainJobAdminDto(job: { chainTransactions: ChainFieldsWithError[] } | null | undefined): ChainJobAdminDto {
  return { ...toChainJobDto(job), lastError: job?.chainTransactions[0]?.lastError ?? null };
}
