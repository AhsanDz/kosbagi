// Pelunasan dan penutupan percobaan pesanan token (order BUY-), dipanggil dari service.ts setelah
// signature, cek ulang status, dan nominal lolos.
//
// Semua perubahan berjalan di bawah kunci properti yang sama dengan pembuatan pesanan, jadi
// pelunasan, pelepasan sisihan, dan pesanan baru tidak pernah saling menyalip.
import type { Prisma } from '../../generated/prisma/client.js';
import type { PaymentStatus } from '../../generated/prisma/enums.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { checkTokenAmount } from '../offerings/quota.js';
import { loadQuotaInput } from '../offerings/state.js';
import type { TransactionStatus } from '../payments/midtrans.js';
import { offeringLockKey } from '../purchases/service.js';
import { writeTransferTokensJob } from '../../queue/outbox.js';
import { providerFields, recordAnomaly, updateOpenAttempt, type WebhookOutcome } from './records.js';

export const purchaseForSettlement = {
  offering: { include: { property: true } },
} satisfies Prisma.TokenPurchaseInclude;

type PurchaseForSettlement = Prisma.TokenPurchaseGetPayload<{ include: typeof purchaseForSettlement }>;

export interface PurchasePayment {
  id: string;
  orderId: string;
  status: PaymentStatus;
  tokenPurchase: PurchaseForSettlement;
}

const SETTLED_PAYMENT_STATUSES = new Set<PaymentStatus>(['PAID', 'DUPLICATE_PAID', 'UNFULFILLED']);

/**
 * Melunasi pesanan dalam satu transaksi DB: pesanan PAID, percobaan PAID, tokensSold bertambah,
 * penawaran ditutup bila habis, dan baris outbox TRANSFER_TOKENS. Semuanya tersimpan bersama atau
 * tidak sama sekali.
 *
 * Selama sisihan pesanan masih berlaku, tokennya pasti tersedia. Bila sisihan sudah lepas, mis.
 * notifikasi settlement terlambat setelah batas bayar, kuota diperiksa ulang. Bila token sudah
 * diambil pesanan lain atau melewati batas 10%, pesanan tidak dipenuhi dan dicatat anomali
 * PURCHASE_UNFULFILLABLE untuk pengembalian dana.
 */
export function settleTokenPurchase(payment: PurchasePayment, status: TransactionStatus): Promise<WebhookOutcome> {
  const { offering } = payment.tokenPurchase;

  return withAdvisoryLock(offeringLockKey(offering.propertyId), async (tx) => {
    const now = new Date();
    const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id }, select: { status: true } });
    if (SETTLED_PAYMENT_STATUSES.has(current.status)) return 'ALREADY_PAID';

    const purchase = await tx.tokenPurchase.findUniqueOrThrow({ where: { id: payment.tokenPurchase.id } });
    const anomalyBase = {
      orderId: payment.orderId,
      paymentId: payment.id,
      expectedAmountIdr: purchase.amountIdr,
      receivedAmountIdr: purchase.amountIdr,
      providerStatus: status.transaction_status,
    };

    if (purchase.status === 'PAID') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'DUPLICATE_PAID', paidAt: now, ...providerFields(status) },
      });
      await recordAnomaly(tx, {
        ...anomalyBase,
        type: 'DUPLICATE_PURCHASE_PAYMENT',
        note: 'Pesanan sudah lunas lewat order lain. Dana percobaan ini perlu dikembalikan.',
      });
      return 'DUPLICATE_PURCHASE_PAYMENT';
    }

    const freshOffering = await tx.offering.findUniqueOrThrow({ where: { id: offering.id } });
    const stillReserved =
      purchase.status === 'PENDING_PAYMENT' && purchase.reservedUntil !== null && purchase.reservedUntil > now;
    if (!stillReserved) {
      const quota = await loadQuotaInput(tx, {
        offering: freshOffering,
        maxPerInvestor: offering.property.maxTokensPerInvestor,
        investorId: purchase.investorId,
        now,
        excludePurchaseId: purchase.id,
      });
      const rejection =
        freshOffering.status === 'CANCELLED' ? 'penawaran dibatalkan' : checkTokenAmount(purchase.tokenAmount, quota)?.message;
      if (rejection) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'UNFULFILLED', paidAt: now, ...providerFields(status) },
        });
        if (purchase.status === 'PENDING_PAYMENT') {
          await tx.tokenPurchase.update({ where: { id: purchase.id }, data: { status: 'EXPIRED' } });
        }
        await recordAnomaly(tx, {
          ...anomalyBase,
          type: 'PURCHASE_UNFULFILLABLE',
          note: `Terbayar setelah sisihan lepas dan tidak bisa dipenuhi: ${rejection} Dana perlu dikembalikan.`,
        });
        return 'PURCHASE_UNFULFILLABLE';
      }
    }

    const wallet = await tx.custodialWallet.findUnique({ where: { userId: purchase.investorId } });
    // Tidak mungkin terjadi lewat API, karena pesanan butuh dompet yang sudah tercatat. Bila
    // terjadi, transaksi batal, webhook dibalas 500, dan Midtrans mengirim ulang nanti.
    if (!wallet) throw new Error(`Dompet kustodian untuk pesanan ${purchase.id} tidak ditemukan.`);

    await tx.tokenPurchase.update({ where: { id: purchase.id }, data: { status: 'PAID' } });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: now, ...providerFields(status) },
    });

    const sold = await tx.offering.update({
      where: { id: offering.id },
      data: { tokensSold: { increment: purchase.tokenAmount } },
    });
    if (sold.tokensSold >= sold.tokensOffered && sold.status === 'OPEN') {
      await tx.offering.update({ where: { id: offering.id }, data: { status: 'CLOSED' } });
    }

    await writeTransferTokensJob(tx, {
      tokenPurchaseId: purchase.id,
      paymentId: payment.id,
      orderId: payment.orderId,
      propertyCode: offering.property.code,
      walletAddress: wallet.address,
      tokenAmount: purchase.tokenAmount,
    });
    return 'SETTLED';
  });
}

/**
 * expire, cancel, deny, atau failure untuk percobaan pesanan. Percobaan ditutup, dan bila percobaan
 * itu yang terakhir, pesanan ikut EXPIRED atau FAILED sehingga sisihan tokennya lepas. Notifikasi
 * untuk percobaan lama tidak menyentuh sisihan percobaan yang lebih baru.
 */
export function closePurchaseAttempt(
  payment: PurchasePayment,
  status: TransactionStatus,
  nextStatus: 'EXPIRED' | 'FAILED',
): Promise<WebhookOutcome> {
  const purchaseId = payment.tokenPurchase.id;

  return withAdvisoryLock(offeringLockKey(payment.tokenPurchase.offering.propertyId), async (tx) => {
    const changed = await updateOpenAttempt(tx, payment, status, nextStatus);
    if (!changed) return 'NO_CHANGE';

    const latest = await tx.payment.findFirst({
      where: { tokenPurchaseId: purchaseId },
      orderBy: { attempt: 'desc' },
      select: { id: true },
    });
    if (latest?.id === payment.id) {
      await tx.tokenPurchase.updateMany({
        where: { id: purchaseId, status: 'PENDING_PAYMENT' },
        data: { status: nextStatus },
      });
    }
    return 'ATTEMPT_UPDATED';
  });
}
