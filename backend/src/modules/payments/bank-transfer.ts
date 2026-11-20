// Percobaan bayar sewa lewat virtual account Core API, khusus skrip demo:bayar-sewa.
//
// Sandbox Midtrans tidak punya API resmi untuk membayar VA atau QRIS; pembayaran selalu lewat
// halaman simulator. Supaya langkah manual sesedikit mungkin, skrip membuat VA langsung lewat
// Core API sehingga nomornya bisa dicetak di terminal, tanpa membuka Snap dan memilih bank dulu.
//
// Aturan percobaan sama dengan tombol Bayar penghuni: kunci per tagihan yang sama, order_id
// bersufiks, batas 5 menit, percobaan disimpan sebelum Midtrans dipanggil. Status lunas tetap
// hanya diubah webhook.
import type { Payment, Prisma } from '../../generated/prisma/client.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { prisma } from '../../lib/prisma.js';
import {
  midtrans,
  MidtransUnavailableError,
  OrderIdTakenError,
  type VirtualAccountBank,
  virtualAccountNumber,
} from './midtrans.js';
import { buildRentOrderId } from './order-id.js';
import {
  billLockKey,
  closeStaleAttempt,
  isOrderIdUsedAtMidtrans,
  markOrderIdTaken,
  MAX_ORDER_ID_SKIPS,
  midtransNotConfigured,
  midtransUnavailable,
  paymentDeadline,
} from './service.js';

export type BankTransferAttempt =
  /** Tagihan sudah lunas, tidak ada yang perlu dibayar. */
  | { kind: 'already-paid' }
  /** Penghuni sedang membayar lewat Snap; skrip tidak mengganggu percobaan itu. */
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

const billForTransfer = {
  room: { include: { property: true } },
  tenant: true,
} satisfies Prisma.BillInclude;

/** Percobaan VA dari skrip: tanpa token Snap, tetapi sudah punya transaction_id Midtrans. */
function isScriptAttempt(payment: Payment): boolean {
  return payment.snapToken === null && payment.providerTransactionId !== null;
}

/**
 * Membuat VA untuk tagihan `billId`, atau memakai lagi VA aktif dari jalannya skrip sebelumnya.
 * order_id yang sudah dipakai di Midtrans dilewati, sama seperti tombol Bayar.
 */
export async function openBankTransferAttempt(billId: string, bank: VirtualAccountBank): Promise<BankTransferAttempt> {
  const bill = await prisma.bill.findUniqueOrThrow({ where: { id: billId }, include: billForTransfer });
  const skippedOrderIds: string[] = [];

  for (let skips = 0; skips < MAX_ORDER_ID_SKIPS; skips += 1) {
    const decision = await decide(bill);
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
        const charged = await charge(bill, bank, decision.payment, decision.startsAt);
        if (charged) return { kind: 'ready', ...charged, created: true, skippedOrderIds };
        skippedOrderIds.push(decision.payment.orderId);
      }
    }
  }
  throw midtransUnavailable();
}

type BillForTransfer = Prisma.BillGetPayload<{ include: typeof billForTransfer }>;

function decide(bill: BillForTransfer): Promise<Decision> {
  return withAdvisoryLock(billLockKey(bill.id), async (tx): Promise<Decision> => {
    const { status } = await tx.bill.findUniqueOrThrow({ where: { id: bill.id }, select: { status: true } });
    if (status === 'PAID') return { kind: 'already-paid' };

    const now = new Date();
    const latest = await tx.payment.findFirst({ where: { billId: bill.id }, orderBy: { attempt: 'desc' } });
    if (latest?.status === 'PENDING' && latest.expiresAt > now) {
      return isScriptAttempt(latest) ? { kind: 'reuse', payment: latest } : { kind: 'busy', payment: latest };
    }

    if (!midtrans.serverKey()) throw midtransNotConfigured();
    if (latest?.status === 'PENDING') await closeStaleAttempt(tx, latest, now);

    const attempt = (latest?.attempt ?? 0) + 1;
    const payment = await tx.payment.create({
      data: {
        orderId: buildRentOrderId({
          propertyCode: bill.room.property.code,
          roomNumber: bill.room.number,
          period: bill.period,
          attempt,
        }),
        billId: bill.id,
        attempt,
        amountIdr: bill.amountIdr,
        expiresAt: paymentDeadline(now),
      },
    });
    return { kind: 'open', payment, startsAt: now };
  });
}

/** Membuat VA untuk percobaan baru. Null bila order_id-nya sudah dipakai di Midtrans. */
async function charge(
  bill: BillForTransfer,
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
      itemName: `Sewa ${bill.room.number} ${bill.period}`,
      bank,
      customer: { name: bill.tenant.name, email: bill.tenant.email },
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
    await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
    throw midtransUnavailable();
  }
}
