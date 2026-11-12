// Membuat percobaan pembayaran sewa. Status lunas tidak pernah diubah di sini: satu-satunya
// pintu perubahan status adalah webhook (src/modules/webhooks/service.ts).
//
// Pembuatan percobaan dibagi dua tahap supaya koneksi basis data tidak tertahan selama Midtrans
// dipanggil:
//   1. decideAttempt: transaksi pendek berkunci per tagihan, memutuskan apa yang harus dilakukan
//      dan menyimpan percobaan baru. Hanya satu permintaan per tagihan yang masuk di satu waktu,
//      jadi tidak pernah ada dua percobaan aktif.
//   2. Di luar transaksi: permintaan yang membuat percobaan memanggil Midtrans, permintaan lain
//      untuk tagihan yang sama menunggu token dari permintaan itu.
import { setTimeout as sleep } from 'node:timers/promises';
import type { Payment, Prisma } from '../../generated/prisma/client.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { midtrans, MIDTRANS_TIMEOUT_MS, MidtransUnavailableError, PAYMENT_WINDOW_MINUTES } from './midtrans.js';
import { buildRentOrderId } from './order-id.js';

/**
 * Umur maksimal percobaan tanpa token yang masih mungkin sedang diproses. Harus lebih besar dari
 * batas waktu Midtrans: baris yang lebih tua pasti sisa proses yang mati, bukan sedang berjalan.
 */
const SNAP_IN_FLIGHT_MS = MIDTRANS_TIMEOUT_MS + 2_000;

const TOKEN_POLL_INTERVAL_MS = 150;

const billForPayment = {
  room: { include: { property: true } },
  tenant: true,
} satisfies Prisma.BillInclude;

type BillForPayment = Prisma.BillGetPayload<{ include: typeof billForPayment }>;

export interface RentPaymentResult {
  payment: Payment;
  /** true bila percobaan baru dibuat, false bila percobaan aktif dipakai lagi. */
  created: boolean;
}

type AttemptDecision =
  | { kind: 'resume'; payment: Payment }
  | { kind: 'wait-for-token'; payment: Payment }
  | { kind: 'open'; payment: Payment; startsAt: Date };

function midtransUnavailable(): AppError {
  return new AppError(502, 'MIDTRANS_UNAVAILABLE', 'Layanan pembayaran sedang bermasalah. Coba lagi beberapa saat lagi.');
}

/** Percobaan yang masih bisa dilanjutkan penghuni dengan token Snap yang sama. */
function isResumable(payment: Payment, now: Date): boolean {
  return payment.status === 'PENDING' && payment.expiresAt > now && payment.snapToken !== null;
}

/** Percobaan yang baru saja dibuat permintaan lain dan masih menunggu jawaban Midtrans. */
function isInFlight(payment: Payment, now: Date): boolean {
  return (
    payment.status === 'PENDING' &&
    payment.snapToken === null &&
    now.getTime() - payment.createdAt.getTime() < SNAP_IN_FLIGHT_MS
  );
}

/**
 * Menutup percobaan PENDING yang tidak bisa dilanjutkan sebelum percobaan baru dibuat. Yang masih
 * dalam batas bayar tetapi tanpa token adalah sisa proses yang mati saat memanggil Midtrans.
 * Bersyarat status PENDING supaya pelunasan dari webhook yang datang bersamaan tidak tertimpa.
 */
async function closeStaleAttempt(tx: Prisma.TransactionClient, payment: Payment, now: Date): Promise<void> {
  await tx.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: { status: payment.expiresAt <= now ? 'EXPIRED' : 'FAILED' },
  });
}

/**
 * Tahap 1. Semua query lewat `tx`, supaya satu permintaan tidak pernah memegang dua koneksi.
 * Percobaan baru tersimpan begitu transaksi selesai, sebelum Midtrans dipanggil, jadi kegagalan
 * Midtrans tercatat sebagai FAILED, bukan keadaan tak dikenal.
 *
 * Status tagihan dan percobaan terakhir dibaca ulang setelah kunci didapat. Query-nya sengaja
 * tanpa `include`: Prisma memuat relasi secara paralel di satu koneksi transaksi, yang ditolak
 * mulai pg 9.
 */
