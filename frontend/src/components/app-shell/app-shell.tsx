import { Suspense, type ReactNode } from "react";

import { RoleSidebar } from "@/components/app-shell/role-sidebar";
import { SandboxBanner } from "@/components/app-shell/sandbox-banner";
import { SessionAccount } from "@/components/app-shell/session-account";
import { SidebarAccountSkeleton } from "@/components/app-shell/sidebar-account";
import { SkipLink } from "@/components/common/skip-link";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import type { AppRole } from "@/lib/types";

/**
 * Kerangka halaman setelah masuk (Figma: App shell per peran): sidebar tinta
 * di kiri, banner sandbox di atas area konten, lalu isi halaman. Setiap
 * halaman peran merender AppHeader sendiri karena judulnya berbeda-beda.
 *
 * Hanya blok akun yang membaca sesi, jadi hanya bagian itu yang berada di dalam
 * Suspense. Batas ini sengaja tidak membungkus seluruh sidebar: sidebar berganti
 * bentuk menjadi Sheet setelah hidrasi di ponsel, dan Suspense yang terhidrasi
 * belakangan akan menemukan HTML server yang berbeda.
 */
export function AppShell({ role, children }: { role: AppRole; children: ReactNode }) {
  return (
    <SidebarProvider>
      <SkipLink />
      <RoleSidebar
        role={role}
        account={
          <Suspense fallback={<SidebarAccountSkeleton />}>
            <SessionAccount role={role} />
          </Suspense>
        }
      />
      <SidebarInset>
        <SandboxBanner />
        <div id="isi-utama" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
