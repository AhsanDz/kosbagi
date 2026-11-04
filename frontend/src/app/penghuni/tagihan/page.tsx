import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";

export const metadata: Metadata = { title: "Tagihan" };

/**
 * Tagihan sewa penghuni, tombol Bayar (Midtrans Snap), dan kuitansi.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 2 dan 3.
 */
export default function PenghuniBillsPage() {
  return (
    <>
      <AppHeader title="Tagihan" description="Kamar K03, Kos Sumbersari 01" />
      <ContentSkeleton />
    </>
  );
}
