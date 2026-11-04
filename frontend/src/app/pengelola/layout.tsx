import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";

/** Layout semua halaman pengelola (/pengelola/...): app shell dengan menu pengelola. */
export default function PengelolaLayout({ children }: { children: ReactNode }) {
  return <AppShell role="pengelola">{children}</AppShell>;
}
