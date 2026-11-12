import type { ApiRole } from "@/lib/api/types";
import type { AppRole } from "@/lib/types";

/** Halaman masuk, sekaligus tujuan semua pengguna tanpa sesi. */
export const LOGIN_PATH = "/masuk";

const appRoleByApiRole: Record<ApiRole, AppRole> = {
  INVESTOR: "investor",
  TENANT: "penghuni",
  MANAGER: "pengelola",
  ADMIN: "admin",
};

/** Peran backend ke segmen rute frontend. Nilai yang tidak dikenal menjadi null. */
export function toAppRole(role: string): AppRole | null {
  return appRoleByApiRole[role as ApiRole] ?? null;
}

/** Halaman pertama setiap peran. */
export function roleHomePath(role: AppRole): `/${AppRole}` {
  return `/${role}`;
}