function decideAttempt(bill: BillForPayment): Promise<AttemptDecision> {
  return withAdvisoryLock(`bill-payment:${bill.id}`, async (tx) => {
    const { status } = await tx.bill.findUniqueOrThrow({ where: { id: bill.id }, select: { status: true } });
    if (status === 'PAID') throw new AppError(409, 'BILL_ALREADY_PAID', 'Tagihan ini sudah lunas.');

    const now = new Date();
    const latest = await tx.payment.findFirst({ where: { billId: bill.id }, orderBy: { attempt: 'desc' } });
    if (latest && isResumable(latest, now)) return { kind: 'resume', payment: latest };
    if (latest && isInFlight(latest, now)) return { kind: 'wait-for-token', payment: latest };

    if (!midtrans.serverKey()) {
      throw new AppError(503, 'MIDTRANS_NOT_CONFIGURED', 'Pembayaran belum dikonfigurasi di server.');
    }
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
        expiresAt: new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60_000),
      },
    });
    return { kind: 'open', payment, startsAt: now };
  });
}

/** Tahap 2 untuk permintaan yang membuat percobaan. Tidak ada transaksi yang terbuka di sini. */
async function openSnapTransaction(payment: Payment, bill: BillForPayment, startsAt: Date): Promise<Payment> {
  try {
    const snap = await midtrans.createSnapTransaction({
      orderId: payment.orderId,
      amountIdr: payment.amountIdr,
      itemName: `Sewa ${bill.room.number} ${bill.period}`,
      customer: { name: bill.tenant.name, email: bill.tenant.email },
      startsAt,
    });
    return await prisma.payment.update({
      where: { id: payment.id },
      data: { snapToken: snap.token, snapRedirectUrl: snap.redirectUrl },
    });
  } catch (error) {
    if (!(error instanceof MidtransUnavailableError)) throw error;
    await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
    throw midtransUnavailable();
  }
}

/**
 * Tahap 2 untuk klik ganda: menunggu token dari permintaan yang sedang memanggil Midtrans. Tidak
 * memegang koneksi saat tidur. Bila permintaan itu gagal atau prosesnya mati, klik ini ikut
 * dibalas 502, bukan mencoba sendiri: saat Midtrans mati, percobaan ulang beruntun dari setiap
 * klik hanya menumpuk percobaan gagal. Klik berikutnya yang membuat percobaan baru.
 */
async function waitForSnapToken(payment: Payment): Promise<Payment> {
  const deadline = payment.createdAt.getTime() + SNAP_IN_FLIGHT_MS;

  while (Date.now() < deadline) {
    await sleep(TOKEN_POLL_INTERVAL_MS);
    const current = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    if (current.snapToken !== null) return current;
    if (current.status !== 'PENDING') break;
  }
  throw midtransUnavailable();
}

/** Mengembalikan percobaan aktif, atau membuat percobaan baru untuk tagihan milik `tenantId`. */
export async function createRentPayment(billId: string, tenantId: string): Promise<RentPaymentResult> {
  // Data yang tidak berubah dibaca sebelum kunci, supaya kunci dipegang sesingkat mungkin.
  const bill = await prisma.bill.findFirst({ where: { id: billId, tenantId }, include: billForPayment });
  if (!bill) throw new AppError(404, 'NOT_FOUND', 'Tagihan tidak ditemukan.');

  const decision = await decideAttempt(bill);

  switch (decision.kind) {
    case 'resume':
      return { payment: decision.payment, created: false };
    case 'wait-for-token':
      return { payment: await waitForSnapToken(decision.payment), created: false };
    case 'open':
      return { payment: await openSnapTransaction(decision.payment, bill, decision.startsAt), created: true };
  }
}
