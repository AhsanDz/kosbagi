// Bentuk data portofolio investor (P4) tanpa akses basis data, jadi mudah diuji.
//
// Investor tidak pernah melihat status Gagal untuk pencatatan on-chain: semuanya Tercatat atau
// Menunggu pencatatan. Daftar sewa masuk tidak memuat nama penghuni.
import { investorChainStatus, type InvestorChainStatus } from '../../lib/job-status.js';
import { formatSen, periodLabel } from '../../lib/format-id.js';
import { wibDate } from '../../lib/wib.js';
import type { PeriodStatus } from '../periods/receipt.js';
import type { RentRecord, RoomRecord, TransferRecord } from '../periods/records.js';

export const WITHDRAW_DISABLED_REASON = 'Penarikan dibuka setelah disbursement sandbox tersedia.';

export interface HoldingDto {
  tokenSymbol: string;
  tokenBalance: number;
  /** Persen dari total suplai, dua desimal: 0.56 berarti 0,56%. */
  percentOfSupply: number;
  walletAddress: string | null;
}

export type RentFeedStatus = 'RECORDED' | 'PENDING' | 'UNPAID' | 'VACANT';

export interface RentFeedDto {
  roomNumber: string;
  /** Null untuk kamar tanpa tagihan (kosong). */
  amountIdr: number | null;
  /** Waktu sewa lunas (tanggal bayar) untuk RECORDED dan PENDING. Null untuk UNPAID dan VACANT. */
  recordedAt: Date | null;
  /** Jatuh tempo YYYY-MM-DD untuk tagihan belum dibayar. */
  dueDate: string | null;
  /** keccak256(order_id) yang dikirim ke recordRent. */
  paymentRef: string | null;
  txHash: string | null;
  status: RentFeedStatus;
}

export interface CurrentPeriodDto {
  period: string;
  status: PeriodStatus;
  recordedRentIdr: number;
  roomsRecorded: number;
  /** Jumlah tagihan periode ini, yaitu kamar terisi. */
  roomsTotal: number;
  /** Sewa tercatat dijumlah per tanggal bayar (WIB), urut tanggal. */
  chart: Array<{ date: string; amountIdr: number }>;
  rentFeed: RentFeedDto[];
}

export interface ChainLinkDto {
  status: InvestorChainStatus;
  txHash: string | null;
}

export function toHoldingDto(
  tokenSymbol: string,
  tokenBalance: number,
  totalTokens: number,
  walletAddress: string | null,
): HoldingDto | null {
  if (tokenBalance <= 0) return null;
  return {
    tokenSymbol,
    tokenBalance,
    percentOfSupply: Math.round((tokenBalance * 10_000) / totalTokens) / 100,
    walletAddress,
  };
}

function feedEntry(room: RoomRecord, rent: RentRecord | undefined): RentFeedDto {
  if (!rent) {
    return { roomNumber: room.number, amountIdr: null, recordedAt: null, dueDate: null, paymentRef: null, txHash: null, status: 'VACANT' };
  }
  const base = { roomNumber: room.number, amountIdr: Number(rent.amountIdr) };
  if (rent.status === 'UNPAID') {
    return { ...base, recordedAt: null, dueDate: rent.dueDate.toISOString().slice(0, 10), paymentRef: null, txHash: null, status: 'UNPAID' };
  }
  const recorded = rent.job?.state.status === 'RECORDED';
  return {
    ...base,
    recordedAt: rent.payment?.paidAt ?? rent.paidAt,
    dueDate: null,
    paymentRef: rent.job?.paymentRef ?? null,
    txHash: recorded ? (rent.job?.state.txHash ?? null) : null,
    status: recorded ? 'RECORDED' : 'PENDING',
  };
}

