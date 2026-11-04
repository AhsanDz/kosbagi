import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";

export const metadata: Metadata = { title: "Verifikasi KYC" };

/**
 * Verifikasi KYC dummy investor.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 3.
 */
export default function InvestorKycPage() {
  return (
    <>
      <AppHeader title="Verifikasi KYC" description="Data identitas dummy sebelum membeli token" />
      <ContentSkeleton />
    </>
  );
}
