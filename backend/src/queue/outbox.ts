// Menulis baris outbox. Dipanggil di dalam transaksi DB yang sama dengan perubahan statusnya,
// sehingga keduanya tersimpan bersama atau tidak sama sekali. Isi job divalidasi sebelum ditulis.
import type { Prisma } from '../generated/prisma/client.js';
import { parseJobPayload, paymentReference } from './jobs.js';

interface RecordRentJob {
  billId: string;
  paymentId: string;
  orderId: string;
  propertyCode: string;
  roomNumber: string;
  period: string;
  amountIdr: bigint;
}

/** Job recordRent. dedupeKey memakai id tagihan, jadi satu tagihan hanya punya satu job. */
export async function writeRecordRentJob(tx: Prisma.TransactionClient, job: RecordRentJob): Promise<void> {
  const payload = parseJobPayload('RECORD_RENT', {
    propertyCode: job.propertyCode,
    roomNumber: job.roomNumber,
    period: job.period,
    amountIdr: Number(job.amountIdr),
    paymentRef: paymentReference(job.orderId),
  });

  await tx.outboxJob.create({
    data: { type: 'RECORD_RENT', dedupeKey: `record-rent:${job.billId}`, paymentId: job.paymentId, payload },
  });
}

/** dedupeKey job whitelist. Satu dompet hanya didaftarkan lolos KYC sekali. */
export function whitelistDedupeKey(walletAddress: string): string {
  return `whitelist-kyc:${walletAddress}`;
}

/** dedupeKey job transfer token. Satu pesanan hanya dikirimi token sekali. */
export function transferDedupeKey(tokenPurchaseId: string): string {
  return `transfer-tokens:${tokenPurchaseId}`;
}

/** Job KosToken.setKycStatus(walletAddress, true), ditulis saat admin menyetujui KYC. */
export async function writeWhitelistKycJob(tx: Prisma.TransactionClient, walletAddress: string): Promise<void> {
  const payload = parseJobPayload('WHITELIST_KYC', { walletAddress, approved: true });

  await tx.outboxJob.create({
    data: { type: 'WHITELIST_KYC', dedupeKey: whitelistDedupeKey(walletAddress), payload },
  });
}

interface TransferTokensJob {
  tokenPurchaseId: string;
  paymentId: string;
  orderId: string;
  propertyCode: string;
  walletAddress: string;
  tokenAmount: number;
}

/** Job KosToken.transferFromTreasury, ditulis saat pembayaran BUY- lunas. */
export async function writeTransferTokensJob(tx: Prisma.TransactionClient, job: TransferTokensJob): Promise<void> {
  const payload = parseJobPayload('TRANSFER_TOKENS', {
    propertyCode: job.propertyCode,
    walletAddress: job.walletAddress,
    tokenAmount: job.tokenAmount,
    paymentRef: paymentReference(job.orderId),
  });

  await tx.outboxJob.create({
    data: {
      type: 'TRANSFER_TOKENS',
      dedupeKey: transferDedupeKey(job.tokenPurchaseId),
      paymentId: job.paymentId,
      payload,
    },
  });
}
