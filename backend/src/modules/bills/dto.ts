// Bentuk data tagihan yang dikirim ke frontend. Tanpa akses basis data, jadi mudah diuji.
import type { Bill, Payment, Prisma, Room, Property } from '../../generated/prisma/client.js';
import { effectiveStatus, type PaymentDto, toPaymentDto } from '../payments/dto.js';

export const billInclude = {
  payments: {
    orderBy: { attempt: 'desc' },
    include: { outboxJob: { include: { chainTransactions: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
  },
} satisfies Prisma.BillInclude;

export type BillWithPayments = Prisma.BillGetPayload<{ include: typeof billInclude }>;
type PaymentWithChain = BillWithPayments['payments'][number];

export type PaymentState = 'NONE' | 'PENDING' | 'EXPIRED' | 'FAILED' | 'PAID';

export interface ChainDto {
  status: 'PENDING' | 'RECORDED' | 'FAILED';
  txHash: string | null;
  blockNumber: number | null;
}

export interface BillDto {
  id: string;
  period: string;
  amountIdr: number;
  status: Bill['status'];
  dueDate: string;
  paidAt: Date | null;
  paymentState: PaymentState;
  payment: PaymentDto | null;
  chain: ChainDto | null;
}

export interface TenantRoomDto {
  number: string;
  propertyName: string;
  propertyCode: string;
  monthlyRentIdr: number;
  /** Null selama kamar belum punya tagihan. */
  leaseStart: string | null;
  leaseEnd: string | null;
  dueDay: number | null;
}

const LEASE_MONTHS = 12;

/** Percobaan yang ditampilkan: yang melunasi tagihan, atau percobaan terakhir bila belum lunas. */
function displayedPayment(bill: BillWithPayments): PaymentWithChain | null {
  return bill.payments.find((payment) => payment.status === 'PAID') ?? bill.payments[0] ?? null;
}

function toPaymentState(bill: Bill, payment: Payment | null, now: Date): PaymentState {
  if (bill.status === 'PAID') return 'PAID';
  return payment ? effectiveStatus(payment, now) : 'NONE';
}

/** Status pencatatan on-chain. Selama worker belum mencatat apa pun, statusnya menunggu. */
function toChainDto(payment: PaymentWithChain | null): ChainDto {
  const transaction = payment?.outboxJob?.chainTransactions[0];
  return {
    status: transaction?.status ?? 'PENDING',
    txHash: transaction?.txHash ?? null,
    blockNumber: transaction?.blockNumber == null ? null : Number(transaction.blockNumber),
  };
}

export function toBillDto(bill: BillWithPayments, now: Date): BillDto {
  const payment = displayedPayment(bill);
  return {
    id: bill.id,
    period: bill.period,
    amountIdr: Number(bill.amountIdr),
    status: bill.status,
    dueDate: bill.dueDate.toISOString().slice(0, 10),
    paidAt: bill.paidAt,
    paymentState: toPaymentState(bill, payment, now),
    payment: payment ? toPaymentDto(payment, now) : null,
    chain: bill.status === 'PAID' ? toChainDto(payment) : null,
  };
}

/** Periode terakhir masa sewa 12 bulan yang dimulai pada `leaseStart`, mis. 2026-08 menjadi 2027-07. */
export function leaseEndPeriod(leaseStart: string): string {
  const [year = 0, month = 1] = leaseStart.split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1 + LEASE_MONTHS - 1, 1));
  return end.toISOString().slice(0, 7);
}

/**
 * Masa sewa tidak disimpan di skema: diturunkan dari tagihan. `firstBillPeriod` adalah tagihan
 * paling awal, `latestDueDate` jatuh tempo tagihan terbaru.
 */
export function toTenantRoomDto(
  room: Room & { property: Property },
  firstBillPeriod: string | null,
  latestDueDate: Date | null,
): TenantRoomDto {
  return {
    number: room.number,
    propertyName: room.property.name,
    propertyCode: room.property.code,
    monthlyRentIdr: Number(room.monthlyRentIdr),
    leaseStart: firstBillPeriod,
    leaseEnd: firstBillPeriod ? leaseEndPeriod(firstBillPeriod) : null,
    dueDay: latestDueDate ? latestDueDate.getUTCDate() : null,
  };
}
