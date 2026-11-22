import type { Metadata } from "next";

import { TenantBills } from "@/components/tenant/tenant-bills";
import { TenantHeader } from "@/components/tenant/tenant-header";

export const metadata: Metadata = { title: "Tagihan" };

/** Tagihan sewa penghuni: slip dan tombol bayar Snap, jejak pembayaran, riwayat. */
export default function PenghuniBillsPage() {
  return (
    <>
      <TenantHeader title="Tagihan" />
      <TenantBills />
    </>
  );
}
