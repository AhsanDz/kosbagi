import { redirect } from "next/navigation";

import { SidebarAccount, SidebarAccountSkeleton } from "@/components/app-shell/sidebar-account";
import { LOGIN_PATH, roleHomePath, toAppRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { SESSION_ENDED_PARAM } from "@/lib/auth/session-token";
import type { AppRole } from "@/lib/types";

/**
 * Blok akun dari sesi, sekaligus verifikasi sungguhan setelah pemeriksaan cepat
 * di proxy.ts: token ditanyakan ke backend lewat GET /auth/me. Saat backend tidak
 * bisa dihubungi, blok ini tetap kerangka dan halaman menampilkan state error-nya.
 */
export async function SessionAccount({ role }: { role: AppRole }) {
  const session = await getSession();

  if (session.status === "anonymous") {
    redirect(`${LOGIN_PATH}?${SESSION_ENDED_PARAM}=berakhir`);
  }
  if (session.status === "unavailable") return <SidebarAccountSkeleton />;

  const userRole = toAppRole(session.user.role);
  if (userRole !== role) redirect(userRole ? roleHomePath(userRole) : LOGIN_PATH);

  return <SidebarAccount role={role} user={session.user} />;
}
