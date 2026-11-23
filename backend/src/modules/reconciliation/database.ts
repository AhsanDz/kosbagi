// Membaca order satu periode dari basis data, hanya dengan model skema v3 (P3):
// Payment, Bill, TokenPurchase, OutboxJob, ChainTransaction, dan PaymentAnomaly.
//
// Order yang ikut satu periode:
// - RENT: semua percobaan pembayaran untuk tagihan periode itu, termasuk yang kedaluwarsa atau gagal.
// - BUY : semua percobaan pembayaran pesanan token yang dibuat dalam bulan itu menurut WIB.
// - order_id berawalan RENT- atau BUY- yang hanya dikenal lewat anomali UNKNOWN_ORDER, dengan
//   aturan periode yang sama (RENT dari periode di order_id, BUY dari waktu anomali dicatat).
// Percobaan yang dilewati karena order_id-nya sudah terpakai di Midtrans tidak ikut: transaksi
// Midtrans untuk nomor itu dibuat sebelum basis data ini ada, jadi bukan milik platform.
//
// Anomali sebuah order dibaca lewat order_id, bukan hanya lewat relasi ke percobaannya, supaya
// anomali yang tercatat tanpa payment_id tetap ikut (keputusan 20 November 2026: order beranomali
// selalu Selisih).
import type { PaymentAnomaly, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { latestChainTransaction, toChainJobAdminDto } from '../../lib/chain-status.js';
import { DATABASE_NOT_FOUND, type AnomalyFact, type DatabaseFact } from './types.js';

/**
 * Penanda providerStatus untuk percobaan yang dilewati karena order_id-nya sudah terpakai di
 * Midtrans. Nilainya sama dengan konstanta ORDER_ID_TAKEN di src/modules/payments/service.ts (P3).
 */
const ORDER_ID_TAKEN_MARKER = 'ORDER_ID_TAKEN';

const PERIOD = /^(\d{4})-(0[1-9]|1[0-2])$/;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const RENT_ORDER = /^RENT-([A-Z0-9]+)-(K\d+)-(\d{4}-(?:0[1-9]|1[0-2]))(?:-\d+)?$/;
const BUY_ORDER = /^BUY-([A-Z0-9]+)-\d+(?:-\d+)?$/;

export function isPeriod(value: string): boolean {
  return PERIOD.test(value);
}

/** Periode berjalan menurut WIB, mis. 2026-11. */
export function currentWibPeriod(now: Date): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 7);
}

