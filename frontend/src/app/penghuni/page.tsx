import type { Metadata } from "next";

import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantOverview } from "@/components/tenant/tenant-overview";

export const metadata: Metadata = { title: "Ringkasan penghuni" };

/** Ringkasan penghuni: tagihan bulan berjalan, riwayat, kamar, dan bukti sewa. */
export default function PenghuniOverviewPage() {
  return (
    <>
      <TenantHeader title="Ringkasan" />
      <TenantOverview />
    </>
  );
}
