// Bentuk data tagihan yang dikirim ke frontend. Tanpa akses basis data, jadi mudah diuji.
import type { Bill, Payment, Prisma, Room, Property, User } from '../../generated/prisma/client.js';
import { latestChainTransaction, toChainJobDto } from '../../lib/chain-status.js';
import { jobPayloadSchemas, toChainPeriod, toChainRoom } from '../../queue/jobs.js';
import { effectiveStatus, type PaymentDto, toPaymentDto } from '../payments/dto.js';

export const billInclude = {
  payments: {
    orderBy: { attempt: 'desc' },
    include: { outboxJob: { include: latestChainTransaction } },
  },
} satisfies Prisma.BillInclude;

/** Untuk GET /bills/:id: tagihan beserta data kuitansi. */
export const billDetailInclude = {
  ...billInclude,
  tenant: { select: { name: true } },
  room: { include: { property: true } },
} satisfies Prisma.BillInclude;

export type BillWithPayments = Prisma.BillGetPayload<{ include: typeof billInclude }>;
export type BillWithDetail = Prisma.BillGetPayload<{ include: typeof billDetailInclude }>;
type PaymentWithChain = BillWithPayments['payments'][number];

export type PaymentState = 'NONE' | 'PENDING' | 'EXPIRED' | 'FAILED' | 'PAID';

export interface ChainDto {
  /** NOT_RECORDED: tagihan lunas tanpa pembayaran Midtrans (data lampau seed), tidak pernah dicatat. */
  status: 'PENDING' | 'RECORDED' | 'FAILED' | 'NOT_RECORDED';
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

/** Argumen KosLedger.recordRent persis seperti yang dikirim worker, ditambah hasil transaksinya. */
export interface ReceiptOnChainDto {
  /** 3 untuk K03. */
  room: number;
  /** 202611 untuk 2026-11. */
  period: number;
  amountIdr: number;
  /** keccak256(order_id). */
  paymentRef: string;
  /** Alamat KosLedger dari KOS_LEDGER_ADDRESS, null bila belum diisi. */
  contractAddress: string | null;
  txHash: string | null;
  blockNumber: number | null;
}

export interface ReceiptDto {
  /** order_id yang melunasi tagihan. Null untuk data lampau tanpa pembayaran Midtrans. */
  orderId: string | null;
  /** transaction_id Midtrans. */
  transactionId: string | null;
  /** payment_type Midtrans apa adanya, mis. bank_transfer atau qris. */
  method: string | null;
  /** Bank virtual account, mis. bca. Null untuk metode lain. */
  bank: string | null;
  paidAt: Date | null;
  tenantName: string;
  propertyCode: string;
  propertyName: string;
  roomNumber: string;
  /** Null bila tidak ada catatan on-chain, yaitu data lampau seed. */
  onChain: ReceiptOnChainDto | null;
}

export interface BillDetailDto extends BillDto {
  /** Null selama tagihan belum lunas. */
  receipt: ReceiptDto | null;
}

export interface TenantRoomDto {
  number: string;
  propertyName: string;
  propertyCode: string;
  propertyAddress: string;
  /** Nama pengelola kos, null bila properti belum punya pengelola. */
  managerName: string | null;
  monthlyRentIdr: number;
  /** Null selama kamar belum punya tagihan. */
  leaseStart: string | null;
  leaseEnd: string | null;
  dueDay: number | null;
}

const LEASE_MONTHS = 12;

/** Percobaan yang melunasi tagihan, bila ada. */
function settlingPayment(bill: BillWithPayments): PaymentWithChain | null {
  return bill.payments.find((payment) => payment.status === 'PAID') ?? null;
}

/** Percobaan yang ditampilkan: yang melunasi tagihan, atau percobaan terakhir bila belum lunas. */
function displayedPayment(bill: BillWithPayments): PaymentWithChain | null {
  return settlingPayment(bill) ?? bill.payments[0] ?? null;
}

function toPaymentState(bill: Bill, payment: Payment | null, now: Date): PaymentState {
  if (bill.status === 'PAID') return 'PAID';
  return payment ? effectiveStatus(payment, now) : 'NONE';
}

/**
 * Status pencatatan on-chain tagihan lunas. Tagihan lunas tanpa pembayaran Midtrans berasal dari
 * data lampau seed dan tidak pernah dicatat, jadi tidak punya tautan Etherscan.
 */
function toChainDto(bill: BillWithPayments): ChainDto {
  const payment = settlingPayment(bill);
  if (!payment) return { status: 'NOT_RECORDED', txHash: null, blockNumber: null };
  return toChainJobDto(payment.outboxJob);
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
    chain: bill.status === 'PAID' ? toChainDto(bill) : null,
  };
}