/** Rentang waktu satu bulan menurut WIB: [awal bulan, awal bulan berikutnya). */
export function wibMonthRange(period: string): { start: Date; end: Date } {
  const match = PERIOD.exec(period);
  if (!match) throw new RangeError(`Periode tidak valid: ${period}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - WIB_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - WIB_OFFSET_MS),
  };
}

const paymentInclude = {
  bill: { select: { period: true, room: { select: { number: true, property: { select: { code: true } } } } } },
  tokenPurchase: {
    select: {
      tokenAmount: true,
      offering: { select: { property: { select: { code: true, tokenPriceIdr: true } } } },
      investor: { select: { custodialWallet: { select: { address: true } } } },
    },
  },
  outboxJob: { include: latestChainTransaction },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;
type AnomalyRow = Pick<
  PaymentAnomaly,
  'orderId' | 'type' | 'note' | 'expectedAmountIdr' | 'receivedAmountIdr' | 'occurrences' | 'createdAt'
>;

/** Bagian klien Prisma yang dibaca modul ini. */
export type ReconciliationDb = Pick<PrismaClient, 'payment' | 'paymentAnomaly' | 'bill'>;

/**
 * Periode bawaan rekonsiliasi: periode tagihan terbaru, sama dengan halaman lain yang memakai
 * periode berjalan. Null bila belum ada tagihan sama sekali.
 */
export async function latestBillPeriod(db: Pick<PrismaClient, 'bill'>): Promise<string | null> {
  const latest = await db.bill.findFirst({ orderBy: { period: 'desc' }, select: { period: true } });
  return latest?.period ?? null;
}

function toAnomalyFact(anomaly: AnomalyRow): AnomalyFact {
  return {
    type: String(anomaly.type),
    note: anomaly.note,
    expectedAmountIdr: anomaly.expectedAmountIdr,
    receivedAmountIdr: anomaly.receivedAmountIdr,
    occurrences: anomaly.occurrences,
    createdAt: anomaly.createdAt,
  };
}

function toPaymentFact(payment: PaymentRow, anomalies: readonly AnomalyRow[]): DatabaseFact | null {
  const base = {
    orderId: payment.orderId,
    status: String(payment.status),
    amountIdr: payment.amountIdr,
    createdAt: payment.createdAt,
    job: payment.outboxJob ? toChainJobAdminDto(payment.outboxJob) : null,
    anomalies: anomalies.map(toAnomalyFact),
  };

  if (payment.bill) {
    return {
      ...base,
      kind: 'RENT',
      subject: {
        propertyCode: payment.bill.room.property.code,
        roomNumber: payment.bill.room.number,
        period: payment.bill.period,
        tokenAmount: null,
        tokenPriceIdr: null,
        walletAddress: null,
      },
    };
  }

  if (payment.tokenPurchase) {
    const purchase = payment.tokenPurchase;
    return {
      ...base,
      kind: 'BUY',
      subject: {
        propertyCode: purchase.offering.property.code,
        roomNumber: null,
        period: null,
        tokenAmount: purchase.tokenAmount,
        tokenPriceIdr: purchase.offering.property.tokenPriceIdr,
        walletAddress: purchase.investor.custodialWallet?.address ?? null,
      },
    };
  }
  return null;
}

function isSkippedAttempt(payment: Pick<PaymentRow, 'status' | 'providerStatus'>): boolean {
  return payment.status === 'FAILED' && payment.providerStatus === ORDER_ID_TAKEN_MARKER;
}

/** Order tak dikenal (hanya ada anomali UNKNOWN_ORDER) yang termasuk periode ini, atau null. */
function toUnknownOrderFact(
  anomaly: AnomalyRow,
  period: string,
  range: { start: Date; end: Date },
): DatabaseFact | null {
  const rent = RENT_ORDER.exec(anomaly.orderId);
  const buy = BUY_ORDER.exec(anomaly.orderId);
  const inRange = anomaly.createdAt >= range.start && anomaly.createdAt < range.end;
  if (!(rent ? rent[3] === period : buy && inRange)) return null;

  return {
    orderId: anomaly.orderId,
    kind: rent ? 'RENT' : 'BUY',
    status: DATABASE_NOT_FOUND,
    amountIdr: null,
    createdAt: anomaly.createdAt,
    subject: {
      propertyCode: (rent?.[1] ?? buy?.[1]) || null,
      roomNumber: rent?.[2] ?? null,
      period: rent?.[3] ?? null,
      tokenAmount: null,
      tokenPriceIdr: null,
      walletAddress: null,
    },
    job: null,
    anomalies: [toAnomalyFact(anomaly)],
  };
}

/** Sewa lebih dulu, lalu pembelian token; di dalamnya urut order_id (K01 sebelum K02, -2 setelah nomor dasar). */
export function compareFacts(a: Pick<DatabaseFact, 'kind' | 'orderId'>, b: Pick<DatabaseFact, 'kind' | 'orderId'>): number {
  if (a.kind !== b.kind) return a.kind === 'RENT' ? -1 : 1;
  return a.orderId < b.orderId ? -1 : a.orderId > b.orderId ? 1 : 0;
}

/** Semua order satu periode menurut basis data. */
export async function loadDatabaseFacts(db: ReconciliationDb, period: string): Promise<DatabaseFact[]> {
  const range = wibMonthRange(period);

  const [payments, unknownOrders] = await Promise.all([
    db.payment.findMany({
      where: {
        OR: [
          { bill: { period } },
          { tokenPurchaseId: { not: null }, createdAt: { gte: range.start, lt: range.end } },
        ],
      },
      include: paymentInclude,
    }),
    db.paymentAnomaly.findMany({
      where: {
        type: 'UNKNOWN_ORDER',
        paymentId: null,
        OR: [{ orderId: { startsWith: 'RENT-' } }, { orderId: { startsWith: 'BUY-' } }],
      },
    }),
  ]);

  const counted = payments.filter((payment) => !isSkippedAttempt(payment));
  const anomalies = await db.paymentAnomaly.findMany({
    where: { orderId: { in: counted.map((payment) => payment.orderId) } },
    orderBy: { createdAt: 'asc' },
  });
  const anomaliesByOrder = new Map<string, AnomalyRow[]>();
  for (const anomaly of anomalies) {
    anomaliesByOrder.set(anomaly.orderId, [...(anomaliesByOrder.get(anomaly.orderId) ?? []), anomaly]);
  }

  const facts = counted
    .map((payment) => toPaymentFact(payment, anomaliesByOrder.get(payment.orderId) ?? []))
    .filter((fact): fact is DatabaseFact => fact !== null);

  const known = new Set(payments.map((payment) => payment.orderId));
  for (const anomaly of unknownOrders) {
    if (known.has(anomaly.orderId)) continue;
    const fact = toUnknownOrderFact(anomaly, period, range);
    if (fact) facts.push(fact);
  }

  return facts.sort(compareFacts);
}
