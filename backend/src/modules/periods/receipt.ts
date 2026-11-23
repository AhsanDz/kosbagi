// Aturan penutupan periode tanpa basis data (P4): status periode, syarat penutupan, dan angka
// struk. Struk sementara dihitung dengan kalkulator jalur 1 (calculatePeriod), yang rumusnya sama
// persis dengan KosLedger.closePeriod; struk setelah tutup memakai angka dari kontrak.
import { calculatePeriod } from '../../finance/index.js';
import { type AdminJobStatus, isOpenFailure, type JobState } from '../../lib/job-status.js';
import type { ExpenseRecord, RecordedJob, RentRecord, TransferRecord } from './records.js';

export type PeriodStatus = 'OPEN' | 'CLOSING' | 'CLOSE_FAILED' | 'CLOSED' | 'DISTRIBUTED';

export type RequirementKey = 'RENT_UNRECORDED' | 'EXPENSE_UNRECORDED' | 'TRANSFER_UNRECORDED' | 'JOB_FAILED';

export interface RequirementDto {
  key: RequirementKey;
  ok: boolean;
  /** Jumlah data yang belum memenuhi syarat. */
  count: number;
}

export interface ReceiptDto {
  /** true sebelum closePeriod tercatat: angka dari data yang sudah tercatat on-chain saja. */
  provisional: boolean;
  grossRentIdr: number;
  roomsRecorded: number;
  /** Jumlah tagihan periode itu, yaitu kamar terisi. */
  roomsTotal: number;
  expensesIdr: number;
  expensesRecorded: number;
  platformFeeIdr: number;
  taxableProfitIdr: number;
  taxIdr: number;
  netRentIdr: number;
  totalSupply: number;
  /** 43875 berarti Rp438,75. */
  valuePerTokenSen: number;
}

/** Angka KosLedger.periods(period) setelah ditutup. */
export interface ClosedPeriodFigures {
  grossRentIdr: bigint;
  totalExpensesIdr: bigint;
  platformFeeIdr: bigint;
  taxIdr: bigint;
  netRentIdr: bigint;
  totalSupply: number;
  valuePerTokenSen: bigint;
  snapshotBlock: bigint;
}

const isRecorded = (job: { state: { status: AdminJobStatus } } | null): boolean => job?.state.status === 'RECORDED';

/** Job yang ditandai "sudah ditangani" admin tidak lagi dihitung belum tercatat. */
const isHandled = (job: { state: Pick<JobState, 'resolved'> } | null): boolean => job?.state.resolved === true;

const isOutstanding = (job: { state: Pick<JobState, 'status' | 'resolved'> } | null): boolean => !isRecorded(job) && !isHandled(job);

const isOpenFailedJob = (job: { state: Pick<JobState, 'status' | 'resolved'> } | null): boolean =>
  job !== null && isOpenFailure(job.state);

/** Tagihan yang lunas lewat Midtrans. Data lampau seed tanpa pembayaran tidak pernah dicatat. */
const settledThroughMidtrans = (rent: RentRecord): boolean => rent.status === 'PAID' && rent.payment !== null;

export function periodStatus(closingJob: AdminJobStatus | null, distributed: boolean): PeriodStatus {
  if (distributed) return 'DISTRIBUTED';
  if (closingJob === null) return 'OPEN';
  if (closingJob === 'RECORDED') return 'CLOSED';
  if (closingJob === 'FAILED') return 'CLOSE_FAILED';
  return 'CLOSING';
}

/**
 * Syarat tutup periode. Tutup periode hanya boleh bila semuanya `ok`.
 *
 * Hanya job yang memengaruhi periode itu yang dihitung: RECORD_RENT dan RECORD_EXPENSE periode itu,
 * CLOSE_PERIOD periode itu, dan semua TRANSFER_TOKENS (saldo di blok snapshot). WHITELIST_KYC tidak
 * menghalangi. Job gagal yang sudah ditandai "sudah ditangani" admin tidak dihitung di syarat mana pun.
 */
