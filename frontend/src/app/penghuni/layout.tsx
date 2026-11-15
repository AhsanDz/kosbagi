import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { TenantBillingProvider } from "@/components/tenant/tenant-billing-provider";

/**
 * Layout semua halaman penghuni (/penghuni/...): app shell dengan menu penghuni
 * dan penyedia data tagihan yang dipakai bersama semua halamannya.
 */
export default function PenghuniLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell role="penghuni">
      <TenantBillingProvider>{children}</TenantBillingProvider>
    </AppShell>
  );
}
