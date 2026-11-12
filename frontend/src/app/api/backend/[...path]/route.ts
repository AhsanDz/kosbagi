import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import {
  apiErrorResponse,
  BACKEND_TIMEOUT_MS,
  BACKEND_UNAVAILABLE_MESSAGE,
  forwardedClientHeaders,
  isSameOrigin,
} from "@/lib/api/route-helpers";
import { SESSION_COOKIE } from "@/lib/auth/session-token";
import { API_BASE_URL } from "@/lib/config";

/**
 * Jembatan peramban ke backend. Klien memanggil /api/backend/bills/current, lalu
 * route handler ini mengambil JWT dari cookie httpOnly dan meneruskan permintaan
 * dengan header Authorization. Peramban tidak pernah memegang token.
 */
async function forward(
  request: NextRequest,
  context: RouteContext<"/api/backend/[...path]">
): Promise<Response> {
  const { path } = await context.params;

  // Tanpa ini, segmen ".." bisa keluar dari awalan /api saat URL dinormalkan.
  if (path.some((segment) => segment === "." || segment === "..")) {
    return apiErrorResponse(400, "INVALID_PATH", "Alamat tidak valid.");
  }

  const readsOnly = request.method === "GET" || request.method === "HEAD";
  if (!readsOnly && !isSameOrigin(request)) {
    return apiErrorResponse(403, "FORBIDDEN", "Permintaan ditolak.");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const headers = new Headers({
    Accept: "application/json",
    ...forwardedClientHeaders(request),
  });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const targetPath = path.map(encodeURIComponent).join("/");

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${API_BASE_URL}/${targetPath}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: readsOnly ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch {
    return apiErrorResponse(502, "BACKEND_UNAVAILABLE", BACKEND_UNAVAILABLE_MESSAGE);
  }

  // Token ditolak backend (kedaluwarsa atau tidak sah): buang cookie-nya.
  if (backendResponse.status === 401) cookieStore.delete(SESSION_COOKIE);

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "Content-Type": backendResponse.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
