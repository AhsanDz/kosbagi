import type { ReactNode } from "react";

import { SkipLink } from "@/components/common/skip-link";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicNavbar } from "@/components/public/public-navbar";

/**
 * Layout route group (publik): navbar + footer untuk beranda, /kos, /kos/[slug],
 * dan /pemilik. Tanda kurung pada nama folder membuat "(publik)" tidak ikut URL.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <PublicNavbar />
      <main id="isi-utama" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
