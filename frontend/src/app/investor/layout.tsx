import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";

/** Layout semua halaman investor (/investor/...): app shell dengan menu investor. */
export default function InvestorLayout({ children }: { children: ReactNode }) {
  return <AppShell role="investor">{children}</AppShell>;
}
