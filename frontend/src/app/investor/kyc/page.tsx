import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { KycPage } from "@/components/investor/kyc-page";

export const metadata: Metadata = { title: "Verifikasi KYC" };

/**
 * Verifikasi KYC dummy investor: form dua isian, status pengajuan, dan jejak
 * sampai alamat dompet kustodian tercatat lolos KYC di KosToken.
 */
export default function InvestorKycPage() {
  return (
    <>
      <AppHeader title="Verifikasi KYC" description="Data identitas dummy sebelum membeli token" />
      <KycPage />
    </>
  );
}
