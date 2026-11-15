import "server-only";

/** Waktu tunggu route handler saat memanggil backend. */
export const BACKEND_TIMEOUT_MS = 15_000;

export const BACKEND_UNAVAILABLE_MESSAGE =
  "Server KosBagi tidak merespons. Pastikan backend berjalan, lalu coba lagi.";

/** Galat dari route handler, bentuknya sama dengan galat backend. */
export function apiErrorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message, requestId: crypto.randomUUID() } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Route handler menempelkan token dari cookie secara otomatis, jadi permintaan
 * yang mengubah data hanya diterima dari situs ini (perlindungan CSRF, lapisan
 * kedua setelah SameSite=Lax). Peramban selalu mengirim Origin pada POST dan
 * DELETE; permintaan tanpa Origin bukan berasal dari halaman situs lain.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Header identitas klien untuk backend. Semua permintaan keluar dari server
 * Next.js, jadi tanpa ini rate limit backend melihat satu alamat IP saja.
 */
export function forwardedClientHeaders(request: Request): Record<string, string> {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor ? { "X-Forwarded-For": forwardedFor } : {};
}
