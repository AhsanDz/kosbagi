import { LOGIN_PATH } from "@/lib/auth/roles";
import type { ApiErrorBody, ApiSuccess } from "@/lib/types";

/** Semua panggilan klien lewat route handler yang menempelkan token dari cookie. */
const BACKEND_PROXY_PATH = "/api/backend";

const NETWORK_ERROR_MESSAGE = "Koneksi terputus. Periksa jaringan, lalu coba lagi.";
const UNKNOWN_ERROR_MESSAGE = "Permintaan gagal diproses. Coba lagi beberapa saat lagi.";

/** Galat API dalam bentuk yang sama dengan kontrak backend. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
    /** Rincian galat dari backend, mis. { tokensRemaining } atau daftar field yang salah. */
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Galat validasi per field dari backend: [{ path, message }]. */
export function fieldErrors(error: ApiError): Record<string, string> {
  if (!Array.isArray(error.details)) return {};
  const result: Record<string, string> = {};
  for (const item of error.details as unknown[]) {
    if (item && typeof item === "object" && "path" in item && "message" in item) {
      const { path, message } = item as { path: unknown; message: unknown };
      if (typeof path === "string" && typeof message === "string" && !(path in result)) {
        result[path] = message;
      }
    }
  }
  return result;
}

/** Mengubah galat apa pun menjadi ApiError supaya pesannya selalu bisa ditampilkan. */
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(UNKNOWN_ERROR_MESSAGE, 0, "UNKNOWN");
}

/**
 * Permintaan JSON ke endpoint Next.js. Membaca { data } saat sukses dan
 * melempar ApiError saat galat.
 */
export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0, "NETWORK_ERROR");
  }

  const body = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiErrorBody | null;

  if (response.ok && body && "data" in body) return body.data;

  const failure = body && "error" in body ? body.error : undefined;
  throw new ApiError(
    failure?.message ?? UNKNOWN_ERROR_MESSAGE,
    response.status,
    failure?.code ?? "UNKNOWN",
    failure?.requestId,
    failure?.details
  );
}

/**
 * Permintaan ke backend. Sesi yang ditolak (401) langsung kembali ke /masuk;
 * route handler sudah menghapus cookie-nya.
 */
export async function requestBackend<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await requestJson<T>(`${BACKEND_PROXY_PATH}${path}`, init);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) window.location.assign(LOGIN_PATH);
    throw error;
  }
}
