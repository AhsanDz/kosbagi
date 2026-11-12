import { cookies } from "next/headers";

import {
  apiErrorResponse,
  BACKEND_TIMEOUT_MS,
  BACKEND_UNAVAILABLE_MESSAGE,
  forwardedClientHeaders,
  isSameOrigin,
} from "@/lib/api/route-helpers";
import type { SessionUser } from "@/lib/api/types";
import { SESSION_COOKIE } from "@/lib/auth/session-token";
import { API_BASE_URL } from "@/lib/config";
import type { ApiSuccess } from "@/lib/types";

/** Masa berlaku JWT dari backend, dipakai bila expiresAt tidak terbaca. */
const FALLBACK_SESSION_SECONDS = 8 * 60 * 60;

interface LoginPayload {
  token: string;
  expiresAt: string;
  user: SessionUser;
}

/**
 * Masuk: meneruskan email dan kata sandi ke POST /auth/login, lalu menyimpan
 * JWT di cookie httpOnly. Balasan ke peramban hanya berisi data pengguna, jadi
 * token tidak pernah sampai ke JavaScript peramban.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiErrorResponse(403, "FORBIDDEN", "Permintaan ditolak.");
  }

  const credentials = await request.text();

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...forwardedClientHeaders(request),
      },
      body: credentials,
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch {
    return apiErrorResponse(502, "BACKEND_UNAVAILABLE", BACKEND_UNAVAILABLE_MESSAGE);
  }

  const body: unknown = await backendResponse.json().catch(() => null);

  if (!backendResponse.ok) {
    return body
      ? Response.json(body, { status: backendResponse.status })
      : apiErrorResponse(502, "BACKEND_UNAVAILABLE", BACKEND_UNAVAILABLE_MESSAGE);
  }

  const { token, expiresAt, user } = (body as ApiSuccess<LoginPayload>).data;
  const expires = new Date(expiresAt);

  (await cookies()).set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(Number.isNaN(expires.getTime())
      ? { maxAge: FALLBACK_SESSION_SECONDS }
      : { expires }),
  });

  return Response.json({ data: { user } });
}

/** Keluar: menghapus cookie sesi. */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return apiErrorResponse(403, "FORBIDDEN", "Permintaan ditolak.");
  }

  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
