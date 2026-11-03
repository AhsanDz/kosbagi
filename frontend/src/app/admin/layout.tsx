import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";

/** Layout semua halaman admin (/admin/...): app shell dengan menu admin. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell role="admin">{children}</AppShell>;
}
