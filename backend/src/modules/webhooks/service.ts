// Memproses notifikasi Midtrans yang signature-nya sudah lolos. Ini satu-satunya tempat di
// aplikasi yang mengubah tagihan menjadi lunas.
//
// Keputusan memakai jawaban API status Midtrans, bukan isi notifikasi. Di P2 hanya order RENT-
// yang diproses; pembelian token (BUY-) ditambahkan di P3.
import type { PaymentAnomalyType } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { writeRecordRentJob } from '../../queue/outbox.js';
import { midtrans, MidtransUnavailableError, type TransactionStatus } from '../payments/midtrans.js';
import { classifyTransaction, parseGrossAmount } from '../payments/status.js';

export type WebhookOutcome =
  | 'SETTLED' // tagihan menjadi lunas
  | 'ALREADY_PAID' // notifikasi ganda untuk order yang sudah terbayar
  | 'DUPLICATE_BILL_PAYMENT' // tagihan sudah lunas lewat order lain
  | 'UNKNOWN_ORDER' // order_id tidak dikenal
  | 'ATTEMPT_UPDATED' // status percobaan berubah, tagihan tidak
  | 'NO_CHANGE'; // tidak ada yang perlu diubah

export interface VerifiedNotification {
  order_id: string;
  gross_amount: string;
}

const paymentForSettlement = {
  bill: { include: { room: { include: { property: true } } } },
} satisfies Prisma.PaymentInclude;

type PaymentForSettlement = Prisma.PaymentGetPayload<{ include: typeof paymentForSettlement }>;
type RentPayment = PaymentForSettlement & { bill: NonNullable<PaymentForSettlement['bill']>; billId: string };

interface AnomalyInput {
  type: PaymentAnomalyType;
  orderId: string;
  paymentId?: string;
  expectedAmountIdr?: bigint;
  receivedAmountIdr?: bigint | null;
  providerStatus?: string;
  note?: string;
}

/** Satu baris per order per jenis, supaya pengiriman ulang Midtrans tidak membanjiri tabel. */
async function recordAnomaly(db: Prisma.TransactionClient, input: AnomalyInput): Promise<void> {
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

/** Field Midtrans yang disimpan di percobaan, untuk tampilan metode bayar dan rekonsiliasi. */
function providerFields(status: TransactionStatus) {
  return {
    method: status.payment_type,
    providerStatus: status.transaction_status,
    providerTransactionId: status.transaction_id,
  };
}

/**
 * Melunasi tagihan dalam satu transaksi DB: tagihan, percobaan, dan baris outbox tersimpan
 * bersama atau tidak sama sekali.
 *
 * Perubahan tagihan bersyarat status UNPAID dan menjadi titik serialisasi. Dua notifikasi yang
 * datang bersamaan antre di baris tagihan, dan hanya yang pertama mendapat count = 1. Yang kedua
 * jatuh ke cabang bawah, yang memisahkan notifikasi ganda dari percobaan lain yang ikut terbayar.
 */
async function settleRentPayment(payment: RentPayment, status: TransactionStatus): Promise<WebhookOutcome> {
  const paidAt = new Date();
  const { bill } = payment;

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.bill.updateMany({
      where: { id: payment.billId, status: 'UNPAID' },
      data: { status: 'PAID', paidAt },
    });

    if (claimed.count === 1) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt, ...providerFields(status) },
      });
      await writeRecordRentJob(tx, {
        billId: bill.id,
        paymentId: payment.id,
        orderId: payment.orderId,
        propertyCode: bill.room.property.code,
        roomNumber: bill.room.number,
        period: bill.period,
        amountIdr: bill.amountIdr,
      });
      return 'SETTLED';
    }

    const marked = await tx.payment.updateMany({
      where: { id: payment.id, status: { notIn: ['PAID', 'DUPLICATE_PAID'] } },
      data: { status: 'DUPLICATE_PAID', paidAt, ...providerFields(status) },
    });
    if (marked.count === 0) return 'ALREADY_PAID';

    await recordAnomaly(tx, {
      type: 'DUPLICATE_BILL_PAYMENT',
      orderId: payment.orderId,
      paymentId: payment.id,
      expectedAmountIdr: bill.amountIdr,
      receivedAmountIdr: bill.amountIdr,
      providerStatus: status.transaction_status,
      note: 'Tagihan sudah lunas lewat order lain. Percobaan ini perlu dikembalikan dananya.',
    });
    return 'DUPLICATE_BILL_PAYMENT';
  });
}