export function computeRequirements(input: {
  rents: readonly RentRecord[];
  expenses: readonly ExpenseRecord[];
  transfers: readonly TransferRecord[];
  closeJob: RecordedJob | null;
}): RequirementDto[] {
  const periodJobs = [
    ...input.rents.map((rent) => rent.job),
    ...input.expenses.map((expense) => expense.job),
    ...input.transfers.map((transfer) => transfer.job),
    input.closeJob,
  ];
  const counts: Record<RequirementKey, number> = {
    RENT_UNRECORDED: input.rents.filter((rent) => settledThroughMidtrans(rent) && isOutstanding(rent.job)).length,
    EXPENSE_UNRECORDED: input.expenses.filter((expense) => isOutstanding(expense.job)).length,
    // Pesanan lunas yang tokennya belum pindah membuat saldo snapshot salah.
    TRANSFER_UNRECORDED: input.transfers.filter((transfer) => transfer.payment !== null && isOutstanding(transfer.job))
      .length,
    JOB_FAILED: periodJobs.filter(isOpenFailedJob).length,
  };
  return (Object.keys(counts) as RequirementKey[]).map((key) => ({ key, ok: counts[key] === 0, count: counts[key] }));
}

/** Sewa dan biaya yang sudah tercatat on-chain, dasar struk sementara. */
export function recordedTotals(rents: readonly RentRecord[], expenses: readonly ExpenseRecord[]) {
  const recordedRents = rents.filter((rent) => settledThroughMidtrans(rent) && isRecorded(rent.job));
  const recordedExpenses = expenses.filter((expense) => isRecorded(expense.job));
  return {
    grossRentIdr: recordedRents.reduce((sum, rent) => sum + rent.amountIdr, 0n),
    roomsRecorded: recordedRents.length,
    roomsTotal: rents.length,
    expensesIdr: recordedExpenses.reduce((sum, expense) => sum + expense.amountIdr, 0n),
    expensesRecorded: recordedExpenses.length,
  };
}

/**
 * Struk sementara: angka dari data yang sudah tercatat saja, dihitung seperti closePeriod. Periode
 * tanpa sewa dan biaya tercatat menghasilkan nol (kontrak akan menolaknya dengan EmptyPeriod).
 */
export function provisionalReceipt(
  rents: readonly RentRecord[],
  expenses: readonly ExpenseRecord[],
  totalSupply: number,
): ReceiptDto {
  const totals = recordedTotals(rents, expenses);
  const base = {
    provisional: true,
    grossRentIdr: Number(totals.grossRentIdr),
    roomsRecorded: totals.roomsRecorded,
    roomsTotal: totals.roomsTotal,
    expensesIdr: Number(totals.expensesIdr),
    expensesRecorded: totals.expensesRecorded,
    totalSupply,
  };
  if (totals.grossRentIdr === 0n && totals.expensesIdr === 0n) {
    return { ...base, platformFeeIdr: 0, taxableProfitIdr: 0, taxIdr: 0, netRentIdr: 0, valuePerTokenSen: 0 };
  }

  const summary = calculatePeriod({
    grossRent: totals.grossRentIdr,
    totalExpenses: totals.expensesIdr,
    totalSupply: BigInt(totalSupply),
  });
  return {
    ...base,
    platformFeeIdr: Number(summary.platformFee),
    taxableProfitIdr: Number(summary.taxableProfit),
    taxIdr: Number(summary.tax),
    netRentIdr: Number(summary.netRent),
    valuePerTokenSen: Number(summary.valuePerTokenSen),
  };
}

/** Struk setelah closePeriod tercatat: angka dari kontrak. Laba kena pajak = sewa bersih + pajak. */
export function closedReceipt(
  figures: ClosedPeriodFigures,
  rents: readonly RentRecord[],
  expenses: readonly ExpenseRecord[],
): ReceiptDto {
  const totals = recordedTotals(rents, expenses);
  return {
    provisional: false,
    grossRentIdr: Number(figures.grossRentIdr),
    roomsRecorded: totals.roomsRecorded,
    roomsTotal: totals.roomsTotal,
    expensesIdr: Number(figures.totalExpensesIdr),
    expensesRecorded: totals.expensesRecorded,
    platformFeeIdr: Number(figures.platformFeeIdr),
    taxableProfitIdr: Number(figures.netRentIdr + figures.taxIdr),
    taxIdr: Number(figures.taxIdr),
    netRentIdr: Number(figures.netRentIdr),
    totalSupply: figures.totalSupply,
    valuePerTokenSen: Number(figures.valuePerTokenSen),
  };
}
