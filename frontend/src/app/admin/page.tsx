import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";
import { currentPeriod } from "@/lib/data/rooms";
import { formatPeriod } from "@/lib/format";

export const metadata: Metadata = { title: "Ringkasan admin" };

/**
 * Ringkasan admin.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 4.
 */
export default function AdminOverviewPage() {
  return (
    <>
      <AppHeader title="Ringkasan" description={`Periode berjalan: ${formatPeriod(currentPeriod)}`} />
      <ContentSkeleton />
    </>
  );
}
