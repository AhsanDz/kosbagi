import "server-only";

import { cookies } from "next/headers";

import type { SessionUser } from "@/lib/api/types";
import { SESSION_COOKIE } from "@/lib/auth/session-token";
import { API_BASE_URL } from "@/lib/config";
import type { ApiSuccess } from "@/lib/types";

const SESSION_CHECK_TIMEOUT_MS = 5_000;

export type SessionResult =
  | { status: "authenticated"; user: SessionUser }
  /** Tidak ada cookie, atau backend menolak tokennya. */
  | { status: "anonymous" }
  /** Backend tidak bisa dihubungi, jadi status sesi belum diketahui. */
  | { status: "unavailable" };

/**
 * Sesi pengguna yang sudah diverifikasi backend lewat GET /auth/me. Memanggil
 * cookies(), jadi hanya boleh dipakai di dalam batas <Suspense> (Cache Components).
 */
export async function getSession(): Promise<SessionResult> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { status: "anonymous" };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    });
    if (response.status === 401) return { status: "anonymous" };
    if (!response.ok) return { status: "unavailable" };

    const body = (await response.json()) as ApiSuccess<{ user: SessionUser }>;
    return { status: "authenticated", user: body.data.user };
  } catch {
    return { status: "unavailable" };
  }
}
