import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";
import { currentPeriod } from "@/lib/data/rooms";
import { formatPeriod } from "@/lib/format";

export const metadata: Metadata = { title: "Tutup periode" };

/**
 * Tutup periode dan jalankan distribusi bagi hasil.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 4.
 */
export default function AdminPeriodPage() {
  return (
    <>
      <AppHeader title="Tutup periode" description={`Periode berjalan: ${formatPeriod(currentPeriod)}`} />
      <ContentSkeleton />
    </>
  );
}