/**
 * Mencatat status yang belum atau tidak lunas di percobaan. Hanya menyentuh baris PENDING, jadi
 * notifikasi terlambat tidak pernah menimpa status lunas, dan tagihan tidak ikut berubah.
 */
async function updateOpenAttempt(
  payment: RentPayment,
  status: TransactionStatus,
  nextStatus: 'PENDING' | 'EXPIRED' | 'FAILED',
): Promise<WebhookOutcome> {
  const { count } = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: { status: nextStatus, ...providerFields(status) },
  });
  if (count === 1) return 'ATTEMPT_UPDATED';

  logger.warn(
    { orderId: payment.orderId, transactionStatus: status.transaction_status, paymentStatus: payment.status },
    'Status Midtrans terlambat diabaikan',
  );
  return 'NO_CHANGE';
}

/** Menolak bila nominal notifikasi atau nominal API status berbeda dari tagihan. */
async function rejectIfAmountDiffers(
  payment: RentPayment,
  status: TransactionStatus,
  notifiedAmount: string,
): Promise<void> {
  const expected = payment.bill.amountIdr;
  const differing = [notifiedAmount, status.gross_amount].find((raw) => parseGrossAmount(raw) !== expected);
  if (differing === undefined) return;

  await recordAnomaly(prisma, {
    type: 'AMOUNT_MISMATCH',
    orderId: payment.orderId,
    paymentId: payment.id,
    expectedAmountIdr: expected,
    receivedAmountIdr: parseGrossAmount(differing),
    providerStatus: status.transaction_status,
    note: `Notifikasi ${notifiedAmount}, API status ${status.gross_amount}.`,
  });
  throw new AppError(400, 'AMOUNT_MISMATCH', 'Nominal notifikasi tidak cocok dengan tagihan.');
}

async function fetchVerifiedStatus(orderId: string): Promise<TransactionStatus | null> {
  try {
    return await midtrans.getTransactionStatus(orderId);
  } catch (error) {
    if (!(error instanceof MidtransUnavailableError)) throw error;
    throw midtransUnavailable();
  }
}

/** 503 membuat Midtrans mengirim ulang notifikasi sampai empat kali. */
function midtransUnavailable(): AppError {
  return new AppError(503, 'MIDTRANS_UNAVAILABLE', 'Status transaksi belum bisa dicek. Notifikasi akan dikirim ulang.');
}

function isRentPayment(payment: PaymentForSettlement | null): payment is RentPayment {
  return payment?.bill != null;
}

export async function handleVerifiedNotification(notification: VerifiedNotification): Promise<WebhookOutcome> {
  const { order_id: orderId, gross_amount: notifiedAmount } = notification;

  const status = await fetchVerifiedStatus(orderId);
  const payment = await prisma.payment.findUnique({ where: { orderId }, include: paymentForSettlement });

  if (!isRentPayment(payment)) {
    await recordAnomaly(prisma, {
      type: 'UNKNOWN_ORDER',
      orderId,
      receivedAmountIdr: parseGrossAmount(status?.gross_amount ?? notifiedAmount),
      ...(status ? { providerStatus: status.transaction_status } : {}),
    });
    return 'UNKNOWN_ORDER';
  }

  // Order dikenal tetapi Midtrans belum mengenalnya: belum ada yang bisa dipercaya, coba lagi nanti.
  if (!status) throw midtransUnavailable();

  await rejectIfAmountDiffers(payment, status, notifiedAmount);

  switch (classifyTransaction(status)) {
    case 'PAID':
      return settleRentPayment(payment, status);
    case 'WAITING':
      return updateOpenAttempt(payment, status, 'PENDING');
    case 'EXPIRED':
      return updateOpenAttempt(payment, status, 'EXPIRED');
    case 'FAILED':
      return updateOpenAttempt(payment, status, 'FAILED');
    case 'IGNORED':
      logger.warn({ orderId, transactionStatus: status.transaction_status }, 'Status Midtrans tidak diproses');
      return 'NO_CHANGE';
  }
}
