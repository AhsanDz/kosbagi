// Percobaan bayar lewat virtual account Core API, khusus skrip demo: demo:bayar-sewa (tagihan sewa)
// dan demo:siapkan-investor (pesanan token, P4).
//
// Sandbox Midtrans tidak punya API resmi untuk membayar VA atau QRIS; pembayaran selalu lewat
// halaman simulator. Supaya langkah manual sesedikit mungkin, skrip membuat VA langsung lewat
// Core API sehingga nomornya bisa dicetak di terminal, tanpa membuka Snap dan memilih bank dulu.
//
// Aturan percobaan sama dengan tombol Bayar: sasaran pembayaran (PaymentTarget) yang sama dengan
// endpoint, jadi kunci, order_id bersufiks, batas 5 menit, pemeriksaan ulang kuota pesanan token,
// dan tolakan PERIOD_CLOSED (P4) ikut berlaku. Percobaan disimpan sebelum Midtrans dipanggil.
// Status lunas tetap hanya diubah webhook.
import type { Payment } from '../../generated/prisma/client.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { loadPurchaseTarget, reservePurchase } from '../purchases/service.js';
import {
  midtrans,
  MidtransUnavailableError,
  OrderIdTakenError,
  type VirtualAccountBank,
  virtualAccountNumber,
} from './midtrans.js';
import {
  closeStaleAttempt,
  isOrderIdUsedAtMidtrans,
  loadRentTarget,
  markOrderIdTaken,
  MAX_ORDER_ID_SKIPS,
  midtransNotConfigured,
  midtransUnavailable,
  type PaymentTarget,
  paymentDeadline,
  SNAP_IN_FLIGHT_MS,
} from './service.js';

export type BankTransferAttempt =
  /** Tagihan atau pesanan sudah lunas, tidak ada yang perlu dibayar. */
  | { kind: 'already-paid' }
  /** Pengguna sedang membayar lewat Snap; skrip tidak mengganggu percobaan itu. */
  | { kind: 'busy'; payment: Payment }
  /**
   * VA siap dibayar di simulator. `created` false bila VA dari jalannya skrip sebelumnya dipakai lagi.
   * `skippedOrderIds` berisi order_id yang dilewati karena sudah dipakai di Midtrans.
   */
  | { kind: 'ready'; payment: Payment; vaNumber: string; created: boolean; skippedOrderIds: string[] };

type Decision =
  | { kind: 'already-paid' }
  | { kind: 'busy'; payment: Payment }
  | { kind: 'reuse'; payment: Payment }
  | { kind: 'open'; payment: Payment; startsAt: Date };

/** Kode error ensurePayable yang berarti sasaran sudah lunas. */
const ALREADY_PAID_CODES = new Set(['BILL_ALREADY_PAID', 'PURCHASE_ALREADY_PAID']);

/** Percobaan VA dari skrip: tanpa token Snap, tetapi sudah punya transaction_id Midtrans. */
function isScriptAttempt(payment: Payment): boolean {
  return payment.snapToken === null && payment.providerTransactionId !== null;
}

/** Percobaan tanpa token dan tanpa transaksi yang mungkin masih sedang dibuat proses lain. */
function isInFlight(payment: Payment, now: Date): boolean {
  return (
    payment.snapToken === null &&
    payment.providerTransactionId === null &&
    now.getTime() - payment.createdAt.getTime() < SNAP_IN_FLIGHT_MS
  );
}

function decide(target: PaymentTarget): Promise<Decision> {
  return withAdvisoryLock(target.lockKey, async (tx): Promise<Decision> => {
    try {
      await target.ensurePayable(tx);
    } catch (error) {
      if (error instanceof AppError && ALREADY_PAID_CODES.has(error.code)) return { kind: 'already-paid' };
      throw error;
    }

    const now = new Date();
    const latest = await tx.payment.findFirst({ where: target.link, orderBy: { attempt: 'desc' } });
    if (latest?.status === 'PENDING' && latest.expiresAt > now) {
      if (isScriptAttempt(latest)) return { kind: 'reuse', payment: latest };
      // Snap aktif, atau percobaan yang baru dibuat proses lain: jangan diganggu.
      if (latest.snapToken !== null || isInFlight(latest, now)) return { kind: 'busy', payment: latest };
    }

    if (!midtrans.serverKey()) throw midtransNotConfigured();
    if (latest?.status === 'PENDING') await closeStaleAttempt(tx, latest, now);

    const expiresAt = paymentDeadline(now);
    await target.prepareNewAttempt?.(tx, expiresAt, now);

    const attempt = (latest?.attempt ?? 0) + 1;
    const payment = await tx.payment.create({
      data: { orderId: target.orderId(attempt), ...target.link, attempt, amountIdr: target.amountIdr, expiresAt },
    });
    return { kind: 'open', payment, startsAt: now };
  });
}

