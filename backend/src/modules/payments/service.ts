// Membuat percobaan pembayaran untuk tagihan sewa (RENT-) dan pesanan token (BUY-). Status lunas
// tidak pernah diubah di sini: satu-satunya pintu perubahan status adalah webhook
// (src/modules/webhooks/service.ts).
//
// Pembuatan percobaan dibagi dua tahap supaya koneksi basis data tidak tertahan selama Midtrans
// dipanggil:
//   1. decideAttempt: transaksi pendek berkunci per sasaran, memutuskan apa yang harus dilakukan
//      dan menyimpan percobaan baru. Hanya satu permintaan per sasaran yang masuk di satu waktu,
//      jadi tidak pernah ada dua percobaan aktif.
//   2. Di luar transaksi: permintaan yang membuat percobaan memanggil Midtrans, permintaan lain
//      untuk sasaran yang sama menunggu token dari permintaan itu.
//
// Tagihan dan pesanan token memakai aturan yang sama. Bedanya dirangkum di PaymentTarget: kunci,
// format order_id, nominal, isi Snap, dan pemeriksaan tambahan sebelum percobaan baru dibuat.
//
// order_id yang sudah dipakai di Midtrans: nomor percobaan mulai lagi dari 1 setiap basis data
// diisi ulang, sedangkan akun sandbox menyimpan semua order_id lama. Sebelum Snap dibuat, order_id
// percobaan baru ditanyakan ke API status Midtrans. Bila transaksinya sudah ada (atau Midtrans
// menolak dengan kode 406), percobaan itu ditandai ORDER_ID_TAKEN dan percobaan berikutnya dengan
// sufiks baru langsung dibuat di permintaan yang sama, sampai MAX_ORDER_ID_SKIPS kali. Percobaan
// yang ditandai tidak pernah bisa melunasi apa pun; notifikasinya dicatat sebagai anomali.
import { setTimeout as sleep } from 'node:timers/promises';
import type { Payment, Prisma } from '../../generated/prisma/client.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import {
  midtrans,
  MIDTRANS_TIMEOUT_MS,
  MidtransUnavailableError,
  OrderIdTakenError,
  PAYMENT_WINDOW_MINUTES,
  type SnapTransactionInput,
} from './midtrans.js';
import { buildRentOrderId } from './order-id.js';

/**
 * Umur maksimal percobaan tanpa token yang masih mungkin sedang diproses. Harus lebih besar dari
 * dua panggilan Midtrans (cek order_id lalu Snap): baris yang lebih tua pasti sisa proses yang
 * mati, bukan sedang berjalan.
 */
export const SNAP_IN_FLIGHT_MS = MIDTRANS_TIMEOUT_MS * 2 + 2_000;

/**
 * Penanda di `payments.provider_status` untuk percobaan yang order_id-nya sudah dipakai di Midtrans.
 * Status percobaannya FAILED. Skema tidak diubah supaya basis data jalur lain tidak perlu migrasi.
 */
export const ORDER_ID_TAKEN = 'ORDER_ID_TAKEN';

/** Berapa order_id terpakai yang paling banyak dilewati dalam satu permintaan. */
export const MAX_ORDER_ID_SKIPS = 5;

const TOKEN_POLL_INTERVAL_MS = 150;

/** Isi Snap yang berbeda per sasaran. order_id, nominal, dan waktu mulai diisi mesin ini. */
export type SnapDetails = Omit<SnapTransactionInput, 'orderId' | 'amountIdr' | 'startsAt'>;

/** Sasaran pembayaran: satu tagihan sewa atau satu pesanan token. */
export interface PaymentTarget {
  /** Nama kunci advisory yang menyerialkan semua perubahan sasaran ini. */
  lockKey: string;
  /** Kolom penghubung percobaan ke sasaran. */
  link: { billId: string } | { tokenPurchaseId: string };
  amountIdr: bigint;
  /** order_id untuk percobaan ke-`attempt`. */
  orderId(attempt: number): string;
  snap: SnapDetails;
  /**
   * Dipanggil setelah kunci didapat. Melempar AppError bila sasaran sudah tidak bisa dibayar,
   * mis. tagihan sudah lunas. Semua query wajib lewat `tx`.
   */
  ensurePayable(tx: Prisma.TransactionClient): Promise<void>;
  /**
   * Dipanggil hanya bila percobaan baru akan dibuat, sebelum percobaan disimpan. Pesanan token
   * memakainya untuk memeriksa ulang kuota dan menyisihkan token sampai `expiresAt`.
   */
  prepareNewAttempt?(tx: Prisma.TransactionClient, expiresAt: Date, now: Date): Promise<void>;
  /** Dipanggil di dalam kunci bila Midtrans gagal membuat transaksi untuk `payment`. */
  onOpenFailed?(tx: Prisma.TransactionClient, payment: Payment): Promise<void>;
}

