import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";
import { currentPeriod } from "@/lib/data/rooms";
import { formatPeriod } from "@/lib/format";

export const metadata: Metadata = { title: "Status kamar" };

/**
 * Status kamar untuk pengelola (memakai papan kamar).
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 4.
 */
export default function PengelolaRoomsPage() {
  return (
    <>
      <AppHeader title="Status kamar" description={`Periode berjalan: ${formatPeriod(currentPeriod)}`} />
      <ContentSkeleton />
    </>
  );
}
