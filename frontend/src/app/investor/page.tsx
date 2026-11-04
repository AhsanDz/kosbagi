import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";
import { currentPeriod } from "@/lib/data/rooms";
import { formatPeriod } from "@/lib/format";

export const metadata: Metadata = { title: "Ringkasan investor" };

/**
 * Ringkasan investor: saldo bagi hasil dan token yang dimiliki.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 3 dan 4.
 */
export default function InvestorOverviewPage() {
  return (
    <>
      <AppHeader title="Ringkasan" description={`Periode berjalan: ${formatPeriod(currentPeriod)}`} />
      <ContentSkeleton />
    </>
  );
}
