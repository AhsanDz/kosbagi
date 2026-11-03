import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";

export const metadata: Metadata = { title: "Ringkasan penghuni" };

/**
 * Ringkasan penghuni kamar K03.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 2.
 */
export default function PenghuniOverviewPage() {
  return (
    <>
      <AppHeader title="Ringkasan" description="Kamar K03, Kos Sumbersari 01" />
      <ContentSkeleton />
    </>
  );
}
