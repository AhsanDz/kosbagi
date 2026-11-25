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
 * Header X-Forwarded-* hanya bisa dipercaya bila frontend berjalan di balik
 * proxy yang menimpanya sendiri (mis. Vercel). Tanpa proxy, nilainya dikirim
 * langsung oleh klien dan bisa dipalsukan, jadi bawaannya tidak dipercaya.
 * Diaktifkan dengan TRUST_PROXY_HEADERS=true (variabel server, tidak sampai
 * ke peramban). Dibaca setiap permintaan supaya bisa diubah tanpa build ulang.
 */
export function trustsProxyHeaders(): boolean {
  return process.env.TRUST_PROXY_HEADERS?.trim().toLowerCase() === "true";
}

/** Nilai pertama dari header berisi daftar (mis. "a.com, b.com"). */
function firstListValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * Host yang dipakai pengunjung untuk membuka situs. Di balik proxy tepercaya,
 * header Host bisa berisi alamat internal, jadi X-Forwarded-Host yang dipakai.
 */
function requestHost(request: Request): string | null {
  if (trustsProxyHeaders()) {
    const forwarded = firstListValue(request.headers.get("x-forwarded-host"));
    if (forwarded) return forwarded;
  }
  return request.headers.get("host");
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

  const host = requestHost(request);
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Header identitas klien untuk backend. Semua permintaan keluar dari server
 * Next.js, jadi tanpa ini rate limit backend melihat satu alamat IP saja.
 * Hanya diteruskan bila proxy di depan Next.js tepercaya; tanpa itu klien bisa
 * mengisi X-Forwarded-For sendiri untuk menghindari rate limit.
 */
export function forwardedClientHeaders(request: Request): Record<string, string> {
  if (!trustsProxyHeaders()) return {};
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor ? { "X-Forwarded-For": forwardedFor } : {};
}
