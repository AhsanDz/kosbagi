import type { Metadata } from "next";

import { AdminHeaderCaption, AdminOverview } from "@/components/admin/admin-overview";
import { AppHeader } from "@/components/app-shell/app-header";

export const metadata: Metadata = { title: "Ringkasan admin" };

/**
 * Ringkasan admin: periode berjalan, hal yang perlu perhatian (KYC,
 * rekonsiliasi, antrean), dan antrean job on-chain dengan Coba lagi.
 */
export default function AdminOverviewPage() {
  return (
    <>
      <AppHeader title="Ringkasan" description={<AdminHeaderCaption />} />
      <AdminOverview />
    </>
  );
}
