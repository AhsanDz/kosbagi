import type { Metadata } from "next";

import { KycReview } from "@/components/admin/kyc-review";
import { AppHeader } from "@/components/app-shell/app-header";

export const metadata: Metadata = { title: "Verifikasi KYC" };

/**
 * Persetujuan KYC investor oleh admin: tabel bertab, Sheet tinjau dengan
 * pemeriksaan otomatis, dan Dialog tolak. Menyetujui membuat dompet kustodian
 * dan job whitelist on-chain di backend.
 */
export default function AdminKycPage() {
  return (
    <>
      <AppHeader title="Verifikasi KYC" description="Pengajuan KYC investor (data dummy)" />
      <KycReview />
    </>
  );
}
