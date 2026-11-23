import { requestBackend } from "@/lib/api/client";

/**
 * Bentuk respons GET /api/reconciliation (modul backend jalur 1,
 * backend/src/modules/reconciliation/types.ts). Didefinisikan di folder rute
 * ini karena halaman rekonsiliasi hanya memakai komponen dan klien API dari
 * progress sebelumnya. Uang berupa bilangan bulat rupiah, tanggal teks ISO.
 */

export type ReconciliationKind = "RENT" | "BUY";
export type ReconciliationResult = "MATCH" | "MISMATCH";
export type ReconciliationSource = "MIDTRANS" | "DATABASE" | "CHAIN";
/** RECORDED tercatat, PENDING menunggu job, NONE tidak dicatat, ERROR kontrak tidak terbaca. */
export type ChainRecordStatus = "RECORDED" | "PENDING" | "NONE" | "ERROR";
export type ChainJobStatus = "PENDING" | "RECORDED" | "FAILED";

export interface ReconciliationAnomaly {
  type: string;
  note: string | null;
  expectedAmountIdr: number | null;
  receivedAmountIdr: number | null;
  occurrences: number;
  createdAt: string;
}

export interface ReconciliationRow {
  orderId: string;
  kind: ReconciliationKind;
  amountIdr: number | null;
  /** transaction_status Midtrans apa adanya, atau not_found, atau error. */
  midtrans: { status: string; grossAmountIdr: number | null };
  /** Status percobaan pembayaran di basis data, atau NOT_FOUND. */
  database: { status: string; amountIdr: number | null };
  chain: {
    status: ChainRecordStatus;
    amountIdr: number | null;
    txHash: string | null;
    blockNumber: number | null;
    explorerUrl: string | null;
    jobStatus: ChainJobStatus | null;
    lastError: string | null;
  };
  result: ReconciliationResult;
  reasons: string[];
  flagged: ReconciliationSource[];
  subject: { roomNumber: string | null; period: string | null; tokenAmount: number | null };
  anomalies: ReconciliationAnomaly[];
}

export interface ReconciliationSummary {
  total: number;
  matched: number;
  mismatched: number;
  checkedAt: string;
}

export interface ReconciliationPayload {
  period: string;
  summary: ReconciliationSummary;
  rows: ReconciliationRow[];
}

/**
 * Kunci SWR sekaligus alamat GET laporan. Tanpa periode, backend memakai periode
 * tagihan terbaru dan menuliskannya di `period` respons.
 */
export function reconciliationKey(period: string | null, onlyMismatch: boolean): string {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (onlyMismatch) params.set("only", "mismatch");
  const query = params.toString();
  return query ? `/reconciliation?${query}` : "/reconciliation";
}

export function fetchReconciliation(key: string): Promise<ReconciliationPayload> {
  return requestBackend<ReconciliationPayload>(key);
}

/** Periksa ulang: backend melewati cache dan menanyakan Midtrans serta Sepolia lagi. */
export function refreshReconciliation(key: string): Promise<ReconciliationPayload> {
  return requestBackend<ReconciliationPayload>(`${key}${key.includes("?") ? "&" : "?"}refresh=1`);
}