/** Argumen recordRent dibaca dari isi job outbox, yaitu data yang benar-benar dikirim worker. */
function toReceiptOnChain(payment: PaymentWithChain, contractAddress: string | null): ReceiptOnChainDto | null {
  if (!payment.outboxJob) return null;
  const parsed = jobPayloadSchemas.RECORD_RENT.safeParse(payment.outboxJob.payload);
  if (!parsed.success) return null;

  const chain = toChainJobDto(payment.outboxJob);
  return {
    room: toChainRoom(parsed.data.roomNumber),
    period: toChainPeriod(parsed.data.period),
    amountIdr: parsed.data.amountIdr,
    paymentRef: parsed.data.paymentRef,
    contractAddress,
    txHash: chain.txHash,
    blockNumber: chain.blockNumber,
  };
}

export function toReceiptDto(bill: BillWithDetail, contractAddress: string | null): ReceiptDto | null {
  if (bill.status !== 'PAID') return null;
  const payment = settlingPayment(bill);
  return {
    orderId: payment?.orderId ?? null,
    transactionId: payment?.providerTransactionId ?? null,
    method: payment?.method ?? null,
    bank: payment?.bank ?? null,
    paidAt: payment?.paidAt ?? bill.paidAt,
    tenantName: bill.tenant.name,
    propertyCode: bill.room.property.code,
    propertyName: bill.room.property.name,
    roomNumber: bill.room.number,
    onChain: payment ? toReceiptOnChain(payment, contractAddress) : null,
  };
}

export function toBillDetailDto(bill: BillWithDetail, now: Date, contractAddress: string | null): BillDetailDto {
  return { ...toBillDto(bill, now), receipt: toReceiptDto(bill, contractAddress) };
}

/** Periode terakhir masa sewa 12 bulan yang dimulai pada `leaseStart`, mis. 2026-08 menjadi 2027-07. */
export function leaseEndPeriod(leaseStart: string): string {
  const [year = 0, month = 1] = leaseStart.split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1 + LEASE_MONTHS - 1, 1));
  return end.toISOString().slice(0, 7);
}

export type RoomWithProperty = Room & { property: Property & { manager: Pick<User, 'name'> | null } };

/**
 * Masa sewa tidak disimpan di skema: diturunkan dari tagihan. `firstBillPeriod` adalah tagihan
 * paling awal, `latestDueDate` jatuh tempo tagihan terbaru.
 */
export function toTenantRoomDto(
  room: RoomWithProperty,
  firstBillPeriod: string | null,
  latestDueDate: Date | null,
): TenantRoomDto {
  return {
    number: room.number,
    propertyName: room.property.name,
    propertyCode: room.property.code,
    propertyAddress: room.property.address,
    managerName: room.property.manager?.name ?? null,
    monthlyRentIdr: Number(room.monthlyRentIdr),
    leaseStart: firstBillPeriod,
    leaseEnd: firstBillPeriod ? leaseEndPeriod(firstBillPeriod) : null,
    dueDay: latestDueDate ? latestDueDate.getUTCDate() : null,
  };
}
