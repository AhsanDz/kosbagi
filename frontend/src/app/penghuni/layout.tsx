import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";

/** Layout semua halaman penghuni (/penghuni/...): app shell dengan menu penghuni. */
export default function PenghuniLayout({ children }: { children: ReactNode }) {
  return <AppShell role="penghuni">{children}</AppShell>;
}
