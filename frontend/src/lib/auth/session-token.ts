/** Nama cookie httpOnly yang menyimpan JWT dari backend. */
export const SESSION_COOKIE = "kosbagi_session";

/**
 * Tanda di URL bahwa backend menolak token yang masih ada di cookie. proxy.ts
 * menghapus cookie itu, supaya /masuk tidak mengarahkan balik ke halaman peran.
 */
export const SESSION_ENDED_PARAM = "sesi";

export interface SessionClaims {
  role: string;
  /** Waktu kedaluwarsa dalam detik Unix. */
  exp: number;
}

/**
 * Membaca isi JWT tanpa memeriksa tanda tangan, karena JWT_SECRET hanya ada di
 * backend. Hasilnya hanya boleh dipakai untuk mengarahkan halaman di proxy.ts.
 * Keputusan akses data tetap di backend, yang memverifikasi token di setiap
 * permintaan. Mengembalikan null bila token rusak atau sudah kedaluwarsa.
 */
export function readSessionClaims(token: string): SessionClaims | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SessionClaims>;
    if (typeof claims.role !== "string" || typeof claims.exp !== "number") return null;
    if (claims.exp * 1000 <= Date.now()) return null;
    return { role: claims.role, exp: claims.exp };
  } catch {
    return null;
  }
}
