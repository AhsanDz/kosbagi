import type { ReactNode } from "react";

import { RoleSidebar } from "@/components/app-shell/role-sidebar";
import { SandboxBanner } from "@/components/app-shell/sandbox-banner";
import { SkipLink } from "@/components/common/skip-link";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { AppRole } from "@/lib/types";

/**
 * Kerangka halaman setelah masuk (Figma: App shell per peran): sidebar tinta
 * di kiri, banner sandbox di atas area konten, lalu isi halaman. Setiap
 * halaman peran merender AppHeader sendiri karena judulnya berbeda-beda.
 */
export function AppShell({ role, children }: { role: AppRole; children: ReactNode }) {
  return (
    <SidebarProvider>
      <SkipLink />
      <RoleSidebar role={role} />
      <SidebarInset>
        <SandboxBanner />
        <div id="isi-utama" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
