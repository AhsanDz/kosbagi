import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";
import { currentPeriod } from "@/lib/data/rooms";
import { formatPeriod } from "@/lib/format";

export const metadata: Metadata = { title: "Biaya dan nota" };

/**
 * Pencatatan biaya operasional dan unggah nota (hash-nya dicatat on-chain).
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 4.
 */
export default function PengelolaExpensesPage() {
  return (
    <>
      <AppHeader title="Biaya dan nota" description={`Periode berjalan: ${formatPeriod(currentPeriod)}`} />
      <ContentSkeleton />
    </>
  );
}
