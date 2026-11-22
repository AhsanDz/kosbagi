import { requestBackend } from "@/lib/api/client";
import type {
  AdminJobsPayload,
  AdminJobsView,
  AdminSummaryPayload,
  ReconciliationSummaryPayload,
} from "@/lib/api/types";

/** Kunci SWR sekaligus alamat GET ringkasan admin. */
export const ADMIN_SUMMARY_KEY = "/admin/summary";

export function fetchAdminSummary(): Promise<AdminSummaryPayload> {
  return requestBackend<AdminSummaryPayload>(ADMIN_SUMMARY_KEY);
}

/** Kunci SWR sekaligus alamat GET ringkasan rekonsiliasi (endpoint jalur 1). */
export const RECONCILIATION_SUMMARY_KEY = "/reconciliation/summary";

export function fetchReconciliationSummary(): Promise<ReconciliationSummaryPayload> {
  return requestBackend<ReconciliationSummaryPayload>(RECONCILIATION_SUMMARY_KEY);
}

/** Kunci SWR sekaligus alamat GET antrean job on-chain. */
export function adminJobsKey(view: AdminJobsView): string {
  return `/admin/jobs?view=${view}`;
}

export function fetchAdminJobs(key: string): Promise<AdminJobsPayload> {
  return requestBackend<AdminJobsPayload>(key);
}

/** Semua kunci daftar job, untuk memuat ulang kedua tab sekaligus. */
export function isAdminJobsKey(key: unknown): boolean {
  return typeof key === "string" && key.startsWith("/admin/jobs?");
}

/**
 * POST /admin/jobs/:id/retry: mengembalikan job FAILED ke antrean (202).
 * Processor memeriksa status on-chain dulu, jadi transaksi yang ternyata
 * sudah masuk blok diakui sebagai tercatat, bukan dikirim ulang.
 */
export function retryAdminJob(jobId: string): Promise<unknown> {
  return requestBackend<unknown>(`/admin/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
  });
}

/**
 * POST /admin/jobs/:id/resolve: menandai job FAILED sudah ditangani admin dengan
 * catatan 5 sampai 300 karakter. Job itu tidak dikirim ulang lagi dan tidak lagi
 * menghalangi penutupan periode. Ditolak 409 JOB_NOT_FAILED atau JOB_ALREADY_RESOLVED.
 */
export function resolveAdminJob(jobId: string, note: string): Promise<unknown> {
  return requestBackend<unknown>(`/admin/jobs/${encodeURIComponent(jobId)}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
}
