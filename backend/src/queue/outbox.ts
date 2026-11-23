// Menulis baris outbox. Dipanggil di dalam transaksi DB yang sama dengan perubahan statusnya,
// sehingga keduanya tersimpan bersama atau tidak sama sekali. Isi job divalidasi sebelum ditulis.
import type { OutboxJob, Prisma } from '../generated/prisma/client.js';
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

/** dedupeKey job biaya. Satu nota hanya dicatat sekali, sama dengan aturan KosLedger. */
export function recordExpenseDedupeKey(receiptHash: string): string {
  return `record-expense:${receiptHash}`;
}

/** dedupeKey job tutup periode. Satu periode satu properti hanya ditutup sekali. */
export function closePeriodDedupeKey(propertyCode: string, period: string): string {
  return `close-period:${propertyCode}:${period}`;
}

interface RecordExpenseJob {
  propertyCode: string;
  period: string;
  /** Kode kategori uint8, mis. 4 untuk Perbaikan. */
  categoryCode: number;
  amountIdr: bigint;
  /** SHA-256 isi file nota, 0x + 64 hex. */
  receiptHash: string;
}

/**
 * Job KosLedger.recordExpense(period, category, amount, receiptHash) (P4), ditulis bersama baris
 * biaya. Isinya hanya kode properti, periode, kode kategori, nominal, dan hash nota.
 */
export async function writeRecordExpenseJob(tx: Prisma.TransactionClient, job: RecordExpenseJob): Promise<OutboxJob> {
  const payload = parseJobPayload('RECORD_EXPENSE', {
    propertyCode: job.propertyCode,
    period: job.period,
    category: job.categoryCode,
    amountIdr: Number(job.amountIdr),
    receiptHash: job.receiptHash,
  });

  return tx.outboxJob.create({
    data: { type: 'RECORD_EXPENSE', dedupeKey: recordExpenseDedupeKey(job.receiptHash), payload },
  });
}

/** Job KosLedger.closePeriod(period) (P4), ditulis bersama baris PeriodClosing. */
export async function writeClosePeriodJob(
  tx: Prisma.TransactionClient,
  job: { propertyCode: string; period: string },
): Promise<OutboxJob> {
  const payload = parseJobPayload('CLOSE_PERIOD', { propertyCode: job.propertyCode, period: job.period });

  return tx.outboxJob.create({
    data: { type: 'CLOSE_PERIOD', dedupeKey: closePeriodDedupeKey(job.propertyCode, job.period), payload },
  });
}
