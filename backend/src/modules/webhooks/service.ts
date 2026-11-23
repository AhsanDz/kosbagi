// Memproses notifikasi Midtrans yang signature-nya sudah lolos. Ini satu-satunya tempat di
// aplikasi yang mengubah tagihan sewa (RENT-) atau pesanan token (BUY-) menjadi lunas.
//
// Keputusan memakai jawaban API status Midtrans, bukan isi notifikasi. Aturan anti ganda,
// status monotonik, dan anomali sama untuk kedua jenis order; bedanya hanya di apa yang dilunasi
// dan job blockchain yang ditulis (RECORD_RENT atau TRANSFER_TOKENS).
import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { writeRecordRentJob } from '../../queue/outbox.js';
import { midtrans, MidtransUnavailableError, type TransactionStatus } from '../payments/midtrans.js';
import { isOrderIdTakenAttempt } from '../payments/service.js';
import { classifyTransaction, parseGrossAmount } from '../payments/status.js';
import { isPeriodClosed, lockPeriod } from '../periods/state.js';
import { closePurchaseAttempt, type PurchasePayment, purchaseForSettlement, settleTokenPurchase } from './purchase.js';
import { providerFields, recordAnomaly, updateOpenAttempt, type WebhookOutcome } from './records.js';

export type { WebhookOutcome } from './records.js';

export interface VerifiedNotification {
  order_id: string;
  gross_amount: string;
}

const paymentForSettlement = {
  bill: { include: { room: { include: { property: true } } } },
  tokenPurchase: { include: purchaseForSettlement },
} satisfies Prisma.PaymentInclude;

type PaymentForSettlement = Prisma.PaymentGetPayload<{ include: typeof paymentForSettlement }>;
type RentPayment = PaymentForSettlement & { bill: NonNullable<PaymentForSettlement['bill']>; billId: string };

/**
 * Melunasi tagihan dalam satu transaksi DB: tagihan, percobaan, dan baris outbox tersimpan
 * bersama atau tidak sama sekali.
 *
 * Pembayaran telat (P4, keputusan 16 Nov 2026): bila periode tagihan sudah ditutup admin, uang yang
 * masuk tidak melunasi tagihan dan tidak dicatat on-chain (closePeriod sudah atau akan menolak
 * recordRent). Percobaan ditandai PAID_AFTER_CLOSE dan dicatat anomali untuk dikembalikan. Kunci
 * periode yang sama dengan Tutup periode menjamin keduanya tidak saling menyalip: pelunasan yang
 * menang lebih dulu membuat Tutup periode ditolak (sewa belum tercatat), dan sebaliknya.
 *
 * Perubahan tagihan bersyarat status UNPAID dan menjadi titik serialisasi. Dua notifikasi yang
 * datang bersamaan antre di baris tagihan, dan hanya yang pertama mendapat count = 1. Yang kedua
 * jatuh ke cabang bawah, yang memisahkan notifikasi ganda dari percobaan lain yang ikut terbayar.
 */