export function toCurrentPeriodDto(
  period: string,
  status: PeriodStatus,
  rooms: readonly RoomRecord[],
  rents: readonly RentRecord[],
): CurrentPeriodDto {
  const rentByRoom = new Map(rents.map((rent) => [rent.room.id, rent]));
  const recorded = rents.filter((rent) => rent.status === 'PAID' && rent.job?.state.status === 'RECORDED');

  const perDate = new Map<string, bigint>();
  for (const rent of recorded) {
    const paidAt = rent.payment?.paidAt ?? rent.paidAt;
    if (!paidAt) continue;
    const date = wibDate(paidAt);
    perDate.set(date, (perDate.get(date) ?? 0n) + rent.amountIdr);
  }

  return {
    period,
    status,
    recordedRentIdr: Number(recorded.reduce((sum, rent) => sum + rent.amountIdr, 0n)),
    roomsRecorded: recorded.length,
    roomsTotal: rents.length,
    chart: [...perDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amountIdr: Number(amount) })),
    rentFeed: rooms.map((room) => feedEntry(room, rentByRoom.get(room.id))),
  };
}

export interface InvestorShare {
  period: string;
  tokenBalance: number;
  shareIdr: bigint;
  valuePerTokenSen: bigint;
  distributedAt: Date;
  /** Blok acuan saldo (getPastVotes). */
  snapshotBlock: bigint;
  /** Tx hash closePeriod, bukti on-chain periode ini. */
  closeTxHash: string | null;
}

/** Persetujuan KYC investor dan pencatatan dompetnya di KosToken (setKycStatus). */
export interface KycApproval {
  approvedAt: Date;
  walletAddress: string;
  whitelist: { status: 'PENDING' | 'RECORDED' | 'FAILED'; txHash: string | null };
}

export interface TransactionDto {
  /** KYC_APPROVED tambahan di luar kontrak P4: baris "Lolos KYC" di Figma. */
  type: 'PURCHASE' | 'DISTRIBUTION' | 'KYC_APPROVED';
  occurredAt: Date;
  description: string;
  tokenAmount: number;
  amountIdr: number;
  chain: ChainLinkDto | null;
}

/** 0x7c4E2a9b...19B2 menjadi 0x7c4E…19B2. */
function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function toTransactions(
  transfers: readonly TransferRecord[],
  shares: readonly InvestorShare[],
  kyc: KycApproval | null = null,
): TransactionDto[] {
  const purchases = transfers.map(
    (transfer): TransactionDto => ({
      type: 'PURCHASE',
      occurredAt: transfer.payment?.paidAt ?? transfer.createdAt,
      description: `${transfer.payment?.orderId ?? transfer.orderNumber ?? 'Pembelian token'}, ${transfer.tokenAmount} token ke dompet kustodian`,
      tokenAmount: transfer.tokenAmount,
      amountIdr: Number(transfer.amountIdr),
      chain: transfer.job ? { status: investorChainStatus(transfer.job.state.status), txHash: transfer.job.state.txHash } : null,
    }),
  );
  const distributions = shares.map(
    (share): TransactionDto => ({
      type: 'DISTRIBUTION',
      occurredAt: share.distributedAt,
      description: `Distribusi ${periodLabel(share.period)}, ${share.tokenBalance} token × ${formatSen(share.valuePerTokenSen)}`,
      tokenAmount: share.tokenBalance,
      amountIdr: Number(share.shareIdr),
      chain: { status: 'RECORDED', txHash: share.closeTxHash },
    }),
  );
  const approvals: TransactionDto[] = kyc
    ? [
        {
          type: 'KYC_APPROVED',
          occurredAt: kyc.approvedAt,
          description: `Dompet ${shortAddress(kyc.walletAddress)} dicatat lolos KYC di KosToken`,
          tokenAmount: 0,
          amountIdr: 0,
          chain: { status: investorChainStatus(kyc.whitelist.status), txHash: kyc.whitelist.txHash },
        },
      ]
    : [];
  return [...purchases, ...distributions, ...approvals].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
