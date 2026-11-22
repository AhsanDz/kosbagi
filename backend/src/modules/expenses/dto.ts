// Bentuk data biaya yang dikirim ke frontend (P4). Tanpa akses basis data, jadi mudah diuji.
import { managerChainStatus, type ManagerChainStatus } from '../../lib/job-status.js';
import type { ExpenseRecord } from '../periods/records.js';
import { categoryLabel, EXPENSE_CATEGORIES } from './categories.js';

export interface ExpenseDto {
  id: string;
  period: string;
  category: { code: number; label: string };
  description: string;
  amountIdr: number;
  /** Tanggal pada nota, YYYY-MM-DD. */
  receiptDate: string;
  /** SHA-256 isi file nota, 0x + 64 hex. Yang dicatat on-chain. */
  receiptHash: string;
  fileName: string;
  createdAt: Date;
  createdBy: { name: string };
  /** Pencatatan KosLedger.recordExpense. Pengelola dan admin melihat FAILED apa adanya. */
  chain: { status: ManagerChainStatus; txHash: string | null; blockNumber: number | null; lastError: string | null };
}

export interface ExpenseListDto {
  period: string;
  /** true sejak admin menutup periode: biaya hanya bisa dibaca. */
  closed: boolean;
  totals: { recordedIdr: number; pendingIdr: number; totalIdr: number; count: number };
  categories: Array<{ code: number; label: string }>;
  expenses: ExpenseDto[];
}

export function toExpenseDto(expense: ExpenseRecord, createdByName: string): ExpenseDto {
  const { state } = expense.job;
  return {
    id: expense.id,
    period: expense.period,
    category: { code: expense.categoryCode, label: categoryLabel(expense.categoryCode) },
    description: expense.description,
    amountIdr: Number(expense.amountIdr),
    receiptDate: expense.receiptDate.toISOString().slice(0, 10),
    receiptHash: expense.receiptHash,
    fileName: expense.fileName,
    createdAt: expense.createdAt,
    createdBy: { name: createdByName },
    chain: {
      status: managerChainStatus(state.status),
      txHash: state.txHash,
      blockNumber: state.blockNumber,
      lastError: state.lastError,
    },
  };
}

export function toExpenseListDto(
  period: string,
  closed: boolean,
  expenses: readonly ExpenseRecord[],
  names: ReadonlyMap<string, string>,
): ExpenseListDto {
  const recorded = expenses.filter((expense) => expense.job.state.status === 'RECORDED');
  const sum = (rows: readonly ExpenseRecord[]) => rows.reduce((total, row) => total + row.amountIdr, 0n);
  const totalIdr = sum(expenses);
  const recordedIdr = sum(recorded);
  return {
    period,
    closed,
    totals: {
      recordedIdr: Number(recordedIdr),
      pendingIdr: Number(totalIdr - recordedIdr),
      totalIdr: Number(totalIdr),
      count: expenses.length,
    },
    categories: EXPENSE_CATEGORIES.map(({ code, label }) => ({ code, label })),
    expenses: expenses.map((expense) => toExpenseDto(expense, names.get(expense.createdById) ?? 'Pengelola')),
  };
}
