import { requestBackend } from "@/lib/api/client";
import type { ExpensePayload, ExpensesPayload } from "@/lib/api/types";

/**
 * Kunci SWR sekaligus alamat GET biaya. Tanpa periode, backend memakai periode
 * berjalan dan menuliskannya di respons.
 */
export function expensesKey(period: string | null): string {
  return period ? `/expenses?period=${encodeURIComponent(period)}` : "/expenses";
}

export function fetchExpenses(key: string): Promise<ExpensesPayload> {
  return requestBackend<ExpensesPayload>(key);
}

export interface ExpenseInput {
  period: string;
  categoryCode: number;
  description: string;
  amountIdr: number;
  /** "YYYY-MM-DD". */
  receiptDate: string;
  file: File;
}

/**
 * POST /expenses (multipart). Hash nota dihitung ulang server dari isi file;
 * hash yang ditampilkan peramban hanya pratinjau. Content-Type sengaja tidak
 * diisi supaya peramban menambahkan boundary multipart sendiri.
 */
export function createExpense(input: ExpenseInput): Promise<ExpensePayload> {
  const form = new FormData();
  form.set("period", input.period);
  form.set("categoryCode", String(input.categoryCode));
  form.set("description", input.description);
  form.set("amountIdr", String(input.amountIdr));
  form.set("receiptDate", input.receiptDate);
  form.set("file", input.file, input.file.name);
  return requestBackend<ExpensePayload>("/expenses", { method: "POST", body: form });
}

/** Alamat file nota lewat penerus API (cookie sesi ikut terkirim). */
export function receiptFileUrl(expenseId: string): string {
  return `/api/backend/expenses/${encodeURIComponent(expenseId)}/receipt`;
}
