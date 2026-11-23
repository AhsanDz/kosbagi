import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { OfferingDocuments, OfferingRisks } from "@/components/investor/offering-info";
import { OfferingPage } from "@/components/investor/offering-page";
import { offerings } from "@/lib/data/offering";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Penawaran token" };

/**
 * Penawaran token KB-SMR01: sisa penawaran dan kuota dari API, Tiket beli
 * dengan pemeriksaan skenario 8 dan 9 sebelum pembayaran, lalu bayar lewat
 * Midtrans Snap. Kartu dokumen dan risiko statis dirender di server.
 */
export default function InvestorOfferingPage() {
  const closesAt = formatDate(offerings[0]?.closesAt ?? "2026-12-31");

  return (
    <>
      <AppHeader
        title="Penawaran"
        description={
          <>
            <span className="hidden md:inline">Penawaran </span>KB-SMR01 dibuka sampai {closesAt}
          </>
        }
      />
      <OfferingPage documents={<OfferingDocuments />} risks={<OfferingRisks />} />
    </>
  );
}
