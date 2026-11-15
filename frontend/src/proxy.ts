import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATH, roleHomePath, toAppRole } from "@/lib/auth/roles";
import {
  readSessionClaims,
  SESSION_COOKIE,
  SESSION_ENDED_PARAM,
} from "@/lib/auth/session-token";

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function withoutSession(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

/**
 * Perlindungan halaman peran di sisi server, sebelum halaman dirender. Pengguna
 * tanpa sesi ke /masuk, peran yang salah ke halaman perannya, dan pengguna yang
 * sudah masuk tidak melihat /masuk lagi. Pemeriksaan ini optimistis (hanya
 * membaca cookie, lihat readSessionClaims). Verifikasi sungguhan dilakukan
 * SessionAccount lewat GET /auth/me dan backend di setiap permintaan data.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? readSessionClaims(token) : null;
  const role = claims ? toAppRole(claims.role) : null;

  if (pathname === LOGIN_PATH) {
    if (searchParams.has(SESSION_ENDED_PARAM)) return withoutSession(NextResponse.next());
    return role ? redirectTo(request, roleHomePath(role)) : NextResponse.next();
  }

  if (!role) {
    const response = redirectTo(request, LOGIN_PATH);
    return token ? withoutSession(response) : response;
  }

  const routeRole = pathname.split("/")[1];
  return routeRole === role ? NextResponse.next() : redirectTo(request, roleHomePath(role));
}

export const config = {
  matcher: ["/masuk", "/investor/:path*", "/penghuni/:path*", "/pengelola/:path*", "/admin/:path*"],
};
