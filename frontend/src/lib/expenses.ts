import type { ExpensesPayload } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { countWord, periodEndDate, periodMonthName, periodStartDate } from "@/lib/period";
import type { HexString } from "@/lib/types";

/** Batas yang sama dengan backend (POST /expenses). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_ACCEPT = "image/jpeg,image/png,application/pdf";
const RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const RECEIPT_EXTENSIONS = /\.(jpe?g|png|pdf)$/i;
export const DESCRIPTION_MIN = 3;
export const DESCRIPTION_MAX = 120;
export const AMOUNT_MAX = 100_000_000;

/** Pesan galat file nota, atau null bila file boleh diunggah. */
export function checkReceiptFile(file: File): string | null {
  const typeOk = RECEIPT_TYPES.has(file.type) || (!file.type && RECEIPT_EXTENSIONS.test(file.name));
  if (!typeOk) return "Format file harus JPG, PNG, atau PDF.";
  if (file.size > RECEIPT_MAX_BYTES) return "Ukuran file lebih dari 5 MB. Pilih file yang lebih kecil.";
  if (file.size === 0) return "File kosong. Pilih file nota lain.";
  return null;
}

/** true bila peramban bisa menghitung SHA-256 (Web Crypto hanya ada di konteks aman, mis. localhost). */
export function canHashInBrowser(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function";
}

/**
 * SHA-256 isi file dalam bentuk 0x + 64 hex, sama dengan receiptHash yang
 * dicatat KosLedger. Backend tetap menghitung ulang dari file yang diterima.
 */
export async function sha256File(file: File): Promise<HexString> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

/** Hanya angka dari isian nominal: "Rp300.000" -> "300000". */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
}

/** Tampilan isian nominal: "300000" -> "Rp300.000". */
export function amountInputText(digits: string): string {
  return digits ? `Rp${formatNumber(Number(digits))}` : "";
}

export interface ExpenseFormValues {
  categoryCode: string;
  amountDigits: string;
  receiptDate: string;
  description: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

/** Validasi yang sama dengan backend, supaya tombol Simpan dan catat baru aktif bila lengkap. */
export function validateExpenseForm(values: ExpenseFormValues, period: string): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};
  if (!values.categoryCode) errors.categoryCode = "Pilih kategori biaya.";
  const amount = Number(values.amountDigits);
  if (!values.amountDigits || amount < 1) errors.amountDigits = "Isi nominal biaya.";
  else if (amount > AMOUNT_MAX) errors.amountDigits = "Nominal paling besar Rp100.000.000.";
  if (!values.receiptDate) errors.receiptDate = "Pilih tanggal nota.";
  else if (values.receiptDate < periodStartDate(period) || values.receiptDate > periodEndDate(period)) {
    errors.receiptDate = `Tanggal nota harus di bulan ${periodMonthName(period)}.`;
  }
  const description = values.description.trim();
  if (description.length < DESCRIPTION_MIN) errors.description = "Keterangan minimal 3 karakter.";
  else if (description.length > DESCRIPTION_MAX) errors.description = "Keterangan paling panjang 120 karakter.";
  return errors;
}

/** Nama field backend ke nama isian form, untuk galat VALIDATION_ERROR. */
export const SERVER_FIELD: Record<string, keyof ExpenseFormValues | "file"> = {
  categoryCode: "categoryCode",
  amountIdr: "amountDigits",
  receiptDate: "receiptDate",
  description: "description",
  file: "file",
};

/** Keterangan di bawah Total biaya, mis. "5 nota, 4 tercatat di Sepolia. Satu nota sedang dicatat." */
export function expensesCaption(payload: ExpensesPayload): string {
  const count = payload.expenses.length;
  const month = periodMonthName(payload.period);
  if (count === 0) return `Belum ada nota untuk ${month}.`;
  const recorded = payload.expenses.filter((item) => item.chain.status === "RECORDED").length;
  const failed = payload.expenses.filter((item) => item.chain.status === "FAILED").length;
  const pending = count - recorded - failed;
  if (payload.closed) return `${count} nota tercatat. Sudah dihitung saat periode ditutup.`;
  if (recorded === count) {
    return `${count} nota, semuanya tercatat di Sepolia. Ikut dihitung saat periode ditutup.`;
  }
  let text = `${count} nota, ${recorded} tercatat di Sepolia.`;
  if (pending > 0) text += ` ${countWord(pending)} nota sedang dicatat.`;
  if (failed > 0) text += ` ${countWord(failed)} nota gagal dicatat dan sedang diulang admin.`;
  return text;
}

/** Ada nota yang menunggu pencatatan: daftar dipantau ulang. */
export function expensesHavePending(payload: ExpensesPayload): boolean {
  return payload.expenses.some((item) => item.chain.status === "PENDING");
}