export interface PaymentAttemptResult {
  payment: Payment;
  /** true bila percobaan baru dibuat, false bila percobaan aktif dipakai lagi. */
  created: boolean;
}

type AttemptDecision =
  | { kind: 'resume'; payment: Payment }
  | { kind: 'wait-for-token'; payment: Payment }
  | { kind: 'open'; payment: Payment; startsAt: Date };

export function midtransUnavailable(): AppError {
  return new AppError(502, 'MIDTRANS_UNAVAILABLE', 'Layanan pembayaran sedang bermasalah. Coba lagi beberapa saat lagi.');
}

function orderIdsExhausted(): AppError {
  return new AppError(
    502,
    'MIDTRANS_UNAVAILABLE',
    'Nomor pembayaran berikutnya juga sudah terpakai di Midtrans. Tekan Bayar lagi untuk mencoba nomor lain.',
  );
}

/** Percobaan yang ditandai karena order_id-nya sudah dipakai di Midtrans sebelum percobaan dibuat. */
export function isOrderIdTakenAttempt(payment: Pick<Payment, 'status' | 'providerStatus'>): boolean {
  return payment.status === 'FAILED' && payment.providerStatus === ORDER_ID_TAKEN;
}

/** Menandai percobaan yang order_id-nya sudah dipakai. Bersyarat PENDING, jadi tidak menimpa status lain. */
export async function markOrderIdTaken(payment: Pick<Payment, 'id' | 'orderId'>): Promise<void> {
  logger.warn({ orderId: payment.orderId }, 'order_id sudah dipakai di Midtrans, percobaan dilewati');
  await prisma.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: { status: 'FAILED', providerStatus: ORDER_ID_TAKEN },
  });
}

/**
 * Bertanya ke API status Midtrans apakah order_id sudah punya transaksi. Order yang baru punya token
 * Snap tanpa metode bayar dijawab 404 dan masih boleh dipakai: uji sandbox 15 Nov 2026 menunjukkan
 * Snap dan Core API menerimanya lagi.
 */
export async function isOrderIdUsedAtMidtrans(orderId: string): Promise<boolean> {
  return (await midtrans.getTransactionStatus(orderId)) !== null;
}

export function midtransNotConfigured(): AppError {
  return new AppError(503, 'MIDTRANS_NOT_CONFIGURED', 'Pembayaran belum dikonfigurasi di server.');
}

/** Batas bayar percobaan yang dibuat pada `now`. */
export function paymentDeadline(now: Date): Date {
  return new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60_000);
}

/** Percobaan yang masih bisa dilanjutkan dengan token Snap yang sama. */
export function isResumable(payment: Payment, now: Date): boolean {
  return payment.status === 'PENDING' && payment.expiresAt > now && payment.snapToken !== null;
}

/**
 * Percobaan yang baru saja dibuat permintaan lain dan masih menunggu jawaban Midtrans. Percobaan
 * virtual account dari skrip demo:bayar-sewa tidak punya token Snap tetapi sudah punya
 * transaction_id, jadi tidak terhitung sedang diproses.
 */
function isInFlight(payment: Payment, now: Date): boolean {
  return (
    payment.status === 'PENDING' &&
    payment.snapToken === null &&
    payment.providerTransactionId === null &&
    now.getTime() - payment.createdAt.getTime() < SNAP_IN_FLIGHT_MS
  );
}

/**
 * Menutup percobaan PENDING yang tidak bisa dilanjutkan sebelum percobaan baru dibuat. Yang masih
 * dalam batas bayar tetapi tanpa token adalah sisa proses yang mati saat memanggil Midtrans.
 * Bersyarat status PENDING supaya pelunasan dari webhook yang datang bersamaan tidak tertimpa.
 */