async function settleRentPayment(payment: RentPayment, status: TransactionStatus): Promise<WebhookOutcome> {
  const paidAt = new Date();
  const { bill } = payment;

  return prisma.$transaction(async (tx) => {
    const propertyId = bill.room.propertyId;
    await lockPeriod(tx, propertyId, bill.period);
    if (await isPeriodClosed(tx, propertyId, bill.period)) {
      const late = await settleAfterClose(tx, payment, status);
      if (late) return late;
    }

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
 * Pelunasan untuk tagihan yang periodenya sudah ditutup. Null bila tagihan ternyata sudah lunas
 * lewat order lain; kasus itu diproses sebagai pembayaran ganda biasa.
 */
async function settleAfterClose(
  tx: Prisma.TransactionClient,
  payment: RentPayment,
  status: TransactionStatus,
): Promise<WebhookOutcome | null> {
  const { status: billStatus } = await tx.bill.findUniqueOrThrow({ where: { id: payment.billId }, select: { status: true } });
  if (billStatus === 'PAID') return null;

  const marked = await tx.payment.updateMany({
    where: { id: payment.id, status: { notIn: ['PAID', 'DUPLICATE_PAID', 'PAID_AFTER_CLOSE'] } },
    data: { status: 'PAID_AFTER_CLOSE', paidAt: new Date(), ...providerFields(status) },
  });
  if (marked.count === 0) return 'ALREADY_PAID';

  await recordAnomaly(tx, {
    type: 'PAID_AFTER_PERIOD_CLOSED',
    orderId: payment.orderId,
    paymentId: payment.id,
    expectedAmountIdr: payment.bill.amountIdr,
    receivedAmountIdr: payment.bill.amountIdr,
    providerStatus: status.transaction_status,
    note: `Terbayar setelah periode ${payment.bill.period} ditutup. Tidak dicatat on-chain; dana perlu dikembalikan.`,
  });
  return 'PAID_AFTER_PERIOD_CLOSED';
}

/** Menolak bila nominal notifikasi atau nominal API status berbeda dari tagihan atau pesanan. */
async function rejectIfAmountDiffers(
  payment: PaymentForSettlement,
  expected: bigint,
  status: TransactionStatus,
  notifiedAmount: string,
): Promise<void> {
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
  throw new AppError(400, 'AMOUNT_MISMATCH', 'Nominal notifikasi tidak cocok dengan nominal yang ditagihkan.');
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

function isRentPayment(payment: PaymentForSettlement): payment is RentPayment {
  return payment.bill != null;
}

function isPurchasePayment(payment: PaymentForSettlement): payment is PaymentForSettlement & PurchasePayment {
  return payment.tokenPurchase != null;
}

async function handleRent(payment: RentPayment, status: TransactionStatus): Promise<WebhookOutcome> {
  switch (classifyTransaction(status)) {
    case 'PAID':
      return settleRentPayment(payment, status);
    case 'WAITING':
      return (await updateOpenAttempt(prisma, payment, status, 'PENDING')) ? 'ATTEMPT_UPDATED' : 'NO_CHANGE';
    case 'EXPIRED':
      return (await updateOpenAttempt(prisma, payment, status, 'EXPIRED')) ? 'ATTEMPT_UPDATED' : 'NO_CHANGE';
    case 'FAILED':
      return (await updateOpenAttempt(prisma, payment, status, 'FAILED')) ? 'ATTEMPT_UPDATED' : 'NO_CHANGE';
    case 'IGNORED':
      logger.warn({ orderId: payment.orderId, transactionStatus: status.transaction_status }, 'Status Midtrans tidak diproses');
      return 'NO_CHANGE';
  }
}

async function handlePurchase(payment: PurchasePayment, status: TransactionStatus): Promise<WebhookOutcome> {
  switch (classifyTransaction(status)) {
    case 'PAID':
      return settleTokenPurchase(payment, status);
    case 'WAITING':
      return (await updateOpenAttempt(prisma, payment, status, 'PENDING')) ? 'ATTEMPT_UPDATED' : 'NO_CHANGE';
    case 'EXPIRED':
      return closePurchaseAttempt(payment, status, 'EXPIRED');
    case 'FAILED':
      return closePurchaseAttempt(payment, status, 'FAILED');
    case 'IGNORED':
      logger.warn({ orderId: payment.orderId, transactionStatus: status.transaction_status }, 'Status Midtrans tidak diproses');
      return 'NO_CHANGE';
  }
}

export async function handleVerifiedNotification(notification: VerifiedNotification): Promise<WebhookOutcome> {
  const { order_id: orderId, gross_amount: notifiedAmount } = notification;

  const status = await fetchVerifiedStatus(orderId);
  const payment = await prisma.payment.findUnique({ where: { orderId }, include: paymentForSettlement });

  if (!payment || (!isRentPayment(payment) && !isPurchasePayment(payment))) {
    await recordAnomaly(prisma, {
      type: 'UNKNOWN_ORDER',
      orderId,
      receivedAmountIdr: parseGrossAmount(status?.gross_amount ?? notifiedAmount),
      ...(status ? { providerStatus: status.transaction_status } : {}),
    });
    return 'UNKNOWN_ORDER';
  }

  // Transaksi Midtrans untuk order_id ini dibuat sebelum percobaan KosBagi ada (mis. sebelum basis data
  // diisi ulang), jadi bukan pembayaran untuk tagihan atau pesanan ini. Dicatat sebagai anomali dan
  // dibalas 200 supaya tidak dikirim ulang. Tidak pernah melunasi apa pun.
  if (isOrderIdTakenAttempt(payment)) {
    await recordAnomaly(prisma, {
      type: 'UNKNOWN_ORDER',
      orderId,
      paymentId: payment.id,
      receivedAmountIdr: parseGrossAmount(status?.gross_amount ?? notifiedAmount),
      ...(status ? { providerStatus: status.transaction_status } : {}),
      note: 'ORDER_ID_TAKEN: order_id sudah dipakai di Midtrans sebelum percobaan ini dibuat. Transaksinya bukan milik tagihan atau pesanan ini.',
    });
    return 'ORDER_ID_TAKEN';
  }

  // Order dikenal tetapi Midtrans belum mengenalnya: belum ada yang bisa dipercaya, coba lagi nanti.
  if (!status) throw midtransUnavailable();

  if (isRentPayment(payment)) {
    await rejectIfAmountDiffers(payment, payment.bill.amountIdr, status, notifiedAmount);
    return handleRent(payment, status);
  }
  await rejectIfAmountDiffers(payment, payment.tokenPurchase.amountIdr, status, notifiedAmount);
  return handlePurchase(payment, status);
}
