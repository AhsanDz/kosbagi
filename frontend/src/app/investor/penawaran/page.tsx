import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";
import { offerings } from "@/lib/data/offering";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Penawaran token" };

/**
 * Penawaran token: pilih jumlah token lalu bayar lewat Midtrans Snap.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 3.
 */
export default function InvestorOfferingPage() {
  return (
    <>
      <AppHeader title="Penawaran" description={`Penawaran KB-SMR01 dibuka sampai ${formatDate(offerings[0]?.closesAt ?? "2026-12-31")}`} />
      <ContentSkeleton />
    </>
  );
}
