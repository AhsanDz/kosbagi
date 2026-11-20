// Bagian pemrosesan notifikasi yang dipakai alur sewa dan alur pembelian token.
import type { PaymentAnomalyType } from '../../generated/prisma/enums.js';
import type { Payment, Prisma } from '../../generated/prisma/client.js';
import { logger } from '../../lib/logger.js';
import { type TransactionStatus, virtualAccountBank } from '../payments/midtrans.js';

export type WebhookOutcome =
  | 'SETTLED' // tagihan atau pesanan menjadi lunas
  | 'ALREADY_PAID' // notifikasi ganda untuk order yang sudah terbayar
  | 'DUPLICATE_BILL_PAYMENT' // tagihan sudah lunas lewat order lain
  | 'DUPLICATE_PURCHASE_PAYMENT' // pesanan token sudah lunas lewat order lain
  | 'PURCHASE_UNFULFILLABLE' // pesanan terbayar setelah sisihannya lepas dan tokennya sudah habis
  | 'ORDER_ID_TAKEN' // order_id percobaan ini sudah dipakai di Midtrans sebelum percobaan dibuat
  | 'UNKNOWN_ORDER' // order_id tidak dikenal
  | 'ATTEMPT_UPDATED' // status percobaan berubah, tagihan atau pesanan tidak
  | 'NO_CHANGE'; // tidak ada yang perlu diubah

export interface AnomalyInput {
  type: PaymentAnomalyType;
  orderId: string;
  paymentId?: string;
  expectedAmountIdr?: bigint;
  receivedAmountIdr?: bigint | null;
  providerStatus?: string;
  note?: string;
}

type AnomalyDb = Pick<Prisma.TransactionClient, 'paymentAnomaly'>;

/** Satu baris per order per jenis, supaya pengiriman ulang Midtrans tidak membanjiri tabel. */
export async function recordAnomaly(db: AnomalyDb, input: AnomalyInput): Promise<void> {
  logger.warn({ type: input.type, orderId: input.orderId }, 'Anomali pembayaran dicatat');
  await db.paymentAnomaly.upsert({
    where: { orderId_type: { orderId: input.orderId, type: input.type } },
    create: input,
    update: {
      occurrences: { increment: 1 },
      receivedAmountIdr: input.receivedAmountIdr,
      providerStatus: input.providerStatus,
    },
  });
}

/**
 * Field Midtrans yang disimpan di percobaan, untuk tampilan metode bayar dan rekonsiliasi. Untuk
 * virtual account hanya nama banknya yang disimpan, bukan nomornya.
 */
export function providerFields(status: TransactionStatus) {
  return {
    method: status.payment_type,
    bank: virtualAccountBank(status),
    providerStatus: status.transaction_status,
    providerTransactionId: status.transaction_id,
  };
}

/**
 * Mencatat status yang belum atau tidak lunas di percobaan. Hanya menyentuh baris PENDING, jadi
 * notifikasi terlambat tidak pernah menimpa status lunas, dan tagihan atau pesanan tidak ikut
 * berubah. Mengembalikan true bila percobaan berubah.
 */
export async function updateOpenAttempt(
  db: Pick<Prisma.TransactionClient, 'payment'>,
  payment: Pick<Payment, 'id' | 'orderId' | 'status'>,
  status: TransactionStatus,
  nextStatus: 'PENDING' | 'EXPIRED' | 'FAILED',
): Promise<boolean> {
  const { count } = await db.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: { status: nextStatus, ...providerFields(status) },
  });
  if (count === 1) return true;

  logger.warn(
    { orderId: payment.orderId, transactionStatus: status.transaction_status, paymentStatus: payment.status },
    'Status Midtrans terlambat diabaikan',
  );
  return false;
}
