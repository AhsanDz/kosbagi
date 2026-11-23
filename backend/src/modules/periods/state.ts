// Aturan dasar periode sewa (P4): format periode, properti yang dibaca, kunci per periode, dan
// apakah periode sudah ditutup.
//
// Periode dianggap ditutup sejak admin menekan Tutup periode (baris period_closings ada), bukan
// sejak closePeriod tercatat di blok. Sejak saat itu tagihan periode itu tidak bisa dibayar dan
// biaya baru ditolak, supaya tidak ada recordRent atau recordExpense yang tiba setelah closePeriod
// dan direvert kontrak (PeriodAlreadyClosed).
//
// Pelunasan sewa, pencatatan biaya, dan permintaan tutup periode memegang kunci advisory yang sama
// per properti dan periode, jadi ketiganya tidak pernah saling menyalip.
import type { Prisma, Property } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { z } from '../../lib/zod.js';

export const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Validasi periode YYYY-MM di parameter, query, atau body. */
export const periodSchema = z.string().regex(PERIOD_PATTERN, 'Periode harus berformat YYYY-MM.');

export function periodLockKey(propertyId: string, period: string): string {
  return `rent-period:${propertyId}:${period}`;
}

/** Memegang kunci periode sampai transaksi `tx` selesai. */
export async function lockPeriod(tx: Prisma.TransactionClient, propertyId: string, period: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${periodLockKey(propertyId, period)}, 0))`;
}

type ClosingDb = Pick<Prisma.TransactionClient, 'periodClosing'>;

/** true sejak admin meminta tutup periode, termasuk selama closePeriod belum tercatat. */
export async function isPeriodClosed(db: ClosingDb, propertyId: string, period: string): Promise<boolean> {
  const closing = await db.periodClosing.findUnique({
    where: { propertyId_period: { propertyId, period } },
    select: { id: true },
  });
  return closing !== null;
}

export function periodClosedError(period: string): AppError {
  return new AppError(
    409,
    'PERIOD_CLOSED',
    `Periode ${period} sudah ditutup. Data periode ini hanya bisa dibaca.`,
    { period },
  );
}

/**
 * Properti yang dibaca endpoint P4. Prototipe hanya punya satu properti (Kos Sumbersari 01), jadi
 * bawaannya properti pertama; `code` (mis. ?property=SMR01) memilih properti lain.
 */
export async function resolveProperty(code?: string): Promise<Property> {
  const property = code
    ? await prisma.property.findUnique({ where: { code } })
    : await prisma.property.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!property) throw new AppError(404, 'NOT_FOUND', 'Properti tidak ditemukan.');
  return property;
}

/**
 * Periode tertutup untuk sekumpulan tagihan, sebagai kunci `<id kamar>:<periode>`. Dipakai respons
 * tagihan penghuni (`periodClosed`). Query berurutan, tanpa include.
 */
export async function closedBillKeys(bills: ReadonlyArray<{ roomId: string; period: string }>): Promise<Set<string>> {
  if (bills.length === 0) return new Set();
  const rooms = await prisma.room.findMany({
    where: { id: { in: [...new Set(bills.map((bill) => bill.roomId))] } },
    select: { id: true, propertyId: true },
  });
  const propertyOf = new Map(rooms.map((room) => [room.id, room.propertyId]));
  const closings = await prisma.periodClosing.findMany({
    where: { propertyId: { in: [...new Set(rooms.map((room) => room.propertyId))] }, period: { in: [...new Set(bills.map((bill) => bill.period))] } },
    select: { propertyId: true, period: true },
  });
  const closed = new Set(closings.map((closing) => `${closing.propertyId}:${closing.period}`));
  return new Set(
    bills
      .filter((bill) => closed.has(`${propertyOf.get(bill.roomId)}:${bill.period}`))
      .map((bill) => `${bill.roomId}:${bill.period}`),
  );
}

/** Kunci untuk closedBillKeys. */
export function billKey(bill: { roomId: string; period: string }): string {
  return `${bill.roomId}:${bill.period}`;
}

/** Properti yang dikelola pengguna MANAGER. */
export async function resolveManagedProperty(managerId: string): Promise<Property> {
  const property = await prisma.property.findFirst({ where: { managerId }, orderBy: { createdAt: 'asc' } });
  if (!property) throw new AppError(404, 'NOT_FOUND', 'Akun ini belum mengelola properti.');
  return property;
}

/**
 * Periode berjalan: periode tagihan terbaru properti. Tagihan dibuat per bulan, jadi periode ini
 * tetap terbaca setelah ditutup sampai tagihan bulan berikutnya dibuat. Null bila belum ada tagihan.
 */
export async function currentPeriodOf(propertyId: string): Promise<string | null> {
  const latest = await prisma.bill.findFirst({
    where: { room: { propertyId } },
    orderBy: { period: 'desc' },
    select: { period: true },
  });
  return latest?.period ?? null;
}