export async function closeStaleAttempt(tx: Prisma.TransactionClient, payment: Payment, now: Date): Promise<void> {
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
 * Query di sini sengaja tanpa `include`: Prisma memuat relasi secara paralel di satu koneksi
 * transaksi, yang ditolak mulai pg 9.
 */
function decideAttempt(target: PaymentTarget): Promise<AttemptDecision> {
  return withAdvisoryLock(target.lockKey, async (tx) => {
    await target.ensurePayable(tx);

    const now = new Date();
    const latest = await tx.payment.findFirst({ where: target.link, orderBy: { attempt: 'desc' } });
    if (latest && isResumable(latest, now)) return { kind: 'resume', payment: latest };
    if (latest && isInFlight(latest, now)) return { kind: 'wait-for-token', payment: latest };

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

/**
 * Tahap 2 untuk permintaan yang membuat percobaan. Tidak ada transaksi yang terbuka saat Midtrans
 * dipanggil. Juga dipakai pembuatan pesanan token, yang menyimpan percobaan pertamanya sendiri.
 * Mengembalikan null bila order_id ternyata sudah dipakai di Midtrans; percobaan itu sudah ditandai
 * dan pemanggil membuat percobaan berikutnya.
 */
export async function openSnapTransaction(
  target: PaymentTarget,
  payment: Payment,
  startsAt: Date,
): Promise<Payment | null> {
  try {
    if (await isOrderIdUsedAtMidtrans(payment.orderId)) {
      await markOrderIdTaken(payment);
      return null;
    }
    const snap = await midtrans.createSnapTransaction({
      ...target.snap,
      orderId: payment.orderId,
      amountIdr: payment.amountIdr,
      startsAt,
    });
    return await prisma.payment.update({
      where: { id: payment.id },
      data: { snapToken: snap.token, snapRedirectUrl: snap.redirectUrl },
    });
  } catch (error) {
    if (error instanceof OrderIdTakenError) {
      await markOrderIdTaken(payment);
      return null;
    }
    if (!(error instanceof MidtransUnavailableError)) throw error;
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
 * Tahap 2 untuk klik ganda: menunggu token dari permintaan yang sedang memanggil Midtrans. Tidak
 * memegang koneksi saat tidur. Bila permintaan itu gagal atau prosesnya mati, klik ini ikut
 * dibalas 502, bukan mencoba sendiri: saat Midtrans mati, percobaan ulang beruntun dari setiap
 * klik hanya menumpuk percobaan gagal. Klik berikutnya yang membuat percobaan baru.
 */
async function waitForSnapToken(payment: Payment): Promise<Payment | null> {
  const deadline = payment.createdAt.getTime() + SNAP_IN_FLIGHT_MS;

  while (Date.now() < deadline) {
    await sleep(TOKEN_POLL_INTERVAL_MS);
    const current = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    if (current.snapToken !== null) return current;
    // Permintaan pertama menemukan order_id terpakai dan lanjut ke sufiks berikutnya: ikut lanjut.
    if (isOrderIdTakenAttempt(current)) return null;
    if (current.status !== 'PENDING') break;
  }
  throw midtransUnavailable();
}

/**
 * Mengembalikan percobaan aktif sasaran, atau membuat percobaan baru. `skipped` adalah jumlah
 * order_id terpakai yang sudah dilewati pemanggil.
 */
export async function startPayment(target: PaymentTarget, skipped = 0): Promise<PaymentAttemptResult> {
  for (let skips = skipped; skips < MAX_ORDER_ID_SKIPS; skips += 1) {
    const decision = await decideAttempt(target);

    switch (decision.kind) {
      case 'resume':
        return { payment: decision.payment, created: false };
      case 'wait-for-token': {
        const payment = await waitForSnapToken(decision.payment);
        if (payment) return { payment, created: false };
        break;
      }
      case 'open': {
        const payment = await openSnapTransaction(target, decision.payment, decision.startsAt);
        if (payment) return { payment, created: true };
        break;
      }
    }
  }
  throw orderIdsExhausted();
}

const billForPayment = {
  room: { include: { property: true } },
  tenant: true,
} satisfies Prisma.BillInclude;

type BillForPayment = Prisma.BillGetPayload<{ include: typeof billForPayment }>;

/** Kunci per tagihan. Skrip demo:bayar-sewa memakai kunci yang sama. */
export function billLockKey(billId: string): string {
  return `bill-payment:${billId}`;
}

function rentTarget(bill: BillForPayment): PaymentTarget {
  return {
    lockKey: billLockKey(bill.id),
    link: { billId: bill.id },
    amountIdr: bill.amountIdr,
    orderId: (attempt) =>
      buildRentOrderId({ propertyCode: bill.room.property.code, roomNumber: bill.room.number, period: bill.period, attempt }),
    snap: {
      itemName: `Sewa ${bill.room.number} ${bill.period}`,
      customer: { name: bill.tenant.name, email: bill.tenant.email },
    },
    async ensurePayable(tx) {
      // Dibaca ulang setelah kunci didapat, karena webhook bisa melunasi tagihan sementara itu.
      const { status } = await tx.bill.findUniqueOrThrow({ where: { id: bill.id }, select: { status: true } });
      if (status === 'PAID') throw new AppError(409, 'BILL_ALREADY_PAID', 'Tagihan ini sudah lunas.');
    },
  };
}

/** Mengembalikan percobaan aktif, atau membuat percobaan baru untuk tagihan milik `tenantId`. */
export async function createRentPayment(billId: string, tenantId: string): Promise<PaymentAttemptResult> {
  // Data yang tidak berubah dibaca sebelum kunci, supaya kunci dipegang sesingkat mungkin.
  const bill = await prisma.bill.findFirst({ where: { id: billId, tenantId }, include: billForPayment });
  if (!bill) throw new AppError(404, 'NOT_FOUND', 'Tagihan tidak ditemukan.');

  return startPayment(rentTarget(bill));
}
