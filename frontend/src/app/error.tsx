"use client";

import { RouteError } from "@/components/common/route-error";
import { PublicNavbar } from "@/components/public/public-navbar";

/**
 * Batas galat terluar (P5): menangkap galat di halaman yang tidak punya
 * error.tsx sendiri, mis. /masuk. Galat di layout akar ditangani Next.js.
 */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicNavbar showLogin={false} />
      <main className="flex-1">
        <RouteError error={error} retry={retry} homeHref="/" homeName="beranda" variant="halaman" />
      </main>
    </div>
  );
}
