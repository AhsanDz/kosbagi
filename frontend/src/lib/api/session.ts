import { requestJson } from "@/lib/api/client";
import type { SessionPayload } from "@/lib/api/types";
import { LOGIN_PATH, roleHomePath, toAppRole } from "@/lib/auth/roles";

const SESSION_URL = "/api/session";

/**
 * Masuk lewat POST /api/session (cookie httpOnly diatur server), lalu pindah
 * dengan muat penuh. Muat penuh membuang semua state dan cache klien sebelumnya,
 * supaya data akun lain tidak pernah terbawa. Saat sukses, janji ini tidak pernah
 * selesai, jadi tampilan tetap dalam keadaan memuat sampai halaman berganti.
 */
export async function signIn(email: string, password: string): Promise<never> {
  const { user } = await requestJson<SessionPayload>(SESSION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const role = toAppRole(user.role);
  window.location.assign(role ? roleHomePath(role) : LOGIN_PATH);
  return new Promise<never>(() => {});
}

/** Keluar: menghapus cookie lewat DELETE /api/session, lalu kembali ke /masuk. */
export async function signOut(): Promise<void> {
  await fetch(SESSION_URL, { method: "DELETE" }).catch(() => undefined);
  window.location.assign(LOGIN_PATH);
}
