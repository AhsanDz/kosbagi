// Pesanan token. Semua pemeriksaan kuota terjadi sebelum transaksi Midtrans dibuat, jadi pesanan
// yang melebihi sisa penawaran (skenario 8) atau batas 10% (skenario 9) tidak pernah sampai ke
// Midtrans. Pesanan yang lolos menyisihkan tokennya sampai batas bayar (reservedUntil).
//
// Semua perubahan pesanan satu properti, termasuk pelunasan dan pelepasan sisihan dari webhook,
// memakai satu kunci advisory per properti. Dengan begitu dua investor yang memesan bersamaan
// tidak bisa sama-sama mendapat token terakhir.
import type { Offering, Prisma, Property, TokenPurchase, User } from '../../generated/prisma/client.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { loadWallet } from '../kyc/wallet.js';
import { checkTokenAmount } from '../offerings/quota.js';
import { activeReservation, loadQuotaInput } from '../offerings/state.js';
import { enabledPaymentsFor, midtrans } from '../payments/midtrans.js';
import { buildPurchaseOrderId, buildPurchaseOrderNumber } from '../payments/order-id.js';
import {
  midtransNotConfigured,
  openSnapTransaction,
  type PaymentAttemptResult,
  type PaymentTarget,
  paymentDeadline,
  startPayment,
} from '../payments/service.js';

/** Kunci semua perubahan pesanan token satu properti. */
export function offeringLockKey(propertyId: string): string {
  return `token-offering:${propertyId}`;
}

type OfferingWithProperty = Offering & { property: Property };

export function offeringClosed(): AppError {
  return new AppError(409, 'OFFERING_CLOSED', 'Penawaran ini sudah ditutup.');
}

function purchaseNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
}

/** Penawaran menerima pesanan selama berstatus OPEN dan belum melewati batas waktu. */
export function isOfferingOpen(offering: Pick<Offering, 'status' | 'closesAt'>, now: Date): boolean {
  return offering.status === 'OPEN' && offering.closesAt > now;
}

/** Investor wajib lolos KYC dan dompetnya sudah tercatat lolos KYC di KosToken. */
async function assertInvestorReady(investorId: string): Promise<void> {
  const approved = await prisma.kycSubmission.findFirst({
    where: { userId: investorId, status: 'APPROVED' },
    select: { id: true },
  });
  if (!approved) {
    throw new AppError(403, 'KYC_REQUIRED', 'Selesaikan verifikasi KYC sebelum membeli token.');
  }

  const wallet = await loadWallet(prisma, investorId);
  if (wallet?.whitelist.status !== 'RECORDED') {
    throw new AppError(
      409,
      'WALLET_NOT_READY',
      'Dompet kustodianmu masih didaftarkan di blockchain. Pembelian bisa dilakukan setelah tercatat.',
    );
  }
}

/**
 * Memeriksa penawaran, sisa penawaran, batas kepemilikan, dan pesanan aktif lain, berurutan
 * sesuai kontrak API. Dipanggil di dalam kunci properti.
 */
async function assertCanReserve(
  tx: Prisma.TransactionClient,
  offeringId: string,
  maxPerInvestor: number,
  investorId: string,
  tokenAmount: number,
  now: Date,
  excludePurchaseId?: string,
): Promise<Offering> {
  const offering = await tx.offering.findUniqueOrThrow({ where: { id: offeringId } });
  if (!isOfferingOpen(offering, now)) throw offeringClosed();

  const quota = await loadQuotaInput(tx, { offering, maxPerInvestor, investorId, now, excludePurchaseId });
  const rejection = checkTokenAmount(tokenAmount, quota);
  if (rejection) throw rejection;

  const pending = await tx.tokenPurchase.findFirst({
    where: {
      investorId,
      ...activeReservation(now),
      ...(excludePurchaseId ? { id: { not: excludePurchaseId } } : {}),
    },
    select: { id: true },
  });
  if (pending) {
    throw new AppError(409, 'PURCHASE_PENDING', 'Kamu masih punya pesanan yang menunggu pembayaran.', {
      purchaseId: pending.id,
    });
  }
  return offering;
}

interface PurchaseContext {
  purchase: TokenPurchase;
  offering: OfferingWithProperty;
  investor: Pick<User, 'name' | 'email'>;
}

function purchaseTarget({ purchase, offering, investor }: PurchaseContext): PaymentTarget {
  const lockKey = offeringLockKey(offering.propertyId);
  // Pesanan dari API selalu punya nomor. Baris yang dibuat langsung di basis data memakai id-nya.
  const orderNumber = purchase.orderNumber ?? `BUY-${offering.property.code}-${purchase.id}`;

  return {
    lockKey,
    link: { tokenPurchaseId: purchase.id },
    amountIdr: purchase.amountIdr,
    orderId: (attempt) => buildPurchaseOrderId(orderNumber, attempt),
    snap: {
      itemName: `Token ${offering.property.tokenSymbol}`,
      quantity: purchase.tokenAmount,
      customer: { name: investor.name, email: investor.email },
      // Di atas Rp10.000.000 (100 token) hanya virtual account, karena batas QRIS.
      enabledPayments: enabledPaymentsFor(purchase.amountIdr),
    },
    async ensurePayable(tx) {
      const { status } = await tx.tokenPurchase.findUniqueOrThrow({ where: { id: purchase.id }, select: { status: true } });
      if (status === 'PAID') throw new AppError(409, 'PURCHASE_ALREADY_PAID', 'Pesanan ini sudah lunas.');
    },
    async prepareNewAttempt(tx, expiresAt, now) {
      // Bayar ulang: sisihan lama sudah lepas, jadi kuota diperiksa lagi seperti pesanan baru.
      await assertCanReserve(
        tx,
        offering.id,
        offering.property.maxTokensPerInvestor,
        purchase.investorId,
        purchase.tokenAmount,
        now,
        purchase.id,
      );
      await tx.tokenPurchase.update({
        where: { id: purchase.id },
        data: { status: 'PENDING_PAYMENT', reservedUntil: expiresAt },
      });
    },
    async onOpenFailed(tx, payment) {
      // Snap gagal dibuat: sisihan dilepas supaya token bisa dipesan lagi.
      await tx.tokenPurchase.updateMany({
        where: { id: purchase.id, status: 'PENDING_PAYMENT', reservedUntil: payment.expiresAt },
        data: { status: 'FAILED' },
      });
    },
  };
}