/** Nama barang di Core API: satu baris berharga penuh, jumlah token ditulis di nama. */
function itemNameOf(target: PaymentTarget): string {
  const quantity = target.snap.quantity ?? 1;
  return quantity > 1 ? `${target.snap.itemName} x${quantity}` : target.snap.itemName;
}

/** Membuat VA untuk percobaan baru. Null bila order_id-nya sudah dipakai di Midtrans. */
async function charge(
  target: PaymentTarget,
  bank: VirtualAccountBank,
  payment: Payment,
  startsAt: Date,
): Promise<{ payment: Payment; vaNumber: string } | null> {
  try {
    if (await isOrderIdUsedAtMidtrans(payment.orderId)) {
      await markOrderIdTaken(payment);
      return null;
    }
    const result = await midtrans.chargeBankTransfer({
      orderId: payment.orderId,
      amountIdr: payment.amountIdr,
      itemName: itemNameOf(target),
      bank,
      customer: target.snap.customer,
      startsAt,
    });
    const saved = await prisma.payment.update({
      where: { id: payment.id },
      data: { providerTransactionId: result.transactionId, bank: result.bank, providerStatus: 'pending' },
    });
    return { payment: saved, vaNumber: result.vaNumber };
  } catch (error) {
    if (error instanceof OrderIdTakenError) {
      await markOrderIdTaken(payment);
      return null;
    }
    if (!(error instanceof MidtransUnavailableError)) throw error;
    // Sama dengan Snap yang gagal dibuat: percobaan FAILED, sisihan token pesanan dilepas.
    await withAdvisoryLock(target.lockKey, async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      if (count === 1) await target.onOpenFailed?.(tx, payment);
    });
    throw midtransUnavailable();
  }
}

/**
 * Membuat VA untuk sasaran, atau memakai lagi VA aktif dari jalannya skrip sebelumnya. order_id yang
 * sudah dipakai di Midtrans dilewati, sama seperti tombol Bayar.
 */
export async function openBankTransferForTarget(
  target: PaymentTarget,
  bank: VirtualAccountBank,
  first?: { payment: Payment; startsAt: Date },
): Promise<BankTransferAttempt> {
  const skippedOrderIds: string[] = [];

  if (first) {
    const charged = await charge(target, bank, first.payment, first.startsAt);
    if (charged) return { kind: 'ready', ...charged, created: true, skippedOrderIds };
    skippedOrderIds.push(first.payment.orderId);
  }

  for (let skips = skippedOrderIds.length; skips < MAX_ORDER_ID_SKIPS; skips += 1) {
    const decision = await decide(target);
    switch (decision.kind) {
      case 'already-paid':
      case 'busy':
        return decision;
      case 'reuse': {
        const status = await midtrans.getTransactionStatus(decision.payment.orderId);
        const vaNumber = status ? virtualAccountNumber(status) : null;
        if (!vaNumber) return { kind: 'busy', payment: decision.payment };
        return { kind: 'ready', payment: decision.payment, vaNumber, created: false, skippedOrderIds };
      }
      case 'open': {
        const charged = await charge(target, bank, decision.payment, decision.startsAt);
        if (charged) return { kind: 'ready', ...charged, created: true, skippedOrderIds };
        skippedOrderIds.push(decision.payment.orderId);
      }
    }
  }
  throw midtransUnavailable();
}

/** VA untuk tagihan sewa `billId` (demo:bayar-sewa). */
export async function openBankTransferAttempt(billId: string, bank: VirtualAccountBank): Promise<BankTransferAttempt> {
  return openBankTransferForTarget(await loadRentTarget(billId), bank);
}

/**
 * Pesanan token baru dengan VA (demo:siapkan-investor, P4). Pemeriksaannya sama dengan
 * POST /offerings/:id/purchases (KYC, dompet tercatat, sisa penawaran, batas 10%, pesanan aktif);
 * bedanya hanya pembayarannya VA Core API, bukan Snap.
 */
export async function openPurchaseBankTransfer(
  offeringId: string,
  investorId: string,
  tokenAmount: number,
  bank: VirtualAccountBank,
): Promise<{ purchaseId: string; attempt: BankTransferAttempt }> {
  const reserved = await reservePurchase(offeringId, investorId, tokenAmount);
  const attempt = await openBankTransferForTarget(reserved.target, bank, {
    payment: reserved.payment,
    startsAt: reserved.startsAt,
  });
  return { purchaseId: reserved.purchase.id, attempt };
}

/** VA untuk pesanan yang sudah ada, mis. setelah VA sebelumnya kedaluwarsa. */
export async function continuePurchaseBankTransfer(
  purchaseId: string,
  investorId: string,
  bank: VirtualAccountBank,
): Promise<BankTransferAttempt> {
  return openBankTransferForTarget(await loadPurchaseTarget(purchaseId, investorId), bank);
}
