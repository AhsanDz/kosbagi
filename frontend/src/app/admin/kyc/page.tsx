import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";

export const metadata: Metadata = { title: "Verifikasi KYC" };

/**
 * Persetujuan KYC investor oleh admin.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 3.
 */
export default function AdminKycPage() {
  return (
    <>
      <AppHeader title="Verifikasi KYC" description="Pengajuan KYC investor" />
      <ContentSkeleton />
    </>
  );
}