export interface PurchaseResult {
  purchase: TokenPurchase;
  payment: PaymentAttemptResult['payment'];
}

export interface ReservedPurchase {
  purchase: TokenPurchase;
  /** Percobaan pertama, sudah tersimpan tetapi belum dibuat di Midtrans. */
  payment: PaymentAttemptResult['payment'];
  startsAt: Date;
  target: PaymentTarget;
}

/**
 * Tahap 1 pembuatan pesanan: semua pemeriksaan (KYC, dompet, penawaran, skenario 8 dan 9, pesanan
 * aktif) lalu pesanan, sisihan token, dan percobaan pertama disimpan di bawah kunci properti.
 * Midtrans belum dipanggil. Dipakai endpoint (Snap) dan skrip demo:siapkan-investor (VA Core API).
 */
export async function reservePurchase(offeringId: string, investorId: string, tokenAmount: number): Promise<ReservedPurchase> {
  const offering = await prisma.offering.findUnique({ where: { id: offeringId }, include: { property: true } });
  if (!offering) throw new AppError(404, 'NOT_FOUND', 'Penawaran tidak ditemukan.');
  const investor = await prisma.user.findUniqueOrThrow({ where: { id: investorId }, select: { name: true, email: true } });

  await assertInvestorReady(investorId);

  const created = await withAdvisoryLock(offeringLockKey(offering.propertyId), async (tx) => {
    const now = new Date();
    await assertCanReserve(tx, offering.id, offering.property.maxTokensPerInvestor, investorId, tokenAmount, now);
    if (!midtrans.serverKey()) throw midtransNotConfigured();

    // Nomor urut per properti. Aman dihitung karena semua pesanan properti ini antre di kunci yang sama.
    const sequence = (await tx.tokenPurchase.count({ where: { offering: { propertyId: offering.propertyId } } })) + 1;
    const orderNumber = buildPurchaseOrderNumber(offering.property.code, sequence);
    const expiresAt = paymentDeadline(now);
    const amountIdr = offering.property.tokenPriceIdr * BigInt(tokenAmount);

    const purchase = await tx.tokenPurchase.create({
      data: {
        offeringId: offering.id,
        investorId,
        orderNumber,
        tokenAmount,
        amountIdr,
        status: 'PENDING_PAYMENT',
        reservedUntil: expiresAt,
      },
    });
    const payment = await tx.payment.create({
      data: { orderId: buildPurchaseOrderId(orderNumber, 1), tokenPurchaseId: purchase.id, attempt: 1, amountIdr, expiresAt },
    });
    return { purchase, payment, startsAt: now };
  });

  return { ...created, target: purchaseTarget({ purchase: created.purchase, offering, investor }) };
}

/** POST /offerings/:id/purchases. Membuat pesanan, menyisihkan token, lalu membuat transaksi Snap. */
export async function createPurchase(offeringId: string, investorId: string, tokenAmount: number): Promise<PurchaseResult> {
  const reserved = await reservePurchase(offeringId, investorId, tokenAmount);
  const opened = await openSnapTransaction(reserved.target, reserved.payment, reserved.startsAt);
  if (opened) return { purchase: reserved.purchase, payment: opened };

  // order_id pertama sudah terpakai di Midtrans: lanjut ke sufiks -2 dan seterusnya. Sisihan
  // diperbarui sampai batas bayar percobaan baru.
  const { payment } = await startPayment(reserved.target, 1);
  return { purchase: reserved.purchase, payment };
}

/** Sasaran pembayaran untuk pesanan milik `investorId`. */
export async function loadPurchaseTarget(purchaseId: string, investorId: string): Promise<PaymentTarget> {
  const purchase = await prisma.tokenPurchase.findFirst({
    where: { id: purchaseId, investorId },
    include: { offering: { include: { property: true } }, investor: { select: { name: true, email: true } } },
  });
  if (!purchase) throw purchaseNotFound();
  return purchaseTarget({ purchase, offering: purchase.offering, investor: purchase.investor });
}

/** POST /purchases/:id/payments. Melanjutkan percobaan aktif, atau bayar ulang dengan sufiks baru. */
export async function continuePurchasePayment(purchaseId: string, investorId: string): Promise<PaymentAttemptResult> {
  return startPayment(await loadPurchaseTarget(purchaseId, investorId));
}
